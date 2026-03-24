// AppToast — queued unlock notification toasts
// Slides in from the right, auto-dismisses after 4s, one at a time.

const APP_TOAST_CONFIG = {
    market: {
        icon: 'EX',
        title: 'STRATUM.EXCHANGE',
        message: 'Market access granted.'
    },
    spaceport: {
        icon: 'SP',
        title: 'SPACEPORT CONTROL',
        message: 'Launch facility online.'
    }
};

const TOAST_DURATION_MS = 4000;
const TOAST_FADE_MS = 300;

class AppToast {
    constructor() {
        this._queue = [];
        this._active = false;
    }

    show(appId) {
        const config = APP_TOAST_CONFIG[appId];
        if (!config) return;
        this._queue.push(config);
        if (!this._active) this._next();
    }

    showRaw(config) {
        if (!config) return;
        this._queue.push(config);
        if (!this._active) this._next();
    }

    _next() {
        if (this._queue.length === 0) {
            this._active = false;
            return;
        }
        this._active = true;
        const config = this._queue.shift();
        this._render(config);
    }

    _render(config) {
        const el = document.createElement('div');
        el.className = 'app-toast';
        el.innerHTML = `
            <div class="app-toast-icon">${config.icon}</div>
            <div class="app-toast-body">
                <div class="app-toast-title">${config.title}</div>
                <div class="app-toast-message">${config.message}</div>
            </div>
        `;
        document.body.appendChild(el);

        // Trigger slide-in on next frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => el.classList.add('app-toast-visible'));
        });

        setTimeout(() => this._dismiss(el), TOAST_DURATION_MS);
    }

    _dismiss(el) {
        el.classList.remove('app-toast-visible');
        setTimeout(() => {
            el.remove();
            this._next();
        }, TOAST_FADE_MS);
    }
}

const appToast = new AppToast();
