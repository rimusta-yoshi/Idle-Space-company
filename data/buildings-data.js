// Building Definitions
// Data-driven building configuration

const BUILDINGS = {
    // ===== EXTRACTORS (Tier 1) =====

    ironExtractor: {
        id: 'ironExtractor',
        name: 'Iron Extractor',
        description: 'Extracts raw iron ore from the planet surface',
        category: 'extractors',
        tier: 1,
        baseCost: {},
        upgradeBaseCost: { ironBar: 5 },
        costMultiplier: 1.15,
        production: { ironOre: 1.0 },
        consumption: {},
        color: '#0d1510',
        icon: 'mining',
        unlocked: true,
        maxLevel: 3,
        levelMultipliers: [1.0, 1.6, 2.5],
        levelUpgradeCosts: [
            { ironBar: 20, steelPlate: 5 },
            { ironBar: 50, steelPlate: 20, circuitBoard: 5 }
        ]
    },

    copperExtractor: {
        id: 'copperExtractor',
        name: 'Copper Extractor',
        description: 'Extracts raw copper ore from the planet surface',
        category: 'extractors',
        tier: 1,
        baseCost: {},
        upgradeBaseCost: { copperBar: 5 },
        costMultiplier: 1.15,
        production: { copperOre: 1.0 },
        consumption: {},
        color: '#1a1108',
        icon: 'mining',
        unlocked: true,
        maxLevel: 3,
        levelMultipliers: [1.0, 1.6, 2.5],
        levelUpgradeCosts: [
            { copperBar: 20, copperWire: 8 },
            { copperBar: 50, copperWire: 25, circuitBoard: 5 }
        ]
    },

    coalExtractor: {
        id: 'coalExtractor',
        name: 'Coal Extractor',
        description: 'Extracts coal — burns for power or refines into fuel',
        category: 'extractors',
        tier: 1,
        baseCost: {},
        upgradeBaseCost: { ironBar: 4 },
        costMultiplier: 1.15,
        production: { coal: 1.0 },
        consumption: {},
        color: '#0d0d0d',
        icon: 'mining',
        unlocked: true,
        maxLevel: 3,
        levelMultipliers: [1.0, 1.6, 2.5],
        levelUpgradeCosts: [
            { ironBar: 15, steelPlate: 5 },
            { ironBar: 40, steelPlate: 15, circuitBoard: 5 }
        ]
    },

    rareMineralExtractor: {
        id: 'rareMineralExtractor',
        name: 'Rare Min. Extractor',
        description: 'Extracts scarce rare minerals — critical for circuit boards',
        category: 'extractors',
        tier: 1,
        baseCost: {},
        upgradeBaseCost: { ironBar: 6, copperBar: 4 },
        costMultiplier: 1.2,
        production: { rareMins: 0.5 },
        consumption: {},
        color: '#1a0a1a',
        icon: 'mining',
        unlocked: true,
        maxLevel: 3,
        levelMultipliers: [1.0, 1.6, 2.5],
        levelUpgradeCosts: [
            { ironBar: 25, steelPlate: 10, copperWire: 10 },
            { steelPlate: 30, circuitBoard: 10, insulatedWire: 10 }
        ]
    },

    // ===== SMELTER (Tier 2) =====

    smelter: {
        id: 'smelter',
        name: 'Smelter',
        description: 'Smelts ores into refined bars (recipe auto-detected)',
        category: 'smelters',
        tier: 2,
        baseCost: {},
        creditCost: 250,
        upgradeBaseCost: { ironBar: 8 },
        costMultiplier: 1.15,
        powerDemand: 3,
        color: '#1a0c08',
        icon: 'mode_heat',
        unlocked: true,
        usesRecipes: true
    },

    // ===== ASSEMBLER (Tier 3) =====

    assembler: {
        id: 'assembler',
        name: 'Assembler',
        description: 'Assembles components from bars (recipe auto-detected)',
        category: 'assemblers',
        tier: 3,
        baseCost: {},
        creditCost: 800,
        upgradeBaseCost: { ironBar: 10, copperBar: 6 },
        costMultiplier: 1.5,
        powerDemand: 5,
        color: '#0a1019',
        icon: 'build',
        unlocked: true,
        usesRecipes: true
    },

    // ===== MANUFACTURER (Tier 4) =====

    manufacturer: {
        id: 'manufacturer',
        name: 'Manufacturer',
        description: 'Manufactures advanced components (recipe auto-detected)',
        category: 'manufacturers',
        tier: 4,
        baseCost: {},
        creditCost: 3500,
        upgradeBaseCost: { steelPlate: 6, copperWire: 8 },
        costMultiplier: 1.5,
        powerDemand: 8,
        color: '#12081a',
        icon: 'precision_manufacturing',
        unlocked: true,
        usesRecipes: true
    },

    // ===== SPLITTER (Infrastructure) =====

    splitter: {
        id: 'splitter',
        name: 'Splitter',
        description: 'Splits input flow equally between up to 3 outputs.',
        category: 'infrastructure',
        tier: 2,
        baseCost: {},
        creditCost: 150,
        upgradeBaseCost: {},
        costMultiplier: 1.0,
        color: '#0a1a0a',
        icon: 'call_split',
        unlocked: true,
        isSplitter: true
    },

    // ===== STORAGE NODE (Infrastructure) =====

    storageNode: {
        id: 'storageNode',
        name: 'Storage',
        description: 'Stores a single resource type. Route surplus here to buffer production chains.',
        category: 'infrastructure',
        tier: 1,
        baseCost: {},
        creditCost: 75,
        upgradeBaseCost: { ironBar: 4 },
        costMultiplier: 1.3,
        color: '#0a1520',
        icon: 'inventory_2',
        unlocked: true,
        isStorage: true,
        baseCapacity: 500   // Capacity per level
    },

    // ===== WIND TURBINE (Power) =====

    windTurbine: {
        id: 'windTurbine',
        name: 'Wind Turbine',
        description: 'Generates a modest amount of power passively. No fuel required.',
        category: 'power',
        tier: 0,
        baseCost: {},
        creditCost: 100,
        upgradeBaseCost: {},
        costMultiplier: 1.0,
        production: { power: 80 },
        consumption: {},
        powerDemand: 0,
        color: '#0a1a0a',
        icon: 'air',
        unlocked: true,
        noConnections: true
    },

    // ===== POWER GENERATOR (Infrastructure) =====

    powerGenerator: {
        id: 'powerGenerator',
        name: 'Power Generator',
        description: 'Burns coal to generate power for all buildings',
        category: 'infrastructure',
        tier: 1,
        baseCost: {},
        creditCost: 350,
        upgradeBaseCost: { ironBar: 6 },
        costMultiplier: 1.5,
        production: { power: 5.0 },
        consumption: { coal: 1.0 },
        color: '#1a0808',
        icon: 'bolt',
        unlocked: true
    },

    // ===== EXPORT TERMINAL (Commerce) =====

    exportTerminal: {
        id: 'exportTerminal',
        name: 'Export Terminal',
        description: 'Sells connected resources for credits (70% market rate)',
        category: 'commerce',
        tier: 2,
        baseCost: {},
        creditCost: 2000,
        upgradeBaseCost: { ironBar: 4, copperBar: 4 },
        costMultiplier: 1.5,
        color: '#141008',
        icon: 'outbox',
        unlocked: true,
        autoSell: true
    },

    // ===== SPACEPORT (Facilities) =====

    spaceport: {
        id: 'spaceport',
        name: 'Spaceport',
        description: 'Launch facility. Commission and launch ships via the Spaceport terminal.',
        category: 'facilities',
        tier: 4,
        baseCost: {},
        creditCost: 15000,
        upgradeBaseCost: {},
        costMultiplier: 1.0,
        color: '#0a1520',
        icon: 'rocket_launch',
        unlocked: true
    }
};

