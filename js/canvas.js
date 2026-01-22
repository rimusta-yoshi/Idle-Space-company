// Canvas Manager
// Handles Konva canvas and node management

class CanvasManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.stage = null;
        this.layer = null;
        this.nodes = []; // Array of FactoryNode objects
        this.connections = []; // Array of connection lines
        this.initialize();
    }

    initialize() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        // Get container size
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create Konva stage
        this.stage = new Konva.Stage({
            container: this.containerId,
            width: width,
            height: height
        });

        // Create layer
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        log('Canvas initialized: ' + width + 'x' + height);

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const container = document.getElementById(this.containerId);
        if (container && this.stage) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.stage.width(width);
            this.stage.height(height);
            this.layer.draw();
        }
    }

    // Draw test shapes (for Phase 1 testing)
    drawTestShapes() {
        // Test rectangle
        const rect = new Konva.Rect({
            x: 100,
            y: 100,
            width: 150,
            height: 80,
            fill: '#004400',
            stroke: '#00ff00',
            strokeWidth: 2,
            draggable: true
        });

        // Test text
        const text = new Konva.Text({
            x: 100,
            y: 120,
            text: 'Test Node',
            fontSize: 16,
            fontFamily: 'Courier New',
            fill: '#00ff00',
            width: 150,
            align: 'center'
        });

        // Test line
        const line = new Konva.Line({
            points: [275, 140, 450, 200],
            stroke: '#00ff00',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        });

        // Add arrow to line
        const arrow = new Konva.Arrow({
            points: [275, 140, 450, 200],
            stroke: '#00ff00',
            strokeWidth: 2,
            fill: '#00ff00',
            pointerLength: 10,
            pointerWidth: 10
        });

        // Another test rectangle
        const rect2 = new Konva.Rect({
            x: 450,
            y: 160,
            width: 150,
            height: 80,
            fill: '#440000',
            stroke: '#00ff00',
            strokeWidth: 2,
            draggable: true
        });

        const text2 = new Konva.Text({
            x: 450,
            y: 180,
            text: 'Test Node 2',
            fontSize: 16,
            fontFamily: 'Courier New',
            fill: '#00ff00',
            width: 150,
            align: 'center'
        });

        // Add to layer
        this.layer.add(arrow);
        this.layer.add(rect);
        this.layer.add(text);
        this.layer.add(rect2);
        this.layer.add(text2);
        this.layer.draw();

        log('Test shapes drawn');
    }

    // Add factory node to canvas
    addNode(node) {
        node.addToLayer(this.layer);
        this.nodes.push(node);
        this.layer.draw();
        log(`Node added: ${node.buildingDef.name} at (${node.x}, ${node.y})`);
    }

    // Remove factory node
    removeNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            this.nodes[index].removeFromLayer();
            this.nodes.splice(index, 1);
            this.layer.draw();
            log(`Node removed: ${nodeId}`);
        }
    }

    // Get node by ID
    getNode(nodeId) {
        return this.nodes.find(n => n.id === nodeId);
    }

    // Update all nodes display
    updateNodes() {
        this.nodes.forEach(node => {
            node.updateDisplay();
        });
        this.layer.draw();
    }

    // Clear canvas
    clear() {
        this.nodes.forEach(node => node.removeFromLayer());
        this.nodes = [];
        this.connections = [];
        this.layer.destroyChildren();
        this.layer.draw();
        log('Canvas cleared');
    }

    // Get save data
    getSaveData() {
        return {
            nodes: this.nodes.map(node => node.getSaveData()),
            connections: this.connections
        };
    }

    // Load save data
    loadSaveData(data) {
        this.clear();

        if (data.nodes) {
            data.nodes.forEach(nodeData => {
                const node = FactoryNode.loadFromSaveData(nodeData);
                this.addNode(node);
            });
        }

        if (data.connections) {
            this.connections = data.connections;
            // TODO: Redraw connection lines
        }

        log('Canvas loaded from save data');
    }
}
