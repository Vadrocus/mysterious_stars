// SaveManager.js - Save/Load game state using localStorage/IndexedDB

export class SaveManager {
    constructor(gameState) {
        this.state = gameState;
        this.STORAGE_KEY = 'mysterious_stars_save';
        this.AUTOSAVE_KEY = 'mysterious_stars_autosave';
        this.SETTINGS_KEY = 'mysterious_stars_settings';
    }

    // Check if saves exist
    hasSavedGame() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== null ||
                localStorage.getItem(this.AUTOSAVE_KEY) !== null;
        } catch (e) {
            console.error('Error checking for saved game:', e);
            return false;
        }
    }

    // Get list of available saves
    getSaveList() {
        const saves = [];

        try {
            const mainSave = localStorage.getItem(this.STORAGE_KEY);
            if (mainSave) {
                const data = JSON.parse(mainSave);
                saves.push({
                    slot: 'manual',
                    name: 'Manual Save',
                    turn: data.turn,
                    timestamp: data.saveTimestamp,
                    playerSystems: data.player?.controlledSystems?.length || 0
                });
            }

            const autoSave = localStorage.getItem(this.AUTOSAVE_KEY);
            if (autoSave) {
                const data = JSON.parse(autoSave);
                saves.push({
                    slot: 'auto',
                    name: 'Autosave',
                    turn: data.turn,
                    timestamp: data.saveTimestamp,
                    playerSystems: data.player?.controlledSystems?.length || 0
                });
            }
        } catch (e) {
            console.error('Error reading save list:', e);
        }

        return saves;
    }

    // Save game
    save(slot = 'manual') {
        try {
            const saveData = this.state.serialize();
            const parsed = JSON.parse(saveData);
            parsed.saveTimestamp = Date.now();
            parsed.saveVersion = '1.0.0';

            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.STORAGE_KEY;
            localStorage.setItem(key, JSON.stringify(parsed));

            console.log(`Game saved to ${slot} slot`);
            return { success: true };
        } catch (e) {
            console.error('Error saving game:', e);
            return { success: false, error: e.message };
        }
    }

    // Auto-save (called at end of each turn)
    autoSave() {
        return this.save('auto');
    }

    // Load game
    load(slot = 'manual') {
        try {
            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.STORAGE_KEY;
            const saveData = localStorage.getItem(key);

            if (!saveData) {
                return { success: false, error: 'No save data found' };
            }

            this.state.deserialize(saveData);
            console.log(`Game loaded from ${slot} slot`);
            return { success: true };
        } catch (e) {
            console.error('Error loading game:', e);
            return { success: false, error: e.message };
        }
    }

    // Delete a save
    deleteSave(slot = 'manual') {
        try {
            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.STORAGE_KEY;
            localStorage.removeItem(key);
            return { success: true };
        } catch (e) {
            console.error('Error deleting save:', e);
            return { success: false, error: e.message };
        }
    }

    // Clear all saves
    clearAllSaves() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.AUTOSAVE_KEY);
            return { success: true };
        } catch (e) {
            console.error('Error clearing saves:', e);
            return { success: false, error: e.message };
        }
    }

    // Save settings (separate from game state)
    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return { success: true };
        } catch (e) {
            console.error('Error saving settings:', e);
            return { success: false, error: e.message };
        }
    }

    // Load settings
    loadSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (e) {
            console.error('Error loading settings:', e);
            return null;
        }
    }

    // Export save as downloadable file
    exportSave(slot = 'manual') {
        try {
            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.STORAGE_KEY;
            const saveData = localStorage.getItem(key);

            if (!saveData) {
                return { success: false, error: 'No save data found' };
            }

            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mysterious_stars_save_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (e) {
            console.error('Error exporting save:', e);
            return { success: false, error: e.message };
        }
    }

    // Import save from file
    importSave(fileContent, slot = 'manual') {
        try {
            // Validate the save data
            const data = JSON.parse(fileContent);

            if (!data.turn || !data.player || !data.galaxy) {
                return { success: false, error: 'Invalid save file format' };
            }

            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.STORAGE_KEY;
            localStorage.setItem(key, fileContent);

            return { success: true };
        } catch (e) {
            console.error('Error importing save:', e);
            return { success: false, error: e.message };
        }
    }

    // Calculate storage usage
    getStorageUsage() {
        try {
            let total = 0;

            const mainSave = localStorage.getItem(this.STORAGE_KEY);
            if (mainSave) total += mainSave.length;

            const autoSave = localStorage.getItem(this.AUTOSAVE_KEY);
            if (autoSave) total += autoSave.length;

            const settings = localStorage.getItem(this.SETTINGS_KEY);
            if (settings) total += settings.length;

            return {
                bytes: total,
                kilobytes: Math.round(total / 1024 * 100) / 100,
                megabytes: Math.round(total / 1024 / 1024 * 100) / 100
            };
        } catch (e) {
            return { bytes: 0, kilobytes: 0, megabytes: 0 };
        }
    }
}

export default SaveManager;
