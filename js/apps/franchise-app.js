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
        this._approvedTier = null;
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
                    this._approvedTier = game.franchise.tier;
                    this._lastRender = '';
                    this.updateDisplay(contentElement);
                    setTimeout(() => {
                        this._approvedTier = null;
                        this._lastRender = '';
                        this.updateDisplay(contentElement);
                    }, 2500);
                }
            });
        }

        this.updateDisplay(contentElement);
        this.updateInterval = setInterval(() => this.updateDisplay(contentElement), 1000);
    }

    updateDisplay(root) {
        const game = window.gameInstance;
        if (!game) return;

        const { tier } = game.franchise;
        const creditBalance = game.resources.resources['credits']?.current || 0;
        const tierDef = getFranchiseTier(tier);
        const nextTierDef = getNextFranchiseTier(tier);
        const required = nextTierDef?.requires?.creditsSubmit || 0;

        // Cheap change detection — include approvedTier so the flash state re-renders
        const renderKey = `${tier}|${Math.floor(creditBalance)}|${this._approvedTier}`;
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
                if (this._approvedTier !== null) {
                    advanceBtn.textContent = `TIER ${this._approvedTier} APPROVED`;
                    advanceBtn.disabled = true;
                    advanceBtn.className = 'franchise-advance-btn tier-approved';
                } else {
                    advanceBtn.textContent = canAfford
                        ? `SUBMIT ${formatNumber(required)} CREDITS — APPLY FOR TIER ${nextTierDef.tier}`
                        : `${formatNumber(required)} CREDITS REQUIRED`;
                    advanceBtn.disabled = !canAfford;
                    advanceBtn.className = 'franchise-advance-btn'
                        + (canAfford ? ' franchise-btn-ready can-afford' : '');
                }
            }
        } else {
            const progressLabel = root.querySelector('.franchise-progress-label');
            if (progressLabel) progressLabel.textContent = 'MAX FRANCHISE TIER REACHED';
            const bar = root.querySelector('.franchise-progress-fill');
            if (bar) bar.style.width = '100%';
            const advanceBtn = root.querySelector('.franchise-advance-btn');
            if (advanceBtn) advanceBtn.style.display = 'none';
        }

        // Current tier rewards — render as list items
        const rewardsEl = root.querySelector('.franchise-rewards');
        if (rewardsEl) rewardsEl.innerHTML = `<li>${tierDef.rewards}</li>`;

        // Next tier rewards — render as list items
        const nextRewardsSection = root.querySelector('.franchise-next-rewards-section');
        const nextRewardsEl = root.querySelector('.franchise-next-rewards');
        if (nextTierDef && tierDef.nextRewards) {
            if (nextRewardsSection) nextRewardsSection.style.display = '';
            if (nextRewardsEl) nextRewardsEl.innerHTML = `<li>${tierDef.nextRewards}</li>`;
        } else {
            if (nextRewardsSection) nextRewardsSection.style.display = 'none';
        }

        // Liaison terminal log — all messages for current tier
        const liaisionLog = root.querySelector('.franchise-liaison-log');
        if (liaisionLog && tierDef.liaisons?.length) {
            liaisionLog.innerHTML = tierDef.liaisons
                .map(msg => `<div class="franchise-log-line"><span class="franchise-log-prefix">&gt;</span>${msg}</div>`)
                .join('');
        }
    }

    close() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }

    getSaveData() { return {}; }
    loadSaveData() {}
}
