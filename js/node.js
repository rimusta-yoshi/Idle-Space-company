// Factory Node
// Represents a building placed on the canvas

const MIN_NODE_W = 150;  // Minimum node width — actual width hugs content
const HEADER_H = 32;
const ROW_H = 22;
const PAD_B = 8;
const MS_ICON_W = 22;    // Horizontal space reserved for a Material Symbol icon

function getResourceLabel(key) {
    const def = RESOURCES[key];
    return def ? def.name.toUpperCase() : key.toUpperCase();
}

class FactoryNode {
    constructor(buildingType, x, y) {
        this.id = generateId();
        this.buildingType = buildingType;
        this.buildingDef = getBuildingDef(buildingType);

        if (!this.buildingDef) {
            throw new Error(`Building type ${buildingType} not found`);
        }

        this.x = x;
        this.y = y;
        this.level = 1;
        this.inputs = [];
        this.outputs = [];
        this.stalled = false;
        this.efficiency = 1.0;         // Derived each tick — fraction of max capacity (0–1)
        this.powerThrottled = false;   // Derived each tick — true when power grid deficit is the throttle cause
        this.actualOutputRate = {};    // Derived each tick — {resource: rate/s}
        this.activeRecipe = null;      // Derived each tick — connections validate assignedRecipe
        this.assignedRecipe = null;    // Persisted user-set recipe for usesRecipes buildings
        this.autoSellResource = null;  // Derived each tick — resource being sold by autoSell buildings
        this.isDraggingConnection = false;
        this.nodeWidth = MIN_NODE_W;   // Calculated dynamically in buildIOShapes

        // Konva shapes
        this.group = null;
        this.rect = null;
        this.headerBg = null;
        this.headerIcon = null;  // Material Symbol icon (transition_push)
        this.headerName = null;  // Output resource name
        this.headerRate = null;  // "60/MIN" right-aligned
        this.divider = null;
        this.ioShapes = [];
        this.outputPort = null;
        this.inputPort = null;

        this.createKonvaShapes();
    }

    // Returns the primary output info for the header
    getNodeTitle() {
        const def = this.buildingDef;

        if (def.autoSell) {
            const resDef = RESOURCES[this.autoSellResource];
            const sellRate = resDef ? resDef.sellPrice * 0.70 : null;
            return { icon: 'paid', name: 'CREDITS', ratePerSec: sellRate };
        }

        if (def.usesRecipes) {
            const recipe = this.activeRecipe || this.assignedRecipe;
            if (recipe) {
                const [resKey, rate] = Object.entries(recipe.outputs)[0];
                const resDef = RESOURCES[resKey];
                return {
                    icon: resDef?.icon || '',
                    name: resDef?.name.toUpperCase() || resKey.toUpperCase(),
                    ratePerSec: rate
                };
            }
            return { icon: def.icon, name: 'SET RECIPE', ratePerSec: null };
        }

        const outputs = Object.entries(def.production || {});
        if (outputs.length > 0) {
            const [resKey, rate] = outputs[0];
            const resDef = RESOURCES[resKey];
            return {
                icon: resDef?.icon || def.icon || '',
                name: resDef?.name.toUpperCase() || resKey.toUpperCase(),
                ratePerSec: rate
            };
        }

        return { icon: def.icon, name: def.name.toUpperCase(), ratePerSec: null };
    }

    calcHeight() {
        const def = this.buildingDef;
        let inputRows;

        if (def.autoSell) {
            inputRows = this.autoSellResource ? 1 : 0;
        } else if (def.usesRecipes) {
            const recipe = this.activeRecipe || this.assignedRecipe;
            inputRows = recipe ? Object.keys(recipe.inputs).length : 0;
        } else {
            inputRows = Object.keys(def.consumption || {}).length;
        }

        // No body section for buildings with no inputs (extractors)
        const bodyHeight = inputRows > 0 ? 1 + inputRows * ROW_H : 0;
        return HEADER_H + bodyHeight + PAD_B;
    }

