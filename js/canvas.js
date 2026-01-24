// Canvas Manager
// Handles Konva canvas and node management

class CanvasManager {
    constructor(containerId, rootElement = document) {
        this.containerId = containerId;
        this.rootElement = rootElement;
        this.stage = null;
        this.layer = null;
        this.nodes = []; // Array of FactoryNode objects
        this.connections = []; // Array of Connection objects
        this.selectedNode = null; // For connection mode

        // Canvas size (large virtual canvas)
        this.canvasWidth = 2000;
        this.canvasHeight = 2000;

        // Pan and zoom state
        this.isPanning = false;
        this.lastPanPosition = { x: 0, y: 0 };
        this.scale = 1;
        this.minScale = 0.3;
        this.maxScale = 2;

        this.initialize();
    }

    initialize() {
        // Use querySelector which works on both document and DOM elements
        const container = this.rootElement.querySelector(`#${this.containerId}`);

        if (!container) {
            console.error(`Container ${this.containerId} not found in rootElement:`, this.rootElement);
            console.error('Available elements:', this.rootElement.querySelectorAll('*'));
            return;
        }

        console.log('Found canvas container:', container);

        // Get container size
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        console.log('Container size:', width, 'x', height);

        // Create Konva stage - pass the actual DOM element, not the ID string
        try {
            this.stage = new Konva.Stage({
                container: container,  // Pass the DOM element directly
                width: width,
                height: height,
                draggable: false // We'll handle dragging manually
            });

            // Create background layer for grid
            this.backgroundLayer = new Konva.Layer();
            this.stage.add(this.backgroundLayer);

            // Draw grid
            this.drawGrid();

            // Create main layer for nodes and connections
            this.layer = new Konva.Layer();
            this.stage.add(this.layer);

            // Center the view initially
            this.layer.position({ x: 0, y: 0 });
            this.layer.scale({ x: this.scale, y: this.scale });
            this.backgroundLayer.position({ x: 0, y: 0 });
            this.backgroundLayer.scale({ x: this.scale, y: this.scale });

            log('Canvas initialized: ' + width + 'x' + height + ' (virtual: ' + this.canvasWidth + 'x' + this.canvasHeight + ')');
        } catch (error) {
            console.error('Failed to initialize Konva stage:', error);
            console.error('Container element:', container);
            console.error('Container parent:', container.parentElement);
        }

        // Handle window resize (only resize viewport, not scale)
        window.addEventListener('resize', () => this.handleResize());

        // Setup pan and zoom controls
        this.setupPanAndZoom();

        // Setup event listeners for node interactions
        this.setupEventListeners();
    }

