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
        this.graphDirty = true; // Flow must recalculate on first tick
        this._marketUnlockFired = false; // Guard: only dispatch market unlock once per session
        this._firstOreCommsFired = false; // Guard: comms first ore message
        this._credits100Fired = false;    // Guard: comms credits 100 milestone
        this._credits250Fired = false;    // Guard: comms credits 250 milestone

        // Trader system
        this.traderManager = new TraderManager();

        // Franchise progression
        this.franchise = {
            tier: 0,
            freeClaims: getInitialFreeClaims(),  // Remaining free building claims
            pendingBonusExtractors: 0            // Bonus extractor claims awaiting assignment
        };

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

        // Listen for remove requests from node action bar (with optional material refund)
        document.addEventListener('removeNodeRequest', (e) => {
            this._handleNodeRemove(e.detail.node);
        });

        // Listen for first sale (fired by trader-manager)
        document.addEventListener('firstSaleCompleted', () => {
            if (window.commsManager) window.commsManager.unlockMessage('first_sale');
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

        // Animation manager — visual-only, no game logic
        this.animManager = new AnimationManager(this.canvas);

        // Initial UI update
        this.sidebar.updateResources();
        this.sidebar.refreshPalette(this.getUnlockedBuildings(), this.buildingCounts, this.franchise);

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
        this.sidebar.updatePower(this.powerSupply, this.powerDemand);
        this.sidebar.updateBuildingPalette(this.buildingCounts, this.franchise);

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
        // Capture dirty state before calculateProduction clears it
        const wasGraphDirty = this.graphDirty;

        // Calculate production rates based on placed buildings
        this.calculateProduction(deltaTime);

        // Update credits from production rates (only credits use setProduction now)
        this.resources.updateProduction(deltaTime);

        // Rebuild node display only when graph state changed; otherwise just refresh
        // storage fill bars (inventory changes every tick, everything else is stable)
        if (wasGraphDirty) {
            this.canvas.updateNodes();
        } else {
            this.canvas.updateStorageDisplay();
        }

        // Visual animations — visual only, no game logic
        this.animManager.update(deltaTime, this.canvas.nodes);

        // Trader system: count down timers, refill empty slots
        this.traderManager.tick(deltaTime, this.franchise.tier);

        // Check credit milestone comms messages
        this._checkCreditsMilestones();
    }

    _checkCreditsMilestones() {
        if (this._credits100Fired && this._credits250Fired) return;
        const credits = this.resources.get('credits');
        if (!this._credits100Fired && credits >= 100) {
            this._credits100Fired = true;
            if (window.commsManager) window.commsManager.unlockMessage('credits_100');
        }
        if (!this._credits250Fired && credits >= 250) {
            this._credits250Fired = true;
            if (window.commsManager) window.commsManager.unlockMessage('credits_250');
        }
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

    // Returns true if a node has all the connections it needs to actively produce.
    // Returns false if it should be in standby (has some connections but can't produce yet).
    isNodeFullyConnected(node) {
        const def = node.buildingDef;
        if (def.isStorage || def.autoSell) return true;

        const hasOutput = this.canvas.connections.some(c => c.fromNode.id === node.id);
        const outputsToPool = def.production && def.production.power;
        if (!hasOutput && !outputsToPool) return false;

        if (def.isSplitter) return true; // Only needs an output; input flow determines throughput

        if (def.usesRecipes) {
            if (!node.assignedRecipe) return false;
            return Object.keys(node.assignedRecipe.inputs).every(resource =>
                this.canvas.connections.some(c => c.toNode.id === node.id && c.resourceType === resource)
            );
        }

        const inputs = def.consumption || {};
        return Object.keys(inputs).every(resource =>
            this.canvas.connections.some(c => c.toNode.id === node.id && c.resourceType === resource)
        );
    }

    // Calculate production rates from all nodes using connection-based flow propagation.
    // Each node's efficiency (0–1) is determined by the actual flow arriving through its
    // input connections, not the global resource pool. This allows partial throughput
    // when supply is less than demand, rather than binary stall/produce.
    calculateProduction(deltaTime = 0) {
        // Reset credits production rate only — non-credit resources live in storage nodes
        this.resources.setProduction('credits', 0);

        // ── Flow calculation — only when graph topology or levels have changed ─
        if (this.graphDirty) {

            // Reset derived per-node flags before recalculating
            this.canvas.nodes.forEach(node => { node.standby = false; });

            // ── Pass 0: resolve recipes and seed per-node flow state ────────────
            this.canvas.nodes.forEach(node => {
                const def = node.buildingDef;
                if (!def) throw new Error(`Node ${node.id} has no buildingDef!`);
                if (def.autoSell) return;

                // Storage nodes: act as unlimited source if they have inventory, zero if empty
                if (def.isStorage) {
                    node.efficiency = 1.0;
                    node.actualOutputRate = {};
                    if (node.storedResourceType && node.inventory > 0) {
                        node.actualOutputRate[node.storedResourceType] = 9999;
                    }
                    return;
                }

                // Splitter: seeded to zero, converged each pass like any consumer
                if (def.isSplitter) {
                    node.efficiency = 0;
                    node.actualOutputRate = {};
                    return;
                }

                this.resolveActiveRecipe(node);

                // Standby: has at least one connection but not all required connections present
                const hasAnyConn = this.canvas.connections.some(
                    c => c.fromNode.id === node.id || c.toNode.id === node.id
                );
                if (hasAnyConn && !this.isNodeFullyConnected(node)) {
                    node.standby = true;
                    node.efficiency = 0;
                    node.actualOutputRate = {};
                    return;
                }

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

                const initMult = def.levelMultipliers
                    ? (def.levelMultipliers[node.level - 1] ?? 1.0)
                    : node.level;
                node.actualOutputRate = {};
                Object.entries(outputs).forEach(([res, rate]) => {
                    node.actualOutputRate[res] = rate * initMult * node.efficiency;
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
                    if (def.isStorage) return; // Already seeded — act as source, not converged
                    if (node.standby) return;  // Standby — not fully connected, stays at 0

                    // Splitter: pass-through — output = sum of arriving flow, split by downstream count
                    if (def.isSplitter) {
                        const newOutputRate = {};
                        this.canvas.connections.forEach(conn => {
                            if (conn.toNode.id !== node.id) return;
                            const fromRate = (conn.fromNode.actualOutputRate || {})[conn.resourceType] || 0;
                            const splitCount = this.canvas.connections.filter(c =>
                                c.fromNode.id === conn.fromNode.id && c.resourceType === conn.resourceType
                            ).length;
                            newOutputRate[conn.resourceType] = (newOutputRate[conn.resourceType] || 0)
                                + fromRate / Math.max(1, splitCount);
                        });
                        const newEff = Object.values(newOutputRate).some(r => r > 0) ? 1.0 : 0;
                        const [resKey, newRate] = Object.entries(newOutputRate)[0] || [null, 0];
                        const prevRate = resKey ? ((node.actualOutputRate || {})[resKey] || 0) : 0;
                        if (Math.abs(newEff - (node.efficiency || 0)) > 0.0001
                                || Math.abs(newRate - prevRate) > 0.0001) {
                            changed = true;
                            node.efficiency = newEff;
                            node.actualOutputRate = newOutputRate;
                        }
                        return;
                    }

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
                        const iterMult = def.levelMultipliers
                            ? (def.levelMultipliers[node.level - 1] ?? 1.0)
                            : node.level;
                        node.actualOutputRate = {};
                        Object.entries(outputs).forEach(([res, rate]) => {
                            node.actualOutputRate[res] = rate * iterMult * newEfficiency;
                        });
                    }
                });

                if (!changed) break;
            }

            // ── Power balance ──────────────────────────────────────────────────
            // Sum supply from generators and max-demand from all other buildings.
            // If supply < demand, cap all non-generator node efficiencies at the ratio.

            // Reset power throttle flag on every node before recalculating
            this.canvas.nodes.forEach(node => { node.powerThrottled = false; });

            let totalPowerSupply = 0;
            let totalPowerDemand = 0;

            this.canvas.nodes.forEach(node => {
                const def = node.buildingDef;
                if (def.autoSell) return;
                if ((node.actualOutputRate || {}).power) {
                    totalPowerSupply += node.actualOutputRate.power;
                }
                if (def.powerDemand && def.id !== 'powerGenerator') {
                    // Only draw power when fully connected (input AND output).
                    // Partially connected or bare nodes are considered off.
                    // Recipe buildings also require a valid detected recipe.
                    const hasInput  = this.canvas.connections.some(c => c.toNode.id   === node.id);
                    const hasOutput = this.canvas.connections.some(c => c.fromNode.id === node.id);
                    const recipeOk  = !def.usesRecipes || !!node.activeRecipe;
                    if (hasInput && hasOutput && recipeOk) {
                        // Demand at max throughput (level only) — stable, avoids oscillation
                        totalPowerDemand += def.powerDemand * node.level;
                    }
                }
            });

            const powerRatio = totalPowerDemand > 0.001
                ? (totalPowerSupply > 0 ? Math.min(1, totalPowerSupply / totalPowerDemand) : 0)
                : 1;

            this.powerSupply = totalPowerSupply;
            this.powerDemand = totalPowerDemand;
            this.powerRatio = powerRatio;

            if (powerRatio < 0.9999) {
                this.canvas.nodes.forEach(node => {
                    const def = node.buildingDef;
                    // Skip: auto-sell nodes, power generators, and buildings with no power demand
                    // (extractors have no powerDemand — throttling them creates a circular dependency
                    //  with power generators that need their output)
                    if (def.autoSell || def.isStorage || !def.powerDemand || def.id === 'powerGenerator') return;
                    const currentEff = node.efficiency || 0;
                    const newEff = Math.min(currentEff, powerRatio);
                    // Only flag as power-throttled when power is the actual binding constraint
                    if (powerRatio < currentEff) node.powerThrottled = true;
                    if (Math.abs(newEff - (node.efficiency || 0)) > 0.0001) {
                        node.efficiency = newEff;
                        const outputs = def.usesRecipes
                            ? (node.activeRecipe?.outputs || {})
                            : (def.production || {});
                        const powerMult = def.levelMultipliers
                            ? (def.levelMultipliers[node.level - 1] ?? 1.0)
                            : node.level;
                        node.actualOutputRate = {};
                        Object.entries(outputs).forEach(([res, rate]) => {
                            node.actualOutputRate[res] = rate * powerMult * newEff;
                        });
                    }
                });
            }

            // ── Update per-connection flow rates (for arrow labels) ──────────────
            this.canvas.connections.forEach(conn => {
                const fromNode = conn.fromNode;
                if (fromNode.buildingDef?.isStorage) {
                    // Storage output: actual flow = what the downstream building actually consumes
                    const toNode = conn.toNode;
                    const toDef = toNode.buildingDef;
                    const toInputs = toDef.usesRecipes
                        ? (toNode.activeRecipe?.inputs || {})
                        : (toDef.consumption || {});
                    const toRate = (toInputs[conn.resourceType] || 0) * toNode.level;
                    const splitCount = this.canvas.connections.filter(c =>
                        c.toNode.id === toNode.id && c.resourceType === conn.resourceType
                    ).length;
                    conn.flowRate = (toNode.efficiency || 0) * toRate / Math.max(1, splitCount);
                } else {
                    const fromRate = (fromNode.actualOutputRate || {})[conn.resourceType] || 0;
                    const splitCount = this.canvas.connections.filter(c =>
                        c.fromNode.id === fromNode.id && c.resourceType === conn.resourceType
                    ).length;
                    conn.flowRate = fromRate / Math.max(1, splitCount);
                }
                conn.updateLabel();
            });

            this.graphDirty = false;
        }

        // ── Storage node inventory tick ───────────────────────────────────────
        // Inflow = actual flow arriving via input connections
        // Outflow = actual consumption by downstream buildings drawing from this storage
        // Pre-build split-count maps once to avoid O(C²) per-node filtering
        const fromSplitCount = new Map(); // key: `${fromNodeId}:${res}` → count
        const toSplitCount = new Map();   // key: `${toNodeId}:${res}` → count
        this.canvas.connections.forEach(conn => {
            const fk = `${conn.fromNode.id}:${conn.resourceType}`;
            fromSplitCount.set(fk, (fromSplitCount.get(fk) || 0) + 1);
            const tk = `${conn.toNode.id}:${conn.resourceType}`;
            toSplitCount.set(tk, (toSplitCount.get(tk) || 0) + 1);
        });

        this.canvas.nodes.forEach(node => {
            if (!node.buildingDef?.isStorage || !node.storedResourceType) return;

            let inflow = 0;
            this.canvas.connections.forEach(conn => {
                if (conn.toNode.id !== node.id) return;
                const fromNode = conn.fromNode;
                const res = conn.resourceType;
                const fromRate = (fromNode.actualOutputRate || {})[res] || 0;
                const splitCount = fromSplitCount.get(`${fromNode.id}:${res}`) || 1;
                inflow += fromRate / splitCount;
            });

            let outflow = 0;
            this.canvas.connections.forEach(conn => {
                if (conn.fromNode.id !== node.id) return;
                const toNode = conn.toNode;
                const toDef = toNode.buildingDef;
                const toInputs = toDef.usesRecipes
                    ? (toNode.activeRecipe?.inputs || {})
                    : (toDef.consumption || {});
                let toRate;
                if (toDef.autoSell) {
                    // autoSell consumption isn't in def.consumption — use rate stored last tick
                    toRate = toNode.autoSellConsumeRate || 0;
                } else {
                    toRate = (toInputs[conn.resourceType] || 0) * toNode.level;
                }
                const splitCount = toSplitCount.get(`${toNode.id}:${conn.resourceType}`) || 1;
                outflow += toDef.autoSell ? toRate / splitCount : (toNode.efficiency || 0) * toRate / splitCount;
            });

            // Store rates on node so warehouse app can read them directly
            node.inflowRate = inflow;
            node.outflowRate = outflow;

            if (deltaTime > 0) {
                const wasEmpty = node.inventory <= 0;
                const cap = node.inventoryCapacity || 1;
                node.inventory = Math.max(0, Math.min(cap, node.inventory + (inflow - outflow) * deltaTime));
                if (wasEmpty !== (node.inventory <= 0)) this.graphDirty = true;

                // Fire market unlock on first resource entering any storage node
                if (!this._marketUnlockFired && wasEmpty && node.inventory > 0) {
                    this._marketUnlockFired = true;
                    document.dispatchEvent(new CustomEvent('unlockApp', { detail: { appId: 'market' } }));
                }

                // Fire first ore comms message
                if (!this._firstOreCommsFired && wasEmpty && node.inventory > 0) {
                    this._firstOreCommsFired = true;
                    if (window.commsManager) window.commsManager.unlockMessage('first_ore');
                }
            }
        });

        // ── Credits from export terminals ─────────────────────────────────────
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;
            if (!def.autoSell) return;

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

                node.autoSellConsumeRate = consumeRate;
                node.efficiency = maxRate > 0 ? consumeRate / maxRate : 0;
                node.stalled = consumeRate === 0;

                if (consumeRate > 0) {
                    const cur = this.resources.resources['credits'].production;
                    this.resources.setProduction('credits', cur + sellRate * consumeRate);
                }
            } else {
                node.autoSellConsumeRate = 0;
                node.efficiency = 0;
                node.stalled = true;
            }
        });

        // ── Non-credit nodes: stalled flag only (no global pool) ─────────────
        this.canvas.nodes.forEach(node => {
            const def = node.buildingDef;
            if (def.autoSell || def.isStorage) return;
            node.stalled = (node.efficiency || 0) < 0.01;
        });

        // ── Sync ResourceManager totals from storage nodes (for canAfford display) ──
        const storageAgg = {};
        this.canvas.nodes.forEach(node => {
            if (!node.buildingDef?.isStorage || !node.storedResourceType) return;
            storageAgg[node.storedResourceType] = (storageAgg[node.storedResourceType] || 0) + node.inventory;
        });
        Object.keys(this.resources.resources).forEach(type => {
            if (type === 'credits') return;
            const res = this.resources.resources[type];
            this.resources.resources[type] = { ...res, current: storageAgg[type] || 0 };
        });
    }

    // Deduct non-credit resources directly from storage node inventories (FIFO)
    _deductFromStorage(resourceType, amount) {
        let remaining = amount;
        for (const node of this.canvas.nodes) {
            if (!node.buildingDef?.isStorage) continue;
            if (node.storedResourceType !== resourceType) continue;
            const take = Math.min(node.inventory, remaining);
            node.inventory -= take;
            remaining -= take;
            if (remaining <= 0) break;
        }
        return remaining <= 0;
    }

    // Add resources to storage nodes (FIFO across matching nodes, then empty nodes)
    _addToStorage(resourceType, amount) {
        let remaining = amount;

        // Fill existing nodes holding this resource type first
        for (const node of this.canvas.nodes) {
            if (!node.buildingDef?.isStorage || node.storedResourceType !== resourceType) continue;
            const space = Math.max(0, node.inventoryCapacity - node.inventory);
            const add = Math.min(remaining, space);
            node.inventory += add;
            remaining -= add;
            if (remaining <= 0) return true;
        }

        // Spill into empty storage nodes
        for (const node of this.canvas.nodes) {
            if (!node.buildingDef?.isStorage || node.storedResourceType) continue;
            node.storedResourceType = resourceType;
            const add = Math.min(remaining, node.inventoryCapacity);
            node.inventory = add;
            remaining -= add;
            if (remaining <= 0) return true;
        }

        return remaining < amount; // true if at least some was added
    }

    // Remove a node from the canvas, refunding credit cost if not a starter kit node
    _handleNodeRemove(node) {
        if (!node) return;

        // Refund creditCost for non-starter-kit nodes
        if (!node.isStarterKit) {
            const creditCost = node.buildingDef?.creditCost;
            if (creditCost) {
                this.resources.add('credits', creditCost);
            }
        }

        // Update building count
        const buildingType = node.buildingType;
        if ((this.buildingCounts[buildingType] || 0) > 0) {
            this.buildingCounts = {
                ...this.buildingCounts,
                [buildingType]: this.buildingCounts[buildingType] - 1
            };
        }

        // Refund extractor claim so it can be re-placed
        if (node.buildingDef?.category === 'extractors') {
            this.franchise = {
                ...this.franchise,
                freeClaims: {
                    ...this.franchise.freeClaims,
                    [buildingType]: (this.franchise.freeClaims[buildingType] || 0) + 1
                }
            };
        }

        // Remove node (also removes all connected edges and marks graph dirty)
        this.canvas.removeNode(node.id);

        // Update UI
        this.sidebar.updateBuildingPalette(this.buildingCounts, this.franchise);
    }

    // Check affordability using storage inventories for non-credit costs
    canAfford(costs) {
        if (!costs) return true;
        return Object.entries(costs).every(([type, amount]) => {
            if (type === 'credits') return this.resources.get('credits') >= amount;
            // Non-credit: sum across all storage nodes
            let total = 0;
            this.canvas.nodes.forEach(node => {
                if (node.buildingDef?.isStorage && node.storedResourceType === type) {
                    total += node.inventory;
                }
            });
            return total >= amount;
        });
    }

    // Spend costs: credits from ResourceManager, materials from storage nodes
    spendCosts(costs) {
        if (!this.canAfford(costs)) return false;
        Object.entries(costs).forEach(([type, amount]) => {
            if (type === 'credits') {
                this.resources.remove('credits', amount);
            } else {
                this._deductFromStorage(type, amount);
            }
        });
        return true;
    }

    // Handle building dropped on canvas
    onBuildingDropped(buildingType, screenX, screenY) {
        const count = this.buildingCounts[buildingType] || 0;

        // Check free claims first — claim-only buildings (extractors) can't be bought
        const hasClaim = this.hasFreeClaim(buildingType);
        const isClaimOnly = CLAIM_ONLY_CATEGORIES.has(BUILDINGS[buildingType]?.category);

        if (isClaimOnly && !hasClaim) {
            showUserNotification('No extractor claims remaining. Advance your STRATUM franchise tier.', 'error');
            return;
        }

        let usedFreeClaim = false;
        if (!hasClaim) {
            // Normal cost path
            const cost = calculateBuildingCost(buildingType, count);
            if (!this.canAfford(cost)) {
                const costText = Object.entries(cost)
                    .map(([resource, amount]) => `${formatNumber(amount)} ${resource}`)
                    .join(', ');
                showUserNotification(`Insufficient resources! Need: ${costText}`, 'error');
                return;
            }
            this.spendCosts(cost);
        } else {
            // Free claim path
            this.consumeFreeClaim(buildingType);
            usedFreeClaim = true;
        }

        // Convert screen coordinates to world coordinates (accounting for pan/zoom)
        const worldPos = this.canvas.screenToWorld(screenX, screenY);

        // Create and place node
        const node = new FactoryNode(buildingType, worldPos.x, worldPos.y);
        if (usedFreeClaim) node.isStarterKit = true;
        this.canvas.addNode(node);

        // Update count (immutable update)
        this.buildingCounts = {
            ...this.buildingCounts,
            [buildingType]: count + 1
        };

        // Update UI
        this.sidebar.updateResources();
        this.sidebar.updateBuildingPalette(this.buildingCounts, this.franchise);

        // Fire app unlock events based on what was just placed
        const def = BUILDINGS[buildingType];
        if (def?.isStorage) {
            document.dispatchEvent(new CustomEvent('unlockApp', { detail: { appId: 'warehouse' } }));
        }
        if (buildingType === 'spaceport') {
            document.dispatchEvent(new CustomEvent('unlockApp', { detail: { appId: 'spaceport' } }));
        }

        log(`Placed ${buildingType} at world (${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)}) (total: ${this.buildingCounts[buildingType]})`);
    }

    // Save game
    // ── Franchise helpers ────────────────────────────────────────────────────

    getUnlockedBuildings() {
        return getAllUnlockedBuildings(this.franchise.tier);
    }

    isBuildingUnlocked(buildingType) {
        return this.getUnlockedBuildings().has(buildingType);
    }

    // Consume one free claim for a building type. Returns true if a claim was available.
    consumeFreeClaim(buildingType) {
        if ((this.franchise.freeClaims[buildingType] || 0) <= 0) return false;
        this.franchise.freeClaims = {
            ...this.franchise.freeClaims,
            [buildingType]: this.franchise.freeClaims[buildingType] - 1
        };
        return true;
    }

    hasFreeClaim(buildingType) {
        return (this.franchise.freeClaims[buildingType] || 0) > 0;
    }

    // Attempt to advance franchise tier by spending credits. Returns true if advanced.
    tryFranchiseAdvance() {
        const next = getNextFranchiseTier(this.franchise.tier);
        if (!next || !next.requires) return false;

        const required = next.requires.creditsSubmit;
        const balance = this.resources.resources['credits']?.current || 0;
        if (balance < required) return false;

        // Spend the credits
        this.resources.remove('credits', required);

        this.franchise.tier = next.tier;
        if (next.bonusExtractorClaims) {
            this.franchise.pendingBonusExtractors += next.bonusExtractorClaims;
        }

        this.sidebar.refreshPalette(this.getUnlockedBuildings(), this.buildingCounts, this.franchise);
        document.dispatchEvent(new CustomEvent('franchiseTierAdvanced', { detail: { tier: next.tier } }));

        // Fire tier comms message
        if (next.tier === 1 && window.commsManager) {
            window.commsManager.unlockMessage('tier_1');
        }
        log(`Franchise advanced to Tier ${next.tier}`);
        return true;
    }

    // Claim one bonus extractor of the given type (from pendingBonusExtractors pool)
    claimBonusExtractor(buildingType) {
        if (this.franchise.pendingBonusExtractors <= 0) return false;
        const def = getBuildingDef(buildingType);
        if (!def || def.category !== 'extractors') return false;

        this.franchise = {
            ...this.franchise,
            freeClaims: {
                ...this.franchise.freeClaims,
                [buildingType]: (this.franchise.freeClaims[buildingType] || 0) + 1
            },
            pendingBonusExtractors: this.franchise.pendingBonusExtractors - 1
        };

        this.sidebar.refreshPalette(this.getUnlockedBuildings(), this.buildingCounts, this.franchise);
        log(`Claimed bonus extractor: ${buildingType}`);
        return true;
    }

    getFranchiseSaveData() {
        return { ...this.franchise };
    }

    loadFranchiseSaveData(data) {
        if (!data) return;
        this.franchise.tier = data.tier ?? 0;
        this.franchise.freeClaims = data.freeClaims ?? getInitialFreeClaims();
        this.franchise.pendingBonusExtractors = data.pendingBonusExtractors ?? 0;
    }

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

    // Migrate placeholder resource keys (oreA/barA etc.) to real names
    _migrateResourceKeys(data) {
        const resKeyMap = {
            oreA: 'ironOre', oreB: 'copperOre',
            barA: 'ironBar', barB: 'copperBar',
            componentA: 'steelPlate', componentB: 'copperWire',
            componentC: 'circuitBoard',
            productA: null, productB: null  // null = delete
        };

        if (data.resources) {
            Object.entries(resKeyMap).forEach(([oldKey, newKey]) => {
                if (data.resources[oldKey] !== undefined) {
                    if (newKey) data.resources[newKey] = data.resources[oldKey];
                    delete data.resources[oldKey];
                }
            });
        }

        if (data.canvas?.connections) {
            data.canvas.connections.forEach(conn => {
                const mapped = resKeyMap[conn.resourceType];
                if (mapped === null) {
                    conn._deleteConn = true;
                } else if (mapped) {
                    conn.resourceType = mapped;
                }
            });
            data.canvas.connections = data.canvas.connections.filter(c => !c._deleteConn);
        }
    }

    // Migrate old recipe IDs to new names
    _migrateRecipeIds(data) {
        if (!data.canvas?.nodes) return;
        const recipeMap = {
            wire: 'copper_wire',
            circuit: 'circuit_board',
            engine: null,
            computer: null
        };
        data.canvas.nodes.forEach(node => {
            if (!node.assignedRecipeId) return;
            const mapped = recipeMap[node.assignedRecipeId];
            if (mapped === null) {
                node.assignedRecipeId = null;
            } else if (mapped) {
                node.assignedRecipeId = mapped;
            }
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
            this._migrateResourceTypes(data);       // ore → oreA
            this._migrateBuildingCounts(data);
            this._migrateConnectionResources(data); // ore → oreA in connections
            this._migrateResourceKeys(data);        // oreA → ironOre etc.
            this._migrateRecipeIds(data);           // wire → copper_wire etc.

            // Load state
            if (data.resources)      this.resources.loadSaveData(data.resources);
            if (data.canvas)         this.canvas.loadSaveData(data.canvas);
            if (data.buildingCounts) this.buildingCounts = data.buildingCounts;
            if (data.franchise)      this.loadFranchiseSaveData(data.franchise);
            if (data.traders)        this.traderManager.loadSaveData(data.traders);

            this.calculateProduction();

            if (data.timestamp) {
                const offlineData = this.offlineCalc.calculateOfflineProgress(data.timestamp);
                if (offlineData) this.offlineCalc.showOfflineNotification(offlineData);
            }

            this.sidebar.updateResources();
            this.sidebar.refreshPalette(this.getUnlockedBuildings(), this.buildingCounts, this.franchise);

            log('Game loaded successfully');
            return true;
        } catch (e) {
            throw new Error(`Failed to load game: ${e.message}`);
        }
    }
}
