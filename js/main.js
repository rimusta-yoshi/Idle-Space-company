// Main Entry Point
// Initialize Boot Screen -> Desktop OS

// Initialize Boot Screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    log('DOM loaded, starting Boot Screen...');

    // Create and initialize boot screen
    window.bootScreen = new BootScreen();
    window.bootScreen.initialize();

    // Check for first-launch notification (after desktop boots)
    // This will be called by BootScreen after desktop launches
    setTimeout(() => {
        if (window.desktop) {
            checkFirstLaunch();
        }
    }, 1000);

    // Debug helper functions
    window.debugDesktop = () => {
        if (!window.desktop) {
            console.log('Desktop not initialized yet');
            return;
        }
        console.log('=== DESKTOP DEBUG INFO ===');
        console.log('Windows open:', window.desktop.windowManager.windows.length);
        window.desktop.windowManager.windows.forEach(w => {
            console.log(`  - ${w.app.title} at (${w.x}, ${w.y}) size ${w.width}x${w.height}`);
        });
        console.log('Registered apps:', Object.keys(window.desktop.apps));
    };

    // Helper to reset notification for testing
    window.resetNotification = () => {
        localStorage.removeItem('market_migration_v2');
        console.log('Notification flag reset - refresh page to see it again');
    };

    console.log('Debug helpers loaded!');
    console.log('  - debugDesktop() - Show desktop state');
    console.log('  - resetNotification() - Reset Mr. Business notification');
    console.log('Boot Screen ready! Click START to begin.');
});

// Handle page unload (save before closing)
window.addEventListener('beforeunload', () => {
    if (window.desktop) {
        window.desktop.save();
    }
});

// Check if this is first launch and show Mr. Business notification
function checkFirstLaunch() {
    const hasSeenNotification = localStorage.getItem('market_migration_v2');

    if (!hasSeenNotification) {
        // Show notification after a short delay to ensure everything is loaded
        setTimeout(() => {
            showNotification();
            // Don't mark as seen until user closes it
        }, 1500);
    }
}

// Show Mr. Business notification
function showNotification() {
    const notification = document.getElementById('mr-business-notification');
    if (!notification) {
        console.error('Notification element not found!');
        return;
    }

    notification.style.display = 'flex';

    // Setup close button
    const closeBtn = document.getElementById('notification-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            notification.style.display = 'none';
            // Mark as seen when user closes it
            localStorage.setItem('market_migration_v2', 'true');
            log('Mr. Business notification closed');
        };
    }

    // Allow clicking overlay to close
    const overlay = notification.querySelector('.notification-overlay');
    if (overlay) {
        overlay.onclick = () => {
            notification.style.display = 'none';
            // Mark as seen when user closes it
            localStorage.setItem('market_migration_v2', 'true');
            log('Mr. Business notification closed');
        };
    }

    log('Mr. Business notification shown');
}
