// ColonyManager.js - Colony management, districts, and buildings

export class ColonyManager {
    constructor(gameState) {
        this.state = gameState;
    }

    // Station definitions (orbital structures)
    getStationTypes() {
        return {
            shipyard: {
                name: 'Shipyard',
                icon: '🛸',
                description: 'Enables ship construction and colonization in this system',
                cost: { minerals: 300, energy: 150 },
                upkeep: { energy: 5 },
                buildTime: 5,
                providesVision: true
            },
            mining_station: {
                name: 'Mining Station',
                icon: '⛏️',
                description: 'Extracts minerals from asteroid belts',
                cost: { minerals: 150, energy: 50 },
                upkeep: { energy: 2 },
                output: { minerals: 5 },
                buildTime: 3,
                requiresAsteroidBelt: true
            },
            research_station: {
                name: 'Research Station',
                icon: '🔭',
                description: 'Conducts scientific research in orbit',
                cost: { minerals: 200, energy: 100 },
                upkeep: { energy: 3 },
                output: { research: 4 },
                buildTime: 4
            },
            defense_platform: {
                name: 'Defense Platform',
                icon: '🛡️',
                description: 'Provides system defense',
                cost: { minerals: 250, energy: 100 },
                upkeep: { energy: 4 },
                buildTime: 4,
                defenseStrength: 30
            }
        };
    }

    // Check if system has a shipyard (for colonization and ship building)
    systemHasShipyard(systemId, owner = 'player') {
        const system = this.state.getSystem(systemId);
        if (!system) return false;

        // Check orbital shipyards
        if (system.stations?.some(s => s.type === 'shipyard' && s.owner === owner)) {
            return true;
        }

        // Check colony starports
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        for (const colony of colonies) {
            if (colony.systemId === systemId) {
                if (colony.buildings.some(b => b && b.type === 'starport')) {
                    return true;
                }
            }
        }

        return false;
    }

    // Get all systems where player has shipyards (for visibility)
    getSystemsWithShipyards(owner = 'player') {
        const systemIds = new Set();

        // Check all systems for orbital shipyards
        for (const system of this.state.galaxy.systems) {
            if (system.stations?.some(s => s.type === 'shipyard' && s.owner === owner)) {
                systemIds.add(system.id);
            }
        }

        // Check colonies with starports
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        for (const colony of colonies) {
            if (colony.buildings.some(b => b && b.type === 'starport')) {
                systemIds.add(colony.systemId);
            }
        }

        return systemIds;
    }

    canBuildStation(systemId, stationType, owner = 'player') {
        const system = this.state.getSystem(systemId);
        if (!system) return { can: false, reason: 'System not found' };

        const stationDef = this.getStationTypes()[stationType];
        if (!stationDef) return { can: false, reason: 'Invalid station type' };

        // Check if station type already exists in system
        if (system.stations?.some(s => s.type === stationType && s.owner === owner)) {
            return { can: false, reason: `${stationDef.name} already exists in this system` };
        }

        // Check for asteroid belt requirement
        if (stationDef.requiresAsteroidBelt && !system.asteroidBelt) {
            return { can: false, reason: 'System has no asteroid belt' };
        }

        // Need fleet or colony presence to build (except if you have a shipyard)
        const hasPresence = this.hasPresenceInSystem(systemId, owner);
        if (!hasPresence) {
            return { can: false, reason: 'Need fleet or colony in system to build' };
        }

        // Check resources
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        if (entity.resources.minerals < stationDef.cost.minerals) {
            return { can: false, reason: 'Insufficient minerals' };
        }
        if (entity.resources.energy < stationDef.cost.energy) {
            return { can: false, reason: 'Insufficient energy' };
        }

        return { can: true };
    }

    hasPresenceInSystem(systemId, owner = 'player') {
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Check for fleet
        if (entity.fleets?.some(f => f.systemId === systemId)) {
            return true;
        }

        // Check for colony
        if (entity.colonies?.some(c => c.systemId === systemId)) {
            return true;
        }

        // Check for station
        const system = this.state.getSystem(systemId);
        if (system?.stations?.some(s => s.owner === owner)) {
            return true;
        }

        return false;
    }

