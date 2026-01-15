// FleetManager.js - Fleet creation, movement, and actions

import { FLEET_NAMES } from '../data/names.js';

export class FleetManager {
    constructor(gameState) {
        this.state = gameState;
        this.fleetIdCounter = 0;
    }

    createFleet(owner, systemId, ships, name = null) {
        const fleetList = owner === 'player' ? this.state.player.fleets : this.state.ai.fleets;

        const fleet = {
            id: `fleet_${this.fleetIdCounter++}`,
            name: name || this.generateFleetName(fleetList),
            owner,
            systemId,
            destination: null,
            ships: ships.map((type, i) => ({
                id: `ship_${this.fleetIdCounter}_${i}`,
                type,
                health: this.getShipMaxHealth(type),
                maxHealth: this.getShipMaxHealth(type)
            })),
            orders: null,
            patrolRoute: null,
            experience: 0,
            admiral: null
        };

        fleetList.push(fleet);

        // Discover the system
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        entity.knownSystems.add(systemId);

        return fleet;
    }

    generateFleetName(existingFleets) {
        const usedNames = new Set(existingFleets.map(f => f.name));
        for (const name of FLEET_NAMES) {
            if (!usedNames.has(name)) {
                return name;
            }
        }
        return `Fleet ${existingFleets.length + 1}`;
    }

    getShipMaxHealth(type) {
        const healthByType = {
            corvette: 30,
            frigate: 60,
            cruiser: 120,
            science: 20
        };
        return healthByType[type] || 50;
    }

    getShipCost(type) {
        const costs = {
            corvette: { minerals: 50, energy: 10 },
            frigate: { minerals: 100, energy: 20 },
            cruiser: { minerals: 200, energy: 40 },
            science: { minerals: 80, energy: 30 }
        };
        return costs[type] || { minerals: 50, energy: 10 };
    }

    canBuildShip(owner, type) {
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const cost = this.getShipCost(type);
        return entity.resources.minerals >= cost.minerals &&
            entity.resources.energy >= cost.energy;
    }

