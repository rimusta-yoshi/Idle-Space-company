// Factory Node
// Represents a building placed on the canvas

const MIN_NODE_W = 150;  // Minimum node width — actual width hugs content
const HEADER_H = 40;
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
        this.standby = false;          // Derived each tick — true when partially connected (has connections but can't produce)
        this.actualOutputRate = {};    // Derived each tick — {resource: rate/s}

        // Storage node fields (isStorage buildings only)
        this.inventory = 0;
        this.inventoryCapacity = (this.buildingDef.isStorage ? (this.buildingDef.baseCapacity || 500) : 0);
        this.storedResourceType = null;
        this.activeRecipe = null;      // Derived each tick — connections validate assignedRecipe
        this.assignedRecipe = null;    // Persisted user-set recipe for usesRecipes buildings
        this.autoSellResource = null;  // Derived each tick — resource being sold by autoSell buildings
        this.isStarterKit = false;     // True when placed using a free franchise claim
        this.isDraggingConnection = false;
        this.nodeWidth = MIN_NODE_W;   // Calculated dynamically in buildIOShapes

        // Konva shapes
        this.group = null;
        this.rect = null;
        this.bodyRect = null;
        this.headerTint = null;
        this.categoryMark = null;
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

        if (def.isStorage) {
            if (this.storedResourceType) {
                const resDef = RESOURCES[this.storedResourceType];
                return {
                    icon: resDef?.icon || 'inventory_2',
                    name: resDef?.name.toUpperCase() || this.storedResourceType.toUpperCase(),
                    ratePerSec: null
                };
            }
            return { icon: 'inventory_2', name: 'EMPTY', ratePerSec: null };
        }

        if (def.isSplitter) {
            const outputEntries = Object.entries(this.actualOutputRate || {});
            if (outputEntries.length > 0) {
                const [resKey, rate] = outputEntries[0];
                const resDef = RESOURCES[resKey];
                const numOutputs = Math.max(1, this.outputs.length);
                return {
                    icon: def.icon,
                    name: resDef?.name.toUpperCase() || resKey.toUpperCase(),
                    ratePerSec: rate / this.level / numOutputs  // per-output rate; buildIOShapes re-applies level
                };
            }
            return { icon: def.icon, name: 'SPLITTER', ratePerSec: null };
        }

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
            return { icon: def.icon, name: 'NO RECIPE', ratePerSec: null };
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

        if (def.isStorage) {
            return HEADER_H + 32 + PAD_B; // fill bar (8) + gap (4) + amount text (14) + padding
        }

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

        // Extra row for "← CONNECT INPUT" hint when recipe is set but nothing connected
        const showHint = def.usesRecipes && this.assignedRecipe && this.inputs.length === 0;
        const hintH = showHint ? ROW_H : 0;

        return HEADER_H + bodyHeight + PAD_B + hintH;
    }

    calcWidth() {
        const def = this.buildingDef;
        const title = this.getNodeTitle();

        if (def.isStorage) {
            // Storage nodes: fixed width based on name only — no rate column
            const nameW = measureTextWidth(title.name, 15, 'VT323');
            return Math.max(MIN_NODE_W, Math.ceil(8 + MS_ICON_W + nameW + 30));
        }

        const widthMult = def.levelMultipliers ? (def.levelMultipliers[this.level - 1] ?? 1.0) : this.level;
        const maxRateStr = title.ratePerSec ? formatRatePerMin(title.ratePerSec * widthMult) : '—';
        // Reserve space for worst-case throttled format "actual/max" — both sides roughly equal width
        const rateStr = title.ratePerSec ? `${maxRateStr}/${maxRateStr}` : '—';

        // Header: [8px pad] [MS icon 22px] [name VT323 15px] ... [rate VT323 15px] [8px pad]
        const nameW = measureTextWidth(title.name, 15, 'VT323');
        const rateW = measureTextWidth(rateStr, 15, 'VT323');
        const headerW = 8 + MS_ICON_W + nameW + 14 + rateW + 10;

        // Input rows: [8px pad] [MS icon 22px] [label VT323 13px] [8px pad]
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

        if (def.isStorage && this.storedResourceType) {
            return RESOURCES[this.storedResourceType]?.color || '#d4a832';
        }

        if (def.isSplitter) {
            const outputKeys = Object.keys(this.actualOutputRate || {});
            if (outputKeys.length > 0) {
                return RESOURCES[outputKeys[0]]?.color || '#d4a832';
            }
            return '#2a2010';
        }

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
        const categoryColor = getCategoryColor(def.category);

        this.group = new Konva.Group({
            x: this.x,
            y: this.y,
            draggable: true,
            id: this.id
        });
        this.group.nodeRef = this;

        // Header zone background (nameplate)
        this.rect = new Konva.Rect({
            x: 0, y: 0,
            width: w, height: h,
            fill: '#181509',
            stroke: categoryColor,
            strokeWidth: 1.5,
            cornerRadius: 4
        });

        // Category tint overlay — subtle color wash over header zone
        this.headerTint = new Konva.Rect({
            x: 0, y: 0,
            width: w, height: HEADER_H,
            fill: categoryColor,
            opacity: 0.06,
            cornerRadius: [4, 4, 0, 0],
            listening: false
        });

        // Category accent mark — top-right classification stamp
        this.categoryMark = new Konva.Rect({
            x: w - 12, y: 4,
            width: 8, height: 8,
            fill: categoryColor,
            opacity: 0.7,
            cornerRadius: 1,
            listening: false
        });

        // Body zone background (readout panel)
        this.bodyRect = new Konva.Rect({
            x: 0, y: HEADER_H,
            width: w, height: h - HEADER_H,
            fill: '#0b0e09',
            cornerRadius: [0, 0, 4, 4]
        });

        // Left tier stripe — coloured by output resource
        this.tierStripe = new Konva.Rect({
            x: 0, y: 0,
            width: 4, height: h,
            fill: this._getOutputColor(),
            cornerRadius: [4, 0, 0, 4]
        });

        // Building type sub-label — small dim text at top of header (row 1)
        this.buildingSubLabel = new Konva.Text({
            x: 8, y: 4,
            text: def.name.toUpperCase(),
            fontSize: 10,
            fontFamily: 'VT323, Courier New',
            fill: categoryColor,
            opacity: 0.4,
            listening: false
        });

        // Output direction indicator (Material Symbol) — row 2
        this.headerIcon = new Konva.Text({
            x: 8, y: 22,
            text: 'transition_push',
            fontSize: 15,
            fontFamily: 'Material Symbols Outlined',
            fill: '#c49a2a'
        });

        // Resource/building name — VT323 for the retro feel, row 2
        this.headerName = new Konva.Text({
            x: 8 + MS_ICON_W, y: 23,
            text: '',
            fontSize: 15,
            fontFamily: 'VT323, Courier New',
            fill: '#e8d5b0'
        });

        // Rate — right-aligned, positioned dynamically in buildIOShapes, row 2
        this.headerRate = new Konva.Text({
            x: w - 50, y: 23,
            text: '',
            fontSize: 15,
            fontFamily: 'VT323, Courier New',
            fill: '#c49a2a'
        });

        // Status pip — right side of row 2 (LED indicator)
        this.statusPip = new Konva.Circle({
            x: w - 9, y: Math.round(HEADER_H * 3 / 4),
            radius: 5,
            fill: '#2a2010',
            shadowColor: '#ffffff',
            shadowBlur: 6,
            shadowOpacity: 0.4,
            shadowEnabled: false
        });

        // "← CONNECT INPUT" hint — shown inside body when recipe set but no inputs connected
        this.connectInputHint = new Konva.Text({
            x: 8, y: 0,
            text: '\u2190 CONNECT INPUT',
            fontSize: 10,
            fontFamily: 'VT323, Courier New',
            fill: '#4a6a5a',
            listening: false,
            visible: false
        });

        // Divider line between header and body
        this.divider = new Konva.Line({
            points: [0, HEADER_H, w, HEADER_H],
            stroke: '#2a1c08',
            strokeWidth: 1,
            visible: false
        });

        // Waveform — live oscilloscope line in body zone
        this.waveformLine = new Konva.Line({
            points: [],
            stroke: '#c49a2a',
            strokeWidth: 1,
            opacity: 0.22,
            listening: false,
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
            this.rect, this.headerTint, this.categoryMark, this.bodyRect, this.tierStripe,
            this.buildingSubLabel, this.headerIcon, this.headerName, this.headerRate,
            this.statusPip, this.divider,
            this.waveformLine,
            this.connectInputHint,
            this.outputPort, this.inputPort
        );

        this.buildIOShapes();

        this.group.on('mouseenter', () => this.showPorts());
        this.group.on('mouseleave', () => this.hidePorts());

        // Output port hover ring — scale up and brighten when hoverable
        this.outputPort.on('mouseenter', () => {
            this.outputPort.scale({ x: 1.3, y: 1.3 });
            this.outputPort.fill('#c49a2a');
            this.group.getLayer()?.batchDraw();
        });
        this.outputPort.on('mouseleave', () => {
            this.outputPort.scale({ x: 1, y: 1 });
            this.outputPort.fill('#07060a');
            this.group.getLayer()?.batchDraw();
        });

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
        const ioDef = this.buildingDef;
        const ioMult = ioDef.levelMultipliers ? (ioDef.levelMultipliers[this.level - 1] ?? 1.0) : this.level;
        const maxRate = title.ratePerSec ? title.ratePerSec * ioMult : null;

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

        // ── Storage node body: fill bar + amount text ──────────────────────
        if (def.isStorage) {
            const cap = this.inventoryCapacity || 1;
            const pct = Math.min(1, this.inventory / cap);
            const barInnerW = w - 20;
            const barY = HEADER_H + 6;

            const barBg = new Konva.Rect({
                x: 10, y: barY,
                width: barInnerW, height: 8,
                fill: '#111820', cornerRadius: 2, listening: false
            });
            const fillColor = pct > 0.9 ? '#cc4422' : pct > 0.05 ? '#4a8a4a' : '#2a3040';
            const barFill = new Konva.Rect({
                x: 10, y: barY,
                width: Math.max(0, barInnerW * pct), height: 8,
                fill: fillColor, cornerRadius: 2, listening: false
            });
            const amtText = new Konva.Text({
                x: 10, y: barY + 12,
                text: this.storedResourceType
                    ? `${formatNumber(this.inventory)} / ${formatNumber(cap)}`
                    : 'NO CONNECTION',
                fontSize: 12, fontFamily: 'VT323, Courier New',
                fill: '#9a8b72', width: barInnerW, listening: false
            });

            this.ioShapes.push(barBg, barFill, amtText);
            this.group.add(barBg, barFill, amtText);
        }

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

        if (def.isStorage) {
            // No input rows — body is the fill bar added above
        } else if (def.autoSell) {
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

        // "← CONNECT INPUT" hint — appears when recipe is chosen but no inputs wired yet
        const showHint = def.usesRecipes && this.assignedRecipe && this.inputs.length === 0;
        if (showHint) {
            const hintText = '\u2190 CONNECT INPUT';
            const hintW = measureTextWidth(hintText, 10, 'VT323');
            this.connectInputHint.x(Math.max(8, Math.floor((w - hintW) / 2)));
            this.connectInputHint.y(h - PAD_B - 10);
            this.connectInputHint.visible(true);
        } else {
            this.connectInputHint.visible(false);
        }

        // Resize all width-dependent shapes
        this.rect.width(w);
        this.rect.height(h);
        this.headerTint.width(w);
        this.categoryMark.x(w - 12);
        this.bodyRect.width(w);
        this.bodyRect.height(h - HEADER_H);
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
        if (this.buildingDef.noConnections) return;
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

        // Waveform — body-zone oscilloscope (skipped for storage which has its own fill bar)
        if (!def.isStorage) {
            const wh = this.calcHeight();
            const ww = this.nodeWidth;
            const bodyHeight = wh - HEADER_H - PAD_B;

            if (bodyHeight > 0) {
                const eff = this.efficiency || 0;
                const t = Date.now() / 800;
                const amplitude = eff * 7;
                const WAVE_X = 4;
                const WAVE_W = ww - 8;
                const WAVE_Y = HEADER_H + Math.floor(bodyHeight / 2);
                const steps = 24;
                const points = [];

                for (let i = 0; i <= steps; i++) {
                    points.push(
                        WAVE_X + (i / steps) * WAVE_W,
                        WAVE_Y + Math.sin(t + i * 0.55) * amplitude
                    );
                }

                this.waveformLine.points(points);
                const resColor = this._getOutputColor();
                if (eff >= 0.999) {
                    this.waveformLine.stroke(resColor);
                    this.waveformLine.opacity(0.28);
                } else if (eff >= 0.01) {
                    this.waveformLine.stroke(resColor);
                    this.waveformLine.opacity(0.15);
                } else {
                    this.waveformLine.stroke('#3a3a3a');
                    this.waveformLine.opacity(0.08);
                }
                this.waveformLine.visible(true);
            } else {
                this.waveformLine.visible(false);
            }
        }

        // Storage nodes: colour by fill level, no efficiency concept
        if (def.isStorage) {
            const pct = this.inventoryCapacity > 0 ? this.inventory / this.inventoryCapacity : 0;
            this.rect.fill('#181509');
            if (!this.storedResourceType) {
                this.statusPip.fill('#2a2010');
                this.statusPip.shadowEnabled(false);
            } else if (pct > 0.9) {
                this.statusPip.fill('#cc4422');
                this.statusPip.shadowColor('#cc3333');
                this.statusPip.shadowEnabled(true);
            } else if (pct > 0.05) {
                this.statusPip.fill('#4a8a4a');
                this.statusPip.shadowColor('#4a8a4a');
                this.statusPip.shadowEnabled(true);
            } else {
                this.statusPip.fill('#c8a020');
                this.statusPip.shadowColor('#c49a2a');
                this.statusPip.shadowEnabled(true);
            }
            this.headerName.fill('#e8d5b0');
            return;
        }

        if (this.standby) {
            // Standby: has connections but not fully connected — waiting for the missing link
            this.rect.fill('#181509');
            this.headerName.fill('#888880');
            this.statusPip.fill('#999999');
            this.statusPip.shadowEnabled(false);
            return;
        }

        // No recipe selected — display state, not error
        if (def.usesRecipes && !this.assignedRecipe) {
            this.rect.fill('#181509');
            this.headerName.fill('#4a8a5a');
            this.statusPip.fill('#2a2010');
            this.statusPip.shadowEnabled(false);
            return;
        }

        const eff = this.efficiency ?? 1.0;

        if (eff < 0.01) {
            // No throughput — missing connections or zero supply
            this.rect.fill('#1a0808');
            this.headerName.fill('#cc3333');
            this.statusPip.fill('#cc3333');
            this.statusPip.shadowColor('#cc3333');
            this.statusPip.shadowEnabled(true);
        } else if (def.usesRecipes && !this.activeRecipe) {
            // Recipe assigned but connections not established — waiting
            this.rect.fill('#181509');
            this.headerName.fill('#e8d5b0');
            this.statusPip.fill('#c49a2a');
            this.statusPip.shadowColor('#c49a2a');
            this.statusPip.shadowEnabled(true);
        } else if (eff < 0.999) {
            this.rect.fill('#181509');
            this.headerName.fill('#e8d5b0');
            if (this.powerThrottled) {
                // Power grid deficit — red-amber pip
                this.statusPip.fill('#cc4422');
                this.statusPip.shadowColor('#cc3333');
                this.statusPip.shadowEnabled(true);
            } else {
                // Supply-constrained — amber pip
                this.statusPip.fill('#c8a020');
                this.statusPip.shadowColor('#c49a2a');
                this.statusPip.shadowEnabled(true);
            }
        } else {
            // Full throughput
            this.rect.fill('#181509');
            this.headerName.fill('#e8d5b0');
            this.statusPip.fill('#4a8a4a');
            this.statusPip.shadowColor('#4a8a4a');
            this.statusPip.shadowEnabled(true);
        }
    }

    setRecipe(recipe) {
        this.assignedRecipe = recipe;
        if (window.gameInstance) window.gameInstance.graphDirty = true;
        document.dispatchEvent(new CustomEvent('recipeChanged', { detail: { nodeId: this.id } }));
        this.updateDisplay();
    }

    upgradeLevel() {
        this.level++;
        if (this.buildingDef.isStorage) {
            this.inventoryCapacity = (this.buildingDef.baseCapacity || 500) * this.level;
        }
        if (window.gameInstance) window.gameInstance.graphDirty = true;
        this.updateDisplay();
    }

    getCenterX() {
        return this.x + this.nodeWidth / 2;
    }

    getCenterY() {
        return this.y + this.calcHeight() / 2;
    }

    addToLayer(layer, animate = false) {
        layer.add(this.group);

        if (animate) {
            // Bar-extend: tierStripe draws left-to-right over 400ms
            this.tierStripe.width(0);
            this.tierStripe.to({ duration: 0.4, width: 4, easing: Konva.Easings.EaseOut });

            // Brief header glow flash
            this.headerTint.opacity(0.3);
            this.headerTint.to({
                duration: 0.5,
                opacity: 0.06,
                easing: Konva.Easings.EaseOut
            });
        }
    }

    removeFromLayer() {
        if (this.group) {
            this.group.destroy();
        }
    }

    getSaveData() {
        const data = {
            id: this.id,
            buildingType: this.buildingType,
            x: this.x,
            y: this.y,
            level: this.level,
            inputs: this.inputs,
            outputs: this.outputs,
            assignedRecipeId: this.assignedRecipe ? this.assignedRecipe.id : null,
            isStarterKit: this.isStarterKit || false
        };
        if (this.buildingDef.isStorage) {
            data.inventory = this.inventory;
            data.storedResourceType = this.storedResourceType;
        }
        return data;
    }

    static loadFromSaveData(data) {
        const node = new FactoryNode(data.buildingType, data.x, data.y);
        node.id = data.id;
        node.level = data.level || 1;
        node.inputs = data.inputs || [];
        node.outputs = data.outputs || [];
        node.isStarterKit = data.isStarterKit || false;

        if (data.assignedRecipeId) {
            const recipes = getRecipesForBuilding(data.buildingType);
            node.assignedRecipe = recipes.find(r => r.id === data.assignedRecipeId) || null;
        }
        if (node.buildingDef.isStorage) {
            node.inventory = data.inventory || 0;
            node.storedResourceType = data.storedResourceType || null;
            node.inventoryCapacity = (node.buildingDef.baseCapacity || 500) * node.level;
        }

        if (!node.buildingDef) {
            throw new Error(`Failed to load buildingDef for ${data.buildingType}`);
        }

        log(`Loaded node: ${node.buildingDef.name} (${node.id}) at (${node.x}, ${node.y})`);
        return node;
    }
}
