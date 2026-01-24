# Current Phase: 3.5 - Selling Mechanism (CRITICAL GAP)

## Status: 🚨 BLOCKING GAMEPLAY - NOT STARTED

**The game economy is broken.** You correctly identified that we jumped to building the OS system before completing Phase 3's selling mechanism. Players start with 100 credits, spend them on buildings, then have no way to earn more credits. Game becomes unplayable after 2-3 buildings.

---

## The Economic Problem

**Current broken flow:**
```
Start: 100 credits
→ Place Ore Miner (-10 credits)
→ Place second Miner (-11.5 credits, 1.15x cost scaling)
→ Place Smelter (-50 credits)
→ Remaining: ~28 credits
→ Ore and Metal accumulate but can't be sold
→ Can't afford more buildings
→ GAME STALLS - DEAD END ❌
```

**What's missing:**
- ❌ No way to convert ore/metal → credits (NO SELLING)
- ❌ No credit-generating buildings
- ❌ Credits are purely consumable with no regeneration
- ❌ No "Market" or "Seller" building

---

## What's Actually Implemented (Codebase Analysis)

### ✅ Working Systems

**Resources (js/resources.js, data/resources-data.js)**
- ✅ Ore, Metal, Credits all exist and work
- ✅ Credits start at 100, have infinite capacity
- ✅ ResourceManager has `canAfford()`, `spend()`, `add()`, `remove()`
- ✅ Production tracking per-second

**Buildings (js/node.js, data/buildings-data.js)**
- ✅ Ore Miner: Costs 10 credits, produces +1.0 ore/sec
- ✅ Smelter: Costs 50 credits, produces +0.5 metal/sec, consumes -1.0 ore/sec
- ✅ Cost scaling: `baseCost * (1.15 ^ buildingCount)` - exponential growth
- ✅ Buildings cost credits to place (deducted immediately)
- ✅ Drag-and-drop placement from sidebar

**Upgrades (js/upgrades.js)**
- ✅ Double-click building opens upgrade panel
- ✅ Level system (max level 10)
- ✅ Cost formula: `baseCost * (level ^ 1.5)`
- ✅ "DELETE BUILDING" button to remove buildings

**Save/Load (js/game.js)**
- ✅ LocalStorage persistence (`idleSpaceCompany_save`)
- ✅ Saves: resources, buildings, connections, counts
- ✅ Offline progress (2-hour cap)

**Virtual OS (completed in OS phases)**
- ✅ Desktop, Taskbar, WindowManager
- ✅ Resizable, draggable windows
- ✅ Window state persistence (positions, sizes, maximized)
- ✅ Game runs inside window

### ❌ Missing Systems

**Selling/Market (NOT IMPLEMENTED)**
- ❌ No building to sell resources for credits
- ❌ No auto-sell feature on buildings
- ❌ No manual "Sell" button in UI
- ❌ No market prices for resources

---

## Implementation Plan: Selling Mechanism

### Option A: Market Building (Recommended)

Add a new building type: **Space Market**

**Building Stats:**
- Name: "Space Market"
- Cost: 25 credits (between Miner and Smelter)
- Function: Converts resources → credits automatically
- Resource prices:
  - Ore: 0.5 credits each
  - Metal: 2.0 credits each

**How it works:**
1. Place Market building on canvas
2. Connect Ore Miner → Market (sells ore automatically)
3. Market consumes ore, produces credits
4. Production rate: "Selling: +0.5 cr/s" (if consuming 1 ore/s)

**Files to modify:**
1. `data/buildings-data.js` - Add Market building definition
2. `js/production.js` - Handle resource → credits conversion
3. Update UI to show credit production rate

**Advantage:**
- Consistent with existing building system
- Visual connection shows resource flow
- Auto-sell is automated idle game mechanic

### Option B: Auto-Sell Toggle (Alternative)

Add checkbox to each building's upgrade panel: "Auto-Sell Output"

**How it works:**
1. Open Ore Miner upgrade panel
2. Enable "Auto-Sell Output" toggle
3. Ore is produced and immediately sold for credits
4. No need to connect to Market building

**Advantage:**
- Simpler implementation
- No new building type
- Works with existing upgrade UI

**Disadvantage:**
- Breaks visual factory-building concept
- Less "Factorio-like"

