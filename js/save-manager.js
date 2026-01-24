// Save Manager Class
// Single source of truth for all save/load operations
// Handles localStorage persistence and data migration

class SaveManager {
    constructor(initialData = null) {
        this.data = initialData || this.getDefaultData();
        this.saveKey = 'desktopOS_save';
        this.legacyKey = 'idleSpaceCompany_save';
    }

    getDefaultData() {
        return {
            version: 2,
            timestamp: Date.now(),
            windows: [],
            appData: {}
        };
    }

    // Static method to load save from localStorage
    static load() {
        try {
            // Try current save format
            const saveData = localStorage.getItem('desktopOS_save');
            if (saveData) {
                const data = JSON.parse(saveData);
                log('Loaded save from desktopOS_save');
                return new SaveManager(data);
            }

            // Try legacy format (migration)
            const legacyData = localStorage.getItem('idleSpaceCompany_save');
            if (legacyData) {
                log('Found legacy save, migrating...');
                const migrated = SaveManager.migrateLegacySave(legacyData);
                const manager = new SaveManager(migrated);
                // Save in new format
                manager.save(migrated);
                log('Legacy save migrated successfully');
                return manager;
            }

            // No save found - new game
            log('No save found, starting fresh');
            return new SaveManager();
        } catch (e) {
            console.error('Failed to load save:', e);
            log('Error loading save, starting fresh');
            return new SaveManager(); // Fresh start on error
        }
    }

    // Migrate old save format to new format
    static migrateLegacySave(legacyDataStr) {
        const legacy = JSON.parse(legacyDataStr);

        // Remove market buildings from old saves (if present)
        if (legacy.canvas && legacy.canvas.nodes) {
            const beforeCount = legacy.canvas.nodes.length;
            legacy.canvas.nodes = legacy.canvas.nodes.filter(node =>
                node.buildingType !== 'market'
            );
            const removed = beforeCount - legacy.canvas.nodes.length;
            if (removed > 0) {
                log(`Migration: Removed ${removed} market building(s)`);
            }

            // Clean up connections involving removed nodes
            if (legacy.canvas.connections) {
                const nodeIds = new Set(legacy.canvas.nodes.map(n => n.id));
                const beforeConnCount = legacy.canvas.connections.length;
                legacy.canvas.connections = legacy.canvas.connections.filter(conn =>
                    nodeIds.has(conn.fromNodeId) && nodeIds.has(conn.toNodeId)
                );
                const removedConns = beforeConnCount - legacy.canvas.connections.length;
                if (removedConns > 0) {
                    log(`Migration: Removed ${removedConns} connection(s) to market buildings`);
                }
            }
        }

        return {
            version: 2,
            timestamp: legacy.timestamp || Date.now(),
            windows: [], // No windows in old saves
            appData: {
                factory: {
                    version: legacy.version,
                    timestamp: legacy.timestamp,
                    resources: legacy.resources,
                    canvas: legacy.canvas,
                    buildingCounts: legacy.buildingCounts
                }
            }
        };
    }

    // Save data to localStorage
    save(updateData) {
        // Merge update into current data (immutable pattern)
        this.data = {
            ...this.data,
            ...updateData,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.saveKey, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('Failed to save:', e);
            return false;
        }
    }

    // Get window positions and states
    getWindowsData() {
        return this.data.windows || [];
    }

    // Get specific app's save data
    getAppData(appId) {
        return this.data.appData?.[appId] || null;
    }

    // Get all app data
    getAllAppData() {
        return this.data.appData || {};
    }

    // Check if save has any data
    hasSaveData() {
        return this.data.windows.length > 0 ||
               Object.keys(this.data.appData).length > 0;
    }

    // Get save timestamp
    getTimestamp() {
        return this.data.timestamp;
    }

    // Get save version
    getVersion() {
        return this.data.version;
    }
}
