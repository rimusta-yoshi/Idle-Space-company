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
        this.flowRate = 0; // Actual units/sec flowing — set by game.js each tick
        this._dashOffset = 0; // Animated by AnimationManager

        this.arrow = null;
        this.labelBg = null;
        this.label = null;
        this.createKonvaArrow();
    }

    _getResourceColor() {
        return RESOURCES[this.resourceType]?.color || '#c49a2a';
    }

    createKonvaArrow() {
        const points = this.getArrowPoints();
        const color  = this._getResourceColor();

        this.arrow = new Konva.Arrow({
            points: points,
            stroke: color,
            strokeWidth: 2,
            fill: color,
            pointerLength: 8,
            pointerWidth: 8,
            lineCap: 'square',
            lineJoin: 'miter',
            tension: 0,
            opacity: 0.8,
            hitStrokeWidth: 20,  // Fat invisible hit area — much easier to click
            dash: [10, 6],
            dashOffset: 0
        });

        // Add hover effect + grab cursor
        this.arrow.on('mouseenter', () => {
            this.arrow.strokeWidth(3);
            this.arrow.opacity(1);
            this.arrow.getStage()?.container().style.setProperty('cursor', 'grab');
            this.arrow.getLayer()?.draw();
        });

        this.arrow.on('mouseleave', () => {
            this.arrow.strokeWidth(2);
            this.arrow.opacity(0.8);
            this.arrow.getStage()?.container().style.removeProperty('cursor');
            this.arrow.getLayer()?.draw();
        });

        // Left-click drag → grab to detach/re-route
        this.arrow.on('mousedown', (e) => {
            if (e.evt.button !== 0) return;
            e.cancelBubble = true;
            const stage = this.arrow.getStage();
            const pos = stage?.getPointerPosition();
            document.dispatchEvent(new CustomEvent('connectionGrabStart', {
                detail: { connectionId: this.id, startX: pos?.x ?? 0, startY: pos?.y ?? 0 }
            }));
        });

        // Flow rate label — positioned at arrow midpoint, non-interactive
        this.labelBg = new Konva.Rect({
            x: 0, y: 0,
            width: 68, height: 16,
            fill: '#0e0c09',
            stroke: color + '40',
            strokeWidth: 1,
            cornerRadius: 2,
            listening: false,
            visible: false
        });

        this.label = new Konva.Text({
            x: 0, y: 0,
            text: '',
            fontSize: 12,
            fontFamily: 'VT323, Courier New',
            fill: color,
            align: 'center',
            width: 68,
            listening: false,
            visible: false
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

    // Update the flow rate label text and position
    updateLabel() {
        const points = this.getArrowPoints();
        // Midpoint between start and end for label placement
        const sx = points[0], sy = points[1];
        const ex = points[points.length - 2], ey = points[points.length - 1];
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;

        const W = 68, H = 16; // Must match labelBg/label width above
        const text = this.flowRate > 0.001 ? formatRatePerMin(this.flowRate) : '';
        const visible = text.length > 0;

        this.labelBg.x(mx - W / 2);
        this.labelBg.y(my - H / 2);
        this.labelBg.visible(visible);

        this.label.x(mx - W / 2);
        this.label.y(my - H / 2 + 1);
        this.label.text(text);
        this.label.visible(visible);
    }

    // Update arrow position (when nodes are dragged)
    updatePosition() {
        this.arrow.points(this.getArrowPoints());
        this.updateLabel();
    }

    // Add to Konva layer
    addToLayer(layer, animate = false) {
        // Arrow goes to the very bottom; labels sit just above it (below nodes)
        layer.add(this.arrow);
        this.arrow.moveToBottom();
        layer.add(this.labelBg, this.label);

        if (animate) {
            this.arrow.opacity(0);
            this.arrow.to({ duration: 0.3, opacity: 0.8, easing: Konva.Easings.EaseOut });
        }
    }

    // Remove from layer
    removeFromLayer() {
        this.arrow.remove();
        this.labelBg.remove();
        this.label.remove();
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
            log(`Skipping orphaned connection: ${data.fromNodeId} -> ${data.toNodeId}`);
            return null;
        }

        const connection = new Connection(fromNode, toNode, data.resourceType);
        connection.id = data.id;
        return connection;
    }
}
