// Resource Definitions
// Data-driven resource configuration

const RESOURCES = {
    // Currency
    credits: {
        id: 'credits',
        name: 'Credits',
        description: 'Currency for purchasing buildings and upgrades',
        icon: 'paid',
        color: '#e8c840',
        tier: 0,
        initialAmount: 100,
        initialCapacity: Infinity,
        sellPrice: null  // Not directly sellable
    },

    // Tier 1 - Raw Ores (from Extractors)
    oreA: {
        id: 'oreA',
        name: 'Iron Ore',
        description: 'Raw iron ore extracted from the planet',
        icon: 'hexagon',
        color: '#888888',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000,
        sellPrice: 0.5
    },
    oreB: {
        id: 'oreB',
        name: 'Copper Ore',
        description: 'Raw copper ore extracted from the planet',
        icon: 'hexagon',
        color: '#cd7f32',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000,
        sellPrice: 0.8
    },

    // Tier 2 - Bars (from Smelters)
    barA: {
        id: 'barA',
        name: 'Iron Bar',
        description: 'Refined iron bar processed from iron ore',
        icon: 'view_timeline',
        color: '#aaaaaa',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000,
        sellPrice: 2.0
    },
    barB: {
        id: 'barB',
        name: 'Copper Bar',
        description: 'Refined copper bar processed from copper ore',
        icon: 'view_timeline',
        color: '#b87333',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000,
        sellPrice: 3.0
    },

    // Tier 3 - Components (from Assemblers)
    componentA: {
        id: 'componentA',
        name: 'Steel Plate',
        description: 'Sturdy steel plate made from iron bars',
        icon: 'layers',
        color: '#cccccc',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000,
        sellPrice: 10.0
    },
    componentB: {
        id: 'componentB',
        name: 'Wire',
        description: 'Copper wire for electrical systems',
        icon: 'cable',
        color: '#ffa500',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000,
        sellPrice: 8.0
    },
    componentC: {
        id: 'componentC',
        name: 'Circuit',
        description: 'Basic circuit board made from multiple materials',
        icon: 'memory',
        color: '#a07818',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 20.0
    },

    // Tier 4 - Advanced Products (from Manufacturers)
    productA: {
        id: 'productA',
        name: 'Engine',
        description: 'Mechanical engine for advanced machinery',
        icon: 'settings',
        color: '#4169e1',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 200,
        sellPrice: 80.0
    },
    productB: {
        id: 'productB',
        name: 'Computer',
        description: 'Advanced computer system',
        icon: 'computer',
        color: '#40c8a8',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 200,
        sellPrice: 100.0
    }
};

// Helper function to get resource definition
function getResourceDef(resourceId) {
    return RESOURCES[resourceId];
}
