// MapRenderer.js - Stellaris-style galaxy map rendering

export class MapRenderer {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = gameState;

        // Camera state
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.5,
            maxZoom: 2
        };

        // Interaction state
        this.hoveredSystem = null;
        this.selectedSystem = null;
        this.selectedFleet = null;

        // Visual settings
        this.colors = {
            background: '#050810',
            hyperlane: 'rgba(0, 212, 170, 0.3)',
            hyperlaneGlow: 'rgba(0, 212, 170, 0.1)',
            starYellow: '#f1c40f',
            starRed: '#e74c3c',
            starBlue: '#3498db',
            starWhite: '#ecf0f1',
            starOrange: '#e67e22',
            systemUnknown: '#2c3e50',
            systemVisited: '#5d6d7e',
            systemScanned: '#00bcd4',
            systemOwned: '#00d4aa',
            systemEnemy: '#e74c3c',
            fleetPlayer: '#00d4aa',
            fleetEnemy: '#e74c3c',
            selection: '#f1c40f',
            archaeology: '#9b59b6'
        };

        // Animation state
        this.animationFrame = 0;
        this.pulsePhase = 0;

        // Callbacks
        this.onSystemClick = null;
        this.onSystemHover = null;
        this.onFleetClick = null;
        this.onFleetMoveDestination = null;

        // Fleet move mode
        this.fleetMoveMode = false;
        this.movingFleet = null;

        this.setupEventListeners();
        this.resize();
    }

    setupEventListeners() {
        // Resize handling
        window.addEventListener('resize', () => this.resize());

        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        // Click is now handled via mouseup after checking for drag
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Pan with left click drag
        let isPanning = false;
        let lastPanX, lastPanY;
        let dragStartX, dragStartY;
        let hasDragged = false;

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isPanning = true;
                hasDragged = false;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = e.clientX - lastPanX;
                const dy = e.clientY - lastPanY;

                // Check if we've moved enough to count as a drag
                const totalDrag = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
                if (totalDrag > 5) {
                    hasDragged = true;
                }

                this.camera.x -= dx / this.camera.zoom;
                this.camera.y -= dy / this.camera.zoom;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isPanning && !hasDragged) {
                // This was a click, not a drag - handle it
                this.handleClickInternal(e);
            }
            isPanning = false;
            hasDragged = false;
        });

        // Store reference for internal click handling
        this.hasDragged = () => hasDragged;
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const y = (screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return { x, y };
    }

    worldToScreen(worldX, worldY) {
        const x = (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
        const y = (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
        return { x, y };
    }

    handleMouseMove(e) {
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        let foundSystem = null;

        for (const system of this.state.galaxy.systems) {
            const dist = Math.hypot(system.x - worldPos.x, system.y - worldPos.y);
            if (dist < 20 / this.camera.zoom) {
                foundSystem = system;
                break;
            }
        }

        if (foundSystem !== this.hoveredSystem) {
            this.hoveredSystem = foundSystem;
            if (this.onSystemHover) {
                this.onSystemHover(foundSystem);
            }
        }

        // Update cursor
        this.canvas.style.cursor = foundSystem ? 'pointer' : 'default';
    }

    handleClickInternal(e) {
        const worldPos = this.screenToWorld(e.clientX, e.clientY);

        // Check for system click first (prioritize opening systems)
        for (const system of this.state.galaxy.systems) {
            const dist = Math.hypot(system.x - worldPos.x, system.y - worldPos.y);
            if (dist < 25 / this.camera.zoom) {
                // If in fleet move mode, set destination instead of opening system
                if (this.fleetMoveMode && this.onFleetMoveDestination) {
                    this.onFleetMoveDestination(system.id);
                    return;
                }

                this.selectedSystem = system;
                this.selectedFleet = null;
                if (this.onSystemClick) {
                    this.onSystemClick(system);
                }
                return;
            }
        }

        // If in fleet move mode and clicked empty space, exit move mode
        if (this.fleetMoveMode) {
            return;
        }

        // Check for fleet click (only if not clicking on a system)
        for (const fleet of [...this.state.player.fleets, ...this.state.ai.fleets]) {
            const system = this.state.getSystem(fleet.systemId);
            if (system) {
                const fleetOffset = 25 / this.camera.zoom;
                const fleetX = system.x + (fleet.owner === 'player' ? fleetOffset : -fleetOffset);
                const fleetY = system.y - 10 / this.camera.zoom;
                const dist = Math.hypot(fleetX - worldPos.x, fleetY - worldPos.y);
                if (dist < 15 / this.camera.zoom) {
                    this.selectedFleet = fleet;
                    if (this.onFleetClick) {
                        this.onFleetClick(fleet);
                    }
                    return;
                }
            }
        }

        // Clicked empty space
        this.selectedSystem = null;
        this.selectedFleet = null;
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(
            this.camera.minZoom,
            Math.min(this.camera.maxZoom, this.camera.zoom * zoomFactor)
        );
    }

    zoomIn() {
        this.camera.zoom = Math.min(this.camera.maxZoom, this.camera.zoom * 1.2);
    }

    zoomOut() {
        this.camera.zoom = Math.max(this.camera.minZoom, this.camera.zoom / 1.2);
    }

    centerOnSystem(systemId) {
        const system = this.state.getSystem(systemId);
        if (system) {
            this.camera.x = system.x;
            this.camera.y = system.y;
        }
    }

    render() {
        this.animationFrame++;
        this.pulsePhase = (this.animationFrame % 120) / 120 * Math.PI * 2;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background with subtle star field
        this.drawBackground();

        // Draw hyperlanes
        this.drawHyperlanes();

        // Draw systems
        this.drawSystems();

        // Draw fleets
        this.drawFleets();

        // Draw selection indicators
        this.drawSelectionIndicators();

        // Draw hover tooltip
        this.drawHoverTooltip();

        // Request next frame
        requestAnimationFrame(() => this.render());
    }

    drawBackground() {
        const ctx = this.ctx;

        // Fill with dark space color
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw subtle star field
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 200; i++) {
            const x = (i * 173 + this.camera.x * 0.1) % this.canvas.width;
            const y = (i * 137 + this.camera.y * 0.1) % this.canvas.height;
            const size = (i % 3) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHyperlanes() {
        const ctx = this.ctx;

        for (const hyperlane of this.state.galaxy.hyperlanes) {
            const fromSystem = this.state.getSystem(hyperlane.from);
            const toSystem = this.state.getSystem(hyperlane.to);

            if (!fromSystem || !toSystem) continue;

            const fromPos = this.worldToScreen(fromSystem.x, fromSystem.y);
            const toPos = this.worldToScreen(toSystem.x, toSystem.y);

            // Check if both systems are visible (fog of war)
            const fromVisible = this.state.player.knownSystems.has(fromSystem.id);
            const toVisible = this.state.player.knownSystems.has(toSystem.id);

            if (!fromVisible && !toVisible) continue;

            // Draw glow
            ctx.strokeStyle = this.colors.hyperlaneGlow;
            ctx.lineWidth = 8 * this.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();

            // Draw main line
            ctx.strokeStyle = this.colors.hyperlane;
            ctx.lineWidth = 2 * this.camera.zoom;
            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();
        }
    }

    drawSystems() {
        const ctx = this.ctx;

        for (const system of this.state.galaxy.systems) {
            const visibility = this.state.getSystemVisibility(system.id);
            const controller = this.state.getSystemController(system.id);
            const pos = this.worldToScreen(system.x, system.y);

            // Skip completely unknown systems unless adjacent to known
            if (visibility === 'unknown') {
                const isAdjacent = this.state.galaxy.hyperlanes.some(h => {
                    const otherId = h.from === system.id ? h.to : (h.to === system.id ? h.from : null);
                    return otherId && this.state.player.knownSystems.has(otherId);
                });
                if (!isAdjacent) continue;

                // Draw as fog of war indicator
                ctx.fillStyle = this.colors.systemUnknown;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6 * this.camera.zoom, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }

            // Determine star color based on type
            let starColor;
            switch (system.starType) {
                case 'yellow': starColor = this.colors.starYellow; break;
                case 'red': starColor = this.colors.starRed; break;
                case 'blue': starColor = this.colors.starBlue; break;
                case 'white': starColor = this.colors.starWhite; break;
                case 'orange': starColor = this.colors.starOrange; break;
                default: starColor = this.colors.starYellow;
            }

            // Draw star glow
            const glowSize = 20 * this.camera.zoom;
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, glowSize
            );
            gradient.addColorStop(0, starColor);
            gradient.addColorStop(0.3, starColor.replace(')', ', 0.5)').replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw star core
            ctx.fillStyle = starColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8 * this.camera.zoom, 0, Math.PI * 2);
            ctx.fill();

            // Draw control indicator
            if (controller) {
                ctx.strokeStyle = controller === 'player' ? this.colors.systemOwned : this.colors.systemEnemy;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 14 * this.camera.zoom, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw archaeology indicator if deep scanned and has site
            if (visibility === 'deep_scanned' || visibility === 'scanned') {
                const hasSite = system.planets.some(p => p.archaeologySite && !p.archaeologySite.completed);
                if (hasSite) {
                    const pulseSize = 1 + Math.sin(this.pulsePhase) * 0.2;
                    ctx.strokeStyle = this.colors.archaeology;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 18 * this.camera.zoom * pulseSize, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            // Draw system name
            if (this.camera.zoom > 0.7) {
                ctx.fillStyle = '#95a5a6';
                ctx.font = `${10 * this.camera.zoom}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText(system.name, pos.x, pos.y + 22 * this.camera.zoom);
            }
        }
    }

    drawFleets() {
        const ctx = this.ctx;

        // Group fleets by system
        const fleetsBySystem = new Map();

        for (const fleet of this.state.player.fleets) {
            if (!fleetsBySystem.has(fleet.systemId)) {
                fleetsBySystem.set(fleet.systemId, { player: [], ai: [] });
            }
            fleetsBySystem.get(fleet.systemId).player.push(fleet);
        }

        for (const fleet of this.state.ai.fleets) {
            // Only show AI fleets in systems player has visibility
            const visibility = this.state.getSystemVisibility(fleet.systemId);
            if (visibility === 'unknown') continue;

            if (!fleetsBySystem.has(fleet.systemId)) {
                fleetsBySystem.set(fleet.systemId, { player: [], ai: [] });
            }
            fleetsBySystem.get(fleet.systemId).ai.push(fleet);
        }

        for (const [systemId, fleets] of fleetsBySystem) {
            const system = this.state.getSystem(systemId);
            if (!system) continue;

            const basePos = this.worldToScreen(system.x, system.y);
            let offset = 0;

            // Draw player fleets
            for (const fleet of fleets.player) {
                const pos = {
                    x: basePos.x + 25 * this.camera.zoom,
                    y: basePos.y - 10 * this.camera.zoom + offset
                };

                this.drawFleetIcon(pos, fleet, 'player');
                offset += 15 * this.camera.zoom;
            }

            // Draw AI fleets
            offset = 0;
            for (const fleet of fleets.ai) {
                const pos = {
                    x: basePos.x - 25 * this.camera.zoom,
                    y: basePos.y - 10 * this.camera.zoom + offset
                };

                this.drawFleetIcon(pos, fleet, 'ai');
                offset += 15 * this.camera.zoom;
            }
        }
    }

    drawFleetIcon(pos, fleet, owner) {
        const ctx = this.ctx;
        const color = owner === 'player' ? this.colors.fleetPlayer : this.colors.fleetEnemy;
        const size = 10 * this.camera.zoom;

        // Draw fleet triangle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - size);
        ctx.lineTo(pos.x - size * 0.7, pos.y + size * 0.5);
        ctx.lineTo(pos.x + size * 0.7, pos.y + size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Draw selection indicator if selected
        if (this.selectedFleet && this.selectedFleet.id === fleet.id) {
            ctx.strokeStyle = this.colors.selection;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw ship count
        if (this.camera.zoom > 0.8) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${8 * this.camera.zoom}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.fillText(fleet.ships.length.toString(), pos.x, pos.y + size * 1.5);
        }
    }

    drawSelectionIndicators() {
        const ctx = this.ctx;

        // Draw fleet move mode indicator
        if (this.fleetMoveMode && this.movingFleet) {
            const fleet = this.movingFleet;
            const fleetSystem = this.state.getSystem(fleet.systemId);
            if (fleetSystem) {
                const fleetPos = this.worldToScreen(fleetSystem.x, fleetSystem.y);

                // Highlight all reachable systems
                for (const system of this.state.galaxy.systems) {
                    if (this.state.player.knownSystems.has(system.id)) {
                        const pos = this.worldToScreen(system.x, system.y);
                        const pulseSize = 1 + Math.sin(this.pulsePhase * 3) * 0.15;

                        ctx.strokeStyle = 'rgba(0, 212, 170, 0.4)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 20 * this.camera.zoom * pulseSize, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }

                // Draw "select destination" text
                ctx.fillStyle = '#00d4aa';
                ctx.font = `${12}px "Segoe UI"`;
                ctx.textAlign = 'center';
                ctx.fillText('Click a system to set destination', this.canvas.width / 2, 60);
            }
        }

        // Draw paths for all fleets with destinations
        for (const fleet of this.state.player.fleets) {
            if (fleet.destination) {
                const startSystem = this.state.getSystem(fleet.systemId);
                const destSystem = this.state.getSystem(fleet.destination);
                if (startSystem && destSystem) {
                    const startPos = this.worldToScreen(startSystem.x, startSystem.y);
                    const endPos = this.worldToScreen(destSystem.x, destSystem.y);

                    ctx.strokeStyle = this.colors.fleetPlayer;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);
                    ctx.beginPath();
                    ctx.moveTo(startPos.x, startPos.y);
                    ctx.lineTo(endPos.x, endPos.y);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Draw arrow at destination
                    const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
                    const arrowSize = 10;
                    ctx.fillStyle = this.colors.fleetPlayer;
                    ctx.beginPath();
                    ctx.moveTo(endPos.x, endPos.y);
                    ctx.lineTo(
                        endPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
                        endPos.y - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.lineTo(
                        endPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
                        endPos.y - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        if (!this.selectedSystem) return;

        const pos = this.worldToScreen(this.selectedSystem.x, this.selectedSystem.y);
        const pulseSize = 1 + Math.sin(this.pulsePhase * 2) * 0.1;

        ctx.strokeStyle = this.colors.selection;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 25 * this.camera.zoom * pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw move path if fleet is selected
        if (this.selectedFleet && this.selectedFleet.destination) {
            const destSystem = this.state.getSystem(this.selectedFleet.destination);
            if (destSystem) {
                const startSystem = this.state.getSystem(this.selectedFleet.systemId);
                const startPos = this.worldToScreen(startSystem.x, startSystem.y);
                const endPos = this.worldToScreen(destSystem.x, destSystem.y);

                ctx.strokeStyle = this.colors.fleetPlayer;
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(endPos.x, endPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    drawHoverTooltip() {
        if (!this.hoveredSystem) return;

        const ctx = this.ctx;
        const system = this.hoveredSystem;
        const visibility = this.state.getSystemVisibility(system.id);
        const pos = this.worldToScreen(system.x, system.y);

        const tooltipX = pos.x + 30;
        const tooltipY = pos.y - 20;
        const padding = 10;

        let lines = [system.name];

        if (visibility !== 'unknown') {
            lines.push(`Star: ${system.starType.charAt(0).toUpperCase() + system.starType.slice(1)}`);
            lines.push(`Planets: ${system.planets.length}`);
        }

        if (visibility === 'scanned' || visibility === 'deep_scanned') {
            const habitable = system.planets.filter(p => p.habitable).length;
            lines.push(`Habitable: ${habitable}`);

            const hasSite = system.planets.some(p => p.archaeologySite);
            if (hasSite) {
                lines.push('⚗ Archaeology site detected');
            }
        }

        // Calculate tooltip dimensions
        ctx.font = '12px "Segoe UI"';
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const height = lines.length * 18 + padding * 2;

        // Draw tooltip background
        ctx.fillStyle = 'rgba(13, 18, 25, 0.95)';
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, maxWidth + padding * 2, height, 4);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#00d4aa';
        ctx.fillText(lines[0], tooltipX + padding, tooltipY + padding + 12);

        ctx.fillStyle = '#95a5a6';
        for (let i = 1; i < lines.length; i++) {
            ctx.fillText(lines[i], tooltipX + padding, tooltipY + padding + 12 + i * 18);
        }
    }
}

export default MapRenderer;
