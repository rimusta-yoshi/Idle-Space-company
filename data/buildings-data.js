// Building Definitions
// Data-driven building configuration

const BUILDINGS = {
    oreMiner: {
        id: 'oreMiner',
        name: 'Ore Miner',
        description: 'Extracts raw ore from the planet surface',
        baseCost: { credits: 10 },
        costMultiplier: 1.15, // Each additional building costs 15% more
        production: { ore: 1.0 }, // Produces 1.0 ore per second (60/min Satisfactory-style)
        consumption: {}, // No inputs required
        width: 150,
        height: 80,
        color: '#004400',
        icon: '⛏️',
        unlocked: true
    },
    smelter: {
        id: 'smelter',
        name: 'Smelter',
        description: 'Converts ore into refined metal (requires 2 ore miners)',
        baseCost: { credits: 50 },
        costMultiplier: 1.15,
        production: { metal: 1.0 }, // Produces 1.0 metal per second (60/min)
        consumption: { ore: 2.0 }, // Consumes 2.0 ore per second (120/min) - needs 2 miners!
        width: 150,
        height: 80,
        color: '#440000',
        icon: '🔥',
        unlocked: true
    }
};

// Helper function to get building definition
function getBuildingDef(buildingId) {
    return BUILDINGS[buildingId];
}

// Helper function to calculate current building cost
function calculateBuildingCost(buildingId, currentCount) {
    const def = BUILDINGS[buildingId];
    if (!def) return null;

    const costs = {};
    Object.entries(def.baseCost).forEach(([resource, amount]) => {
        costs[resource] = Math.floor(amount * Math.pow(def.costMultiplier, currentCount));
    });
    return costs;
}
