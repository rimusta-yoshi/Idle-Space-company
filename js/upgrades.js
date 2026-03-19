// Upgrade Manager
// Handles node upgrades and upgrade panel UI

class UpgradeManager {
    constructor(game, rootElement = document) {
        this.game = game;
        this.rootElement = rootElement;
        this.currentNode = null; // Currently selected node for upgrade
        this.panel = null;
        this.initialize();
    }

    initialize() {
        this.panel = this.rootElement.querySelector('#upgrade-panel');

        if (!this.panel) {
            throw new Error('Upgrade panel not found');
        }

        // Setup close button
        const closeBtn = this.rootElement.querySelector('#upgrade-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }

        // Close on background click
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.closePanel();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panel && this.panel.style.display !== 'none') {
                this.closePanel();
            }
        });

        // Setup upgrade button
        const upgradeBtn = this.rootElement.querySelector('#upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.upgradeNode());
        }

        // Setup delete button
        const deleteBtn = this.rootElement.querySelector('#delete-node-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteNode());
        }

        log('UpgradeManager initialized');
    }

    // Open upgrade panel for a node
    openPanel(node) {
        this.currentNode = node;
        this.updatePanelDisplay();
        this.panel.style.display = 'flex';
        log(`Opened upgrade panel for ${node.buildingDef.name}`);
    }

    // Close upgrade panel
    closePanel() {
        this.panel.style.display = 'none';
        this.currentNode = null;
    }

    // Update panel display with current node info
    updatePanelDisplay() {
        if (!this.currentNode) return;

        const node = this.currentNode;
        const def = node.buildingDef;

        // Update title
        const titleElement = this.rootElement.querySelector('#upgrade-panel-title');
        if (titleElement) titleElement.textContent = def.name;

        // Update current level
        const levelElement = this.rootElement.querySelector('#upgrade-current-level');
        if (levelElement) levelElement.textContent = node.level;

        // Update current production
        const currentProduction = this.getProductionText(node);
        const productionElement = this.rootElement.querySelector('#upgrade-current-production');
        if (productionElement) productionElement.textContent = currentProduction;

        // Update upgrade cost and next level
        const upgradeCost = this.calculateUpgradeCost(node);
        const upgradeBtn = this.rootElement.querySelector('#upgrade-btn');

        if (upgradeCost && upgradeBtn) {
            const costLines = Object.entries(upgradeCost).map(([resource, amount]) => {
                const resDef = (typeof RESOURCES !== 'undefined') ? RESOURCES[resource] : null;
                const name = resDef ? resDef.name.toUpperCase() : resource.toUpperCase();
                return `${formatNumber(amount)} ${name}`;
            });
            upgradeBtn.innerHTML = `UPGRADE &mdash; <span id="upgrade-cost">${costLines.join(' + ')}</span>`;

            // Check if can afford (checks storage nodes for non-credit costs)
            const canAfford = this.game.canAfford(upgradeCost);
            upgradeBtn.disabled = !canAfford;

            // Update next level production
            const nextLevelProduction = this.getProductionText(node, node.level + 1);
            const nextProdElement = this.rootElement.querySelector('#upgrade-next-production');
            if (nextProdElement) nextProdElement.textContent = nextLevelProduction;
        } else if (upgradeBtn) {
            // Max level reached
            upgradeBtn.disabled = true;
            upgradeBtn.textContent = 'MAX LEVEL';
        }
    }

    // Get production text for display
    getProductionText(node, level = null) {
        const def = node.buildingDef;
        const lvl = level || node.level;

        // Recipe-based building: use activeRecipe if available
        if (def.usesRecipes) {
            if (!node.activeRecipe) {
                return 'No Recipe';
            }
            let text = '';
            const outputParts = Object.entries(node.activeRecipe.outputs).map(([resource, rate]) => {
                const totalRate = rate * lvl;
                return `+${formatRate(totalRate)} ${resource}`;
            });
            text += outputParts.join(', ');

            const inputParts = Object.entries(node.activeRecipe.inputs).map(([resource, rate]) => {
                const totalRate = rate * lvl;
                return `-${formatRate(totalRate)} ${resource}`;
            });
            if (text && inputParts.length > 0) text += ' | ';
            text += inputParts.join(', ');

            return text || 'No Recipe';
        }

        // Standard building display
        let text = '';
        if (def.production && Object.keys(def.production).length > 0) {
            const parts = Object.entries(def.production).map(([resource, rate]) => {
                const totalRate = rate * lvl;
                return `+${formatRate(totalRate)} ${resource}`;
            });
            text += parts.join(', ');
        }
        if (def.consumption && Object.keys(def.consumption).length > 0) {
            const parts = Object.entries(def.consumption).map(([resource, rate]) => {
                const totalRate = rate * lvl;
                return `-${formatRate(totalRate)} ${resource}`;
            });
            if (text) text += ' | ';
            text += parts.join(', ');
        }
        return text || 'Idle';
    }

    // Calculate upgrade cost for a node
    calculateUpgradeCost(node) {
        const def = node.buildingDef;
        const currentLevel = node.level;

        if (currentLevel >= 10) return null;

        // Use upgradeBaseCost if defined, otherwise fall back to baseCost
        const baseCost = def.upgradeBaseCost || def.baseCost;
        const upgradeCost = {};

        Object.entries(baseCost).forEach(([resource, amount]) => {
            upgradeCost[resource] = Math.ceil(amount * Math.pow(currentLevel, UPGRADE_COST_EXPONENT));
        });

        return upgradeCost;
    }

    // Upgrade the current node
    upgradeNode() {
        if (!this.currentNode) return;

        const cost = this.calculateUpgradeCost(this.currentNode);
        if (!cost) {
            log('Node is already at max level');
            return;
        }

        // Check if can afford (checks storage nodes for material costs)
        if (!this.game.canAfford(cost)) {
            log('Cannot afford upgrade');
            return;
        }

        // Spend resources (deducts from storage nodes for materials)
        this.game.spendCosts(cost);

        // Increase level (using encapsulated method)
        this.currentNode.upgradeLevel();

        // Update UI
        this.game.sidebar.updateResources();
        this.updatePanelDisplay();

        log(`Upgraded ${this.currentNode.buildingDef.name} to level ${this.currentNode.level}`);
    }

    // Delete the current node
    deleteNode() {
        if (!this.currentNode) return;

        const node = this.currentNode;
        const buildingType = node.buildingType;

        // Remove from canvas
        this.game.canvas.removeNode(node.id);

        // Remove any connections to/from this node
        const connectionsToRemove = this.game.canvas.connections.filter(conn =>
            conn.fromNode === node || conn.toNode === node
        );
        connectionsToRemove.forEach(conn => {
            this.game.canvas.deleteConnection(conn.id);
        });

        // Update building count (immutable update)
        if (this.game.buildingCounts[buildingType] > 0) {
            this.game.buildingCounts = {
                ...this.game.buildingCounts,
                [buildingType]: this.game.buildingCounts[buildingType] - 1
            };
        }

        // Update UI
        this.game.sidebar.updateBuildingPalette(this.game.buildingCounts, this.game.franchise);

        // Close panel
        this.closePanel();

        log(`Deleted ${node.buildingDef.name}`);
    }
}