// Recipe Definitions
// Recipes define input -> output transformations for generic buildings
const RECIPES = {
    // SMELTER RECIPES (Tier 2)
    smelter: [
        {
            id: 'iron_bar',
            name: 'Iron Bar',
            inputs: { ironOre: 2.0 },
            outputs: { ironBar: 1.0 },
            icon: 'view_timeline'
        },
        {
            id: 'copper_bar',
            name: 'Copper Bar',
            inputs: { copperOre: 2.0 },
            outputs: { copperBar: 1.0 },
            icon: 'view_timeline'
        },
        {
            id: 'refined_fuel',
            name: 'Refined Fuel',
            inputs: { coal: 2.0 },
            outputs: { refinedFuel: 1.0 },
            icon: 'local_gas_station'
        }
    ],

    // ASSEMBLER RECIPES (Tier 3)
    assembler: [
        {
            id: 'steel_plate',
            name: 'Steel Plate',
            inputs: { ironBar: 2.0 },
            outputs: { steelPlate: 1.0 },
            icon: 'layers'
        },
        {
            id: 'copper_wire',
            name: 'Copper Wire',
            inputs: { copperBar: 1.0 },
            outputs: { copperWire: 2.0 },
            icon: 'cable'
        },
    ],

    // MANUFACTURER RECIPES (Tier 4)
    manufacturer: [
        {
            id: 'circuit_board',
            name: 'Circuit Board',
            inputs: { copperWire: 1.0, rareMins: 1.0 },
            outputs: { circuitBoard: 1.0 },
            icon: 'memory'
        },
        {
            id: 'insulated_wire',
            name: 'Insulated Wire',
            inputs: { copperWire: 1.0, ironBar: 1.0 },
            outputs: { insulatedWire: 2.0 },
            icon: 'cable'
        },
        {
            id: 'fuel_cell',
            name: 'Fuel Cell',
            inputs: { refinedFuel: 1.0, ironBar: 1.0 },
            outputs: { fuelCell: 1.0 },
            icon: 'battery_charging_full'
        }
    ]
};

