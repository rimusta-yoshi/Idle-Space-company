// Game State Manager
// Core game logic and state management

class Game {
    constructor() {
        this.resources = new ResourceManager();
        this.canvas = new CanvasManager('canvas-container');
        this.sidebar = new SidebarManager(this.resources);

        this.buildingCounts = {}; // Track how many of each building type placed
        this.lastUpdate = Date.now();
        this.running = false;
        this.frameCount = 0; // Debug: track frames

        this.initialize();
    }

    initialize() {
        log('Game initializing...');

        // Setup drag-and-drop
        this.sidebar.setupDragAndDrop((buildingType, x, y) => {
            this.onBuildingDropped(buildingType, x, y);
        });

        // Setup save button
        this.sidebar.setupSaveButton(() => {
            this.save();
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

            // Check if node can produce (has inputs if required)
            if (def.consumption && Object.keys(def.consumption).length > 0) {
                // Check if inputs available
                const canProduce = this.resources.canAfford(def.consumption);
                node.stalled = !canProduce;

                if (canProduce) {
                    // Consume inputs
                    // Note: This is simplified, actual consumption happens per tick
                    // For now we just check availability
                }
            } else {
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
        const saveData = {
            version: 1,
            timestamp: Date.now(),
            resources: this.resources.getSaveData(),
            canvas: this.canvas.getSaveData(),
            buildingCounts: this.buildingCounts
        };

        try {
            localStorage.setItem('idleSpaceCompany_save', JSON.stringify(saveData));
            log('Game saved successfully');
            // TODO: Show success message to user
        } catch (e) {
            console.error('Failed to save game:', e);
            // TODO: Show error message to user
        }
    }

    // Load game
    load() {
        try {
            const saveData = localStorage.getItem('idleSpaceCompany_save');
            if (!saveData) {
                log('No save data found');
                return false;
            }

            const data = JSON.parse(saveData);

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
