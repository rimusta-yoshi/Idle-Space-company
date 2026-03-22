// Trader Manager
// Resource-keyed offer system: every eligible resource always has a BUY and SELL offer.
// Timers refresh prices only — there is no "no offer" state for eligible resources.

class TraderManager {
    constructor() {
        this._offers = {}; // { [resource]: { BUY: offer, SELL: offer } }
        this._activityLog = [];
        this._firstSaleFired = false;
    }

    // Ensure all eligible resources have offers initialised.
    _ensureOffers(tier) {
        this._eligibleResources(tier).forEach(resource => {
            if (!this._offers[resource]) {
                this._offers[resource] = {
                    BUY:  this._generateOffer(resource, 'BUY'),
                    SELL: this._generateOffer(resource, 'SELL'),
                };
            }
        });
    }

    // Called every game tick. Counts down timers and refreshes prices on expiry.
    tick(deltaTime, tier) {
        this._ensureOffers(tier);
        let needsUpdate = false;

        for (const [resource, pair] of Object.entries(this._offers)) {
            for (const dir of ['BUY', 'SELL']) {
                const offer = pair[dir];
                offer.timeRemaining -= deltaTime;
                if (offer.timeRemaining <= 0) {
                    pair[dir] = this._generateOffer(resource, dir);
                    const resName = RESOURCES[resource]?.name || resource;
                    this._log('arrive', `${resName} ${dir} rate updated: ${pair[dir].pricePerUnit} CR/U`);
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) document.dispatchEvent(new CustomEvent('traderUpdate'));
    }

    // Execute a trade. direction = 'BUY' (player sells) | 'SELL' (player buys).
    executeTrade(resource, direction, qty, game) {
        const offer = this._offers[resource]?.[direction];
        if (!offer) return { success: false, message: 'No offer available' };

        const resDef  = RESOURCES[resource];
        const resName = resDef?.name || resource;
        const remaining = offer.quantity - offer.quantityFilled;

        if (direction === 'BUY') {
            return this._executeSell(resource, offer, qty, remaining, resName, game);
        } else {
            return this._executeBuy(resource, offer, qty, remaining, resName, game);
        }
    }

    // Player sells resource to BUY offer.
    _executeSell(resource, offer, requestedQty, remaining, resName, game) {
        const available = this._storageAmount(resource, game);
        const qty = Math.min(requestedQty, remaining, Math.floor(available));

        if (qty <= 0) return { success: false, message: `No ${resName} in storage` };

        game._deductFromStorage(resource, qty);
        game.resources.add('credits', qty * offer.pricePerUnit);
        offer.quantityFilled += qty;

        this._log('trade', `Sold ${qty} ${resName}. +${qty * offer.pricePerUnit} CR`);

        if (!this._firstSaleFired) {
            this._firstSaleFired = true;
            document.dispatchEvent(new CustomEvent('firstSaleCompleted'));
        }

        this._checkRefresh(resource, 'BUY', offer);
        game.graphDirty = true;
        return { success: true };
    }

    // Player buys resource from SELL offer.
    _executeBuy(resource, offer, requestedQty, remaining, resName, game) {
        const credits      = game.resources.get('credits');
        const maxByCredits = Math.floor(credits / offer.pricePerUnit);
        const storageSpace = this._storageSpace(resource, game);
        const qty = Math.min(requestedQty, remaining, maxByCredits, Math.floor(storageSpace));

        if (qty <= 0) {
            if (maxByCredits <= 0) return { success: false, message: 'Insufficient credits' };
            return { success: false, message: `No storage available for ${resName}` };
        }

        const cost = qty * offer.pricePerUnit;
        game.resources.remove('credits', cost);
        game._addToStorage(resource, qty);
        offer.quantityFilled += qty;

        this._log('trade', `Bought ${qty} ${resName}. -${cost} CR`);

        this._checkRefresh(resource, 'SELL', offer);
        game.graphDirty = true;
        return { success: true };
    }

    // If an offer is fully filled, immediately replace it with fresh prices.
    _checkRefresh(resource, direction, offer) {
        if (offer.quantityFilled >= offer.quantity) {
            const fresh = this._generateOffer(resource, direction);
            this._offers[resource][direction] = fresh;
            const resName = RESOURCES[resource]?.name || resource;
            this._log('arrive', `${resName} ${direction} restocked: ${fresh.pricePerUnit} CR/U`);
            document.dispatchEvent(new CustomEvent('traderUpdate'));
        } else {
            document.dispatchEvent(new CustomEvent('traderActivity'));
        }
    }

    _generateOffer(resource, direction) {
        const basePrice   = MARKET_BASE_PRICES[resource] || 10;
        const fluctuation = 0.75 + Math.random() * 0.5;   // 75 – 125 % of base
        const pricePerUnit = Math.round(basePrice * fluctuation);
        const quantity     = 50 + Math.floor(Math.random() * 51);   // 50 – 100
        const duration     = 120 + Math.floor(Math.random() * 61);  // 120 – 180 s
        return { resource, direction, pricePerUnit, basePrice, quantity, quantityFilled: 0, timeRemaining: duration };
    }

    _eligibleResources(tier) {
        const pool = [];
        for (let t = 0; t <= Math.min(tier, 2); t++) {
            (TRADER_TIER_RESOURCES[t] || []).forEach(r => pool.push(r));
        }
        return pool;
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

    _storageSpace(resource, game) {
        let space = 0;
        game.canvas.nodes.forEach(node => {
            if (node.buildingDef?.isStorage && node.storedResourceType === resource) {
                const cap = node.inventoryCapacity || 1;
                space += Math.max(0, cap - node.inventory);
            }
        });
        return space;
    }

    _log(type, message) {
        const now  = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        this._activityLog.unshift({ type, message, time });
        if (this._activityLog.length > 50) this._activityLog.length = 50;
    }

    getSaveData() {
        return {
            offers:         this._offers,
            activityLog:    this._activityLog.slice(0, 20),
            firstSaleFired: this._firstSaleFired,
        };
    }

    loadSaveData(data) {
        if (!data) return;
        if (data.offers)         this._offers         = data.offers;
        if (data.activityLog)    this._activityLog    = data.activityLog;
        if (data.firstSaleFired) this._firstSaleFired = data.firstSaleFired;
    }
}