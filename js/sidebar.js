// Sidebar UI Manager
// Handles updating the left sidebar: resources + building palette

class SidebarManager {
    constructor(resourceManager, rootElement = document) {
        this.resourceManager = resourceManager;
        this.rootElement = rootElement;
        this.initialize();
    }

    initialize() {
        // Palette will be populated once franchise state is known (via refreshPalette)
        // Start with nothing — game.js calls refreshPalette after load
        this.activeTab = 'all';
        this.setupSearch();
        this.setupTabs();
        log('SidebarManager initialized');
    }

    // Repopulate cards for the given unlocked set, then refresh affordability
    refreshPalette(unlockedSet, buildingCounts, franchise = null) {
        this.populateBuildingPalette(unlockedSet);
        this.updateBuildingPalette(buildingCounts, franchise);
    }

    // Build a palette card for a building type (one card per building, regardless of recipes)
    _makeBuildingCard(building) {
        const recipeCount = building.usesRecipes ? getRecipesForBuilding(building.id).length : 0;
        const subtitle = recipeCount > 0 ? `${recipeCount} RECIPES`
            : building.autoSell ? 'AUTO SELL'
            : building.category === 'infrastructure' ? 'GENERATOR'
            : 'EXTRACTOR';

        const card = document.createElement('div');
        card.className = 'palette-card';
        card.draggable = true;
        card.setAttribute('data-building', building.id);
        card.setAttribute('data-search-name', building.name.toUpperCase());
        card.setAttribute('data-category', building.category || '');

        // For fixed-output buildings, build a production preview row
        let outputsHtml = '';
        if (!building.usesRecipes && !building.autoSell && building.production) {
            const parts = Object.entries(building.production).map(([resKey, rate]) => {
                const resDef = (typeof RESOURCES !== 'undefined') ? RESOURCES[resKey] : null;
                const resName = resDef ? resDef.name.toUpperCase() : resKey.toUpperCase();
                const resIcon = resDef ? resDef.icon : 'circle';
                return `<span class="palette-output-item">` +
                    `<span class="material-symbols-outlined palette-icon">${resIcon}</span>` +
                    `${resName} <span class="palette-output-rate">+${formatRatePerMin(rate)}</span>` +
                    `</span>`;
            });
            if (parts.length) {
                outputsHtml = `<div class="palette-card-outputs">${parts.join('')}</div>`;
            }
        }

        card.innerHTML = `
            <div class="palette-card-header">
                <span class="palette-card-name">${building.name.toUpperCase()}</span>
                <span class="palette-card-type">${subtitle}</span>
            </div>
            ${outputsHtml}
            <div class="palette-card-cost" data-cost=""></div>`;

        return card;
    }

    populateBuildingPalette(unlockedSet = null) {
        const container = this.rootElement.querySelector('#building-list');
        if (!container) return;

        container.innerHTML = '';

        Object.values(BUILDINGS).forEach(building => {
            if (!building.unlocked) return;
            // If a franchise unlock set is provided, filter by it
            if (unlockedSet && !unlockedSet.has(building.id)) return;
            container.appendChild(this._makeBuildingCard(building));
        });
    }

    setupSearch() {
        const input = this.rootElement.querySelector('#palette-search');
        if (!input) return;

        input.addEventListener('input', () => {
            this._applyFilters();
        });
    }

