// Logout App Class
// Desktop app for system controls, manual save, and logout functionality

class LogoutApp extends App {
    constructor() {
        super();
        this.id = 'logout';
        this.title = 'System';
        this.icon = '⚙️';
        this.sessionStartTime = Date.now();
        this.sessionInterval = null;
    }

    mount(contentElement) {
        contentElement.innerHTML = `
            <div class="logout-container">
                <div class="logout-header">
                    <h2>SYSTEM STATUS</h2>
                </div>

                <div class="logout-content">
                    <div class="system-info">
                        <p><strong>Status:</strong> <span class="status-online">ONLINE</span></p>
                        <p><strong>Session:</strong> <span id="session-time">00:00:00</span></p>
                        <p><strong>Auto-Save:</strong> <span class="status-online">ENABLED</span></p>
                    </div>

                    <div class="system-actions">
                        <button id="logout-btn" class="btn btn-primary">
                            🏠 RETURN TO MENU
                        </button>
                    </div>

                    <div class="system-info-text">
                        <p>Your progress is automatically saved.</p>
                    </div>
                </div>
            </div>
        `;

        // Setup event listeners
        this.setupButtons(contentElement);

        // Start session timer
        this.startSessionTimer(contentElement);
    }

    setupButtons(root) {
        const logoutBtn = root.querySelector('#logout-btn');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout(root);
            });
        }
    }

    logout(root) {
        // Auto-save before returning to menu
        if (window.desktop) {
            window.desktop.save();

            // Disable further saves to prevent throttled saves from overwriting
            window.desktop.savingEnabled = false;
        }

        // Close all windows (triggers cleanup, but saves are now disabled)
        if (window.desktop && window.desktop.windowManager) {
            const windows = [...window.desktop.windowManager.windows];
            windows.forEach(win => win.close());
        }

        // Return to boot screen (purely aesthetic)
        if (window.bootScreen) {
            window.bootScreen.returnToBootScreen();
        }

        log('Returned to main menu');
    }

    startSessionTimer(root) {
        const sessionEl = root.querySelector('#session-time');

        this.sessionInterval = setInterval(() => {
            if (!sessionEl) return;

            const elapsed = Date.now() - this.sessionStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            sessionEl.textContent = timeStr;
        }, 1000);
    }

    close() {
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
        }
        log('Logout app closed');
    }

    getSaveData() {
        // No persistent state for logout app
        return {};
    }

    loadSaveData(data) {
        // No persistent state to load
    }
}
