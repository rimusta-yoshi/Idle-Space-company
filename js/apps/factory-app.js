// Factory App Class
// Wraps the Idle Space Company game as a desktop application

class FactoryApp extends App {
    constructor() {
        super();
        this.id = 'factory';
        this.title = 'FRANCHISE OPERATIONS TERMINAL';
        this.icon = 'OP';
        this.game = null; // Game instance
        this.resizeObserver = null;
    }

    mount(contentElement) {
        if (this.game) {
            log('Factory app already mounted, skipping');
            return;
        }

        // Clone factory template
        const template = document.getElementById('factory-app-template');
        if (!template) {
            throw new Error('Factory app template not found');
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        // Initialize game (pass contentElement as root for DOM queries)
        this.game = new Game(contentElement);

        // Expose game instance globally for other apps to access
        window.gameInstance = this.game;

        // Load save data (synchronously available via SaveManager)
        let isNewGame = true;
        if (this.saveManager) {
            const savedData = this.saveManager.getAppData('factory');
            if (savedData) {
                this.game.load(savedData);
                isNewGame = false;
                log('Loaded existing factory save');
            }
        } else if (this.pendingSaveData) {
            this.game.load(this.pendingSaveData);
            isNewGame = false;
            log('Loaded existing factory save');
        }
        this.pendingSaveData = null;

        this.game.start();

        // Setup resize observer for canvas
        this.resizeObserver = new ResizeObserver(() => {
            if (this.game && this.game.canvas) {
                this.game.canvas.handleResize();
            }
        });
        this.resizeObserver.observe(contentElement);

        // Setup sidebar toggle button
        const toggleBtn = contentElement.querySelector('#sidebar-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const container = contentElement.querySelector('.factory-container');
                if (container) {
                    container.classList.toggle('sidebars-hidden');
                    // Trigger resize to recalculate canvas
                    if (this.game && this.game.canvas) {
                        setTimeout(() => this.game.canvas.handleResize(), 100);
                    }
                }
            });
        }

        log('Factory app mounted');
    }

    onResize(width) {
        // Canvas auto-resizes via ResizeObserver
        if (this.game && this.game.canvas) {
            this.game.canvas.handleResize();
        }

        // Add responsive mode classes based on window size
        if (this.game && this.game.rootElement) {
            const factoryContainer = this.game.rootElement.querySelector('.factory-container');
            if (factoryContainer) {
                // Remove all mode classes first
                factoryContainer.classList.remove('compact', 'tiny');

                // Add appropriate class based on width
                if (width < 500) {
                    factoryContainer.classList.add('tiny');
                } else if (width < 700) {
                    factoryContainer.classList.add('compact');
                }
            }
        }
    }

    close() {
        if (this.game) {
            this.game.stop();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        log('Factory app closed');
    }

    getSaveData() {
        if (!this.game) {
            return {};
        }

        return {
            version: 2,
            timestamp: Date.now(),
            resources: this.game.resources.getSaveData(),
            canvas: this.game.canvas.getSaveData(),
            buildingCounts: this.game.buildingCounts,
            franchise: this.game.getFranchiseSaveData()
        };
    }

    loadSaveData(data) {
        if (!data || Object.keys(data).length === 0) {
            return;
        }

        // Store the save data to be loaded after game is initialized
        this.pendingSaveData = data;
    }
}
