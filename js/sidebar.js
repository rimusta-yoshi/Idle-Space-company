// Sidebar UI Manager
// Handles updating the left and right sidebars

class SidebarManager {
    constructor(resourceManager, rootElement = document) {
        this.resourceManager = resourceManager;
        this.rootElement = rootElement;
        this.initialize();
    }

    initialize() {
        this.populateBuildingPalette();
        log('SidebarManager initialized');
    }

    // Populate building palette with all available buildings organized by category
    populateBuildingPalette() {
        const buildingListContainer = this.rootElement.querySelector('#building-list');
        if (!buildingListContainer) return;

        // Clear existing content
        buildingListContainer.innerHTML = '';

        // Iterate through categories
        Object.entries(BUILDING_CATEGORIES).forEach(([categoryId, category]) => {
            // Add category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = `${category.icon} ${category.name}`;
            categoryHeader.style.marginTop = '15px';
            categoryHeader.style.marginBottom = '10px';
            buildingListContainer.appendChild(categoryHeader);

            // Get buildings in this category
            const buildings = getBuildingsByCategory(categoryId);

            // Add building items
            buildings.forEach(building => {
                const buildingItem = document.createElement('div');
                buildingItem.className = 'building-item';
                buildingItem.draggable = true;
                buildingItem.setAttribute('data-building', building.id);

                const buildingName = document.createElement('div');
                buildingName.className = 'building-name';
                buildingName.textContent = `${building.icon} ${building.name}`;

                const buildingCost = document.createElement('div');
                buildingCost.className = 'building-cost';
                const costText = Object.entries(building.baseCost)
                    .map(([resource, amount]) => `${amount} ${resource}`)
                    .join(', ');
                buildingCost.textContent = `Cost: ${costText}`;

                const buildingDesc = document.createElement('div');
                buildingDesc.className = 'building-description';
                buildingDesc.textContent = building.description;

                buildingItem.appendChild(buildingName);
                buildingItem.appendChild(buildingCost);
                buildingItem.appendChild(buildingDesc);

                buildingListContainer.appendChild(buildingItem);
            });
        });
    }

    // Update left sidebar with current resources
    updateResources() {
        // Update resource amounts
        Object.entries(this.resourceManager.resources).forEach(([type, data]) => {
            const amountElement = this.rootElement.querySelector(`#${type}-amount`);
            if (amountElement) {
                amountElement.textContent = formatNumber(data.current);
            }

            // Update capacity display (if it exists)
            const capacityElement = this.rootElement.querySelector(`#${type}-capacity`);
            if (capacityElement) {
                if (data.capacity === Infinity) {
                    capacityElement.textContent = ''; // Hide capacity for unlimited resources
                } else {
                    capacityElement.textContent = ' / ' + formatNumber(data.capacity);
                }
            }

            // Update production rates
            const rateElement = this.rootElement.querySelector(`#${type}-rate`);
            if (rateElement) {
                const sign = data.production >= 0 ? '+' : '';
                rateElement.textContent = sign + formatRate(data.production);
            }
        });
    }

    // Update building palette (enable/disable based on affordability)
    updateBuildingPalette(buildingCounts) {
        const buildingItems = this.rootElement.querySelectorAll('.building-item');

        buildingItems.forEach(item => {
            const buildingType = item.getAttribute('data-building');
            const count = buildingCounts[buildingType] || 0;
            const cost = calculateBuildingCost(buildingType, count);

            // Check if can afford
            const canAfford = this.resourceManager.canAfford(cost);

            // Update visual state
            if (!canAfford) {
                item.style.opacity = '0.5';
                item.style.cursor = 'not-allowed';
            } else {
                item.style.opacity = '1';
                item.style.cursor = 'grab';
            }

            // Update cost display
            const costElement = item.querySelector('.building-cost');
            if (costElement) {
                const costText = Object.entries(cost)
                    .map(([resource, amount]) => `${formatNumber(amount)} ${resource}`)
                    .join(', ');
                costElement.textContent = `Cost: ${costText}`;
            }
        });
    }

    // Setup drag-and-drop for building palette
    setupDragAndDrop(onBuildingDropped) {
        // Re-query building items (they may have been dynamically added)
        const buildingItems = this.rootElement.querySelectorAll('.building-item');

        buildingItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const buildingType = item.getAttribute('data-building');
                e.dataTransfer.setData('buildingType', buildingType);
                e.dataTransfer.effectAllowed = 'copy';
                log(`Drag started: ${buildingType}`);
            });
        });

        // Setup drop zone (canvas container)
        const canvasContainer = this.rootElement.querySelector('#canvas-container');

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();

            const buildingType = e.dataTransfer.getData('buildingType');
            if (!buildingType) return;

            // Get drop position relative to canvas container
            const rect = canvasContainer.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            log(`Building dropped: ${buildingType} at screen (${screenX}, ${screenY})`);

            // Call callback with screen coordinates
            // Game will convert to world coordinates using canvas.screenToWorld()
            if (onBuildingDropped) {
                onBuildingDropped(buildingType, screenX, screenY);
            }
        });
    }
}
