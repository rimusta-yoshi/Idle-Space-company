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
        this.nameText = null;
        this.levelText = null;
        this.divider = null;
        this.ioShapes = [];
        this.outputPort = null;
        this.inputPort = null;

        this.createKonvaShapes();
    }

    calcHeight() {
        const def = this.buildingDef;
        let rows;

        if (def.usesRecipes) {
            if (this.activeRecipe) {
                rows = Object.keys(this.activeRecipe.outputs).length
                     + Object.keys(this.activeRecipe.inputs).length;
            } else {
                rows = 1; // "NO RECIPE" placeholder row
            }
        } else {
            rows = Object.keys(def.production || {}).length
                 + Object.keys(def.consumption || {}).length;
            if (rows === 0) rows = 1;
        }

        return HEADER_H + 1 + rows * ROW_H + PAD_B;
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

        // Building name
        this.nameText = new Konva.Text({
            x: 8, y: 8,
            text: def.name.toUpperCase(),
            fontSize: 11,
            fontFamily: 'Courier New',
            fill: '#d4a832',
            width: NODE_W - 40,
            fontStyle: 'bold'
        });

        // Level badge
        this.levelText = new Konva.Text({
            x: NODE_W - 32, y: 8,
            text: `L${this.level}`,
            fontSize: 11,
            fontFamily: 'Courier New',
            fill: '#6a5010',
            width: 28,
            align: 'right'
        });

        // Divider
        this.divider = new Konva.Line({
            points: [0, HEADER_H, NODE_W, HEADER_H],
            stroke: '#3c2c0c',
            strokeWidth: 1
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

        this.group.add(this.rect, this.headerBg, this.nameText, this.levelText, this.divider, this.outputPort, this.inputPort);

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
        let y = HEADER_H + 5;

        const addRow = (prefix, resourceKey, rate, isOutput) => {
            const prefixShape = new Konva.Text({
                x: 8, y,
                text: prefix,
                fontSize: 11,
                fontFamily: 'Courier New',
                fill: isOutput ? '#d4a832' : '#a07818'
            });

            const labelShape = new Konva.Text({
                x: 20, y,
                text: getResourceLabel(resourceKey),
                fontSize: 10,
                fontFamily: 'Courier New',
                fill: '#8a6820',
                width: NODE_W - 80,
                ellipsis: true
            });

            const totalRate = rate * this.level;
            const rateShape = new Konva.Text({
                x: NODE_W - 58, y,
                text: `${formatRate(totalRate)}/M`,
                fontSize: 10,
                fontFamily: 'Courier New',
                fill: isOutput ? '#a07818' : '#6a5010',
                width: 50,
                align: 'right'
            });

            this.ioShapes.push(prefixShape, labelShape, rateShape);
            this.group.add(prefixShape, labelShape, rateShape);
            y += ROW_H;
        };

        if (def.usesRecipes) {
            if (this.activeRecipe) {
                Object.entries(this.activeRecipe.outputs).forEach(([res, rate]) => addRow('+', res, rate, true));
                Object.entries(this.activeRecipe.inputs).forEach(([res, rate]) => addRow('-', res, rate, false));
            } else {
                const noRecipe = new Konva.Text({
                    x: 8, y,
                    text: 'NO RECIPE',
                    fontSize: 10,
                    fontFamily: 'Courier New',
                    fill: '#664420',
                    width: NODE_W - 16,
                    align: 'center'
                });
                this.ioShapes.push(noRecipe);
                this.group.add(noRecipe);
            }
        } else {
            Object.entries(def.production || {}).forEach(([res, rate]) => addRow('+', res, rate, true));
            Object.entries(def.consumption || {}).forEach(([res, rate]) => addRow('-', res, rate, false));
        }

        // Resize and reposition ports to match new height
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

        if (this.levelText) {
            this.levelText.text(`L${this.level}`);
        }

        if (this.stalled) {
            this.rect.fill('#1a0808');
            this.nameText.fill('#cc3333');
        } else {
            this.rect.fill(this.buildingDef.color);
            this.nameText.fill('#d4a832');
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
