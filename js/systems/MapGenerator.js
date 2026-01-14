// MapGenerator.js - Procedural galaxy map generation

import { STAR_NAMES, PLANET_NAMES_PREFIX, PLANET_NAMES_SUFFIX } from '../data/names.js';

export class MapGenerator {
    constructor() {
        this.systemCount = 0;
        this.planetCount = 0;
    }

    generateGalaxy(systemCount = 18) {
        const systems = this.generateSystems(systemCount);
        const hyperlanes = this.generateHyperlanes(systems);

        // Ensure connectivity
        this.ensureConnectivity(systems, hyperlanes);

        // Place archaeology sites
        this.placeArchaeologySites(systems);

        // Determine starting positions
        const { playerStart, aiStart } = this.determineStartingPositions(systems, hyperlanes);

        return {
            systems,
            hyperlanes,
            playerStart,
            aiStart,
            centerX: 0,
            centerY: 0
        };
    }

    generateSystems(count) {
        const systems = [];
        const usedNames = new Set();
        const minDistance = 100;

        for (let i = 0; i < count; i++) {
            let x, y, attempts = 0;

            // Find position not too close to existing systems
            do {
                x = (Math.random() - 0.5) * 800;
                y = (Math.random() - 0.5) * 600;
                attempts++;
            } while (attempts < 100 && systems.some(s =>
                Math.hypot(s.x - x, s.y - y) < minDistance
            ));

            // Generate unique name
            let name;
            do {
                name = STAR_NAMES[Math.floor(Math.random() * STAR_NAMES.length)];
            } while (usedNames.has(name));
            usedNames.add(name);

            const system = this.generateSystem(i, name, x, y);
            systems.push(system);
        }

        return systems;
    }

    generateSystem(id, name, x, y) {
        const starType = this.randomStarType();
        const planetCount = Math.floor(Math.random() * 5) + 1;

        const system = {
            id: `sys_${id}`,
            name,
            x,
            y,
            starType,
            planets: [],
            stations: [],
            debris: Math.random() < 0.2,
            anomaly: Math.random() < 0.1
        };

        // Generate planets
        for (let i = 0; i < planetCount; i++) {
            const planet = this.generatePlanet(system, i);
            system.planets.push(planet);
        }

        // Maybe add asteroid belt
        if (Math.random() < 0.3) {
            system.asteroidBelt = {
                richness: Math.floor(Math.random() * 3) + 1
            };
        }

        return system;
    }

    generatePlanet(system, index) {
        const planetType = this.randomPlanetType(system.starType, index);
        const size = this.getPlanetSize(planetType);
        const habitable = ['continental', 'ocean', 'desert', 'arctic'].includes(planetType);

        const planet = {
            id: `${system.id}_p${index}`,
            name: this.generatePlanetName(system.name, index),
            type: planetType,
            size,
            habitable,
            resources: this.generatePlanetResources(planetType),
            features: [],
            archaeologySite: null, // Set later by placeArchaeologySites
            colonized: false,
            stations: []
        };

        // Maybe add moon
        if (Math.random() < 0.25 && planetType !== 'gas_giant') {
            planet.moon = {
                name: `${planet.name} Moon`,
                resources: {
                    minerals: Math.floor(Math.random() * 2) + 1
                }
            };
        }

        // Orbital features
        if (Math.random() < 0.15) {
            planet.features.push('ancient_debris');
        }
        if (Math.random() < 0.1) {
            planet.features.push('radiation_belt');
        }

        return planet;
    }

    generatePlanetName(systemName, index) {
        const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
        return `${systemName} ${numerals[index] || (index + 1)}`;
    }

    randomStarType() {
        const types = [
            { type: 'yellow', weight: 30 },
            { type: 'red', weight: 25 },
            { type: 'orange', weight: 20 },
            { type: 'blue', weight: 15 },
            { type: 'white', weight: 10 }
        ];

        const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;

        for (const t of types) {
            random -= t.weight;
            if (random <= 0) return t.type;
        }
        return 'yellow';
    }

