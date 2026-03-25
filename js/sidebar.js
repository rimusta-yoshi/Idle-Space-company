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
        const card = document.createElement('div');
        card.className = 'palette-card';
        card.draggable = true;
        card.setAttribute('data-building', building.id);
        card.setAttribute('data-search-name', building.name.toUpperCase());
        card.setAttribute('data-category', building.category || '');

        // Output summary row — text only, no icons
        let outputHtml = '';
        if (building.usesRecipes) {
            const outputKeys = getAllRecipeOutputs(building.id);
            const names = outputKeys.map(key => {
                const resDef = (typeof RESOURCES !== 'undefined') ? RESOURCES[key] : null;
                return resDef ? resDef.name.toUpperCase() : key.toUpperCase();
            });
            const maxShow = 3;
            const shown = names.slice(0, maxShow);
            const remainder = names.length - maxShow;
            let outputText = shown.join(' · ');
            if (remainder > 0) outputText += ` +${remainder}`;
            outputHtml = `<div class="palette-card-output">${outputText}</div>`;
        } else if (!building.autoSell && building.production) {
            const parts = Object.entries(building.production).map(([resKey, rate]) => {
                const resDef = (typeof RESOURCES !== 'undefined') ? RESOURCES[resKey] : null;
                const resName = resDef ? resDef.name.toUpperCase() : resKey.toUpperCase();
                return `${resName} <span class="palette-output-rate">+${formatRatePerMin(rate)}</span>`;
            });
            if (parts.length) {
                outputHtml = `<div class="palette-card-output">${parts.join('  ')}</div>`;
            }
        } else if (building.autoSell) {
            outputHtml = `<div class="palette-card-output palette-card-output--dim">AUTO-SELLS CONNECTED INPUT</div>`;
        } else if (building.isStorage) {
            outputHtml = `<div class="palette-card-output palette-card-output--dim">BUFFER STORAGE</div>`;
        } else if (building.isSplitter) {
            outputHtml = `<div class="palette-card-output palette-card-output--dim">SPLITS FLOW 3-WAY</div>`;
        }

        const catColor = getCategoryColor(building.category);
        card.style.borderLeftColor = catColor;
        card.style.setProperty('--card-cat-color', catColor);

        card.innerHTML = `
            <div class="palette-card-header">
                <span class="palette-card-name">${building.name.toUpperCase()}</span>
                <span class="palette-card-price" data-price=""></span>
            </div>
            ${outputHtml}`;

        return card;
    }

    populateBuildingPalette(unlockedSet = null) {
        const container = this.rootElement.querySelector('#building-list');
        if (!container) return;

        container.innerHTML = '';

        // Category display order for ALL view
        const categoryOrder = ['power', 'extractors', 'smelters', 'assemblers', 'manufacturers', 'infrastructure', 'commerce', 'facilities'];
        const categoryLabels = {
            power: 'POWER',
            extractors: 'EXTRACTORS',
            smelters: 'SMELTERS',
            assemblers: 'ASSEMBLERS',
            manufacturers: 'MANUFACTURERS',
            infrastructure: 'INFRASTRUCTURE',
            commerce: 'COMMERCE',
            facilities: 'FACILITIES'
        };

        categoryOrder.forEach(cat => {
            const buildings = Object.values(BUILDINGS).filter(b => {
                if (!b.unlocked) return false;
                if (unlockedSet && !unlockedSet.has(b.id)) return false;
                return b.category === cat;
            });
            if (buildings.length === 0) return;

            const header = document.createElement('div');
            header.className = 'palette-group-header';
            header.textContent = categoryLabels[cat] || cat.toUpperCase();
            header.setAttribute('data-group-header', 'true');
            header.setAttribute('data-group-category', cat);
            const catColor = getCategoryColor(cat);
            header.style.color = catColor;
            header.style.setProperty('--cat-color', catColor);
            container.appendChild(header);

            buildings.forEach(building => container.appendChild(this._makeBuildingCard(building)));
        });

        this._updateTabVisibility();
    }

    _updateTabVisibility() {
        const tabs = this.rootElement.querySelectorAll('.palette-tab[data-tab]');
        const cards = this.rootElement.querySelectorAll('.palette-card');

        // Build a set of categories that have at least one card
        const presentCategories = new Set();
        cards.forEach(card => presentCategories.add(card.getAttribute('data-category') || ''));

        tabs.forEach(tab => {
            const tabKey = tab.getAttribute('data-tab');
            if (tabKey === 'all') return; // ALL is always visible

            // Apply category color as CSS custom property
            const catColor = getCategoryColor(tabKey);
            tab.style.setProperty('--tab-color', catColor);

            // infrastructure tab also covers facilities
            const hasBuildings = tabKey === 'infrastructure'
                ? (presentCategories.has('infrastructure') || presentCategories.has('facilities'))
                : presentCategories.has(tabKey);

            tab.style.display = hasBuildings ? '' : 'none';
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
        const isAll = this.activeTab === 'all';

        // facilities fold into the infrastructure tab
        const tabMatchesCategory = (tab, category) => {
            if (tab === 'all') return true;
            if (tab === 'infrastructure' && category === 'facilities') return true;
            return category === tab;
        };

        // Cards
        const cards = this.rootElement.querySelectorAll('.palette-card');
        cards.forEach(card => {
            const name = card.getAttribute('data-search-name') || '';
            const category = card.getAttribute('data-category') || '';
            const matchesSearch = query === '' || name.includes(query);
            const matchesTab = tabMatchesCategory(this.activeTab, category);
            card.style.display = (matchesSearch && matchesTab) ? '' : 'none';
        });

        // Group headers — only visible in ALL view with no search query
        const headers = this.rootElement.querySelectorAll('[data-group-header]');
        headers.forEach(h => {
            h.style.display = (isAll && query === '') ? '' : 'none';
        });
    }

    // Update credits balance and P&L rate in the header
    updateResources() {
        const credits = this.resourceManager.resources['credits'];
        if (!credits) return;

        const balanceEl = this.rootElement.querySelector('#header-credits-amount');
        if (balanceEl) {
            // Lerp display value toward actual — smooth count-up instead of snap
            this._creditsDisplay = (this._creditsDisplay ?? credits.current);
            this._creditsDisplay += (credits.current - this._creditsDisplay) * 0.15;
            balanceEl.textContent = formatNumber(Math.round(this._creditsDisplay));
        }

        const pnlEl = this.rootElement.querySelector('#header-credits-pnl');
        if (pnlEl) {
            const ratePerMin = credits.production * 60;
            const sign = ratePerMin >= 0 ? '+' : '';
            pnlEl.textContent = `${sign}${formatNumber(Math.abs(ratePerMin))}/MIN`;
            pnlEl.className = 'header-stat-sub ' + (ratePerMin > 0 ? 'positive' : ratePerMin < 0 ? 'negative' : 'neutral');
        }
    }

    // Update power balance display in the header
    updatePower(supply = 0, demand = 0) {
        const ratio = demand > 0 ? Math.min(supply / demand, 1) : 1;
        const net = supply - demand;

        // Drive VU segments
        const segments = this.rootElement.querySelectorAll('#header-power-vu .vu-segment');
        const filled = Math.round(ratio * 8);
        segments.forEach((seg, i) => {
            seg.classList.remove('active', 'warn', 'danger');
            if (i < filled) {
                seg.classList.add('active');
                if (ratio < 0.5) seg.classList.add('danger');
                else if (ratio < 0.85) seg.classList.add('warn');
            }
        });

        // Sub-label: signed net figure
        const detail = this.rootElement.querySelector('#header-power-detail');
        if (detail) {
            const sign = net >= 0 ? '+' : '';
            detail.textContent = `${sign}${formatRatePerMin(net)}`;
            detail.className = 'header-stat-sub ' + (net >= 0 ? 'positive' : 'negative');
        }
    }

    // Enable/disable cards and update cost display based on affordability + buildingCounts
    updateBuildingPalette(buildingCounts, franchise = null) {
        const cards = this.rootElement.querySelectorAll('.palette-card');
        const freeClaims = franchise?.freeClaims || {};
        const extractorPurchaseCounts = franchise?.extractorPurchaseCounts || {};
        const starterKit = getFranchiseTier(0).starterKit;

        cards.forEach(card => {
            const buildingType = card.getAttribute('data-building');
            const def = BUILDINGS[buildingType];
            const claimsLeft = freeClaims[buildingType] || 0;
            const claimsTotal = starterKit[buildingType] || 0;
            const isExtractor = def?.category === 'extractors';
            const costEl = card.querySelector('.palette-card-price');
            const count = buildingCounts[buildingType] || 0;

            // Check planet node cap for extractors
            if (isExtractor && typeof PLANET_NODE_CAPS !== 'undefined') {
                const cap = PLANET_NODE_CAPS[buildingType];
                if (cap !== undefined && count >= cap) {
                    card.classList.add('locked', 'claim-exhausted');
                    card.style.cursor = 'not-allowed';
                    if (costEl) {
                        costEl.innerHTML = `<span class="palette-price-limit">NODE LIMIT</span>`;
                    }
                    return;
                }
            }

            if (claimsLeft > 0) {
                // Has free claims — show FREE X/Y badge
                card.classList.remove('locked', 'claim-exhausted');
                card.style.cursor = 'grab';
                if (costEl) {
                    costEl.innerHTML = `<span class="free-claim-badge">FREE ${claimsLeft}/${claimsTotal}</span>`; // badge style unchanged
                }
            } else {
                // Normal cost check — extractors use stepped pricing
                const purchaseCount = isExtractor ? (extractorPurchaseCounts[buildingType] || 0) : 0;
                const cost = calculateBuildingCost(buildingType, count, purchaseCount);
                const canAfford = this.resourceManager.canAfford(cost);

                card.classList.remove('claim-exhausted');
                card.classList.toggle('locked', !canAfford);
                card.style.cursor = canAfford ? 'grab' : 'not-allowed';

                if (costEl) {
                    const entries = Object.entries(cost || {});
                    if (entries.length === 0) {
                        costEl.innerHTML = `<span class="free-claim-badge">FREE</span>`;
                    } else if (entries.length === 1 && entries[0][0] === 'credits') {
                        costEl.innerHTML = `${formatNumber(entries[0][1])} CR <span class="palette-price-stratum">™</span>`;
                    } else {
                        costEl.innerHTML = entries
                            .map(([res, amt]) => {
                                const name = (typeof RESOURCES !== 'undefined' && RESOURCES[res])
                                    ? RESOURCES[res].name.toUpperCase()
                                    : res.toUpperCase();
                                return `${formatNumber(amt)} ${name}`;
                            })
                            .join(' · ');
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
