# Idle Space Company - Implementation Plan

## Overview
Build a web-based **visual factory builder + idle game** with space theme. Players drag-and-drop factories onto a canvas, connect them with production lines, and watch resources flow through their factory network. Think **Factorio meets idle game meets Figma's node editor** in a retro virtual OS aesthetic.

**Target:** Vertical slice with visual factory builder on one page (resource extraction → manufacturing → selling)

---

## Core Unique Features

1. **Visual Factory Building:** Drag buildings from sidebar onto canvas, connect them to create production chains
2. **Multi-Page Factories:** Create separate "rooms" or "facilities" (like Figma pages) for different production areas
3. **Logistics Progression:** Pages start isolated (early game), unlock supply lines later to connect them (mid-game)
4. **Idle Automation:** Factories run continuously, even when offline
5. **Virtual OS Theme:** Terminal-style UI, retro aesthetic, "remote worker" theme

---

## Technology Stack

**JavaScript (ES6+) with Konva.js for canvas**

**Rationale:**
- **Konva.js:** Beginner-friendly canvas library for drag-and-drop, shapes, and interactions
- **HTML5 Canvas:** Native browser technology for visual factory builder
- **Minimal tooling:** No build tools, just include Konva via CDN
- **Cloud-ready:** Same save architecture works for future cloud saves
- **Steam-ready:** Electron wrapper later

**Stack:**
- HTML5 Canvas via Konva.js (visual factory builder)
- CSS3 (terminal/retro OS theme)
- Vanilla JavaScript ES6+ (game logic)
- localStorage API (designed for cloud migration)
- Chrome DevTools for debugging
- Git for version control

**Why Konva.js:**
- Drag-and-drop built-in
- Event handling (click, hover, drag)
- Shape primitives (rectangles, lines, text)
- Simpler than Fabric.js for beginners
- Good documentation and examples

---

## Project Structure

```
Idle-Space-company/
├── index.html                 # Main HTML file
├── css/
│   └── style.css             # Terminal/Virtual OS theme styling
├── js/
│   ├── main.js               # Game initialization & main loop
│   ├── game.js               # Core GameState class
│   ├── canvas.js             # Canvas manager (Konva.js wrapper)
│   ├── factory-page.js       # Multi-page/room system
│   ├── node.js               # Factory node (building on canvas)
│   ├── connection.js         # Connection lines between nodes
│   ├── resources.js          # Resource management
│   ├── production.js         # Production chain logic
│   ├── logistics.js          # Inter-page resource transfers
│   ├── upgrades.js           # Upgrade system
│   ├── save.js               # Save/load system (cloud-ready)
│   ├── offline.js            # Offline progress (2hr cap)
│   ├── sidebar.js            # Left/right sidebar UI
│   ├── ui.js                 # UI update & rendering
│   └── utils.js              # Helper functions
├── data/
│   ├── buildings-data.js     # Building definitions
│   ├── resources-data.js     # Resource definitions
│   └── upgrades-data.js      # Upgrade definitions
└── README.md
```

**Design Principle:**
- Canvas system separate from game logic
- Each factory page is independent (until logistics unlocked)
- Data-driven content in `/data` folder

---

## Core Game Systems

### 1. Visual Factory Builder (Canvas System)
**The core unique feature!**

- **Konva.js canvas** for drag-and-drop factory building
- **Left sidebar:** Resource/building inventory (what you own)
- **Right sidebar:** Building palette (drag buildings onto canvas)
- **Center canvas:** Visual factory builder
  - Drag buildings from sidebar onto canvas
  - Click buildings to connect them (production lines)
  - Buildings show production rates (e.g., "60/MIN")
  - Connections show resource type flowing through

**Factory Node Structure:**
```javascript
{
  id: "node_1",
  buildingType: "oreMiner",
  x: 100, y: 100,
  inputs: [],  // Connected input nodes
  outputs: ["node_2", "node_3"],  // Connected output nodes
  production: { ore: 1.0 },  // Per second
  upgrades: { level: 1 }
}
```

### 2. Multi-Page Factory System
- Each page is a separate factory "room" or "facility"
- Create new pages like Figma (tab system at top)
- **Early game:** Pages are isolated (no resource sharing)
- **Mid game:** Unlock logistics to transfer resources between pages
- **Design reason:** Forces simple factories early, complex supply chains later

**Page Structure:**
```javascript
{
  id: "page_1",
  name: "Mining Facility",
  nodes: [ /* factory nodes */ ],
  connections: [ /* node connections */ ],
  locked: false
}
```

### 3. Resource Management
- **Global shared storage** across all pages
- Resources: `{ current: amount, capacity: max, production: perSecond }`
- Resources produced on any page add to global pool
- Resources consumed from global pool

### 4. Production Chain System
- Production calculated per factory page
- Each node checks inputs → processes → outputs to global storage
- Nodes show production rates visually (e.g., "Ore: 60/MIN")
- Nodes "stall" if inputs unavailable (visual indication)

### 5. Logistics System (Unlockable)
**Unlocked mid-game to connect pages**

- **Early game:** Pages can't explicitly route resources between each other (though all use global storage)
- **After logistics unlock:** Can create "supply line" contracts:
  - "Send all Iron from Page 1 → Page 2"
  - Costs credits or haulers
  - Creates explicit resource flows between pages
- **Purpose:** Makes multi-page factories meaningful, not just organizational

