// Game State Manager
// Core game logic and state management

class Game {
    constructor(rootElement = document) {
        this.rootElement = rootElement; // Root element to scope queries
        this.resources = new ResourceManager();
        this.canvas = new CanvasManager('canvas-container', rootElement);
        this.sidebar = new SidebarManager(this.resources, rootElement);
        this.upgrades = null; // Will be initialized after canvas setup
        this.offlineCalc = null; // Will be initialized after canvas setup

        this.buildingCounts = {}; // Track how many of each building type placed
        this.lastUpdate = Date.now();
        this.running = false;
        this.frameCount = 0; // Debug: track frames

        this.initialize();
    }

    initialize() {
        log('Game initializing...');

        // Initialize upgrade manager (needs game reference)
        this.upgrades = new UpgradeManager(this, this.rootElement);

        // Initialize offline progress calculator
        this.offlineCalc = new OfflineProgressCalculator(this);

        // Setup drag-and-drop
        this.sidebar.setupDragAndDrop((buildingType, x, y) => {
            this.onBuildingDropped(buildingType, x, y);
        });

        // Listen for upgrade panel requests
        document.addEventListener('openUpgradePanel', (e) => {
            this.upgrades.openPanel(e.detail.node);
        });

        // Initial UI update
        this.sidebar.updateResources();
        this.sidebar.updateBuildingPalette(this.buildingCounts);

        log('Game initialized');
    }

    // Start game loop
    start() {
        this.running = true;
        this.lastUpdate = Date.now();
        this.gameLoop();
        log('Game started');
    }

    // Stop game loop
    stop() {
        this.running = false;
        log('Game stopped');
    }