    handleResize() {
        const container = this.rootElement.querySelector(`#${this.containerId}`);
        if (container && this.stage) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.stage.width(width);
            this.stage.height(height);
            this.stage.batchDraw();
        }
    }

    drawGrid() {
        const gridSize = 50; // Grid cell size
        const gridColor = '#003300';
        const gridOpacity = 0.3;

        // Draw vertical lines
        for (let x = 0; x <= this.canvasWidth; x += gridSize) {
            const line = new Konva.Line({
                points: [x, 0, x, this.canvasHeight],
                stroke: gridColor,
                strokeWidth: 1,
                opacity: gridOpacity
            });
            this.backgroundLayer.add(line);
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.canvasHeight; y += gridSize) {
            const line = new Konva.Line({
                points: [0, y, this.canvasWidth, y],
                stroke: gridColor,
                strokeWidth: 1,
                opacity: gridOpacity
            });
            this.backgroundLayer.add(line);
        }

        // Draw origin marker
        const originMarker = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 10,
            fill: '#00ff00',
            opacity: 0.5
        });
        this.backgroundLayer.add(originMarker);

        const originText = new Konva.Text({
            x: 15,
            y: -5,
            text: '(0, 0)',
            fontSize: 12,
            fontFamily: 'Courier New',
            fill: '#00ff00',
            opacity: 0.7
        });
        this.backgroundLayer.add(originText);

        this.backgroundLayer.draw();
    }

    setupPanAndZoom() {
        if (!this.stage) return;

        const container = this.stage.container();
        let spacePressed = false;

        // Track spacebar state
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !spacePressed) {
                e.preventDefault();
                spacePressed = true;
                container.style.cursor = 'grab';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                spacePressed = false;
                container.style.cursor = 'default';
                if (this.isPanning) {
                    this.isPanning = false;
                    container.style.cursor = 'default';
                }
            }
        });

        // Pan with middle mouse or spacebar + drag
        this.stage.on('mousedown', (e) => {
            const isMiddleButton = e.evt.button === 1;
            const isSpacebarDrag = spacePressed && e.evt.button === 0;

            if (isMiddleButton || isSpacebarDrag) {
                e.evt.preventDefault();
                this.isPanning = true;
                this.lastPanPosition = {
                    x: e.evt.clientX,
                    y: e.evt.clientY
                };
                container.style.cursor = 'grabbing';
            }
        });

        this.stage.on('mousemove', (e) => {
            if (!this.isPanning) return;

            const dx = e.evt.clientX - this.lastPanPosition.x;
            const dy = e.evt.clientY - this.lastPanPosition.y;

            const currentPos = this.layer.position();
            const newPos = {
                x: currentPos.x + dx,
                y: currentPos.y + dy
            };
            this.layer.position(newPos);
            this.backgroundLayer.position(newPos);

            this.lastPanPosition = {
                x: e.evt.clientX,
                y: e.evt.clientY
            };

            this.stage.batchDraw();
        });

        this.stage.on('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = spacePressed ? 'grab' : 'default';
            }
        });

        // Prevent context menu on middle mouse
        container.addEventListener('contextmenu', (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        // Zoom with mouse wheel
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const oldScale = this.scale;
            const pointer = this.stage.getPointerPosition();

            const mousePointTo = {
                x: (pointer.x - this.layer.x()) / oldScale,
                y: (pointer.y - this.layer.y()) / oldScale
            };

            // Zoom factor
            const scaleBy = 1.1;
            const direction = e.evt.deltaY > 0 ? -1 : 1;

            this.scale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

            // Clamp scale
            this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

            const newPos = {
                x: pointer.x - mousePointTo.x * this.scale,
                y: pointer.y - mousePointTo.y * this.scale
            };

            this.layer.scale({ x: this.scale, y: this.scale });
            this.layer.position(newPos);
            this.backgroundLayer.scale({ x: this.scale, y: this.scale });
            this.backgroundLayer.position(newPos);
            this.stage.batchDraw();

            // Update zoom indicator
            this.updateZoomIndicator();
        });

        log('Pan and zoom controls initialized');
    }

    updateZoomIndicator() {
        const indicator = this.rootElement.querySelector('#zoom-indicator');
        if (indicator) {
            const zoomPercent = Math.round(this.scale * 100);
            indicator.textContent = `Zoom: ${zoomPercent}%`;
        }
    }

    setupEventListeners() {
        // Listen for node drag events to update connections
        document.addEventListener('nodeDragged', (e) => {
            this.updateConnections();
            this.layer.draw();
        });

        // Listen for connection deletion requests
        document.addEventListener('deleteConnection', (e) => {
            this.deleteConnection(e.detail.connectionId);
        });
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

        // Setup click handler for connection mode
        node.group.on('click', () => {
            this.onNodeClick(node);
        });

        // Setup double-click handler for upgrade panel
        node.group.on('dblclick', () => {
            this.onNodeDoubleClick(node);
        });

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

    // Connection Management

    // Try to create connection from selected node to target node
    tryCreateConnection(fromNode, toNode) {
        // Validation
        if (fromNode === toNode) {
            log('Cannot connect node to itself');
            return false;
        }

        // Check if connection already exists
        const existing = this.connections.find(c =>
            c.fromNode === fromNode && c.toNode === toNode
        );
        if (existing) {
            log('Connection already exists');
            return false;
        }

        // Check if nodes are compatible (validation logic)
        if (!this.areNodesCompatible(fromNode, toNode)) {
            log(`Cannot connect ${fromNode.buildingDef.name} to ${toNode.buildingDef.name}`);
            return false;
        }

        // Determine resource type flowing through connection
        const resourceType = this.getConnectionResourceType(fromNode, toNode);
        if (!resourceType) {
            log('No compatible resource found between nodes');
            return false;
        }

        // Create connection
        const connection = new Connection(fromNode, toNode, resourceType);
        this.connections.push(connection);
        connection.addToLayer(this.layer);

        // Update node connections
        fromNode.outputs.push(toNode.id);
        toNode.inputs.push(fromNode.id);

        this.layer.draw();
        log(`Connected ${fromNode.buildingDef.name} -> ${toNode.buildingDef.name} (${resourceType})`);
        return true;
    }

    // Check if two nodes can be connected
    areNodesCompatible(fromNode, toNode) {
        const fromDef = fromNode.buildingDef;
        const toDef = toNode.buildingDef;

        // From node must produce something
        if (!fromDef.production || Object.keys(fromDef.production).length === 0) {
            return false;
        }

        // To node must consume something
        if (!toDef.consumption || Object.keys(toDef.consumption).length === 0) {
            return false;
        }

        // Check if any produced resource matches any consumed resource
        const producedResources = Object.keys(fromDef.production);
        const consumedResources = Object.keys(toDef.consumption);

        return producedResources.some(r => consumedResources.includes(r));
    }

    // Get the resource type that flows through this connection
    getConnectionResourceType(fromNode, toNode) {
        const fromDef = fromNode.buildingDef;
        const toDef = toNode.buildingDef;

        const producedResources = Object.keys(fromDef.production);
        const consumedResources = Object.keys(toDef.consumption);

        // Return first matching resource
        return producedResources.find(r => consumedResources.includes(r)) || null;
    }

    // Delete connection by ID
    deleteConnection(connectionId) {
        const index = this.connections.findIndex(c => c.id === connectionId);
        if (index !== -1) {
            const connection = this.connections[index];

            // Update nodes
            const fromNode = connection.fromNode;
            const toNode = connection.toNode;
            fromNode.outputs = fromNode.outputs.filter(id => id !== toNode.id);
            toNode.inputs = toNode.inputs.filter(id => id !== fromNode.id);

            // Remove from layer
            connection.removeFromLayer();
            this.connections.splice(index, 1);
            this.layer.draw();
            log(`Connection deleted: ${connectionId}`);
        }
    }

    // Update all connection positions (call when nodes are dragged)
    updateConnections() {
        this.connections.forEach(connection => {
            connection.updatePosition();
        });
    }

    // Handle node click for connection mode
    onNodeClick(node) {
        if (this.selectedNode === null) {
            // First click - select source node
            this.selectedNode = node;
            node.setSelected(true);
            this.layer.draw();
            log(`Selected ${node.buildingDef.name} as connection source`);
        } else {
            // Second click - try to create connection
            this.tryCreateConnection(this.selectedNode, node);

            // Deselect source node
            this.selectedNode.setSelected(false);
            this.selectedNode = null;
            this.layer.draw();
        }
    }

    // Handle node double-click for upgrade panel
    onNodeDoubleClick(node) {
        // Deselect any selected node first
        if (this.selectedNode) {
            this.selectedNode.setSelected(false);
            this.selectedNode = null;
            this.layer.draw();
        }

        // Dispatch event for upgrade panel
        const event = new CustomEvent('openUpgradePanel', { detail: { node: node } });
        document.dispatchEvent(event);
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
            connections: this.connections.map(conn => conn.getSaveData())
        };
    }

    // Load save data
    loadSaveData(data) {
        this.clear();

        // Load nodes first
        if (data.nodes) {
            data.nodes.forEach(nodeData => {
                const node = FactoryNode.loadFromSaveData(nodeData);
                this.addNode(node);
            });
        }

        // Load connections after nodes are loaded
        if (data.connections) {
            data.connections.forEach(connData => {
                const connection = Connection.loadFromSaveData(connData, this.nodes);
                if (connection) {
                    this.connections.push(connection);
                    connection.addToLayer(this.layer);
                }
            });
        }

        this.layer.draw();
        log('Canvas loaded from save data');
    }
}
