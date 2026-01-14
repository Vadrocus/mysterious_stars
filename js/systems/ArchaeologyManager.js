// ArchaeologyManager.js - Archaeological site excavation and narrative system

export class ArchaeologyManager {
    constructor(gameState) {
        this.state = gameState;
        this.siteData = null; // Loaded from data file
    }

    loadSiteData(data) {
        this.siteData = data;
    }

    getSiteInfo(siteId) {
        if (!this.siteData) return null;
        return this.siteData.sites[siteId];
    }

    startExcavation(systemId, planetId, owner = 'player') {
        const system = this.state.getSystem(systemId);
        const planet = system?.planets.find(p => p.id === planetId);

        if (!planet || !planet.archaeologySite) {
            return { success: false, reason: 'No archaeology site found' };
        }

        if (!planet.archaeologySite.discovered) {
            return { success: false, reason: 'Site not yet discovered (requires deep scan)' };
        }

        if (planet.archaeologySite.completed) {
            return { success: false, reason: 'Site already fully excavated' };
        }

        const siteKey = `${systemId}_${planetId}`;

        // Check if already excavating
        if (this.state.excavations[siteKey]) {
            return { success: false, reason: 'Excavation already in progress' };
        }

        const siteInfo = this.getSiteInfo(planet.archaeologySite.id);
        if (!siteInfo) {
            return { success: false, reason: 'Site data not found' };
        }

        // Create excavation record
        this.state.excavations[siteKey] = {
            siteId: planet.archaeologySite.id,
            systemId,
            systemName: system.name,
            planetId,
            planetName: planet.name,
            owner,
            active: true,
            currentLayer: 1,
            totalLayers: siteInfo.layers.length,
            progress: 0,
            readyForChoice: false,
            choicesMade: [],
            narrativeLog: []
        };

        if (owner === 'player') {
            this.state.addNotification(
                `Excavation started at ${planet.name}: ${siteInfo.name}`,
                'success'
            );
        }

        return { success: true, excavation: this.state.excavations[siteKey] };
    }

    getExcavationProgress(systemId, planetId) {
        const siteKey = `${systemId}_${planetId}`;
        return this.state.excavations[siteKey] || null;
    }

    getCurrentLayerContent(systemId, planetId) {
        const excavation = this.getExcavationProgress(systemId, planetId);
        if (!excavation || !excavation.readyForChoice) {
            return null;
        }

        const siteInfo = this.getSiteInfo(excavation.siteId);
        if (!siteInfo) return null;

        const layerIndex = excavation.currentLayer - 1;
        const layer = siteInfo.layers[layerIndex];

        if (!layer) return null;

        // Process narrative text with cross-references
        const narrativeText = this.processNarrative(layer.narrative, excavation);

        return {
            layerNumber: excavation.currentLayer,
            totalLayers: excavation.totalLayers,
            title: layer.title,
            narrative: narrativeText,
            choices: layer.choices.map((choice, index) => ({
                id: index,
                text: choice.text,
                hint: choice.hint || null
            })),
            siteName: siteInfo.name
        };
    }

    processNarrative(narrative, excavation) {
        // Replace system name placeholders
        let processed = narrative.replace(/\{SYSTEM_NAME\}/g, excavation.systemName);
        processed = processed.replace(/\{PLANET_NAME\}/g, excavation.planetName);

        // Add cross-references for connected systems
        // This creates the mystery element where players notice patterns
        const systems = this.state.galaxy.systems;
        for (const system of systems) {
            if (processed.includes(`{CROSS_REF:${system.id}}`)) {
                processed = processed.replace(
                    `{CROSS_REF:${system.id}}`,
                    `<span class="codex-cross-reference" data-system="${system.id}">${system.name}</span>`
                );
            }
        }

        return processed;
    }