    randomPlanetType(starType, orbitalIndex) {
        // Inner planets more likely to be barren/hot, outer more likely to be cold/gas giant
        const innerTypes = ['barren', 'desert', 'continental'];
        const midTypes = ['continental', 'ocean', 'desert', 'barren'];
        const outerTypes = ['arctic', 'barren', 'gas_giant'];

        let types;
        if (orbitalIndex === 0) {
            types = innerTypes;
        } else if (orbitalIndex < 3) {
            types = midTypes;
        } else {
            types = outerTypes;
        }

        // Blue stars less likely to have habitable worlds
        if (starType === 'blue' && Math.random() < 0.5) {
            return Math.random() < 0.5 ? 'barren' : 'gas_giant';
        }

        return types[Math.floor(Math.random() * types.length)];
    }

    getPlanetSize(type) {
        const baseSizes = {
            continental: [12, 20],
            ocean: [14, 22],
            desert: [10, 18],
            arctic: [10, 16],
            barren: [6, 14],
            gas_giant: [25, 40]
        };

        const [min, max] = baseSizes[type] || [10, 15];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generatePlanetResources(type) {
        const resources = {
            energy: 0,
            minerals: 0,
            research: 0
        };

        switch (type) {
            case 'continental':
                resources.energy = Math.floor(Math.random() * 3) + 2;
                resources.minerals = Math.floor(Math.random() * 3) + 2;
                resources.research = Math.floor(Math.random() * 2) + 1;
                break;
            case 'ocean':
                resources.energy = Math.floor(Math.random() * 2) + 1;
                resources.minerals = Math.floor(Math.random() * 2) + 1;
                resources.research = Math.floor(Math.random() * 3) + 3;
                break;
            case 'desert':
                resources.energy = Math.floor(Math.random() * 3) + 3;
                resources.minerals = Math.floor(Math.random() * 2) + 2;
                break;
            case 'arctic':
                resources.energy = Math.floor(Math.random() * 2) + 1;
                resources.minerals = Math.floor(Math.random() * 3) + 2;
                resources.research = Math.floor(Math.random() * 2) + 1;
                break;
            case 'barren':
                resources.minerals = Math.floor(Math.random() * 4) + 3;
                break;
            case 'gas_giant':
                resources.energy = Math.floor(Math.random() * 4) + 4;
                break;
        }

        return resources;
    }

    generateHyperlanes(systems) {
        const hyperlanes = [];
        const maxDistance = 200;

        // Create initial connections using Delaunay-like approach
        for (let i = 0; i < systems.length; i++) {
            const sys1 = systems[i];
            const distances = [];

            for (let j = 0; j < systems.length; j++) {
                if (i !== j) {
                    const sys2 = systems[j];
                    const dist = Math.hypot(sys1.x - sys2.x, sys1.y - sys2.y);
                    distances.push({ index: j, distance: dist });
                }
            }

            // Sort by distance and connect to 2-4 nearest
            distances.sort((a, b) => a.distance - b.distance);
            const connectionCount = Math.floor(Math.random() * 3) + 2;

            for (let k = 0; k < Math.min(connectionCount, distances.length); k++) {
                const target = distances[k];
                if (target.distance <= maxDistance) {
                    // Check if connection already exists
                    const exists = hyperlanes.some(h =>
                        (h.from === sys1.id && h.to === systems[target.index].id) ||
                        (h.to === sys1.id && h.from === systems[target.index].id)
                    );

                    if (!exists) {
                        hyperlanes.push({
                            from: sys1.id,
                            to: systems[target.index].id
                        });
                    }
                }
            }
        }

        return hyperlanes;
    }

    ensureConnectivity(systems, hyperlanes) {
        // Use BFS to find all connected components
        const visited = new Set();
        const components = [];

        for (const system of systems) {
            if (!visited.has(system.id)) {
                const component = this.bfs(system.id, systems, hyperlanes, visited);
                components.push(component);
            }
        }

        // Connect separate components
        while (components.length > 1) {
            const comp1 = components.pop();
            const comp2 = components[components.length - 1];

            // Find closest pair between components
            let minDist = Infinity;
            let bestPair = null;

            for (const id1 of comp1) {
                const sys1 = systems.find(s => s.id === id1);
                for (const id2 of comp2) {
                    const sys2 = systems.find(s => s.id === id2);
                    const dist = Math.hypot(sys1.x - sys2.x, sys1.y - sys2.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestPair = [id1, id2];
                    }
                }
            }

            if (bestPair) {
                hyperlanes.push({ from: bestPair[0], to: bestPair[1] });
                // Merge components
                comp2.push(...comp1);
            }
        }
    }

    bfs(startId, systems, hyperlanes, visited) {
        const component = [];
        const queue = [startId];

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;

            visited.add(current);
            component.push(current);

            // Find connected systems
            const connections = hyperlanes
                .filter(h => h.from === current || h.to === current)
                .map(h => h.from === current ? h.to : h.from);

            for (const next of connections) {
                if (!visited.has(next)) {
                    queue.push(next);
                }
            }
        }

        return component;
    }

