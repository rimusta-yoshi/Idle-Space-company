// Desktop OS Class
// Main orchestrator for the virtual operating system

class DesktopOS {
    constructor() {
        this.windowManager = new WindowManager();
        this.taskbar = null;
        this.apps = {}; // Registered apps
        this.initialize();
    }

    initialize() {
        log('Desktop OS initializing...');

        // Initialize taskbar
        this.taskbar = new Taskbar(this);

        // Register available apps
        this.registerApp('factory', FactoryApp);

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
            console.error(`App not found: ${appId}`);
            return null;
        }

        // Create app instance
        const app = new AppClass();

        // Create window for app
        const window = this.windowManager.createWindow(app, windowOptions);

        log(`App launched: ${appId}`);
        return window;
    }

    setupDesktopIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        icons.forEach(icon => {
            icon.addEventListener('dblclick', () => {
                const appId = icon.getAttribute('data-app');
                if (appId) {
                    this.launchApp(appId);
                }
            });
        });
    }

    save() {
        const saveData = {
            version: 1,
            timestamp: Date.now(),
            windows: this.windowManager.getSaveData()
        };

        try {
            localStorage.setItem('desktopOS_save', JSON.stringify(saveData));
            log('Desktop OS saved');
        } catch (e) {
            console.error('Failed to save Desktop OS:', e);
        }
    }

    load() {
        try {
            const saveData = localStorage.getItem('desktopOS_save');
            if (!saveData) {
                return false;
            }

            const data = JSON.parse(saveData);

            // Restore windows
            if (data.windows && data.windows.length > 0) {
                data.windows.forEach(windowData => {
                    this.launchApp(windowData.appId, {
                        x: windowData.x,
                        y: windowData.y,
                        width: windowData.width,
                        height: windowData.height
                    });
                });
            }

            log('Desktop OS loaded');
            return true;
        } catch (e) {
            console.error('Failed to load Desktop OS:', e);
            return false;
        }
    }
}
