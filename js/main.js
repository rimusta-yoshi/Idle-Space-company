// Main Entry Point
// Initialize Desktop OS and launch apps

let desktop;

// Initialize Desktop OS when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    log('DOM loaded, starting Desktop OS...');

    // Create Desktop OS instance
    desktop = new DesktopOS();

    // Try to load saved desktop state
    const loaded = desktop.load();
    if (!loaded) {
        // No saved state - launch factory app by default
        log('No saved state, launching Factory Manager...');
        desktop.launchApp('factory', {
            x: 100,
            y: 50,
            width: 1000,
            height: 700
        });
    } else {
        log('Desktop state loaded from save');
    }

    log('Desktop OS running! Double-click icons to launch apps.');

    // Expose desktop to console for debugging
    window.desktop = desktop;

    // Debug helper functions
    window.debugDesktop = () => {
        console.log('=== DESKTOP DEBUG INFO ===');
        console.log('Windows open:', desktop.windowManager.windows.length);
        desktop.windowManager.windows.forEach(w => {
            console.log(`  - ${w.app.title} at (${w.x}, ${w.y}) size ${w.width}x${w.height}`);
        });
        console.log('Registered apps:', Object.keys(desktop.apps));
    };

    console.log('Debug helper loaded! Type debugDesktop() in console to see desktop state');
});

// Handle page unload (save before closing)
window.addEventListener('beforeunload', () => {
    if (desktop) {
        desktop.save();
    }
});
