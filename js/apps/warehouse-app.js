// Warehouse App Class
// Desktop application for resource storage management and upgrades

class WarehouseApp extends App {
    constructor() {
        super();
        this.id = 'warehouse';
        this.title = 'INVENTORY CONTROL SYSTEM';
        this.icon = 'WH';
        this.resourceManager = null;
        this.capacityUpgrades = {
            // Tier 1 — Raw Extractables
            ironOre: 0,
            copperOre: 0,
            coal: 0,
            rareMins: 0,
            // Tier 2 — Smelted
            ironBar: 0,
            copperBar: 0,
            refinedFuel: 0,
            // Tier 3 — Assembled
            steelPlate: 0,
            copperWire: 0,
            // Tier 4 — Manufactured
            circuitBoard: 0,
            insulatedWire: 0,
            fuelCell: 0
        };
        this.updateInterval = null;
    }

    mount(contentElement) {
        // Clone warehouse template
        const template = document.getElementById('warehouse-app-template');
        if (!template) {
            throw new Error('Warehouse app template not found');
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        // Setup event listeners
        this.setupUpgradeButtons(contentElement);

        // Game instance is guaranteed available (no polling needed)
        this.resourceManager = window.gameInstance?.resources;

        if (!this.resourceManager) {
            throw new Error('Warehouse: Game instance not available');
        }

        // Apply capacity upgrades from loaded save data
        if (this.capacityUpgrades && Object.keys(this.capacityUpgrades).length > 0) {
            Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
                if (!RESOURCES[type] || level === 0) return;
                const initialCapacity = RESOURCES[type].initialCapacity;
                this.resourceManager.setCapacity(type, initialCapacity + CAPACITY_UPGRADE_AMOUNT * level);
            });
        }

        // Initial display update
        this.updateDisplay(contentElement);

