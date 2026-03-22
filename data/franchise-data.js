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
        rewards: 'Starter equipment package: 1× Iron Extractor, 1× Storage, 2× Wind Turbines.',
        nextRewards: 'Assembler access. One additional extractor of your choice.',
        liaisons: [
            'Welcome to STRATUM GROUP, franchise operator. Your starter equipment is ready in the build panel.',
            'Extract iron ore and sell it manually at the commodity portal to earn credits.',
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
        bonusExtractorClaims: 1,
        starterKit: {},
        rewards: 'Assembler access. One additional extractor claim of your choice.',
        nextRewards: 'Manufacturer and Export Terminal (automated selling). Two additional extractor claims.',
        liaisons: [
            'Tier 1 approved. You may now operate assembly equipment.',
            'The assembler combines bars into components. Higher margin goods fetch better rates.',
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
        bonusExtractorClaims: 2,
        starterKit: { manufacturer: 1 },
        rewards: 'Manufacturer (1× unit included), Export Terminal (auto-sell), Rare Mineral Extractor access. Two additional extractor claims.',
        nextRewards: 'Spaceport access. One additional extractor claim.',
        liaisons: [
            'Tier 2 status granted. Your equipment package includes one manufacturer unit.',
            'The Export Terminal sells goods automatically at 70% market rate.',
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
        bonusExtractorClaims: 1,
        starterKit: {},
        rewards: 'Spaceport access. One additional extractor claim.',
        nextRewards: null,
        liaisons: [
            'Tier 3 approved. Launch facility license is under review — standard processing time is twelve to sixteen weeks.',
            'The Spaceport terminal handles ship commissions. You are responsible for all launch clearance fees.',
            'Operate within STRATUM guidelines. We are watching the launchpad activity closely.'
        ]
    }
];

// Which building categories are claim-only (can't be bought, only claimed via franchise)
const CLAIM_ONLY_CATEGORIES = new Set(['extractors']);

// Extractors available as bonus picks at Tier 1+ advancement
const BONUS_EXTRACTOR_OPTIONS = [
    { type: 'ironExtractor',        label: 'Iron Extractor',         icon: 'mining' },
    { type: 'copperExtractor',      label: 'Copper Extractor',       icon: 'mining' },
    { type: 'coalExtractor',        label: 'Coal Extractor',         icon: 'mining' },
];

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
