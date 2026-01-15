// UIManager.js - Main UI controller

export class UIManager {
    constructor(game) {
        this.game = game;
        this.state = game.state;
        this.activeTab = 'empire';
        this.selectedSystem = null;
        this.selectedFleet = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // End turn button
        document.getElementById('end-turn-btn')?.addEventListener('click', () => {
            this.game.endTurn();
        });

        // Close panel button
        document.getElementById('close-panel')?.addEventListener('click', () => {
            this.closeRightPanel();
        });

        // System view close
        document.getElementById('close-system-view')?.addEventListener('click', () => {
            this.closeSystemView();
        });

        // Colony view close
        document.getElementById('close-colony-view')?.addEventListener('click', () => {
            this.closeColonyView();
        });

        // Archaeology view close
        document.getElementById('close-archaeology-view')?.addEventListener('click', () => {
            this.closeArchaeologyView();
        });

        // Combat modal close
        document.getElementById('close-combat')?.addEventListener('click', () => {
            this.closeCombatModal();
        });

        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.game.mapRenderer.zoomIn();
        });

        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.game.mapRenderer.zoomOut();
        });

        // Main menu buttons
        document.getElementById('new-game-btn')?.addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('load-game-btn')?.addEventListener('click', () => {
            this.loadGame();
        });
    }

    startNewGame() {
        document.getElementById('main-menu')?.classList.add('hidden');
        this.game.startNewGame();
    }

    loadGame() {
        const result = this.game.systems.save.load();
        if (result.success) {
            document.getElementById('main-menu')?.classList.add('hidden');
            this.game.initializeWithLoadedState();
            this.updateAll();
        } else {
            alert('No saved game found or load failed.');
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        this.updateSidebarContent();
    }

    updateAll() {
        this.updateResourceDisplay();
        this.updateTurnDisplay();
        this.updateSidebarContent();
        this.updateNotifications();
        this.updateActionButtons();
    }

    updateResourceDisplay() {
        const player = this.state.player;

        document.getElementById('energy-amount').textContent =
            Math.floor(player.resources.energy);
        document.getElementById('minerals-amount').textContent =
            Math.floor(player.resources.minerals);
        document.getElementById('research-amount').textContent =
            Math.floor(player.resources.research);

        const netEnergy = player.income.energy - player.upkeep.energy;
        const netMinerals = player.income.minerals - player.upkeep.minerals;

        const energyIncome = document.getElementById('energy-income');
        energyIncome.textContent = `(${netEnergy >= 0 ? '+' : ''}${netEnergy})`;
        energyIncome.className = `income ${netEnergy >= 0 ? 'positive' : 'negative'}`;

        const mineralsIncome = document.getElementById('minerals-income');
        mineralsIncome.textContent = `(${netMinerals >= 0 ? '+' : ''}${netMinerals})`;
        mineralsIncome.className = `income ${netMinerals >= 0 ? 'positive' : 'negative'}`;

        const researchIncome = document.getElementById('research-income');
        researchIncome.textContent = `(+${player.income.research})`;
        researchIncome.className = 'income positive';
    }

    updateTurnDisplay() {
        document.getElementById('turn-number').textContent = this.state.turn;
    }

    updateSidebarContent() {
        const content = document.getElementById('sidebar-content');
        if (!content) return;

        switch (this.activeTab) {
            case 'empire':
                content.innerHTML = this.renderEmpireTab();
                break;
            case 'tech':
                content.innerHTML = this.renderTechTab();
                this.setupTechListeners();
                break;
            case 'fleets':
                content.innerHTML = this.renderFleetsTab();
                this.setupFleetListeners();
                break;
            case 'diplomacy':
                content.innerHTML = this.renderDiplomacyTab();
                this.setupDiplomacyListeners();
                break;
            case 'codex':
                content.innerHTML = this.renderCodexTab();
                this.setupCodexListeners();
                break;
        }
    }

    renderEmpireTab() {
        const player = this.state.player;
        const counts = this.state.getSystemCounts();

        return `
            <div class="empire-stats">
                <div class="empire-stat">
                    <div class="empire-stat-label">Systems</div>
                    <div class="empire-stat-value">${counts.player}/${counts.total}</div>
                </div>
                <div class="empire-stat">
                    <div class="empire-stat-label">Colonies</div>
                    <div class="empire-stat-value">${player.colonies.length}</div>
                </div>
                <div class="empire-stat">
                    <div class="empire-stat-label">Fleets</div>
                    <div class="empire-stat-value">${player.fleets.length}</div>
                </div>
                <div class="empire-stat">
                    <div class="empire-stat-label">Explored</div>
                    <div class="empire-stat-value">${player.knownSystems.size}</div>
                </div>
            </div>
            <div class="empire-section">
                <div class="empire-section-title">Excavations</div>
                ${this.renderActiveExcavations()}
            </div>
            <div class="empire-section">
                <div class="empire-section-title">Victory Progress</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${counts.player >= Math.ceil(counts.total / 2)
                        ? '<span style="color: var(--accent-teal);">Majority control achieved!</span>'
                        : `${Math.ceil(counts.total / 2) - counts.player} more systems for majority`
                    }
                </div>
            </div>
        `;
    }

    renderActiveExcavations() {
        const excavations = this.game.systems.archaeology.getActiveExcavations();

        if (excavations.length === 0) {
            return '<div style="font-size: 12px; color: var(--text-muted);">No active excavations</div>';
        }

        return excavations.map(exc => `
            <div class="excavation-item" style="
                background: var(--bg-darker);
                padding: 8px;
                border-radius: 4px;
                margin-bottom: 8px;
                border-left: 3px solid ${exc.readyForChoice ? 'var(--accent-gold)' : 'var(--accent-purple)'};
            ">
                <div style="font-size: 12px; color: var(--accent-cyan);">${exc.systemName}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">
                    Layer ${exc.currentLayer}/${exc.totalLayers}
                    ${exc.readyForChoice ? ' - Ready for decision!' : ''}
                </div>
            </div>
        `).join('');
    }

    renderTechTab() {
        const tech = this.state.player.technology;
        const { TECHNOLOGY } = this.game.techData;

        let html = '';

        for (const [category, data] of Object.entries(TECHNOLOGY)) {
            const playerTech = tech[category];
            const currentTier = data.tiers.find(t => t.level === playerTech.level + 1);
            const isResearching = playerTech.researching === category;

            html += `
                <div class="tech-category">
                    <div class="tech-category-title">
                        ${data.icon} ${data.name} - Level ${playerTech.level}
                    </div>
            `;

            if (currentTier) {
                const progressPercent = (playerTech.progress / currentTier.cost) * 100;
                html += `
                    <div class="tech-item ${isResearching ? 'researching' : ''}"
                         data-category="${category}">
                        <div class="tech-name">${currentTier.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">
                            ${currentTier.description}
                        </div>
                        <div class="tech-progress">
                            <div class="tech-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div style="font-size: 10px; color: var(--text-muted);">
                            ${playerTech.progress}/${currentTier.cost} research
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="tech-item completed">
                        <div class="tech-name">Maximum level reached</div>
                    </div>
                `;
            }

            html += '</div>';
        }

        return html;
    }

    setupTechListeners() {
        document.querySelectorAll('.tech-item[data-category]').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                this.startResearch(category);
            });
        });
    }

    startResearch(category) {
        const tech = this.state.player.technology[category];
        if (!tech.researching) {
            tech.researching = category;
            this.state.addNotification(`Started researching ${category}`, 'info');
            this.updateSidebarContent();
        }
    }

    renderFleetsTab() {
        const fleets = this.state.player.fleets;

        if (fleets.length === 0) {
            return '<div style="color: var(--text-muted); padding: 16px;">No fleets</div>';
        }

        return fleets.map(fleet => {
            const system = this.state.getSystem(fleet.systemId);
            const composition = this.game.systems.fleet.getFleetComposition(fleet);
            const strength = this.game.systems.fleet.getFleetStrength(fleet);

            return `
                <div class="fleet-item ${this.selectedFleet?.id === fleet.id ? 'selected' : ''}"
                     data-fleet-id="${fleet.id}">
                    <div class="fleet-header">
                        <span class="fleet-name">${fleet.name}</span>
                        <span style="color: var(--accent-cyan); font-size: 12px;">${strength}</span>
                    </div>
                    <div class="fleet-location">${system?.name || 'Unknown'}</div>
                    <div class="fleet-composition">
                        ${Object.entries(composition)
                            .filter(([_, count]) => count > 0)
                            .map(([type, count]) => `${count} ${type}`)
                            .join(', ')}
                    </div>
                    ${fleet.destination ? `
                        <div style="font-size: 10px; color: var(--accent-teal);">
                            → ${this.state.getSystem(fleet.destination)?.name}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    setupFleetListeners() {
        document.querySelectorAll('.fleet-item').forEach(item => {
            item.addEventListener('click', () => {
                const fleetId = item.dataset.fleetId;
                const fleet = this.state.getFleet(fleetId);
                if (fleet) {
                    this.selectFleet(fleet);
                }
            });
        });
    }

    renderDiplomacyTab() {
        const status = this.game.systems.diplomacy.getStatus();

        const stanceClass = `stance-${status.stance}`;

        return `
            <div class="diplomacy-opponent">
                <div class="opponent-header">
                    <span class="opponent-name">${status.name}</span>
                    <span class="opponent-stance ${stanceClass}">
                        ${status.stance.charAt(0).toUpperCase() + status.stance.slice(1)}
                    </span>
                </div>
                <div class="trust-meter">
                    <div class="trust-label">Trust: ${Math.floor(status.trust)}/100</div>
                    <div class="trust-bar">
                        <div class="trust-fill" style="width: ${status.trust}%"></div>
                    </div>
                </div>
                ${status.stance === 'war' ? `
                    <div style="font-size: 11px; color: var(--accent-red); margin: 8px 0;">
                        War Exhaustion: ${Math.floor(this.state.player.warExhaustion)}%
                    </div>
                ` : ''}
                <div class="diplomacy-actions">
                    ${this.renderDiplomacyActions()}
                </div>
            </div>
        `;
    }

    renderDiplomacyActions() {
        const actions = this.game.systems.diplomacy.getAvailableActions();

        return actions.map(action => `
            <button class="btn-secondary" data-action="${action.id}"
                    ${action.id === 'declare_war' ? 'style="border-color: var(--accent-red);"' : ''}>
                ${action.name}
            </button>
        `).join('');
    }

    setupDiplomacyListeners() {
        document.querySelectorAll('.diplomacy-actions button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleDiplomacyAction(btn.dataset.action);
            });
        });
    }

    handleDiplomacyAction(actionId) {
        switch (actionId) {
            case 'declare_war':
                if (confirm('Are you sure you want to declare war?')) {
                    this.game.systems.diplomacy.declareWar();
                }
                break;
            case 'sue_peace':
                this.game.systems.diplomacy.sueForPeace();
                break;
            case 'propose_nap':
                this.game.systems.diplomacy.proposeNAP();
                break;
            case 'send_gift':
                this.showGiftDialog();
                break;
            case 'insult':
                this.game.systems.diplomacy.insult();
                break;
        }
        this.updateSidebarContent();
    }

    showGiftDialog() {
        const amount = prompt('Enter amount of minerals to gift:', '50');
        if (amount && !isNaN(amount)) {
            this.game.systems.diplomacy.sendGift({ minerals: parseInt(amount) });
            this.updateAll();
        }
    }

    renderCodexTab() {
        const entries = this.game.systems.codex.getAllEntries();
        const stats = this.game.systems.codex.getStatistics();

        let html = `
            <div style="margin-bottom: 16px; padding: 8px; background: var(--bg-darker); border-radius: 4px;">
                <div style="font-size: 11px; color: var(--text-muted);">
                    ${stats.totalEntries} entries | ${stats.sitesDiscovered} sites |
                    ${stats.metaChainProgress}/3 keys
                </div>
            </div>
            <div class="codex-search">
                <input type="text" placeholder="Search codex..." id="codex-search-input">
            </div>
        `;

        if (entries.length === 0) {
            html += '<div style="color: var(--text-muted); padding: 16px;">No discoveries yet</div>';
        } else {
            html += entries.slice(0, 10).map(entry => `
                <div class="codex-entry" data-entry-id="${entry.id}">
                    <div class="codex-entry-title">${entry.title}</div>
                    <div class="codex-entry-location">${entry.siteName} - ${entry.systemName}</div>
                    <div class="codex-entry-preview">${entry.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</div>
                </div>
            `).join('');
        }

        return html;
    }

    setupCodexListeners() {
        document.querySelectorAll('.codex-entry').forEach(item => {
            item.addEventListener('click', () => {
                const entryId = item.dataset.entryId;
                this.showCodexEntry(entryId);
            });
        });

        document.getElementById('codex-search-input')?.addEventListener('input', (e) => {
            this.filterCodex(e.target.value);
        });
    }

    showCodexEntry(entryId) {
        const entry = this.game.systems.codex.getEntry(entryId);
        if (!entry) return;

        const content = document.getElementById('panel-content');
        const panel = document.getElementById('right-panel');
        const title = document.getElementById('panel-title');

        title.textContent = entry.title;

        content.innerHTML = `
            <div class="codex-detail">
                <div class="codex-detail-header">
                    <div class="codex-detail-meta">
                        ${entry.siteName} | ${entry.planetName}, ${entry.systemName}
                    </div>
                </div>
                <div class="codex-detail-content">
                    ${this.game.systems.codex.processTextForDisplay(entry.content)}
                </div>
                ${entry.choiceMade ? `
                    <div style="margin-top: 16px; padding: 12px; background: var(--bg-darker); border-radius: 4px;">
                        <div style="font-size: 11px; color: var(--text-muted);">Choice made:</div>
                        <div style="color: var(--accent-cyan);">${entry.choiceMade}</div>
                        ${entry.outcome ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${entry.outcome}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        panel.classList.remove('hidden');
    }

    filterCodex(query) {
        if (!query) {
            this.updateSidebarContent();
            return;
        }

        const entries = this.game.systems.codex.searchEntries(query);
        const container = document.getElementById('sidebar-content');

        let html = `
            <div class="codex-search">
                <input type="text" placeholder="Search codex..." id="codex-search-input" value="${query}">
            </div>
        `;

        html += entries.map(entry => `
            <div class="codex-entry" data-entry-id="${entry.id}">
                <div class="codex-entry-title">${entry.title}</div>
                <div class="codex-entry-location">${entry.siteName} - ${entry.systemName}</div>
            </div>
        `).join('');

        container.innerHTML = html;
        this.setupCodexListeners();
    }

    updateNotifications() {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        const notifications = this.state.player.notifications.slice(-10).reverse();

        container.innerHTML = notifications.map(n => `
            <div class="notification ${n.type}">
                <span style="color: var(--text-muted); font-size: 10px;">T${n.turn}</span>
                ${n.message}
            </div>
        `).join('');
    }

    updateActionButtons() {
        const container = document.getElementById('action-buttons');
        if (!container) return;

        let buttons = [];

        if (this.selectedFleet) {
            const fleet = this.selectedFleet;
            buttons.push(`<button class="btn-secondary" onclick="window.game.ui.showFleetActions('${fleet.id}')">Fleet Actions</button>`);
        }

        if (this.selectedSystem) {
            const system = this.selectedSystem;
            const visibility = this.state.getSystemVisibility(system.id);

            buttons.push(`<button class="btn-primary" onclick="window.game.ui.openSystemView('${system.id}')">View System</button>`);

            if (visibility !== 'deep_scanned') {
                buttons.push(`<button class="btn-secondary" onclick="window.game.ui.showScanOptions('${system.id}')">Scan Options</button>`);
            }
        }

        container.innerHTML = buttons.join('');
    }

    selectFleet(fleet) {
        this.selectedFleet = fleet;
        this.game.mapRenderer.selectedFleet = fleet;
        this.updateActionButtons();
        this.updateSidebarContent();
    }

    selectSystem(system) {
        this.selectedSystem = system;
        this.game.mapRenderer.selectedSystem = system;
        this.updateActionButtons();
    }

    openSystemView(systemId) {
        const system = this.state.getSystem(systemId);
        if (!system) return;

        const view = document.getElementById('system-view');
        const nameEl = document.getElementById('system-name');
        const content = document.getElementById('system-view-content');

        // Set header with homeworld indicator
        nameEl.textContent = system.isHomeSystem ? `${system.name} (Home System)` : system.name;

        const visibility = this.state.getSystemVisibility(systemId);
        const controller = this.state.getSystemController(systemId);

        // Get connected systems
        const connections = this.state.galaxy.hyperlanes
            .filter(h => h.from === systemId || h.to === systemId)
            .map(h => {
                const connectedId = h.from === systemId ? h.to : h.from;
                const connectedSystem = this.state.getSystem(connectedId);
                return connectedSystem;
            })
            .filter(s => s && this.state.player.knownSystems.has(s.id));

        // Get fleets in system
        const playerFleets = this.state.player.fleets.filter(f => f.systemId === systemId);
        const aiFleets = this.state.ai.fleets.filter(f => f.systemId === systemId);

        // Build the orbital system map HTML
        let html = `
            <div class="system-map-container" id="system-map-${systemId}">
                <!-- Navigation -->
                <div class="system-map-nav">
                    <button onclick="window.game.ui.goToHomeworld()">🏠 Homeworld</button>
                </div>

                <!-- Central Star -->
                <div class="system-star">
                    <div class="system-star-glow ${system.starType}">
                        <span class="system-star-icon">★</span>
                    </div>
                    <div class="system-star-label">${system.starType.charAt(0).toUpperCase() + system.starType.slice(1)} Star</div>
                </div>

                <!-- Orbital Rings and Planets -->
                ${this.renderOrbitalBodies(system, visibility)}

                <!-- Asteroid Belt if present -->
                ${system.asteroidBelt ? `
                    <div class="asteroid-belt" style="width: 280px; height: 280px;"></div>
                ` : ''}

                <!-- System Info Panel -->
                <div class="system-info-panel">
                    <div class="system-info-title">${system.name}</div>
                    <div class="system-info-row">
                        <span class="system-info-label">Star Type</span>
                        <span class="system-info-value">${system.starType.charAt(0).toUpperCase() + system.starType.slice(1)}</span>
                    </div>
                    <div class="system-info-row">
                        <span class="system-info-label">Planets</span>
                        <span class="system-info-value">${system.planets.length}</span>
                    </div>
                    <div class="system-info-row">
                        <span class="system-info-label">Control</span>
                        <span class="system-info-value" style="color: ${controller === 'player' ? 'var(--accent-teal)' : controller === 'ai' ? 'var(--accent-red)' : 'var(--text-muted)'}">
                            ${controller === 'player' ? 'Yours' : controller === 'ai' ? 'Enemy' : 'Unclaimed'}
                        </span>
                    </div>
                    ${visibility === 'scanned' || visibility === 'deep_scanned' ? `
                        <div class="system-info-section">
                            <div class="system-info-section-title">Resources</div>
                            <div class="system-info-row">
                                <span class="system-info-label">Habitable</span>
                                <span class="system-info-value">${system.planets.filter(p => p.habitable).length}</span>
                            </div>
                            <div class="system-info-row">
                                <span class="system-info-label">Archaeology</span>
                                <span class="system-info-value" style="color: var(--accent-purple)">
                                    ${system.planets.filter(p => p.archaeologySite?.discovered).length} site(s)
                                </span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Fleets in System -->
                ${playerFleets.length > 0 || aiFleets.length > 0 ? `
                    <div class="system-fleets">
                        ${playerFleets.map(f => `
                            <div class="system-fleet-icon" onclick="window.game.ui.selectFleet(window.game.state.getFleet('${f.id}'))">
                                <span>🚀</span>
                                <span>${f.name} (${f.ships.length})</span>
                            </div>
                        `).join('')}
                        ${aiFleets.map(f => `
                            <div class="system-fleet-icon enemy">
                                <span>🚀</span>
                                <span>Enemy Fleet (${f.ships.length})</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Connected Systems -->
                ${connections.length > 0 ? `
                    <div class="system-connections">
                        <div class="system-connections-title">Hyperlane Connections</div>
                        ${connections.map(s => `
                            <div class="system-connection-item" onclick="window.game.ui.openSystemView('${s.id}')"
                                >→ ${s.name}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        content.innerHTML = html;
        view.classList.remove('hidden');

        // Setup planet click handlers
        document.querySelectorAll('.orbital-body').forEach(body => {
            body.addEventListener('click', () => {
                const planetId = body.dataset.planetId;
                this.showPlanetDetails(systemId, planetId);
            });
        });
    }

    renderOrbitalBodies(system, visibility) {
        const icons = {
            continental: '🌍',
            ocean: '🌊',
            desert: '🏜️',
            arctic: '❄️',
            barren: '🌑',
            gas_giant: '🪐'
        };

        const centerX = 50; // percentage
        const centerY = 50;
        const baseOrbitRadius = 80; // pixels from center for first planet
        const orbitIncrement = 50; // pixels between orbits

        let html = '';

        system.planets.forEach((planet, index) => {
            const orbitRadius = baseOrbitRadius + (index * orbitIncrement);

            // Add orbital ring
            html += `
                <div class="orbital-ring" style="width: ${orbitRadius * 2}px; height: ${orbitRadius * 2}px;"></div>
            `;

            // Position planet on orbit (distribute evenly with some randomness)
            const angle = (index * (360 / system.planets.length) + (index * 37)) * (Math.PI / 180);
            const planetX = centerX + (orbitRadius / 5) * Math.cos(angle);
            const planetY = centerY + (orbitRadius / 5) * Math.sin(angle);

            const isColonized = planet.colonized && planet.owner === 'player';
            const isHomeworld = planet.isHomeworld;
            const hasSite = planet.archaeologySite?.discovered && !planet.archaeologySite?.completed;

            // Build planet classes
            let sphereClasses = `planet-sphere ${planet.type}`;
            if (isColonized) sphereClasses += ' colonized';
            if (isHomeworld) sphereClasses += ' homeworld';
            if (hasSite) sphereClasses += ' has-archaeology';

            html += `
                <div class="orbital-body"
                     data-planet-id="${planet.id}"
                     style="left: ${planetX}%; top: ${planetY}%;">
                    <div class="${sphereClasses}">
                        ${icons[planet.type] || '🌑'}
                    </div>
                    <div class="planet-tooltip">
                        <div class="planet-tooltip-name">${planet.name}</div>
                        <div class="planet-tooltip-type">
                            ${planet.type.replace('_', ' ')}
                            ${planet.habitable ? '(Habitable)' : ''}
                            ${isHomeworld ? '- HOMEWORLD' : ''}
                        </div>
                        ${visibility === 'scanned' || visibility === 'deep_scanned' ? `
                            <div class="planet-tooltip-resources">
                                <span>⚡${planet.resources.energy || 0}</span>
                                <span>⛏️${planet.resources.minerals || 0}</span>
                                <span>🔬${planet.resources.research || 0}</span>
                            </div>
                        ` : ''}
                        <div class="planet-tooltip-features">
                            ${isColonized ? '🏙️ Colonized' : ''}
                            ${hasSite ? '⚗ Archaeology Site' : ''}
                            ${planet.moon ? '🌙 Has Moon' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    goToHomeworld() {
        const homeworld = this.state.player.homeworld;
        if (homeworld) {
            this.openSystemView(homeworld.systemId);
            this.game.mapRenderer.centerOnSystem(homeworld.systemId);
        } else {
            // Fallback to first controlled system
            if (this.state.player.controlledSystems.length > 0) {
                this.openSystemView(this.state.player.controlledSystems[0]);
            }
        }
    }

    showPlanetDetails(systemId, planetId) {
        const system = this.state.getSystem(systemId);
        const planet = system?.planets.find(p => p.id === planetId);
        if (!planet) return;

        // Check if colonized - show colony view
        if (planet.colonized && planet.owner === 'player') {
            this.openColonyView(planet);
            return;
        }

        // Check for archaeology site
        if (planet.archaeologySite?.discovered && !planet.archaeologySite.completed) {
            this.showArchaeologyOptions(systemId, planetId);
            return;
        }

        // Show colonization option if habitable
        if (planet.habitable && !planet.colonized) {
            const canColonize = this.game.systems.colony.canColonize(systemId, planetId);
            if (canColonize.can) {
                if (confirm(`Colonize ${planet.name}? (200 minerals, 100 energy)`)) {
                    this.game.systems.colony.colonize(systemId, planetId);
                    this.updateAll();
                    this.openSystemView(systemId);
                }
            } else {
                alert(canColonize.reason);
            }
        }
    }

    showArchaeologyOptions(systemId, planetId) {
        const excavation = this.game.systems.archaeology.getExcavationProgress(systemId, planetId);

        if (excavation) {
            if (excavation.readyForChoice) {
                this.openArchaeologyView(systemId, planetId);
            } else {
                alert(`Excavation in progress: Layer ${excavation.currentLayer}/${excavation.totalLayers}`);
            }
        } else {
            if (confirm('Start excavation at this site?')) {
                this.game.systems.archaeology.startExcavation(systemId, planetId);
                this.updateAll();
            }
        }
    }

    openColonyView(planet) {
        const colony = this.game.systems.colony.findColonyByPlanetId(planet.id);
        if (!colony) return;

        const view = document.getElementById('colony-view');
        const nameEl = document.getElementById('colony-name');
        const content = document.getElementById('colony-view-content');

        nameEl.textContent = colony.name;

        const output = this.game.systems.colony.calculateColonyOutput(colony);
        const districtTypes = this.game.systems.colony.getDistrictTypes();
        const buildingTypes = this.game.systems.colony.getBuildingTypes();

        content.innerHTML = `
            <div class="colony-layout">
                <div class="colony-info">
                    <div class="colony-stats">
                        <div class="stat-box">
                            <div class="stat-label">Population</div>
                            <div class="stat-value">${colony.population.toFixed(1)}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Happiness</div>
                            <div class="stat-value">${Math.floor(colony.happiness * 100)}%</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Energy</div>
                            <div class="stat-value">${output.net.energy}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-label">Minerals</div>
                            <div class="stat-value">${output.net.minerals}</div>
                        </div>
                    </div>
                    <div class="districts-section">
                        <div class="section-title">Districts (${colony.districts.length}/${colony.maxDistricts})</div>
                        <div class="districts-grid">
                            ${colony.districts.map(d => {
                                const def = districtTypes[d.type];
                                return `
                                    <div class="district-slot">
                                        <span class="district-icon">${def?.icon || '📦'}</span>
                                        <div class="district-info">
                                            <div class="district-name">${def?.name || d.type}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            ${colony.districts.length < colony.maxDistricts ? `
                                <div class="district-slot empty" onclick="window.game.ui.showBuildDistrictDialog('${colony.id}')">
                                    + Build District
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="buildings-section">
                    <div class="section-title">Buildings</div>
                    <div class="buildings-grid">
                        ${colony.buildings.map((b, i) => {
                            if (b) {
                                const def = buildingTypes[b.type];
                                return `
                                    <div class="building-slot">
                                        <span class="building-icon">${def?.icon || '🏢'}</span>
                                        <div class="building-info">
                                            <div class="building-name">${def?.name || b.type}</div>
                                        </div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <div class="building-slot empty" onclick="window.game.ui.showBuildBuildingDialog('${colony.id}', ${i})">
                                        + Build
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        view.classList.remove('hidden');
    }

    showBuildDistrictDialog(colonyId) {
        const types = this.game.systems.colony.getDistrictTypes();
        const options = Object.entries(types).map(([key, def]) =>
            `${def.name} (${def.cost.minerals} minerals)`
        ).join('\n');

        const choice = prompt(`Select district to build:\n${options}\n\nEnter: mining, generator, research, or city`);
        if (choice && types[choice]) {
            const result = this.game.systems.colony.buildDistrict(colonyId, choice);
            if (result.success) {
                this.updateAll();
            } else {
                alert(result.reason);
            }
        }
    }

    showBuildBuildingDialog(colonyId, slotIndex) {
        const types = this.game.systems.colony.getBuildingTypes();
        const options = Object.entries(types).map(([key, def]) =>
            `${key}: ${def.name} (${def.cost.minerals}m, ${def.cost.energy || 0}e)`
        ).join('\n');

        const choice = prompt(`Select building:\n${options}\n\nEnter building key:`);
        if (choice && types[choice]) {
            const result = this.game.systems.colony.buildBuilding(colonyId, choice, slotIndex);
            if (result.success) {
                this.updateAll();
            } else {
                alert(result.reason);
            }
        }
    }

    openArchaeologyView(systemId, planetId) {
        const content = this.game.systems.archaeology.getCurrentLayerContent(systemId, planetId);
        if (!content) return;

        const view = document.getElementById('archaeology-view');
        const nameEl = document.getElementById('site-name');
        const contentEl = document.getElementById('archaeology-content');

        nameEl.textContent = content.siteName;

        contentEl.innerHTML = `
            <div class="excavation-progress">
                <span class="layer-indicator">Layer ${content.layerNumber}/${content.totalLayers}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(content.layerNumber / content.totalLayers) * 100}%"></div>
                </div>
            </div>
            <h3 style="color: var(--accent-cyan); margin-bottom: 16px;">${content.title}</h3>
            <div class="narrative-text">
                ${content.narrative.split('\n\n').map(p => `<p>${p}</p>`).join('')}
            </div>
            <div class="choice-buttons">
                ${content.choices.map((choice, i) => `
                    <button class="choice-btn" data-choice="${i}">
                        <div class="choice-title">${choice.text}</div>
                        ${choice.hint ? `<div class="choice-desc">${choice.hint}</div>` : ''}
                    </button>
                `).join('')}
            </div>
        `;

        view.classList.remove('hidden');

        // Setup choice handlers
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceIndex = parseInt(btn.dataset.choice);
                this.makeArchaeologyChoice(systemId, planetId, choiceIndex);
            });
        });
    }

    makeArchaeologyChoice(systemId, planetId, choiceIndex) {
        const result = this.game.systems.archaeology.makeChoice(systemId, planetId, choiceIndex);

        if (result.success) {
            if (result.excavationComplete) {
                alert('Excavation complete!');
                this.closeArchaeologyView();
            } else {
                // Check if next layer is ready
                const excavation = this.game.systems.archaeology.getExcavationProgress(systemId, planetId);
                if (excavation && !excavation.readyForChoice) {
                    alert('Layer complete. Continue excavation next turn.');
                    this.closeArchaeologyView();
                } else {
                    this.openArchaeologyView(systemId, planetId);
                }
            }
            this.updateAll();
        }
    }

    closeSystemView() {
        document.getElementById('system-view')?.classList.add('hidden');
    }

    closeColonyView() {
        document.getElementById('colony-view')?.classList.add('hidden');
    }

    closeArchaeologyView() {
        document.getElementById('archaeology-view')?.classList.add('hidden');
    }

    closeCombatModal() {
        document.getElementById('combat-modal')?.classList.add('hidden');
    }

    closeRightPanel() {
        document.getElementById('right-panel')?.classList.add('hidden');
    }

    showCombatResult(result) {
        const modal = document.getElementById('combat-modal');
        const content = document.getElementById('combat-content');

        content.innerHTML = `
            <div class="combat-sides">
                <div class="combat-side player">
                    <h3>Your Forces</h3>
                    <div class="fleet-strength">${result.playerStrength}</div>
                    <div class="losses-display">Lost: ${result.playerLosses.total} ships</div>
                </div>
                <div class="combat-vs">VS</div>
                <div class="combat-side enemy">
                    <h3>${this.state.ai.name}</h3>
                    <div class="fleet-strength">${result.aiStrength}</div>
                    <div class="losses-display">Lost: ${result.aiLosses.total} ships</div>
                </div>
            </div>
            <div class="combat-result ${result.winner === 'player' ? 'victory' : 'defeat'}">
                ${result.winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
            </div>
        `;

        modal.classList.remove('hidden');
    }

    showEventModal(event) {
        const modal = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
            <div class="event-modal">
                <h2 class="event-title">${event.title}</h2>
                <p class="event-description">${event.description}</p>
                <div class="event-choices">
                    ${event.choices.map((choice, i) => `
                        <button class="choice-btn" data-choice="${i}">
                            <div class="choice-title">${choice.text}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        document.querySelectorAll('.event-choices .choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceIndex = parseInt(btn.dataset.choice);
                const result = this.game.systems.events.resolveEvent(choiceIndex);

                if (result.success) {
                    content.innerHTML = `
                        <div class="event-modal">
                            <h2 class="event-title">${result.event.title}</h2>
                            <p class="event-description">${result.outcome}</p>
                            <button class="btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">
                                Continue
                            </button>
                        </div>
                    `;
                } else {
                    alert(result.reason);
                }
                this.updateAll();
            });
        });
    }

    showFleetActions(fleetId) {
        const fleet = this.state.getFleet(fleetId);
        if (!fleet) return;

        const system = this.state.getSystem(fleet.systemId);
        const visibility = this.state.getSystemVisibility(fleet.systemId);

        const actions = ['Move to system', 'Cancel'];

        if (fleet.ships.some(s => s.type === 'science')) {
            if (!this.state.player.scannedSystems.has(fleet.systemId)) {
                actions.unshift('Scan system');
            } else if (!this.state.player.deepScannedSystems.has(fleet.systemId)) {
                actions.unshift('Deep scan system');
            }
        }

        const choice = prompt(`Fleet ${fleet.name} at ${system.name}\n\nActions:\n${actions.join('\n')}\n\nEnter action:`);

        if (choice?.toLowerCase().includes('scan') && !choice.toLowerCase().includes('deep')) {
            this.game.systems.fleet.scanSystem(fleetId);
        } else if (choice?.toLowerCase().includes('deep')) {
            this.game.systems.fleet.deepScanSystem(fleetId);
        } else if (choice?.toLowerCase().includes('move')) {
            const dest = prompt('Enter destination system name:');
            if (dest) {
                const destSystem = this.state.galaxy.systems.find(s =>
                    s.name.toLowerCase() === dest.toLowerCase()
                );
                if (destSystem) {
                    this.game.systems.fleet.setDestination(fleetId, destSystem.id);
                } else {
                    alert('System not found');
                }
            }
        }

        this.updateAll();
    }

    showScanOptions(systemId) {
        alert('Send a fleet with a science vessel to this system to scan it.');
    }

    showSystemCodex(systemId) {
        const entries = this.game.systems.codex.getEntriesBySystem(systemId);
        if (entries.length > 0) {
            this.showCodexEntry(entries[0].id);
        }
    }
}

export default UIManager;
