// DiplomacyManager.js - Diplomatic actions and treaty management

export class DiplomacyManager {
    constructor(gameState, aiManager) {
        this.state = gameState;
        this.aiManager = aiManager;
    }

    // Get current diplomatic status with AI
    getStatus() {
        const ai = this.state.ai;
        return {
            name: ai.name,
            stance: ai.stance,
            trust: ai.trust,
            beliefs: ai.beliefs,
            warExhaustion: ai.warExhaustion,
            treaties: this.state.treaties.filter(t => t.active)
        };
    }

    // Propose a trade deal
    proposeTrade(offer) {
        const ai = this.state.ai;

        // Can't trade during war
        if (ai.stance === 'war') {
            return {
                success: false,
                reason: 'Cannot trade during war'
            };
        }

        // Evaluate the proposal from AI perspective
        const evaluation = this.aiManager.evaluateProposal(offer);

        if (evaluation.acceptable) {
            // Execute trade
            this.executeTrade(offer);

            // Improve trust
            ai.trust = Math.min(100, ai.trust + 5);

            this.state.addNotification(
                `Trade deal accepted by ${ai.name}!`,
                'success'
            );

            return {
                success: true,
                evaluation
            };
        } else {
            // Reject trade
            this.state.addNotification(
                `${ai.name} rejected the trade offer.`,
                'warning'
            );

            return {
                success: false,
                reason: 'Offer rejected as unfavorable',
                evaluation
            };
        }
    }

    executeTrade(offer) {
        const player = this.state.player;
        const ai = this.state.ai;

        // Player gives
        if (offer.playerGives) {
            if (offer.playerGives.energy) {
                player.resources.energy -= offer.playerGives.energy;
                ai.resources.energy += offer.playerGives.energy;
            }
            if (offer.playerGives.minerals) {
                player.resources.minerals -= offer.playerGives.minerals;
                ai.resources.minerals += offer.playerGives.minerals;
            }
            if (offer.playerGives.research) {
                player.resources.research -= offer.playerGives.research;
                ai.resources.research += offer.playerGives.research;
            }
            if (offer.playerGives.system) {
                this.transferSystem(offer.playerGives.system, 'player', 'ai');
            }
        }

        // AI gives
        if (offer.aiGives) {
            if (offer.aiGives.energy) {
                ai.resources.energy -= offer.aiGives.energy;
                player.resources.energy += offer.aiGives.energy;
            }
            if (offer.aiGives.minerals) {
                ai.resources.minerals -= offer.aiGives.minerals;
                player.resources.minerals += offer.aiGives.minerals;
            }
            if (offer.aiGives.research) {
                ai.resources.research -= offer.aiGives.research;
                player.resources.research += offer.aiGives.research;
            }
            if (offer.aiGives.system) {
                this.transferSystem(offer.aiGives.system, 'ai', 'player');
            }
        }
    }

    transferSystem(systemId, from, to) {
        const fromEntity = from === 'player' ? this.state.player : this.state.ai;
        const toEntity = to === 'player' ? this.state.player : this.state.ai;

        // Remove from source
        const index = fromEntity.controlledSystems.indexOf(systemId);
        if (index !== -1) {
            fromEntity.controlledSystems.splice(index, 1);
        }

        // Add to destination
        if (!toEntity.controlledSystems.includes(systemId)) {
            toEntity.controlledSystems.push(systemId);
        }

        // Transfer colonies
        const colonies = fromEntity.colonies.filter(c => c.systemId === systemId);
        for (const colony of colonies) {
            const colonyIndex = fromEntity.colonies.indexOf(colony);
            if (colonyIndex !== -1) {
                fromEntity.colonies.splice(colonyIndex, 1);
                toEntity.colonies.push(colony);
            }
        }

        // Update planet ownership
        const system = this.state.getSystem(systemId);
        if (system) {
            for (const planet of system.planets) {
                if (planet.owner === from) {
                    planet.owner = to;
                }
            }
        }
    }

