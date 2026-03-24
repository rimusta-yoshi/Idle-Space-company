// Market App — STRATUM.EXCHANGE Commodity Terminal
// Tab 1 (SELL): live inventory with inline sell controls.
// Tab 2 (MARKET): all resources with base price, current price, and trend.

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'STRATUM.EXCHANGE // COMMODITY TERMINAL';
        this.icon = 'EX';
        this._root       = null;
        this._activeTab  = 'sell';
        this._pollInterval  = null;
        this._onPriceUpdate = null;
    }

    _mm()   { return window.gameInstance?.marketManager; }
    _game() { return window.gameInstance; }

    mount(contentElement) {
        const template = document.getElementById('market-app-template');
        if (!template) throw new Error('Market app template not found');
        contentElement.appendChild(template.content.cloneNode(true));
        this._root = contentElement;

        // Tab switching
        this._root.querySelectorAll('.trader-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._activeTab = btn.dataset.tab;
                this._root.querySelectorAll('.trader-tab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                this._rebuildContent();
            });
        });

        this._rebuildContent();
        this._updateCredits();

        this._onPriceUpdate = () => {
            if (this._activeTab === 'market') this._rebuildContent();
        };
        document.addEventListener('marketPriceUpdate', this._onPriceUpdate);

        // Poll: credits + sell table live updates
        this._pollInterval = setInterval(() => {
            this._updateCredits();
            if (this._activeTab === 'sell') this._rebuildSellTable();
        }, 500);
    }

    // ── Tab routing ──────────────────────────────────────────────────────────

    _rebuildContent() {
        const area = this._root?.querySelector('.trader-tab-content');
        if (!area) return;
        if (this._activeTab === 'sell') {
            this._buildSellTab(area);
        } else {
            this._buildMarketTab(area);
        }
    }

    // ── SELL tab ─────────────────────────────────────────────────────────────

    _buildSellTab(area) {
        area.innerHTML = `
            <table class="trader-table">
                <thead>
                    <tr>
                        <th>RESOURCE</th>
                        <th>IN STOCK</th>
                        <th>MARKET PRICE</th>
                        <th colspan="3">QTY TO SELL</th>
                    </tr>
                </thead>
                <tbody class="sell-tbody"></tbody>
            </table>`;
        this._rebuildSellTable();
    }

    _rebuildSellTable() {
        const game  = this._game();
        const mm    = this._mm();
        const tbody = this._root?.querySelector('.sell-tbody');
        if (!tbody || !game || !mm) return;

        // Aggregate storage inventory
        const stockMap = {};
        game.canvas.nodes.forEach(node => {
            if (node.buildingDef?.isStorage && node.storedResourceType && node.inventory > 0) {
                const res = node.storedResourceType;
                stockMap[res] = (stockMap[res] || 0) + node.inventory;
            }
        });

        const resources = Object.keys(stockMap).sort();

        // Reconcile existing rows
        const existingRows = new Map();
        tbody.querySelectorAll('tr[data-resource]').forEach(tr => {
            existingRows.set(tr.dataset.resource, tr);
        });

        // Remove rows for resources no longer in stock
        existingRows.forEach((tr, res) => {
            if (!stockMap[res]) tr.remove();
        });

        if (resources.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="trader-empty-row">— No inventory to sell —</td></tr>`;
            return;
        }

        // Clear empty-state row if present
        const emptyRow = tbody.querySelector('td[colspan="6"]');
        if (emptyRow) emptyRow.closest('tr').remove();

        resources.forEach(res => {
            const stock   = stockMap[res];
            const resDef  = RESOURCES[res];
            const resName = resDef?.name || res;
            const price   = mm.getPrice(res);
            const iconHtml = resDef
                ? `<span class="material-symbols-outlined wh-icon">${resDef.icon}</span>`
                : '';

            let row = existingRows.get(res);
            if (!row) {
                row = document.createElement('tr');
                row.className = 'trader-row';
                row.dataset.resource = res;
                row.innerHTML = `
                    <td class="tr-resource">${iconHtml} ${resName}</td>
                    <td class="tr-qty" data-field="stock">${Math.floor(stock)}</td>
                    <td class="tr-price" data-field="price">${price} CR/U</td>
                    <td class="tr-action--expanded" style="display:flex;gap:4px;align-items:center;padding:7px 12px;">
                        <input class="tr-qty-input" type="number" min="1" max="${Math.floor(stock)}" value="${Math.floor(stock)}" />
                        <button class="tr-max-btn">MAX</button>
                        <button class="tr-confirm-btn">SELL</button>
                    </td>`;

                const input      = row.querySelector('.tr-qty-input');
                const maxBtn     = row.querySelector('.tr-max-btn');
                const confirmBtn = row.querySelector('.tr-confirm-btn');

                maxBtn.addEventListener('click', () => {
                    const cur = this._getStock(res, game);
                    input.max   = Math.floor(cur);
                    input.value = Math.floor(cur);
                });

                confirmBtn.addEventListener('click', () => {
                    const qty    = Math.max(1, parseInt(input.value) || 0);
                    const result = this._mm()?.executeSell(res, qty, this._game());
                    if (!result?.success) {
                        showUserNotification(result?.message || 'Sale failed', 'error');
                        return;
                    }
                    this._updateCredits();
                    this._rebuildSellTable();
                });

                tbody.appendChild(row);
            } else {
                // Update in-place
                const stockEl = row.querySelector('[data-field="stock"]');
                const priceEl = row.querySelector('[data-field="price"]');
                const input   = row.querySelector('.tr-qty-input');
                if (stockEl) stockEl.textContent = Math.floor(stock);
                if (priceEl) priceEl.textContent  = `${price} CR/U`;
                if (input)   input.max = Math.floor(stock);
            }
        });

        // Keep sorted order
        resources.forEach(res => {
            const row = tbody.querySelector(`tr[data-resource="${res}"]`);
            if (row) tbody.appendChild(row);
        });
    }

    _getStock(resource, game) {
        let total = 0;
        game.canvas.nodes.forEach(node => {
            if (node.buildingDef?.isStorage && node.storedResourceType === resource) {
                total += node.inventory;
            }
        });
        return total;
    }

    // ── MARKET tab ───────────────────────────────────────────────────────────

    _buildMarketTab(area) {
        const mm = this._mm();
        area.innerHTML = `
            <table class="trader-table">
                <thead>
                    <tr>
                        <th>RESOURCE</th>
                        <th>BASE PRICE</th>
                        <th>CURRENT</th>
                        <th>TREND</th>
                    </tr>
                </thead>
                <tbody class="market-tbody"></tbody>
            </table>`;

        const tbody = area.querySelector('.market-tbody');

        Object.keys(MARKET_BASE_PRICES).forEach(res => {
            const resDef    = RESOURCES[res];
            const resName   = resDef?.name || res;
            const basePrice = MARKET_BASE_PRICES[res];
            const curPrice  = mm ? mm.getPrice(res) : basePrice;
            const pct       = Math.round(((curPrice - basePrice) / basePrice) * 100);
            const pctClass  = pct >= 0 ? 'tr-pct-high' : 'tr-pct-low';
            const symbol    = pct >= 0 ? '▲' : '▼';
            const pctStr    = `${pct >= 0 ? '+' : ''}${pct}%`;

            const tr = document.createElement('tr');
            tr.className = 'trader-row';
            tr.innerHTML = `
                <td class="tr-resource">${resName}</td>
                <td class="tr-price">${basePrice} CR/U</td>
                <td class="tr-price">${curPrice} CR/U</td>
                <td class="${pctClass}">${symbol} ${pctStr}</td>`;
            tbody.appendChild(tr);
        });
    }

    // ── Shared helpers ───────────────────────────────────────────────────────

    _updateCredits() {
        const game = this._game();
        const el   = this._root?.querySelector('.trader-credits-balance');
        if (el && game) {
            el.textContent = `${formatNumber(Math.floor(game.resources.get('credits')))} CR`;
        }
    }

    close() {
        if (this._pollInterval)  clearInterval(this._pollInterval);
        if (this._onPriceUpdate) document.removeEventListener('marketPriceUpdate', this._onPriceUpdate);
        this._root = null;
    }

    getSaveData()  { return {}; }
    loadSaveData() {}
}
