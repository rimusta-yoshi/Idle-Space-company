// Connection Manager
// Handles connections between factory nodes

// Calculate orthogonal (elbow) routing points between two port positions.
// Forward (target to the right): single L-bend at the midpoint.
// Backward (target to the left): U-route that steps outside both nodes.
function calcElbowPoints(sx, sy, ex, ey) {
    const STEP = 40; // How far to extend before routing around a node
    if (ex >= sx) {
        const midX = (sx + ex) / 2;
        return [sx, sy, midX, sy, midX, ey, ex, ey];
    }
    const midY = (sy + ey) / 2;
    return [sx, sy, sx + STEP, sy, sx + STEP, midY, ex - STEP, midY, ex - STEP, ey, ex, ey];
}

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
        const points = this.getArrowPoints();

        this.arrow = new Konva.Arrow({
            points: points,
            stroke: '#c49a2a',
            strokeWidth: 2,
            fill: '#c49a2a',
            pointerLength: 8,
            pointerWidth: 8,
            lineCap: 'square',
            lineJoin: 'miter',
            tension: 0,
            opacity: 0.9
        });

        // Add hover effect
        this.arrow.on('mouseenter', () => {
            this.arrow.stroke('#e8c840');
            this.arrow.fill('#e8c840');
            this.arrow.strokeWidth(3);
            this.arrow.getLayer()?.draw();
        });

        this.arrow.on('mouseleave', () => {
            this.arrow.stroke('#c49a2a');
            this.arrow.fill('#c49a2a');
            this.arrow.strokeWidth(2);
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
        // Output port: right edge center of fromNode
        const sx = this.fromNode.x + this.fromNode.nodeWidth;
        const sy = this.fromNode.y + this.fromNode.calcHeight() / 2;
        // Input port: left edge center of toNode
        const ex = this.toNode.x;
        const ey = this.toNode.y + this.toNode.calcHeight() / 2;
        return calcElbowPoints(sx, sy, ex, ey);
    }

    // Update arrow position (when nodes are dragged)
    updatePosition() {
        this.arrow.points(this.getArrowPoints());
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
            throw new Error(`Failed to load connection: nodes not found (${data.fromNodeId} -> ${data.toNodeId})`);
        }

        const connection = new Connection(fromNode, toNode, data.resourceType);
        connection.id = data.id;
        return connection;
    }
}
