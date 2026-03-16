// Boot Screen Class
// STRATUM OS // FRANCHISE WORKSTATION INITIALISATION SEQUENCE
// Eliminates race conditions by loading data BEFORE desktop initialization

class BootScreen {
    constructor() {
        this.element = null;
        this.saveManager = null;
        this.desktop = null;
    }

    initialize() {
        this.element = document.getElementById('boot-screen');
        if (!this.element) {
            throw new Error('Boot screen element not found');
        }

        this.show();
        this.startGame();
    }

    show() {
        if (!this.element) return;
        this.element.style.display = 'flex';
        this.element.querySelector('.boot-content').innerHTML = this.getBootHTML();
    }

    hide() {
        if (!this.element) return;
        this.element.style.display = 'none';
    }

    getBootHTML() {
        const cycle = this.getCurrentCycle();
        return `
            <div class="boot-header">
                <div class="boot-wordmark">STRATUM</div>
                <div class="boot-wordmark-sub">GROUP</div>
                <div class="boot-divider-line"></div>
                <div class="boot-os-info">STRATUM OS &nbsp;//&nbsp; VERSION 4.2.1 &nbsp;//&nbsp; BUILD 8006.042 &nbsp;//&nbsp; FRANCHISE EDITION</div>
                <div class="boot-cycle-info">${cycle}</div>
            </div>
            <div class="boot-log-container">
                <div class="boot-log"></div>
            </div>
            <div class="boot-progress-section">
                <div class="loading-bar">
                    <div class="loading-progress"></div>
                    <div class="loading-bar-label">SYSTEM READY</div>
                </div>
                <p class="boot-status">INITIALIZING SYSTEM COMPONENTS...</p>
            </div>
            <div class="boot-footer">
                STRATUM GROUP CORP &copy; 8026 &nbsp;&nbsp;|&nbsp;&nbsp; ALL ACTIVITY MONITORED AND RECORDED FOR QUALITY ASSURANCE &nbsp;&nbsp;|&nbsp;&nbsp; SEE FRANCHISE AGREEMENT APPENDIX C
            </div>
        `;
    }

    getCurrentCycle() {
        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `CYCLE 8026.${String(dayOfYear).padStart(3, '0')} &nbsp;//&nbsp; ${h}:${m}:${s}`;
    }

    addLogLine(container, text, type = 'ok') {
        const line = document.createElement('div');
        line.className = `boot-log-line boot-log-${type}`;

        const status = document.createElement('span');
        status.className = 'log-status';

        if (type === 'ok') {
            status.textContent = '[  OK  ]';
        } else if (type === 'wait') {
            status.textContent = '[  ..  ]';
        } else if (type === 'warn') {
            status.textContent = '[ WARN ]';
        } else if (type === 'info') {
            status.textContent = '[      ]';
        }

        const msg = document.createElement('span');
        msg.className = 'log-msg';
        msg.textContent = '  ' + text;

        line.appendChild(status);
        line.appendChild(msg);
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    }

    async startGame() {
        await this.delay(300);

        const logContainer = this.element.querySelector('.boot-log');
        const progressBar = this.element.querySelector('.loading-progress');
        const statusLine = this.element.querySelector('.boot-status');

        const steps = [
            { type: 'ok',   msg: 'HARDWARE DIAGNOSTICS PASSED',                    progress: 8,  delay: 180 },
            { type: 'ok',   msg: 'MEMORY INTEGRITY VERIFIED',                       progress: 16, delay: 140 },
            { type: 'ok',   msg: 'STORAGE SUBSYSTEM MOUNTED',                       progress: 24, delay: 160 },
            { type: 'ok',   msg: 'FRANCHISE LICENSE AUTHENTICATED',                 progress: 33, delay: 220 },
            { type: 'wait', msg: 'CONTACTING STRATUM GROUP SERVERS...',             progress: 38, delay: 480 },
            { type: 'ok',   msg: 'SERVER HANDSHAKE COMPLETE — PING: 4,211ms',       progress: 48, delay: 160 },
            { type: 'ok',   msg: 'WORKSTATION PROFILE LOADED',                      progress: 57, delay: 180 },
            { type: 'ok',   msg: 'MANDATORY WELLNESS MODULE: ACTIVE',               progress: 63, delay: 140 },
            { type: 'ok',   msg: 'ROYALTY DEDUCTION MODULE: ACTIVE',                progress: 70, delay: 160 },
            { type: 'ok',   msg: 'PRODUCTIVITY MONITORING: ENABLED',                progress: 77, delay: 140 },
            { type: 'ok',   msg: 'COMPLIANCE PACKAGE v19.1 APPLIED',                progress: 84, delay: 180 },
            { type: 'ok',   msg: 'FRANCHISE OPERATIONS TERMINAL READY',             progress: 93, delay: 200 },
        ];

        try {
            for (const step of steps) {
                this.addLogLine(logContainer, step.msg, step.type);
                progressBar.style.width = step.progress + '%';
                await this.delay(step.delay);
            }

            this.saveManager = SaveManager.load();
            this.desktop = new DesktopOS(this.saveManager);
            window.desktop = this.desktop;

            progressBar.style.width = '100%';
            this.addLogLine(logContainer, 'OPERATIONS TERMINAL LAUNCHED', 'ok');
            statusLine.textContent = 'WELCOME, FRANCHISEE. GROWTH IS MANDATORY.';
            statusLine.classList.add('boot-status-complete');

            await this.delay(700);

            const loaded = this.desktop.load();
            if (!loaded) {
                this.desktop.launchApp('factory', {
                    x: 100,
                    y: 50,
                    width: 1000,
                    height: 700
                });
            }

            this.launchDesktop();

        } catch (e) {
            log(`Boot failed: ${e.message}`);
            this.addLogLine(logContainer, `BOOT ERROR: ${e.message}`, 'warn');
            await this.delay(500);
            this.launchDesktop();
        }
    }

    launchDesktop() {
        this.hide();
        const desktopEl = document.getElementById('desktop');
        if (desktopEl) {
            desktopEl.style.display = 'block';
        }
        log('Desktop launched!');
    }

    returnToBootScreen() {
        const desktopEl = document.getElementById('desktop');
        if (desktopEl) {
            desktopEl.style.display = 'none';
        }

        this.show();
        this.startGame();

        log('Returned to boot screen');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}