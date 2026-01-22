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

    // Expose game to console for debugging
    window.game = game;

    // Debug helper functions
    window.debugGame = () => {
        console.log('=== GAME DEBUG INFO ===');
        console.log('Running:', game.running);
        console.log('Frame count:', game.frameCount);
        console.log('Nodes on canvas:', game.canvas.nodes.length);
        game.canvas.nodes.forEach(node => {
            console.log(`  - ${node.buildingDef?.name || 'UNKNOWN'} at (${node.x.toFixed(0)}, ${node.y.toFixed(0)}) level ${node.level}`);
        });
        console.log('Resources:');
        Object.entries(game.resources.resources).forEach(([type, data]) => {
            console.log(`  - ${type}: ${data.current.toFixed(2)} / ${data.capacity} (production: ${data.production.toFixed(3)}/s)`);
        });
        console.log('Building counts:', game.buildingCounts);
    };

    console.log('Debug helper loaded! Type debugGame() in console to see game state');
});

// Handle page unload (save before closing)
window.addEventListener('beforeunload', () => {
    if (game) {
        game.save();
    }
});