    // Main game loop
    gameLoop() {
        if (!this.running) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;

        // Update game logic (currently just production)
        this.update(deltaTime);

        // Update UI
        this.sidebar.updateResources();

        // Debug: Log every 300 frames (~5 seconds)
        this.frameCount++;
        if (this.frameCount % 300 === 0) {
            log(`Game loop active (frame ${this.frameCount}), ${this.canvas.nodes.length} nodes, deltaTime: ${deltaTime.toFixed(3)}s`);
        }

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    // Update game state
    update(deltaTime) {
        // Calculate production rates based on placed buildings
        this.calculateProduction();

        // Update resources based on production
        this.resources.updateProduction(deltaTime);

        // Update node displays
        this.canvas.updateNodes();
    }

    // Check if a node has the required input connections
    checkNodeInputs(node) {
        const def = node.buildingDef;

        // If no consumption, no inputs required
        if (!def.consumption || Object.keys(def.consumption).length === 0) {
            return true;
        }

        // Check each required resource
        for (const [resource, _rate] of Object.entries(def.consumption)) {
            // Find if any input node produces this resource
            const hasInputForResource = node.inputs.some(inputNodeId => {
                const inputNode = this.canvas.getNode(inputNodeId);
                if (!inputNode) return false;

                const inputDef = inputNode.buildingDef;
                return inputDef.production && inputDef.production[resource];
            });

            // If any required resource lacks an input connection, return false
            if (!hasInputForResource) {
                return false;
            }
        }

        return true;
    }

    // Calculate production rates from all nodes
    calculateProduction() {
        // Reset all production rates to 0
        Object.keys(this.resources.resources).forEach(type => {
            this.resources.setProduction(type, 0);
        });

        // Debug: Log node count
        if (this.canvas.nodes.length > 0 && Math.random() < 0.01) {
            log(`Calculating production for ${this.canvas.nodes.length} nodes`);
        }

        // Add production from each node
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;

            // Debug: Check if buildingDef exists
            if (!def) {
                console.error(`Node ${node.id} has no buildingDef!`);
                return;
            }

            // Regular building logic
            // Check if node can produce (has inputs if required)
            if (def.consumption && Object.keys(def.consumption).length > 0) {
                // Phase 2: Check if node has required input connections
                const hasRequiredInputs = this.checkNodeInputs(node);

                // Also check if resources are available in global storage
                const hasResources = this.resources.canAfford(def.consumption);

                // Node can only produce if it has both inputs and resources
                const canProduce = hasRequiredInputs && hasResources;
                node.stalled = !canProduce;
            } else {
                // No consumption requirements (like Ore Miner) - always works
                node.stalled = false;
            }

            // Add production (if not stalled)
            if (!node.stalled && def.production) {
                Object.entries(def.production).forEach(([resource, rate]) => {
                    const currentRate = this.resources.resources[resource].production;
                    this.resources.setProduction(resource, currentRate + rate * node.level);
                });
            }

            // Subtract consumption (if not stalled)
            if (!node.stalled && def.consumption) {
                Object.entries(def.consumption).forEach(([resource, rate]) => {
                    const currentRate = this.resources.resources[resource].production;
                    this.resources.setProduction(resource, currentRate - rate * node.level);
                });
            }
        });
    }

    // Handle building dropped on canvas
    onBuildingDropped(buildingType, x, y) {
        const count = this.buildingCounts[buildingType] || 0;
        const cost = calculateBuildingCost(buildingType, count);

        // Check if can afford
        if (!this.resources.canAfford(cost)) {
            log(`Cannot afford ${buildingType} (need ${JSON.stringify(cost)})`);
            // TODO: Show error message to user
            return;
        }

        // Spend resources
        this.resources.spend(cost);

        // Create and place node
        const node = new FactoryNode(buildingType, x, y);
        this.canvas.addNode(node);

        // Update count
        this.buildingCounts[buildingType] = count + 1;

        // Update UI
        this.sidebar.updateResources();
        this.sidebar.updateBuildingPalette(this.buildingCounts);

        log(`Placed ${buildingType} (total: ${this.buildingCounts[buildingType]})`);
    }

    // Save game
    save() {
        try {
            // Use desktop OS save system (integrated save)
            if (window.desktop) {
                window.desktop.save();
                log('Game saved successfully');
            } else {
                console.warn('Desktop OS not available, cannot save');
            }
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    // Load game
    load(providedData = null) {
        try {
            let data = providedData;

            // If no data provided, try to load from old localStorage key (migration)
            if (!data) {
                const saveData = localStorage.getItem('idleSpaceCompany_save');
                if (!saveData) {
                    log('No save data found');
                    return false;
                }
                data = JSON.parse(saveData);
                log('Migrating save data from old format');
            }

            if (!data) {
                log('No save data found');
                return false;
            }

            // MIGRATION: Remove market buildings from old saves
            if (data.canvas && data.canvas.nodes) {
                const beforeCount = data.canvas.nodes.length;
                data.canvas.nodes = data.canvas.nodes.filter(node =>
                    node.buildingType !== 'market'
                );
                const removed = beforeCount - data.canvas.nodes.length;
                if (removed > 0) {
                    log(`Migration: Removed ${removed} market building(s) from save`);

                    // Also clean up connections involving removed market nodes
                    const marketNodeIds = new Set();
                    // Since we already filtered, we need to check the original before filtering
                    // But we don't have it anymore. Instead, clean up broken connections
                    if (data.canvas.connections) {
                        const nodeIds = new Set(data.canvas.nodes.map(n => n.id));
                        const beforeConnCount = data.canvas.connections.length;
                        data.canvas.connections = data.canvas.connections.filter(conn =>
                            nodeIds.has(conn.fromNodeId) && nodeIds.has(conn.toNodeId)
                        );
                        const removedConns = beforeConnCount - data.canvas.connections.length;
                        if (removedConns > 0) {
                            log(`Migration: Removed ${removedConns} connection(s) to market buildings`);
                        }
                    }
                }
            }

            // Load resources
            if (data.resources) {
                this.resources.loadSaveData(data.resources);
            }

            // Load canvas (nodes)
            if (data.canvas) {
                this.canvas.loadSaveData(data.canvas);
            }

            // Load building counts
            if (data.buildingCounts) {
                this.buildingCounts = data.buildingCounts;
            }

            // Calculate production rates from loaded buildings
            this.calculateProduction();

            // Calculate offline progress (if any)
            if (data.timestamp) {
                const offlineData = this.offlineCalc.calculateOfflineProgress(data.timestamp);
                if (offlineData) {
                    this.offlineCalc.showOfflineNotification(offlineData);
                }
            }

            // Update UI
            this.sidebar.updateResources();
            this.sidebar.updateBuildingPalette(this.buildingCounts);

            log('Game loaded successfully');
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }
}
