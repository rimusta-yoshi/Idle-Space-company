// Resource Definitions
// Data-driven resource configuration

const RESOURCES = {
    // Currency
    credits: {
        id: 'credits',
        name: 'Credits',
        description: 'Currency for purchasing buildings and upgrades',
        icon: '💰',
        color: '#ffff00',
        tier: 0,
        initialAmount: 100,
        initialCapacity: Infinity
    },

    // Tier 1 - Raw Ores (from Extractors)
    oreA: {
        id: 'oreA',
        name: 'Iron Ore',
        description: 'Raw iron ore extracted from the planet',
        icon: '⛏️',
        color: '#888888',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000
    },
    oreB: {
        id: 'oreB',
        name: 'Copper Ore',
        description: 'Raw copper ore extracted from the planet',
        icon: '🪨',
        color: '#cd7f32',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000
    },

    // Tier 2 - Bars (from Smelters)
    barA: {
        id: 'barA',
        name: 'Iron Bar',
        description: 'Refined iron bar processed from iron ore',
        icon: '🔩',
        color: '#aaaaaa',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000
    },
    barB: {
        id: 'barB',
        name: 'Copper Bar',
        description: 'Refined copper bar processed from copper ore',
        icon: '🟫',
        color: '#b87333',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000
    },

    // Tier 3 - Components (from Assemblers)
    componentA: {
        id: 'componentA',
        name: 'Steel Plate',
        description: 'Sturdy steel plate made from iron bars',
        icon: '⬜',
        color: '#cccccc',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000
    },
    componentB: {
        id: 'componentB',
        name: 'Wire',
        description: 'Copper wire for electrical systems',
        icon: '〰️',
        color: '#ffa500',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000
    },
    componentC: {
        id: 'componentC',
        name: 'Circuit',
        description: 'Basic circuit board made from multiple materials',
        icon: '💾',
        color: '#00ff00',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 500
    },

    // Tier 4 - Advanced Products (from Manufacturers)
    productA: {
        id: 'productA',
        name: 'Engine',
        description: 'Mechanical engine for advanced machinery',
        icon: '⚙️',
        color: '#4169e1',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 200
    },
    productB: {
        id: 'productB',
        name: 'Computer',
        description: 'Advanced computer system',
        icon: '💻',
        color: '#00ffff',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 200
    }
};

// Helper function to get resource definition
function getResourceDef(resourceId) {
    return RESOURCES[resourceId];
}
