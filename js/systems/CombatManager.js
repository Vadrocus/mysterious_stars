// CombatManager.js - Auto-resolve combat system

export class CombatManager {
    constructor(gameState, fleetManager) {
        this.state = gameState;
        this.fleetManager = fleetManager;
        this.combatResults = [];
    }

    resolveCombat(systemId, playerFleets, aiFleets) {
        const system = this.state.getSystem(systemId);

        // Calculate total strengths
        let playerStrength = 0;
        let aiStrength = 0;
        let playerComposition = { corvette: 0, frigate: 0, cruiser: 0, science: 0 };
        let aiComposition = { corvette: 0, frigate: 0, cruiser: 0, science: 0 };

        for (const fleet of playerFleets) {
            playerStrength += this.fleetManager.getFleetStrength(fleet);
            const comp = this.fleetManager.getFleetComposition(fleet);
            for (const type in comp) {
                playerComposition[type] = (playerComposition[type] || 0) + comp[type];
            }
        }

        for (const fleet of aiFleets) {
            aiStrength += this.fleetManager.getFleetStrength(fleet);
            const comp = this.fleetManager.getFleetComposition(fleet);
            for (const type in comp) {
                aiComposition[type] = (aiComposition[type] || 0) + comp[type];
            }
        }

        // Apply modifiers
        const modifiers = this.calculateModifiers(
            systemId, playerComposition, aiComposition
        );

        playerStrength *= modifiers.player;
        aiStrength *= modifiers.ai;

        // Determine outcome
        const totalStrength = playerStrength + aiStrength;
        const playerRatio = playerStrength / totalStrength;
        const aiRatio = aiStrength / totalStrength;

        // Add randomness (±20%)
        const playerRoll = 0.8 + Math.random() * 0.4;
        const aiRoll = 0.8 + Math.random() * 0.4;

        const finalPlayerStrength = playerStrength * playerRoll;
        const finalAIStrength = aiStrength * aiRoll;

        // Calculate casualties
        const playerCasualties = this.calculateCasualties(
            playerFleets, finalAIStrength / (finalPlayerStrength + finalAIStrength)
        );
        const aiCasualties = this.calculateCasualties(
            aiFleets, finalPlayerStrength / (finalPlayerStrength + finalAIStrength)
        );

        // Apply casualties
        this.applyCasualties(playerFleets, playerCasualties);
        this.applyCasualties(aiFleets, aiCasualties);

        // Determine winner
        const playerRemaining = playerFleets.reduce((sum, f) => sum + f.ships.length, 0);
        const aiRemaining = aiFleets.reduce((sum, f) => sum + f.ships.length, 0);

        let winner;
        if (playerRemaining > 0 && aiRemaining === 0) {
            winner = 'player';
        } else if (aiRemaining > 0 && playerRemaining === 0) {
            winner = 'ai';
        } else if (finalPlayerStrength > finalAIStrength) {
            winner = 'player';
        } else {
            winner = 'ai';
        }

        // Build combat report
        const result = {
            systemId,
            systemName: system?.name || 'Unknown',
            turn: this.state.turn,
            winner,
            playerStrength: Math.floor(playerStrength),
            aiStrength: Math.floor(aiStrength),
            playerLosses: playerCasualties,
            aiLosses: aiCasualties,
            playerRemaining,
            aiRemaining,
            modifiers
        };

        this.combatResults.push(result);

        // Update war exhaustion
        this.state.player.warExhaustion += playerCasualties.total * 2;
        this.state.ai.warExhaustion += aiCasualties.total * 2;

        // Notification
        if (winner === 'player') {
            this.state.addNotification(
                `Victory at ${system?.name}! Lost ${playerCasualties.total} ships, destroyed ${aiCasualties.total}.`,
                'success'
            );
        } else {
            this.state.addNotification(
                `Defeat at ${system?.name}. Lost ${playerCasualties.total} ships.`,
                'danger'
            );
        }

        return result;
    }

