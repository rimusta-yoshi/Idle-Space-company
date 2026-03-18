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
            throw new Error(`Resource type ${resourceType} does not exist`);
        }

        const res = this.resources[resourceType];
        const oldAmount = res.current;
        const newAmount = Math.min(res.current + amount, res.capacity);

        // Create new resource object (immutable update)
        this.resources = {
            ...this.resources,
            [resourceType]: {
                ...res,
                current: newAmount
            }
        };

        // Return actual amount added (in case of capacity limit)
        return newAmount - oldAmount;
    }

    // Remove resource
    remove(resourceType, amount) {
        if (!this.resources[resourceType]) {
            throw new Error(`Resource type ${resourceType} does not exist`);
        }

        const res = this.resources[resourceType];
        if (res.current < amount) {
            return false; // Not enough resources
        }

        // Create new resource object (immutable update)
        this.resources = {
            ...this.resources,
            [resourceType]: {
                ...res,
                current: res.current - amount
            }
        };
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
            throw new Error(`Resource type ${resourceType} does not exist`);
        }

        // Create new resource object (immutable update)
        this.resources = {
            ...this.resources,
            [resourceType]: {
                ...this.resources[resourceType],
                production: rate
            }
        };
    }

    // Set capacity (immutable update)
    setCapacity(resourceType, newCapacity) {
        if (!this.resources[resourceType]) {
            throw new Error(`Resource type ${resourceType} does not exist`);
        }

        // Create new resource object (immutable update)
        this.resources = {
            ...this.resources,
            [resourceType]: {
                ...this.resources[resourceType],
                capacity: newCapacity
            }
        };
    }

    // Increase capacity (immutable update)
    increaseCapacity(resourceType, amount) {
        if (!this.resources[resourceType]) {
            throw new Error(`Resource type ${resourceType} does not exist`);
        }

        const res = this.resources[resourceType];
        this.setCapacity(resourceType, res.capacity + amount);
    }

    // Update resources based on production rates (called every tick)
    updateProduction(deltaTime) {
        Object.entries(this.resources).forEach(([type, data]) => {
            if (data.production === 0) return;
            const delta = data.production * deltaTime;
            const newAmount = Math.max(0, Math.min(data.current + delta, data.capacity));
            if (newAmount !== data.current) {
                this.resources[type] = { ...data, current: newAmount };
            }
        });
    }

    // Get save data
    getSaveData() {
        const data = {};
        Object.entries(this.resources).forEach(([type, res]) => {
            // Only save current amount, NOT capacity (capacity comes from definitions)
            data[type] = {
                current: res.current
            };
        });
        return data;
    }

    // Load save data
    loadSaveData(data) {
        Object.entries(data).forEach(([type, resData]) => {
            if (this.resources[type]) {
                // Only load current amount, capacity always comes from RESOURCES definitions
                this.resources[type].current = resData.current || 0;
                // Don't load capacity - it's set from RESOURCES in initialize()
            }
        });
        log('Resources loaded from save data');
    }
}
