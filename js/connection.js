// Connection Manager
// Handles connections between factory nodes

class Connection {
    constructor(fromNode, toNode, resourceType) {
        this.id = generateId();
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.resourceType = resourceType; // What resource flows through this connection

        this.arrow = null; // Konva arrow shape
        this.createKonvaArrow();
    }

    createKonvaArrow() {
        // Calculate arrow points from center of fromNode to center of toNode
        const points = this.getArrowPoints();

        this.arrow = new Konva.Arrow({
            points: points,
            stroke: '#00ff00',
            strokeWidth: 3,
            fill: '#00ff00',
            pointerLength: 12,
            pointerWidth: 12,
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.8
        });

        // Add hover effect
        this.arrow.on('mouseenter', () => {
            this.arrow.stroke('#ffff00');
            this.arrow.strokeWidth(4);
            this.arrow.getLayer()?.draw();
        });

        this.arrow.on('mouseleave', () => {
            this.arrow.stroke('#00ff00');
            this.arrow.strokeWidth(3);
            this.arrow.getLayer()?.draw();
        });

        // Right-click to delete (handled by canvas manager)
        this.arrow.on('contextmenu', (e) => {
            e.evt.preventDefault();
            // Dispatch custom event for deletion
            const event = new CustomEvent('deleteConnection', { detail: { connectionId: this.id } });
            document.dispatchEvent(event);
        });
    }

    getArrowPoints() {
        // Get center of both nodes
        const fromX = this.fromNode.x + (this.fromNode.buildingDef.width / 2);
        const fromY = this.fromNode.y + (this.fromNode.buildingDef.height / 2);
        const toX = this.toNode.x + (this.toNode.buildingDef.width / 2);
        const toY = this.toNode.y + (this.toNode.buildingDef.height / 2);

        return [fromX, fromY, toX, toY];
    }

    // Update arrow position (when nodes are dragged)
    updatePosition() {
        const points = this.getArrowPoints();
        this.arrow.points(points);
    }

    // Add to Konva layer
    addToLayer(layer) {
        layer.add(this.arrow);
        // Connections should be below nodes (add to back)
        this.arrow.moveToBottom();
    }

    // Remove from layer
    removeFromLayer() {
        this.arrow.remove();
    }

    // Get save data
    getSaveData() {
        return {
            id: this.id,
            fromNodeId: this.fromNode.id,
            toNodeId: this.toNode.id,
            resourceType: this.resourceType
        };
    }

    // Load from save data (static factory method)
    static loadFromSaveData(data, nodes) {
        const fromNode = nodes.find(n => n.id === data.fromNodeId);
        const toNode = nodes.find(n => n.id === data.toNodeId);

        if (!fromNode || !toNode) {
            console.error(`Failed to load connection: nodes not found (${data.fromNodeId} -> ${data.toNodeId})`);
            return null;
        }

        const connection = new Connection(fromNode, toNode, data.resourceType);
        connection.id = data.id;
        return connection;
    }
}