### 6. Upgrade System
- Click on factory nodes to open upgrade menu:
  - **Upgrade:** Increase production rate (level 1 → 2 → 3)
  - **Set Limit:** Cap output (don't over-produce)
  - **Auto Sell:** Automatically sell output for credits
- Permanent global upgrades (production multipliers, storage, unlock new buildings)

### 7. Game Loop
- Fixed 100ms tick rate (10 FPS)
- `requestAnimationFrame` for canvas rendering
- Delta time for consistent production speed
- Offline progress calculation on load

### 8. Save System
- Auto-save every 30 seconds to localStorage
- Save canvas state (node positions, connections)
- Save all pages (multiple factory layouts)
- **Cloud-ready:** JSON structure designed for API migration

### 9. Offline Progress
- Calculate time away on load
- 2-hour cap (beginner-friendly)
- Simulate production for each page
- Resource capacity limits apply

---

## Implementation Phases

### Phase 1: Canvas Foundation (Week 1-3) - "Drag and Drop Works"
**Goal: Drag buildings onto canvas, place them, display resources**

**Week 1: Setup & Layout**
1. Create project folder structure
2. Build `index.html` with 3-panel layout:
   - Left sidebar (resources display)
   - Center canvas (factory builder)
   - Right sidebar (building palette)
3. Add terminal/retro OS styling (CSS)
4. Include Konva.js via CDN (`<script src="https://unpkg.com/konva@9/konva.min.js"></script>`)
5. Initialize Konva stage and layer
6. Draw test shapes on canvas (rectangles, text)

**Week 2: Drag-and-Drop Basics**
7. Create right sidebar building palette:
   - Show 2 buildings: "Ore Miner", "Smelter"
   - Simple HTML div elements
8. Implement drag from sidebar → canvas:
   - Use HTML5 drag-and-drop API
   - On drop, create Konva shape (rectangle + text)
9. Factory nodes appear at drop location:
   - Rectangle with building name
   - Show building type
10. Test: Drag multiple buildings onto canvas

**Week 3: Resource Display**
11. Create left sidebar resource display:
   - Show "Ore: 0"
   - Show "Metal: 0"
   - Show "Credits: 100" (starting)
12. Connect resource manager to sidebar
13. Update display in real-time

**Deliverables:**
- ✓ Can drag "Ore Miner" from right sidebar onto canvas
- ✓ Factory node appears as rectangle with label
- ✓ Can place multiple buildings
- ✓ Left sidebar shows current resources (static for now)
- ✓ Terminal-style retro UI looks cool

**Critical Files:**
- [index.html](Idle-Space-company/index.html) - 3-panel layout
- [css/style.css](Idle-Space-company/css/style.css) - Terminal theme
- [js/main.js](Idle-Space-company/js/main.js) - Initialize Konva
- [js/canvas.js](Idle-Space-company/js/canvas.js) - Canvas manager
- [js/node.js](Idle-Space-company/js/node.js) - Factory node class
- [js/sidebar.js](Idle-Space-company/js/sidebar.js) - Sidebar UI
- [data/buildings-data.js](Idle-Space-company/data/buildings-data.js) - Building definitions

---

### Phase 2: Connections & Production (Week 4-6) - "Factories Produce"
**Goal: Connect nodes, factories produce resources, see numbers go up**

**Week 4: Node Connections**
1. Implement connection mode:
   - Click node #1, then click node #2 → draw line between them
   - Store connections in data structure
2. Draw connection lines with Konva:
   - Line between node centers
   - Arrow pointing to output node
3. Connection validation:
   - Only connect compatible nodes (ore miner → smelter ✓, ore miner → ore miner ✗)
4. Delete connections (right-click line)

**Week 5: Production Logic**
5. Implement game loop (100ms tick, 10 FPS)
6. Nodes produce resources:
   - Ore Miner: +1 ore per second → global storage
   - Display production rate on node ("1.0/s")
7. Update left sidebar with current resources
8. Numbers update in real-time

**Week 6: Consumption & Chains**
9. Add Smelter node (consumes ore, produces metal):
   - Check if ore available
   - Consume ore from global storage
   - Produce metal to global storage
   - Show "STALLED" if no ore available
10. Production chain works: Ore Miner → Smelter
11. Display production/consumption rates on nodes
12. Test: Build chain of 3-4 buildings

**Deliverables:**
- ✓ Can connect nodes with lines
- ✓ Ore Miner produces ore automatically
- ✓ Smelter consumes ore, produces metal
- ✓ Resources update in left sidebar
- ✓ Production chain visually connected and working

**Critical Files:**
- [js/connection.js](Idle-Space-company/js/connection.js) - Connection lines
- [js/production.js](Idle-Space-company/js/production.js) - Production logic
- [js/resources.js](Idle-Space-company/js/resources.js) - Resource manager
- [js/game.js](Idle-Space-company/js/game.js) - Game loop
- [data/resources-data.js](Idle-Space-company/data/resources-data.js) - Resource definitions

---

### Phase 3: Click to Build & Core Systems (Week 7-9) - "Actually Playable"
**Goal: Purchase buildings, save/load, offline progress, upgrades**

**Week 7: Building Economy**
1. Add credits as starting resource (100 credits)
2. Buildings cost credits to place:
   - Ore Miner: 10 credits
   - Smelter: 50 credits
3. Deduct credits when dragging building onto canvas
4. Show "Can't afford" message if insufficient credits
5. Cost scaling: Each building costs more (1.15x multiplier)

**Week 8: Save System & Offline**
6. Implement save/load system:
   - Save node positions, connections, resources
   - Save to localStorage
7. Auto-save every 30 seconds
8. Load on page refresh (restore factory layout)
9. Offline progress calculation:
   - Calculate time away
   - Simulate production (2-hour cap)
   - Show "Welcome back" message

**Week 9: Upgrades & Polish**
10. Click node to open upgrade menu:
    - Upgrade: Level 1 → 2 (2x production)
    - Set Limit: Cap production
    - Auto Sell: Sell output automatically
11. Format large numbers (1.23K, 1.23M, 1.23B)
12. Balance tuning (playtest 30-60 minutes)

**Deliverables:**
- ✓ Building placement costs credits
- ✓ Can upgrade individual factory nodes
- ✓ Save/load preserves entire factory layout
- ✓ Offline progress works (2-hour cap)
- ✓ Game is fun for 30-60 minutes

**Critical Files:**
- [js/upgrades.js](Idle-Space-company/js/upgrades.js) - Node upgrade system
- [js/save.js](Idle-Space-company/js/save.js) - Save/load manager
- [js/offline.js](Idle-Space-company/js/offline.js) - Offline calculator
- [js/ui.js](Idle-Space-company/js/ui.js) - UI improvements
- [data/upgrades-data.js](Idle-Space-company/data/upgrades-data.js) - Upgrade definitions

---

### Phase 4: Multi-Page & Expansion (Week 10+) - "Complex Factories"
**Goal: Multi-page system, logistics, more content**

**Week 10-11: Multi-Page System**
1. Add page tabs at top of canvas:
   - "Page 1", "Page 2", "Page 3"
   - Click tab to switch pages
2. Each page has independent canvas:
   - Own set of nodes and connections
   - Save/load all pages
3. Create new page button (+)
4. Rename pages ("Mining Facility", "Smelting Facility")

**Week 12-13: Logistics Unlock**
5. Add logistics system (mid-game unlock):
   - Unlock at 10 buildings placed
   - "Supply Lines" menu appears
6. Create supply line between pages:
   - "Send Iron from Page 1 → Page 2"
   - Costs credits or haulers
7. Test: Build ore mining on Page 1, smelting on Page 2

**Week 14+: Content Expansion**
8. Add 5-10 more buildings:
   - Complex production chains (4-5 steps)
   - Specialized buildings
9. Add 10-15 more upgrades
10. Visual polish:
    - Node animations (pulse when producing)
    - Particle effects on connections (optional)
    - Better terminal theme
11. Sound effects (optional)
12. Balance tuning (1-2 hour playthrough)

**Deliverables:**
- ✓ Multi-page factory system works
- ✓ Logistics connects pages (mid-game)
- ✓ 10+ buildings, 15+ upgrades
- ✓ Game has 2-3 hours of content
- ✓ Ready for second planet/more content

**Critical Files:**
- [js/factory-page.js](Idle-Space-company/js/factory-page.js) - Page system
- [js/logistics.js](Idle-Space-company/js/logistics.js) - Inter-page transfers
- [data/buildings-data.js](Idle-Space-company/data/buildings-data.js) - More buildings

---

## Key Design Patterns

### Manager Classes
Each system is a self-contained class:
```javascript
class ResourceManager { }
class BuildingManager { }
class UpgradeManager { }
```

### Data-Driven Design
Game content lives in `/data` files:
```javascript
const BUILDINGS = {
    oreMiner: {
        name: "Ore Mining Drill",
        baseCost: { credits: 10 },
        production: { ore: 0.5 }
    }
};
```

### State Separation
- **Definitions** (static): Building stats, resource info
- **State** (dynamic): Current counts, player progress

### Dependency Injection
Systems pass references to each other:
```javascript
class BuildingManager {
    constructor(resourceManager) {
        this.resources = resourceManager;
    }
}
```

---

## Critical Implementation Details

### Resource Structure
```javascript
{
    ore: {
        name: "Raw Ore",
        current: 0,
        capacity: 100,
        production: 0, // per second
        icon: "⛏️"
    }
}
```

### Building Cost Scaling
```javascript
cost = baseCost × (1.15 ^ buildingsOwned)
```

### Production Rate Calculation
```javascript
totalProduction = buildingRate × buildingCount × upgradeMultipliers
```

### Save Data Format (Cloud-Ready)
```javascript
{
    version: 1,
    timestamp: Date.now(),
    resources: { /* resource state */ },
    buildings: { /* building counts */ },
    upgrades: [ /* purchased upgrade IDs */ ]
}
```

---

## Migration Path to Cloud Saves & Steam

### Current: localStorage (Phase 1-3)
- Save entire game state as JSON
- localStorage.setItem('save', JSON.stringify(gameState))
- No external dependencies

### Future: Cloud Saves (Month 3-6)
- Add user authentication (Firebase Auth or similar)
- POST same JSON to cloud API: `/api/save`
- Sync: localStorage ↔ cloud on save/load
- Conflict resolution: newest timestamp wins
- **Code changes minimal** - same save data structure

### Future: Steam (Month 6-12)
- Wrap game in Electron
- Package for Windows/Mac/Linux
- Add Steam API integration (achievements, cloud saves)
- **Core game code unchanged** - just wrapped
- Steam-specific features (trading cards, workshop)

---

## First Three Weeks Development Plan

### Week 1: Canvas Setup & Layout
**Day 1-2: HTML Structure**
- Create folder structure (js/, css/, data/)
- Build `index.html` with 3-panel layout:
  - Left sidebar: `<div id="resources-sidebar">`
  - Center: `<div id="canvas-container">`
  - Right sidebar: `<div id="building-palette">`
- Add Konva.js via CDN
- Terminal CSS theme (green on black)

**Day 3-4: Initialize Canvas**
- Initialize Konva stage and layer in `main.js`
- Draw test shapes (rectangles, text, lines)
- Verify canvas renders correctly

**Day 5-7: Test Interactions**
- Add click handler to canvas
- Add hover effects to shapes
- Test canvas responsiveness

### Week 2: Drag-and-Drop
**Day 1-3: Building Palette**
- Create right sidebar with building list
- Style as retro terminal buttons
- Add 2 buildings: "Ore Miner", "Smelter"

**Day 4-5: Drag from Sidebar**
- Implement HTML5 drag-and-drop
- Drag building div from sidebar
- Get drop coordinates on canvas

**Day 6-7: Create Nodes**
- On drop, create Konva rectangle + text
- Position at drop location
- Test: Drag multiple buildings onto canvas

### Week 3: Resource Display
**Day 1-3: Left Sidebar**
- Create resource display:
  - Ore: 0
  - Metal: 0
  - Credits: 100
- Style with terminal theme

**Day 4-5: Resource Manager**
- Create `resources.js` with ResourceManager class
- Track resources in object
- Add/subtract resources

**Day 6-7: Connect to UI**
- Update left sidebar from ResourceManager
- Test: Manually change resources, see UI update
- **Milestone:** Visual factory builder foundations complete!

---

## Testing & Verification Plan

### Manual Testing Checklist

**Phase 1: Canvas & Drag-Drop**
- [ ] Canvas renders correctly
- [ ] Can drag Ore Miner from right sidebar
- [ ] Ore Miner appears on canvas at drop location
- [ ] Can drag multiple buildings onto canvas
- [ ] Left sidebar shows resources
- [ ] Right sidebar shows building palette
- [ ] Terminal theme looks retro/cool

**Phase 2: Connections & Production**
- [ ] Can click two nodes to connect them
- [ ] Connection line appears between nodes
- [ ] Ore Miner produces ore (number goes up)
- [ ] Smelter consumes ore, produces metal
- [ ] Production rates display on nodes
- [ ] Nodes show "STALLED" when no inputs
- [ ] Resources update in left sidebar

**Phase 3: Core Systems**
- [ ] Building placement costs credits
- [ ] Can't place building without credits
- [ ] Can click node to open upgrade menu
- [ ] Upgrades increase production rate
- [ ] Save button saves factory layout
- [ ] Refresh page restores factory layout
- [ ] Auto-save triggers every 30 seconds
- [ ] Offline progress calculates correctly
- [ ] Numbers display cleanly (1.23K format)

### Balance Testing
- Play for 30 minutes and check:
  - Time to first building: ~30 seconds
  - Time to second building: ~2 minutes
  - Time to third building: ~5 minutes
  - Feels too slow? Increase production rates
  - Feels too fast? Decrease production rates

### Edge Cases to Test
- [ ] What happens with 0 resources?
- [ ] What happens if save data corrupted?
- [ ] What happens after 1 hour idle?
- [ ] Do costs scale correctly after 10 buildings?
- [ ] Do decimal numbers round properly?

### Browser Testing
- Test in Chrome (primary)
- Test in Firefox (secondary)
- Check console for errors
- Use DevTools to inspect game state

---

## Common Pitfalls to Avoid

### General Pitfalls
1. **Floating point errors:** Round values or use integers
2. **Save/load desync:** Recalculate production after loading
3. **Infinite loops:** Use delta time in game loop
4. **Memory leaks:** Clear intervals/timeouts properly
5. **Not testing edge cases:** Test with 0 resources, corrupted saves
6. **Over-engineering:** Build simplest thing first

### Canvas-Specific Pitfalls
7. **Canvas coordinate confusion:** Remember (0,0) is top-left, not bottom-left
8. **Forgetting to call layer.draw():** Changes won't appear without redrawing
9. **Creating too many shapes:** Each node should reuse shapes, not create new ones every frame
10. **Not handling canvas resize:** Test on different screen sizes
11. **Z-index issues:** Add shapes in correct order (connections first, then nodes)
12. **Drag outside canvas:** Check if drop coordinates are within canvas bounds

### Node Connection Pitfalls
13. **Invalid connections:** Validate that nodes are compatible before connecting
14. **Circular dependencies:** Prevent Node A → Node B → Node A loops
15. **Disconnected nodes:** Handle nodes with no inputs/outputs gracefully
16. **Connection rendering:** Update connection positions when nodes move

---

## Success Criteria for Vertical Slice

**Phase 1 Complete (Canvas Foundation):**
- ✓ Can drag buildings from sidebar onto canvas
- ✓ Buildings appear as visual nodes on canvas
- ✓ Left sidebar displays resources
- ✓ Right sidebar shows building palette
- ✓ Terminal/retro UI looks cool

**Phase 2 Complete (Production):**
- ✓ Can connect nodes with lines
- ✓ Ore Miner produces ore automatically
- ✓ Smelter consumes ore, produces metal
- ✓ Production chain visually works
- ✓ Resources update in real-time

**Phase 3 Complete (Full Vertical Slice):**
- ✓ Building placement costs credits
- ✓ Can upgrade individual nodes
- ✓ Save/load preserves factory layout
- ✓ Offline progress works (2-hour cap)
- ✓ Game is fun for 30-60 minutes
- ✓ Code is organized and understandable

**Phase 4 Complete (Multi-Page):**
- ✓ Multi-page system works
- ✓ Logistics connects pages
- ✓ 10+ buildings, 15+ upgrades
- ✓ 2-3 hours of content

**Nice to have (not required):**
- Animated particle effects on connections
- Sound effects
- Mobile/touch support
- Perfect balance

---

## Next Steps After Plan Approval

### Immediate First Steps
1. Create folder structure:
   ```
   Idle-Space-company/
   ├── index.html
   ├── css/style.css
   ├── js/ (empty files for now)
   └── data/ (empty files for now)
   ```

2. Build `index.html` with 3-panel layout:
   - Left sidebar: `<div id="resources-sidebar">`
   - Center: `<div id="canvas-container">`
   - Right sidebar: `<div id="building-palette">`
   - Include Konva.js via CDN

3. Add terminal CSS theme (green on black, monospace font)

4. Initialize Konva canvas in `main.js`:
   ```javascript
   const stage = new Konva.Stage({
     container: 'canvas-container',
     width: 800,
     height: 600
   });
   const layer = new Konva.Layer();
   stage.add(layer);
   ```

5. Draw test shapes to verify canvas works

6. Follow Phase 1 tasks week-by-week

### Timeline Estimate
- **Phase 1 (Canvas Foundation):** 3 weeks
- **Phase 2 (Production):** 3 weeks
- **Phase 3 (Core Systems):** 3 weeks
- **Total to vertical slice:** 9 weeks at few hours per week

**Phase 4 (Multi-page) optional:** 4+ weeks additional

### Pace Yourself
- Start with Phase 1, Week 1 only
- Don't try to build everything at once
- Test frequently (refresh browser after every change)
- Commit to git after each working feature

---

## Konva.js Basics (Quick Reference)

### Setup
```html
<script src="https://unpkg.com/konva@9/konva.min.js"></script>
<div id="container"></div>
```

```javascript
// Initialize stage (container for everything)
const stage = new Konva.Stage({
  container: 'container',
  width: 800,
  height: 600
});

// Create layer (like a canvas layer in Photoshop)
const layer = new Konva.Layer();
stage.add(layer);
```

### Creating Shapes
```javascript
// Rectangle (for factory nodes)
const rect = new Konva.Rect({
  x: 100,
  y: 100,
  width: 150,
  height: 80,
  fill: '#00ff00',
  stroke: '#00aa00',
  strokeWidth: 2,
  draggable: true
});

// Text (for labels)
const text = new Konva.Text({
  x: 100,
  y: 110,
  text: 'Ore Miner',
  fontSize: 16,
  fill: '#000000'
});

// Line (for connections)
const line = new Konva.Line({
  points: [100, 150, 300, 250], // [x1, y1, x2, y2]
  stroke: '#00ff00',
  strokeWidth: 2
});

// Add to layer and draw
layer.add(rect);
layer.add(text);
layer.add(line);
layer.draw(); // IMPORTANT: Must call draw() to render!
```

### Event Handling
```javascript
// Click event
rect.on('click', () => {
  console.log('Node clicked!');
});

// Drag events
rect.on('dragmove', () => {
  // Update connection line positions
  updateConnections();
  layer.draw();
});

// Hover events
rect.on('mouseenter', () => {
  rect.stroke('#ffff00'); // Highlight
  layer.draw();
});
rect.on('mouseleave', () => {
  rect.stroke('#00aa00'); // Normal
  layer.draw();
});
```

### Key Concepts
- **Stage:** Main container (one per canvas)
- **Layer:** Like Photoshop layers (organize shapes)
- **Shape:** Visual elements (rect, circle, text, line)
- **Always call `layer.draw()`** after changes!
- **Drag-and-drop:** Set `draggable: true` on shapes

---

## Resources for Learning

### Must-Read
- **Konva.js Docs:** https://konvajs.org/docs/ (official tutorial)
- **Konva Examples:** https://konvajs.org/docs/sandbox/ (interactive examples)
- **JavaScript basics:** JavaScript.info (free, beginner-friendly)

### Helpful
- **Idle game math:** Reddit /r/incremental_games wiki
- **Factorio-style games:** Study other factory builders for inspiration
- **Node-based UI:** Look at Unreal Blueprints, Blender nodes for patterns

### Tools
- **Chrome DevTools:** For debugging JavaScript
- **Git basics:** GitHub "Hello World" guide
- **VS Code:** Best editor for web development (free)

---

## UI Layout Reference

```
┌──────────────────────────────────────────────────────────────────┐
│  IDLE SPACE COMPANY - Remote Worker Terminal                     │
├────────────┬────────────────────────────────────┬─────────────────┤
│            │                                    │                 │
│ RESOURCES  │          FACTORY CANVAS            │  BUILD PALETTE  │
│            │                                    │                 │
│ Ore: 150   │   ┌─────────┐                     │  ┌───────────┐  │
│ Metal: 45  │   │  Ore    │─────┐               │  │ Ore Miner │  │
│ Credits: 0 │   │  Miner  │     │               │  │ (10 cr)   │  │
│            │   │ 1.0/s   │     │               │  └───────────┘  │
│ Production │   └─────────┘     │               │                 │
│ Ore: +2/s  │                   ▼               │  ┌───────────┐  │
│ Metal: +1/s│              ┌─────────┐          │  │  Smelter  │  │
│            │              │ Smelter │          │  │ (50 cr)   │  │
│ Storage    │              │ 0.5/s   │          │  └───────────┘  │
│ Ore: 150/  │              └─────────┘          │                 │
│      200   │                                    │  ┌───────────┐  │
│            │   [Drag buildings here]            │  │  Seller   │  │
│            │                                    │  │ (100 cr)  │  │
│  [Save]    │                                    │  └───────────┘  │
│            │                                    │                 │
└────────────┴────────────────────────────────────┴─────────────────┘
```

### Layout Breakdown
- **Left Sidebar (200px):** Resource display, stats, save button
- **Center Canvas (600px+):** Visual factory builder with Konva.js
- **Right Sidebar (200px):** Building palette (drag from here)

---

## Questions to Revisit Later

These are punted to future phases:
- Multiple planets system (Phase 4+)
- Hauler upgrade details (Phase 4)
- Market dynamic pricing algorithm (Phase 4)
- Prestige system (Phase 4+)
- Mobile responsiveness (Phase 4)
- Sound effects (Phase 4)
- Particle animations on connections (Phase 4)

---

## Final Notes

**This is a more ambitious project than a traditional idle game** because of the visual canvas system. But it's also what makes your game unique! The Konva.js library will handle most of the heavy lifting for drag-and-drop and visual rendering.

**Key to success:**
1. Follow phases in order (don't jump ahead)
2. Test frequently (every few changes)
3. Commit to git after each working feature
4. Don't optimize prematurely
5. Focus on getting it working, then make it pretty

**Your unique hook:** Visual factory building + idle game + multi-page system + logistics progression. This combination doesn't exist in the idle game space - you're creating something new!

Focus on **Phase 1** first - get drag-and-drop working and you'll have the foundation for everything else!

---

# VIRTUAL OS TRANSFORMATION PLAN

## Overview
Transform the current fullscreen game into a virtual operating system environment where the game runs inside a resizable, movable window. Desktop should support multiple apps (future expansion).

## Current State (Phase 3 Complete)
- ✓ Fullscreen 3-panel layout (sidebars + canvas)
- ✓ Game logic in Game, Canvas, Resource managers
- ✓ Modal upgrade panel
- ✓ Konva canvas responds to container resize
- ✓ Save/load with localStorage
- ✓ Terminal green-on-black theme

## Target State
- Desktop OS shell with taskbar
- Game runs in resizable window
- Window controls: minimize, maximize, close, drag, resize
- App launcher for multiple apps
- Maintain retro terminal aesthetic
- Window state persists in saves

---

## Architecture Design

### Component Hierarchy
```
DesktopOS (root)
├── Desktop Background (wallpaper, icons)
├── Window Manager (manages all windows)
│   └── OSWindow instances
│       ├── Title Bar (drag handle, title, controls)
│       ├── Content Area (app content goes here)
│       └── Resize Handles (8 corners/edges)
└── Taskbar (bottom bar)
    ├── Start Button / App Launcher
    ├── Running Apps (minimize to taskbar)
    └── System Tray (clock, status)
```

### Key Classes

**DesktopOS** - Main orchestrator
- Initializes window manager, taskbar, desktop
- Manages app registry
- Handles desktop background clicks (deselect windows)

**WindowManager** - Window lifecycle manager
- Creates/destroys windows
- Z-index management (focus/unfocus)
- Window stacking and layering
- Tracks active window

**OSWindow** - Individual window instance
- Title bar with drag functionality
- Resize handles (8 points: corners + edges)
- Minimize/maximize/close buttons
- Content container for app
- State: position, size, maximized, minimized

**Taskbar** - Bottom system bar
- App launcher button
- Running app icons (click to focus/minimize)
- System tray (clock, resource usage)

**App (base class)** - Application interface
- `launch()` - Called when app window opens
- `close()` - Cleanup when app window closes
- `onResize()` - Handle window resize events
- `getSaveData()` / `loadSaveData()` - Persistence

**FactoryApp extends App** - Current game as an app
- Wraps existing Game class
- Hooks into window lifecycle
- Triggers canvas resize on window resize

---

## File Structure

### New Files
```
js/
├── os/
│   ├── desktop.js         # DesktopOS class
│   ├── window-manager.js  # WindowManager class
│   ├── os-window.js       # OSWindow class
│   ├── taskbar.js         # Taskbar class
│   └── app.js             # App base class
├── apps/
│   └── factory-app.js     # FactoryApp wrapping Game
```

### Modified Files
```
index.html          # New OS structure, game content moves to template
css/style.css       # Add OS, window, taskbar styles
js/main.js          # Initialize DesktopOS instead of Game
js/game.js          # Minor: export for FactoryApp to use
js/canvas.js        # Add ResizeObserver support
```

---

## HTML Structure

### New index.html
```html
<body>
  <div id="desktop">
    <!-- Desktop background -->
    <div id="desktop-background">
      <div class="desktop-icon" data-app="factory">
        <div class="icon">🏭</div>
        <div class="icon-label">Factory Manager</div>
      </div>
    </div>

    <!-- Windows container (managed by WindowManager) -->
    <div id="windows-container">
      <!-- Windows created dynamically here -->
    </div>

    <!-- Taskbar -->
    <div id="taskbar">
      <div class="taskbar-start">
        <button id="start-button">⚙ START</button>
      </div>
      <div class="taskbar-apps">
        <!-- Running app icons -->
      </div>
      <div class="taskbar-tray">
        <span id="system-clock">00:00</span>
      </div>
    </div>
  </div>

  <!-- Window template (cloned for each window) -->
  <template id="window-template">
    <div class="os-window">
      <div class="window-titlebar">
        <span class="window-icon">📦</span>
        <span class="window-title">Application</span>
        <div class="window-controls">
          <button class="window-btn minimize" title="Minimize">_</button>
          <button class="window-btn maximize" title="Maximize">□</button>
          <button class="window-btn close" title="Close">×</button>
        </div>
      </div>
      <div class="window-content">
        <!-- App content injected here -->
      </div>
      <div class="window-resize-handles">
        <div class="resize-handle n"></div>
        <div class="resize-handle e"></div>
        <div class="resize-handle s"></div>
        <div class="resize-handle w"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle se"></div>
        <div class="resize-handle sw"></div>
        <div class="resize-handle nw"></div>
      </div>
    </div>
  </template>

  <!-- Factory app content template -->
  <template id="factory-app-template">
    <!-- Move current game HTML here -->
    <div class="factory-container">
      <header>...</header>
      <div class="main-layout">...</div>
      <footer>...</footer>
      <!-- Upgrade modal stays here -->
    </div>
  </template>
</body>
```

---

## CSS Approach

### Desktop Layout (Absolute positioning)
```css
#desktop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000000;
  overflow: hidden;
}

#desktop-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40px; /* Taskbar height */
  background-image: url('assets/grid-bg.png'); /* Optional */
}

#windows-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40px;
  pointer-events: none; /* Allow clicks through to background */
}

.os-window {
  pointer-events: all; /* Windows catch clicks */
  position: absolute;
  background: #001100;
  border: 2px solid #00ff00;
  box-shadow: 0 0 20px #00ff0055;
  display: flex;
  flex-direction: column;
  min-width: 400px;
  min-height: 300px;
}

.os-window.maximized {
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: calc(100vh - 40px) !important; /* Full screen minus taskbar */
}

.os-window.minimized {
  display: none; /* Hidden, show in taskbar */
}

#taskbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #002200;
  border-top: 2px solid #00ff00;
  display: flex;
  align-items: center;
  z-index: 10000; /* Always on top */
}
```

### Window Title Bar (Flexbox)
```css
.window-titlebar {
  display: flex;
  align-items: center;
  background: #003300;
  border-bottom: 1px solid #00ff00;
  padding: 5px 10px;
  cursor: move; /* Drag handle */
  user-select: none;
}

.window-title {
  flex: 1;
  color: #00ff00;
  font-weight: bold;
}

.window-controls {
  display: flex;
  gap: 5px;
}

.window-btn {
  width: 20px;
  height: 20px;
  background: #001100;
  border: 1px solid #00ff00;
  color: #00ff00;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
```

### Resize Handles (Grid)
```css
.window-resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  pointer-events: all;
  background: transparent;
}

.resize-handle.n { top: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize; }
.resize-handle.s { bottom: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize; }
.resize-handle.e { right: 0; top: 10px; bottom: 10px; width: 5px; cursor: ew-resize; }
.resize-handle.w { left: 0; top: 10px; bottom: 10px; width: 5px; cursor: ew-resize; }
.resize-handle.ne { top: 0; right: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; }
```

---

## JavaScript Implementation

### OSWindow Class (os-window.js)
```javascript
class OSWindow {
  constructor(windowManager, appInstance, options = {}) {
    this.manager = windowManager;
    this.app = appInstance;
    this.id = generateId();

    // Window state
    this.x = options.x || 100;
    this.y = options.y || 100;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.minimized = false;
    this.maximized = false;
    this.focused = false;

    // Pre-maximize state (for restore)
    this.preMaxState = null;

    // DOM elements
    this.element = null;
    this.titlebar = null;
    this.content = null;

    this.create();
    this.setupEvents();
  }

  create() {
    // Clone template
    const template = document.getElementById('window-template');
    this.element = template.content.cloneNode(true).firstElementChild;
    this.element.setAttribute('data-window-id', this.id);

    // Get references
    this.titlebar = this.element.querySelector('.window-titlebar');
    this.content = this.element.querySelector('.window-content');

    // Set title and icon
    this.element.querySelector('.window-title').textContent = this.app.title;
    this.element.querySelector('.window-icon').textContent = this.app.icon;

    // Set initial position/size
    this.updatePosition();

    // Inject app content
    this.app.mount(this.content);
  }

  setupEvents() {
    // Title bar drag
    this.titlebar.addEventListener('mousedown', (e) => this.startDrag(e));

    // Window controls
    this.element.querySelector('.minimize').addEventListener('click', () => this.minimize());
    this.element.querySelector('.maximize').addEventListener('click', () => this.toggleMaximize());
    this.element.querySelector('.close').addEventListener('click', () => this.close());

    // Resize handles
    this.element.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => this.startResize(e, handle.classList[1]));
    });

    // Focus on click
    this.element.addEventListener('mousedown', () => this.focus());
  }

  startDrag(e) {
    if (this.maximized) return;
    e.preventDefault();

    const startX = e.clientX - this.x;
    const startY = e.clientY - this.y;

    const onMouseMove = (e) => {
      this.x = e.clientX - startX;
      this.y = e.clientY - startY;
      this.updatePosition();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  startResize(e, direction) {
    if (this.maximized) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = this.width;
    const startHeight = this.height;
    const startPosX = this.x;
    const startPosY = this.y;

    const onMouseMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Update based on direction
      if (direction.includes('e')) this.width = Math.max(400, startWidth + dx);
      if (direction.includes('s')) this.height = Math.max(300, startHeight + dy);
      if (direction.includes('w')) {
        const newWidth = Math.max(400, startWidth - dx);
        this.x = startPosX + (startWidth - newWidth);
        this.width = newWidth;
      }
      if (direction.includes('n')) {
        const newHeight = Math.max(300, startHeight - dy);
        this.y = startPosY + (startHeight - newHeight);
        this.height = newHeight;
      }

      this.updatePosition();
      this.app.onResize(this.width, this.height);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  updatePosition() {
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';
  }

  toggleMaximize() {
    if (this.maximized) {
      // Restore
      this.element.classList.remove('maximized');
      this.x = this.preMaxState.x;
      this.y = this.preMaxState.y;
      this.width = this.preMaxState.width;
      this.height = this.preMaxState.height;
      this.updatePosition();
      this.maximized = false;
      this.app.onResize(this.width, this.height);
    } else {
      // Maximize
      this.preMaxState = { x: this.x, y: this.y, width: this.width, height: this.height };
      this.element.classList.add('maximized');
      this.maximized = true;
      const fullWidth = window.innerWidth;
      const fullHeight = window.innerHeight - 40; // Minus taskbar
      this.app.onResize(fullWidth, fullHeight);
    }
  }

  minimize() {
    this.minimized = true;
    this.element.classList.add('minimized');
    this.manager.minimizeWindow(this);
  }

  restore() {
    this.minimized = false;
    this.element.classList.remove('minimized');
    this.focus();
  }

  focus() {
    this.manager.focusWindow(this);
  }

  close() {
    this.app.close();
    this.manager.closeWindow(this);
    this.element.remove();
  }

  getSaveData() {
    return {
      appId: this.app.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      maximized: this.maximized,
      minimized: this.minimized
    };
  }
}
```

### WindowManager Class (window-manager.js)
```javascript
class WindowManager {
  constructor() {
    this.windows = [];
    this.container = document.getElementById('windows-container');
    this.nextZ = 100; // Z-index counter
  }

  createWindow(app, options = {}) {
    const window = new OSWindow(this, app, options);
    this.windows.push(window);
    this.container.appendChild(window.element);
    this.focusWindow(window);
    return window;
  }

  closeWindow(window) {
    const index = this.windows.indexOf(window);
    if (index > -1) {
      this.windows.splice(index, 1);
    }
  }

  focusWindow(window) {
    // Unfocus all
    this.windows.forEach(w => {
      w.element.style.zIndex = w.focused ? this.nextZ - 1 : 100;
      w.focused = false;
    });

    // Focus target
    window.element.style.zIndex = this.nextZ++;
    window.focused = true;
  }

  minimizeWindow(window) {
    // Window will show in taskbar instead
  }
}
```

### FactoryApp Class (apps/factory-app.js)
```javascript
class FactoryApp {
  constructor() {
    this.id = 'factory';
    this.title = 'Factory Manager';
    this.icon = '🏭';
    this.game = null; // Game instance
    this.resizeObserver = null;
  }

  mount(contentElement) {
    // Clone factory template
    const template = document.getElementById('factory-app-template');
    const content = template.content.cloneNode(true);
    contentElement.appendChild(content);

    // Initialize game (current Game class)
    this.game = new Game();
    const loaded = this.game.load();
    if (!loaded) {
      this.game.canvas.drawTestShapes();
    }
    this.game.start();

    // Setup resize observer for canvas
    this.resizeObserver = new ResizeObserver(() => {
      this.game.canvas.handleResize();
    });
    this.resizeObserver.observe(contentElement);
  }

  onResize(width, height) {
    // Canvas auto-resizes via ResizeObserver
  }

  close() {
    this.game.save();
    this.game.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
```

---

## Integration Plan

### Step-by-Step Implementation

**Step 1: Create OS file structure**
- Create `js/os/` folder
- Create `js/apps/` folder
- Create empty OS class files

**Step 2: Build window template**
- Add window-template to index.html
- Add basic window CSS

**Step 3: Implement OSWindow class**
- Drag functionality
- Resize handles
- Minimize/maximize/close buttons
- Z-index management

**Step 4: Implement WindowManager**
- Create/close windows
- Focus management
- Window tracking

**Step 5: Build desktop structure**
- Desktop background
- Taskbar HTML/CSS
- Desktop icons

**Step 6: Wrap game as FactoryApp**
- Create factory-app-template
- Move current game HTML to template
- Implement FactoryApp.mount()
- Setup ResizeObserver for canvas

**Step 7: Update main.js**
- Initialize DesktopOS instead of Game
- Launch factory app on load
- Handle desktop clicks

**Step 8: Update canvas.js**
- Add ResizeObserver support
- Remove window resize listener (now handled by app)

**Step 9: Save/load window state**
- Add window positions to save data
- Restore window state on load

**Step 10: Polish & test**
- Keyboard shortcuts (Alt+F4, etc.)
- Window animations
- Taskbar app switching
- Multiple windows

---

## Critical Edge Cases

### Canvas Resize Handling
**Problem**: Konva canvas needs to resize when window resizes
**Solution**: Use ResizeObserver on window-content div
```javascript
this.resizeObserver = new ResizeObserver(() => {
  this.game.canvas.handleResize();
});
this.resizeObserver.observe(contentElement);
```

### Modal Within Window
**Problem**: Upgrade panel should stay within window bounds
**Solution**: Modal already scoped to game container, no change needed

### Drag Conflicts
**Problem**: Window drag vs Konva node drag
**Solution**: Title bar drag only, content area passes through

### Save/Load Integration
**Problem**: Need to restore window state
**Solution**: Add windowState to save data
```javascript
{
  version: 1,
  desktop: {
    windows: [
      { appId: 'factory', x: 100, y: 100, width: 800, height: 600 }
    ]
  },
  apps: {
    factory: { /* existing game save data */ }
  }
}
```

### Z-Index Management
**Problem**: Windows need to stack properly
**Solution**: Increment z-index counter on focus

### Fullscreen Mode
**Problem**: Maximize should fill viewport minus taskbar
**Solution**: CSS class `.maximized` with calculated height

---

## Testing & Verification

### Manual Testing Checklist
- [ ] Desktop background renders
- [ ] Taskbar shows at bottom
- [ ] Desktop icon launches app
- [ ] Window appears with game content
- [ ] Window drag works (title bar only)
- [ ] Window resize works (8 directions)
- [ ] Minimize hides window, shows in taskbar
- [ ] Maximize fills screen minus taskbar
- [ ] Close button closes window
- [ ] Multiple windows can be opened
- [ ] Z-index stacking works (click to focus)
- [ ] Konva canvas resizes with window
- [ ] Game saves include window state
- [ ] Loading restores window positions
- [ ] Upgrade modal works within window
- [ ] No drag conflicts with Konva nodes

---

## Files to Create

### New Files
1. `js/os/desktop.js` - DesktopOS class (200 lines)
2. `js/os/window-manager.js` - WindowManager class (100 lines)
3. `js/os/os-window.js` - OSWindow class (300 lines)
4. `js/os/taskbar.js` - Taskbar class (150 lines)
5. `js/os/app.js` - App base class (50 lines)
6. `js/apps/factory-app.js` - FactoryApp class (100 lines)

### Files to Modify
1. `index.html` - Complete restructure (~300 lines)
2. `css/style.css` - Add OS/window styles (+200 lines)
3. `js/main.js` - Initialize DesktopOS (~50 lines)
4. `js/canvas.js` - Add ResizeObserver support (+5 lines)
5. `js/game.js` - Export for FactoryApp (minor)

**Total: ~1500 lines of new/modified code**

---

## Implementation Timeline

**Phase OS-1: Window System (Week 1)**
- OSWindow class with drag/resize
- WindowManager class
- Basic window template and CSS
- Test with dummy content

**Phase OS-2: Desktop Shell (Week 2)**
- Desktop background
- Taskbar with app launcher
- Desktop icons
- DesktopOS orchestrator

**Phase OS-3: Game Integration (Week 3)**
- FactoryApp wrapper
- Move game HTML to template
- ResizeObserver for canvas
- Test game in window

**Phase OS-4: Persistence & Polish (Week 4)**
- Save/load window state
- Keyboard shortcuts
- Animations
- Multiple window support

---

## Success Criteria

- ✓ Desktop with taskbar renders
- ✓ Game launches in window
- ✓ Window can be dragged by title bar
- ✓ Window can be resized from all 8 points
- ✓ Minimize/maximize/close buttons work
- ✓ Konva canvas resizes with window
- ✓ Game save/load works in window
- ✓ Can open multiple windows
- ✓ Z-index stacking works correctly
- ✓ Retro terminal aesthetic maintained
- ✓ No performance degradation

---

# PHASE OS-4.1: WINDOW STATE PERSISTENCE IMPLEMENTATION

## Overview
Implement automatic save/load of window positions, sizes, and maximized state across page refreshes. The system already has separate save mechanisms for Desktop (`desktopOS_save`) and Game (`idleSpaceCompany_save`) that work independently.

## Current State Analysis

**What Works:**
- Desktop.save() and Desktop.load() methods exist
- WindowManager.getSaveData() returns window data
- OSWindow.getSaveData() includes: appId, x, y, width, height, maximized
- beforeunload event triggers desktop.save()
- No localStorage key conflicts (separate keys)

**What Needs Fixing:**
1. Desktop.load() doesn't restore maximized state
2. No auto-save on window state changes (drag, resize, maximize)
3. No validation of window positions (can be off-screen)
4. No throttling for performance during drag/resize

---

## Implementation Plan

### 1. Add Utility Functions (utils.js)

**Add throttle function** - prevents excessive saves during drag/resize:
```javascript
function throttle(func, delay) {
    let timeoutId = null;
    let lastExecTime = 0;

    return function(...args) {
        const currentTime = Date.now();

        if (currentTime - lastExecTime >= delay) {
            lastExecTime = currentTime;
            func.apply(this, args);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastExecTime = Date.now();
                func.apply(this, args);
            }, delay - (currentTime - lastExecTime));
        }
    };
}
```

**Add position validation** - ensures windows stay on-screen:
```javascript
function validateWindowPosition(x, y, width, height) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - 40; // Minus taskbar
    const minVisiblePx = 50; // Minimum pixels that must be visible

    const validX = clamp(x, -width + minVisiblePx, screenWidth - minVisiblePx);
    const validY = clamp(y, 0, screenHeight - minVisiblePx);
    const validWidth = clamp(width, 400, screenWidth);
    const validHeight = clamp(height, 300, screenHeight);

    return { x: validX, y: validY, width: validWidth, height: validHeight };
}
```

### 2. Update Desktop.js

**Add throttled save to constructor:**
```javascript
constructor() {
    this.windowManager = new WindowManager();
    this.taskbar = null;
    this.apps = {};
    this.throttledSave = throttle(() => this.save(), 500); // Add this line
    this.initialize();
}
```

**Pass desktop reference to windows:**
```javascript
launchApp(appId, windowOptions = {}) {
    const AppClass = this.apps[appId];
    if (!AppClass) {
        console.error(`App not found: ${appId}`);
        return null;
    }
    const app = new AppClass();
    const window = this.windowManager.createWindow(app, windowOptions, this); // Pass 'this'
    log(`App launched: ${appId}`);
    return window;
}
```

**Fix load() to restore maximized state:**
```javascript
load() {
    try {
        const saveData = localStorage.getItem('desktopOS_save');
        if (!saveData) return false;

        const data = JSON.parse(saveData);

        if (!data.version || data.version !== 1) {
            console.warn('Incompatible save version');
            return false;
        }

        if (data.windows && data.windows.length > 0) {
            data.windows.forEach(windowData => {
                const validated = validateWindowPosition(
                    windowData.x,
                    windowData.y,
                    windowData.width,
                    windowData.height
                );

                const window = this.launchApp(windowData.appId, {
                    x: validated.x,
                    y: validated.y,
                    width: validated.width,
                    height: validated.height,
                    maximized: windowData.maximized || false
                });

                // Apply maximized state after window creation
                if (windowData.maximized && window) {
                    setTimeout(() => window.toggleMaximize(), 0);
                }
            });
        }

        log('Desktop OS loaded');
        return true;
    } catch (e) {
        console.error('Failed to load Desktop OS:', e);
        return false;
    }
}
```

### 3. Update WindowManager.js

**Accept desktop reference in createWindow:**
```javascript
createWindow(app, options = {}, desktop = null) {
    const window = new OSWindow(this, app, options, desktop);
    this.windows.push(window);
    this.container.appendChild(window.element);
    this.focusWindow(window);
    return window;
}
```

**Trigger save on window close:**
```javascript
closeWindow(window) {
    const index = this.windows.indexOf(window);
    if (index > -1) {
        this.windows.splice(index, 1);
    }

    if (window.desktop) {
        window.desktop.throttledSave();
    }
}
```

### 4. Update OSWindow.js

**Store desktop reference in constructor:**
```javascript
constructor(windowManager, appInstance, options = {}, desktop = null) {
    this.manager = windowManager;
    this.app = appInstance;
    this.id = generateId();
    this.desktop = desktop; // Add this line

    // Window state
    this.x = options.x || 100;
    this.y = options.y || 100;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.maximized = options.maximized || false; // Support initial state
    this.focused = false;
    // ... rest unchanged
}
```

**Add save trigger to drag end (in startDrag method):**
```javascript
const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (this.desktop) {
        this.desktop.throttledSave();
    }
};
```

**Add save trigger to resize end (in startResize method):**
```javascript
const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (this.desktop) {
        this.desktop.throttledSave();
    }
};
```

**Add save trigger to toggleMaximize:**
```javascript
toggleMaximize() {
    if (this.maximized) {
        // Restore code...
    } else {
        // Maximize code...
    }

    // Save immediately (not throttled for discrete actions)
    if (this.desktop) {
        this.desktop.save();
    }
}
```

---

## Auto-Save Triggers

| Event | Trigger Type | Rationale |
|-------|--------------|-----------|
| Window drag end | Throttled (500ms) | Capture final position, avoid excessive saves |
| Window resize end | Throttled (500ms) | Capture final size, avoid excessive saves |
| Maximize/restore | Immediate | Discrete action, save state instantly |
| Window close | Throttled | Final state, part of cleanup |
| Page unload | Immediate | Emergency save (already implemented) |

---

## Validation Strategy

**On-Screen Rules:**
- Minimum 50px of window must be visible
- Prevents completely off-screen windows
- Handles screen resolution changes

**Size Constraints:**
- Minimum: 400x300 (from CSS)
- Maximum: Current screen size
- Respects window min-width/min-height

**When Applied:**
- On load from localStorage
- Before restoring window positions

---

## Testing Checklist

**Basic Persistence:**
- [ ] Move window → refresh → position restored
- [ ] Resize window → refresh → size restored
- [ ] Maximize window → refresh → maximized state restored
- [ ] Restore maximized window → refresh → normal state restored

**Edge Cases:**
- [ ] Window saved off-screen → corrected on load
- [ ] Corrupted save data → loads without error
- [ ] Screen resize → windows fit new screen size
- [ ] Multiple windows → all restored correctly

**Performance:**
- [ ] Drag continuously for 5s → max 10 saves (2/sec throttle)
- [ ] No frame drops during drag/resize
- [ ] Page load time unchanged

**Integration:**
- [ ] Game save/load still works independently
- [ ] Canvas resizes correctly in restored window
- [ ] Upgrade modal works in restored window
- [ ] Multiple window instances supported

---

## Critical Files to Modify

1. [js/utils.js](js/utils.js) - Add throttle() and validateWindowPosition()
2. [js/os/desktop.js](js/os/desktop.js) - Add throttledSave, fix load(), pass desktop ref
3. [js/os/window-manager.js](js/os/window-manager.js) - Accept desktop ref, trigger save on close
4. [js/os/os-window.js](js/os/os-window.js) - Add save triggers to drag/resize/maximize

---

## Verification

After implementation:

1. Open game, move window to custom position
2. Resize window to custom size
3. Maximize window
4. Refresh page
5. **Expected:** Window reopens maximized, can restore to saved size/position
6. Refresh again
7. **Expected:** Window reopens in restored state

Test corrupted data:
```javascript
// In console:
localStorage.setItem('desktopOS_save', '{invalid json}')
// Refresh - should load without error
```

Test off-screen:
```javascript
// In console:
desktop.windowManager.windows[0].x = -5000
desktop.save()
// Refresh - window should be corrected to visible position
```
