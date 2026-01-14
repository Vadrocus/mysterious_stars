// EventManager.js - Random events system

export class EventManager {
    constructor(gameState) {
        this.state = gameState;
        this.pendingEvent = null;
    }

    getEventPool() {
        return {
            minor: [
                {
                    id: 'solar_flare',
                    title: 'Solar Flare Activity',
                    description: 'Unusual solar activity in one of your systems has temporarily disrupted mining operations.',
                    weight: 2,
                    choices: [
                        {
                            text: 'Wait it out',
                            effect: { minerals: -20 },
                            outcome: 'Mining operations resume after the flare subsides.'
                        },
                        {
                            text: 'Invest in shielding',
                            effect: { energy: -30 },
                            outcome: 'Protective measures minimize the disruption.'
                        }
                    ]
                },
                {
                    id: 'trade_opportunity',
                    title: 'Trading Vessel',
                    description: 'An independent merchant vessel offers rare materials at favorable rates.',
                    weight: 2,
                    choices: [
                        {
                            text: 'Purchase materials (50 energy)',
                            requirement: { energy: 50 },
                            effect: { energy: -50, minerals: 80 },
                            outcome: 'A profitable exchange.'
                        },
                        {
                            text: 'Decline the offer',
                            effect: {},
                            outcome: 'The merchant moves on.'
                        }
                    ]
                },
                {
                    id: 'research_breakthrough',
                    title: 'Research Breakthrough',
                    description: 'Your scientists report an unexpected discovery during routine research.',
                    weight: 1,
                    choices: [
                        {
                            text: 'Pursue the discovery',
                            effect: { research: 30 },
                            outcome: 'The breakthrough accelerates your research programs.'
                        },
                        {
                            text: 'Focus on practical applications',
                            effect: { energy: 25, minerals: 25 },
                            outcome: 'Immediate benefits flow from the discovery.'
                        }
                    ]
                },
                {
                    id: 'refugee_ship',
                    title: 'Refugee Ship',
                    description: 'A damaged vessel carrying refugees from a distant conflict requests sanctuary.',
                    weight: 2,
                    choices: [
                        {
                            text: 'Welcome them',
                            effect: { energy: -20, populationBonus: 0.5 },
                            outcome: 'The refugees integrate into your colonies, grateful for sanctuary.'
                        },
                        {
                            text: 'Provide supplies and directions',
                            effect: { minerals: -15, energy: -10 },
                            outcome: 'The refugees thank you and continue their journey.'
                        },
                        {
                            text: 'Turn them away',
                            effect: {},
                            outcome: 'The ship departs. You wonder what became of them.'
                        }
                    ]
                }
            ],
            medium: [
                {
                    id: 'pirate_activity',
                    title: 'Pirate Activity',
                    description: 'Pirates have been spotted operating near your trade lanes. They demand tribute or face raids.',
                    weight: 2,
                    choices: [
                        {
                            text: 'Pay tribute (100 minerals)',
                            requirement: { minerals: 100 },
                            effect: { minerals: -100 },
                            outcome: 'The pirates accept payment and move on... for now.'
                        },
                        {
                            text: 'Refuse and reinforce',
                            effect: { fleetDamage: 0.1 },
                            outcome: 'Your patrols engage the pirates. Some ships take damage before they\'re driven off.'
                        },
                        {
                            text: 'Set a trap',
                            requirement: { militaryTech: 2 },
                            effect: { minerals: 50, experience: 10 },
                            outcome: 'Your superior tactics catch the pirates off guard. You capture their supplies.'
                        }
                    ]
                },
                {
                    id: 'asteroid_rich',
                    title: 'Mineral-Rich Asteroid',
                    description: 'Surveys detect a mineral-rich asteroid passing through one of your systems.',
                    weight: 1,
                    choices: [
                        {
                            text: 'Mining operation (costs 50 energy)',
                            requirement: { energy: 50 },
                            effect: { energy: -50, minerals: 150 },
                            outcome: 'Intensive mining extracts valuable minerals before the asteroid moves on.'
                        },
                        {
                            text: 'Let it pass',
                            effect: {},
                            outcome: 'The asteroid continues its journey through the void.'
                        }
                    ]
                },
                {
                    id: 'spy_detected',
                    title: 'Spy Detected',
                    description: 'Your security forces have detected what appears to be an enemy intelligence operative in your territory.',
                    weight: 2,
                    condition: () => this.state.ai.stance !== 'friendly',
                    choices: [
                        {
                            text: 'Capture and interrogate',
                            effect: { subterfugeBonus: 20 },
                            outcome: 'The spy reveals useful information about enemy operations.'
                        },
                        {
                            text: 'Feed false information',
                            effect: { aiTrustPenalty: -10 },
                            outcome: 'The spy returns with misleading intelligence.'
                        },
                        {
                            text: 'Quietly eliminate',
                            effect: {},
                            outcome: 'The spy disappears. A message is sent.'
                        }
                    ]
                },
                {
                    id: 'ancient_probe',
                    title: 'Ancient Probe',
                    description: 'An automated probe of ancient origin has entered your space, scanning everything it passes.',
                    weight: 1,
                    choices: [
                        {
                            text: 'Capture it for study',
                            effect: { research: 75 },
                            outcome: 'The probe\'s technology yields valuable insights.'
                        },
                        {
                            text: 'Attempt communication',
                            effect: { research: 40, loreHint: true },
                            outcome: 'The probe transmits coordinates before shutting down. Perhaps someone is waiting.'
                        },
                        {
                            text: 'Destroy it',
                            effect: {},
                            outcome: 'Whatever secrets it held are lost. But so is whatever was monitoring it.'
                        }
                    ]
                }
            ],
            rare: [
                {
                    id: 'precursor_signal',
                    title: 'Precursor Signal',
                    description: 'Deep space arrays have detected an artificial signal matching patterns from excavated Architect technology.',
                    weight: 1,
                    choices: [
                        {
                            text: 'Trace the signal',
                            effect: { research: 100, revealSite: true },
                            outcome: 'Following the signal reveals something extraordinary...'
                        },
                        {
                            text: 'Broadcast a response',
                            effect: { research: 50 },
                            outcome: 'Your response echoes into the void. If anything hears, it doesn\'t answer.'
                        },
                        {
                            text: 'Jam the signal',
                            effect: { subterfugeBonus: 30 },
                            outcome: 'The signal falls silent. Whatever sent it now knows you\'re here - and capable.'
                        }
                    ]
                },
                {
                    id: 'dimensional_anomaly',
                    title: 'Dimensional Anomaly',
                    description: 'Space itself seems to fold around an object that defies conventional physics. Energy readings are off the scale.',
                    weight: 1,
                    choices: [
                        {
                            text: 'Investigate cautiously',
                            effect: { research: 150 },
                            outcome: 'Your scientists make discoveries that will take years to fully understand.'
                        },
                        {
                            text: 'Harvest the energy',
                            effect: { energy: 300 },
                            outcome: 'Vast amounts of energy are siphoned before the anomaly collapses.'
                        },
                        {
                            text: 'Seal the area',
                            effect: {},
                            outcome: 'Some mysteries are better left alone.'
                        }
                    ]
                }
            ]
        };
    }

