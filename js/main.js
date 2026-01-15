// main.js - Game entry point and initialization

import { GameState } from './engine/GameState.js';
import { TurnManager } from './engine/TurnManager.js';
import { MapGenerator } from './systems/MapGenerator.js';
import { MapRenderer } from './ui/MapRenderer.js';
import { FleetManager } from './systems/FleetManager.js';
import { ColonyManager } from './systems/ColonyManager.js';
import { ArchaeologyManager } from './systems/ArchaeologyManager.js';
import { CodexManager } from './systems/CodexManager.js';
import { AIManager } from './systems/AIManager.js';
import { CombatManager } from './systems/CombatManager.js';
import { DiplomacyManager } from './systems/DiplomacyManager.js';
import { EventManager } from './systems/EventManager.js';
import { SaveManager } from './systems/SaveManager.js';
import { UIManager } from './ui/UIManager.js';
import { ARCHAEOLOGY_SITES } from './data/archaeologySites.js';
import { TECHNOLOGY } from './data/technology.js';

class MysteriousStars {
    constructor() {
        this.state = new GameState();
        this.techData = { TECHNOLOGY };

        // Initialize systems
        this.systems = {
            mapGen: new MapGenerator(),
            fleet: new FleetManager(this.state),
            colony: new ColonyManager(this.state),
            archaeology: new ArchaeologyManager(this.state),
            codex: new CodexManager(this.state),
            combat: new CombatManager(this.state, null), // Set fleet manager after
            events: new EventManager(this.state),
            save: new SaveManager(this.state),
            ai: null, // Set after other systems
            diplomacy: null, // Set after AI
            turn: null // Set after all systems
        };

        // Set cross-references
        this.systems.combat.fleetManager = this.systems.fleet;

        // Load archaeology data
        this.systems.archaeology.loadSiteData(ARCHAEOLOGY_SITES);

        // Initialize AI and diplomacy
        this.systems.ai = new AIManager(
            this.state,
            this.systems.fleet,
            this.systems.colony,
            this.systems.archaeology
        );
        this.systems.diplomacy = new DiplomacyManager(this.state, this.systems.ai);

        // Initialize turn manager
        this.systems.turn = new TurnManager(this.state, this.systems);

        // Initialize canvas and map renderer
        this.canvas = document.getElementById('game-canvas');
        this.mapRenderer = null;

        // Initialize UI manager
        this.ui = new UIManager(this);

        // Make game accessible globally for UI callbacks
        window.game = this;

        // Check for saved game
        this.checkForSavedGame();
    }

    checkForSavedGame() {
        const hasSave = this.systems.save.hasSavedGame();
        const loadBtn = document.getElementById('load-game-btn');
        if (loadBtn) {
            loadBtn.disabled = !hasSave;
            loadBtn.style.opacity = hasSave ? '1' : '0.5';
        }
    }

    startNewGame() {
        // Reset state
        this.state.reset();

        // Generate galaxy
        const galaxy = this.systems.mapGen.generateGalaxy(18);
        this.state.galaxy = galaxy;

        // Initialize player starting position
        this.initializePlayer(galaxy.playerStart);

        // Initialize AI starting position
        this.initializeAI(galaxy.aiStart);

        // Initialize map renderer
        this.initializeMapRenderer();

        // Center on player start
        this.mapRenderer.centerOnSystem(galaxy.playerStart);

        // Calculate initial economy
        this.state.calculateEconomy();

        // Update UI
        this.ui.updateAll();

        // Start render loop
        this.mapRenderer.render();

        // Add welcome notification
        this.state.addNotification('Welcome to Mysterious Stars. Explore the galaxy and uncover its secrets.', 'info');
        this.ui.updateNotifications();

        console.log('New game started');
    }

    initializePlayer(startSystemId) {
        const system = this.state.getSystem(startSystemId);

        // Mark starting system as known, scanned, and deep scanned (homeworld)
        this.state.player.knownSystems.add(startSystemId);
        this.state.player.scannedSystems.add(startSystemId);
        this.state.player.deepScannedSystems.add(startSystemId);
        this.state.player.controlledSystems.push(startSystemId);

        // Find best habitable planet for homeworld
        const habitablePlanets = system.planets.filter(p => p.habitable);
        const habitablePlanet = habitablePlanets.sort((a, b) => b.size - a.size)[0];

        if (habitablePlanet) {
            // Set up homeworld
            habitablePlanet.colonized = true;
            habitablePlanet.owner = 'player';
            habitablePlanet.isHomeworld = true;
            habitablePlanet.name = 'Terra Nova'; // Rename homeworld

            // Store homeworld reference
            this.state.player.homeworld = {
                systemId: startSystemId,
                planetId: habitablePlanet.id
            };

            // Create homeworld colony with robust starting economy
            const colony = {
                id: `colony_homeworld`,
                planetId: habitablePlanet.id,
                systemId: startSystemId,
                name: 'Terra Nova',
                isHomeworld: true,
                population: 5,
                happiness: 0.85,
                districts: [
                    { type: 'city', id: 'dist_1' },
                    { type: 'city', id: 'dist_2' },
                    { type: 'mining', id: 'dist_3' },
                    { type: 'mining', id: 'dist_4' },
                    { type: 'generator', id: 'dist_5' },
                    { type: 'generator', id: 'dist_6' },
                    { type: 'research', id: 'dist_7' }
                ],
                buildings: [
                    { type: 'starport', id: 'bld_1' },
                    { type: 'power_plant', id: 'bld_2' },
                    { type: 'research_lab', id: 'bld_3' },
                    null
                ],
                maxDistricts: Math.max(10, Math.floor(habitablePlanet.size / 3)),
                buildQueue: []
            };

            this.state.player.colonies.push(colony);
        }

        // Rename starting system
        system.name = 'Sol';
        system.isHomeSystem = true;

        // Create starting fleet
        this.systems.fleet.createFleet('player', startSystemId, [
            'corvette', 'corvette', 'corvette',
            'frigate', 'frigate',
            'science'
        ], 'Home Fleet');

        // Give starting resources
        this.state.player.resources.energy = 300;
        this.state.player.resources.minerals = 300;
        this.state.player.resources.research = 100;
    }

