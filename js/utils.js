// Utility Functions

// Game balance constants
const UPGRADE_COST_EXPONENT = 1.5;   // Exponential cost curve for upgrades
const CAPACITY_UPGRADE_AMOUNT = 1000; // Storage added per capacity upgrade
const BASE_UPGRADE_COST = 100;        // Base credit cost for first upgrade

// Canvas constants
const GRID_SNAP = 50;   // Snap grid size (matches visual grid)


// Format numbers for display (1234 -> 1.23K)
function formatNumber(num) {
    if (num === Infinity) return '∞';
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(2) + 'B';
    return (num / 1000000000000).toFixed(2) + 'T';
}

// Format rate as per-minute for display
function formatRatePerMin(ratePerSec) {
    const perMin = ratePerSec * 60;
    return (Number.isInteger(perMin) ? perMin : perMin.toFixed(1)) + '/MIN';
}

// Format production rate for display
function formatRate(rate) {
    if (rate === 0) return '0.0/s';
    if (Math.abs(rate) < 0.01) return rate.toFixed(3) + '/s';
    if (Math.abs(rate) < 10) return rate.toFixed(2) + '/s';
    return formatNumber(rate) + '/s';
}

// Generate unique ID
function generateId() {
    return 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// Clamp value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Check if point is inside rectangle
function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Log with timestamp
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Throttle function - prevents excessive calls during drag/resize
// Returns a throttled version that only executes once per delay period
function throttle(func, delay) {
    let timeoutId = null;
    let lastExecTime = 0;

    return function(...args) {
        const currentTime = Date.now();

        if (currentTime - lastExecTime >= delay) {
            lastExecTime = currentTime;
            func.apply(this, args);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastExecTime = Date.now();
                func.apply(this, args);
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// Validate window position is on-screen
// Returns corrected position object
function validateWindowPosition(x, y, width, height) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - 40; // Minus taskbar
    const minVisiblePx = 50; // Minimum pixels that must be visible

    // Ensure at least minVisiblePx of window is visible
    const validX = clamp(x, -width + minVisiblePx, screenWidth - minVisiblePx);
    const validY = clamp(y, 0, screenHeight - minVisiblePx);

    // Ensure size constraints
    const validWidth = clamp(width, 400, screenWidth);
    const validHeight = clamp(height, 300, screenHeight);

    return {
        x: validX,
        y: validY,
        width: validWidth,
        height: validHeight
    };
}

// Show user notification (toast message)
// type: 'error', 'success', 'info'
function showUserNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `user-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation after a small delay
    setTimeout(() => notification.classList.add('visible'), 10);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
