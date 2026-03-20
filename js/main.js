// Main Entry Point
// Initialize Boot Screen -> Desktop OS

// Check if all dependencies loaded
window.addEventListener('error', (e) => {
    log(`Resource loading error: ${e.filename || e.message}`);
});

// Initialize Boot Screen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check critical dependencies
    if (typeof Konva === 'undefined') {
        alert('Failed to load Konva library. Please check your internet connection and refresh.');
        throw new Error('CRITICAL: Konva library not loaded');
    }

    log('DOM loaded, starting Login Screen...');

    // Show login screen — boot sequence fires after operator authenticates
    const loginScreen = new LoginScreen();
    loginScreen.initialize();

    log('Login Screen ready.');
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
        throw new Error('Notification element not found');
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
