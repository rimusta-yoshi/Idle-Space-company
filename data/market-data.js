// Market Data
// Base prices, ship name pool, and tier-gated resource availability for the trader system

const MARKET_BASE_PRICES = {
    ironOre:     8,
    copperOre:   10,
    coal:        6,
    ironBar:     20,
    copperBar:   25,
    refinedFuel: 15,
    steelPlate:  45,
    copperWire:  35,
    rareMins:    60,
    circuitBoard:120,
    insulatedWire:80,
    fuelCell:    90
};

// Resources unlocked per franchise tier (cumulative — each tier adds to the pool)
const TRADER_TIER_RESOURCES = {
    0: ['ironOre', 'copperOre', 'coal', 'ironBar', 'copperBar', 'refinedFuel'],
    1: ['steelPlate', 'copperWire'],
    2: ['rareMins', 'circuitBoard', 'insulatedWire', 'fuelCell'],
};

// Probability weights — raw materials appear more frequently than processed goods
const RESOURCE_WEIGHTS = {
    ironOre: 30, copperOre: 30, coal: 25,
    ironBar: 20, copperBar: 20, refinedFuel: 15,
    steelPlate: 15, copperWire: 15,
    rareMins: 10, circuitBoard: 8, insulatedWire: 8, fuelCell: 8,
};

const SHIP_NAMES = [
    'TRADESHIP_ORION',        'HAULER_NEBULA',          'MINING_VESSEL_ATLAS',
    'CARGO_HAULER_IRONWIND',  'FREIGHTER_VOIDRUNNER',   'HAULER_STARWAY',
    'MINING_BARGE_STONEBREAKER', 'INDUSTRIAL_SHIP_HEAVYLIFT', 'MINING_SHIP_PROSPECTOR',
    'HAULER_BLACKCOMET',      'CARGO_VESSEL_DAWNBREAK', 'FREIGHTER_SOLARIS',
    'MINING_BARGE_DEEPCORE',  'TRADESHIP_CASSIAN',      'HAULER_IRONREACH',
    'CARGO_SHIP_REDSHIFT',    'FREIGHTER_COLDMANTLE',   'MINING_VESSEL_AURELIUS',
    'TRADESHIP_FENWICK',      'HAULER_GRAVENPORT'
];