    setupTabs() {
        const tabs = this.rootElement.querySelector('#palette-tabs');
        if (!tabs) return;

        tabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.palette-tab');
            if (!tab) return;
            this.activeTab = tab.getAttribute('data-tab') || 'all';
            tabs.querySelectorAll('.palette-tab').forEach(t => t.classList.toggle('active', t === tab));
            this._applyFilters();
        });
    }

    _applyFilters() {
        const input = this.rootElement.querySelector('#palette-search');
        const query = input ? input.value.trim().toUpperCase() : '';
        const cards = this.rootElement.querySelectorAll('.palette-card');

        cards.forEach(card => {
            const name = card.getAttribute('data-search-name') || '';
            const category = card.getAttribute('data-category') || '';
            const matchesSearch = query === '' || name.includes(query);
            const matchesTab = this.activeTab === 'all' || category === this.activeTab;
            card.style.display = (matchesSearch && matchesTab) ? '' : 'none';
        });
    }

    // Update credits balance and P&L rate in the sidebar
    updateResources() {
        const credits = this.resourceManager.resources['credits'];
        if (!credits) return;

        const balanceEl = this.rootElement.querySelector('#credits-amount');
        if (balanceEl) balanceEl.textContent = formatNumber(credits.current);

        const pnlEl = this.rootElement.querySelector('#credits-pnl');
        if (pnlEl) {
            const ratePerMin = credits.production * 60;
            const sign = ratePerMin >= 0 ? '+' : '';
            pnlEl.textContent = `${sign}${formatNumber(Math.abs(ratePerMin))}/MIN`;
            pnlEl.className = 'credits-pnl ' + (ratePerMin > 0 ? 'positive' : ratePerMin < 0 ? 'negative' : 'neutral');
        }
    }

    // Update power balance display in the sidebar
    updatePower(supply = 0, demand = 0) {
        const supplyPerMin = supply * 60;
        const demandPerMin = demand * 60;

        const supplyEl = this.rootElement.querySelector('#power-supply');
        if (supplyEl) supplyEl.textContent = `${formatNumber(supplyPerMin)}/MIN`;

        const demandEl = this.rootElement.querySelector('#power-demand');
        if (demandEl) demandEl.textContent = `${formatNumber(demandPerMin)}/MIN`;

        const statusEl = this.rootElement.querySelector('#power-status');
        if (statusEl) {
            const deficit = demand - supply;
            if (demand <= 0.001) {
                statusEl.textContent = 'POWER';
                statusEl.className = 'power-status neutral';
            } else if (deficit > 0.001) {
                statusEl.textContent = `DEFICIT  -${formatNumber(deficit * 60)}/MIN`;
                statusEl.className = 'power-status negative';
            } else {
                statusEl.textContent = `OK  +${formatNumber((supply - demand) * 60)}/MIN`;
                statusEl.className = 'power-status positive';
            }
        }
    }

    // Enable/disable cards and update cost display based on affordability + buildingCounts
    updateBuildingPalette(buildingCounts, franchise = null) {
        const cards = this.rootElement.querySelectorAll('.palette-card');
        const freeClaims = franchise?.freeClaims || {};
        const starterKit = getFranchiseTier(0).starterKit;

        cards.forEach(card => {
            const buildingType = card.getAttribute('data-building');
            const claimsLeft = freeClaims[buildingType] || 0;
            const claimsTotal = starterKit[buildingType] || 0;
            const isClaimOnly = CLAIM_ONLY_CATEGORIES.has(BUILDINGS[buildingType]?.category);
            const costEl = card.querySelector('.palette-card-cost');

            if (claimsLeft > 0) {
                // Has free claims — show FREE X/Y badge
                card.classList.remove('locked', 'claim-exhausted');
                card.style.cursor = 'grab';
                if (costEl) {
                    costEl.innerHTML = `<span class="free-claim-badge">FREE ${claimsLeft}/${claimsTotal}</span>`;
                }
            } else if (isClaimOnly) {
                // Extractor with no claims left — show locked state
                card.classList.add('locked', 'claim-exhausted');
                card.style.cursor = 'not-allowed';
                if (costEl) {
                    costEl.innerHTML = `<span class="claim-exhausted-msg">STRATUM TIER REWARD</span>`;
                }
            } else {
                // Normal cost check
                const count = buildingCounts[buildingType] || 0;
                const cost = calculateBuildingCost(buildingType, count);
                const canAfford = this.resourceManager.canAfford(cost);

                card.classList.remove('claim-exhausted');
                card.classList.toggle('locked', !canAfford);
                card.style.cursor = canAfford ? 'grab' : 'not-allowed';

                if (costEl) {
                    const entries = Object.entries(cost || {});
                    if (entries.length === 0) {
                        costEl.innerHTML = `<span class="cost-free">FREE</span>`;
                    } else {
                        costEl.innerHTML = entries
                            .map(([res, amt]) => {
                                const name = (typeof RESOURCES !== 'undefined' && RESOURCES[res])
                                    ? RESOURCES[res].name.toUpperCase()
                                    : res.toUpperCase();
                                return `<span class="cost-line"><span class="cost-amt">${formatNumber(amt)}</span> ${name}</span>`;
                            })
                            .join('');
                    }
                }
            }
        });
    }

    // Setup drag-and-drop for building palette
    setupDragAndDrop(onBuildingDropped) {
        const canvasContainer = this.rootElement.querySelector('#canvas-container');
        if (!canvasContainer) return;

        this.rootElement.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.palette-card');
            if (!card) return;
            const buildingType = card.getAttribute('data-building');
            e.dataTransfer.setData('buildingType', buildingType);
            e.dataTransfer.effectAllowed = 'copy';
        });

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const buildingType = e.dataTransfer.getData('buildingType');
            if (!buildingType) return;

            const rect = canvasContainer.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            if (onBuildingDropped) {
                onBuildingDropped(buildingType, screenX, screenY);
            }
        });
    }
}