    buildStation(systemId, stationType, owner = 'player') {
        const check = this.canBuildStation(systemId, stationType, owner);
        if (!check.can) return { success: false, reason: check.reason };

        const system = this.state.getSystem(systemId);
        const stationDef = this.getStationTypes()[stationType];
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Deduct resources
        entity.resources.minerals -= stationDef.cost.minerals;
        entity.resources.energy -= stationDef.cost.energy;

        // Initialize stations array if needed
        if (!system.stations) {
            system.stations = [];
        }

        // Add station (with build queue for turns)
        const station = {
            id: `station_${Date.now()}`,
            type: stationType,
            owner,
            name: stationDef.name,
            buildProgress: 0,
            buildTime: stationDef.buildTime,
            isBuilding: true,
            upkeep: stationDef.upkeep?.energy || 0,
            output: stationDef.output?.minerals || stationDef.output?.research || 0
        };

        system.stations.push(station);

        // Mark system as known
        entity.knownSystems.add(systemId);

        if (owner === 'player') {
            this.state.addNotification(`${stationDef.name} construction started in ${system.name}`, 'info');
        }

        return { success: true, station };
    }

    processStationConstruction(owner = 'player') {
        for (const system of this.state.galaxy.systems) {
            if (!system.stations) continue;

            for (const station of system.stations) {
                if (station.owner === owner && station.isBuilding) {
                    station.buildProgress++;

                    if (station.buildProgress >= station.buildTime) {
                        station.isBuilding = false;

                        if (owner === 'player') {
                            this.state.addNotification(
                                `${station.name} completed in ${system.name}!`,
                                'success'
                            );
                        }
                    }
                }
            }
        }
    }

    destroyStation(systemId, stationId, owner = 'player') {
        const system = this.state.getSystem(systemId);
        if (!system || !system.stations) return { success: false, reason: 'Station not found' };

        const index = system.stations.findIndex(s => s.id === stationId && s.owner === owner);
        if (index === -1) return { success: false, reason: 'Station not found' };

        system.stations.splice(index, 1);

        // Partial refund
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        entity.resources.minerals += 75;

        return { success: true };
    }

    // District definitions
    getDistrictTypes() {
        return {
            city: {
                name: 'City District',
                icon: '🏙️',
                description: 'Provides housing for population',
                cost: { minerals: 100 },
                upkeep: { energy: 2 },
                output: { housing: 3 },
                buildTime: 3
            },
            mining: {
                name: 'Mining District',
                icon: '⛏️',
                description: 'Extracts minerals from the planet',
                cost: { minerals: 75 },
                upkeep: { energy: 1 },
                output: { minerals: 4 },
                buildTime: 2
            },
            generator: {
                name: 'Generator District',
                icon: '⚡',
                description: 'Generates energy from various sources',
                cost: { minerals: 75 },
                upkeep: { minerals: 1 },
                output: { energy: 4 },
                buildTime: 2
            },
            research: {
                name: 'Research District',
                icon: '🔬',
                description: 'Facilitates scientific research',
                cost: { minerals: 100, energy: 25 },
                upkeep: { energy: 2 },
                output: { research: 4 },
                buildTime: 3
            }
        };
    }

    // Building definitions
    getBuildingTypes() {
        return {
            research_lab: {
                name: 'Research Lab',
                icon: '🧪',
                description: 'Advanced research facility',
                cost: { minerals: 150, energy: 50 },
                upkeep: { energy: 3 },
                output: { research: 6 },
                buildTime: 4
            },
            power_plant: {
                name: 'Power Plant',
                icon: '🏭',
                description: 'Large-scale energy generation',
                cost: { minerals: 150 },
                upkeep: { minerals: 2 },
                output: { energy: 6 },
                buildTime: 4
            },
            mineral_processor: {
                name: 'Mineral Processor',
                icon: '🔧',
                description: 'Increases mining efficiency',
                cost: { minerals: 100, energy: 30 },
                upkeep: { energy: 2 },
                output: { minerals: 3 },
                effect: 'mining_bonus',
                buildTime: 3
            },
            starport: {
                name: 'Starport',
                icon: '🚀',
                description: 'Enables ship construction',
                cost: { minerals: 200, energy: 100 },
                upkeep: { energy: 5 },
                output: {},
                effect: 'shipyard',
                buildTime: 5
            },
            planetary_defense: {
                name: 'Planetary Defense',
                icon: '🛡️',
                description: 'Protects against invasion',
                cost: { minerals: 300, energy: 100 },
                upkeep: { energy: 4 },
                output: {},
                effect: 'defense_bonus',
                defenseStrength: 50,
                buildTime: 6
            },
            archaeology_center: {
                name: 'Archaeology Center',
                icon: '📜',
                description: 'Speeds up excavation',
                cost: { minerals: 150, energy: 75 },
                upkeep: { energy: 3 },
                output: { research: 2 },
                effect: 'excavation_bonus',
                buildTime: 4
            }
        };
    }

