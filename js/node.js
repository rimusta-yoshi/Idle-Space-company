// Factory Node
// Represents a building placed on the canvas

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
        this.inputs = []; // Connected input node IDs
        this.outputs = []; // Connected output node IDs
        this.stalled = false; // True if can't produce due to lack of inputs
        this.activeRecipe = null; // Active recipe for recipe-based buildings (resolved by game loop)
        this.isDraggingConnection = false; // True while a connection drag originates from this node

        // Konva shapes
        this.group = null; // Konva Group containing all shapes
        this.rect = null; // Background rectangle
        this.text = null; // Label text
        this.rateText = null; // Production rate text
        this.outputPort = null; // Right-edge connection port
        this.inputPort = null; // Left-edge connection port

        this.createKonvaShapes();
    }

    createKonvaShapes() {
        const def = this.buildingDef;

        // Create group to hold all shapes
        this.group = new Konva.Group({
            x: this.x,
            y: this.y,
            draggable: true,
            id: this.id
        });

        // Store reference back to this node on the Konva group
        this.group.nodeRef = this;

        // Background rectangle
        this.rect = new Konva.Rect({
            x: 0,
            y: 0,
            width: def.width,
            height: def.height,
            fill: def.color,
            stroke: '#d4a832',
            strokeWidth: 2,
            cornerRadius: 5
        });

        // Building name text
        this.text = new Konva.Text({
            x: 10,
            y: 15,
            text: def.name,
            fontSize: 14,
            fontFamily: 'Courier New',
            fill: '#d4a832',
            width: def.width - 20,
            align: 'center'
        });

        // Production rate text
        this.rateText = new Konva.Text({
            x: 10,
            y: def.height - 30,
            text: this.getProductionText(),
            fontSize: 12,
            fontFamily: 'Courier New',
            fill: '#a07818',
            width: def.width - 20,
            align: 'center'
        });

        // Output port (right edge, centre height) — drag-from to create connections
        this.outputPort = new Konva.Circle({
            x: def.width,
            y: def.height / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        // Input port (left edge, centre height) — drop target
        this.inputPort = new Konva.Circle({
            x: 0,
            y: def.height / 2,
            radius: 7,
            fill: '#07060a',
            stroke: '#d4a832',
            strokeWidth: 2,
            visible: false,
            listening: true
        });

        // Add shapes to group
        this.group.add(this.rect);
        this.group.add(this.text);
        this.group.add(this.rateText);
        this.group.add(this.outputPort);
        this.group.add(this.inputPort);

        // Show/hide ports on hover
        this.group.on('mouseenter', () => {
            this.showPorts();
        });

        this.group.on('mouseleave', () => {
            this.hidePorts();
        });

        // Update position on drag
        this.group.on('dragmove', () => {
            this.x = this.group.x();
            this.y = this.group.y();
            const event = new CustomEvent('nodeDragged', { detail: { nodeId: this.id } });
            document.dispatchEvent(event);
        });
    }

    showPorts() {
        this.outputPort.visible(true);
        this.inputPort.visible(true);
        this.group.getLayer()?.batchDraw();
    }

    hidePorts() {
        // Don't hide if a connection drag is in progress from this node
        if (this.isDraggingConnection) return;
        this.outputPort.visible(false);
        this.inputPort.visible(false);
        this.group.getLayer()?.batchDraw();
    }

    getProductionText() {
        const def = this.buildingDef;

        // Recipe-based building: use activeRecipe if available
        if (def.usesRecipes) {
            if (!this.activeRecipe) {
                return 'No Recipe';
            }
            let text = '';
            Object.entries(this.activeRecipe.outputs).forEach(([resource, rate]) => {
                const totalRate = rate * this.level;
                text += `+${formatRate(totalRate)} ${resource}\n`;
            });
            Object.entries(this.activeRecipe.inputs).forEach(([resource, rate]) => {
                const totalRate = rate * this.level;
                text += `-${formatRate(totalRate)} ${resource}\n`;
            });
            return text.trim() || 'No Recipe';
        }

        // Standard building display
        let text = '';
        if (def.production && Object.keys(def.production).length > 0) {
            Object.entries(def.production).forEach(([resource, rate]) => {
                const totalRate = rate * this.level;
                text += `+${formatRate(totalRate)} ${resource}\n`;
            });
        }
        if (def.consumption && Object.keys(def.consumption).length > 0) {
            Object.entries(def.consumption).forEach(([resource, rate]) => {
                const totalRate = rate * this.level;
                text += `-${formatRate(totalRate)} ${resource}\n`;
            });
        }
        return text.trim() || 'Idle';
    }

    updateDisplay() {
        if (this.rateText) {
            this.rateText.text(this.getProductionText());
        }

        // Update visual state based on stalled status
        if (this.stalled) {
            this.rect.fill('#1a0808'); // Dark red tint when stalled
            this.text.fill('#cc3333');
        } else {
            this.rect.fill(this.buildingDef.color);
            this.text.fill('#d4a832');
        }

        // Default stroke
        this.rect.stroke('#d4a832');
        this.rect.strokeWidth(2);
    }

    // Upgrade level (encapsulated mutation)
    upgradeLevel() {
        this.level++;
        this.updateDisplay();
    }

    // Get center position (for connection lines)
    getCenterX() {
        return this.x + this.buildingDef.width / 2;
    }

    getCenterY() {
        return this.y + this.buildingDef.height / 2;
    }

    // Add to Konva layer
    addToLayer(layer) {
        layer.add(this.group);
    }

    // Remove from layer
    removeFromLayer() {
        if (this.group) {
            this.group.destroy();
        }
    }

    // Get save data
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

    // Load from save data
    static loadFromSaveData(data) {
        const node = new FactoryNode(data.buildingType, data.x, data.y);
        node.id = data.id;
        node.level = data.level || 1;
        node.inputs = data.inputs || [];
        node.outputs = data.outputs || [];

        // Verify node was created correctly
        if (!node.buildingDef) {
            throw new Error(`Failed to load buildingDef for ${data.buildingType}`);
        }

        log(`Loaded node: ${node.buildingDef.name} (${node.id}) at (${node.x}, ${node.y})`);

        return node;
    }
}
