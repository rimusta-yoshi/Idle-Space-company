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
            console.error('Upgrade panel not found');
            return;
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
            const costText = Object.entries(upgradeCost)
                .map(([resource, amount]) => `${formatNumber(amount)} ${resource}`)
                .join(', ');
            const costElement = this.rootElement.querySelector('#upgrade-cost');
            if (costElement) costElement.textContent = costText;

            // Check if can afford
            const canAfford = this.game.resources.canAfford(upgradeCost);
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
        let text = '';

        // Show production
        if (def.production && Object.keys(def.production).length > 0) {
            const parts = Object.entries(def.production).map(([resource, rate]) => {
                const totalRate = rate * lvl;
                return `+${formatRate(totalRate)} ${resource}`;
            });
            text += parts.join(', ');
        }

        // Show consumption
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

        // Max level (for now, let's say 10)
        if (currentLevel >= 10) {
            return null;
        }

        // Upgrade cost scales with level
        // Base cost * (level ^ 1.5)
        const baseCost = def.baseCost;
        const upgradeCost = {};

        Object.entries(baseCost).forEach(([resource, amount]) => {
            upgradeCost[resource] = Math.floor(amount * Math.pow(currentLevel, 1.5));
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

        // Check if can afford
        if (!this.game.resources.canAfford(cost)) {
            log('Cannot afford upgrade');
            return;
        }

        // Spend resources
        this.game.resources.spend(cost);

        // Increase level
        this.currentNode.level++;

        // Update UI
        this.game.sidebar.updateResources();
        this.updatePanelDisplay();
        this.game.canvas.updateNodes();

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

        // Update building count
        if (this.game.buildingCounts[buildingType] > 0) {
            this.game.buildingCounts[buildingType]--;
        }

        // Update UI
        this.game.sidebar.updateBuildingPalette(this.game.buildingCounts);

        // Close panel
        this.closePanel();

        log(`Deleted ${node.buildingDef.name}`);
    }
}
