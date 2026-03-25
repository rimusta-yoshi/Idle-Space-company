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
        initialAmount: 0,
        initialCapacity: Infinity,
        sellPrice: null  // Not directly sellable
    },

    // ── Tier 1 — Raw Extractables ──────────────────────────────────────────

    ironOre: {
        id: 'ironOre',
        name: 'Iron Ore',
        description: 'Raw iron ore extracted from the planet surface',
        icon: 'hexagon',
        color: '#607888',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000,
        sellPrice: 0.5
    },

    copperOre: {
        id: 'copperOre',
        name: 'Copper Ore',
        description: 'Raw copper ore extracted from the planet surface',
        icon: 'hexagon',
        color: '#d05820',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000,
        sellPrice: 0.8
    },

    coal: {
        id: 'coal',
        name: 'Coal',
        description: 'Combustible mineral — burns for power or refines into fuel',
        icon: 'local_fire_department',
        color: '#556050',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 5000,
        sellPrice: 0.3
    },

    rareMins: {
        id: 'rareMins',
        name: 'Rare Minerals',
        description: 'Scarce exotic minerals required for advanced electronics',
        icon: 'diamond',
        color: '#8840c0',
        tier: 1,
        initialAmount: 0,
        initialCapacity: 1000,
        sellPrice: 5.0
    },

    // ── Tier 2 — Smelted ──────────────────────────────────────────────────

    ironBar: {
        id: 'ironBar',
        name: 'Iron Bar',
        description: 'Refined iron bar processed from iron ore',
        icon: 'view_timeline',
        color: '#7898a8',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000,
        sellPrice: 2.0
    },

    copperBar: {
        id: 'copperBar',
        name: 'Copper Bar',
        description: 'Refined copper bar processed from copper ore',
        icon: 'view_timeline',
        color: '#e07030',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000,
        sellPrice: 3.0
    },

    refinedFuel: {
        id: 'refinedFuel',
        name: 'Refined Fuel',
        description: 'Processed fuel derived from coal — powers ships and fuel cells',
        icon: 'local_gas_station',
        color: '#2070c8',
        tier: 2,
        initialAmount: 0,
        initialCapacity: 2000,
        sellPrice: 4.0
    },

    // ── Tier 3 — Assembled ────────────────────────────────────────────────

    steelPlate: {
        id: 'steelPlate',
        name: 'Steel Plate',
        description: 'Structural steel plate rolled from iron bars',
        icon: 'layers',
        color: '#6088a0',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000,
        sellPrice: 10.0
    },

    copperWire: {
        id: 'copperWire',
        name: 'Copper Wire',
        description: 'Drawn copper wire for electrical systems',
        icon: 'cable',
        color: '#e89040',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 1000,
        sellPrice: 8.0
    },

    // ── Tier 3.5 — Assembled Components ──────────────────────────────────

    basicFrame: {
        id: 'basicFrame',
        name: 'Basic Frame',
        description: 'Structural frame assembled from steel and copper wire',
        icon: 'grid_on',
        color: '#908058',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 25.0
    },

    hullPlating: {
        id: 'hullPlating',
        name: 'Hull Plating',
        description: 'Armoured hull panels for spacecraft construction',
        icon: 'shield',
        color: '#506878',
        tier: 3,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 55.0
    },

    // ── Tier 4 — Manufactured ─────────────────────────────────────────────

    circuitBoard: {
        id: 'circuitBoard',
        name: 'Circuit Board',
        description: 'Precision circuit board — requires rare minerals',
        icon: 'memory',
        color: '#18a050',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 25.0
    },

    insulatedWire: {
        id: 'insulatedWire',
        name: 'Insulated Wire',
        description: 'Copper wire with iron-alloy insulation casing',
        icon: 'cable',
        color: '#c07828',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 15.0
    },

    fuelCell: {
        id: 'fuelCell',
        name: 'Fuel Cell',
        description: 'Pressurised fuel cell for ship propulsion systems',
        icon: 'battery_charging_full',
        color: '#3060b0',
        tier: 4,
        initialAmount: 0,
        initialCapacity: 500,
        sellPrice: 20.0
    },

    // ── Tier 5 — Ship Parts ────────────────────────────────────────────────

    fuelTank: {
        id: 'fuelTank',
        name: 'Fuel Tank',
        description: 'High-pressure fuel storage tank for spacecraft',
        icon: 'propane_tank',
        color: '#306888',
        tier: 5,
        initialAmount: 0,
        initialCapacity: 200,
        sellPrice: 80.0
    },

    wiringHarness: {
        id: 'wiringHarness',
        name: 'Wiring Harness',
        description: 'Bundled insulated wiring system for spacecraft electronics',
        icon: 'cable',
        color: '#b86030',
        tier: 5,
        initialAmount: 0,
        initialCapacity: 200,
        sellPrice: 120.0
    },

    navCore: {
        id: 'navCore',
        name: 'Navigation Core',
        description: 'Advanced navigation computer built from precision circuit boards',
        icon: 'explore',
        color: '#4068d0',
        tier: 5,
        initialAmount: 0,
        initialCapacity: 200,
        sellPrice: 200.0
    },

    engineAssembly: {
        id: 'engineAssembly',
        name: 'Engine Assembly',
        description: 'Complete ship engine — the hardest convergence point in production',
        icon: 'rocket',
        color: '#c83020',
        tier: 5,
        initialAmount: 0,
        initialCapacity: 100,
        sellPrice: 400.0
    },

    // ── Special ────────────────────────────────────────────────────────────

    power: {
        id: 'power',
        name: 'Power',
        icon: 'bolt',
        color: '#90c010',
        tier: 0,
        initialAmount: 0,
        initialCapacity: Infinity,
        sellPrice: null
    }
};

// Helper function to get resource definition
function getResourceDef(resourceId) {
    return RESOURCES[resourceId];
}