    calculateModifiers(systemId, playerComp, aiComp) {
        let playerMod = 1;
        let aiMod = 1;

        // Defender advantage
        const controller = this.state.getSystemController(systemId);
        if (controller === 'player') {
            playerMod *= 1.15;
        } else if (controller === 'ai') {
            aiMod *= 1.15;
        }

        // Tech level bonus
        const playerTech = this.state.player.technology.military.level;
        const aiTech = this.state.ai.technology.military.level;
        playerMod *= 1 + (playerTech * 0.1);
        aiMod *= 1 + (aiTech * 0.1);

        // Composition bonuses (rock-paper-scissors)
        // Corvettes screen against cruisers
        // Cruisers dominate frigates
        // Frigates counter corvettes

        const playerCorvetteRatio = playerComp.corvette / Math.max(1,
            playerComp.corvette + playerComp.frigate + playerComp.cruiser);
        const playerFrigateRatio = playerComp.frigate / Math.max(1,
            playerComp.corvette + playerComp.frigate + playerComp.cruiser);
        const playerCruiserRatio = playerComp.cruiser / Math.max(1,
            playerComp.corvette + playerComp.frigate + playerComp.cruiser);

        const aiCorvetteRatio = aiComp.corvette / Math.max(1,
            aiComp.corvette + aiComp.frigate + aiComp.cruiser);
        const aiFrigateRatio = aiComp.frigate / Math.max(1,
            aiComp.corvette + aiComp.frigate + aiComp.cruiser);
        const aiCruiserRatio = aiComp.cruiser / Math.max(1,
            aiComp.corvette + aiComp.frigate + aiComp.cruiser);

        // Apply composition bonuses
        if (playerCorvetteRatio > aiCruiserRatio) {
            playerMod *= 1 + (playerCorvetteRatio - aiCruiserRatio) * 0.2;
        }
        if (playerFrigateRatio > aiCorvetteRatio) {
            playerMod *= 1 + (playerFrigateRatio - aiCorvetteRatio) * 0.15;
        }
        if (playerCruiserRatio > aiFrigateRatio) {
            playerMod *= 1 + (playerCruiserRatio - aiFrigateRatio) * 0.15;
        }

        if (aiCorvetteRatio > playerCruiserRatio) {
            aiMod *= 1 + (aiCorvetteRatio - playerCruiserRatio) * 0.2;
        }
        if (aiFrigateRatio > playerCorvetteRatio) {
            aiMod *= 1 + (aiFrigateRatio - playerCorvetteRatio) * 0.15;
        }
        if (aiCruiserRatio > playerFrigateRatio) {
            aiMod *= 1 + (aiCruiserRatio - playerFrigateRatio) * 0.15;
        }

        // Planetary defense bonus
        const playerColonies = this.state.player.colonies.filter(c => c.systemId === systemId);
        const aiColonies = this.state.ai.colonies.filter(c => c.systemId === systemId);

        for (const colony of playerColonies) {
            if (colony.buildings.some(b => b && b.type === 'planetary_defense')) {
                playerMod *= 1.2;
            }
        }

        for (const colony of aiColonies) {
            if (colony.buildings.some(b => b && b.type === 'planetary_defense')) {
                aiMod *= 1.2;
            }
        }

        return {
            player: playerMod,
            ai: aiMod,
            breakdown: {
                defender: controller === 'player' ? 1.15 : (controller === 'ai' ? 1 / 1.15 : 1),
                playerTech: 1 + (playerTech * 0.1),
                aiTech: 1 + (aiTech * 0.1)
            }
        };
    }

    calculateCasualties(fleets, damageRatio) {
        const casualties = {
            corvette: 0,
            frigate: 0,
            cruiser: 0,
            science: 0,
            total: 0
        };

        // Damage ratio determines base casualty rate
        const baseCasualtyRate = damageRatio * 0.6; // 60% max casualties at total defeat

        for (const fleet of fleets) {
            for (const ship of fleet.ships) {
                // Each ship has chance to be destroyed based on type vulnerability
                let vulnerability;
                switch (ship.type) {
                    case 'corvette': vulnerability = 0.6; break;
                    case 'frigate': vulnerability = 0.4; break;
                    case 'cruiser': vulnerability = 0.25; break;
                    case 'science': vulnerability = 0.8; break;
                    default: vulnerability = 0.5;
                }

                const destroyChance = baseCasualtyRate * vulnerability;
                if (Math.random() < destroyChance) {
                    casualties[ship.type] = (casualties[ship.type] || 0) + 1;
                    casualties.total++;
                } else {
                    // Damage survivors
                    const damageAmount = ship.maxHealth * damageRatio * Math.random();
                    ship.health = Math.max(1, ship.health - damageAmount);
                }
            }
        }

        return casualties;
    }

    applyCasualties(fleets, casualties) {
        // Track how many of each type to remove
        const toRemove = { ...casualties };
        delete toRemove.total;

        for (const fleet of fleets) {
            fleet.ships = fleet.ships.filter(ship => {
                if (toRemove[ship.type] > 0) {
                    // Check if this ship was destroyed
                    if (ship.health <= 0 || Math.random() < 0.5) {
                        toRemove[ship.type]--;
                        return false;
                    }
                }
                return true;
            });
        }

        // Remove empty fleets in cleanup phase
    }

    getLastCombatResult() {
        return this.combatResults[this.combatResults.length - 1] || null;
    }

    getCombatHistory() {
        return [...this.combatResults];
    }

    // Simulate combat outcome without actually fighting
    simulateCombat(playerFleets, aiFleets, systemId) {
        let playerStrength = 0;
        let aiStrength = 0;

        for (const fleet of playerFleets) {
            playerStrength += this.fleetManager.getFleetStrength(fleet);
        }

        for (const fleet of aiFleets) {
            aiStrength += this.fleetManager.getFleetStrength(fleet);
        }

        // Apply basic modifiers
        const controller = this.state.getSystemController(systemId);
        if (controller === 'player') playerStrength *= 1.15;
        if (controller === 'ai') aiStrength *= 1.15;

        return {
            playerStrength: Math.floor(playerStrength),
            aiStrength: Math.floor(aiStrength),
            playerAdvantage: playerStrength > aiStrength,
            ratio: playerStrength / Math.max(1, aiStrength),
            estimatedPlayerLosses: Math.floor(aiStrength / playerStrength * 0.3 *
                playerFleets.reduce((sum, f) => sum + f.ships.length, 0)),
            estimatedAILosses: Math.floor(playerStrength / aiStrength * 0.3 *
                aiFleets.reduce((sum, f) => sum + f.ships.length, 0))
        };
    }
}

export default CombatManager;
