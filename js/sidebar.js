// Sidebar UI Manager
// Handles updating the left sidebar: resources + building palette

class SidebarManager {
    constructor(resourceManager, rootElement = document) {
        this.resourceManager = resourceManager;
        this.rootElement = rootElement;
        this.initialize();
    }

    initialize() {
        this.populateBuildingPalette();
        this.setupSearch();
        log('SidebarManager initialized');
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

    populateBuildingPalette() {
        const container = this.rootElement.querySelector('#building-list');
        if (!container) return;

        container.innerHTML = '';

        Object.values(BUILDINGS).forEach(building => {
            if (!building.unlocked) return;
            container.appendChild(this._makeBuildingCard(building));
        });
    }

    setupSearch() {
        const input = this.rootElement.querySelector('#palette-search');
        if (!input) return;

        input.addEventListener('input', () => {
            const query = input.value.trim().toUpperCase();
            const cards = this.rootElement.querySelectorAll('.palette-card');
            cards.forEach(card => {
                const name = card.getAttribute('data-search-name') || '';
                card.style.display = (query === '' || name.includes(query)) ? '' : 'none';
            });
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
        const supplyEl = this.rootElement.querySelector('#power-supply');
        if (supplyEl) supplyEl.textContent = formatNumber(supplyPerMin);

        const pnlEl = this.rootElement.querySelector('#power-pnl');
        if (pnlEl) {
            const deltaPerMin = (supply - demand) * 60;
            const sign = deltaPerMin >= 0 ? '+' : '';
            pnlEl.textContent = `${sign}${formatNumber(Math.abs(deltaPerMin))}/MIN`;
            pnlEl.className = 'power-pnl ' + (deltaPerMin > 0.1 ? 'positive' : deltaPerMin < -0.1 ? 'negative' : 'neutral');
        }
    }

    // Enable/disable cards and update cost display based on affordability + buildingCounts
    updateBuildingPalette(buildingCounts) {
        const cards = this.rootElement.querySelectorAll('.palette-card');

        cards.forEach(card => {
            const buildingType = card.getAttribute('data-building');
            const count = buildingCounts[buildingType] || 0;
            const cost = calculateBuildingCost(buildingType, count);
            const canAfford = this.resourceManager.canAfford(cost);

            card.classList.toggle('locked', !canAfford);
            card.style.cursor = canAfford ? 'grab' : 'not-allowed';

            // Update cost label
            const costEl = card.querySelector('.palette-card-cost');
            if (costEl && cost) {
                costEl.textContent = Object.entries(cost)
                    .map(([res, amt]) => {
                        const name = (typeof RESOURCES !== 'undefined' && RESOURCES[res])
                            ? RESOURCES[res].name.toUpperCase()
                            : res.toUpperCase();
                        return `${formatNumber(amt)} ${name}`;
                    })
                    .join(' + ');
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
