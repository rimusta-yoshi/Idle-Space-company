// Franchise App — STRATUM Portal
// Displays franchise tier, progression, and allows tier advancement via credit submission

class FranchiseApp extends App {
    constructor() {
        super();
        this.id = 'franchise';
        this.title = 'STRATUM PORTAL';
        this.icon = 'ST';
        this.updateInterval = null;
        this._lastRender = '';
    }

    mount(contentElement) {
        const template = document.getElementById('franchise-app-template');
        if (!template) throw new Error('Franchise app template not found');

        contentElement.appendChild(template.content.cloneNode(true));

        const btn = contentElement.querySelector('.franchise-advance-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const game = window.gameInstance;
                if (!game) return;
                const advanced = game.tryFranchiseAdvance();
                if (advanced) {
                    this._lastRender = '';
                    this.updateDisplay(contentElement);
                }
            });
        }

        this.updateDisplay(contentElement);
        this.updateInterval = setInterval(() => this.updateDisplay(contentElement), 1000);
    }

    updateDisplay(root) {
        const game = window.gameInstance;
        if (!game) return;

        const { tier, pendingBonusExtractors } = game.franchise;
        const creditBalance = game.resources.resources['credits']?.current || 0;
        const tierDef = getFranchiseTier(tier);
        const nextTierDef = getNextFranchiseTier(tier);
        const required = nextTierDef?.requires?.creditsSubmit || 0;

        // Cheap change detection
        const renderKey = `${tier}|${Math.floor(creditBalance)}|${pendingBonusExtractors}`;
        if (renderKey === this._lastRender) return;
        this._lastRender = renderKey;

        // Tier badge
        const tierBadge = root.querySelector('.franchise-tier-badge');
        if (tierBadge) tierBadge.textContent = `TIER ${tier} — ${tierDef.name}`;

        const tierSub = root.querySelector('.franchise-tier-subtitle');
        if (tierSub) tierSub.textContent = tierDef.subtitle;

        // Progress bar + label
        if (nextTierDef) {
            const pct = Math.min(100, (creditBalance / required) * 100);
            const canAfford = creditBalance >= required;

            const progressLabel = root.querySelector('.franchise-progress-label');
            if (progressLabel) {
                progressLabel.textContent = canAfford
                    ? `${formatNumber(Math.floor(creditBalance))} CREDITS — READY TO SUBMIT`
                    : `${formatNumber(Math.floor(creditBalance))} / ${formatNumber(required)} CREDITS TO SUBMIT`;
            }

            const bar = root.querySelector('.franchise-progress-fill');
            if (bar) bar.style.width = `${pct}%`;

            const advanceBtn = root.querySelector('.franchise-advance-btn');
            if (advanceBtn) {
                advanceBtn.style.display = '';
                advanceBtn.textContent = canAfford
                    ? `SUBMIT ${formatNumber(required)} CREDITS — APPLY FOR TIER ${nextTierDef.tier}`
                    : `${formatNumber(required)} CREDITS REQUIRED`;
                advanceBtn.disabled = !canAfford;
                advanceBtn.classList.toggle('franchise-btn-ready', canAfford);
            }
        } else {
            const progressLabel = root.querySelector('.franchise-progress-label');
            if (progressLabel) progressLabel.textContent = 'MAX FRANCHISE TIER REACHED';
            const bar = root.querySelector('.franchise-progress-fill');
            if (bar) bar.style.width = '100%';
            const advanceBtn = root.querySelector('.franchise-advance-btn');
            if (advanceBtn) advanceBtn.style.display = 'none';
        }

        // Current tier rewards
        const rewardsEl = root.querySelector('.franchise-rewards');
        if (rewardsEl) rewardsEl.textContent = tierDef.rewards;

        // Next tier rewards
        const nextRewardsSection = root.querySelector('.franchise-next-rewards-section');
        const nextRewardsEl = root.querySelector('.franchise-next-rewards');
        if (nextTierDef && tierDef.nextRewards) {
            if (nextRewardsSection) nextRewardsSection.style.display = '';
            if (nextRewardsEl) nextRewardsEl.textContent = `TIER ${nextTierDef.tier}: ${tierDef.nextRewards}`;
        } else {
            if (nextRewardsSection) nextRewardsSection.style.display = 'none';
        }

        // Bonus extractor picker
        const pickerSection = root.querySelector('.franchise-bonus-picker');
        if (pickerSection) {
            if (pendingBonusExtractors > 0) {
                pickerSection.style.display = '';
                const label = pickerSection.querySelector('.franchise-rewards-label');
                if (label) {
                    label.textContent = pendingBonusExtractors === 1
                        ? 'STRATUM BONUS CLAIM — SELECT EXTRACTOR'
                        : `STRATUM BONUS CLAIMS — SELECT EXTRACTOR (${pendingBonusExtractors} REMAINING)`;
                }
                const optionsEl = pickerSection.querySelector('.franchise-bonus-options');
                if (optionsEl) {
                    optionsEl.innerHTML = '';
                    const unlockedBuildings = game.getUnlockedBuildings();
                    BONUS_EXTRACTOR_OPTIONS
                        .filter(opt => unlockedBuildings.has(opt.type))
                        .forEach(opt => {
                            const btn = document.createElement('button');
                            btn.className = 'franchise-bonus-btn';
                            btn.textContent = opt.label.toUpperCase();
                            btn.addEventListener('click', () => {
                                game.claimBonusExtractor(opt.type);
                                this._lastRender = '';
                                this.updateDisplay(root);
                            });
                            optionsEl.appendChild(btn);
                        });
                }
            } else {
                pickerSection.style.display = 'none';
            }
        }

        // Liaison dialogue — progress-driven line
        const dialogue = root.querySelector('.franchise-dialogue');
        if (dialogue && tierDef.liaisons?.length) {
            const pct = nextTierDef ? creditBalance / required : 1;
            const lineIdx = pct >= 1 ? 2 : pct >= 0.5 ? 1 : 0;
            dialogue.textContent = `"${tierDef.liaisons[Math.min(lineIdx, tierDef.liaisons.length - 1)]}"`;
        }
    }

    close() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }

    getSaveData() { return {}; }
    loadSaveData() {}
}