    calcWidth() {
        const title = this.getNodeTitle();
        const maxRateStr = title.ratePerSec ? formatRatePerMin(title.ratePerSec * this.level) : '—';
        // Reserve space for worst-case throttled format "actual/max" — both sides roughly equal width
        const rateStr = title.ratePerSec ? `${maxRateStr}/${maxRateStr}` : '—';

        // Header: [8px pad] [MS icon 22px] [name VT323 15px] ... [rate VT323 15px] [8px pad]
        const nameW = measureTextWidth(title.name, 15, 'VT323');
        const rateW = measureTextWidth(rateStr, 15, 'VT323');
        const headerW = 8 + MS_ICON_W + nameW + 14 + rateW + 10;

        // Input rows: [8px pad] [MS icon 22px] [label VT323 13px] [8px pad]
        const def = this.buildingDef;
        const recipe = this.activeRecipe || this.assignedRecipe;
        const inputs = recipe ? recipe.inputs : (def.usesRecipes ? {} : (def.consumption || {}));

        let maxRowW = 0;
        Object.entries(inputs).forEach(([resKey, resRate]) => {
            const resDef = RESOURCES[resKey];
            const label = resDef?.name.toUpperCase() || resKey.toUpperCase();
            const rowText = `${label}  |  ${formatRatePerMin(resRate * this.level)}`;
            const rowW = 8 + MS_ICON_W + measureTextWidth(rowText, 13, 'VT323') + 10;
            maxRowW = Math.max(maxRowW, rowW);
        });

        return Math.max(MIN_NODE_W, Math.ceil(Math.max(headerW, maxRowW)));
    }

    // Returns the output resource colour for tier stripe and status accents
    _getOutputColor() {
        const def = this.buildingDef;

        if (def.autoSell) {
            return RESOURCES['credits']?.color || '#e8c840';
        }

        const recipe = this.activeRecipe || this.assignedRecipe;

        if (def.usesRecipes) {
            if (!recipe) return '#2a2010';
            const outputKey = Object.keys(recipe.outputs)[0];
            return RESOURCES[outputKey]?.color || '#d4a832';
        }

        const outputKey = Object.keys(def.production || {})[0];
        return outputKey ? (RESOURCES[outputKey]?.color || '#d4a832') : '#d4a832';
    }