    placeArchaeologySites(systems) {
        // Place 5-6 archaeology sites on random planets
        const siteCount = Math.floor(Math.random() * 2) + 5; // 5-6 sites
        const eligiblePlanets = [];

        for (const system of systems) {
            for (const planet of system.planets) {
                if (planet.type !== 'gas_giant') {
                    eligiblePlanets.push({
                        systemId: system.id,
                        systemName: system.name,
                        planetId: planet.id,
                        planetName: planet.name
                    });
                }
            }
        }

        // Shuffle and pick
        this.shuffle(eligiblePlanets);

        const siteIds = ['site_ancient_station', 'site_silent_tomb', 'site_crystal_caves',
            'site_abandoned_colony', 'site_void_signal', 'site_stellar_monument'];

        // Meta-chain sites (always include these if we have enough)
        const metaChainSites = ['site_crystal_caves', 'site_void_signal', 'site_stellar_monument'];

        const assignedSites = [];

        for (let i = 0; i < Math.min(siteCount, eligiblePlanets.length); i++) {
            const planetInfo = eligiblePlanets[i];
            const system = systems.find(s => s.id === planetInfo.systemId);
            const planet = system.planets.find(p => p.id === planetInfo.planetId);

            planet.archaeologySite = {
                id: siteIds[i] || `site_generic_${i}`,
                discovered: false,
                excavationProgress: 0,
                currentLayer: 0,
                completed: false
            };

            assignedSites.push({
                siteId: siteIds[i],
                systemId: system.id,
                systemName: system.name,
                planetId: planet.id,
                planetName: planet.name
            });
        }

        return assignedSites;
    }

    determineStartingPositions(systems, hyperlanes) {
        // Find two systems that are far apart for starting positions
        let maxDist = 0;
        let playerStart = null;
        let aiStart = null;

        for (let i = 0; i < systems.length; i++) {
            for (let j = i + 1; j < systems.length; j++) {
                const dist = Math.hypot(
                    systems[i].x - systems[j].x,
                    systems[i].y - systems[j].y
                );

                if (dist > maxDist) {
                    // Check both have habitable planets
                    const sys1HasHabitable = systems[i].planets.some(p => p.habitable);
                    const sys2HasHabitable = systems[j].planets.some(p => p.habitable);

                    if (sys1HasHabitable && sys2HasHabitable) {
                        maxDist = dist;
                        playerStart = systems[i].id;
                        aiStart = systems[j].id;
                    }
                }
            }
        }

        // Fallback if no habitable systems found
        if (!playerStart) {
            playerStart = systems[0].id;
            aiStart = systems[systems.length - 1].id;
        }

        return { playerStart, aiStart };
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Get strategic analysis of a system
    analyzeSystem(systemId, systems, hyperlanes) {
        const connections = hyperlanes.filter(h =>
            h.from === systemId || h.to === systemId
        ).length;

        const system = systems.find(s => s.id === systemId);
        const habitablePlanets = system.planets.filter(p => p.habitable).length;
        const hasSite = system.planets.some(p => p.archaeologySite);

        return {
            isChokepoint: connections <= 2,
            isHub: connections >= 4,
            habitablePlanets,
            hasArchaeology: hasSite,
            strategicValue: connections + habitablePlanets * 2 + (hasSite ? 3 : 0)
        };
    }
}

export default MapGenerator;