    canColonize(systemId, planetId, owner = 'player') {
        const system = this.state.getSystem(systemId);
        const planet = system?.planets.find(p => p.id === planetId);

        if (!planet) return { can: false, reason: 'Planet not found' };
        if (!planet.habitable) return { can: false, reason: 'Planet is not habitable' };
        if (planet.colonized) return { can: false, reason: 'Planet already colonized' };

        // Require shipyard in system (unless it's the homeworld system which starts with one)
        const isHomeSystem = this.state.player.homeworld?.systemId === systemId;
        if (!isHomeSystem && !this.systemHasShipyard(systemId, owner)) {
            return { can: false, reason: 'System requires a Shipyard to colonize' };
        }

        // Check resources
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        if (entity.resources.minerals < 200 || entity.resources.energy < 100) {
            return { can: false, reason: 'Insufficient resources (200 minerals, 100 energy)' };
        }

        return { can: true };
    }

    colonize(systemId, planetId, owner = 'player') {
        const check = this.canColonize(systemId, planetId, owner);
        if (!check.can) return { success: false, reason: check.reason };

        const system = this.state.getSystem(systemId);
        const planet = system.planets.find(p => p.id === planetId);
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Deduct resources
        entity.resources.minerals -= 200;
        entity.resources.energy -= 100;

        // Mark planet as colonized
        planet.colonized = true;
        planet.owner = owner;

        // Create colony
        const colony = {
            id: `colony_${Date.now()}`,
            planetId,
            systemId,
            name: planet.name,
            population: 1,
            happiness: 0.7,
            districts: [{ type: 'city', id: 'dist_0' }], // Start with one city
            buildings: [null, null, null, null].slice(0, this.getBuildingSlots(planet)),
            maxDistricts: Math.floor(planet.size / 4),
            buildQueue: []
        };

        entity.colonies.push(colony);

        // Gain control of system
        if (!entity.controlledSystems.includes(systemId)) {
            entity.controlledSystems.push(systemId);
        }

        if (owner === 'player') {
            this.state.addNotification(`Colony established on ${planet.name}!`, 'success');
        }

        return { success: true, colony };
    }

    getBuildingSlots(planet) {
        // Building slots based on planet type
        const slotsByType = {
            continental: 4,
            ocean: 3,
            desert: 3,
            arctic: 3,
            barren: 2,
            gas_giant: 0
        };
        return slotsByType[planet.type] || 2;
    }

    canBuildDistrict(colonyId, districtType, owner = 'player') {
        const colony = this.state.getColony(colonyId, owner) ||
            this.findColonyById(colonyId, owner);
        if (!colony) return { can: false, reason: 'Colony not found' };

        const districtDef = this.getDistrictTypes()[districtType];
        if (!districtDef) return { can: false, reason: 'Invalid district type' };

        if (colony.districts.length >= colony.maxDistricts) {
            return { can: false, reason: 'Maximum districts reached' };
        }

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const cost = districtDef.cost;

        if (entity.resources.minerals < (cost.minerals || 0)) {
            return { can: false, reason: 'Insufficient minerals' };
        }
        if (entity.resources.energy < (cost.energy || 0)) {
            return { can: false, reason: 'Insufficient energy' };
        }

        return { can: true };
    }

    findColonyById(colonyId, owner = 'player') {
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        return colonies.find(c => c.id === colonyId);
    }

    findColonyByPlanetId(planetId, owner = 'player') {
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        return colonies.find(c => c.planetId === planetId);
    }