    createKonvaShapes() {
        const def = this.buildingDef;
        this.nodeWidth = this.calcWidth();
        const h = this.calcHeight();
        const w = this.nodeWidth;

        this.group = new Konva.Group({
            x: this.x,
            y: this.y,
            draggable: true,
            id: this.id
        });
        this.group.nodeRef = this;

        // Background
        this.rect = new Konva.Rect({
            x: 0, y: 0,
            width: w, height: h,
            fill: def.color,
            stroke: '#d4a832',
            strokeWidth: 1.5,
            cornerRadius: 4
        });

        // Left tier stripe — coloured by output resource
        this.tierStripe = new Konva.Rect({
            x: 0, y: 0,
            width: 3, height: h,
            fill: this._getOutputColor(),
            cornerRadius: [4, 0, 0, 4]
        });

        // Header background — dark overlay for clear separation
        this.headerBg = new Konva.Rect({
            x: 0, y: 0,
            width: w, height: HEADER_H,
            fill: 'rgba(0, 0, 0, 0.22)',
            cornerRadius: [4, 4, 0, 0]
        });

        // Output direction indicator (Material Symbol)
        this.headerIcon = new Konva.Text({
            x: 8, y: 7,
            text: 'transition_push',
            fontSize: 16,
            fontFamily: 'Material Symbols Outlined',
            fill: '#c49a2a'
        });

        // Resource/building name — VT323 for the retro feel
        this.headerName = new Konva.Text({
            x: 8 + MS_ICON_W, y: 8,
            text: '',
            fontSize: 15,
            fontFamily: 'VT323, Courier New',
            fill: '#e8d5b0'
        });

        // Rate — right-aligned, positioned dynamically in buildIOShapes
        this.headerRate = new Konva.Text({
            x: w - 50, y: 8,
            text: '',
            fontSize: 15,
            fontFamily: 'VT323, Courier New',
            fill: '#c49a2a'
        });

        // Status pip — top-right corner, shows production state
        this.statusPip = new Konva.Circle({
            x: w - 9, y: HEADER_H / 2,
            radius: 4,
            fill: '#2a2010'
        });

        // Divider line between header and body
        this.divider = new Konva.Line({
            points: [0, HEADER_H, w, HEADER_H],
            stroke: '#2a1c08',
            strokeWidth: 1,
            visible: false
        });

        // Output port (right edge)
        this.outputPort = new Konva.Circle({
            x: w, y: h / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        // Input port (left edge)
        this.inputPort = new Konva.Circle({
            x: 0, y: h / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        this.group.add(
            this.rect, this.tierStripe, this.headerBg,
            this.headerIcon, this.headerName, this.headerRate,
            this.statusPip, this.divider,
            this.outputPort, this.inputPort
        );

        this.buildIOShapes();

        this.group.on('mouseenter', () => this.showPorts());
        this.group.on('mouseleave', () => this.hidePorts());

        this.group.on('dragmove', () => {
            this.x = this.group.x();
            this.y = this.group.y();
            document.dispatchEvent(new CustomEvent('nodeDragged', { detail: { nodeId: this.id } }));
        });
    }

    buildIOShapes() {
        this.ioShapes.forEach(s => s.destroy());
        this.ioShapes = [];

        const def = this.buildingDef;
        const title = this.getNodeTitle();
        const eff = this.efficiency ?? 1.0;
        const maxRate = title.ratePerSec ? title.ratePerSec * this.level : null;

        let rateStr;
        if (!maxRate) {
            rateStr = '—';
        } else if (eff >= 0.999) {
            // Full throughput — just show max
            rateStr = formatRatePerMin(maxRate);
        } else if (eff < 0.01) {
            // Stalled — no output
            rateStr = '—';
        } else {
            // Throttled — show actual/max so cause is immediately visible
            const actualRate = maxRate * eff;
            rateStr = `${formatRatePerMin(actualRate)}/${formatRatePerMin(maxRate)}`;
        }

        // Recalculate dimensions
        const w = this.calcWidth();
        const h = this.calcHeight();
        this.nodeWidth = w;

        // Update header texts and icon
        this.headerIcon.text(title.icon || 'category');
        this.headerName.text(title.name);
        this.headerRate.text(rateStr);

        // Right-align the rate (leave gap for status pip)
        const rateW = measureTextWidth(rateStr, 15, 'VT323');
        this.headerRate.x(w - rateW - 18);

        let y = HEADER_H + 4;
        let hasInputRows = false;

        const addInputRow = (resourceKey, ratePerSec) => {
            hasInputRows = true;
            const resDef = RESOURCES[resourceKey];
            const label = resDef?.name.toUpperCase() || resourceKey.toUpperCase();
            const totalRate = ratePerSec * this.level;

            // MS icon for the input resource
            const rowIcon = new Konva.Text({
                x: 8, y: y + 2,
                text: resDef?.icon || 'output',
                fontSize: 14,
                fontFamily: 'Material Symbols Outlined',
                fill: '#8a6b1a'
            });

            const rowLabel = new Konva.Text({
                x: 8 + MS_ICON_W, y: y + 1,
                text: `${label}  |  ${formatRatePerMin(totalRate)}`,
                fontSize: 13,
                fontFamily: 'VT323, Courier New',
                fill: '#9a8b72'
            });

            this.ioShapes.push(rowIcon, rowLabel);
            this.group.add(rowIcon, rowLabel);
            y += ROW_H;
        };

        if (def.autoSell) {
            if (this.autoSellResource) {
                addInputRow(this.autoSellResource, 1.0);
            }
        } else if (def.usesRecipes) {
            const recipe = this.activeRecipe || this.assignedRecipe;
            if (recipe) {
                Object.entries(recipe.inputs).forEach(([res, rate]) => addInputRow(res, rate));
            }
            // No recipe: compact header-only node — user selects via action bar RECIPE button
        } else {
            Object.entries(def.consumption || {}).forEach(([res, rate]) => addInputRow(res, rate));
        }

        this.divider.visible(hasInputRows);

        // Resize all width-dependent shapes
        this.rect.width(w);
        this.rect.height(h);
        this.headerBg.width(w);
        this.divider.points([0, HEADER_H, w, HEADER_H]);
        this.outputPort.x(w);
        this.outputPort.y(h / 2);
        this.inputPort.y(h / 2);
        this.tierStripe.height(h);
        this.tierStripe.fill(this._getOutputColor());
        this.statusPip.x(w - 9);

        this.group.getLayer()?.batchDraw();
    }

    showPorts() {
        this.outputPort.visible(true);
        this.inputPort.visible(true);
        this.group.getLayer()?.batchDraw();
    }

    hidePorts() {
        if (this.isDraggingConnection) return;
        this.outputPort.visible(false);
        this.inputPort.visible(false);
        this.group.getLayer()?.batchDraw();
    }

    updateDisplay() {
        this.buildIOShapes();

        const def = this.buildingDef;

        const eff = this.efficiency ?? 1.0;

        if (eff < 0.01) {
            // No throughput — missing connections, no recipe, or zero supply
            this.rect.fill('#1a0808');
            this.rect.stroke('#663030');
            this.rect.strokeWidth(1.5);
            this.headerName.fill('#cc3333');
            this.statusPip.fill('#cc3333');
        } else if (def.usesRecipes && !this.activeRecipe) {
            // Recipe assigned but connections not established — waiting
            this.rect.fill(def.color);
            this.rect.stroke('#c49a2a');
            this.rect.strokeWidth(1.5);
            this.headerName.fill('#e8d5b0');
            this.statusPip.fill(this.assignedRecipe ? '#c49a2a' : '#2a2010');
        } else if (eff < 0.999) {
            this.rect.fill(def.color);
            this.headerName.fill('#e8d5b0');
            if (this.powerThrottled) {
                // Power grid deficit — red border, red-amber pip
                this.rect.stroke('#993322');
                this.rect.strokeWidth(2);
                this.statusPip.fill('#cc4422');
            } else {
                // Supply-constrained — amber border, amber pip
                this.rect.stroke('#a07818');
                this.rect.strokeWidth(1.5);
                this.statusPip.fill('#c8a020');
            }
        } else {
            // Full throughput
            this.rect.fill(def.color);
            this.rect.stroke('#c49a2a');
            this.rect.strokeWidth(1.5);
            this.headerName.fill('#e8d5b0');
            this.statusPip.fill('#4a8a4a'); // green
        }
    }

    setRecipe(recipe) {
        this.assignedRecipe = recipe;
        document.dispatchEvent(new CustomEvent('recipeChanged', { detail: { nodeId: this.id } }));
        this.updateDisplay();
    }

    upgradeLevel() {
        this.level++;
        this.updateDisplay();
    }

    getCenterX() {
        return this.x + this.nodeWidth / 2;
    }

    getCenterY() {
        return this.y + this.calcHeight() / 2;
    }

    addToLayer(layer) {
        layer.add(this.group);
    }

    removeFromLayer() {
        if (this.group) {
            this.group.destroy();
        }
    }

    getSaveData() {
        return {
            id: this.id,
            buildingType: this.buildingType,
            x: this.x,
            y: this.y,
            level: this.level,
            inputs: this.inputs,
            outputs: this.outputs,
            assignedRecipeId: this.assignedRecipe ? this.assignedRecipe.id : null
        };
    }

    static loadFromSaveData(data) {
        const node = new FactoryNode(data.buildingType, data.x, data.y);
        node.id = data.id;
        node.level = data.level || 1;
        node.inputs = data.inputs || [];
        node.outputs = data.outputs || [];

        if (data.assignedRecipeId) {
            const recipes = getRecipesForBuilding(data.buildingType);
            node.assignedRecipe = recipes.find(r => r.id === data.assignedRecipeId) || null;
        }

        if (!node.buildingDef) {
            throw new Error(`Failed to load buildingDef for ${data.buildingType}`);
        }

        log(`Loaded node: ${node.buildingDef.name} (${node.id}) at (${node.x}, ${node.y})`);
        return node;
    }
}
