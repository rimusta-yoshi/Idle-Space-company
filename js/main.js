// Main Entry Point
// Initialize and start the game

let game;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    log('DOM loaded, starting game...');

    // Create game instance
    game = new Game();

    // Try to load saved game
    const loaded = game.load();
    if (loaded) {
        log('Loaded existing save');
    } else {
        log('Starting new game');

        // Draw test shapes for Phase 1
        game.canvas.drawTestShapes();
    }

    // Start game loop
    game.start();

    // Auto-save every 30 seconds
    setInterval(() => {
        game.save();
    }, 30000);

    log('Game running! Drag buildings from the right sidebar onto the canvas.');
});

// Handle page unload (save before closing)
window.addEventListener('beforeunload', () => {
    if (game) {
        game.save();
    }
});

// Expose game to console for debugging
window.game = game;
