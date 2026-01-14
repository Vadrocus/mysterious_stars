// AIManager.js - AI opponent behavior and decision making

export class AIManager {
    constructor(gameState, fleetManager, colonyManager, archaeologyManager) {
        this.state = gameState;
        this.fleetManager = fleetManager;
        this.colonyManager = colonyManager;
        this.archaeologyManager = archaeologyManager;
    }

    takeTurn() {
        // Update AI goals
        this.updateGoals();

        // Execute actions based on goals
        this.executeEconomicActions();
        this.executeExpansionActions();
        this.executeMilitaryActions();
        this.executeArchaeologyActions();
        this.executeDiplomaticActions();

        // Update AI beliefs about player
        this.updateBeliefs();
    }

    updateGoals() {
        const ai = this.state.ai;
        ai.goals = [];

        // Economic goal - maintain positive income
        const economicScore = ai.resources.energy + ai.resources.minerals;
        if (economicScore < 200) {
            ai.goals.push({ type: 'economy', priority: 3 });
        }

        // Expansion goal - colonize new worlds
        const controlledCount = ai.controlledSystems.length;
        const totalSystems = this.state.galaxy.systems.length;
        if (controlledCount < totalSystems * 0.4) {
            ai.goals.push({ type: 'expansion', priority: 2 });
        }

        // Military goal - build fleet if threatened
        const playerStrength = this.calculatePlayerStrength();
        const aiStrength = this.calculateAIStrength();
        if (playerStrength > aiStrength * 0.8) {
            ai.goals.push({ type: 'military', priority: 3 });
        }

        // Archaeology goal - excavate discovered sites
        const hasActiveSite = Object.values(this.state.excavations)
            .some(e => e.owner === 'ai' && e.active);
        if (!hasActiveSite) {
            ai.goals.push({ type: 'archaeology', priority: 1 });
        }

        // Aggression goal - if strong and suspicious/hostile
        if (aiStrength > playerStrength * 1.5 &&
            ['suspicious', 'hostile'].includes(ai.stance)) {
            ai.goals.push({ type: 'aggression', priority: 2 });
        }
    }

    executeEconomicActions() {
        const ai = this.state.ai;

        // Build districts in existing colonies
        for (const colony of ai.colonies) {
            if (colony.districts.length < colony.maxDistricts) {
                // Prioritize based on needs
                let districtType = 'mining';
                if (ai.resources.energy < ai.resources.minerals) {
                    districtType = 'generator';
                } else if (ai.resources.research < 50) {
                    districtType = 'research';
                }

                const canBuild = this.colonyManager.canBuildDistrict(
                    colony.id, districtType, 'ai'
                );
                if (canBuild.can) {
                    this.colonyManager.buildDistrict(colony.id, districtType, 'ai');
                }
            }
        }

        // Process build queues
        this.colonyManager.processBuildQueues('ai');
    }

    executeExpansionActions() {
        const ai = this.state.ai;

        // Find uncolonized habitable planets in known systems
        const colonizationTargets = [];

        for (const systemId of ai.knownSystems) {
            const system = this.state.getSystem(systemId);
            if (!system) continue;

            for (const planet of system.planets) {
                if (planet.habitable && !planet.colonized) {
                    colonizationTargets.push({
                        systemId,
                        planetId: planet.id,
                        value: this.evaluatePlanetValue(planet)
                    });
                }
            }
        }

        // Sort by value and colonize best option
        colonizationTargets.sort((a, b) => b.value - a.value);

        if (colonizationTargets.length > 0 &&
            ai.resources.minerals >= 200 &&
            ai.resources.energy >= 100) {
            const target = colonizationTargets[0];
            this.colonyManager.colonize(target.systemId, target.planetId, 'ai');
        }

        // Move fleets to explore unknown systems
        this.executeExploration();
    }

