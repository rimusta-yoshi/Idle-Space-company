// Login Screen
// STRATUM GROUP // FRANCHISE WORKSTATION // SECURE OPERATOR LOGIN
// NOTE: FACTORY RESET button is a testing tool — hide or remove before full public release.

class LoginScreen {
    constructor() {
        this.element = null;
        this._resetPending = false;
    }

    initialize() {
        this.element = document.getElementById('login-screen');
        if (!this.element) {
            throw new Error('Login screen element not found');
        }
        this.render();
    }

    render() {
        const content = this.element.querySelector('.login-content');
        content.innerHTML = this.getLoginHTML();
        this.bindEvents();
    }

    getLoginHTML() {
        return `
            <div class="login-header">
                <div class="login-wordmark">STRATUM</div>
                <div class="login-wordmark-sub">GROUP</div>
                <div class="login-divider-line"></div>
                <div class="login-os-info">FRANCHISE WORKSTATION // OPERATOR LOGIN TERMINAL</div>
            </div>
            <div class="login-form">
                <div class="login-field">
                    <label class="login-label">OPERATOR ID</label>
                    <input type="text" class="login-input login-input-readonly" id="login-username"
                        value="OPERATOR-7741" readonly autocomplete="off" spellcheck="false" />
                </div>
                <div class="login-field">
                    <label class="login-label">PASSPHRASE</label>
                    <input type="password" class="login-input" id="login-password"
                        placeholder="_ _ _ _ _ _ _ _" autocomplete="off" />
                </div>
                <button class="login-btn" id="login-btn">LOGIN</button>
            </div>
            <div class="login-footer-area">
                <div class="login-legal">ALL ACCESS ATTEMPTS ARE LOGGED AND MONITORED &nbsp;|&nbsp; STRATUM GROUP CORP &copy; 8026</div>
                <button class="login-reset-btn" id="factory-reset-btn" title="Wipe save data">FACTORY RESET</button>
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());

        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('factory-reset-btn').addEventListener('click', () => this.handleFactoryReset());
    }

    handleLogin() {
        this.hide();
        const bootScreen = new BootScreen();
        window.bootScreen = bootScreen;
        bootScreen.initialize();
    }

    handleFactoryReset() {
        const resetBtn = document.getElementById('factory-reset-btn');
        if (!this._resetPending) {
            this._resetPending = true;
            resetBtn.textContent = 'CONFIRM RESET?';
            resetBtn.classList.add('login-reset-btn-confirm');

            setTimeout(() => {
                if (this._resetPending) {
                    this._resetPending = false;
                    resetBtn.textContent = 'FACTORY RESET';
                    resetBtn.classList.remove('login-reset-btn-confirm');
                }
            }, 3000);
        } else {
            localStorage.clear();
            location.reload();
        }
    }

    hide() {
        if (this.element) this.element.style.display = 'none';
    }
}
