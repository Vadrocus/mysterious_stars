// TurnManager.js - Handles turn structure and game loop

export class TurnManager {
    constructor(gameState, systems) {
        this.state = gameState;
        this.systems = systems;
        this.turnCallbacks = [];
        this.phaseCallbacks = {
            production: [],
            movement: [],
            combat: [],
            events: [],
            ai: [],
            cleanup: []
        };
    }

    onTurnEnd(callback) {
        this.turnCallbacks.push(callback);
    }

    onPhase(phase, callback) {
        if (this.phaseCallbacks[phase]) {
            this.phaseCallbacks[phase].push(callback);
        }
    }

    async endTurn() {
        // Phase 1: Production
        await this.executePhase('production', () => this.processProduction());

        // Phase 2: Movement (execute queued fleet orders)
        await this.executePhase('movement', () => this.processMovement());

        // Phase 3: Combat resolution
        await this.executePhase('combat', () => this.processCombat());

        // Phase 4: Random events
        await this.executePhase('events', () => this.processEvents());

        // Phase 5: AI turn
        await this.executePhase('ai', () => this.processAI());

        // Phase 6: Cleanup and state updates
        await this.executePhase('cleanup', () => this.processCleanup());

        // Increment turn
        this.state.turn++;

        // Update game phase
        this.updateGamePhase();

        // Trigger turn end callbacks
        for (const callback of this.turnCallbacks) {
            await callback(this.state.turn);
        }

        // Auto-save
        if (this.state.settings.autoSave) {
            this.systems.save.autoSave();
        }
    }

    async executePhase(phaseName, defaultAction) {
        await defaultAction();
        for (const callback of this.phaseCallbacks[phaseName]) {
            await callback();
        }
    }

    processProduction() {
        // Calculate and apply income
        this.state.calculateEconomy();

        const player = this.state.player;
        const netEnergy = player.income.energy - player.upkeep.energy;
        const netMinerals = player.income.minerals - player.upkeep.minerals;

        player.resources.energy += netEnergy;
        player.resources.minerals += netMinerals;
        player.resources.research += player.income.research;

        // Prevent negative resources (with penalties)
        if (player.resources.energy < 0) {
            this.state.addNotification('Energy deficit! Fleet effectiveness reduced.', 'warning');
            player.resources.energy = 0;
        }
        if (player.resources.minerals < 0) {
            player.resources.minerals = 0;
        }

        // Process tech research
        this.processResearch(player);

        // Process colony growth
        this.processColonyGrowth(player);

        // Process excavations
        this.processExcavations();

        // Process station construction
        this.systems.colony.processStationConstruction('player');

        // AI production (simplified)
        this.processAIProduction();
    }

    processResearch(entity) {
        const researchPerCategory = Math.floor(entity.resources.research / 3);

        for (const category of ['military', 'economy', 'subterfuge']) {
            const tech = entity.technology[category];
            if (tech.researching) {
                tech.progress += researchPerCategory;

                const requiredProgress = this.getRequiredResearch(tech.level + 1);
                if (tech.progress >= requiredProgress) {
                    tech.level++;
                    tech.progress = 0;
                    tech.researching = null;

                    if (entity === this.state.player) {
                        this.state.addNotification(
                            `${category.charAt(0).toUpperCase() + category.slice(1)} tech level ${tech.level} complete!`,
                            'success'
                        );
                    }
                }
            }
        }
    }

    getRequiredResearch(level) {
        return 50 * level * level; // Exponential scaling
    }

    processColonyGrowth(entity) {
        for (const colony of entity.colonies) {
            // Population growth
            const maxPop = this.calculateMaxPopulation(colony);
            if (colony.population < maxPop) {
                const growthRate = 0.05 + (colony.happiness || 0.5) * 0.05;
                colony.population = Math.min(maxPop, colony.population + growthRate);
            }
        }
    }

    calculateMaxPopulation(colony) {
        // Base + city districts
        const cityDistricts = colony.districts.filter(d => d.type === 'city').length;
        return 2 + (cityDistricts * 3);
    }

    processExcavations() {
        for (const [siteId, excavation] of Object.entries(this.state.excavations)) {
            if (excavation.active && excavation.owner === 'player') {
                // Progress excavation based on research output
                const researchContribution = Math.floor(this.state.player.income.research * 0.5);
                excavation.progress += researchContribution;

                const requiredProgress = excavation.currentLayer * 20;
                if (excavation.progress >= requiredProgress) {
                    excavation.readyForChoice = true;
                    this.state.addNotification(
                        `Excavation at ${excavation.systemName} ready for decision!`,
                        'success'
                    );
                }
            }
        }
    }

    processMovement() {
        // Process player fleet movements
        for (const fleet of this.state.player.fleets) {
            if (fleet.destination && fleet.destination !== fleet.systemId) {
                this.moveFleet(fleet, 'player');
            }
        }

        // Process AI fleet movements (handled in AI phase for strategic reasons)
    }

    moveFleet(fleet, owner) {
        const path = this.findPath(fleet.systemId, fleet.destination);
        if (path && path.length > 1) {
            const nextSystem = path[1];

            // Check if we can enter the system
            const systemController = this.state.getSystemController(nextSystem);

            // Move to next system
            fleet.systemId = nextSystem;

            // Discover system
            const entity = owner === 'player' ? this.state.player : this.state.ai;
            entity.knownSystems.add(nextSystem);

            // Check if arrived at destination
            if (fleet.systemId === fleet.destination) {
                fleet.destination = null;

                if (owner === 'player') {
                    const system = this.state.getSystem(fleet.systemId);
                    this.state.addNotification(
                        `Fleet "${fleet.name}" arrived at ${system.name}`,
                        'info'
                    );
                }
            }
        }
    }