    executeExploration() {
        const ai = this.state.ai;

        // Find unexplored systems adjacent to known ones
        const unexplored = new Set();

        for (const systemId of ai.knownSystems) {
            const connections = this.state.galaxy.hyperlanes
                .filter(h => h.from === systemId || h.to === systemId)
                .map(h => h.from === systemId ? h.to : h.from);

            for (const connId of connections) {
                if (!ai.knownSystems.has(connId)) {
                    unexplored.add(connId);
                }
            }
        }

        // Send idle fleets to explore
        for (const fleet of ai.fleets) {
            if (!fleet.destination && unexplored.size > 0) {
                const targetId = unexplored.values().next().value;
                this.fleetManager.setDestination(fleet.id, targetId, 'ai');
                unexplored.delete(targetId);
            }
        }

        // Scan systems with science vessels
        for (const fleet of ai.fleets) {
            const hasScience = fleet.ships.some(s => s.type === 'science');
            if (hasScience && !fleet.destination) {
                const systemId = fleet.systemId;
                if (ai.knownSystems.has(systemId) && !ai.scannedSystems.has(systemId)) {
                    this.fleetManager.scanSystem(fleet.id, 'ai');
                } else if (ai.scannedSystems.has(systemId) && !ai.deepScannedSystems.has(systemId)) {
                    this.fleetManager.deepScanSystem(fleet.id, 'ai');
                }
            }
        }
    }

    executeMilitaryActions() {
        const ai = this.state.ai;
        const goal = ai.goals.find(g => g.type === 'military');

        if (goal && goal.priority >= 2) {
            // Build ships if we have resources and shipyards
            for (const colony of ai.colonies) {
                const hasStarport = colony.buildings.some(b => b && b.type === 'starport');
                if (hasStarport && ai.resources.minerals >= 100) {
                    // Find or create fleet in this system
                    let fleet = ai.fleets.find(f => f.systemId === colony.systemId);
                    if (!fleet) {
                        fleet = this.fleetManager.createFleet('ai', colony.systemId, [], 'Defense Force');
                    }

                    // Build ships
                    if (ai.resources.minerals >= 200) {
                        this.fleetManager.buildShip('ai', fleet.id, 'cruiser');
                    } else if (ai.resources.minerals >= 100) {
                        this.fleetManager.buildShip('ai', fleet.id, 'frigate');
                    } else {
                        this.fleetManager.buildShip('ai', fleet.id, 'corvette');
                    }
                }
            }
        }

        // Move fleets strategically
        if (ai.stance === 'war') {
            this.executeWarActions();
        } else if (ai.stance === 'hostile') {
            this.executeDefensivePositioning();
        }
    }

    executeWarActions() {
        const ai = this.state.ai;
        const playerSystems = this.state.player.controlledSystems;

        // Find weakest player system to attack
        let bestTarget = null;
        let bestScore = -Infinity;

        for (const systemId of playerSystems) {
            const defenseStrength = this.estimateSystemDefense(systemId, 'player');
            const attackStrength = this.calculateNearbyAIStrength(systemId);

            if (attackStrength > defenseStrength) {
                const score = attackStrength - defenseStrength;
                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = systemId;
                }
            }
        }

        // Send fleets to attack
        if (bestTarget) {
            for (const fleet of ai.fleets) {
                if (!fleet.destination && fleet.ships.length > 2) {
                    this.fleetManager.setDestination(fleet.id, bestTarget, 'ai');
                }
            }
        }

