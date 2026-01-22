// Offline Progress Calculator
// Calculates production while player was away

class OfflineProgressCalculator {
    constructor(game) {
        this.game = game;
        this.MAX_OFFLINE_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    }

    // Calculate and apply offline progress
    calculateOfflineProgress(lastSaveTimestamp) {
        const now = Date.now();
        const timeAway = now - lastSaveTimestamp;

        // No offline progress if less than 1 minute away
        if (timeAway < 60 * 1000) {
            return null;
        }

        // Cap at max offline time
        const effectiveTime = Math.min(timeAway, this.MAX_OFFLINE_TIME);
        const seconds = effectiveTime / 1000;

        log(`Player was away for ${this.formatTime(timeAway)}, calculating ${this.formatTime(effectiveTime)} of production`);

        // Snapshot current production rates (already calculated from loaded buildings)
        const productionRates = {};
        Object.entries(this.game.resources.resources).forEach(([type, data]) => {
            productionRates[type] = data.production;
        });

        // Calculate total production for offline period
        const offlineGains = {};
        Object.entries(productionRates).forEach(([type, rate]) => {
            if (rate > 0) {
                const rawGain = rate * seconds;
                const capacity = this.game.resources.resources[type].capacity;
                const currentAmount = this.game.resources.resources[type].current;

                // Cap at capacity
                const maxGain = capacity === Infinity ? rawGain : Math.max(0, capacity - currentAmount);
                offlineGains[type] = Math.min(rawGain, maxGain);
            }
        });

        // Apply gains
        Object.entries(offlineGains).forEach(([type, amount]) => {
            if (amount > 0) {
                this.game.resources.add(type, amount);
            }
        });

        return {
            timeAway: timeAway,
            effectiveTime: effectiveTime,
            gains: offlineGains,
            capped: timeAway > this.MAX_OFFLINE_TIME
        };
    }

    // Format time in human-readable format
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Show offline progress notification to user
    showOfflineNotification(offlineData) {
        if (!offlineData) return;

        const timeAwayText = this.formatTime(offlineData.timeAway);
        const effectiveTimeText = this.formatTime(offlineData.effectiveTime);

        console.log('=== WELCOME BACK! ===');
        console.log(`You were away for ${timeAwayText}`);
        if (offlineData.capped) {
            console.log(`(Production calculated for ${effectiveTimeText} max)`);
        }
        console.log('Offline gains:');
        Object.entries(offlineData.gains).forEach(([type, amount]) => {
            if (amount > 0) {
                console.log(`  +${formatNumber(amount)} ${type}`);
            }
        });
        console.log('====================');

        // TODO: Show a nice UI notification instead of just console
        log(`Offline progress: ${effectiveTimeText} simulated`);
    }
}
