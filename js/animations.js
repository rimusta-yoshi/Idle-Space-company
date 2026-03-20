// Animation Manager
// Visual-only animations — no game logic, no state mutations that affect saves.
// Called from game.js each tick via animManager.update(deltaTime, nodes).

const PULSE_MIN_INTERVAL = 0.4;  // fastest a node can pulse (seconds) — very fast machines
const PULSE_MAX_INTERVAL = 3.0;  // slowest a node can pulse (seconds)
const FLOAT_INTERVAL = 2.0;  // seconds between floating number bursts per storage node
const FLOAT_MIN      = 0.5;  // minimum accumulated amount before emitting a float
const FLOW_SPEED_MAX = 120;  // max dash-animation speed in pixels/sec
const FLOW_SPEED_PER = 30;   // pixels/sec per unit/sec of flow rate

class AnimationManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;

        this._pulseTimers   = {};  // nodeId -> seconds since last pulse
        this._floatTimers   = {};  // nodeId -> seconds since last float burst
        this._floatAccum    = {};  // nodeId -> accumulated inventory gain
        this._prevInventory = {};  // nodeId -> inventory value at previous tick
        this._floatContainer = null;
        this._flowAnim = null;

        this._createFloatContainer();
        this._startFlowAnimation();
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    _createFloatContainer() {
        const container = this.canvasManager.stage.container();
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
        container.appendChild(div);
        this._floatContainer = div;
    }

    _startFlowAnimation() {
        const layer = this.canvasManager.layer;
        this._flowAnim = new Konva.Animation((frame) => {
            this.canvasManager.connections.forEach(conn => {
                if (!conn.arrow || !(conn.flowRate > 0)) return;
                const pixelsPerSec = Math.min(conn.flowRate * FLOW_SPEED_PER, FLOW_SPEED_MAX);
                conn._dashOffset -= pixelsPerSec * frame.timeDiff / 1000;
                conn.arrow.dashOffset(conn._dashOffset);
            });
        }, layer);
        this._flowAnim.start();
    }

    // ── Per-tick update ───────────────────────────────────────────────────────

    // Called from game.js update() after calculateProduction and updateNodes.
    update(deltaTime, nodes) {
        nodes.forEach(node => {
            this._updateNodePulse(node, deltaTime);
            this._updateFloatNumber(node, deltaTime);
        });
    }

    // ── Node pulse ────────────────────────────────────────────────────────────
    // The status pip (small circle, top-right of each node) expands briefly then
    // contracts — like a heartbeat blip. Reads as "just produced a unit."
    // Each node has its own rate-derived cycle and a random phase offset so they
    // never strobe in unison.

    _updateNodePulse(node, deltaTime) {
        const def = node.buildingDef;
        if (def.isStorage || def.autoSell || !node.statusPip) return;

        const id = node.id;
        const cycleTime = this._getCycleTime(node);

        if (node.efficiency <= 0.01) {
            // Reset to phase offset so it fires promptly when it starts producing
            this._pulseTimers[id] = this._getPhaseOffset(id, cycleTime);
            return;
        }

        if (this._pulseTimers[id] === undefined) {
            // First time seeing this node — seed with phase offset so nodes start staggered
            this._pulseTimers[id] = this._getPhaseOffset(id, cycleTime);
        }

        this._pulseTimers[id] += deltaTime;
        if (this._pulseTimers[id] >= cycleTime) {
            this._pulseTimers[id] -= cycleTime; // subtract, don't reset — keeps rhythm stable
            this._triggerPipPulse(node);
        }
    }

    // Cycle time in seconds, derived from the node's base output rate.
    // Fast machines (high rate) get shorter cycles; slow machines get longer ones.
    _getCycleTime(node) {
        const def = node.buildingDef;
        let ratePerSec = 0;

        if (def.usesRecipes && node.activeRecipe) {
            ratePerSec = Object.values(node.activeRecipe.outputs)[0] || 0;
        } else {
            ratePerSec = Object.values(def.production || {})[0] || 0;
        }

        if (ratePerSec <= 0) return PULSE_MAX_INTERVAL;
        return Math.max(PULSE_MIN_INTERVAL, Math.min(PULSE_MAX_INTERVAL, 1.0 / ratePerSec));
    }

    // Deterministic pseudo-random phase offset so nodes aren't synchronized.
    // Same node ID always produces the same offset (stable across ticks).
    _getPhaseOffset(nodeId, cycleTime) {
        let h = 0;
        for (let i = 0; i < nodeId.length; i++) {
            h = Math.imul(31, h) + nodeId.charCodeAt(i) | 0;
        }
        return (Math.abs(h) % 1000) / 1000 * cycleTime;
    }

    _triggerPipPulse(node) {
        if (node._pulsing || !node.statusPip) return;
        node._pulsing = true;
        // Snap expand — quick burst outward
        node.statusPip.to({
            radius: 7,
            duration: 0.10,
            onFinish: () => {
                // Slow contract back — settles like a heartbeat
                node.statusPip.to({
                    radius: 4,
                    duration: 0.30,
                    onFinish: () => { node._pulsing = false; }
                });
            }
        });
    }

    // ── Floating +N numbers on storage nodes ──────────────────────────────────

    _updateFloatNumber(node, deltaTime) {
        const def = node.buildingDef;
        if (!def.isStorage || !node.storedResourceType) return;

        const id = node.id;

        // Track inventory change — on first encounter, seed prev to avoid a burst from load
        const prev = this._prevInventory[id] ?? node.inventory;
        const delta = node.inventory - prev;
        this._prevInventory[id] = node.inventory;

        if (delta > 0) {
            this._floatAccum[id] = (this._floatAccum[id] || 0) + delta;
        }

        this._floatTimers[id] = (this._floatTimers[id] || 0) + deltaTime;
        if (this._floatTimers[id] >= FLOAT_INTERVAL) {
            const accum = this._floatAccum[id] || 0;
            if (accum >= FLOAT_MIN) {
                this._floatNumber(node, accum);
            }
            this._floatAccum[id] = 0;
            this._floatTimers[id] = 0;
        }
    }

    _floatNumber(node, amount) {
        if (!this._floatContainer) return;
        const screenPos = this.canvasManager.worldToScreen(
            node.x + node.nodeWidth / 2,
            node.y + 12
        );
        const el = document.createElement('div');
        el.className = 'float-number';
        el.textContent = `+${formatNumber(Math.round(amount))}`;
        el.style.left = `${screenPos.x}px`;
        el.style.top  = `${screenPos.y}px`;
        this._floatContainer.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    destroy() {
        if (this._flowAnim) this._flowAnim.stop();
        if (this._floatContainer) this._floatContainer.remove();
    }
}