    buildDistrict(colonyId, districtType, owner = 'player') {
        const check = this.canBuildDistrict(colonyId, districtType, owner);
        if (!check.can) return { success: false, reason: check.reason };

        const colony = this.findColonyById(colonyId, owner);
        const districtDef = this.getDistrictTypes()[districtType];
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Deduct resources
        entity.resources.minerals -= districtDef.cost.minerals || 0;
        entity.resources.energy -= districtDef.cost.energy || 0;

        // Add to build queue
        colony.buildQueue.push({
            type: 'district',
            districtType,
            turnsRemaining: districtDef.buildTime,
            id: `dist_${Date.now()}`
        });

        if (owner === 'player') {
            this.state.addNotification(
                `${districtDef.name} construction started on ${colony.name}`,
                'info'
            );
        }

        return { success: true };
    }

    canBuildBuilding(colonyId, buildingType, slotIndex, owner = 'player') {
        const colony = this.findColonyById(colonyId, owner);
        if (!colony) return { can: false, reason: 'Colony not found' };

        const buildingDef = this.getBuildingTypes()[buildingType];
        if (!buildingDef) return { can: false, reason: 'Invalid building type' };

        if (slotIndex >= colony.buildings.length) {
            return { can: false, reason: 'Invalid building slot' };
        }

        if (colony.buildings[slotIndex] !== null) {
            return { can: false, reason: 'Slot already occupied' };
        }

        // Check if already building something
        const alreadyBuilding = colony.buildQueue.some(b =>
            b.type === 'building' && b.slotIndex === slotIndex
        );
        if (alreadyBuilding) {
            return { can: false, reason: 'Slot already under construction' };
        }

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const cost = buildingDef.cost;

        if (entity.resources.minerals < (cost.minerals || 0)) {
            return { can: false, reason: 'Insufficient minerals' };
        }
        if (entity.resources.energy < (cost.energy || 0)) {
            return { can: false, reason: 'Insufficient energy' };
        }

        return { can: true };
    }

    buildBuilding(colonyId, buildingType, slotIndex, owner = 'player') {
        const check = this.canBuildBuilding(colonyId, buildingType, slotIndex, owner);
        if (!check.can) return { success: false, reason: check.reason };

        const colony = this.findColonyById(colonyId, owner);
        const buildingDef = this.getBuildingTypes()[buildingType];
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Deduct resources
        entity.resources.minerals -= buildingDef.cost.minerals || 0;
        entity.resources.energy -= buildingDef.cost.energy || 0;

        // Add to build queue
        colony.buildQueue.push({
            type: 'building',
            buildingType,
            slotIndex,
            turnsRemaining: buildingDef.buildTime,
            id: `bld_${Date.now()}`
        });

        if (owner === 'player') {
            this.state.addNotification(
                `${buildingDef.name} construction started on ${colony.name}`,
                'info'
            );
        }

        return { success: true };
    }

    processBuildQueues(owner = 'player') {
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;

        for (const colony of colonies) {
            const completedItems = [];

            for (const item of colony.buildQueue) {
                item.turnsRemaining--;

                if (item.turnsRemaining <= 0) {
                    completedItems.push(item);

                    if (item.type === 'district') {
                        colony.districts.push({
                            type: item.districtType,
                            id: item.id
                        });

                        if (owner === 'player') {
                            const districtDef = this.getDistrictTypes()[item.districtType];
                            this.state.addNotification(
                                `${districtDef.name} completed on ${colony.name}`,
                                'success'
                            );
                        }
                    } else if (item.type === 'building') {
                        colony.buildings[item.slotIndex] = {
                            type: item.buildingType,
                            id: item.id
                        };

                        if (owner === 'player') {
                            const buildingDef = this.getBuildingTypes()[item.buildingType];
                            this.state.addNotification(
                                `${buildingDef.name} completed on ${colony.name}`,
                                'success'
                            );
                        }
                    }
                }
            }

            // Remove completed items from queue
            colony.buildQueue = colony.buildQueue.filter(item =>
                !completedItems.includes(item)
            );
        }
    }

