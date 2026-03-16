// Factory Node
// Represents a building placed on the canvas

const NODE_W = 160;
const HEADER_H = 28;
const ROW_H = 20;
const PAD_B = 8;

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
        this.activeRecipe = null;
        this.isDraggingConnection = false;

        // Konva shapes
        this.group = null;
        this.rect = null;
        this.headerBg = null;
        this.headerName = null;  // "→ [icon] OUTPUT NAME"
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

        if (def.usesRecipes) {
            if (this.activeRecipe) {
                const [resKey, rate] = Object.entries(this.activeRecipe.outputs)[0];
                const resDef = RESOURCES[resKey];
                return {
                    icon: resDef?.icon || '',
                    name: resDef?.name.toUpperCase() || resKey.toUpperCase(),
                    ratePerSec: rate
                };
            }
            return { icon: def.icon, name: def.name.toUpperCase(), ratePerSec: null };
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

        if (def.usesRecipes) {
            inputRows = this.activeRecipe ? Object.keys(this.activeRecipe.inputs).length : 1;
        } else {
            inputRows = Object.keys(def.consumption || {}).length;
        }

        // No body section for buildings with no inputs (extractors)
        const bodyHeight = inputRows > 0 ? 1 + inputRows * ROW_H : 0;
        return HEADER_H + bodyHeight + PAD_B;
    }

    createKonvaShapes() {
        const def = this.buildingDef;
        const h = this.calcHeight();

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
            width: NODE_W, height: h,
            fill: def.color,
            stroke: '#d4a832',
            strokeWidth: 1.5,
            cornerRadius: 4
        });

        // Header background tint
        this.headerBg = new Konva.Rect({
            x: 0, y: 0,
            width: NODE_W, height: HEADER_H,
            fill: 'rgba(212, 168, 50, 0.07)',
            cornerRadius: [4, 4, 0, 0]
        });

        // "→ [icon] NAME" — left side of header
        this.headerName = new Konva.Text({
            x: 8, y: 8,
            text: '',
            fontSize: 11,
            fontFamily: 'Courier New',
            fill: '#d4a832',
            width: NODE_W - 68,
            fontStyle: 'bold'
        });

        // "X/MIN" — right side of header
        this.headerRate = new Konva.Text({
            x: NODE_W - 62, y: 8,
            text: '',
            fontSize: 11,
            fontFamily: 'Courier New',
            fill: '#a07818',
            width: 58,
            align: 'right'
        });

        // Divider (hidden for no-input buildings)
        this.divider = new Konva.Line({
            points: [0, HEADER_H, NODE_W, HEADER_H],
            stroke: '#3c2c0c',
            strokeWidth: 1,
            visible: false
        });

        // Output port (right edge) — drag-from to create connections
        this.outputPort = new Konva.Circle({
            x: NODE_W, y: h / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        // Input port (left edge) — drop target
        this.inputPort = new Konva.Circle({
            x: 0, y: h / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        this.group.add(this.rect, this.headerBg, this.headerName, this.headerRate, this.divider, this.outputPort, this.inputPort);

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

        // Update header
        this.headerName.text(`→ ${title.icon} ${title.name}`);
        this.headerRate.text(title.ratePerSec ? formatRatePerMin(title.ratePerSec * this.level) : '—');

        let y = HEADER_H + 5;
        let hasInputRows = false;

        const addInputRow = (resourceKey, ratePerSec) => {
            hasInputRows = true;
            const resDef = RESOURCES[resourceKey];
            const icon = resDef?.icon || '';
            const label = resDef?.name.toUpperCase() || resourceKey.toUpperCase();
            const totalRate = ratePerSec * this.level;

            const row = new Konva.Text({
                x: 8, y,
                text: `${icon} ${label}  |  ${formatRatePerMin(totalRate)}`,
                fontSize: 10,
                fontFamily: 'Courier New',
                fill: '#8a6820',
                width: NODE_W - 16,
                ellipsis: true
            });

            this.ioShapes.push(row);
            this.group.add(row);
            y += ROW_H;
        };

        if (def.usesRecipes) {
            if (this.activeRecipe) {
                Object.entries(this.activeRecipe.inputs).forEach(([res, rate]) => addInputRow(res, rate));
            } else {
                hasInputRows = true;
                const placeholder = new Konva.Text({
                    x: 8, y,
                    text: 'AWAITING INPUT',
                    fontSize: 10,
                    fontFamily: 'Courier New',
                    fill: '#664420',
                    width: NODE_W - 16,
                    align: 'center'
                });
                this.ioShapes.push(placeholder);
                this.group.add(placeholder);
            }
        } else {
            Object.entries(def.consumption || {}).forEach(([res, rate]) => addInputRow(res, rate));
        }

        this.divider.visible(hasInputRows);

        // Resize and reposition ports
        const h = this.calcHeight();
        this.rect.height(h);
        this.outputPort.y(h / 2);
        this.inputPort.y(h / 2);
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

        if (this.stalled) {
            this.rect.fill('#1a0808');
            this.headerName.fill('#cc3333');
        } else {
            this.rect.fill(this.buildingDef.color);
            this.headerName.fill('#d4a832');
        }

        this.rect.stroke('#d4a832');
        this.rect.strokeWidth(1.5);
    }

    upgradeLevel() {
        this.level++;
        this.updateDisplay();
    }

    getCenterX() {
        return this.x + NODE_W / 2;
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
            outputs: this.outputs
        };
    }

    static loadFromSaveData(data) {
        const node = new FactoryNode(data.buildingType, data.x, data.y);
        node.id = data.id;
        node.level = data.level || 1;
        node.inputs = data.inputs || [];
        node.outputs = data.outputs || [];

        if (!node.buildingDef) {
            throw new Error(`Failed to load buildingDef for ${data.buildingType}`);
        }

        log(`Loaded node: ${node.buildingDef.name} (${node.id}) at (${node.x}, ${node.y})`);
        return node;
    }
}