    // Propose non-aggression pact
    proposeNAP(duration = 20) {
        const ai = this.state.ai;

        if (ai.stance === 'war') {
            return {
                success: false,
                reason: 'Must negotiate peace first'
            };
        }

        // AI acceptance based on trust and stance
        const acceptChance = (ai.trust / 100) *
            (ai.stance === 'friendly' ? 1.5 : ai.stance === 'neutral' ? 1 : 0.5);

        if (Math.random() < acceptChance) {
            // Create NAP treaty
            this.state.treaties.push({
                type: 'non_aggression',
                parties: ['player', 'ai'],
                startTurn: this.state.turn,
                duration,
                endTurn: this.state.turn + duration,
                active: true
            });

            ai.trust = Math.min(100, ai.trust + 10);

            this.state.addNotification(
                `${ai.name} agreed to a non-aggression pact for ${duration} turns!`,
                'success'
            );

            return { success: true };
        }

        this.state.addNotification(
            `${ai.name} rejected the non-aggression pact.`,
            'warning'
        );

        return {
            success: false,
            reason: 'Offer rejected'
        };
    }

    // Declare war
    declareWar(justification = null) {
        const ai = this.state.ai;

        if (ai.stance === 'war') {
            return {
                success: false,
                reason: 'Already at war'
            };
        }

        // Check for active NAP
        const activeNAP = this.state.treaties.find(t =>
            t.type === 'non_aggression' && t.active
        );

        if (activeNAP) {
            // Breaking NAP has severe consequences
            activeNAP.active = false;
            ai.trust = Math.max(0, ai.trust - 40);
            this.state.player.legitimacy -= 30;

            this.state.addNotification(
                'Breaking the non-aggression pact! Severe diplomatic penalty.',
                'danger'
            );
        }

        // Apply legitimacy cost based on justification
        if (!justification) {
            this.state.player.legitimacy -= 20;
        } else {
            this.state.player.legitimacy -= 5;
        }

        // War declaration
        ai.stance = 'war';
        ai.trust = Math.max(0, ai.trust - 25);

        // Reset war exhaustion
        this.state.player.warExhaustion = 0;
        ai.warExhaustion = 0;

        // End all treaties
        for (const treaty of this.state.treaties) {
            if (treaty.active) {
                treaty.active = false;
            }
        }

        this.state.addNotification(
            `War declared against ${ai.name}!`,
            'danger'
        );

        return { success: true };
    }

    // Sue for peace
    sueForPeace(demands = null) {
        const ai = this.state.ai;

        if (ai.stance !== 'war') {
            return {
                success: false,
                reason: 'Not at war'
            };
        }

        // Calculate war score
        const playerScore = this.calculateWarScore('player');
        const aiScore = this.calculateWarScore('ai');

        // Base acceptance on war exhaustion and score
        let acceptChance = 0;

        if (ai.warExhaustion > 50) {
            acceptChance += 0.3;
        }
        if (ai.warExhaustion > 75) {
            acceptChance += 0.3;
        }
        if (playerScore > aiScore) {
            acceptChance += 0.2;
        }

        // Demands affect acceptance
        if (demands) {
            if (demands.type === 'status_quo') {
                acceptChance += 0.2;
            } else if (demands.type === 'concessions' && playerScore > aiScore) {
                acceptChance += 0.1;
            }
        } else {
            // Status quo by default
            acceptChance += 0.3;
        }

        if (Math.random() < acceptChance) {
            // Peace accepted
            ai.stance = 'hostile'; // Post-war stance

            // Reset war exhaustion
            this.state.player.warExhaustion = 0;
            ai.warExhaustion = 0;

            // Apply demands if any
            if (demands && demands.type === 'concessions') {
                this.applyPeaceDemands(demands);
            }

            this.state.addNotification(
                `Peace negotiated with ${ai.name}!`,
                'success'
            );

            return { success: true };
        }

        this.state.addNotification(
            `${ai.name} rejected peace offer.`,
            'warning'
        );

        return {
            success: false,
            reason: 'Peace rejected'
        };
    }