    makeChoice(systemId, planetId, choiceIndex, owner = 'player') {
        const excavation = this.getExcavationProgress(systemId, planetId);
        if (!excavation) {
            return { success: false, reason: 'No active excavation' };
        }

        if (!excavation.readyForChoice) {
            return { success: false, reason: 'Layer not ready for choice' };
        }

        const siteInfo = this.getSiteInfo(excavation.siteId);
        if (!siteInfo) {
            return { success: false, reason: 'Site data not found' };
        }

        const layerIndex = excavation.currentLayer - 1;
        const layer = siteInfo.layers[layerIndex];
        const choice = layer.choices[choiceIndex];

        if (!choice) {
            return { success: false, reason: 'Invalid choice' };
        }

        // Record the choice
        excavation.choicesMade.push({
            layer: excavation.currentLayer,
            choiceIndex,
            choiceText: choice.text
        });

        // Add to narrative log
        excavation.narrativeLog.push({
            layer: excavation.currentLayer,
            title: layer.title,
            narrative: this.processNarrative(layer.narrative, excavation),
            choiceMade: choice.text,
            outcome: choice.outcome
        });

        // Apply rewards/consequences
        const result = this.applyChoiceEffects(choice, excavation, owner);

        // Add codex entry
        if (owner === 'player') {
            this.addCodexEntry(excavation, layer, choice);
        }

        // Move to next layer or complete
        excavation.readyForChoice = false;
        excavation.progress = 0;

        if (excavation.currentLayer >= excavation.totalLayers) {
            // Excavation complete!
            this.completeExcavation(systemId, planetId, owner);
            result.excavationComplete = true;
        } else {
            excavation.currentLayer++;
        }

        return { success: true, ...result };
    }

    applyChoiceEffects(choice, excavation, owner) {
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const result = {
            rewards: [],
            consequences: [],
            loreDiscovered: []
        };

        // Apply resource rewards
        if (choice.rewards) {
            if (choice.rewards.energy) {
                entity.resources.energy += choice.rewards.energy;
                result.rewards.push(`+${choice.rewards.energy} Energy`);
            }
            if (choice.rewards.minerals) {
                entity.resources.minerals += choice.rewards.minerals;
                result.rewards.push(`+${choice.rewards.minerals} Minerals`);
            }
            if (choice.rewards.research) {
                entity.resources.research += choice.rewards.research;
                result.rewards.push(`+${choice.rewards.research} Research`);
            }
        }

        // Apply tech bonuses
        if (choice.techBonus && owner === 'player') {
            const category = choice.techBonus.category;
            entity.technology[category].progress += choice.techBonus.amount;
            result.rewards.push(`+${choice.techBonus.amount} ${category} research progress`);
        }

        // Apply negative consequences
        if (choice.consequences) {
            if (choice.consequences.damage) {
                // Damage to excavation team - lose some research
                entity.resources.research -= choice.consequences.damage;
                result.consequences.push(`Lost ${choice.consequences.damage} Research`);
            }
            if (choice.consequences.event) {
                // Trigger a special event
                result.triggeredEvent = choice.consequences.event;
            }
        }

        // Lore discoveries
        if (choice.lore) {
            result.loreDiscovered.push(choice.lore);
        }

        // Cross-reference discoveries
        if (choice.crossReference) {
            result.crossReference = choice.crossReference;
        }

        // Meta-chain progress
        if (choice.metaChainKey) {
            if (!this.state.metaChainProgress.discovered.includes(choice.metaChainKey)) {
                this.state.metaChainProgress.discovered.push(choice.metaChainKey);
                result.metaChainProgress = true;

                // Check if meta-chain complete
                if (this.checkMetaChainComplete()) {
                    result.metaChainComplete = true;
                    this.applyMetaChainReward(owner);
                }
            }
        }

        return result;
    }

    addCodexEntry(excavation, layer, choice) {
        const entry = {
            id: `codex_${excavation.siteId}_${excavation.currentLayer}`,
            siteId: excavation.siteId,
            siteName: this.getSiteInfo(excavation.siteId)?.name || 'Unknown Site',
            systemId: excavation.systemId,
            systemName: excavation.systemName,
            planetName: excavation.planetName,
            layer: excavation.currentLayer,
            title: layer.title,
            content: this.processNarrative(layer.narrative, excavation),
            choiceMade: choice.text,
            outcome: choice.outcome,
            timestamp: this.state.turn,
            crossReferences: choice.crossReference ? [choice.crossReference] : [],
            tags: layer.tags || []
        };

        this.state.player.codex.push(entry);
    }

