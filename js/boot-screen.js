// Boot Screen Class
// Initial screen that loads saves and launches desktop
// Eliminates race conditions by loading data BEFORE desktop initialization

class BootScreen {
    constructor() {
        this.element = null;
        this.saveManager = null;
        this.desktop = null;
    }

    initialize() {
        this.element = document.getElementById('boot-screen');
        if (!this.element) {
            console.error('Boot screen element not found!');
            return;
        }

        this.show();

        // Auto-start after 2 seconds (purely aesthetic delay)
        setTimeout(() => this.startGame(), 2000);
    }

    show() {
        if (!this.element) return;

        this.element.style.display = 'flex';
        this.element.querySelector('.boot-content').innerHTML = this.getBootHTML();
    }

    hide() {
        if (!this.element) return;
        this.element.style.display = 'none';
    }

    getBootHTML() {
        return `
            <div class="boot-logo">🚀</div>
            <h1>IDLE SPACE COMPANY</h1>
            <p class="boot-subtitle">Remote Worker Terminal</p>
            <div class="boot-loading">
                <div class="loading-bar">
                    <div class="loading-progress"></div>
                </div>
                <p class="loading-text">Connecting to server...</p>
            </div>
        `;
    }

    async startGame() {
        const loadingText = this.element.querySelector('.loading-text');
        const progressBar = this.element.querySelector('.loading-progress');

        try {
            // Simple progress animation
            loadingText.textContent = 'Initializing...';
            progressBar.style.width = '50%';
            await this.delay(500);

            // Load save and create desktop
            this.saveManager = SaveManager.load();
            this.desktop = new DesktopOS(this.saveManager);
            window.desktop = this.desktop;

            progressBar.style.width = '100%';
            loadingText.textContent = 'Connected!';
            await this.delay(500);

            // Load desktop state
            const loaded = this.desktop.load();
            if (!loaded) {
                // No save - launch factory
                this.desktop.launchApp('factory', {
                    x: 100,
                    y: 50,
                    width: 1000,
                    height: 700
                });
            }

            // Launch desktop
            this.launchDesktop();

        } catch (e) {
            console.error('Boot failed:', e);
            // Still launch desktop even if error
            this.launchDesktop();
        }
    }

    launchDesktop() {
        this.hide();
        const desktopEl = document.getElementById('desktop');
        if (desktopEl) {
            desktopEl.style.display = 'block';
        }
        log('Desktop launched!');
    }

    returnToBootScreen() {
        // Called by Main Menu app
        const desktopEl = document.getElementById('desktop');
        if (desktopEl) {
            desktopEl.style.display = 'none';
        }

        this.show();

        // Auto-start after 2 seconds (aesthetic delay)
        setTimeout(() => this.startGame(), 2000);

        log('Returned to boot screen');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
