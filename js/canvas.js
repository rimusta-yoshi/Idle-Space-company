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
                height: height
            });

            // Create layer
            this.layer = new Konva.Layer();
            this.stage.add(this.layer);

            log('Canvas initialized: ' + width + 'x' + height);
        } catch (error) {
            console.error('Failed to initialize Konva stage:', error);
            console.error('Container element:', container);
            console.error('Container parent:', container.parentElement);
        }

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

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
            this.layer.draw();
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
