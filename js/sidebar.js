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

    // Build a palette card element for an extractor (no recipe — directly produces a resource)
    _makeExtractorCard(building) {
        const outputKey = Object.keys(building.production)[0];
        const ratePerSec = building.production[outputKey];
        const resDef = RESOURCES[outputKey];

        const icon = resDef?.icon || building.icon;
        const name = resDef?.name.toUpperCase() || outputKey.toUpperCase();
        const rate = formatRatePerMin(ratePerSec);

        const card = document.createElement('div');
        card.className = 'palette-card';
        card.draggable = true;
        card.setAttribute('data-building', building.id);
        card.setAttribute('data-search-name', name);

        card.innerHTML = `
            <div class="palette-card-header">
                <span class="palette-card-name">→ ${icon} ${name}</span>
                <span class="palette-card-rate">${rate}</span>
            </div>`;

        return card;
    }

    // Build a palette card element for a recipe-based building
    _makeRecipeCard(building, recipe) {
        const outputKey = Object.keys(recipe.outputs)[0];
        const outputRate = recipe.outputs[outputKey];
        const resDef = RESOURCES[outputKey];

        const icon = resDef?.icon || building.icon;
        const name = resDef?.name.toUpperCase() || outputKey.toUpperCase();
        const rate = formatRatePerMin(outputRate);

        const inputsHtml = Object.entries(recipe.inputs).map(([resKey, resRate]) => {
            const inputDef = RESOURCES[resKey];
            const inputIcon = inputDef?.icon || '';
            const inputName = inputDef?.name.toUpperCase() || resKey.toUpperCase();
            return `<div class="palette-input-row">${inputIcon} ${inputName}  |  ${formatRatePerMin(resRate)}</div>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'palette-card';
        card.draggable = true;
        card.setAttribute('data-building', building.id);
        card.setAttribute('data-recipe', recipe.id);
        card.setAttribute('data-search-name', name);

        card.innerHTML = `
            <div class="palette-card-header">
                <span class="palette-card-name">→ ${icon} ${name}</span>
                <span class="palette-card-rate">${rate}</span>
            </div>
            <div class="palette-card-inputs">${inputsHtml}</div>`;

        return card;
    }

    // Build a single generic card for buildings like Export Terminal
    // that accept any connected resource (no per-recipe split needed in palette)
    _makeSingleCard(building) {
        const card = document.createElement('div');
        card.className = 'palette-card';
        card.draggable = true;
        card.setAttribute('data-building', building.id);
        card.setAttribute('data-search-name', building.name.toUpperCase());

        card.innerHTML = `
            <div class="palette-card-header">
                <span class="palette-card-name">→ ${building.icon} ${building.name.toUpperCase()}</span>
                <span class="palette-card-rate">AUTO</span>
            </div>
            <div class="palette-card-inputs">
                <div class="palette-input-row">connects any resource</div>
            </div>`;

        return card;
    }

    populateBuildingPalette() {
        const container = this.rootElement.querySelector('#building-list');
        if (!container) return;

        container.innerHTML = '';

        Object.values(BUILDINGS).forEach(building => {
            if (!building.unlocked) return;

            if (building.singlePaletteCard) {
                container.appendChild(this._makeSingleCard(building));
            } else if (building.usesRecipes) {
                const recipes = getRecipesForBuilding(building.id);
                recipes.forEach(recipe => {
                    container.appendChild(this._makeRecipeCard(building, recipe));
                });
            } else if (Object.keys(building.production || {}).length > 0) {
                container.appendChild(this._makeExtractorCard(building));
            }
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

    // Update left sidebar with current resources
    updateResources() {
        Object.entries(this.resourceManager.resources).forEach(([type, data]) => {
            const amountEl = this.rootElement.querySelector(`#${type}-amount`);
            if (amountEl) amountEl.textContent = formatNumber(data.current);

            const capacityEl = this.rootElement.querySelector(`#${type}-capacity`);
            if (capacityEl) {
                capacityEl.textContent = data.capacity === Infinity ? '' : ' / ' + formatNumber(data.capacity);
            }

            const rateEl = this.rootElement.querySelector(`#${type}-rate`);
            if (rateEl) {
                const sign = data.production >= 0 ? '+' : '';
                rateEl.textContent = sign + formatRate(data.production);
            }
        });
    }

    // Enable/disable cards based on affordability
    updateBuildingPalette(buildingCounts) {
        const cards = this.rootElement.querySelectorAll('.palette-card');

        cards.forEach(card => {
            const buildingType = card.getAttribute('data-building');
            const count = buildingCounts[buildingType] || 0;
            const cost = calculateBuildingCost(buildingType, count);
            const canAfford = this.resourceManager.canAfford(cost);

            card.style.opacity = canAfford ? '1' : '0.4';
            card.style.cursor = canAfford ? 'grab' : 'not-allowed';
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
            const recipeId = card.getAttribute('data-recipe') || '';
            e.dataTransfer.setData('buildingType', buildingType);
            e.dataTransfer.setData('recipeId', recipeId);
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

            const recipeId = e.dataTransfer.getData('recipeId') || null;
            const rect = canvasContainer.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            if (onBuildingDropped) {
                onBuildingDropped(buildingType, screenX, screenY, recipeId);
            }
        });
    }
}