    calculateWarScore(side) {
        let score = 0;
        const entity = side === 'player' ? this.state.player : this.state.ai;
        const enemy = side === 'player' ? this.state.ai : this.state.player;

        // Systems controlled
        score += entity.controlledSystems.length * 10;

        // Fleet strength
        for (const fleet of entity.fleets) {
            score += fleet.ships.length * 2;
        }

        // Enemy exhaustion helps
        score += enemy.warExhaustion / 2;

        // Own exhaustion hurts
        score -= entity.warExhaustion / 3;

        return score;
    }

    applyPeaceDemands(demands) {
        if (demands.systems) {
            for (const systemId of demands.systems) {
                this.transferSystem(systemId, 'ai', 'player');
            }
        }
        if (demands.resources) {
            if (demands.resources.energy) {
                this.state.ai.resources.energy -= demands.resources.energy;
                this.state.player.resources.energy += demands.resources.energy;
            }
            if (demands.resources.minerals) {
                this.state.ai.resources.minerals -= demands.resources.minerals;
                this.state.player.resources.minerals += demands.resources.minerals;
            }
        }
    }

    // Improve relations through gifts
    sendGift(resources) {
        const ai = this.state.ai;
        const player = this.state.player;

        if (ai.stance === 'war') {
            return {
                success: false,
                reason: 'Cannot send gifts during war'
            };
        }

        // Verify player has resources
        if (resources.energy && player.resources.energy < resources.energy) {
            return { success: false, reason: 'Insufficient energy' };
        }
        if (resources.minerals && player.resources.minerals < resources.minerals) {
            return { success: false, reason: 'Insufficient minerals' };
        }

        // Transfer resources
        if (resources.energy) {
            player.resources.energy -= resources.energy;
            ai.resources.energy += resources.energy;
        }
        if (resources.minerals) {
            player.resources.minerals -= resources.minerals;
            ai.resources.minerals += resources.minerals;
        }

        // Improve trust based on gift value
        const giftValue = (resources.energy || 0) + (resources.minerals || 0);
        const trustGain = Math.min(15, Math.floor(giftValue / 20));
        ai.trust = Math.min(100, ai.trust + trustGain);

        this.state.addNotification(
            `Gift sent to ${ai.name}. Relations improved.`,
            'success'
        );

        return {
            success: true,
            trustGain
        };
    }

    // Insult/threaten to decrease relations
    insult() {
        const ai = this.state.ai;

        if (ai.stance === 'war') {
            return { success: false, reason: 'Already at war' };
        }

        ai.trust = Math.max(0, ai.trust - 15);

        this.state.addNotification(
            `You insulted ${ai.name}. Relations worsened.`,
            'warning'
        );

        return { success: true };
    }

    // Check and expire treaties
    updateTreaties() {
        for (const treaty of this.state.treaties) {
            if (treaty.active && treaty.endTurn && this.state.turn >= treaty.endTurn) {
                treaty.active = false;
                this.state.addNotification(
                    `Treaty expired: ${treaty.type.replace('_', ' ')}`,
                    'info'
                );
            }
        }
    }

    // Get available diplomatic actions
    getAvailableActions() {
        const ai = this.state.ai;
        const actions = [];

        if (ai.stance === 'war') {
            actions.push({
                id: 'sue_peace',
                name: 'Sue for Peace',
                description: 'Attempt to negotiate end to the war'
            });
        } else {
            actions.push({
                id: 'propose_trade',
                name: 'Propose Trade',
                description: 'Offer a trade deal'
            });

            const hasNAP = this.state.treaties.some(t =>
                t.type === 'non_aggression' && t.active
            );

            if (!hasNAP) {
                actions.push({
                    id: 'propose_nap',
                    name: 'Non-Aggression Pact',
                    description: 'Propose mutual non-aggression'
                });
            }

            actions.push({
                id: 'send_gift',
                name: 'Send Gift',
                description: 'Improve relations with resources'
            });

            actions.push({
                id: 'declare_war',
                name: 'Declare War',
                description: 'Begin military hostilities'
            });

            actions.push({
                id: 'insult',
                name: 'Send Insult',
                description: 'Worsen relations deliberately'
            });
        }

        return actions;
    }
}

export default DiplomacyManager;