    completeExcavation(systemId, planetId, owner) {
        const siteKey = `${systemId}_${planetId}`;
        const excavation = this.state.excavations[siteKey];

        if (!excavation) return;

        const system = this.state.getSystem(systemId);
        const planet = system?.planets.find(p => p.id === planetId);

        if (planet && planet.archaeologySite) {
            planet.archaeologySite.completed = true;
        }

        // Apply final site rewards
        const siteInfo = this.getSiteInfo(excavation.siteId);
        if (siteInfo && siteInfo.completionBonus) {
            const entity = owner === 'player' ? this.state.player : this.state.ai;

            if (siteInfo.completionBonus.energy) {
                entity.resources.energy += siteInfo.completionBonus.energy;
            }
            if (siteInfo.completionBonus.minerals) {
                entity.resources.minerals += siteInfo.completionBonus.minerals;
            }
            if (siteInfo.completionBonus.research) {
                entity.resources.research += siteInfo.completionBonus.research;
            }
        }

        if (owner === 'player') {
            this.state.addNotification(
                `Excavation complete: ${siteInfo?.name || 'Archaeological Site'}!`,
                'success'
            );
        }

        // Mark as inactive but keep record
        excavation.active = false;
        excavation.completedTurn = this.state.turn;
    }

    checkMetaChainComplete() {
        const requiredKeys = ['crystal_origin', 'void_message', 'stellar_architects'];
        return requiredKeys.every(key =>
            this.state.metaChainProgress.discovered.includes(key)
        );
    }

    applyMetaChainReward(owner) {
        const entity = owner === 'player' ? this.state.player : this.state.ai;

        // Massive bonuses for completing the meta-chain
        entity.resources.energy += 500;
        entity.resources.minerals += 500;
        entity.resources.research += 300;

        // Tech boost
        entity.technology.military.progress += 100;
        entity.technology.economy.progress += 100;
        entity.technology.subterfuge.progress += 100;

        this.state.metaChainProgress.completed = true;

        if (owner === 'player') {
            this.state.addNotification(
                'The Stellar Architects\' Legacy revealed! Massive strategic advantage gained!',
                'success'
            );
        }
    }

    // Get all active excavations for a player
    getActiveExcavations(owner = 'player') {
        return Object.values(this.state.excavations)
            .filter(e => e.owner === owner && e.active);
    }

    // Get all discovered but not started sites
    getDiscoveredSites(owner = 'player') {
        const entity = owner === 'player' ? this.state.player : this.state.ai;
        const sites = [];

        for (const systemId of entity.deepScannedSystems) {
            const system = this.state.getSystem(systemId);
            if (!system) continue;

            for (const planet of system.planets) {
                if (planet.archaeologySite &&
                    planet.archaeologySite.discovered &&
                    !planet.archaeologySite.completed) {

                    const siteKey = `${systemId}_${planet.id}`;
                    if (!this.state.excavations[siteKey]) {
                        sites.push({
                            systemId,
                            systemName: system.name,
                            planetId: planet.id,
                            planetName: planet.name,
                            siteId: planet.archaeologySite.id,
                            siteInfo: this.getSiteInfo(planet.archaeologySite.id)
                        });
                    }
                }
            }
        }

        return sites;
    }

    // Pause/resume excavation
    pauseExcavation(systemId, planetId) {
        const siteKey = `${systemId}_${planetId}`;
        const excavation = this.state.excavations[siteKey];
        if (excavation) {
            excavation.active = false;
            return { success: true };
        }
        return { success: false, reason: 'Excavation not found' };
    }

    resumeExcavation(systemId, planetId) {
        const siteKey = `${systemId}_${planetId}`;
        const excavation = this.state.excavations[siteKey];
        if (excavation && !excavation.completedTurn) {
            excavation.active = true;
            return { success: true };
        }
        return { success: false, reason: 'Excavation not found or already complete' };
    }
}

export default ArchaeologyManager;
