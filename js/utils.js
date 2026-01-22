// Utility Functions

// Format numbers for display (1234 -> 1.23K)
function formatNumber(num) {
    if (num === Infinity) return '∞';
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(2) + 'B';
    return (num / 1000000000000).toFixed(2) + 'T';
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
