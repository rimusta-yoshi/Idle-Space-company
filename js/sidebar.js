// Sidebar UI Manager
// Handles updating the left and right sidebars

class SidebarManager {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.initialize();
    }

    initialize() {
        log('SidebarManager initialized');
    }

    // Update left sidebar with current resources
    updateResources() {
        // Update resource amounts
        Object.entries(this.resourceManager.resources).forEach(([type, data]) => {
            const amountElement = document.getElementById(`${type}-amount`);
            if (amountElement) {
                amountElement.textContent = formatNumber(data.current);
            }

            // Update production rates
            const rateElement = document.getElementById(`${type}-rate`);
            if (rateElement) {
                const sign = data.production >= 0 ? '+' : '';
                rateElement.textContent = sign + formatRate(data.production);
            }
        });
    }

    // Update building palette (enable/disable based on affordability)
    updateBuildingPalette(buildingCounts) {
        const buildingItems = document.querySelectorAll('.building-item');

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
        const buildingItems = document.querySelectorAll('.building-item');

        buildingItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const buildingType = item.getAttribute('data-building');
                e.dataTransfer.setData('buildingType', buildingType);
                e.dataTransfer.effectAllowed = 'copy';
                log(`Drag started: ${buildingType}`);
            });
        });

        // Setup drop zone (canvas container)
        const canvasContainer = document.getElementById('canvas-container');

        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();

            const buildingType = e.dataTransfer.getData('buildingType');
            if (!buildingType) return;

            // Get drop position relative to canvas
            const rect = canvasContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            log(`Building dropped: ${buildingType} at (${x}, ${y})`);

            // Call callback
            if (onBuildingDropped) {
                onBuildingDropped(buildingType, x, y);
            }
        });
    }

    // Setup save button
    setupSaveButton(onSave) {
        const saveButton = document.getElementById('save-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                log('Save button clicked');
                if (onSave) {
                    onSave();
                }
            });
        }
    }
}
