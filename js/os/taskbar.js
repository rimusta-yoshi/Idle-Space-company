// Taskbar Class
// Manages the bottom taskbar with app launcher and system tray

class Taskbar {
    constructor(desktop) {
        this.desktop = desktop;
        this.element = document.getElementById('taskbar');
        this.clockElement = document.getElementById('system-clock');
        this.appMenuElement = null; // App launcher menu
        this.runningApps = new Map(); // Map of window.id -> button element
        this.initialize();
    }

    initialize() {
        // Setup start button
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => this.showAppLauncher());
        }

        // Start clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        log('Taskbar initialized');
    }

    showAppLauncher() {
        // Toggle menu if already showing
        if (this.appMenuElement?.style.display === 'block') {
            this.appMenuElement.style.display = 'none';
            return;
        }

        // Create menu if it doesn't exist
        if (!this.appMenuElement) {
            this.createAppMenu();
        }

        // Show menu
        this.appMenuElement.style.display = 'block';
    }

    createAppMenu() {
        this.appMenuElement = document.createElement('div');
        this.appMenuElement.className = 'app-menu';

        // List of available apps
        const apps = [
            { id: 'factory', name: 'OPERATIONS', icon: '🏭' },
            { id: 'warehouse', name: 'INVENTORY', icon: '📦' },
            { id: 'market', name: 'EXCHANGE', icon: '🏪' },
            { id: 'logout', name: 'SYSTEM', icon: '⚙️' }
        ];

        // Create menu items
        apps.forEach(app => {
            const item = document.createElement('div');
            item.className = 'app-menu-item';
            item.innerHTML = `<span class="app-menu-icon">${app.icon}</span> ${app.name}`;
            item.addEventListener('click', () => {
                this.desktop.launchApp(app.id);
                this.appMenuElement.style.display = 'none';
            });
            this.appMenuElement.appendChild(item);
        });

        // Append to body (positioned above taskbar)
        document.body.appendChild(this.appMenuElement);

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.appMenuElement &&
                !this.appMenuElement.contains(e.target) &&
                e.target.id !== 'start-button') {
                this.appMenuElement.style.display = 'none';
            }
        });
    }

    updateClock() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - startOfYear) / 86400000);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (this.clockElement) {
            this.clockElement.textContent = `CYCLE 8026.${String(dayOfYear).padStart(3, '0')} ${hours}:${minutes}`;
        }
    }

    addRunningApp(window) {
        // Create taskbar button for this window
        const appButton = document.createElement('div');
        appButton.className = 'taskbar-app-button';
        appButton.textContent = window.app.title;
        appButton.dataset.windowId = window.id;

        // Click to toggle minimize/restore
        appButton.addEventListener('click', () => {
            if (window.element.style.display === 'none') {
                window.restore();
            } else {
                window.minimize();
            }
        });

        // Insert before system tray
        const systemTray = document.getElementById('system-tray');
        if (systemTray && this.element) {
            this.element.insertBefore(appButton, systemTray);
        }

        // Track button
        this.runningApps.set(window.id, appButton);
    }

    removeRunningApp(window) {
        const button = this.runningApps.get(window.id);
        if (button) {
            button.remove();
            this.runningApps.delete(window.id);
        }
    }
}
