// Factory Node
// Represents a building placed on the canvas

class FactoryNode {
    constructor(buildingType, x, y) {
        this.id = generateId();
        this.buildingType = buildingType;
        this.buildingDef = getBuildingDef(buildingType);

        if (!this.buildingDef) {
            console.error(`Building type ${buildingType} not found`);
            return null;
        }

        this.x = x;
        this.y = y;
        this.level = 1;
        this.inputs = []; // Connected input node IDs
        this.outputs = []; // Connected output node IDs
        this.stalled = false; // True if can't produce due to lack of inputs

        // Konva shapes
        this.group = null; // Konva Group containing all shapes
        this.rect = null; // Background rectangle
        this.text = null; // Label text
        this.rateText = null; // Production rate text

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

        // Background rectangle
        this.rect = new Konva.Rect({
            x: 0,
            y: 0,
            width: def.width,
            height: def.height,
            fill: def.color,
            stroke: '#00ff00',
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
            fill: '#00ff00',
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
            fill: '#ffff00',
            width: def.width - 20,
            align: 'center'
        });

        // Add shapes to group
        this.group.add(this.rect);
        this.group.add(this.text);
        this.group.add(this.rateText);

        // Add hover effects
        this.group.on('mouseenter', () => {
            this.rect.stroke('#ffff00');
            this.rect.strokeWidth(3);
        });

        this.group.on('mouseleave', () => {
            this.rect.stroke('#00ff00');
            this.rect.strokeWidth(2);
        });

        // Add drag event to update position
        this.group.on('dragmove', () => {
            this.x = this.group.x();
            this.y = this.group.y();
        });
    }

    getProductionText() {
        const def = this.buildingDef;
        let text = '';

        // Show production
        if (def.production && Object.keys(def.production).length > 0) {
            Object.entries(def.production).forEach(([resource, rate]) => {
                const totalRate = rate * this.level;
                text += `+${formatRate(totalRate)} ${resource}\n`;
            });
        }

        // Show consumption
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
            this.rect.fill('#440000'); // Red tint when stalled
            this.text.fill('#ff0000');
        } else {
            this.rect.fill(this.buildingDef.color);
            this.text.fill('#00ff00');
        }
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

        // Debug: Verify node was created correctly
        if (!node.buildingDef) {
            console.error(`Failed to load buildingDef for ${data.buildingType}`);
        } else {
            log(`Loaded node: ${node.buildingDef.name} (${node.id}) at (${node.x}, ${node.y})`);
        }

        return node;
    }
}
