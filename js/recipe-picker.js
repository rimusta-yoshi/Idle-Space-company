// Recipe Picker
// HTML overlay for selecting a recipe for a recipe-capable building

class RecipePicker {
    constructor(rootElement = document) {
        this.rootElement = rootElement;
        this._currentNode = null;
        this._overlay = null;
        this._list = null;
        this._createDOM();
    }

    _createDOM() {
        const overlay = document.createElement('div');
        overlay.className = 'recipe-picker-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="recipe-picker">
                <div class="recipe-picker-header">
                    <span class="recipe-picker-title">SELECT RECIPE</span>
                    <button class="recipe-picker-close">✕</button>
                </div>
                <div class="recipe-picker-list"></div>
            </div>
        `;

        overlay.querySelector('.recipe-picker-close').addEventListener('click', () => this.close());

        // Click backdrop to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && overlay.style.display !== 'none') this.close();
        });

        this.rootElement.appendChild(overlay);
        this._overlay = overlay;
        this._list = overlay.querySelector('.recipe-picker-list');
    }

    open(node) {
        this._currentNode = node;
        const recipes = getRecipesForBuilding(node.buildingType);

        this._list.innerHTML = '';

        recipes.forEach(recipe => {
            const [outputKey, outputRate] = Object.entries(recipe.outputs)[0];
            const resDef = RESOURCES[outputKey];
            const icon = resDef?.icon || 'circle';
            const name = resDef?.name.toUpperCase() || outputKey.toUpperCase();
            const rate = formatRatePerMin(outputRate);

            const inputsHtml = Object.entries(recipe.inputs).map(([resKey, resRate]) => {
                const inputDef = RESOURCES[resKey];
                const inputIcon = inputDef?.icon || 'circle';
                const inputName = inputDef?.name.toUpperCase() || resKey.toUpperCase();
                return `<div class="recipe-picker-input"><span class="material-symbols-outlined picker-icon">${inputIcon}</span>${inputName}  ·  ${formatRatePerMin(resRate)}</div>`;
            }).join('');

            const isActive = node.assignedRecipe?.id === recipe.id;

            const item = document.createElement('div');
            item.className = `recipe-picker-item${isActive ? ' active' : ''}`;
            item.innerHTML = `
                <div class="recipe-picker-output">
                    <span class="recipe-picker-output-name"><span class="material-symbols-outlined picker-icon">${icon}</span>${name}</span>
                    <span class="recipe-picker-output-rate">${rate}</span>
                </div>
                ${inputsHtml}
            `;

            item.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('recipeSelected', {
                    detail: { nodeId: node.id, recipeId: recipe.id }
                }));
                this.close();
            });

            this._list.appendChild(item);
        });

        this._overlay.style.display = 'flex';
    }

    close() {
        this._overlay.style.display = 'none';
        this._currentNode = null;
    }
}