        // Accumulate war exhaustion
        ai.warExhaustion += 2;
    }

    executeDefensivePositioning() {
        const ai = this.state.ai;

        // Position fleets at border systems
        const borderSystems = this.findBorderSystems('ai');

        for (const fleet of ai.fleets) {
            if (!fleet.destination) {
                const unguardedBorder = borderSystems.find(sId =>
                    !ai.fleets.some(f => f.systemId === sId || f.destination === sId)
                );

                if (unguardedBorder) {
                    this.fleetManager.setDestination(fleet.id, unguardedBorder, 'ai');
                }
            }
        }
    }

    executeArchaeologyActions() {
        const ai = this.state.ai;

        // Start excavations at discovered sites
        for (const systemId of ai.deepScannedSystems) {
            const system = this.state.getSystem(systemId);
            if (!system) continue;

            for (const planet of system.planets) {
                if (planet.archaeologySite &&
                    planet.archaeologySite.discovered &&
                    !planet.archaeologySite.completed) {

                    const siteKey = `${systemId}_${planet.id}`;
                    if (!this.state.excavations[siteKey]) {
                        this.archaeologyManager.startExcavation(systemId, planet.id, 'ai');
                    }
                }
            }
        }

        // Make choices at excavation sites (AI chooses randomly weighted by rewards)
        for (const [key, excavation] of Object.entries(this.state.excavations)) {
            if (excavation.owner === 'ai' && excavation.readyForChoice) {
                const content = this.archaeologyManager.getCurrentLayerContent(
                    excavation.systemId, excavation.planetId
                );
                if (content && content.choices.length > 0) {
                    // AI tends to choose options with best rewards
                    const choiceIndex = Math.floor(Math.random() * content.choices.length);
                    this.archaeologyManager.makeChoice(
                        excavation.systemId, excavation.planetId, choiceIndex, 'ai'
                    );
                }
            }
        }
    }

    executeDiplomaticActions() {
        const ai = this.state.ai;
        const player = this.state.player;

        // Evaluate whether to declare war
        if (ai.stance === 'hostile' && ai.trust < 20) {
            const aiStrength = this.calculateAIStrength();
            const playerStrength = this.calculatePlayerStrength();

            if (aiStrength > playerStrength * 1.3) {
                // Declare war
                ai.stance = 'war';
                this.state.addNotification(
                    `The ${ai.name} has declared war!`,
                    'danger'
                );
            }
        }

        // Consider peace if exhausted
        if (ai.stance === 'war' && ai.warExhaustion > 50) {
            // AI might sue for peace
            if (Math.random() < ai.warExhaustion / 100) {
                this.state.addNotification(
                    `The ${ai.name} is seeking peace negotiations.`,
                    'warning'
                );
                // Peace offer handled in diplomacy UI
            }
        }

        // Adjust stance based on player actions
        this.adjustStance();
    }

    adjustStance() {
        const ai = this.state.ai;

        // Trust decay/recovery
        if (ai.trust < 50) {
            ai.trust = Math.min(100, ai.trust + 1);
        } else if (ai.trust > 50) {
            ai.trust = Math.max(0, ai.trust - 0.5);
        }

        // Update stance based on trust
        if (ai.stance !== 'war') {
            if (ai.trust >= 70) {
                ai.stance = 'friendly';
            } else if (ai.trust >= 50) {
                ai.stance = 'neutral';
            } else if (ai.trust >= 30) {
                ai.stance = 'suspicious';
            } else {
                ai.stance = 'hostile';
            }
        }
    }

    updateBeliefs() {
        const ai = this.state.ai;
        const player = this.state.player;

        // Update beliefs about player strength
        ai.beliefs.playerStrength = this.calculatePlayerStrength();

        // Update beliefs about player expansion
        ai.beliefs.playerSystems = player.controlledSystems.length;

        // Beliefs about archaeology (AI may not know all player sites)
        const knownPlayerSites = Object.values(this.state.excavations)
            .filter(e => e.owner === 'player' && ai.knownSystems.has(e.systemId))
            .length;
        ai.beliefs.playerExcavations = knownPlayerSites;
    }

    calculatePlayerStrength() {
        let strength = 0;
        for (const fleet of this.state.player.fleets) {
            strength += this.fleetManager.getFleetStrength(fleet);
        }
        return strength;
    }

    calculateAIStrength() {
        let strength = 0;
        for (const fleet of this.state.ai.fleets) {
            strength += this.fleetManager.getFleetStrength(fleet);
        }
        return strength;
    }

    calculateNearbyAIStrength(systemId) {
        let strength = 0;
        const maxDistance = 3; // Hyperlane hops

        for (const fleet of this.state.ai.fleets) {
            const path = this.fleetManager.findPath(fleet.systemId, systemId);
            if (path && path.length <= maxDistance + 1) {
                strength += this.fleetManager.getFleetStrength(fleet);
            }
        }

        return strength;
    }

    estimateSystemDefense(systemId, owner) {
        let defense = 0;

        // Fleet strength in system
        const fleets = owner === 'player' ? this.state.player.fleets : this.state.ai.fleets;
        for (const fleet of fleets) {
            if (fleet.systemId === systemId) {
                defense += this.fleetManager.getFleetStrength(fleet);
            }
        }

        // Colony defense
        const colonies = owner === 'player' ? this.state.player.colonies : this.state.ai.colonies;
        for (const colony of colonies) {
            if (colony.systemId === systemId) {
                defense += this.colonyManager.getColonyDefenseStrength(colony);
            }
        }

        return defense;
    }

    findBorderSystems(owner) {
        const controlled = owner === 'player'
            ? this.state.player.controlledSystems
            : this.state.ai.controlledSystems;
        const enemyControlled = owner === 'player'
            ? this.state.ai.controlledSystems
            : this.state.player.controlledSystems;

        const borders = [];

        for (const systemId of controlled) {
            const connections = this.state.galaxy.hyperlanes
                .filter(h => h.from === systemId || h.to === systemId)
                .map(h => h.from === systemId ? h.to : h.from);

            const bordersEnemy = connections.some(c =>
                enemyControlled.includes(c) || !controlled.includes(c)
            );

            if (bordersEnemy) {
                borders.push(systemId);
            }
        }

        return borders;
    }

    evaluatePlanetValue(planet) {
        let value = 0;

        // Base value for habitability
        if (planet.habitable) value += 50;

        // Resource value
        value += (planet.resources.energy || 0) * 5;
        value += (planet.resources.minerals || 0) * 5;
        value += (planet.resources.research || 0) * 8;

        // Size value
        value += planet.size * 2;

        // Archaeology bonus
        if (planet.archaeologySite) value += 30;

        return value;
    }

    // Evaluate a diplomatic proposal
    evaluateProposal(proposal) {
        let aiValue = 0;
        let playerValue = 0;

        // Evaluate what AI gives
        if (proposal.aiGives) {
            if (proposal.aiGives.energy) aiValue += proposal.aiGives.energy * 0.8;
            if (proposal.aiGives.minerals) aiValue += proposal.aiGives.minerals * 0.8;
            if (proposal.aiGives.research) aiValue += proposal.aiGives.research * 1.2;
            if (proposal.aiGives.system) {
                const system = this.state.getSystem(proposal.aiGives.system);
                aiValue += this.evaluateSystemValue(system, 'ai') * 1.5;
            }
        }

        // Evaluate what AI receives
        if (proposal.playerGives) {
            if (proposal.playerGives.energy) playerValue += proposal.playerGives.energy * 0.8;
            if (proposal.playerGives.minerals) playerValue += proposal.playerGives.minerals * 0.8;
            if (proposal.playerGives.research) playerValue += proposal.playerGives.research * 1.2;
            if (proposal.playerGives.system) {
                const system = this.state.getSystem(proposal.playerGives.system);
                playerValue += this.evaluateSystemValue(system, 'ai') * 1.2;
            }
        }

        // Trust modifier
        const trustModifier = 0.5 + (this.state.ai.trust / 100);

        return {
            acceptable: playerValue * trustModifier >= aiValue,
            aiValue,
            playerValue,
            difference: playerValue - aiValue
        };
    }

    evaluateSystemValue(system, perspective) {
        if (!system) return 0;

        let value = 100; // Base value

        // Habitable planets
        const habitables = system.planets.filter(p => p.habitable);
        value += habitables.length * 50;

        // Resources
        for (const planet of system.planets) {
            value += (planet.resources.energy || 0) * 3;
            value += (planet.resources.minerals || 0) * 3;
            value += (planet.resources.research || 0) * 5;
        }

        // Strategic value
        const connections = this.state.galaxy.hyperlanes
            .filter(h => h.from === system.id || h.to === system.id)
            .length;

        if (connections <= 2) value *= 1.3; // Chokepoint bonus
        if (connections >= 4) value *= 1.2; // Hub bonus

        // Archaeology value (if known)
        const hasSite = system.planets.some(p => p.archaeologySite);
        if (hasSite) {
            const known = perspective === 'player'
                ? this.state.player.deepScannedSystems.has(system.id)
                : this.state.ai.deepScannedSystems.has(system.id);

            if (known) value += 150;
        }

        return value;
    }
}

export default AIManager;