    triggerRandomEvent() {
        const pool = this.getEventPool();
        const roll = Math.random();

        let category;
        if (roll < 0.6) {
            category = 'minor';
        } else if (roll < 0.9) {
            category = 'medium';
        } else {
            category = 'rare';
        }

        const events = pool[category].filter(e => {
            if (e.condition && !e.condition()) return false;
            return true;
        });

        if (events.length === 0) return null;

        // Weighted random selection
        const totalWeight = events.reduce((sum, e) => sum + (e.weight || 1), 0);
        let random = Math.random() * totalWeight;

        let selectedEvent = events[0];
        for (const event of events) {
            random -= event.weight || 1;
            if (random <= 0) {
                selectedEvent = event;
                break;
            }
        }

        this.pendingEvent = {
            ...selectedEvent,
            category,
            turn: this.state.turn
        };

        this.state.addNotification(
            `Event: ${selectedEvent.title}`,
            category === 'rare' ? 'warning' : 'info'
        );

        return this.pendingEvent;
    }

    getPendingEvent() {
        return this.pendingEvent;
    }

    resolveEvent(choiceIndex) {
        if (!this.pendingEvent) {
            return { success: false, reason: 'No pending event' };
        }

        const choice = this.pendingEvent.choices[choiceIndex];
        if (!choice) {
            return { success: false, reason: 'Invalid choice' };
        }

        // Check requirements
        if (choice.requirement) {
            if (choice.requirement.energy &&
                this.state.player.resources.energy < choice.requirement.energy) {
                return { success: false, reason: 'Insufficient energy' };
            }
            if (choice.requirement.minerals &&
                this.state.player.resources.minerals < choice.requirement.minerals) {
                return { success: false, reason: 'Insufficient minerals' };
            }
            if (choice.requirement.militaryTech &&
                this.state.player.technology.military.level < choice.requirement.militaryTech) {
                return { success: false, reason: 'Requires military tech level ' + choice.requirement.militaryTech };
            }
        }

        // Apply effects
        const effects = this.applyEffects(choice.effect);

        const result = {
            success: true,
            event: this.pendingEvent,
            choice: choice.text,
            outcome: choice.outcome,
            effects
        };

        this.pendingEvent = null;
        return result;
    }

