# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mysterious Stars is a browser-based, single-player, turn-based space strategy game. Think Stellaris meets Outer Wilds - a lore-driven 4X exploration game where information asymmetry and archaeological discoveries drive strategic advantages.

## Build and Development Commands

```bash
# Serve locally (requires a local server due to ES modules)
npx serve .
# or
python -m http.server 8000
# or any static file server

# Open in browser
# Navigate to http://localhost:8000 (or appropriate port)
```

No build step required - pure HTML5/CSS/JavaScript with ES modules.

## Architecture

### Directory Structure
```
/
├── index.html              # Main entry point
├── css/
│   ├── styles.css         # Core styles, Stellaris-inspired dark theme
│   └── ui.css             # UI component styles
└── js/
    ├── main.js            # Game initialization and entry point
    ├── engine/
    │   ├── GameState.js   # Central state management, serialization
    │   └── TurnManager.js # Turn phases, game loop orchestration
    ├── systems/
    │   ├── MapGenerator.js      # Procedural galaxy generation
    │   ├── FleetManager.js      # Fleet creation, movement, scanning
    │   ├── ColonyManager.js     # Colonies, districts, buildings
    │   ├── ArchaeologyManager.js # Excavation system, narrative branching
    │   ├── CodexManager.js      # Lore storage, cross-references
    │   ├── AIManager.js         # AI opponent behavior, goals
    │   ├── CombatManager.js     # Auto-resolve combat
    │   ├── DiplomacyManager.js  # Treaties, trust, war mechanics
    │   ├── EventManager.js      # Random events
    │   └── SaveManager.js       # localStorage save/load
    ├── ui/
    │   ├── MapRenderer.js # HTML5 Canvas galaxy map rendering
    │   └── UIManager.js   # UI state, panels, modals
    └── data/
        ├── names.js           # Star/fleet name pools
        ├── technology.js      # Tech tree definitions
        └── archaeologySites.js # Narrative content (5-6 sites with meta-chain)
```

### Key Patterns

- **State**: Single `GameState` object holds all game state, serializable for save/load
- **Systems**: Manager classes handle specific game mechanics, receive `GameState` reference
- **Turn Flow**: TurnManager orchestrates phases: production → movement → combat → events → AI → cleanup
- **UI**: UIManager coordinates DOM updates, MapRenderer handles Canvas drawing
- **Data-driven**: Archaeological sites, events, tech defined in JSON-like data files

### Core Game Loop

1. Player takes actions (fleet movement, colony building, excavation choices)
2. End Turn triggers TurnManager phases
3. Resources calculated, fleets move, combat resolves
4. AI takes turn (expansion, excavation, diplomacy decisions)
5. Random events may trigger
6. State auto-saved

### Archaeological System (Heart of the Game)

Sites have 4-6 layers with branching narrative choices. Cross-references between sites create discoverable connections. Three sites form a "meta-chain" - discovering the connection grants major strategic advantage without explicit UI indicators.

## Technical Notes

- Pure ES modules (no bundler)
- HTML5 Canvas for map rendering
- localStorage for saves
- No external dependencies
