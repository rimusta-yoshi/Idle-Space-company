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

        // Connection drag state
        this.connectDrag = null; // { fromNode, line } while dragging

        // Node action bar state
        this.actionBarNode = null; // node whose action bar is currently shown
        this._actionBar = null;    // HTML element

        // Canvas size (large virtual canvas)
        this.canvasWidth = 2000;
        this.canvasHeight = 2000;

        // Pan and zoom state
        this.isPanning = false;
        this.lastPanPosition = { x: 0, y: 0 };
        this.scale = 1;
        this.minScale = 0.3;
        this.maxScale = 2;

        // Stored handler refs for cleanup (HIGH-1)
        this._onResize = () => this.handleResize();
        this._onKeyDown = null;
        this._onKeyUp = null;
        this._onWindowMouseUp = null;

        this.initialize();
    }

    initialize() {
        const container = this.rootElement.querySelector(`#${this.containerId}`);

        if (!container) {
            throw new Error(`Container ${this.containerId} not found in rootElement`);
        }

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        try {
            this.stage = new Konva.Stage({
                container: container,
                width: width,
                height: height,
                draggable: false
            });

            // Background layer for grid
            this.backgroundLayer = new Konva.Layer();
            this.stage.add(this.backgroundLayer);
            this.drawGrid();

            // Main layer for nodes and connections
            this.layer = new Konva.Layer();
            this.stage.add(this.layer);

            this.layer.position({ x: 0, y: 0 });
            this.layer.scale({ x: this.scale, y: this.scale });
            this.backgroundLayer.position({ x: 0, y: 0 });
            this.backgroundLayer.scale({ x: this.scale, y: this.scale });

            log('Canvas initialized: ' + width + 'x' + height + ' (virtual: ' + this.canvasWidth + 'x' + this.canvasHeight + ')');
        } catch (error) {
            throw new Error(`Failed to initialize Konva stage: ${error.message}`);
        }

        window.addEventListener('resize', this._onResize);
        this._createActionBar();
        this._setupStageClickToDismiss();
        this.setupPanAndZoom();
        this.setupEventListeners();
    }

    handleResize() {
        const container = this.rootElement.querySelector(`#${this.containerId}`);
        if (container && this.stage) {
            this.stage.width(container.clientWidth);
            this.stage.height(container.clientHeight);
            this.stage.batchDraw();
        }
    }

    drawGrid() {
        const gridSize = 50;
        const gridColor = '#3c2c0c';
        const gridOpacity = 0.3;

        for (let x = 0; x <= this.canvasWidth; x += gridSize) {
            this.backgroundLayer.add(new Konva.Line({
                points: [x, 0, x, this.canvasHeight],
                stroke: gridColor,
                strokeWidth: 1,
                opacity: gridOpacity
            }));
        }

        for (let y = 0; y <= this.canvasHeight; y += gridSize) {
            this.backgroundLayer.add(new Konva.Line({
                points: [0, y, this.canvasWidth, y],
                stroke: gridColor,
                strokeWidth: 1,
                opacity: gridOpacity
            }));
        }

        this.backgroundLayer.add(new Konva.Circle({
            x: 0, y: 0, radius: 10,
            fill: '#d4a832',
            opacity: 0.5
        }));

        this.backgroundLayer.add(new Konva.Text({
            x: 15, y: -5,
            text: '(0, 0)',
            fontSize: 12,
            fontFamily: 'Courier New',
            fill: '#d4a832',
            opacity: 0.7
        }));

        this.backgroundLayer.draw();
    }

    setupPanAndZoom() {
        if (!this.stage) return;

        const container = this.stage.container();
        let spacePressed = false;

        this._onKeyDown = (e) => {
            if (e.code === 'Space' && !spacePressed) {
                e.preventDefault();
                spacePressed = true;
                container.style.cursor = 'grab';
            }
            if (e.code === 'Escape') {
                this.cancelConnectionDrag();
                this.hideActionBar();
            }
        };

        this._onKeyUp = (e) => {
            if (e.code === 'Space') {
                spacePressed = false;
                container.style.cursor = 'default';
                if (this.isPanning) {
                    this.isPanning = false;
                    container.style.cursor = 'default';
                }
            }
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);

        this.stage.on('mousedown', (e) => {
            const isMiddleButton = e.evt.button === 1;
            const isSpacebarDrag = spacePressed && e.evt.button === 0;

            if (isMiddleButton || isSpacebarDrag) {
                e.evt.preventDefault();
                this.isPanning = true;
                this.lastPanPosition = { x: e.evt.clientX, y: e.evt.clientY };
                container.style.cursor = 'grabbing';
            }
        });

        this.stage.on('mousemove', (e) => {
            // Update connection drag line if active
            if (this.connectDrag) {
                this.updateConnectionDrag(e);
            }

            if (!this.isPanning) return;

            // Keep action bar in sync while panning
            if (this.actionBarNode) this._positionActionBar(this.actionBarNode);

            const dx = e.evt.clientX - this.lastPanPosition.x;
            const dy = e.evt.clientY - this.lastPanPosition.y;
            const currentPos = this.layer.position();
            const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };

            this.layer.position(newPos);
            this.backgroundLayer.position(newPos);
            this.lastPanPosition = { x: e.evt.clientX, y: e.evt.clientY };
            this.stage.batchDraw();
        });

        this.stage.on('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                container.style.cursor = spacePressed ? 'grab' : 'default';
            }
            if (this.connectDrag && e.evt.button === 0) {
                this.finishConnectionDrag(e);
            }
        });

        // Safety net: cancel drag if mouse released outside the stage container
        this._onWindowMouseUp = (e) => {
            if (this.connectDrag && e.button === 0 && !container.contains(e.target)) {
                this.cancelConnectionDrag();
            }
        };
        window.addEventListener('mouseup', this._onWindowMouseUp);

        container.addEventListener('contextmenu', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();

            const oldScale = this.scale;
            const pointer = this.stage.getPointerPosition();
            const mousePointTo = {
                x: (pointer.x - this.layer.x()) / oldScale,
                y: (pointer.y - this.layer.y()) / oldScale
            };

            const scaleBy = 1.1;
            const direction = e.evt.deltaY > 0 ? -1 : 1;
            this.scale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
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

            this.updateZoomIndicator();
            if (this.actionBarNode) this._positionActionBar(this.actionBarNode);
        });

        log('Pan and zoom controls initialized');
    }

    updateZoomIndicator() {
        const indicator = this.rootElement.querySelector('#zoom-indicator');
        if (indicator) {
            indicator.textContent = `Zoom: ${Math.round(this.scale * 100)}%`;
        }
    }

    setupEventListeners() {
        document.addEventListener('nodeDragged', () => {
            this.updateConnections();
            if (this.actionBarNode) this._positionActionBar(this.actionBarNode);
            this.layer.draw();
        });

        document.addEventListener('deleteConnection', (e) => {
            this.deleteConnection(e.detail.connectionId);
        });

        document.addEventListener('recipeChanged', (e) => {
            // Auto-assign preserves connections (they were just validated against the new recipe)
            // Manual recipe changes disconnect all because old connections may be incompatible
            if (!e.detail.autoAssigned) {
                this.disconnectAllForNode(e.detail.nodeId);
            }
        });
    }

    screenToWorld(screenX, screenY) {
        const layerPos = this.layer.position();
        const layerScale = this.layer.scaleX();
        return {
            x: (screenX - layerPos.x) / layerScale,
            y: (screenY - layerPos.y) / layerScale
        };
    }

    worldToScreen(worldX, worldY) {
        const layerPos = this.layer.position();
        const layerScale = this.layer.scaleX();
        return {
            x: worldX * layerScale + layerPos.x,
            y: worldY * layerScale + layerPos.y
        };
    }

    // ── Node Action Bar ─────────────────────────────────────────────────────

    _createActionBar() {
        const bar = document.createElement('div');
        bar.className = 'node-action-bar';
        bar.style.display = 'none';
        bar.innerHTML = `
            <span class="node-action-label"></span>
            <button class="node-action-btn node-action-btn--recipe" data-action="recipe" style="display:none">RECIPE</button>
            <button class="node-action-btn" data-action="upgrade">UPGRADE</button>
            <button class="node-action-btn node-action-btn--danger" data-action="delete">DELETE</button>
        `;

        bar.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action || !this.actionBarNode) return;
            e.stopPropagation();

            if (action === 'recipe') {
                document.dispatchEvent(new CustomEvent('openRecipePicker', {
                    detail: { node: this.actionBarNode }
                }));
            } else if (action === 'upgrade') {
                document.dispatchEvent(new CustomEvent('openUpgradePanel', {
                    detail: { node: this.actionBarNode }
                }));
            } else if (action === 'delete') {
                document.dispatchEvent(new CustomEvent('deleteNodeRequest', {
                    detail: { node: this.actionBarNode }
                }));
                this.hideActionBar();
            }
        });

        // Prevent bar clicks from bubbling to stage (which would re-hide it)
        bar.addEventListener('mousedown', (e) => e.stopPropagation());

        this.stage.container().appendChild(bar);
        this._actionBar = bar;
    }

    showActionBar(node) {
        this.actionBarNode = node;
        const label = this._actionBar.querySelector('.node-action-label');
        if (label) label.textContent = `${node.buildingDef.name.toUpperCase()}  LVL ${node.level}`;

        const recipeBtn = this._actionBar.querySelector('[data-action="recipe"]');
        if (recipeBtn) recipeBtn.style.display = node.buildingDef.usesRecipes ? '' : 'none';

        this._positionActionBar(node);
        this._actionBar.style.display = 'flex';
    }

    hideActionBar() {
        this.actionBarNode = null;
        if (this._actionBar) this._actionBar.style.display = 'none';
    }

    _positionActionBar(node) {
        if (!this._actionBar || !node) return;
        const screenPos = this.worldToScreen(node.x, node.y);
        const nodeWidthScreen = node.nodeWidth * this.scale;

        this._actionBar.style.left = `${screenPos.x + nodeWidthScreen / 2}px`;
        this._actionBar.style.top = `${screenPos.y - 6}px`;
        this._actionBar.style.transform = 'translateX(-50%) translateY(-100%)';
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mouseup', this._onWindowMouseUp);
        if (this.stage) this.stage.destroy();
    }

    addNode(node) {
        node.addToLayer(this.layer);
        this.nodes = [...this.nodes, node];

        // Port mousedown — start a connection drag from output port
        node.outputPort.on('mousedown', (e) => {
            e.cancelBubble = true;
            node.group.draggable(false);
            this.startConnectionDrag(node);
        });

        // Snap to grid on drag end
        node.group.on('dragend', () => {
            const raw = node.group.position();
            const snapped = {
                x: Math.round(raw.x / GRID_SNAP) * GRID_SNAP,
                y: Math.round(raw.y / GRID_SNAP) * GRID_SNAP
            };
            node.group.position(snapped);
            node.x = snapped.x;
            node.y = snapped.y;
            document.dispatchEvent(new CustomEvent('nodeDragged', { detail: { nodeId: node.id } }));
            this.layer.draw();
        });

        // Single click — show/toggle action bar
        node.group.on('click', (e) => {
            // Ignore clicks that ended a connection drag
            if (this.connectDrag) return;
            e.cancelBubble = true; // Don't bubble to stage (which hides bar)
            if (this.actionBarNode === node) {
                this.hideActionBar();
            } else {
                this.showActionBar(node);
            }
        });

        this.layer.draw();
        log(`Node added: ${node.buildingDef.name} at (${node.x}, ${node.y})`);
    }

    // Stage click on empty canvas → hide action bar
    _setupStageClickToDismiss() {
        this.stage.on('click', () => {
            this.hideActionBar();
        });
    }

    // ── Connection drag system ──────────────────────────────────────────────

    startConnectionDrag(fromNode) {
        fromNode.isDraggingConnection = true;
        fromNode.showPorts();

        // Create a temporary guide line
        const portWorldX = fromNode.x + fromNode.nodeWidth;
        const portWorldY = fromNode.y + fromNode.calcHeight() / 2;

        const line = new Konva.Line({
            points: [portWorldX, portWorldY, portWorldX, portWorldY],
            stroke: '#d4a832',
            strokeWidth: 2,
            dash: [8, 4],
            listening: false
        });

        this.layer.add(line);
        this.layer.draw();

        this.connectDrag = { fromNode, line };
        log(`Connection drag started from ${fromNode.buildingDef.name}`);
    }

    updateConnectionDrag(e) {
        if (!this.connectDrag) return;

        const { fromNode, line } = this.connectDrag;
        const portWorldX = fromNode.x + fromNode.nodeWidth;
        const portWorldY = fromNode.y + fromNode.calcHeight() / 2;

        const pointer = this.stage.getPointerPosition();
        const worldPos = this.screenToWorld(pointer.x, pointer.y);

        line.points(calcElbowPoints(portWorldX, portWorldY, worldPos.x, worldPos.y));
        this.layer.batchDraw();
    }

    finishConnectionDrag(e) {
        if (!this.connectDrag) return;

        const { fromNode } = this.connectDrag;

        // Find what Konva shape is under the pointer
        const pointer = this.stage.getPointerPosition();
        const shape = this.layer.getIntersection(pointer);

        if (shape) {
            // Walk up to find the group with a nodeRef
            let target = shape;
            let toNode = null;

            while (target) {
                if (target.nodeRef) {
                    toNode = target.nodeRef;
                    break;
                }
                target = target.getParent ? target.getParent() : null;
            }

            if (toNode && toNode !== fromNode) {
                this.tryCreateConnection(fromNode, toNode);
            }
        }

        this.cleanupConnectionDrag();
    }

    cancelConnectionDrag() {
        if (!this.connectDrag) return;
        this.cleanupConnectionDrag();
    }

    cleanupConnectionDrag() {
        if (!this.connectDrag) return;

        const { fromNode, line } = this.connectDrag;
        line.destroy();
        fromNode.isDraggingConnection = false;
        fromNode.group.draggable(true);
        fromNode.hidePorts();
        this.connectDrag = null;
        this.layer.draw();
    }

    // ── Connection management ───────────────────────────────────────────────

    tryCreateConnection(fromNode, toNode) {
        if (fromNode === toNode) {
            log('Cannot connect node to itself');
            return false;
        }

        const existing = this.connections.find(c =>
            c.fromNode === fromNode && c.toNode === toNode
        );
        if (existing) {
            log('Connection already exists');
            return false;
        }

        if (!this.areNodesCompatible(fromNode, toNode)) {
            log(`Cannot connect ${fromNode.buildingDef.name} to ${toNode.buildingDef.name}`);
            return false;
        }

        const resourceType = this.getConnectionResourceType(fromNode, toNode);
        if (!resourceType) {
            log('No compatible resource found between nodes');
            return false;
        }

        const connection = new Connection(fromNode, toNode, resourceType);
        this.connections = [...this.connections, connection];
        connection.addToLayer(this.layer);

        fromNode.outputs = [...fromNode.outputs, toNode.id];
        toNode.inputs = [...toNode.inputs, fromNode.id];

        // Storage node: lock in resource type on first connection
        if (toNode.buildingDef.isStorage && !toNode.storedResourceType) {
            toNode.storedResourceType = resourceType;
            toNode.updateDisplay();
        }

        // Auto-assign recipe if the destination is an unassigned recipe building
        // and the connected inputs now uniquely resolve to one recipe
        if (toNode.buildingDef.usesRecipes && !toNode.assignedRecipe) {
            this._tryAutoAssignRecipe(toNode);
        }

        this.layer.draw();
        log(`Connected ${fromNode.buildingDef.name} -> ${toNode.buildingDef.name} (${resourceType})`);
        return true;
    }

    _tryAutoAssignRecipe(node) {
        // Gather the resource types currently connected as inputs to this node
        const connectedInputTypes = this.connections
            .filter(c => c.toNode === node)
            .map(c => c.resourceType);

        if (connectedInputTypes.length === 0) return;

        // Find recipes whose input keys exactly match the connected resource types
        const allRecipes = getRecipesForBuilding(node.buildingType);
        const matches = allRecipes.filter(recipe => {
            const required = Object.keys(recipe.inputs);
            return required.length === connectedInputTypes.length &&
                   required.every(r => connectedInputTypes.includes(r));
        });

        if (matches.length === 1) {
            // Set directly — bypass setRecipe()'s recipeChanged event which would
            // trigger disconnectAllForNode and remove the connection we just made
            node.assignedRecipe = matches[0];
            node.updateDisplay();
            log(`Auto-assigned recipe: ${matches[0].id} for ${node.buildingDef.name}`);
        }
    }

    areNodesCompatible(fromNode, toNode) {
        const fromDef = fromNode.buildingDef;
        const toDef = toNode.buildingDef;

        // Resolve what fromNode produces
        let producedResources;
        if (fromDef.isStorage) {
            // Storage outputs its stored resource type (must already be set)
            if (!fromNode.storedResourceType) return false;
            producedResources = [fromNode.storedResourceType];
        } else if (fromDef.usesRecipes) {
            if (!fromNode.assignedRecipe) return false;
            producedResources = Object.keys(fromNode.assignedRecipe.outputs);
        } else {
            if (!fromDef.production || Object.keys(fromDef.production).length === 0) return false;
            producedResources = Object.keys(fromDef.production);
        }

        if (producedResources.length === 0) return false;

        // Storage node as destination: accepts any non-credits, non-power resource
        // but only the same type if already committed
        if (toDef.isStorage) {
            const produced = producedResources.find(r => r !== 'credits' && r !== 'power');
            if (!produced) return false;
            if (toNode.storedResourceType && toNode.storedResourceType !== produced) return false;
            return true;
        }

        if (toDef.autoSell) {
            return producedResources.some(r => r !== 'credits');
        }

        if (toDef.usesRecipes) {
            if (!toNode.assignedRecipe) {
                const allRecipes = getRecipesForBuilding(toNode.buildingType);
                return allRecipes.some(r => producedResources.some(p => Object.keys(r.inputs).includes(p)));
            }
            return producedResources.some(type => Object.keys(toNode.assignedRecipe.inputs).includes(type));
        }

        if (!toDef.consumption || Object.keys(toDef.consumption).length === 0) return false;
        return producedResources.some(r => Object.keys(toDef.consumption).includes(r));
    }

    getConnectionResourceType(fromNode, toNode) {
        const fromDef = fromNode.buildingDef;
        const toDef = toNode.buildingDef;

        // Resolve what fromNode produces
        let producedResources;
        if (fromDef.isStorage) {
            if (!fromNode.storedResourceType) return null;
            producedResources = [fromNode.storedResourceType];
        } else if (fromDef.usesRecipes) {
            if (!fromNode.assignedRecipe) return null;
            producedResources = Object.keys(fromNode.assignedRecipe.outputs);
        } else {
            producedResources = Object.keys(fromDef.production || {});
        }

        if (toDef.isStorage) {
            return producedResources.find(r => r !== 'credits' && r !== 'power') || null;
        }

        if (toDef.autoSell) {
            return producedResources.find(r => r !== 'credits') || null;
        }

        if (toDef.usesRecipes) {
            if (!toNode.assignedRecipe) {
                const allRecipes = getRecipesForBuilding(toNode.buildingType);
                for (const recipe of allRecipes) {
                    const match = producedResources.find(p => Object.keys(recipe.inputs).includes(p));
                    if (match) return match;
                }
                return null;
            }
            const inputKeys = Object.keys(toNode.assignedRecipe.inputs);
            return producedResources.find(r => inputKeys.includes(r)) || null;
        }

        const consumedResources = Object.keys(toDef.consumption || {});
        return producedResources.find(r => consumedResources.includes(r)) || null;
    }

    disconnectAllForNode(nodeId) {
        const toRemove = this.connections.filter(
            c => c.fromNode.id === nodeId || c.toNode.id === nodeId
        );
        toRemove.forEach(c => this.deleteConnection(c.id));
    }

    deleteConnection(connectionId) {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            const { fromNode, toNode } = connection;

            fromNode.outputs = fromNode.outputs.filter(id => id !== toNode.id);
            toNode.inputs = toNode.inputs.filter(id => id !== fromNode.id);

            connection.removeFromLayer();
            this.connections = this.connections.filter(c => c.id !== connectionId);

            // If a storage node loses all inputs, clear its committed resource type
            if (toNode.buildingDef?.isStorage) {
                const stillHasInputs = this.connections.some(c => c.toNode.id === toNode.id);
                if (!stillHasInputs) {
                    toNode.storedResourceType = null;
                    toNode.inventory = 0;
                    toNode.updateDisplay();
                }
            }

            this.layer.draw();
            log(`Connection deleted: ${connectionId}`);
        }
    }

    updateConnections() {
        this.connections.forEach(connection => connection.updatePosition());
    }

    // ── Node management ─────────────────────────────────────────────────────

    removeNode(nodeId) {
        // Clean up all connections involving this node first (HIGH-3)
        const orphaned = this.connections.filter(
            c => c.fromNode.id === nodeId || c.toNode.id === nodeId
        );
        orphaned.forEach(c => this.deleteConnection(c.id));

        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.removeFromLayer();
            this.nodes = this.nodes.filter(n => n.id !== nodeId);
            this.layer.draw();
            log(`Node removed: ${nodeId}`);
        }
    }

    getNode(nodeId) {
        return this.nodes.find(n => n.id === nodeId);
    }

    updateNodes() {
        this.nodes.forEach(node => node.updateDisplay());
        this.layer.draw();
    }

    clear() {
        this.nodes.forEach(node => node.removeFromLayer());
        this.nodes = [];
        this.connections = [];
        this.layer.destroyChildren();
        this.layer.draw();
        log('Canvas cleared');
    }

    // ── Persistence ──────────────────────────────────────────────────────────

    getSaveData() {
        return {
            nodes: this.nodes.map(node => node.getSaveData()),
            connections: this.connections.map(conn => conn.getSaveData())
        };
    }

    loadSaveData(data) {
        this.clear();

        if (data.nodes) {
            data.nodes.forEach(nodeData => {
                const node = FactoryNode.loadFromSaveData(nodeData);
                this.addNode(node);
            });
        }

        if (data.connections) {
            data.connections.forEach(connData => {
                const connection = Connection.loadFromSaveData(connData, this.nodes);
                if (connection) {
                    this.connections = [...this.connections, connection];
                    connection.addToLayer(this.layer);
                }
            });
        }

        this.layer.draw();
        log('Canvas loaded from save data');
    }
}
