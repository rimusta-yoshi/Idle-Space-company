// Resource Definitions
// Data-driven resource configuration

const RESOURCES = {
    ore: {
        id: 'ore',
        name: 'Ore',
        description: 'Raw ore extracted from the planet',
        icon: '⛏️',
        color: '#888888',
        initialAmount: 0,
        initialCapacity: 200
    },
    metal: {
        id: 'metal',
        name: 'Metal',
        description: 'Refined metal processed from ore',
        icon: '🔧',
        color: '#aaaaaa',
        initialAmount: 0,
        initialCapacity: 100
    },
    credits: {
        id: 'credits',
        name: 'Credits',
        description: 'Currency for purchasing buildings and upgrades',
        icon: '💰',
        color: '#ffff00',
        initialAmount: 100,
        initialCapacity: Infinity
    }
};

// Helper function to get resource definition
function getResourceDef(resourceId) {
    return RESOURCES[resourceId];
}