    findPath(fromId, toId) {
        // BFS pathfinding through hyperlanes
        const queue = [[fromId]];
        const visited = new Set([fromId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === toId) {
                return path;
            }

            // Get connected systems
            const connections = this.state.galaxy.hyperlanes
                .filter(h => h.from === current || h.to === current)
                .map(h => h.from === current ? h.to : h.from);

            for (const next of connections) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push([...path, next]);
                }
            }
        }

        return null; // No path found
    }

    processCombat() {
        // Check for hostile fleet encounters
        const systemFleets = new Map();

        // Group fleets by system
        for (const fleet of this.state.player.fleets) {
            if (!systemFleets.has(fleet.systemId)) {
                systemFleets.set(fleet.systemId, { player: [], ai: [] });
            }
            systemFleets.get(fleet.systemId).player.push(fleet);
        }

        for (const fleet of this.state.ai.fleets) {
            if (!systemFleets.has(fleet.systemId)) {
                systemFleets.set(fleet.systemId, { player: [], ai: [] });
            }
            systemFleets.get(fleet.systemId).ai.push(fleet);
        }

        // Resolve combat where both sides are present and at war
        if (this.state.ai.stance === 'war') {
            for (const [systemId, fleets] of systemFleets) {
                if (fleets.player.length > 0 && fleets.ai.length > 0) {
                    this.systems.combat.resolveCombat(systemId, fleets.player, fleets.ai);
                }
            }
        }
    }

    processEvents() {
        // Check if it's time for a random event
        const turnsSinceEvent = this.state.turn - this.state.lastEventTurn;
        if (turnsSinceEvent >= 10 && Math.random() < 0.15) {
            this.systems.events.triggerRandomEvent();
            this.state.lastEventTurn = this.state.turn;
        }
    }

    processAI() {
        this.systems.ai.takeTurn();
    }

    processAIProduction() {
        const ai = this.state.ai;

        // Simplified AI income
        ai.resources.energy += 5 * ai.colonies.length + 10;
        ai.resources.minerals += 5 * ai.colonies.length + 10;
        ai.resources.research += 3 * ai.colonies.length + 5;

        // AI tech progress
        for (const category of ['military', 'economy', 'subterfuge']) {
            ai.technology[category].progress += Math.floor(ai.resources.research / 3);
            const requiredProgress = this.getRequiredResearch(ai.technology[category].level + 1);
            if (ai.technology[category].progress >= requiredProgress) {
                ai.technology[category].level++;
                ai.technology[category].progress = 0;
            }
        }

        // AI colony growth
        this.processColonyGrowth(ai);
    }

    processCleanup() {
        // Remove destroyed fleets
        this.state.player.fleets = this.state.player.fleets.filter(f => f.ships.length > 0);
        this.state.ai.fleets = this.state.ai.fleets.filter(f => f.ships.length > 0);

        // Update controlled systems based on fleet presence and colonies
        this.updateSystemControl();

        // Decay war exhaustion over time (during peace)
        if (this.state.ai.stance !== 'war') {
            this.state.player.warExhaustion = Math.max(0, this.state.player.warExhaustion - 2);
            this.state.ai.warExhaustion = Math.max(0, this.state.ai.warExhaustion - 2);
        }

        // Clear old notifications (keep last 20)
        if (this.state.player.notifications.length > 20) {
            this.state.player.notifications = this.state.player.notifications.slice(-20);
        }
    }

    updateSystemControl() {
        for (const system of this.state.galaxy.systems) {
            const playerPresence = this.state.player.fleets.some(f => f.systemId === system.id) ||
                this.state.player.colonies.some(c => {
                    const planet = this.state.getPlanet(system.id, c.planetId);
                    return planet !== null;
                });

            const aiPresence = this.state.ai.fleets.some(f => f.systemId === system.id) ||
                this.state.ai.colonies.some(c => {
                    const planet = this.state.getPlanet(system.id, c.planetId);
                    return planet !== null;
                });

            // Update control arrays
            const playerControlIndex = this.state.player.controlledSystems.indexOf(system.id);
            const aiControlIndex = this.state.ai.controlledSystems.indexOf(system.id);

            if (playerPresence && !aiPresence) {
                if (playerControlIndex === -1) {
                    this.state.player.controlledSystems.push(system.id);
                }
                if (aiControlIndex !== -1) {
                    this.state.ai.controlledSystems.splice(aiControlIndex, 1);
                }
            } else if (aiPresence && !playerPresence) {
                if (aiControlIndex === -1) {
                    this.state.ai.controlledSystems.push(system.id);
                }
                if (playerControlIndex !== -1) {
                    this.state.player.controlledSystems.splice(playerControlIndex, 1);
                }
            }
        }
    }

    updateGamePhase() {
        const totalSystems = this.state.galaxy.systems.length;
        const exploredSystems = this.state.player.knownSystems.size;
        const explorationRatio = exploredSystems / totalSystems;

        if (explorationRatio < 0.5 || this.state.turn < 20) {
            this.state.gamePhase = 'exploration';
        } else if (this.state.turn < 50 && this.state.ai.stance !== 'war') {
            this.state.gamePhase = 'midgame';
        } else {
            this.state.gamePhase = 'lategame';
        }
    }
}

export default TurnManager;
