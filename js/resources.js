// Resource Manager
// Handles all resource tracking and operations

class ResourceManager {
    constructor() {
        this.resources = {};
        this.initialize();
    }

    initialize() {
        // Initialize resources from RESOURCES data
        Object.entries(RESOURCES).forEach(([id, def]) => {
            this.resources[id] = {
                name: def.name,
                current: def.initialAmount,
                capacity: def.initialCapacity,
                production: 0, // Per second
                icon: def.icon,
                color: def.color
            };
        });
        log('ResourceManager initialized');
    }

    // Add resource (respects capacity)
    add(resourceType, amount) {
        if (!this.resources[resourceType]) {
            console.warn(`Resource type ${resourceType} does not exist`);
            return false;
        }

        const res = this.resources[resourceType];
        const oldAmount = res.current;
        res.current = Math.min(res.current + amount, res.capacity);

        // Return actual amount added (in case of capacity limit)
        return res.current - oldAmount;
    }

    // Remove resource
    remove(resourceType, amount) {
        if (!this.resources[resourceType]) {
            console.warn(`Resource type ${resourceType} does not exist`);
            return false;
        }

        const res = this.resources[resourceType];
        if (res.current < amount) {
            return false; // Not enough resources
        }

        res.current -= amount;
        return true;
    }

    // Check if can afford costs
    canAfford(costs) {
        if (!costs) return true;

        return Object.entries(costs).every(([type, amount]) => {
            const res = this.resources[type];
            return res && res.current >= amount;
        });
    }

    // Spend resources (check and remove)
    spend(costs) {
        if (!this.canAfford(costs)) return false;

        Object.entries(costs).forEach(([type, amount]) => {
            this.remove(type, amount);
        });

        return true;
    }

    // Get current amount of resource
    get(resourceType) {
        const res = this.resources[resourceType];
        return res ? res.current : 0;
    }

    // Set production rate
    setProduction(resourceType, rate) {
        if (!this.resources[resourceType]) {
            console.warn(`Resource type ${resourceType} does not exist`);
            return;
        }

        this.resources[resourceType].production = rate;
    }

    // Update resources based on production rates (called every tick)
    updateProduction(deltaTime) {
        Object.entries(this.resources).forEach(([type, data]) => {
            if (data.production !== 0) {
                this.add(type, data.production * deltaTime);
            }
        });
    }

    // Get save data
    getSaveData() {
        const data = {};
        Object.entries(this.resources).forEach(([type, res]) => {
            data[type] = {
                current: res.current,
                capacity: res.capacity
            };
        });
        return data;
    }

    // Load save data
    loadSaveData(data) {
        Object.entries(data).forEach(([type, resData]) => {
            if (this.resources[type]) {
                this.resources[type].current = resData.current || 0;
                this.resources[type].capacity = resData.capacity || this.resources[type].capacity;
            }
        });
        log('Resources loaded from save data');
    }
}
