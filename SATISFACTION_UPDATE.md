# Satisfaction Update — Briefing Doc
## Idle Space Company — Making the Factory Feel Alive

---

## What This Is

A browser-based idle/factory game. Vanilla JS, Konva.js canvas, no build system.
The player places building nodes on a canvas, connects them with arrows to form
production chains (ore → bars → components → ship parts), and earns credits by
selling goods.

The core loop works mechanically. The problem: **it doesn't feel satisfying to watch.**
The canvas is a static diagram. Numbers only update in a separate Warehouse app window.
There's no sense that anything is actually happening.

The goal of this update is to make the factory feel alive — animations, ambient feedback,
visible flow — without changing any game logic.

---

## The Satisfaction Gap (Analysis)

Games like Satisfactory and Dyson Sphere Program derive satisfaction from:
- **Watching items move** on belts/pipes — you see throughput visually
- **Machines that react** — they animate when working, idle when not
- **Numbers accumulating visibly** — you watch the counter tick up
- **The "snap" moment** — completing a chain produces a visible reaction

Our game currently has:
- Static arrows between nodes (labels update but arrows don't move)
- Nodes that look identical whether producing at 100% or 0%
- Inventory numbers buried inside the Warehouse app
- Credits that snap to new values rather than counting up

---

## Priority Feature List (in order)

### 1. Animated Connection Flow (HIGHEST IMPACT)
Dashes or dots moving along the arrow paths, speed proportional to actual flow rate.
Dead/disconnected connections are still. Full-rate connections move fast.
This single change transforms the canvas from a diagram into a factory.

### 2. Node Production Pulse
A brief glow or brightness flash on a node body each time it completes a production cycle.
Subtle — maybe 200ms fade. Makes the factory feel like it's breathing.

### 3. Floating +N on Storage Nodes
When a storage node's inventory ticks up, a small number (e.g. "+12") floats upward
from the node and fades out over ~1 second. Like RPG damage numbers.
Gives visible feedback on the canvas without opening any app window.

### 4. Credits Counter Animation
The credits number in the left sidebar should count up incrementally (tick toward
the target value over ~0.3s) rather than snapping. The player should be able to
watch their balance grow in real time.

### 5. Chain Activation Flash (medium effort)
When a new connection completes a valid production chain (all nodes go green),
briefly light up the entire chain — a fast pulse along all connected arrows and nodes.
The "click" moment that makes completing a chain feel rewarding.

---

## Technical Context

### Stack
- **Vanilla JS**, ES6 classes, loaded via `<script>` tags (globals, no ES modules, no bundler)
- **Konva.js** for canvas rendering (nodes, connections, layers)
- **Game loop**: `game.js` calls `calculateProduction()` each tick (~60fps via requestAnimationFrame)
- **No framework**, no TypeScript

### Key Files
```
js/game.js          — Core game loop, calculateProduction(), resource tick
js/canvas.js        — CanvasManager, node/connection management, Konva layer
js/node.js          — FactoryNode class, Konva rendering, updateDisplay()
js/connection.js    — Connection class, arrow rendering (Konva Arrow)
js/sidebar.js       — Left panel UI (credits display, building palette)
css/style.css       — All styles
```

### How Nodes Work (Konva)
Each `FactoryNode` is a Konva.Group containing:
- A Rect (background, coloured by building type)
- Text elements (name, rate labels)
- Small Circle "pip" (green/amber/red for efficiency)

Nodes are on `this.layer` in the CanvasManager. Call `this.layer.draw()` or
`this.layer.batchDraw()` after changes. Konva handles canvas re-rendering.

Node efficiency state:
- `node.efficiency` — 0 to 1 (computed each tick)
- `node.actualOutputRate` — object of `{ resourceType: ratePerSec }`
- `node.powerThrottled` — boolean, true when power is the binding constraint

### How Connections Work (Konva)
Each `Connection` is a Konva.Arrow between two nodes.
Key properties:
- `conn.fromNode`, `conn.toNode` — FactoryNode references
- `conn.resourceType` — string, the resource flowing through
- `conn.flowRate` — set each tick in `calculateProduction()`, ratePerSec
- The arrow is drawn as a Konva.Arrow on the same layer as nodes

Connection flow label is a Konva.Text positioned at the midpoint.
Arrow points: calculated from node bounding boxes, updated on node move.

### The Game Tick
`game.js` runs `update(deltaTime)` each frame:
1. `calculateProduction()` — computes efficiencies, sets `node.actualOutputRate`, `conn.flowRate`
2. `tick(deltaTime)` — advances inventories, credits
3. `sidebar.updateResources()` — updates credits display in DOM

The Konva canvas renders separately via Konva's own RAF loop —
but `layer.batchDraw()` must be called to push changes.
Node `updateDisplay()` rebuilds Konva text elements and calls `layer.batchDraw()`.

### Credits Display
In the DOM (not Konva). Element: `#credits-amount` in the left sidebar.
Currently set via `element.textContent = formatNumber(credits)` — snaps instantly.

### Existing Animation Patterns
There are currently NO animations in the codebase. You are starting from zero.
Konva supports tweens via `Konva.Tween` or `node.to({ ... })` shorthand.
For canvas animations, a separate RAF loop or Konva's animation API works well.

---

## Implementation Notes / Constraints

- **Do NOT use any npm packages or build tools.** CDN script tags only, or vanilla JS.
  Konva is already loaded. If you need a library, add a `<script>` tag to `index.html`.
- **Do NOT change game logic** — only visual/UI layer. `calculateProduction()` is off-limits.
- **Performance matters** — the canvas can have 20–50 nodes and many connections.
  Animated connections should be cheap. Consider a single shared animation loop
  rather than one RAF per connection.
- **Immutable state pattern** is used throughout — don't mutate `this.nodes` directly,
  use spread. For animations this doesn't apply (visual state is fine to mutate).
- Keep file sizes reasonable — node.js and canvas.js are already large.
  If you add significant animation code, consider a new `js/animations.js` file.

### Suggested Approach for Animated Connections
Instead of animating each Konva.Arrow individually, consider:
- A single `Konva.Animation` or RAF loop that updates a dash offset on all connections
- Konva arrows support `dash` and `dashOffset` properties
- Incrementing `dashOffset` each frame creates moving-dash effect
- Speed of movement = `conn.flowRate` (already available per-connection each tick)
- Zero flow rate = dashOffset doesn't change = static/dead line

Example concept:
```js
// In connection.js or animations.js
const anim = new Konva.Animation((frame) => {
  connections.forEach(conn => {
    if (!conn.arrow) return;
    const speed = conn.flowRate || 0;
    conn._dashOffset = (conn._dashOffset || 0) - speed * frame.timeDiff * 0.01;
    conn.arrow.dashOffset(conn._dashOffset);
  });
}, layer);
anim.start();
```

### Suggested Approach for Node Pulse
On each production tick, for nodes with efficiency > 0.01:
- `node.group.to({ opacity: 0.6, duration: 0.1 })` then back to 1.0
  OR change the background rect fill briefly to a brighter variant
- Trigger from inside `game.js` tick, or listen for a tick event

### Suggested Approach for Floating Numbers
Pure DOM overlay on top of the Konva canvas, absolutely positioned.
Konva nodes have world positions — use `canvas.worldToScreen(x, y)` to convert
to screen coordinates for DOM overlay placement.
Create a `<div>` with position:absolute, animate with CSS keyframe `@keyframes float-up`,
remove after animation ends.

### Suggested Approach for Credits Counter
Animate the DOM element `#credits-amount` using a simple lerp toward target value:
```js
// In sidebar.js updateResources()
this._creditsDisplay = this._creditsDisplay || 0;
this._creditsDisplay += (actualCredits - this._creditsDisplay) * 0.15;
element.textContent = formatNumber(Math.round(this._creditsDisplay));
```
Called every frame — smooth, no RAF needed since sidebar already updates on tick.

---

## Colour Palette (for any new visuals)
```
amber primary:   #c49a2a
amber dim:       #8a6b1a
amber dark bg:   #16120a
red (error):     #c45a2a
green (ok):      #2ac45a
canvas bg:       #0a0805
node borders:    building-specific (~#3a2e18 for generic)
```

---

## Files to Read First
Before writing any code, read these in full:
1. `js/connection.js` — understand how arrows are currently drawn/updated
2. `js/node.js` — understand Konva group structure (lines 60–200)
3. `js/game.js` lines 85–110 (game loop) and 240–360 (calculateProduction)
4. `index.html` lines 137–240 (factory app template, canvas container structure)

---

## What NOT to Do
- Don't add sound (out of scope for this update, assets don't exist yet)
- Don't change production numbers, efficiency calculations, or save format
- Don't add new buildings, resources, or game systems
- Don't refactor existing working code just to clean it up
- Don't add npm/webpack/bundler — this is intentionally dependency-free
