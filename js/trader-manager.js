// Market Manager
// Global market rate system: each resource has one fluctuating price.
// Prices drift ±25% from base, refreshing every 2–3 minutes.

class MarketManager {
    constructor() {
        this._prices = {};          // { [resource]: { current, timeRemaining } }
        this._firstSaleFired = false;
    }

    // Called every game tick. Counts down timers and refreshes prices on expiry.
    tick(deltaTime) {
        this._ensurePrices();
        let needsUpdate = false;

        for (const resource of Object.keys(this._prices)) {
            const price = this._prices[resource];
            price.timeRemaining -= deltaTime;
            if (price.timeRemaining <= 0) {
                this._prices[resource] = this._generatePrice(resource);
                needsUpdate = true;
            }
        }

        if (needsUpdate) document.dispatchEvent(new CustomEvent('marketPriceUpdate'));
    }

    // Ensure all market resources have a price initialised.
    _ensurePrices() {
        Object.keys(MARKET_BASE_PRICES).forEach(resource => {
            if (!this._prices[resource]) {
                this._prices[resource] = this._generatePrice(resource);
            }
        });
    }

    _generatePrice(resource) {
        const base        = MARKET_BASE_PRICES[resource] || 10;
        const fluctuation = 0.75 + Math.random() * 0.5;   // 75–125% of base
        const current     = Math.round(base * fluctuation);
        const duration    = 120 + Math.floor(Math.random() * 61); // 120–180 s
        return { current, timeRemaining: duration };
    }

    getPrice(resource) {
        return this._prices[resource]?.current ?? MARKET_BASE_PRICES[resource] ?? 10;
    }

    // Execute a sell: deduct qty from storage, add credits, return result.
    executeSell(resource, qty, game) {
        const resDef  = RESOURCES[resource];
        const resName = resDef?.name || resource;
        const available = this._storageAmount(resource, game);
        const actualQty = Math.min(qty, Math.floor(available));

        if (actualQty <= 0) {
            return { success: false, message: `No ${resName} in storage` };
        }

        const price = this.getPrice(resource);
        game._deductFromStorage(resource, actualQty);
        game.resources.add('credits', actualQty * price);

        if (!this._firstSaleFired) {
            this._firstSaleFired = true;
            document.dispatchEvent(new CustomEvent('firstSaleCompleted'));
        }

        game.graphDirty = true;
        return { success: true, qty: actualQty, total: actualQty * price };
    }

    _storageAmount(resource, game) {
        let total = 0;
        game.canvas.nodes.forEach(node => {
            if (node.buildingDef?.isStorage && node.storedResourceType === resource) {
                total += node.inventory;
            }
        });
        return total;
    }

    getSaveData() {
        return {
            prices:         this._prices,
            firstSaleFired: this._firstSaleFired,
        };
    }

    loadSaveData(data) {
        if (!data) return;
        if (data.prices)         this._prices         = data.prices;
        if (data.firstSaleFired) this._firstSaleFired = data.firstSaleFired;
    }
}