        // Start update loop
        this.startUpdateLoop(contentElement);
    }

    startUpdateLoop(root) {
        this.updateInterval = setInterval(() => {
            this.updateDisplay(root);
        }, 500); // Update twice per second for smooth display
    }

    _netColor(net) {
        if (net < -0.01) return '#cc3333';
        if (net > 0.01) return '#4a8a4a';
        return '#e8c840';
    }

    _capacityColor(percentage) {
        if (percentage > 90) return '#cc3333';
        if (percentage > 70) return '#e8c840';
        return '#4a8a4a';
    }

    updateDisplay(root) {
        if (!this.resourceManager) return;

        const resources = this.resourceManager.resources;

        // Track overall system status
        let hasDeficit = false;
        let hasNearFull = false;

        Object.entries(resources).forEach(([type, data]) => {
            if (type === 'credits') return; // Skip credits

            const percentage = (data.current / data.capacity) * 100;
            const net = data.production;

            // TOTAL column
            const totalEl = root.querySelector(`#wh-${type}-total`);
            if (totalEl) {
                totalEl.textContent = `${formatNumber(data.current)} / ${formatNumber(data.capacity)}`;
                totalEl.style.color = this._capacityColor(percentage);
                if (percentage > 90) hasNearFull = true;
            }

            // OUTPUT column — actual rate from flow model
            const outputEl = root.querySelector(`#wh-${type}-output`);
            if (outputEl) {
                const production = this.calculateTotalProduction(type);
                outputEl.textContent = production > 0.001 ? `+${formatRatePerMin(production)}` : '—';
                outputEl.style.color = production > 0.001 ? '#4a8a4a' : '#555555';
            }

            // DEMAND column — actual rate (efficiency-adjusted)
            const demandEl = root.querySelector(`#wh-${type}-demand`);
            if (demandEl) {
                const demand = this.calculateTotalDemand(type);
                demandEl.textContent = demand > 0.001 ? formatRatePerMin(demand) : '—';
                demandEl.style.color = demand > 0.001 ? '#a07818' : '#555555';
            }

            // NET column — actual net from resource manager (already efficiency-adjusted)
            const netEl = root.querySelector(`#wh-${type}-net`);
            if (netEl) {
                const sign = net >= 0 ? '+' : '';
                netEl.textContent = `${sign}${formatRatePerMin(net)}`;
                netEl.style.color = this._netColor(net);
                if (net < -0.01) hasDeficit = true;
            }

            // STATUS indicator
            const indicatorEl = root.querySelector(`#wh-${type}-indicator`);
            if (indicatorEl) {
                const state = net < -0.01 ? 'red' : net > 0.01 ? 'green' : 'yellow';
                indicatorEl.className = `status-indicator ${state}`;
            }
        });

        // Update traffic light indicators in header
        const greenLight = root.querySelector('.status-light.green');
        const yellowLight = root.querySelector('.status-light.yellow');
        const redLight = root.querySelector('.status-light.red');

        // Dim all lights first
        if (greenLight) greenLight.style.opacity = '0.3';
        if (yellowLight) yellowLight.style.opacity = '0.3';
        if (redLight) redLight.style.opacity = '0.3';

        // Light up appropriate indicator
        if (hasDeficit) {
            if (redLight) redLight.style.opacity = '1';
        } else if (hasNearFull) {
            if (yellowLight) yellowLight.style.opacity = '1';
        } else {
            if (greenLight) greenLight.style.opacity = '1';
        }

        // Update upgrade buttons
        this.updateUpgradeButtons(root);
    }

    calculateTotalProduction(resourceType) {
        const gameInstance = window.gameInstance;
        if (!gameInstance?.canvas?.nodes) return 0;

        // Use actualOutputRate — set by the flow model each tick, efficiency-adjusted
        return gameInstance.canvas.nodes.reduce((sum, node) => {
            return sum + ((node.actualOutputRate || {})[resourceType] || 0);
        }, 0);
    }

    calculateTotalDemand(resourceType) {
        const gameInstance = window.gameInstance;
        if (!gameInstance?.canvas?.nodes) return 0;

        // Scale max demand by node efficiency to reflect what's actually being consumed
        return gameInstance.canvas.nodes.reduce((sum, node) => {
            const def = node.buildingDef;
            const eff = node.efficiency ?? 1.0;
            const inputs = def.usesRecipes
                ? (node.activeRecipe?.inputs || {})
                : (def.consumption || {});
            const rate = (inputs[resourceType] || 0) * node.level * eff;
            return sum + rate;
        }, 0);
    }

    setupUpgradeButtons(root) {
        const upgradeButtons = root.querySelectorAll('.upgrade-capacity-btn');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const resourceType = btn.getAttribute('data-resource');
                this.upgradeCapacity(resourceType, root);
            });
        });
    }

    _upgradeCost(level) {
        return Math.floor(BASE_UPGRADE_COST * Math.pow(UPGRADE_COST_EXPONENT, level));
    }

    upgradeCapacity(resourceType, root) {
        const currentLevel = this.capacityUpgrades[resourceType] || 0;
        const cost = this._upgradeCost(currentLevel);

        if (!this.resourceManager || this.resourceManager.get('credits') < cost) {
            return;
        }

        this.resourceManager.remove('credits', cost);
        this.resourceManager.increaseCapacity(resourceType, CAPACITY_UPGRADE_AMOUNT);

        this.capacityUpgrades = {
            ...this.capacityUpgrades,
            [resourceType]: currentLevel + 1
        };

        this.updateDisplay(root);
    }

    updateUpgradeButtons(root) {
        Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
            const btn = root.querySelector(`[data-resource="${type}"].upgrade-capacity-btn`);
            if (!btn || !this.resourceManager) return;

            const cost = this._upgradeCost(level);
            const canAfford = this.resourceManager.get('credits') >= cost;

            btn.textContent = `Upgrade (${formatNumber(cost)} cr)`;
            btn.style.color = canAfford ? '#d4a832' : '#555555';
            btn.style.borderColor = canAfford ? '#a07818' : '#333333';
        });
    }

    close() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    getSaveData() {
        return {
            capacityUpgrades: this.capacityUpgrades
        };
    }

    loadSaveData(data) {
        if (data.capacityUpgrades) {
            // Migration: convert old resource names to new names (chains: ore→oreA→ironOre)
            const migrationMap = {
                ore: 'ironOre', metal: 'ironBar',
                oreA: 'ironOre', oreB: 'copperOre',
                barA: 'ironBar', barB: 'copperBar',
                componentA: 'steelPlate', componentB: 'copperWire',
                componentC: 'circuitBoard',
                productA: null, productB: null
            };
            const migrated = {};

            Object.entries(data.capacityUpgrades).forEach(([type, level]) => {
                const newType = migrationMap.hasOwnProperty(type) ? migrationMap[type] : type;
                if (newType && RESOURCES[newType]) {
                    migrated[newType] = (migrated[newType] || 0) + level;
                }
            });

            // Merge migrated data with defaults (preserves new resource keys)
            this.capacityUpgrades = {
                ...this.capacityUpgrades,
                ...migrated
            };

            // Apply capacity upgrades to resource manager
            if (this.resourceManager) {
                Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
                    if (!RESOURCES[type] || level === 0) return;
                    const initialCapacity = RESOURCES[type].initialCapacity;
                    this.resourceManager.setCapacity(type, initialCapacity + CAPACITY_UPGRADE_AMOUNT * level);
                });
            }
        }
    }
}