    calculateColonyOutput(colony) {
        const districtTypes = this.getDistrictTypes();
        const buildingTypes = this.getBuildingTypes();

        let output = {
            energy: 0,
            minerals: 0,
            research: 0,
            housing: 0
        };

        let energyUpkeep = 0;
        let mineralsUpkeep = 0;

        // District output
        for (const district of colony.districts) {
            const def = districtTypes[district.type];
            if (def) {
                output.energy += def.output.energy || 0;
                output.minerals += def.output.minerals || 0;
                output.research += def.output.research || 0;
                output.housing += def.output.housing || 0;
                energyUpkeep += def.upkeep.energy || 0;
                mineralsUpkeep += def.upkeep.minerals || 0;
            }
        }

        // Building output
        for (const building of colony.buildings) {
            if (building) {
                const def = buildingTypes[building.type];
                if (def) {
                    output.energy += def.output.energy || 0;
                    output.minerals += def.output.minerals || 0;
                    output.research += def.output.research || 0;
                    energyUpkeep += def.upkeep.energy || 0;
                    mineralsUpkeep += def.upkeep.minerals || 0;
                }
            }
        }

        // Population multiplier
        const popMultiplier = 1 + (colony.population * 0.1);
        output.energy = Math.floor(output.energy * popMultiplier);
        output.minerals = Math.floor(output.minerals * popMultiplier);
        output.research = Math.floor(output.research * popMultiplier);

        // Happiness modifier
        const happinessMultiplier = 0.5 + (colony.happiness * 0.5);
        output.energy = Math.floor(output.energy * happinessMultiplier);
        output.minerals = Math.floor(output.minerals * happinessMultiplier);
        output.research = Math.floor(output.research * happinessMultiplier);

        return {
            gross: output,
            upkeep: { energy: energyUpkeep, minerals: mineralsUpkeep },
            net: {
                energy: output.energy - energyUpkeep,
                minerals: output.minerals - mineralsUpkeep,
                research: output.research
            }
        };
    }

    getColonyDefenseStrength(colony) {
        const buildingTypes = this.getBuildingTypes();
        let defense = 10; // Base defense

        for (const building of colony.buildings) {
            if (building) {
                const def = buildingTypes[building.type];
                if (def && def.defenseStrength) {
                    defense += def.defenseStrength;
                }
            }
        }

        // Population adds some defense
        defense += colony.population * 5;

        return defense;
    }

    demolishDistrict(colonyId, districtId, owner = 'player') {
        const colony = this.findColonyById(colonyId, owner);
        if (!colony) return { success: false, reason: 'Colony not found' };

        const index = colony.districts.findIndex(d => d.id === districtId);
        if (index === -1) return { success: false, reason: 'District not found' };

        // Can't demolish last city district if population would exceed housing
        const district = colony.districts[index];
        if (district.type === 'city') {
            const remainingHousing = colony.districts
                .filter(d => d.type === 'city' && d.id !== districtId)
                .length * 3;
            if (colony.population > remainingHousing + 2) {
                return { success: false, reason: 'Would cause housing shortage' };
            }
        }

        colony.districts.splice(index, 1);

        // Partial refund
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        entity.resources.minerals += 25;

        return { success: true };
    }

    demolishBuilding(colonyId, slotIndex, owner = 'player') {
        const colony = this.findColonyById(colonyId, owner);
        if (!colony) return { success: false, reason: 'Colony not found' };

        if (!colony.buildings[slotIndex]) {
            return { success: false, reason: 'No building in slot' };
        }

        colony.buildings[slotIndex] = null;

        // Partial refund
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        entity.resources.minerals += 50;

        return { success: true };
    }

    abandonColony(colonyId, owner = 'player') {
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const index = entity.colonies.findIndex(c => c.id === colonyId);

        if (index === -1) return { success: false, reason: 'Colony not found' };

        const colony = entity.colonies[index];
        const system = this.state.getSystem(colony.systemId);
        const planet = system?.planets.find(p => p.id === colony.planetId);

        if (planet) {
            planet.colonized = false;
            planet.owner = null;
        }

        entity.colonies.splice(index, 1);

        // Update system control
        const hasOtherColonies = entity.colonies.some(c => c.systemId === colony.systemId);
        const hasFleets = entity.fleets?.some(f => f.systemId === colony.systemId);

        if (!hasOtherColonies && !hasFleets) {
            const controlIndex = entity.controlledSystems.indexOf(colony.systemId);
            if (controlIndex !== -1) {
                entity.controlledSystems.splice(controlIndex, 1);
            }
        }

        return { success: true };
    }
}

export default ColonyManager;