    initializeAI(startSystemId) {
        const system = this.state.getSystem(startSystemId);

        // Set AI known systems
        this.state.ai.knownSystems.add(startSystemId);
        this.state.ai.scannedSystems.add(startSystemId);
        this.state.ai.controlledSystems.push(startSystemId);

        // Find habitable planet and colonize
        const habitablePlanet = system.planets.find(p => p.habitable);
        if (habitablePlanet) {
            habitablePlanet.colonized = true;
            habitablePlanet.owner = 'ai';

            const colony = {
                id: `colony_ai_start`,
                planetId: habitablePlanet.id,
                systemId: startSystemId,
                name: habitablePlanet.name,
                population: 2,
                happiness: 0.8,
                districts: [
                    { type: 'city', id: 'ai_dist_1' },
                    { type: 'mining', id: 'ai_dist_2' },
                    { type: 'generator', id: 'ai_dist_3' }
                ],
                buildings: [
                    { type: 'starport', id: 'ai_bld_1' },
                    null,
                    null
                ],
                maxDistricts: Math.floor(habitablePlanet.size / 4),
                buildQueue: []
            };

            this.state.ai.colonies.push(colony);
        }

        // Create AI starting fleet
        this.systems.fleet.createFleet('ai', startSystemId, [
            'corvette', 'corvette', 'corvette',
            'frigate', 'frigate',
            'science'
        ], 'Vanguard Fleet');

        // Set AI starting resources
        this.state.ai.resources.energy = 200;
        this.state.ai.resources.minerals = 200;
        this.state.ai.resources.research = 50;
    }

    initializeMapRenderer() {
        this.mapRenderer = new MapRenderer(this.canvas, this.state);

        // Set up callbacks
        this.mapRenderer.onSystemClick = (system) => {
            this.ui.selectSystem(system);
            if (system) {
                const visibility = this.state.getSystemVisibility(system.id);
                if (visibility !== 'unknown') {
                    this.ui.openSystemView(system.id);
                }
            }
        };

        this.mapRenderer.onFleetClick = (fleet) => {
            if (fleet.owner === 'player') {
                this.ui.selectFleet(fleet);
            }
        };

        // Fleet move mode callback
        this.mapRenderer.onFleetMoveDestination = (systemId) => {
            this.ui.handleFleetMoveDestination(systemId);
        };
    }

    initializeWithLoadedState() {
        // Re-initialize map renderer with loaded state
        this.initializeMapRenderer();

        // Center on player's first controlled system
        if (this.state.player.controlledSystems.length > 0) {
            this.mapRenderer.centerOnSystem(this.state.player.controlledSystems[0]);
        }

        // Start render loop
        this.mapRenderer.render();

        this.state.addNotification('Game loaded successfully.', 'info');
    }

    async endTurn() {
        // Disable end turn button during processing
        const btn = document.getElementById('end-turn-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processing...';
        }

        // Process colony build queues
        this.systems.colony.processBuildQueues('player');

        // End turn
        await this.systems.turn.endTurn();

        // Check for pending events
        const event = this.systems.events.getPendingEvent();
        if (event) {
            this.ui.showEventModal(event);
        }

        // Check for combat results
        const combatResult = this.systems.combat.getLastCombatResult();
        if (combatResult && combatResult.turn === this.state.turn - 1) {
            this.ui.showCombatResult(combatResult);
        }

        // Check for excavations ready for choice
        for (const excavation of Object.values(this.state.excavations)) {
            if (excavation.owner === 'player' && excavation.readyForChoice) {
                this.ui.openArchaeologyView(excavation.systemId, excavation.planetId);
                break;
            }
        }

        // Check win condition
        const win = this.state.checkWinCondition();
        if (win) {
            if (win.winner === 'player') {
                setTimeout(() => {
                    alert('VICTORY! You have won the game through ' +
                        (win.reason === 'majority_control' ? 'majority control of the galaxy!' :
                        win.reason === 'elimination' ? 'eliminating the opposition!' :
                        'your superior strategy!'));
                }, 100);
            } else {
                setTimeout(() => {
                    alert('DEFEAT. The ' + this.state.ai.name + ' has won.');
                }, 100);
            }
        }

        // Update UI
        this.ui.updateAll();

        // Re-enable button
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'End Turn';
        }
    }

    // Quick access methods for UI
    getSystemName(systemId) {
        return this.state.getSystem(systemId)?.name || 'Unknown';
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mysterious Stars initializing...');
    new MysteriousStars();
});
