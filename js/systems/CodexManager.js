// CodexManager.js - Lore storage and cross-reference system

export class CodexManager {
    constructor(gameState) {
        this.state = gameState;
    }

    // Get all codex entries sorted by timestamp
    getAllEntries() {
        return [...this.state.player.codex].sort((a, b) => b.timestamp - a.timestamp);
    }

    // Get entries for a specific site
    getEntriesBySite(siteId) {
        return this.state.player.codex.filter(entry => entry.siteId === siteId);
    }

    // Get entries for a specific system
    getEntriesBySystem(systemId) {
        return this.state.player.codex.filter(entry => entry.systemId === systemId);
    }

    // Search entries by text
    searchEntries(query) {
        const lowerQuery = query.toLowerCase();
        return this.state.player.codex.filter(entry =>
            entry.title.toLowerCase().includes(lowerQuery) ||
            entry.content.toLowerCase().includes(lowerQuery) ||
            entry.siteName.toLowerCase().includes(lowerQuery) ||
            entry.systemName.toLowerCase().includes(lowerQuery)
        );
    }

    // Get entries with cross-references to a specific site
    getCrossReferences(siteId) {
        return this.state.player.codex.filter(entry =>
            entry.crossReferences && entry.crossReferences.includes(siteId)
        );
    }

    // Get entries by tag
    getEntriesByTag(tag) {
        return this.state.player.codex.filter(entry =>
            entry.tags && entry.tags.includes(tag)
        );
    }

    // Get entry by ID
    getEntry(entryId) {
        return this.state.player.codex.find(entry => entry.id === entryId);
    }

    // Add player note to an entry
    addNote(entryId, noteText) {
        const entry = this.getEntry(entryId);
        if (entry) {
            if (!entry.playerNotes) {
                entry.playerNotes = [];
            }
            entry.playerNotes.push({
                text: noteText,
                timestamp: this.state.turn
            });
            return { success: true };
        }
        return { success: false, reason: 'Entry not found' };
    }

    // Remove player note from an entry
    removeNote(entryId, noteIndex) {
        const entry = this.getEntry(entryId);
        if (entry && entry.playerNotes && entry.playerNotes[noteIndex]) {
            entry.playerNotes.splice(noteIndex, 1);
            return { success: true };
        }
        return { success: false, reason: 'Note not found' };
    }

    // Get unique sites discovered
    getDiscoveredSites() {
        const sites = new Map();
        for (const entry of this.state.player.codex) {
            if (!sites.has(entry.siteId)) {
                sites.set(entry.siteId, {
                    siteId: entry.siteId,
                    siteName: entry.siteName,
                    systemId: entry.systemId,
                    systemName: entry.systemName,
                    planetName: entry.planetName,
                    entryCount: 1,
                    firstDiscovered: entry.timestamp
                });
            } else {
                sites.get(entry.siteId).entryCount++;
            }
        }
        return Array.from(sites.values());
    }

    // Get statistics about discovered lore
    getStatistics() {
        const entries = this.state.player.codex;
        const sites = this.getDiscoveredSites();

        // Find cross-references
        const crossRefCount = entries.reduce((count, entry) =>
            count + (entry.crossReferences ? entry.crossReferences.length : 0), 0
        );

        // Collect all unique tags
        const tags = new Set();
        for (const entry of entries) {
            if (entry.tags) {
                entry.tags.forEach(tag => tags.add(tag));
            }
        }

        return {
            totalEntries: entries.length,
            sitesDiscovered: sites.length,
            crossReferences: crossRefCount,
            uniqueTags: tags.size,
            metaChainProgress: this.state.metaChainProgress.discovered.length,
            metaChainComplete: this.state.metaChainProgress.completed
        };
    }

    // Build a narrative summary for a completed site
    buildSiteNarrative(siteId) {
        const entries = this.getEntriesBySite(siteId);
        if (entries.length === 0) return null;

        entries.sort((a, b) => a.layer - b.layer);

        let narrative = {
            siteName: entries[0].siteName,
            systemName: entries[0].systemName,
            planetName: entries[0].planetName,
            chapters: []
        };

        for (const entry of entries) {
            narrative.chapters.push({
                layer: entry.layer,
                title: entry.title,
                content: entry.content,
                choice: entry.choiceMade,
                outcome: entry.outcome
            });
        }

        return narrative;
    }

    // Find connections between entries (systems that reference each other)
    findConnections() {
        const connections = [];
        const entries = this.state.player.codex;

        for (const entry of entries) {
            if (entry.crossReferences) {
                for (const refSiteId of entry.crossReferences) {
                    // Find entries for the referenced site
                    const refEntries = this.getEntriesBySite(refSiteId);
                    if (refEntries.length > 0) {
                        connections.push({
                            from: {
                                siteId: entry.siteId,
                                siteName: entry.siteName,
                                systemName: entry.systemName
                            },
                            to: {
                                siteId: refSiteId,
                                siteName: refEntries[0].siteName,
                                systemName: refEntries[0].systemName
                            },
                            discoveredTurn: entry.timestamp
                        });
                    }
                }
            }
        }

        return connections;
    }

    // Export codex to text format
    exportToText() {
        const sites = this.getDiscoveredSites();
        let text = '=== MYSTERIOUS STARS CODEX ===\n\n';

        for (const site of sites) {
            const narrative = this.buildSiteNarrative(site.siteId);
            if (narrative) {
                text += `━━━ ${narrative.siteName} ━━━\n`;
                text += `Location: ${narrative.planetName}, ${narrative.systemName} System\n\n`;

                for (const chapter of narrative.chapters) {
                    text += `--- ${chapter.title} ---\n`;
                    text += `${chapter.content.replace(/<[^>]*>/g, '')}\n\n`;
                    text += `Choice: ${chapter.choice}\n`;
                    if (chapter.outcome) {
                        text += `Outcome: ${chapter.outcome}\n`;
                    }
                    text += '\n';
                }

                text += '\n\n';
            }
        }

        return text;
    }

    // Highlight cross-references in text
    processTextForDisplay(text) {
        // Convert cross-reference spans to clickable elements
        const processed = text.replace(
            /<span class="codex-cross-reference" data-system="([^"]+)">([^<]+)<\/span>/g,
            (match, systemId, systemName) => {
                const hasEntries = this.getEntriesBySystem(systemId).length > 0;
                const className = hasEntries ? 'codex-cross-reference discovered' : 'codex-cross-reference';
                return `<span class="${className}" data-system="${systemId}" onclick="window.game.ui.showSystemCodex('${systemId}')">${systemName}</span>`;
            }
        );

        return processed;
    }
}

export default CodexManager;