// Building categories for UI organization
const BUILDING_CATEGORIES = {
    extractors: {
        name: 'Extractors',
        description: 'Extract raw ores from the planet',
        icon: 'mining',
        tier: 1
    },
    smelters: {
        name: 'Smelters',
        description: 'Smelt ores into refined bars',
        icon: 'mode_heat',
        tier: 2
    },
    assemblers: {
        name: 'Assemblers',
        description: 'Assemble components from bars',
        icon: 'build',
        tier: 3
    },
    manufacturers: {
        name: 'Manufacturers',
        description: 'Manufacture advanced components',
        icon: 'precision_manufacturing',
        tier: 4
    },
    power: {
        name: 'Power',
        description: 'Passive and fuel-based power generation',
        icon: 'air',
        tier: 0
    },
    infrastructure: {
        name: 'Infrastructure',
        description: 'Power and support systems',
        icon: 'bolt',
        tier: 1
    },
    commerce: {
        name: 'Commerce',
        description: 'Sell resources for credits',
        icon: 'outbox',
        tier: 2
    },
    facilities: {
        name: 'Facilities',
        description: 'Large-scale planetary infrastructure',
        icon: 'rocket_launch',
        tier: 4
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

    // Credit-cost buildings: flat price, no scaling
    if (def.creditCost) {
        return { credits: def.creditCost };
    }

    const costs = {};
    Object.entries(def.baseCost).forEach(([resource, amount]) => {
        costs[resource] = Math.floor(amount * Math.pow(def.costMultiplier, currentCount));
    });
    return costs;
}

// Helper function to get buildings by category
function getBuildingsByCategory(category) {
    return Object.values(BUILDINGS).filter(b => b.category === category);
}

// Helper function to get recipes for a building type
function getRecipesForBuilding(buildingId) {
    return RECIPES[buildingId] || [];
}

// Helper function to detect which recipe matches given inputs
function detectRecipe(buildingId, inputResources) {
    const recipes = getRecipesForBuilding(buildingId);
    if (!recipes || recipes.length === 0) return null;

    for (const recipe of recipes) {
        const inputKeys = Object.keys(recipe.inputs);
        const availableKeys = Object.keys(inputResources);

        const matches = inputKeys.length === availableKeys.length &&
                       inputKeys.every(key => availableKeys.includes(key));

        if (matches) return recipe;
    }

    return null;
}

// Get all possible output resource types for a recipe-based building
function getAllRecipeOutputs(buildingId) {
    const recipes = getRecipesForBuilding(buildingId);
    if (!recipes || recipes.length === 0) return [];

    const outputs = new Set();
    recipes.forEach(recipe => Object.keys(recipe.outputs).forEach(key => outputs.add(key)));
    return Array.from(outputs);
}

// Get all possible input resource types for a recipe-based building
function getAllRecipeInputs(buildingId) {
    const recipes = getRecipesForBuilding(buildingId);
    if (!recipes || recipes.length === 0) return [];

    const inputs = new Set();
    recipes.forEach(recipe => Object.keys(recipe.inputs).forEach(key => inputs.add(key)));
    return Array.from(inputs);
}