    buildShip(owner, fleetId, type) {
        if (!this.canBuildShip(owner, type)) {
            return { success: false, reason: 'Insufficient resources' };
        }

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const fleet = this.state.getFleet(fleetId, owner);

        if (!fleet) {
            return { success: false, reason: 'Fleet not found' };
        }

        // Check if system has a shipyard/starport
        const system = this.state.getSystem(fleet.systemId);
        const hasShipyard = this.systemHasShipyard(system, owner);

        if (!hasShipyard) {
            return { success: false, reason: 'No shipyard in system' };
        }

        // Deduct resources
        const cost = this.getShipCost(type);
        entity.resources.minerals -= cost.minerals;
        entity.resources.energy -= cost.energy;

        // Add ship to fleet
        fleet.ships.push({
            id: `ship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            health: this.getShipMaxHealth(type),
            maxHealth: this.getShipMaxHealth(type)
        });

        return { success: true };
    }

    systemHasShipyard(system, owner) {
        // Check colonies for starport building
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        for (const colony of colonies) {
            const planet = system.planets.find(p => p.id === colony.planetId);
            if (planet) {
                const hasStarport = colony.buildings.some(b => b && b.type === 'starport');
                if (hasStarport) return true;
            }
        }

        // Check for completed orbital shipyard
        return system.stations?.some(s => s.type === 'shipyard' && s.owner === owner && !s.isBuilding);
    }

    setDestination(fleetId, destinationSystemId, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        // Check if destination is reachable
        const path = this.findPath(fleet.systemId, destinationSystemId);
        if (!path) {
            return { success: false, reason: 'No path to destination' };
        }

        fleet.destination = destinationSystemId;
        fleet.orders = 'move';

        return { success: true, path };
    }

    findPath(fromId, toId) {
        const queue = [[fromId]];
        const visited = new Set([fromId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === toId) {
                return path;
            }

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

        return null;
    }

    scanSystem(fleetId, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        // Check for science vessel
        const hasScienceShip = fleet.ships.some(s => s.type === 'science');
        if (!hasScienceShip) {
            return { success: false, reason: 'Requires science vessel' };
        }

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const systemId = fleet.systemId;

        // Mark as scanned
        entity.scannedSystems.add(systemId);

        // Reveal all connected systems (hyperlanes become visible)
        const connectedSystems = this.state.galaxy.hyperlanes
            .filter(h => h.from === systemId || h.to === systemId)
            .map(h => h.from === systemId ? h.to : h.from);

        for (const connectedId of connectedSystems) {
            entity.knownSystems.add(connectedId);
        }

        if (owner === 'player') {
            const system = this.state.getSystem(systemId);
            this.state.addNotification(`System ${system.name} scanned - ${connectedSystems.length} connected systems revealed`, 'success');
        }

        return { success: true };
    }

    deepScanSystem(fleetId, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        const hasScienceShip = fleet.ships.some(s => s.type === 'science');
        if (!hasScienceShip) {
            return { success: false, reason: 'Requires science vessel' };
        }

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const systemId = fleet.systemId;

        // Must be scanned first
        if (!entity.scannedSystems.has(systemId)) {
            return { success: false, reason: 'System must be scanned first' };
        }

        // Deep scanning costs research
        if (owner === 'player' && entity.resources.research < 10) {
            return { success: false, reason: 'Requires 10 research' };
        }

        if (owner === 'player') {
            entity.resources.research -= 10;
        }

        entity.deepScannedSystems.add(systemId);

        if (owner === 'player') {
            const system = this.state.getSystem(systemId);
            this.state.addNotification(`Deep scan of ${system.name} complete`, 'success');

            // Check for archaeology sites
            for (const planet of system.planets) {
                if (planet.archaeologySite && !planet.archaeologySite.discovered) {
                    planet.archaeologySite.discovered = true;
                    this.state.addNotification(
                        `Archaeological site discovered on ${planet.name}!`,
                        'success'
                    );
                }
            }
        }

        return { success: true };
    }

    mergeFleets(fleetId1, fleetId2, owner = 'player') {
        const fleet1 = this.state.getFleet(fleetId1, owner);
        const fleet2 = this.state.getFleet(fleetId2, owner);

        if (!fleet1 || !fleet2) {
            return { success: false, reason: 'Fleet not found' };
        }

        if (fleet1.systemId !== fleet2.systemId) {
            return { success: false, reason: 'Fleets must be in same system' };
        }

        // Move all ships from fleet2 to fleet1
        fleet1.ships.push(...fleet2.ships);

        // Remove fleet2
        const fleetList = owner === 'player' ? this.state.player.fleets : this.state.ai.fleets;
        const index = fleetList.findIndex(f => f.id === fleetId2);
        if (index !== -1) {
            fleetList.splice(index, 1);
        }

        return { success: true, mergedFleet: fleet1 };
    }

    splitFleet(fleetId, shipIndices, newFleetName, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        if (shipIndices.length >= fleet.ships.length) {
            return { success: false, reason: 'Cannot split all ships' };
        }

        // Extract ships for new fleet
        const newShips = shipIndices
            .sort((a, b) => b - a) // Sort descending to remove from end first
            .map(i => fleet.ships.splice(i, 1)[0])
            .reverse();

        // Create new fleet
        const newFleet = {
            id: `fleet_${this.fleetIdCounter++}`,
            name: newFleetName || `${fleet.name} Detachment`,
            owner,
            systemId: fleet.systemId,
            destination: null,
            ships: newShips,
            orders: null,
            patrolRoute: null,
            experience: 0,
            admiral: null
        };

        const fleetList = owner === 'player' ? this.state.player.fleets : this.state.ai.fleets;
        fleetList.push(newFleet);

        return { success: true, newFleet };
    }

    setPatrol(fleetId, systemIds, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        // Validate all systems are connected
        for (let i = 0; i < systemIds.length - 1; i++) {
            const path = this.findPath(systemIds[i], systemIds[i + 1]);
            if (!path) {
                return { success: false, reason: 'Invalid patrol route' };
            }
        }

        fleet.patrolRoute = systemIds;
        fleet.orders = 'patrol';

        return { success: true };
    }

    getFleetStrength(fleet) {
        let strength = 0;
        for (const ship of fleet.ships) {
            const healthRatio = ship.health / ship.maxHealth;
            switch (ship.type) {
                case 'corvette': strength += 10 * healthRatio; break;
                case 'frigate': strength += 25 * healthRatio; break;
                case 'cruiser': strength += 60 * healthRatio; break;
                case 'science': strength += 5 * healthRatio; break;
            }
        }

        // Technology bonus
        const owner = fleet.owner;
        const techLevel = owner === 'player'
            ? this.state.player.technology.military.level
            : this.state.ai.technology.military.level;

        strength *= (1 + techLevel * 0.15);

        return Math.floor(strength);
    }

    getFleetComposition(fleet) {
        const composition = {
            corvette: 0,
            frigate: 0,
            cruiser: 0,
            science: 0
        };

        for (const ship of fleet.ships) {
            composition[ship.type] = (composition[ship.type] || 0) + 1;
        }

        return composition;
    }

    disbandFleet(fleetId, owner = 'player') {
        const fleetList = owner === 'player' ? this.state.player.fleets : this.state.ai.fleets;
        const index = fleetList.findIndex(f => f.id === fleetId);

        if (index === -1) {
            return { success: false, reason: 'Fleet not found' };
        }

        const fleet = fleetList[index];

        // Refund some resources
        if (owner === 'player') {
            for (const ship of fleet.ships) {
                const cost = this.getShipCost(ship.type);
                this.state.player.resources.minerals += Math.floor(cost.minerals * 0.25);
            }
        }

        fleetList.splice(index, 1);
        return { success: true };
    }

    repairFleet(fleetId, owner = 'player') {
        const fleet = this.state.getFleet(fleetId, owner);
        if (!fleet) return { success: false, reason: 'Fleet not found' };

        const entity = owner === 'player' ? this.state.player : this.state.ai;
        let totalCost = 0;

        for (const ship of fleet.ships) {
            const damage = ship.maxHealth - ship.health;
            totalCost += Math.floor(damage * 0.5);
        }

        if (entity.resources.minerals < totalCost) {
            return { success: false, reason: 'Insufficient minerals' };
        }

        entity.resources.minerals -= totalCost;

        for (const ship of fleet.ships) {
            ship.health = ship.maxHealth;
        }

        return { success: true, cost: totalCost };
    }
}

export default FleetManager;
