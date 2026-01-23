// Factory App Class
// Wraps the Idle Space Company game as a desktop application

class FactoryApp extends App {
    constructor() {
        super();
        this.id = 'factory';
        this.title = 'Factory Manager';
        this.icon = '🏭';
        this.game = null; // Game instance
        this.resizeObserver = null;
    }

    mount(contentElement) {
        if (this.game) {
            console.warn('Factory app already mounted, skipping');
            return;
        }

        console.log('Mounting factory app...');

        // Clone factory template
        const template = document.getElementById('factory-app-template');
        if (!template) {
            console.error('Factory app template not found!');
            return;
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        console.log('Template appended to contentElement');

        // Use setTimeout to ensure DOM is fully rendered before initializing game
        setTimeout(() => {
            console.log('Initializing game...');
            console.log('ContentElement:', contentElement);
            console.log('Canvas container exists:', contentElement.querySelector('#canvas-container'));

            // Initialize game (pass contentElement as root for DOM queries)
            this.game = new Game(contentElement);
            const loaded = this.game.load();
            if (!loaded) {
                log('Starting new factory game');
            } else {
                log('Loaded existing factory save');
            }
            this.game.start();

            // Setup resize observer for canvas
            this.resizeObserver = new ResizeObserver(() => {
                if (this.game && this.game.canvas) {
                    this.game.canvas.handleResize();
                }
            });
            this.resizeObserver.observe(contentElement);

            log('Factory app mounted');
        }, 0);
    }

    onResize(width, height) {
        // Canvas auto-resizes via ResizeObserver
        if (this.game && this.game.canvas) {
            this.game.canvas.handleResize();
        }
    }

    close() {
        if (this.game) {
            this.game.save();
            this.game.stop();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        log('Factory app closed');
    }

    getSaveData() {
        if (this.game) {
            return this.game.getSaveData();
        }
        return {};
    }

    loadSaveData(data) {
        if (this.game) {
            this.game.loadSaveData(data);
        }
    }
}