    applyEffects(effect) {
        const applied = [];

        if (effect.energy) {
            this.state.player.resources.energy += effect.energy;
            applied.push({ type: 'energy', amount: effect.energy });
        }

        if (effect.minerals) {
            this.state.player.resources.minerals += effect.minerals;
            applied.push({ type: 'minerals', amount: effect.minerals });
        }

        if (effect.research) {
            this.state.player.resources.research += effect.research;
            applied.push({ type: 'research', amount: effect.research });
        }

        if (effect.populationBonus) {
            // Apply to a random colony
            if (this.state.player.colonies.length > 0) {
                const colony = this.state.player.colonies[
                    Math.floor(Math.random() * this.state.player.colonies.length)
                ];
                colony.population += effect.populationBonus;
                applied.push({ type: 'population', amount: effect.populationBonus });
            }
        }

        if (effect.fleetDamage) {
            // Damage random fleet
            for (const fleet of this.state.player.fleets) {
                for (const ship of fleet.ships) {
                    ship.health -= ship.maxHealth * effect.fleetDamage;
                }
            }
            applied.push({ type: 'fleetDamage', amount: effect.fleetDamage * 100 + '%' });
        }

        if (effect.subterfugeBonus) {
            this.state.player.technology.subterfuge.progress += effect.subterfugeBonus;
            applied.push({ type: 'subterfugeResearch', amount: effect.subterfugeBonus });
        }

        if (effect.aiTrustPenalty) {
            this.state.ai.trust = Math.max(0, this.state.ai.trust + effect.aiTrustPenalty);
            applied.push({ type: 'aiTrust', amount: effect.aiTrustPenalty });
        }

        if (effect.revealSite) {
            // Reveal an undiscovered archaeology site
            for (const system of this.state.galaxy.systems) {
                for (const planet of system.planets) {
                    if (planet.archaeologySite &&
                        !planet.archaeologySite.discovered &&
                        !this.state.player.deepScannedSystems.has(system.id)) {

                        this.state.player.knownSystems.add(system.id);
                        this.state.player.scannedSystems.add(system.id);
                        this.state.player.deepScannedSystems.add(system.id);
                        planet.archaeologySite.discovered = true;

                        applied.push({
                            type: 'siteRevealed',
                            system: system.name,
                            planet: planet.name
                        });

                        this.state.addNotification(
                            `Archaeological site revealed at ${planet.name}!`,
                            'success'
                        );
                        return applied;
                    }
                }
            }
        }

        return applied;
    }

    // Trigger specific event (for archaeology consequences etc)
    triggerSpecificEvent(eventId) {
        const pool = this.getEventPool();
        for (const category of ['minor', 'medium', 'rare']) {
            const event = pool[category].find(e => e.id === eventId);
            if (event) {
                this.pendingEvent = {
                    ...event,
                    category,
                    turn: this.state.turn
                };
                return this.pendingEvent;
            }
        }
        return null;
    }
}

export default EventManager;
