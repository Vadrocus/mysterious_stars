// GameState.js - Core game state management

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.turn = 1;
        this.gamePhase = 'exploration'; // exploration, midgame, lategame

        // Player resources
        this.player = {
            name: 'Human Empire',
            resources: {
                energy: 100,
                minerals: 100,
                research: 0
            },
            income: {
                energy: 0,
                minerals: 0,
                research: 0
            },
            upkeep: {
                energy: 0,
                minerals: 0
            },
            technology: {
                military: { level: 0, progress: 0, researching: null },
                economy: { level: 0, progress: 0, researching: null },
                subterfuge: { level: 0, progress: 0, researching: null }
            },
            fleets: [],
            colonies: [],
            controlledSystems: [],
            knownSystems: new Set(), // System IDs the player has visited
            scannedSystems: new Set(), // System IDs fully scanned
            deepScannedSystems: new Set(), // System IDs deep scanned
            homeworld: null, // { systemId, planetId }
            codex: [], // Discovered lore entries
            notifications: [],
            warExhaustion: 0,
            legitimacy: 100
        };

        // AI opponent
        this.ai = {
            name: 'Vel\'kari Collective',
            resources: {
                energy: 100,
                minerals: 100,
                research: 0
            },
            technology: {
                military: { level: 0, progress: 0 },
                economy: { level: 0, progress: 0 },
                subterfuge: { level: 0, progress: 0 }
            },
            fleets: [],
            colonies: [],
            controlledSystems: [],
            knownSystems: new Set(),
            scannedSystems: new Set(),
            deepScannedSystems: new Set(),
            trust: 50, // 0-100
            stance: 'neutral', // friendly, neutral, suspicious, hostile, war
            beliefs: {}, // What AI believes about player
            warExhaustion: 0,
            goals: [] // Current AI objectives
        };

        // Galaxy state
        this.galaxy = {
            systems: [],
            hyperlanes: [],
            centerX: 0,
            centerY: 0
        };

        // Active excavations
        this.excavations = {};

        // Random event state
        this.lastEventTurn = 0;

        // Treaties and agreements
        this.treaties = [];

        // Win condition tracking
        this.metaChainProgress = {
            discovered: [],
            completed: false
        };

        // First-time tooltips shown
        this.shownTooltips = new Set();

        // Game settings
        this.settings = {
            autoSave: true,
            musicVolume: 0.5,
            sfxVolume: 0.7
        };
    }

    // Serialize state for saving
    serialize() {
        return JSON.stringify({
            turn: this.turn,
            gamePhase: this.gamePhase,
            player: {
                ...this.player,
                knownSystems: Array.from(this.player.knownSystems),
                scannedSystems: Array.from(this.player.scannedSystems),
                deepScannedSystems: Array.from(this.player.deepScannedSystems)
            },
            ai: {
                ...this.ai,
                knownSystems: Array.from(this.ai.knownSystems),
                scannedSystems: Array.from(this.ai.scannedSystems),
                deepScannedSystems: Array.from(this.ai.deepScannedSystems)
            },
            galaxy: this.galaxy,
            excavations: this.excavations,
            lastEventTurn: this.lastEventTurn,
            treaties: this.treaties,
            metaChainProgress: this.metaChainProgress,
            shownTooltips: Array.from(this.shownTooltips),
            settings: this.settings
        });
    }

    // Deserialize state from save
    deserialize(data) {
        const parsed = JSON.parse(data);

        this.turn = parsed.turn;
        this.gamePhase = parsed.gamePhase;

        this.player = {
            ...parsed.player,
            knownSystems: new Set(parsed.player.knownSystems),
            scannedSystems: new Set(parsed.player.scannedSystems),
            deepScannedSystems: new Set(parsed.player.deepScannedSystems)
        };

        this.ai = {
            ...parsed.ai,
            knownSystems: new Set(parsed.ai.knownSystems),
            scannedSystems: new Set(parsed.ai.scannedSystems || []),
            deepScannedSystems: new Set(parsed.ai.deepScannedSystems || [])
        };

        this.galaxy = parsed.galaxy;
        this.excavations = parsed.excavations;
        this.lastEventTurn = parsed.lastEventTurn;
        this.treaties = parsed.treaties;
        this.metaChainProgress = parsed.metaChainProgress;
        this.shownTooltips = new Set(parsed.shownTooltips);
        this.settings = parsed.settings;
    }

    // Get system by ID
    getSystem(systemId) {
        return this.galaxy.systems.find(s => s.id === systemId);
    }

    // Get planet by ID
    getPlanet(systemId, planetId) {
        const system = this.getSystem(systemId);
        if (!system) return null;
        return system.planets.find(p => p.id === planetId);
    }

    // Get fleet by ID
    getFleet(fleetId, owner = 'player') {
        const fleets = owner === 'player' ? this.player.fleets : this.ai.fleets;
        return fleets.find(f => f.id === fleetId);
    }

    // Get colony by planet ID
    getColony(planetId, owner = 'player') {
        const colonies = owner === 'player' ? this.player.colonies : this.ai.colonies;
        return colonies.find(c => c.planetId === planetId);
    }

    // Check visibility level for a system
    getSystemVisibility(systemId, owner = 'player') {
        const entity = owner === 'player' ? this.player : this.ai;

        if (entity.deepScannedSystems.has(systemId)) return 'deep_scanned';
        if (entity.scannedSystems.has(systemId)) return 'scanned';
        if (entity.knownSystems.has(systemId)) return 'visited';
        return 'unknown';
    }

    // Check if system is controlled by anyone
    getSystemController(systemId) {
        if (this.player.controlledSystems.includes(systemId)) return 'player';
        if (this.ai.controlledSystems.includes(systemId)) return 'ai';
        return null;
    }

    // Add notification
    addNotification(message, type = 'info') {
        this.player.notifications.push({
            turn: this.turn,
            message,
            type,
            timestamp: Date.now()
        });
    }

    // Calculate total income/upkeep
    calculateEconomy() {
        let energyIncome = 0;
        let mineralsIncome = 0;
        let researchIncome = 0;
        let energyUpkeep = 0;

        // Colony production
        for (const colony of this.player.colonies) {
            const output = this.calculateColonyOutput(colony);
            energyIncome += output.energy;
            mineralsIncome += output.minerals;
            researchIncome += output.research;
        }

        // Station production (from controlled systems)
        for (const systemId of this.player.controlledSystems) {
            const system = this.getSystem(systemId);
            if (system && system.stations) {
                for (const station of system.stations) {
                    if (station.type === 'mining') mineralsIncome += station.output;
                    if (station.type === 'research') researchIncome += station.output;
                    energyUpkeep += station.upkeep || 1;
                }
            }
        }

        // Fleet upkeep
        for (const fleet of this.player.fleets) {
            energyUpkeep += this.calculateFleetUpkeep(fleet);
        }

        this.player.income = { energy: energyIncome, minerals: mineralsIncome, research: researchIncome };
        this.player.upkeep = { energy: energyUpkeep, minerals: 0 };
    }

    calculateColonyOutput(colony) {
        let energy = 0;
        let minerals = 0;
        let research = 0;

        for (const district of colony.districts) {
            if (district.type === 'generator') energy += 4;
            if (district.type === 'mining') minerals += 4;
            if (district.type === 'research') research += 4;
        }

        for (const building of colony.buildings) {
            if (building) {
                if (building.type === 'research_lab') research += 6;
                if (building.type === 'power_plant') energy += 6;
                if (building.type === 'mineral_processor') minerals += 3;
            }
        }

        // Population bonus
        const popBonus = 1 + (colony.population * 0.1);
        return {
            energy: Math.floor(energy * popBonus),
            minerals: Math.floor(minerals * popBonus),
            research: Math.floor(research * popBonus)
        };
    }

    calculateFleetUpkeep(fleet) {
        let upkeep = 0;
        for (const ship of fleet.ships) {
            if (ship.type === 'corvette') upkeep += 1;
            if (ship.type === 'frigate') upkeep += 2;
            if (ship.type === 'cruiser') upkeep += 4;
            if (ship.type === 'science') upkeep += 2;
        }
        return upkeep;
    }

    // Count controlled systems
    getSystemCounts() {
        return {
            player: this.player.controlledSystems.length,
            ai: this.ai.controlledSystems.length,
            total: this.galaxy.systems.length
        };
    }

    // Check win conditions
    checkWinCondition() {
        const counts = this.getSystemCounts();
        const majorityThreshold = Math.ceil(counts.total / 2);

        // Majority control
        if (counts.player >= majorityThreshold) {
            return { winner: 'player', reason: 'majority_control' };
        }
        if (counts.ai >= majorityThreshold) {
            return { winner: 'ai', reason: 'majority_control' };
        }

        // Elimination
        if (this.ai.colonies.length === 0 && this.ai.fleets.length === 0) {
            return { winner: 'player', reason: 'elimination' };
        }
        if (this.player.colonies.length === 0 && this.player.fleets.length === 0) {
            return { winner: 'ai', reason: 'elimination' };
        }

        // Meta-chain completion gives huge advantage but not instant win
        // (Handled separately in game logic)

        return null;
    }
}

export default GameState;
