// Market App — STRATUM.EXCHANGE Commodity Portal
// Manual resource selling. Only shows resources currently in storage nodes.

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'STRATUM.EXCHANGE // COMMODITY PORTAL';
        this.icon = 'EX';
        this.updateInterval = null;
        this._lastRowKeys = '';
    }

    get sellPrices() {
        const prices = {};
        Object.entries(RESOURCES).forEach(([id, def]) => {
            if (def.sellPrice != null) prices[id] = def.sellPrice;
        });
        return prices;
    }

    // Get inventory amounts from storage nodes (source of truth)
    _getStorageInventory() {
        const game = window.gameInstance;
        if (!game) return {};

        const totals = {};
        game.canvas.nodes.forEach(node => {
            const isStorage = node.buildingDef?.isStorage || node.buildingType === 'storageNode';
            if (!isStorage || !node.storedResourceType) return;
            const res = node.storedResourceType;
            totals[res] = (totals[res] || 0) + node.inventory;
        });
        return totals;
    }

    mount(contentElement) {
        const template = document.getElementById('market-app-template');
        if (!template) throw new Error('Market app template not found');
        contentElement.appendChild(template.content.cloneNode(true));

        this.updateDisplay(contentElement);
        this.updateInterval = setInterval(() => this.updateDisplay(contentElement), 1000);
    }

    updateDisplay(root) {
        const game = window.gameInstance;
        if (!game) return;

        const inventory = this._getStorageInventory();
        const prices = this.sellPrices;

        // Only rows for resources that: have a sell price AND have inventory
        const sellable = Object.entries(inventory)
            .filter(([res, amt]) => prices[res] != null && amt > 0)
            .sort(([a], [b]) => a.localeCompare(b));

        const rowKeys = sellable.map(([r]) => r).join(',');
        const tbody = root.querySelector('.market-tbody');
        if (!tbody) return;

        // Rebuild rows if set changed
        if (rowKeys !== this._lastRowKeys) {
            this._lastRowKeys = rowKeys;
            tbody.innerHTML = '';

            if (sellable.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="market-empty">No sellable resources in storage. Connect a storage node to your production chain.</td></tr>`;
            } else {
                sellable.forEach(([res]) => {
                    const resDef = RESOURCES[res];
                    const price = prices[res];
                    const tr = document.createElement('tr');
                    tr.className = 'market-row';
                    tr.setAttribute('data-resource', res);
                    tr.innerHTML = `
                        <td class="market-cell-resource">
                            <span class="material-symbols-outlined market-res-icon">${resDef?.icon || 'circle'}</span>
                            <span class="market-res-name">${resDef?.name?.toUpperCase() || res.toUpperCase()}</span>
                        </td>
                        <td class="market-cell-amt" data-field="amount">0</td>
                        <td class="market-cell-price">${formatNumber(price)} CR</td>
                        <td class="market-cell-value" data-field="value">0 CR</td>
                        <td class="market-cell-actions">
                            <button class="market-sell-btn" data-resource="${res}" data-amount="100">100</button>
                            <button class="market-sell-btn" data-resource="${res}" data-amount="1000">1K</button>
                            <button class="market-sell-btn market-sell-all" data-resource="${res}" data-amount="all">ALL</button>
                        </td>`;
                    tbody.appendChild(tr);
                });

                // Wire sell buttons
                tbody.querySelectorAll('.market-sell-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const res = btn.getAttribute('data-resource');
                        const amt = btn.getAttribute('data-amount');
                        this._sell(res, amt === 'all' ? Infinity : parseInt(amt));
                        this.updateDisplay(root);
                    });
                });
            }
        }

        // Update amounts + values every tick
        sellable.forEach(([res, inv]) => {
            const row = tbody.querySelector(`tr[data-resource="${res}"]`);
            if (!row) return;
            const price = prices[res];
            const amtEl = row.querySelector('[data-field="amount"]');
            const valEl = row.querySelector('[data-field="value"]');
            if (amtEl) amtEl.textContent = formatNumber(Math.floor(inv));
            if (valEl) valEl.textContent = `${formatNumber(Math.floor(inv * price))} CR`;
        });

        // Credits balance
        const creditsEl = root.querySelector('.market-credits-balance');
        if (creditsEl) {
            creditsEl.textContent = `${formatNumber(Math.floor(game.resources.get('credits')))} CR`;
        }
    }

    _sell(resourceType, amount) {
        const game = window.gameInstance;
        if (!game) return;

        const price = this.sellPrices[resourceType];
        if (!price) return;

        // Sum available across all matching storage nodes
        let available = 0;
        game.canvas.nodes.forEach(node => {
            const isStorage = node.buildingDef?.isStorage || node.buildingType === 'storageNode';
            if (isStorage && node.storedResourceType === resourceType) {
                available += node.inventory;
            }
        });

        const actualAmount = Math.min(amount, Math.floor(available));
        if (actualAmount <= 0) return;

        // Deduct from storage nodes FIFO
        game._deductFromStorage(resourceType, actualAmount);

        // Add credits
        const credits = actualAmount * price;
        game.resources.add('credits', credits);

        log(`Sold ${formatNumber(actualAmount)} ${resourceType} for ${formatNumber(credits)} credits`);
    }

    close() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }

    getSaveData() { return {}; }
    loadSaveData() {}
}
