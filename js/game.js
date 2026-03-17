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

        // Initialize recipe picker
        this.recipePicker = new RecipePicker(this.rootElement);

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

        // Listen for recipe picker open requests (from action bar)
        document.addEventListener('openRecipePicker', (e) => {
            this.recipePicker.open(e.detail.node);
        });

        // Listen for recipe selection
        document.addEventListener('recipeSelected', (e) => {
            const node = this.canvas.getNode(e.detail.nodeId);
            if (!node) return;
            const recipes = getRecipesForBuilding(node.buildingType);
            const recipe = recipes.find(r => r.id === e.detail.recipeId);
            if (recipe) node.setRecipe(recipe);
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
        this.sidebar.updateBuildingPalette(this.buildingCounts);

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

        if (!node.assignedRecipe) {
            node.activeRecipe = null;
            return;
        }

        // Verify all required inputs of the assigned recipe have connections
        const inputResources = this.getNodeInputResourceTypes(node);
        const allConnected = Object.keys(node.assignedRecipe.inputs).every(res => inputResources[res]);
        node.activeRecipe = allConnected ? node.assignedRecipe : null;
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

    // Calculate production rates from all nodes using connection-based flow propagation.
    // Each node's efficiency (0–1) is determined by the actual flow arriving through its
    // input connections, not the global resource pool. This allows partial throughput
    // when supply is less than demand, rather than binary stall/produce.
    calculateProduction() {
        // Reset all global production rates to 0
        Object.keys(this.resources.resources).forEach(type => {
            this.resources.setProduction(type, 0);
        });

        // ── Pass 0: resolve recipes and seed per-node flow state ────────────
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;
            if (!def) throw new Error(`Node ${node.id} has no buildingDef!`);
            if (def.autoSell) return;

            this.resolveActiveRecipe(node);

            const outputs = def.usesRecipes
                ? (node.activeRecipe?.outputs || {})
                : (def.production || {});
            const inputs = def.usesRecipes
                ? (node.activeRecipe?.inputs || {})
                : (def.consumption || {});

            // Nodes with no inputs (extractors) always run at full capacity
            if (Object.keys(inputs).length === 0) {
                node.efficiency = 1.0;
            } else if (def.usesRecipes && !node.activeRecipe) {
                node.efficiency = 0; // No recipe / missing connections
            } else {
                node.efficiency = 0; // Will converge in iterations below
            }

            node.actualOutputRate = {};
            Object.entries(outputs).forEach(([res, rate]) => {
                node.actualOutputRate[res] = rate * node.level * node.efficiency;
            });
        });

        // ── Iterative flow convergence ────────────────────────────────────────
        // Each pass propagates actual flow one step down the chain.
        // 10 passes handles chains far deeper than any realistic factory.
        for (let pass = 0; pass < 10; pass++) {
            let changed = false;

            this.canvas.nodes.forEach(node => {
                const def = node.buildingDef;
                if (def.autoSell) return;

                const inputs = def.usesRecipes
                    ? (node.activeRecipe?.inputs || {})
                    : (def.consumption || {});

                if (Object.keys(inputs).length === 0) return; // Extractor — already final
                if (def.usesRecipes && !node.activeRecipe) return; // No recipe — stays 0

                // For each required input, sum the flow arriving via connections
                let newEfficiency = 1.0;
                for (const [resource, required] of Object.entries(inputs)) {
                    let available = 0;
                    this.canvas.connections.forEach(conn => {
                        if (conn.toNode.id !== node.id || conn.resourceType !== resource) return;
                        const fromNode = conn.fromNode;
                        const fromRate = (fromNode.actualOutputRate || {})[resource] || 0;
                        // Split upstream output equally among all its downstream connections
                        const splitCount = this.canvas.connections.filter(c =>
                            c.fromNode.id === fromNode.id && c.resourceType === resource
                        ).length;
                        available += fromRate / Math.max(1, splitCount);
                    });
                    newEfficiency = Math.min(newEfficiency, available / (required * node.level));
                }

                newEfficiency = Math.max(0, Math.min(1, newEfficiency));

                if (Math.abs(newEfficiency - (node.efficiency || 0)) > 0.0001) {
                    changed = true;
                    node.efficiency = newEfficiency;

                    const outputs = def.usesRecipes
                        ? (node.activeRecipe?.outputs || {})
                        : (def.production || {});
                    node.actualOutputRate = {};
                    Object.entries(outputs).forEach(([res, rate]) => {
                        node.actualOutputRate[res] = rate * node.level * newEfficiency;
                    });
                }
            });

            if (!changed) break;
        }

        // ── Apply node flows to global resource pool ─────────────────────────
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;

            // Auto-sell: consume the flow arriving from upstream, sell for credits
            if (def.autoSell) {
                const inputResources = this.getNodeInputResourceTypes(node);
                const connectedResource = Object.keys(inputResources)[0] || null;
                node.autoSellResource = connectedResource;

                if (connectedResource) {
                    let available = 0;
                    this.canvas.connections.forEach(conn => {
                        if (conn.toNode.id !== node.id || conn.resourceType !== connectedResource) return;
                        const fromNode = conn.fromNode;
                        const fromRate = (fromNode.actualOutputRate || {})[connectedResource] || 0;
                        const splitCount = this.canvas.connections.filter(c =>
                            c.fromNode.id === fromNode.id && c.resourceType === connectedResource
                        ).length;
                        available += fromRate / Math.max(1, splitCount);
                    });

                    const maxRate = 1.0 * node.level;
                    const consumeRate = Math.min(maxRate, available);
                    const resDef = RESOURCES[connectedResource];
                    const sellRate = (resDef?.sellPrice || 0) * 0.70;

                    node.efficiency = maxRate > 0 ? consumeRate / maxRate : 0;
                    node.stalled = consumeRate === 0;

                    if (consumeRate > 0) {
                        const cur = r => this.resources.resources[r].production;
                        this.resources.setProduction(connectedResource, cur(connectedResource) - consumeRate);
                        this.resources.setProduction('credits', cur('credits') + sellRate * consumeRate);
                    }
                } else {
                    node.efficiency = 0;
                    node.stalled = true;
                }
                return;
            }

            // Standard nodes: apply scaled production and consumption rates
            const eff = node.efficiency || 0;
            node.stalled = eff < 0.01;

            const outputs = def.usesRecipes
                ? (node.activeRecipe?.outputs || {})
                : (def.production || {});
            const inputs = def.usesRecipes
                ? (node.activeRecipe?.inputs || {})
                : (def.consumption || {});

            Object.entries(outputs).forEach(([res, rate]) => {
                const cur = this.resources.resources[res].production;
                this.resources.setProduction(res, cur + rate * node.level * eff);
            });
            Object.entries(inputs).forEach(([res, rate]) => {
                const cur = this.resources.resources[res].production;
                this.resources.setProduction(res, cur - rate * node.level * eff);
            });
        });
    }

    // Handle building dropped on canvas
    onBuildingDropped(buildingType, screenX, screenY) {
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

        // Create and place node
        const node = new FactoryNode(buildingType, worldPos.x, worldPos.y);
        this.canvas.addNode(node);

        // Auto-open recipe picker for recipe-capable buildings
        if (node.buildingDef.usesRecipes) {
            this.recipePicker.open(node);
        }

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

    // ── Save/load migrations (applied in load() before parsing) ────────────

    _migrateMarketBuildings(data) {
        if (!data.canvas?.nodes) return;
        const before = data.canvas.nodes.length;
        data.canvas.nodes = data.canvas.nodes.filter(n => n.buildingType !== 'market');
        const removed = before - data.canvas.nodes.length;
        if (removed > 0 && data.canvas.connections) {
            const ids = new Set(data.canvas.nodes.map(n => n.id));
            data.canvas.connections = data.canvas.connections.filter(
                c => ids.has(c.fromNodeId) && ids.has(c.toNodeId)
            );
        }
    }

    _migrateBuildingTypes(data) {
        if (!data.canvas?.nodes) return;
        const typeMap = {
            oreMiner: 'ironExtractor',
            ironSmelter: 'smelter', copperSmelter: 'smelter',
            steelPlateMaker: 'assembler', wireMaker: 'assembler', circuitMaker: 'assembler',
            engineFactory: 'manufacturer', computerFactory: 'manufacturer'
        };
        data.canvas.nodes.forEach(node => {
            if (typeMap[node.buildingType]) node.buildingType = typeMap[node.buildingType];
        });
    }

    _migrateResourceTypes(data) {
        if (!data.resources) return;
        if (data.resources.ore)   { data.resources.oreA = data.resources.ore;  delete data.resources.ore; }
        if (data.resources.metal) { data.resources.barA = data.resources.metal; delete data.resources.metal; }
    }

    _migrateBuildingCounts(data) {
        if (!data.buildingCounts) return;
        const counts = data.buildingCounts;
        if (counts.oreMiner) { counts.ironExtractor = (counts.ironExtractor || 0) + counts.oreMiner; delete counts.oreMiner; }
        const merge = (target, ...sources) => {
            counts[target] = sources.reduce((sum, k) => sum + (counts[k] || 0), counts[target] || 0);
            sources.forEach(k => delete counts[k]);
        };
        merge('smelter', 'ironSmelter', 'copperSmelter');
        merge('assembler', 'steelPlateMaker', 'wireMaker', 'circuitMaker');
        merge('manufacturer', 'engineFactory', 'computerFactory');
    }

    _migrateConnectionResources(data) {
        if (!data.canvas?.connections) return;
        data.canvas.connections.forEach(conn => {
            if (conn.resourceType === 'ore')   conn.resourceType = 'oreA';
            if (conn.resourceType === 'metal') conn.resourceType = 'barA';
        });
    }

    // Load game
    load(providedData = null) {
        try {
            let data = providedData;

            if (!data) {
                const raw = localStorage.getItem('idleSpaceCompany_save');
                if (!raw) return false;
                data = JSON.parse(raw);
            }

            if (!data) return false;

            // Apply all migrations in sequence
            this._migrateMarketBuildings(data);
            this._migrateBuildingTypes(data);
            this._migrateResourceTypes(data);
            this._migrateBuildingCounts(data);
            this._migrateConnectionResources(data);

            // Load state
            if (data.resources)      this.resources.loadSaveData(data.resources);
            if (data.canvas)         this.canvas.loadSaveData(data.canvas);
            if (data.buildingCounts) this.buildingCounts = data.buildingCounts;

            this.calculateProduction();

            if (data.timestamp) {
                const offlineData = this.offlineCalc.calculateOfflineProgress(data.timestamp);
                if (offlineData) this.offlineCalc.showOfflineNotification(offlineData);
            }

            this.sidebar.updateResources();
            this.sidebar.updateBuildingPalette(this.buildingCounts);

            log('Game loaded successfully');
            return true;
        } catch (e) {
            throw new Error(`Failed to load game: ${e.message}`);
        }
    }
}
