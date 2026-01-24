// Warehouse App Class
// Desktop application for resource storage management and upgrades

class WarehouseApp extends App {
    constructor() {
        super();
        this.id = 'warehouse';
        this.title = 'Warehouse';
        this.icon = '📦';
        this.resourceManager = null;
        this.capacityUpgrades = {
            ore: 0,
            metal: 0
        };
        this.updateInterval = null;
    }

    mount(contentElement) {
        // Clone warehouse template
        const template = document.getElementById('warehouse-app-template');
        if (!template) {
            console.error('Warehouse app template not found!');
            return;
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        // Setup event listeners
        this.setupUpgradeButtons(contentElement);

        // Game instance is guaranteed available (no polling needed)
        this.resourceManager = window.gameInstance?.resources;

        if (!this.resourceManager) {
            console.error('Warehouse: Game instance not available!');
            return;
        }

        log('Warehouse: Game instance connected');

        // Apply capacity upgrades from loaded save data
        if (this.capacityUpgrades && Object.keys(this.capacityUpgrades).length > 0) {
            Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
                const increaseAmount = 1000 * level;
                const initialCapacity = RESOURCES[type].initialCapacity;
                this.resourceManager.resources[type].capacity = initialCapacity + increaseAmount;
                log(`Warehouse: Applied ${level} capacity upgrades to ${type} (new capacity: ${initialCapacity + increaseAmount})`);
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

    updateDisplay(root) {
        if (!this.resourceManager) return;

        const resources = this.resourceManager.resources;
        const gameInstance = window.gameInstance;

        // Track overall system status
        let hasDeficit = false;
        let hasNearFull = false;

        Object.entries(resources).forEach(([type, data]) => {
            if (type === 'credits') return; // Skip credits

            // Update TOTAL column (current / capacity)
            const totalEl = root.querySelector(`#wh-${type}-total`);
            if (totalEl) {
                const percentage = (data.current / data.capacity) * 100;
                totalEl.textContent = `${formatNumber(data.current)} / ${formatNumber(data.capacity)}`;

                // Color coding based on capacity
                if (percentage > 90) {
                    totalEl.style.color = '#ff0000'; // Red: nearly full
                    hasNearFull = true;
                } else if (percentage > 70) {
                    totalEl.style.color = '#ffff00'; // Yellow: getting full
                } else {
                    totalEl.style.color = '#00ff00'; // Green: plenty of space
                }
            }

            // Update OUTPUT column (total production from all buildings)
            const outputEl = root.querySelector(`#wh-${type}-output`);
            if (outputEl) {
                const production = this.calculateTotalProduction(type);
                outputEl.textContent = production > 0 ? `+${formatRate(production)}` : '0/s';
                outputEl.style.color = production > 0 ? '#00ff00' : '#888888';
            }

            // Update DEMAND column (total consumption from all buildings)
            const demandEl = root.querySelector(`#wh-${type}-demand`);
            if (demandEl) {
                const demand = this.calculateTotalDemand(type);
                demandEl.textContent = demand > 0 ? formatRate(demand) : '0/s';
                demandEl.style.color = demand > 0 ? '#ffaa00' : '#888888';
            }

            // Update +/- column (net rate)
            const netEl = root.querySelector(`#wh-${type}-net`);
            if (netEl) {
                const net = data.production;
                const sign = net >= 0 ? '+' : '';
                netEl.textContent = sign + formatRate(net);

                // Color coding
                if (net < -0.01) {
                    netEl.style.color = '#ff0000'; // Red: deficit
                    hasDeficit = true;
                } else if (net > 0.01) {
                    netEl.style.color = '#00ff00'; // Green: surplus
                } else {
                    netEl.style.color = '#ffff00'; // Yellow: balanced
                }
            }

            // Update STATUS indicator
            const indicatorEl = root.querySelector(`#wh-${type}-indicator`);
            if (indicatorEl) {
                const net = data.production;
                if (net < -0.01) {
                    indicatorEl.className = 'status-indicator red';
                } else if (net > 0.01) {
                    indicatorEl.className = 'status-indicator green';
                } else {
                    indicatorEl.className = 'status-indicator yellow';
                }
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
        let production = 0;
        const gameInstance = window.gameInstance;

        if (!gameInstance || !gameInstance.canvas || !gameInstance.canvas.nodes) {
            return 0;
        }

        gameInstance.canvas.nodes.forEach(node => {
            const def = node.buildingDef;
            // Count ALL production, not just non-stalled nodes
            if (def.production && def.production[resourceType]) {
                production += def.production[resourceType] * node.level;
            }
        });

        return production;
    }

    calculateTotalDemand(resourceType) {
        let demand = 0;
        const gameInstance = window.gameInstance;

        if (!gameInstance || !gameInstance.canvas || !gameInstance.canvas.nodes) {
            return 0;
        }

        gameInstance.canvas.nodes.forEach(node => {
            const def = node.buildingDef;
            // Count ALL demand, not just non-stalled nodes
            if (def.consumption && def.consumption[resourceType]) {
                demand += def.consumption[resourceType] * node.level;
            }
        });

        return demand;
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

    upgradeCapacity(resourceType, root) {
        const currentLevel = this.capacityUpgrades[resourceType] || 0;
        const baseCost = 100;
        const cost = Math.floor(baseCost * Math.pow(1.5, currentLevel));

        // Check if can afford
        if (!this.resourceManager || this.resourceManager.get('credits') < cost) {
            log(`Cannot afford capacity upgrade (need ${formatNumber(cost)} credits)`);
            return;
        }

        // Spend credits
        this.resourceManager.remove('credits', cost);

        // Increase capacity
        const increaseAmount = 1000; // +1000 capacity per upgrade
        this.resourceManager.resources[resourceType].capacity += increaseAmount;

        // Track upgrade level
        this.capacityUpgrades[resourceType] = currentLevel + 1;

        log(`Upgraded ${resourceType} capacity to ${formatNumber(this.resourceManager.resources[resourceType].capacity)} (+${increaseAmount})`);

        // Update display
        this.updateDisplay(root);
    }

    updateUpgradeButtons(root) {
        Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
            const btn = root.querySelector(`[data-resource="${type}"].upgrade-capacity-btn`);
            if (btn && this.resourceManager) {
                const baseCost = 100;
                const cost = Math.floor(baseCost * Math.pow(1.5, level));
                const canAfford = this.resourceManager.get('credits') >= cost;

                btn.textContent = `Upgrade (${formatNumber(cost)} cr)`;

                // Visual feedback for affordability
                if (canAfford) {
                    btn.style.color = '#00ff00';
                    btn.style.borderColor = '#00ff00';
                } else {
                    btn.style.color = '#888888';
                    btn.style.borderColor = '#444444';
                }
            }
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
            this.capacityUpgrades = data.capacityUpgrades;

            // Apply capacity upgrades to resource manager
            if (this.resourceManager) {
                Object.entries(this.capacityUpgrades).forEach(([type, level]) => {
                    const increaseAmount = 1000 * level;
                    // Get initial capacity from resources data
                    const initialCapacity = RESOURCES[type].initialCapacity;
                    this.resourceManager.resources[type].capacity = initialCapacity + increaseAmount;
                });
            }
        }
    }
}
