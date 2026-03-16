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

        // Listen for delete requests from node action bar
        document.addEventListener('deleteNodeRequest', (e) => {
            this.upgrades.currentNode = e.detail.node;
            this.upgrades.deleteNode();
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

    // Get the resource types flowing into a node from its connections
    getNodeInputResourceTypes(node) {
        const inputResources = {};

        node.inputs.forEach(inputNodeId => {
            const connection = this.canvas.connections.find(c =>
                c.fromNode.id === inputNodeId && c.toNode.id === node.id
            );
            if (connection && connection.resourceType) {
                inputResources[connection.resourceType] = true;
            }
        });

        return inputResources;
    }

    // Resolve and set the active recipe for a recipe-based node
    resolveActiveRecipe(node) {
        const def = node.buildingDef;

        if (!def.usesRecipes) {
            node.activeRecipe = null;
            return;
        }

        const inputResources = this.getNodeInputResourceTypes(node);
        node.activeRecipe = detectRecipe(def.id, inputResources);
    }

    // Check if a node has the required input connections
    checkNodeInputs(node) {
        const def = node.buildingDef;

        // Determine required inputs
        let requiredInputs;
        if (def.usesRecipes) {
            if (!node.activeRecipe) {
                return false; // No recipe matched - can't produce
            }
            requiredInputs = node.activeRecipe.inputs;
        } else {
            requiredInputs = def.consumption;
        }

        // If no consumption required, no inputs needed
        if (!requiredInputs || Object.keys(requiredInputs).length === 0) {
            return true;
        }

        // Check each required resource has an input connection
        for (const [resource, _rate] of Object.entries(requiredInputs)) {
            const hasInputForResource = node.inputs.some(inputNodeId => {
                const connection = this.canvas.connections.find(c =>
                    c.fromNode.id === inputNodeId && c.toNode.id === node.id
                );
                return connection && connection.resourceType === resource;
            });

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

        // Add production from each node
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;

            if (!def) {
                throw new Error(`Node ${node.id} has no buildingDef!`);
            }

            // Resolve active recipe for recipe-based buildings
            this.resolveActiveRecipe(node);

            // Determine effective production and consumption
            let effectiveProduction;
            let effectiveConsumption;

            if (def.usesRecipes) {
                if (node.activeRecipe) {
                    effectiveProduction = node.activeRecipe.outputs;
                    effectiveConsumption = node.activeRecipe.inputs;
                } else {
                    effectiveProduction = {};
                    effectiveConsumption = {};
                }
            } else {
                effectiveProduction = def.production || {};
                effectiveConsumption = def.consumption || {};
            }

            // Determine stalled state
            if (Object.keys(effectiveConsumption).length > 0) {
                const hasRequiredInputs = this.checkNodeInputs(node);
                const hasResources = this.resources.canAfford(effectiveConsumption);
                node.stalled = !(hasRequiredInputs && hasResources);
            } else if (def.usesRecipes && !node.activeRecipe) {
                // Recipe building with no matched recipe: stalled
                node.stalled = true;
            } else {
                node.stalled = false;
            }

            // Apply production (if not stalled)
            if (!node.stalled) {
                Object.entries(effectiveProduction).forEach(([resource, rate]) => {
                    const currentRate = this.resources.resources[resource].production;
                    this.resources.setProduction(resource, currentRate + rate * node.level);
                });
            }

            // Apply consumption (if not stalled)
            if (!node.stalled) {
                Object.entries(effectiveConsumption).forEach(([resource, rate]) => {
                    const currentRate = this.resources.resources[resource].production;
                    this.resources.setProduction(resource, currentRate - rate * node.level);
                });
            }
        });
    }

    // Handle building dropped on canvas
    onBuildingDropped(buildingType, screenX, screenY, recipeId) {
        const count = this.buildingCounts[buildingType] || 0;
        const cost = calculateBuildingCost(buildingType, count);

        // Check if can afford
        if (!this.resources.canAfford(cost)) {
            const costText = Object.entries(cost)
                .map(([resource, amount]) => `${formatNumber(amount)} ${resource}`)
                .join(', ');
            showUserNotification(`Insufficient resources! Need: ${costText}`, 'error');
            log(`Cannot afford ${buildingType} (need ${JSON.stringify(cost)})`);
            return;
        }

        // Spend resources
        this.resources.spend(cost);

        // Convert screen coordinates to world coordinates (accounting for pan/zoom)
        const worldPos = this.canvas.screenToWorld(screenX, screenY);

        // Create and place node at world coordinates
        const node = new FactoryNode(buildingType, worldPos.x, worldPos.y);

        // Pre-set hint recipe for immediate display (game loop will override from connections)
        if (recipeId) {
            const recipes = getRecipesForBuilding(buildingType);
            const hint = recipes.find(r => r.id === recipeId);
            if (hint) {
                node.hintRecipe = hint;
                node.updateDisplay();
            }
        }

        this.canvas.addNode(node);

        // Update count (immutable update)
        this.buildingCounts = {
            ...this.buildingCounts,
            [buildingType]: count + 1
        };

        // Update UI
        this.sidebar.updateResources();
        this.sidebar.updateBuildingPalette(this.buildingCounts);

        log(`Placed ${buildingType} at world (${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)}) (total: ${this.buildingCounts[buildingType]})`);
    }

    // Save game
    save() {
        try {
            // Use desktop OS save system (integrated save)
            if (!window.desktop) {
                throw new Error('Desktop OS not available, cannot save');
            }

            window.desktop.save();
            log('Game saved successfully');
        } catch (e) {
            throw new Error(`Failed to save game: ${e.message}`);
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

            // MIGRATION: Convert old building types to new generic types
            if (data.canvas && data.canvas.nodes) {
                let buildingsMigrated = 0;
                data.canvas.nodes.forEach(node => {
                    // Extractors: oreMiner → ironExtractor
                    if (node.buildingType === 'oreMiner') {
                        node.buildingType = 'ironExtractor';
                        buildingsMigrated++;
                    }
                    // Smelters: specific → generic
                    else if (node.buildingType === 'ironSmelter' || node.buildingType === 'smelter') {
                        node.buildingType = 'smelter';
                        buildingsMigrated++;
                    }
                    else if (node.buildingType === 'copperSmelter') {
                        node.buildingType = 'smelter';
                        buildingsMigrated++;
                    }
                    // Assemblers: specific → generic
                    else if (node.buildingType === 'steelPlateMaker' || node.buildingType === 'wireMaker' || node.buildingType === 'circuitMaker') {
                        node.buildingType = 'assembler';
                        buildingsMigrated++;
                    }
                    // Manufacturers: specific → generic
                    else if (node.buildingType === 'engineFactory' || node.buildingType === 'computerFactory') {
                        node.buildingType = 'manufacturer';
                        buildingsMigrated++;
                    }
                });
                if (buildingsMigrated > 0) {
                    log(`Migration: Converted ${buildingsMigrated} building(s) to new generic types`);
                }
            }

            // MIGRATION: Convert old resource types to new types
            if (data.resources) {
                let resourcesMigrated = 0;
                if (data.resources.ore) {
                    data.resources.oreA = data.resources.ore;
                    delete data.resources.ore;
                    resourcesMigrated++;
                }
                if (data.resources.metal) {
                    data.resources.barA = data.resources.metal;
                    delete data.resources.metal;
                    resourcesMigrated++;
                }
                if (resourcesMigrated > 0) {
                    log(`Migration: Converted ${resourcesMigrated} resource type(s) to new types`);
                }
            }

            // MIGRATION: Convert old building counts to new types
            if (data.buildingCounts) {
                // Extractors
                if (data.buildingCounts.oreMiner) {
                    data.buildingCounts.ironExtractor = (data.buildingCounts.ironExtractor || 0) + data.buildingCounts.oreMiner;
                    delete data.buildingCounts.oreMiner;
                }

                // Smelters: combine all smelter types into generic smelter count
                const smelterCount = (data.buildingCounts.smelter || 0) +
                                    (data.buildingCounts.ironSmelter || 0) +
                                    (data.buildingCounts.copperSmelter || 0);
                if (smelterCount > 0) {
                    data.buildingCounts.smelter = smelterCount;
                    delete data.buildingCounts.ironSmelter;
                    delete data.buildingCounts.copperSmelter;
                }

                // Assemblers: combine all assembler types into generic assembler count
                const assemblerCount = (data.buildingCounts.steelPlateMaker || 0) +
                                      (data.buildingCounts.wireMaker || 0) +
                                      (data.buildingCounts.circuitMaker || 0);
                if (assemblerCount > 0) {
                    data.buildingCounts.assembler = assemblerCount;
                    delete data.buildingCounts.steelPlateMaker;
                    delete data.buildingCounts.wireMaker;
                    delete data.buildingCounts.circuitMaker;
                }

                // Manufacturers: combine all manufacturer types into generic manufacturer count
                const manufacturerCount = (data.buildingCounts.engineFactory || 0) +
                                         (data.buildingCounts.computerFactory || 0);
                if (manufacturerCount > 0) {
                    data.buildingCounts.manufacturer = manufacturerCount;
                    delete data.buildingCounts.engineFactory;
                    delete data.buildingCounts.computerFactory;
                }
            }

            // MIGRATION: Update connection resource types
            if (data.canvas && data.canvas.connections) {
                data.canvas.connections.forEach(conn => {
                    if (conn.resourceType === 'ore') {
                        conn.resourceType = 'oreA';
                    } else if (conn.resourceType === 'metal') {
                        conn.resourceType = 'barA';
                    }
                });
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
            throw new Error(`Failed to load game: ${e.message}`);
        }
    }
}
