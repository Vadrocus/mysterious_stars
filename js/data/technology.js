// technology.js - Tech tree definitions

export const TECHNOLOGY = {
    military: {
        name: 'Military',
        description: 'Combat effectiveness, weapons, and defenses',
        icon: '⚔️',
        tiers: [
            {
                level: 1,
                name: 'Improved Weapons',
                description: '+10% combat damage',
                cost: 50,
                effects: { combatBonus: 0.1 }
            },
            {
                level: 2,
                name: 'Advanced Armor',
                description: '+15% ship durability',
                cost: 150,
                effects: { durabilityBonus: 0.15 }
            },
            {
                level: 3,
                name: 'Tactical Computers',
                description: '+20% combat effectiveness',
                cost: 300,
                effects: { combatBonus: 0.2 }
            },
            {
                level: 4,
                name: 'Plasma Weapons',
                description: '+25% combat damage, unlocks cruiser upgrades',
                cost: 500,
                effects: { combatBonus: 0.25, unlocks: ['advanced_cruiser'] }
            },
            {
                level: 5,
                name: 'Quantum Shields',
                description: '+30% ship durability, planetary defense bonus',
                cost: 800,
                effects: { durabilityBonus: 0.3, defenseBonus: 0.2 }
            }
        ]
    },
    economy: {
        name: 'Economy',
        description: 'Resource extraction, construction, and efficiency',
        icon: '💰',
        tiers: [
            {
                level: 1,
                name: 'Improved Mining',
                description: '+10% mineral production',
                cost: 50,
                effects: { mineralBonus: 0.1 }
            },
            {
                level: 2,
                name: 'Energy Grid',
                description: '+15% energy production',
                cost: 150,
                effects: { energyBonus: 0.15 }
            },
            {
                level: 3,
                name: 'Colonial Administration',
                description: '+1 building slot on colonies',
                cost: 300,
                effects: { buildingSlots: 1 }
            },
            {
                level: 4,
                name: 'Automated Mining',
                description: '+25% mineral production, -10% upkeep',
                cost: 500,
                effects: { mineralBonus: 0.25, upkeepReduction: 0.1 }
            },
            {
                level: 5,
                name: 'Megastructure Engineering',
                description: 'Unlocks advanced stations and orbital facilities',
                cost: 800,
                effects: { unlocks: ['orbital_ring', 'megastation'] }
            }
        ]
    },
    subterfuge: {
        name: 'Subterfuge',
        description: 'Stealth, sensors, and espionage',
        icon: '🔍',
        tiers: [
            {
                level: 1,
                name: 'Improved Sensors',
                description: 'Scan systems without entering',
                cost: 50,
                effects: { sensorRange: 1 }
            },
            {
                level: 2,
                name: 'Sensor Dampening',
                description: 'Enemies see less fleet information',
                cost: 150,
                effects: { fleetObscurity: 0.3 }
            },
            {
                level: 3,
                name: 'Stealth Coating',
                description: 'Ships can move without triggering alerts',
                cost: 300,
                effects: { stealthMovement: true }
            },
            {
                level: 4,
                name: 'Deep Space Arrays',
                description: 'See fleet movements in adjacent systems',
                cost: 500,
                effects: { fleetTracking: true }
            },
            {
                level: 5,
                name: 'Cloaking Technology',
                description: 'Fleets become invisible until they attack',
                cost: 800,
                effects: { cloaking: true }
            }
        ]
    }
};

export const SHIP_UPGRADES = {
    corvette: [
        {
            id: 'corvette_mk2',
            name: 'Corvette Mk II',
            requiresTech: { military: 2 },
            statBonus: { speed: 0.2, health: 0.1 },
            costIncrease: 0.2
        }
    ],
    frigate: [
        {
            id: 'frigate_mk2',
            name: 'Frigate Mk II',
            requiresTech: { military: 3 },
            statBonus: { damage: 0.15, health: 0.15 },
            costIncrease: 0.25
        }
    ],
    cruiser: [
        {
            id: 'advanced_cruiser',
            name: 'Advanced Cruiser',
            requiresTech: { military: 4 },
            statBonus: { damage: 0.25, health: 0.2 },
            costIncrease: 0.3
        }
    ],
    science: [
        {
            id: 'explorer',
            name: 'Explorer Vessel',
            requiresTech: { subterfuge: 2 },
            statBonus: { scanSpeed: 0.5 },
            costIncrease: 0.15
        }
    ]
};

export const STATION_TYPES = {
    mining: {
        name: 'Mining Station',
        description: 'Extracts minerals from asteroids and barren worlds',
        cost: { minerals: 75, energy: 25 },
        upkeep: { energy: 1 },
        output: { minerals: 3 },
        buildTime: 3
    },
    research: {
        name: 'Research Station',
        description: 'Conducts research in space',
        cost: { minerals: 100, energy: 50 },
        upkeep: { energy: 2 },
        output: { research: 4 },
        buildTime: 4
    },
    defense: {
        name: 'Defense Platform',
        description: 'Provides system defense bonus',
        cost: { minerals: 150, energy: 75 },
        upkeep: { energy: 3 },
        defenseStrength: 30,
        buildTime: 5
    },
    shipyard: {
        name: 'Orbital Shipyard',
        description: 'Allows ship construction without colony',
        cost: { minerals: 300, energy: 150 },
        upkeep: { energy: 5 },
        buildTime: 8,
        requiresTech: { economy: 3 }
    }
};

export default {
    TECHNOLOGY,
    SHIP_UPGRADES,
    STATION_TYPES
};
