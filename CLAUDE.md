# Idle Space Company - Project Context

## Overview
Browser-based incremental/idle game - space company factory management simulation.

## Tech Stack
- Vanilla JavaScript (ES6+ classes)
- Konva.js for canvas graphics
- LocalStorage for persistence
- No build system or transpilation

## Architecture
- Event-driven (CustomEvents for module communication)
- Data-driven configuration (buildings/resources in data/ files)
- Class-based modules: Game, CanvasManager, FactoryNode, ResourceManager
- Modular organization: js/, data/, css/ directories

## File Organization
- `js/game.js` - Core game state and loop
- `js/canvas.js` - Konva canvas management
- `js/node.js` - Building node logic
- `js/resources.js` - Resource tracking
- `js/os/` - Virtual OS framework
- `data/` - Game configurations

## Current Status
Version 0.4.0: Core features complete (building placement, production chains, save/load, offline progress, upgrades)

## Technical Debt
- ⚠️ No test coverage (priority to add)
- ⚠️ 25 console.log statements to clean up
- ⚠️ 7 TODO comments requiring attention
- ⚠️ No package.json/dependency management

## Development Guidelines
- Maintain immutability where possible
- Keep files under 400 lines (800 max)
- Data-driven configuration for game content
- Event-driven communication between modules
- camelCase naming conventions