---

## Recommended Next Steps

1. **Implement Option A: Market Building** (3-4 hours)
   - Add building definition with sell prices
   - Modify production logic to generate credits
   - Update UI to show credit generation
   - Test economic balance

2. **Balance Economy** (1-2 hours)
   - Playtest for 30-60 minutes
   - Adjust sell prices if too fast/slow
   - Ensure costs scale correctly
   - Verify offline progress includes selling

3. **Update Plan Documentation**
   - Mark Phase 3 as fully complete
   - Document OS phases (OS-1 through OS-4.1)
   - Update CURRENT_PHASE.md to Phase 4 or next goal

---

## Phase History (Where We Actually Are)

### ✅ Phase 1: Canvas Foundation (COMPLETED)
- Desktop OS shell, window system, drag-and-drop
- Visual factory builder with Konva.js
- 3-panel layout (resources, canvas, buildings)

### ✅ Phase 2: Connections & Production (COMPLETED)
- Node connections with lines
- Production chains work (Miner → Smelter)
- Real-time resource updates

### ⚠️ Phase 3: Core Systems (INCOMPLETE - Missing Selling)
- ✅ Building costs and purchase system
- ✅ Upgrades (level 1-10)
- ✅ Save/load with offline progress
- ❌ **MISSING: Selling mechanism** ← WE ARE HERE

### ✅ Phase OS-1 to OS-4.1: Virtual OS (COMPLETED)
- Desktop OS with taskbar
- Window manager with drag/resize
- Window state persistence
- Game wrapped as FactoryApp

---

## Critical Files for Selling Implementation

**To Create:**
- None (all systems exist)

**To Modify:**
1. `data/buildings-data.js` - Add Market building
   - Define stats, costs, sell prices
2. `js/production.js` - Add selling logic
   - Check if building is Market type
   - Consume resources, produce credits
3. `js/ui.js` - Display credit production
   - Show "+X cr/s" in resources sidebar

**Example Market Building Definition:**
```javascript
market: {
    id: 'market',
    name: 'Space Market',
    icon: '🏪',
    baseCost: { credits: 25 },
    costMultiplier: 1.15,
    color: '#FFD700', // Gold
    description: 'Sells resources for credits',
    sellPrices: {
        ore: 0.5,    // 0.5 credits per ore
        metal: 2.0   // 2.0 credits per metal
    },
    // Market building consumes resources as "input"
    // but produces credits instead of resources
}
```

---

## Testing Checklist (After Implementation)

**Economic Flow:**
- [ ] Start with 100 credits
- [ ] Place Ore Miner (-10 cr) → produces ore
- [ ] Place Market (-25 cr) → connects to miner
- [ ] Market sells ore → credits increase
- [ ] Can afford more buildings with earned credits
- [ ] Economy is self-sustaining ✅

**Balance Testing:**
- [ ] Play for 15 minutes → can place 5-10 buildings
- [ ] Upgrade costs feel achievable
- [ ] Not too fast (instant wealth)
- [ ] Not too slow (still waiting)
- [ ] Offline progress includes selling

---

## Next Priority After Selling

Once selling is implemented, choose:

### Option A: Multi-Page Factories (Phase 4)
- Multiple canvas pages ("rooms")
- Tab system to switch pages
- Logistics unlock to connect pages

### Option B: More Buildings & Content
- 5-10 more building types
- Complex production chains (4-5 steps)
- More resources (Components, Circuits, etc.)

### Option C: Polish & Balance
- Visual animations (pulse on production)
- Sound effects (optional)
- Fine-tune costs and production rates
- Better UI feedback

---

## Quick Reference

**localStorage Keys:**
- `desktopOS_save` - Window states (positions, sizes)
- `idleSpaceCompany_save` - Game state (resources, buildings)

**Starting Resources:**
- Credits: 100 (infinite capacity)
- Ore: 0 (capacity: 5000)
- Metal: 0 (capacity: 2000)

**Building Costs (base):**
- Ore Miner: 10 credits
- Smelter: 50 credits
- Market (TO ADD): 25 credits

**Cost Scaling:** Each building costs 1.15x more than previous
- 1st Miner: 10 cr
- 2nd Miner: 11.5 cr
- 3rd Miner: 13.2 cr