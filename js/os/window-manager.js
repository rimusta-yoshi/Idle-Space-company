// Window Manager Class
// Manages window lifecycle, focus, and z-index stacking

class WindowManager {
    constructor() {
        this.windows = [];
        this.container = document.getElementById('windows-container');
        this.nextZ = 100; // Z-index counter
    }

    createWindow(app, options = {}, desktop = null) {
        const window = new OSWindow(this, app, options, desktop);
        this.windows.push(window);
        this.container.appendChild(window.element);
        this.focusWindow(window);
        return window;
    }

    closeWindow(window) {
        const index = this.windows.indexOf(window);
        if (index > -1) {
            this.windows.splice(index, 1);
        }

        // Trigger save after window closes (if desktop reference exists)
        if (window.desktop) {
            window.desktop.throttledSave();
        }
    }

    focusWindow(window) {
        // Unfocus all
        this.windows.forEach(w => {
            w.element.style.zIndex = w.focused ? this.nextZ - 1 : 100;
            w.focused = false;
        });

        // Focus target
        window.element.style.zIndex = this.nextZ++;
        window.focused = true;
    }

    getSaveData() {
        return this.windows.map(w => w.getSaveData());
    }
}
