// Building Definitions
// Data-driven building configuration

const BUILDINGS = {
    // ===== EXTRACTORS (Tier 1) =====
    // Extract raw ores from the planet (resource-specific)

    ironExtractor: {
        id: 'ironExtractor',
        name: 'Iron Extractor',
        description: 'Extracts raw iron ore from the planet surface',
        category: 'extractors',
        tier: 1,
        baseCost: { credits: 10 },
        costMultiplier: 1.15,
        production: { oreA: 1.0 }, // 60/min
        consumption: {},
        width: 160,
        height: 80,
        color: '#0d1510',
        icon: '⛏️',
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
        production: { oreB: 1.0 }, // 60/min
        consumption: {},
        width: 160,
        height: 80,
        color: '#1a1108',
        icon: '🪨',
        unlocked: true
    },

    // ===== SMELTER (Tier 2) =====
    // Generic smelter - recipe determined by inputs

    smelter: {
        id: 'smelter',
        name: 'Smelter',
        description: 'Smelts ores into refined bars (recipe auto-detected)',
        category: 'smelters',
        tier: 2,
        baseCost: { credits: 50 },
        costMultiplier: 1.15,
        width: 160,
        height: 80,
        color: '#1a0c08',
        icon: '🔥',
        unlocked: true,
        usesRecipes: true
    },

    // ===== ASSEMBLER (Tier 3) =====
    // Generic assembler - recipe determined by inputs

    assembler: {
        id: 'assembler',
        name: 'Assembler',
        description: 'Assembles components from bars (recipe auto-detected)',
        category: 'assemblers',
        tier: 3,
        baseCost: { credits: 100 },
        costMultiplier: 1.15,
        width: 160,
        height: 80,
        color: '#0a1019',
        icon: '🔧',
        unlocked: true,
        usesRecipes: true
    },

    // ===== MANUFACTURER (Tier 4) =====
    // Generic manufacturer - recipe determined by inputs

    manufacturer: {
        id: 'manufacturer',
        name: 'Manufacturer',
        description: 'Manufactures advanced products (recipe auto-detected)',
        category: 'manufacturers',
        tier: 4,
        baseCost: { credits: 300 },
        costMultiplier: 1.15,
        width: 160,
        height: 80,
        color: '#12081a',
        icon: '🏭',
        unlocked: true,
        usesRecipes: true
    },

    // ===== EXPORT TERMINAL (Commerce) =====
    // Sells connected resources for credits at 70% market rate

    exportTerminal: {
        id: 'exportTerminal',
        name: 'Export Terminal',
        description: 'Sells connected resources for credits (70% market rate)',
        category: 'commerce',
        tier: 2,
        baseCost: { credits: 200 },
        costMultiplier: 1.15,
        width: 160,
        height: 80,
        color: '#141008',
        icon: '📦',
        unlocked: true,
        usesRecipes: true,
        singlePaletteCard: true  // Shows one card in palette, not one per recipe
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
            inputs: { oreA: 2.0 },      // 2 iron ore per second
            outputs: { barA: 1.0 },     // 1 iron bar per second
            icon: '🔩'
        },
        {
            id: 'copper_bar',
            name: 'Copper Bar',
            inputs: { oreB: 2.0 },      // 2 copper ore per second
            outputs: { barB: 1.0 },     // 1 copper bar per second
            icon: '🟫'
        }
    ],

    // ASSEMBLER RECIPES (Tier 3)
    assembler: [
        {
            id: 'steel_plate',
            name: 'Steel Plate',
            inputs: { barA: 2.0 },      // 2 iron bars per second
            outputs: { componentA: 1.0 },  // 1 steel plate per second
            icon: '⬜'
        },
        {
            id: 'wire',
            name: 'Wire',
            inputs: { barB: 1.0 },      // 1 copper bar per second
            outputs: { componentB: 2.0 },  // 2 wire per second (efficient!)
            icon: '〰️'
        },
        {
            id: 'circuit',
            name: 'Circuit',
            inputs: { barA: 1.0, barB: 1.0 },  // 1 iron + 1 copper bar per second
            outputs: { componentC: 1.0 },       // 1 circuit per second
            icon: '💾'
        }
    ],

    // EXPORT TERMINAL RECIPES (Commerce)
    // Each recipe consumes 1 unit/s and produces credits at 70% of manual sell price
    exportTerminal: [
        {
            id: 'export_oreA',
            name: 'Export Iron Ore',
            inputs: { oreA: 1.0 },
            outputs: { credits: 0.35 },  // 0.5 * 0.70
            icon: '📦'
        },
        {
            id: 'export_oreB',
            name: 'Export Copper Ore',
            inputs: { oreB: 1.0 },
            outputs: { credits: 0.56 },  // 0.8 * 0.70
            icon: '📦'
        },
        {
            id: 'export_barA',
            name: 'Export Iron Bar',
            inputs: { barA: 1.0 },
            outputs: { credits: 1.4 },   // 2.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_barB',
            name: 'Export Copper Bar',
            inputs: { barB: 1.0 },
            outputs: { credits: 2.1 },   // 3.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_componentA',
            name: 'Export Steel Plate',
            inputs: { componentA: 1.0 },
            outputs: { credits: 7.0 },   // 10.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_componentB',
            name: 'Export Wire',
            inputs: { componentB: 1.0 },
            outputs: { credits: 5.6 },   // 8.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_componentC',
            name: 'Export Circuit',
            inputs: { componentC: 1.0 },
            outputs: { credits: 14.0 },  // 20.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_productA',
            name: 'Export Engine',
            inputs: { productA: 1.0 },
            outputs: { credits: 56.0 },  // 80.0 * 0.70
            icon: '📦'
        },
        {
            id: 'export_productB',
            name: 'Export Computer',
            inputs: { productB: 1.0 },
            outputs: { credits: 70.0 },  // 100.0 * 0.70
            icon: '📦'
        }
    ],

    // MANUFACTURER RECIPES (Tier 4)
    manufacturer: [
        {
            id: 'engine',
            name: 'Engine',
            inputs: { componentA: 2.0, componentB: 1.0 },  // 2 steel plates + 1 wire per second
            outputs: { productA: 1.0 },                     // 1 engine per second
            icon: '⚙️'
        },
        {
            id: 'computer',
            name: 'Computer',
            inputs: { componentC: 1.0, componentB: 2.0 },  // 1 circuit + 2 wire per second
            outputs: { productB: 1.0 },                     // 1 computer per second
            icon: '💻'
        }
    ]
};

