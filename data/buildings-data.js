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
        baseCost: { credits: 10 },
        costMultiplier: 1.15,
        production: { ironOre: 1.0 },
        consumption: {},
        color: '#0d1510',
        icon: 'mining',
        unlocked: true
    },

    copperExtractor: {
        id: 'copperExtractor',
        name: 'Copper Extractor',
        description: 'Extracts raw copper ore from the planet surface',
        category: 'extractors',
        tier: 1,
        baseCost: { credits: 15 },
        costMultiplier: 1.15,
        production: { copperOre: 1.0 },
        consumption: {},
        color: '#1a1108',
        icon: 'mining',
        unlocked: true
    },

    coalExtractor: {
        id: 'coalExtractor',
        name: 'Coal Extractor',
        description: 'Extracts coal — burns for power or refines into fuel',
        category: 'extractors',
        tier: 1,
        baseCost: { credits: 20 },
        costMultiplier: 1.15,
        production: { coal: 1.0 },
        consumption: {},
        color: '#0d0d0d',
        icon: 'mining',
        unlocked: true
    },

    rareMineralExtractor: {
        id: 'rareMineralExtractor',
        name: 'Rare Min. Extractor',
        description: 'Extracts scarce rare minerals — critical for circuit boards',
        category: 'extractors',
        tier: 1,
        baseCost: { credits: 50 },
        costMultiplier: 1.2,
        production: { rareMins: 0.5 },
        consumption: {},
        color: '#1a0a1a',
        icon: 'mining',
        unlocked: true
    },

    // ===== SMELTER (Tier 2) =====

    smelter: {
        id: 'smelter',
        name: 'Smelter',
        description: 'Smelts ores into refined bars (recipe auto-detected)',
        category: 'smelters',
        tier: 2,
        baseCost: { credits: 50 },
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
        baseCost: { ironBar: 12, copperBar: 8 },
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
        baseCost: { steelPlate: 8, circuitBoard: 5, copperWire: 10 },
        costMultiplier: 1.5,
        powerDemand: 8,
        color: '#12081a',
        icon: 'precision_manufacturing',
        unlocked: true,
        usesRecipes: true
    },

    // ===== POWER GENERATOR (Infrastructure) =====

    powerGenerator: {
        id: 'powerGenerator',
        name: 'Power Generator',
        description: 'Burns coal to generate power for all buildings',
        category: 'infrastructure',
        tier: 1,
        baseCost: { credits: 75 },
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
        baseCost: { ironBar: 5, copperBar: 5 },
        costMultiplier: 1.5,
        color: '#141008',
        icon: 'outbox',
        unlocked: true,
        autoSell: true
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
        {
            id: 'circuit_board',
            name: 'Circuit Board',
            inputs: { copperWire: 1.0, rareMins: 1.0 },
            outputs: { circuitBoard: 1.0 },
            icon: 'memory'
        }
    ],

    // MANUFACTURER RECIPES (Tier 4)
    manufacturer: [
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
