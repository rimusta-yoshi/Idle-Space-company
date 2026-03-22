// Market App — STRATUM.EXCHANGE Trader Terminal
// All tier-eligible resources listed on both BUYING and SELLING tabs.
// Prices fluctuate on a timer; % vs base price shown on each row.

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'STRATUM.EXCHANGE // TRADER TERMINAL';
        this.icon = 'EX';
        this._root = null;
        this._tickInterval = null;
        this._onTraderUpdate = null;
        this._onTraderActivity = null;
        this._activeTab = 'buy';   // 'buy' | 'sell'
        this._expandedKey = null;  // 'resource_DIRECTION' or null
        this._collapseHandler = null;
    }

    _tm()   { return window.gameInstance?.traderManager; }
    _game() { return window.gameInstance; }

    mount(contentElement) {
        const template = document.getElementById('market-app-template');
        if (!template) throw new Error('Market app template not found');
        contentElement.appendChild(template.content.cloneNode(true));
        this._root = contentElement;

        this._root.querySelectorAll('.trader-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._activeTab = btn.getAttribute('data-tab');
                this._expandedKey = null;
                this._detachCollapseHandler();
                this._root.querySelectorAll('.trader-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._rebuildTable();
            });
        });

        this._rebuildAll();

        this._onTraderUpdate   = () => { this._expandedKey = null; this._detachCollapseHandler(); this._rebuildAll(); };
        this._onTraderActivity = () => { this._rebuildTable(); this._rebuildFeed(); this._updateCredits(); };

        document.addEventListener('traderUpdate',   this._onTraderUpdate);
        document.addEventListener('traderActivity', this._onTraderActivity);

        this._tickInterval = setInterval(() => this._tick(), 250);
    }

    _rebuildAll() {
        this._rebuildTable();
        this._rebuildFeed();
        this._updateCredits();
    }

    _rebuildTable() {
        const tm      = this._tm();
        const game    = this._game();
        const tbodyEl = this._root?.querySelector('.trader-tbody');
        if (!tbodyEl || !tm || !game) return;

        const direction = this._activeTab === 'buy' ? 'BUY' : 'SELL';
        const resources = this._eligibleResources(game);

        tbodyEl.innerHTML = '';

        resources.forEach(resource => {
            const offer = tm._offers[resource]?.[direction];
            const key   = `${resource}_${direction}`;

            if (offer && this._expandedKey === key) {
                tbodyEl.appendChild(this._buildExpandedRow(resource, offer, game));
            } else if (offer) {
                tbodyEl.appendChild(this._buildRow(resource, offer));
            } else {
                tbodyEl.appendChild(this._buildLoadingRow(resource));
            }
        });
    }

    _eligibleResources(game) {
        const tier = game?.franchise?.tier ?? 0;
        const pool = [];
        for (let t = 0; t <= Math.min(tier, 2); t++) {
            (TRADER_TIER_RESOURCES[t] || []).forEach(r => pool.push(r));
        }
        return pool;
    }

    _pctStr(pricePerUnit, basePrice) {
        const pct = Math.round(((pricePerUnit - basePrice) / basePrice) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
    }

    _buildRow(resource, offer) {
        const resName   = RESOURCES[resource]?.name || resource;
        const isBuy     = offer.direction === 'BUY';
        const remaining = offer.quantity - offer.quantityFilled;
        const urgent    = offer.timeRemaining <= 30;
        const pct       = this._pctStr(offer.pricePerUnit, offer.basePrice);
        const pctClass  = offer.pricePerUnit >= offer.basePrice ? 'tr-pct-high' : 'tr-pct-low';

        const tr = document.createElement('tr');
        tr.className = `trader-row${urgent ? ' trader-row--urgent' : ''}`;
        tr.setAttribute('data-resource', resource);
        tr.setAttribute('data-direction', offer.direction);

        tr.innerHTML = `
            <td class="tr-resource">${resName}</td>
            <td class="tr-qty" data-field="qty">${remaining}</td>
            <td class="tr-price">${offer.pricePerUnit} CR/U <span class="${pctClass}">${pct}</span></td>
            <td class="tr-time" data-field="timer">${this._fmtTime(Math.ceil(offer.timeRemaining))}</td>
            <td class="tr-action">
                <button class="tr-action-btn">${isBuy ? 'SELL' : 'BUY'}</button>
            </td>`;

        tr.querySelector('.tr-action-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this._expandedKey = `${resource}_${offer.direction}`;
            this._rebuildTable();
            this._attachCollapseHandler();
        });

        return tr;
    }

    _buildExpandedRow(resource, offer, game) {
        const resName   = RESOURCES[resource]?.name || resource;
        const isBuy     = offer.direction === 'BUY';
        const remaining = offer.quantity - offer.quantityFilled;
        const urgent    = offer.timeRemaining <= 30;
        const maxFill   = this._maxFillable(offer, game);
        const pct       = this._pctStr(offer.pricePerUnit, offer.basePrice);
        const pctClass  = offer.pricePerUnit >= offer.basePrice ? 'tr-pct-high' : 'tr-pct-low';

        const tr = document.createElement('tr');
        tr.className = `trader-row trader-row--expanded${urgent ? ' trader-row--urgent' : ''}`;
        tr.setAttribute('data-resource', resource);
        tr.setAttribute('data-direction', offer.direction);

        tr.innerHTML = `
            <td class="tr-resource">${resName}</td>
            <td class="tr-qty" data-field="qty">${remaining}</td>
            <td class="tr-price">${offer.pricePerUnit} CR/U <span class="${pctClass}">${pct}</span></td>
            <td class="tr-time" data-field="timer">${this._fmtTime(Math.ceil(offer.timeRemaining))}</td>
            <td class="tr-action tr-action--expanded">
                <input class="tr-qty-input" type="number" min="1" max="${maxFill}" value="${maxFill}" />
                <button class="tr-max-btn">MAX</button>
                <button class="tr-confirm-btn">CONFIRM</button>
            </td>`;

        const input      = tr.querySelector('.tr-qty-input');
        const maxBtn     = tr.querySelector('.tr-max-btn');
        const confirmBtn = tr.querySelector('.tr-confirm-btn');

        maxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const max   = this._maxFillable(offer, game);
            input.max   = max;
            input.value = max;
        });

        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const qty = Math.max(1, parseInt(input.value) || 0);
            const tm  = this._tm();
            if (!tm) return;

            const result = tm.executeTrade(resource, offer.direction, qty, this._game());
            if (!result.success) {
                showUserNotification(result.message, 'error');
                return;
            }

            this._expandedKey = null;
            this._detachCollapseHandler();
            this._rebuildTable();
            this._updateCredits();
        });

        return tr;
    }

    _buildLoadingRow(resource) {
        const resName = RESOURCES[resource]?.name || resource;
        const tr = document.createElement('tr');
        tr.className = 'trader-row trader-row--loading';
        tr.setAttribute('data-resource', resource);
        tr.innerHTML = `
            <td class="tr-resource">${resName}</td>
            <td class="tr-no-offer" colspan="4">LOADING…</td>`;
        return tr;
    }

    _attachCollapseHandler() {
        this._detachCollapseHandler();
        setTimeout(() => {
            this._collapseHandler = (e) => {
                if (!this._root) return;
                const expandedTr = this._root.querySelector('.trader-row--expanded');
                if (expandedTr && !expandedTr.contains(e.target)) {
                    this._expandedKey = null;
                    this._detachCollapseHandler();
                    this._rebuildTable();
                }
            };
            document.addEventListener('click', this._collapseHandler);
        }, 0);
    }

    _detachCollapseHandler() {
        if (this._collapseHandler) {
            document.removeEventListener('click', this._collapseHandler);
            this._collapseHandler = null;
        }
    }

    _tick() {
        const tm   = this._tm();
        const game = this._game();
        if (!tm || !game || !this._root) return;

        const direction = this._activeTab === 'buy' ? 'BUY' : 'SELL';

        this._eligibleResources(game).forEach(resource => {
            const offer = tm._offers[resource]?.[direction];
            if (!offer) return;

            const tr = this._root.querySelector(
                `.trader-row[data-resource="${resource}"][data-direction="${direction}"]`
            );
            if (!tr) return;

            const timerEl = tr.querySelector('[data-field="timer"]');
            if (timerEl) timerEl.textContent = this._fmtTime(Math.ceil(offer.timeRemaining));
            tr.classList.toggle('trader-row--urgent', offer.timeRemaining <= 30);
        });

        this._updateCredits();
    }

    _rebuildFeed() {
        const tm     = this._tm();
        const feedEl = this._root?.querySelector('.trader-feed-list');
        if (!feedEl || !tm) return;

        feedEl.innerHTML = '';

        if (tm._activityLog.length === 0) {
            feedEl.innerHTML = `<div class="trader-feed-empty">No activity yet.<br>Prices update every 2–3 min.</div>`;
            return;
        }

        tm._activityLog.slice(0, 30).forEach(entry => {
            const div = document.createElement('div');
            div.className = `trader-feed-entry trader-feed-entry--${entry.type}`;
            div.innerHTML = `<span class="trader-feed-time">${entry.time}</span> ${entry.message}`;
            feedEl.appendChild(div);
        });
    }

    _updateCredits() {
        const game = this._game();
        const el   = this._root?.querySelector('.trader-credits-balance');
        if (el && game) {
            el.textContent = `${formatNumber(Math.floor(game.resources.get('credits')))} CR`;
        }
    }

    _maxFillable(offer, game) {
        const remaining = offer.quantity - offer.quantityFilled;
        if (offer.direction === 'BUY') {
            let available = 0;
            game.canvas.nodes.forEach(node => {
                if (node.buildingDef?.isStorage && node.storedResourceType === offer.resource) {
                    available += node.inventory;
                }
            });
            return Math.min(remaining, Math.floor(available));
        } else {
            const credits = game.resources.get('credits');
            return Math.min(remaining, Math.floor(credits / offer.pricePerUnit));
        }
    }

    _fmtTime(seconds) {
        const s   = Math.max(0, seconds);
        const m   = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    close() {
        this._detachCollapseHandler();
        if (this._tickInterval)     clearInterval(this._tickInterval);
        if (this._onTraderUpdate)   document.removeEventListener('traderUpdate',   this._onTraderUpdate);
        if (this._onTraderActivity) document.removeEventListener('traderActivity', this._onTraderActivity);
        this._root = null;
    }

    getSaveData()  { return {}; }
    loadSaveData() {}
}
