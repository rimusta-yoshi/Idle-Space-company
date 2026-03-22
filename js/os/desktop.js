// Desktop OS Class
// Main orchestrator for the virtual operating system

class DesktopOS {
    constructor(saveManager) {
        this.saveManager = saveManager; // Accept SaveManager instance
        this.windowManager = new WindowManager();
        this.taskbar = null;
        this.apps = {}; // Registered apps
        this.appData = {}; // Persistent app data (survives window closes)
        this.savingEnabled = true; // Flag to enable/disable saves

        // Create throttled save function (500ms delay)
        this.throttledSave = throttle(() => this.save(), 500);

        this.initialize();
    }

    initialize() {
        log('Desktop OS initializing...');

        // Load unlocked app state from save before anything else
        this.unlockedApps = this.saveManager.getUnlockedApps();

        // Initialize taskbar
        this.taskbar = new Taskbar(this);

        // Register available apps
        this.registerApp('factory', FactoryApp);
        this.registerApp('market', MarketApp);
        this.registerApp('warehouse', WarehouseApp);
        this.registerApp('franchise', FranchiseApp);
        this.registerApp('spaceport', SpaceportApp);
        this.registerApp('logout', LogoutApp);
        this.registerApp('comms', CommsApp);

        // Wire the always-visible comms taskbar icon
        const commsBtn = document.getElementById('comms-taskbar-btn');
        if (commsBtn) {
            commsBtn.addEventListener('click', () => this.launchApp('comms'));
        }

        // Apply initial desktop icon visibility
        this.applyAppVisibility();

        // Listen for in-game unlock events
        document.addEventListener('unlockApp', (e) => {
            this.unlockApp(e.detail.appId);
        });

        // Setup desktop icon clicks
        this.setupDesktopIcons();

        // Click desktop background to deselect windows
        const background = document.getElementById('desktop-background');
        background.addEventListener('click', (e) => {
            if (e.target === background) {
                // Clicked empty desktop - could deselect windows here
            }
        });

        log('Desktop OS initialized');
    }

    registerApp(id, AppClass) {
        this.apps[id] = AppClass;
        log(`App registered: ${id}`);
    }

    launchApp(appId, windowOptions = {}) {
        const AppClass = this.apps[appId];
        if (!AppClass) {
            throw new Error(`App not found: ${appId}`);
        }

        // Create app instance
        const app = new AppClass();

        // Inject SaveManager dependency
        app.saveManager = this.saveManager;

        // Load app data BEFORE mounting
        const appData = this.saveManager.getAppData(appId);
        if (appData) {
            app.loadSaveData(appData);
        }

        // Create window for app (pass desktop for save callback)
        const window = this.windowManager.createWindow(app, windowOptions, this);

        log(`App launched: ${appId}`);
        return window;
    }

    setupDesktopIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        icons.forEach(icon => {
            icon.addEventListener('click', () => {
                const appId = icon.getAttribute('data-app');
                if (appId) {
                    this.launchApp(appId);
                }
            });
        });
    }

    // Show/hide desktop icons based on current unlock state
    applyAppVisibility() {
        const locked = ['warehouse', 'market', 'spaceport'];
        locked.forEach(appId => {
            const icon = document.querySelector(`.desktop-icon[data-app="${appId}"]`);
            if (!icon) return;
            icon.style.display = this.unlockedApps[appId] ? '' : 'none';
        });
    }

    // Unlock an app: show its desktop icon and update save
    unlockApp(appId) {
        if (this.unlockedApps[appId]) return; // already unlocked

        this.unlockedApps = { ...this.unlockedApps, [appId]: true };

        // Show desktop icon
        const icon = document.querySelector(`.desktop-icon[data-app="${appId}"]`);
        if (icon) icon.style.display = '';

        // Invalidate app menu so it rebuilds with the new entry next open
        if (this.taskbar.appMenuElement) {
            this.taskbar.appMenuElement.remove();
            this.taskbar.appMenuElement = null;
        }

        appToast.show(appId);
        this.throttledSave();
        log(`App unlocked: ${appId}`);
    }

    save() {
        // Check if saving is enabled (can be disabled during logout)
        if (!this.savingEnabled) {
            log('Save skipped (saving disabled)');
            return;
        }

        // Update persistent appData from currently open windows
        this.updateAppData();

        const saveData = {
            windows: this.windowManager.getSaveData(),
            appData: this.appData,
            unlockedApps: this.unlockedApps
        };

        const success = this.saveManager.save(saveData);
        if (success) {
            log('Desktop OS saved');
        } else {
            throw new Error('Failed to save Desktop OS');
        }
    }

    updateAppData() {
        // Update appData from all currently open windows
        this.windowManager.windows.forEach(window => {
            if (window.app && typeof window.app.getSaveData === 'function') {
                const appData = window.app.getSaveData();
                if (appData && Object.keys(appData).length > 0) {
                    this.appData[window.app.id] = appData;
                }
            }
        });
    }

    getAppSaveData() {
        // Return persistent appData (updated by updateAppData)
        return this.appData;
    }

    load() {
        try {
            const windowsData = this.saveManager.getWindowsData();

            // Load persistent appData from save
            const savedAppData = this.saveManager.getAllAppData();
            if (savedAppData) {
                this.appData = savedAppData;
                log('Loaded persistent app data for:', Object.keys(this.appData).join(', '));
            }

            // Initialize comms manager with saved message state
            if (window.commsManager) {
                window.commsManager.loadSaveData(this.appData.comms);
            }

            // Restore windows
            if (windowsData && windowsData.length > 0) {
                windowsData.forEach(windowData => {
                    // Validate position before restoring
                    const validated = validateWindowPosition(
                        windowData.x,
                        windowData.y,
                        windowData.width,
                        windowData.height
                    );

                    const window = this.launchApp(windowData.appId, {
                        x: validated.x,
                        y: validated.y,
                        width: validated.width,
                        height: validated.height
                        // Always create as windowed, then maximize via toggleMaximize()
                    });

                    // Apply maximized state AFTER window creation
                    if (windowData.maximized && window) {
                        // Defer to next tick to ensure DOM is ready
                        setTimeout(() => window.toggleMaximize(), 0);
                    }
                });

                log('Desktop OS loaded');
                return true;
            }

            return false;
        } catch (e) {
            log(`Failed to load Desktop OS: ${e.message}`);
            // Don't fail completely - just start fresh
            return false;
        }
    }
}
