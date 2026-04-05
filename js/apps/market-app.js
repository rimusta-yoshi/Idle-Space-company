// Market App — STRATUM.EXCHANGE Commodity Terminal
// Tab 1 (SELL): live inventory with inline sell controls.
// Tab 2 (MARKET): all resources with base price, current price, and trend.

function stockGauge(current, capacity) {
    const BLOCKS = 8;
    const filled = capacity > 0 ? Math.round((current / capacity) * BLOCKS) : 0;
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(BLOCKS - filled);
    return `<span class="stock-gauge">${bar}</span> <span class="stock-count">${formatNumber(current)}</span>`;
}

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'STRATUM.EXCHANGE // COMMODITY TERMINAL';
        this.icon = 'EX';
        this.color = '#20a0c0';
        this._root       = null;
        this._activeTab  = 'sell';
        this._pollInterval      = null;
        this._onPriceUpdate     = null;
        this._selectedChartResource = null;
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
            if (this._activeTab === 'market') {
                this._rebuildContent();
                // Chart redraw deferred so the rebuilt DOM is laid out first
                requestAnimationFrame(() => this._drawChart(this._selectedChartResource));
            }
            this._updateTicker();
        };
        document.addEventListener('marketPriceUpdate', this._onPriceUpdate);
        this._updateTicker();

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

        // Aggregate storage inventory and capacity
        const stockMap    = {};
        const capacityMap = {};
        game.canvas.nodes.forEach(node => {
            if (node.buildingDef?.isStorage && node.storedResourceType) {
                const res = node.storedResourceType;
                capacityMap[res] = (capacityMap[res] || 0) + node.inventoryCapacity;
                if (node.inventory > 0) {
                    stockMap[res] = (stockMap[res] || 0) + node.inventory;
                }
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
            const stock    = stockMap[res];
            const capacity = capacityMap[res] || 0;
            const resDef   = RESOURCES[res];
            const resName  = resDef?.name || res;
            const price    = mm.getPrice(res);
            const resColor = resDef?.color || '#c49a2a';
            const iconHtml = resDef
                ? `<span class="material-symbols-outlined wh-icon">${resDef.icon}</span>`
                : '';
            const dotHtml = `<span class="res-color-dot" style="background:${resColor}"></span>`;
            const gaugeHtml = capacity > 0
                ? stockGauge(Math.floor(stock), capacity)
                : `<span class="stock-count">${formatNumber(Math.floor(stock))}</span>`;

            let row = existingRows.get(res);
            if (!row) {
                row = document.createElement('tr');
                row.className = 'trader-row';
                row.dataset.resource = res;
                row.innerHTML = `
                    <td class="tr-resource">${dotHtml}${iconHtml} ${resName}</td>
                    <td class="tr-qty" data-field="stock">${gaugeHtml}</td>
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
                if (stockEl) stockEl.innerHTML = gaugeHtml;
                if (priceEl) priceEl.textContent = `${price} CR/U`;
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
            <div class="market-chart-panel">
                <div class="market-chart-header">
                    <span class="market-chart-label" id="market-chart-label">── SELECT A RESOURCE ──</span>
                    <span class="market-chart-price" id="market-chart-price"></span>
                </div>
                <canvas id="market-price-chart" width="400" height="120"></canvas>
            </div>
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
            const direction = pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat';
            const symbol    = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→';
            const pctStr    = `${pct >= 0 ? '+' : ''}${pct}%`;

            const tr = document.createElement('tr');
            tr.className = 'trader-row';
            tr.dataset.resource = res;
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td class="tr-resource tr-resource--editorial">${resName}</td>
                <td class="tr-price tr-price--flat" data-field="base">${basePrice}</td>
                <td class="tr-price tr-price--${direction} val-flash" data-field="cur">${curPrice}</td>
                <td class="tr-pct-${direction === 'up' ? 'high' : direction === 'down' ? 'low' : 'flat'} val-flash">${symbol} ${pctStr}</td>`;
            tr.addEventListener('click', () => {
                this._selectedChartResource = res;
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('trader-row--selected'));
                tr.classList.add('trader-row--selected');
                this._drawChart(res);
            });
            if (this._selectedChartResource === res) {
                tr.classList.add('trader-row--selected');
            }
            tbody.appendChild(tr);
        });

        // Defer draw so canvas offsetWidth has settled
        const defaultRes = this._selectedChartResource || mm?.getLastUpdated();
        if (defaultRes) {
            requestAnimationFrame(() => this._drawChart(defaultRes));
        }
    }

    _drawChart(resourceKey) {
        if (!resourceKey) return;
        const canvas = this._root?.querySelector('#market-price-chart');
        if (!canvas) return;

        // Match canvas pixel width to rendered width
        if (canvas.offsetWidth > 0) canvas.width = canvas.offsetWidth;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#080a07';
        ctx.fillRect(0, 0, w, h);

        // Faint grid lines
        ctx.strokeStyle = 'rgba(196, 154, 42, 0.06)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const mm = this._mm();
        const history = mm ? mm.getPriceHistory(resourceKey) : [];
        const resDef = RESOURCES[resourceKey];
        const resColor = resDef?.color || '#c49a2a';

        if (history.length < 2) {
            ctx.fillStyle = '#3a3020';
            ctx.font = '14px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('AWAITING DATA', w / 2, h / 2);
            // Still update the label
            const labelEl = this._root?.querySelector('#market-chart-label');
            if (labelEl) labelEl.textContent = resDef ? resDef.name.toUpperCase() : resourceKey;
            return;
        }

        const prices = history.map(p => p.price);
        const min = Math.min(...prices) * 0.9;
        const max = Math.max(...prices) * 1.1;
        const range = max - min || 1;

        const toY = p => h - 8 - ((p - min) / range) * (h - 16);
        const toX = i => 4 + (i / (history.length - 1)) * (w - 8);

        // Glow pass (6px wide, 12% opacity of resource colour)
        ctx.beginPath();
        ctx.strokeStyle = resColor + '1f'; // ~12% opacity
        ctx.lineWidth = 6;
        history.forEach((p, i) => {
            i === 0 ? ctx.moveTo(toX(i), toY(p.price)) : ctx.lineTo(toX(i), toY(p.price));
        });
        ctx.stroke();

        // Main line in resource colour
        ctx.beginPath();
        ctx.strokeStyle = resColor;
        ctx.lineWidth = 1.5;
        history.forEach((p, i) => {
            i === 0 ? ctx.moveTo(toX(i), toY(p.price)) : ctx.lineTo(toX(i), toY(p.price));
        });
        ctx.stroke();

        // Latest point dot
        const last = history[history.length - 1];
        ctx.fillStyle = resColor;
        ctx.beginPath();
        ctx.arc(toX(history.length - 1), toY(last.price), 3, 0, Math.PI * 2);
        ctx.fill();

        // Update header
        const labelEl = this._root?.querySelector('#market-chart-label');
        const priceEl = this._root?.querySelector('#market-chart-price');
        if (labelEl) labelEl.textContent = resDef ? resDef.name.toUpperCase() : resourceKey;
        if (priceEl) priceEl.textContent = `${formatNumber(last.price)} CR/U`;
    }

    // ── Market ticker (factory app footer) ───────────────────────────────────

    _updateTicker() {
        updateMarketTicker(this._mm());
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

function updateMarketTicker(mm) {
    mm = mm || window.gameInstance?.marketManager;
    const inner = document.getElementById('market-ticker-inner');
    if (!inner || !mm) return;

    const entries = Object.keys(MARKET_BASE_PRICES).map(key => {
        const current = mm.getPrice(key);
        const base    = MARKET_BASE_PRICES[key];
        const resDef  = RESOURCES[key];
        const name    = resDef ? resDef.name.toUpperCase() : key;
        const ratio   = current / base;
        const arrow   = ratio > 1.05 ? '\u2191' : ratio < 0.95 ? '\u2193' : '\u2192';
        const cls     = ratio > 1.05 ? 'ticker-up' : ratio < 0.95 ? 'ticker-down' : 'ticker-flat';
        const nameColor = resDef?.color || '#8a7a50';
        return `<span class="ticker-name" style="color:${nameColor}">${name}</span> ` +
               `<span class="ticker-price">${formatNumber(current)}CR</span> ` +
               `<span class="${cls}">${arrow}</span>` +
               `<span style="color:#2a2010">  \u00b7  </span>`;
    });

    inner.innerHTML = entries.join('');
    inner.style.animation = 'none';
    inner.offsetHeight; // force reflow
    inner.style.animation = '';
    inner.style.animationDuration = `${Math.max(20, entries.length * 3)}s`;
}

// Keep ticker live even when MarketApp window is closed
document.addEventListener('marketPriceUpdate', () => updateMarketTicker());
