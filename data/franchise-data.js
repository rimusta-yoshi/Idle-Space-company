// Franchise Tier Definitions
// Tiers gate building access. Advancement requires manually submitting credits to STRATUM.

const FRANCHISE_TIERS = [
    {
        tier: 0,
        name: 'PROSPECTOR',
        subtitle: 'Franchise Initiate',
        requires: null, // Starting tier — no requirement
        unlockedBuildings: [
            'ironExtractor',
            'copperExtractor',
            'coalExtractor',
            'smelter',
            'storageNode',
            'powerGenerator',
            'windTurbine'
        ],
        // Free building claims granted at start — claim counts per type
        starterKit: {
            ironExtractor: 1,
            storageNode:   1,
            windTurbine:   2
        },
        rewards: 'Starter equipment package: 1× Iron Extractor, 1× Storage, 2× Wind Turbines. Additional extractors purchaseable from the build panel.',
        nextRewards: 'Assembler access.',
        liaisons: [
            'Welcome to STRATUM GROUP, franchise operator. Your starter equipment is ready in the build panel.',
            'Purchase additional extractors directly from the build panel using credits.',
            'Submit 500 credits to STRATUM to apply for Tier 1 franchise status.'
        ]
    },
    {
        tier: 1,
        name: 'OPERATOR',
        subtitle: 'Franchise Operator',
        requires: { creditsSubmit: 500 },
        unlockedBuildings: [
            'assembler'
        ],
        starterKit: {},
        rewards: 'Assembler access.',
        nextRewards: 'Manufacturer and Export Terminal (automated selling). Rare Mineral Extractor access.',
        liaisons: [
            'Tier 1 approved. Assembler license is now active.',
            'You may now purchase and operate assembly equipment via the STRATUM™ shop.',
            'Submit 5,000 credits to STRATUM to apply for Tier 2 status.'
        ]
    },
    {
        tier: 2,
        name: 'CONTRACTOR',
        subtitle: 'Franchise Contractor',
        requires: { creditsSubmit: 5000 },
        unlockedBuildings: [
            'manufacturer',
            'exportTerminal',
            'rareMineralExtractor',
            'splitter'
        ],
        starterKit: {},
        rewards: 'Manufacturer and Export Terminal access (purchase via STRATUM™ shop). Rare Mineral Extractor now available.',
        nextRewards: 'Spaceport access.',
        liaisons: [
            'Tier 2 status granted. Manufacturer and Export Terminal licenses are now active.',
            'Rare Mineral Extractor is now available in the build panel.',
            'Submit 25,000 credits to STRATUM to apply for Tier 3 status.'
        ]
    },
    {
        tier: 3,
        name: 'PIONEER',
        subtitle: 'Franchise Pioneer',
        requires: { creditsSubmit: 25000 },
        unlockedBuildings: [
            'spaceport'
        ],
        starterKit: {},
        rewards: 'Spaceport access.',
        nextRewards: null,
        liaisons: [
            'Tier 3 approved. Spaceport access granted.',
            'Launch facility license is under review — standard processing time is twelve to sixteen weeks.',
            'Operate within STRATUM guidelines. We are watching the launchpad activity closely.'
        ]
    }
];

// Planet node caps — maximum extractors of each type on Planet 1
const PLANET_NODE_CAPS = {
    ironExtractor:        5,
    copperExtractor:      7,
    coalExtractor:        2,
    rareMineralExtractor: 1
};

// ASCII portrait for the STRATUM liaison
const LIAISON_ASCII = `
 ▄▄▄▄▄▄▄▄▄
█░░░░░░░░░█
█░▄▀░░▀▄░░█
█░░░░▄░░░░█
█░░▀▀▀▀░░░█
█░▄█████▄░█
 ▀▀▀▀▀▀▀▀▀
`.trim();

function getFranchiseTier(tierNum) {
    return FRANCHISE_TIERS.find(t => t.tier === tierNum) || FRANCHISE_TIERS[0];
}

function getNextFranchiseTier(currentTier) {
    return FRANCHISE_TIERS.find(t => t.tier === currentTier + 1) || null;
}

function getAllUnlockedBuildings(currentTier) {
    const unlocked = new Set();
    FRANCHISE_TIERS.filter(t => t.tier <= currentTier).forEach(t => {
        t.unlockedBuildings.forEach(b => unlocked.add(b));
    });
    return unlocked;
}

// Returns the initial free claim counts for a fresh game (from T0 starterKit)
function getInitialFreeClaims() {
    return { ...getFranchiseTier(0).starterKit };
}
