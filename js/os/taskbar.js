// Taskbar Class
// Manages the bottom taskbar with app launcher and system tray

class Taskbar {
    constructor(desktop) {
        this.desktop = desktop;
        this.element = document.getElementById('taskbar');
        this.clockElement = document.getElementById('system-clock');
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
        // For now, just launch factory app
        // TODO: Show proper app menu
        this.desktop.launchApp('factory');
    }

    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (this.clockElement) {
            this.clockElement.textContent = `${hours}:${minutes}`;
        }
    }

    addRunningApp(window) {
        // TODO: Add app icon to taskbar
        // Shows minimized apps, click to restore
    }

    removeRunningApp(window) {
        // TODO: Remove app icon from taskbar
    }
}