// Building categories for UI organization
const BUILDING_CATEGORIES = {
    extractors: {
        name: 'Extractors',
        description: 'Extract raw ores from the planet',
        icon: '⛏️',
        tier: 1
    },
    smelters: {
        name: 'Smelters',
        description: 'Smelt ores into refined bars',
        icon: '🔥',
        tier: 2
    },
    assemblers: {
        name: 'Assemblers',
        description: 'Assemble components from bars',
        icon: '🔧',
        tier: 3
    },
    manufacturers: {
        name: 'Manufacturers',
        description: 'Manufacture advanced products',
        icon: '🏭',
        tier: 4
    },
    commerce: {
        name: 'Commerce',
        description: 'Sell resources for credits',
        icon: '📦',
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

    // Find first recipe where all input requirements match the available inputs
    for (const recipe of recipes) {
        const inputKeys = Object.keys(recipe.inputs);
        const availableKeys = Object.keys(inputResources);

        // Check if recipe inputs match available inputs
        const matches = inputKeys.length === availableKeys.length &&
                       inputKeys.every(key => availableKeys.includes(key));

        if (matches) {
            return recipe;
        }
    }

    return null;
}

// Get all possible output resource types for a recipe-based building
function getAllRecipeOutputs(buildingId) {
    const recipes = getRecipesForBuilding(buildingId);
    if (!recipes || recipes.length === 0) return [];

    const outputs = new Set();
    recipes.forEach(recipe => {
        Object.keys(recipe.outputs).forEach(key => outputs.add(key));
    });
    return Array.from(outputs);
}

// Get all possible input resource types for a recipe-based building
function getAllRecipeInputs(buildingId) {
    const recipes = getRecipesForBuilding(buildingId);
    if (!recipes || recipes.length === 0) return [];

    const inputs = new Set();
    recipes.forEach(recipe => {
        Object.keys(recipe.inputs).forEach(key => inputs.add(key));
    });
    return Array.from(inputs);
}
