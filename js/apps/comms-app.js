// STRATUM Comms App — Corporate inbox for STRATUM messages
// CommsManager handles state; CommsApp handles rendering.

// ── Message definitions (static content) ────────────────────────────────────

const COMMS_MESSAGES = [
    {
        id: 'welcome',
        sender: 'STRATUM LIAISON',
        subject: 'Operational License Confirmed — Sector Alpha-1',
        body: 'Welcome to the STRATUM franchise network, Operator. Your provisional license for Sector Alpha-1 has been approved. Equipment package has been delivered to your site. Your obligation is straightforward: begin production and demonstrate operational viability. We will be in touch. — Liaison Voss, STRATUM Regional Operations'
    },
    {
        id: 'first_ore',
        sender: 'STRATUM COMPLIANCE',
        subject: 'Extraction Activity Detected — Reference RX-7',
        body: 'Our systems have logged your first extraction event. All materials recovered on STRATUM-licensed territory are subject to resource tracking protocol RX-7. Ensure your production data remains accurate. Discrepancies are flagged automatically. — STRATUM Compliance Division'
    },
    {
        id: 'first_sale',
        sender: 'STRATUM ACCOUNTS',
        subject: 'First Credit Transaction Recorded',
        body: 'Your first trade has been logged. A reminder that all earnings within STRATUM franchise territory are currently subject to a 0% network commission during your provisional period. This rate is subject to review. Produce more. — STRATUM Accounts'
    },
    {
        id: 'credits_100',
        sender: 'STRATUM LIAISON',
        subject: 'Early Performance Note',
        body: "You've cleared 100 credits. Most new operators stall here. Don't. Tier advancement review opens at 500cr. We'd prefer not to reassign this sector. — Liaison Voss"
    },
    {
        id: 'credits_250',
        sender: 'STRATUM GROUP NEWS',
        subject: 'Sector Alpha Operational Bulletin',
        body: 'STRATUM Group is pleased to report above-projection yields across Sector Alpha this quarter. New operators are encouraged to scale throughput in line with network demand. The franchise grows. You grow with it. — STRATUM Group Communications'
    },
    {
        id: 'tier_1',
        sender: 'STRATUM LIAISON',
        subject: 'Tier 1 Status Approved — OPERATOR',
        body: 'Your application for Tier 1 OPERATOR status has been reviewed and approved. One assembler unit has been cleared for your operation. Select your bonus extraction permit at your earliest convenience. STRATUM expects continued performance. — Liaison Voss'
    }
];

// ── CommsManager — state, triggers, badge ───────────────────────────────────

class CommsManager {
    constructor() {
        this._state = COMMS_MESSAGES.map(m => ({
            id: m.id,
            read: false,
            unlocked: false,
            unlockedAt: null
        }));
    }

    loadSaveData(data) {
        if (!data?.messages) return;
        // Merge saved state with current definitions (handles new messages added post-save)
        this._state = COMMS_MESSAGES.map(def => {
            const saved = data.messages.find(m => m.id === def.id);
            return saved
                ? { id: def.id, read: saved.read || false, unlocked: saved.unlocked || false, unlockedAt: saved.unlockedAt || null }
                : { id: def.id, read: false, unlocked: false, unlockedAt: null };
        });
    }

    getSaveData() {
        return { messages: this._state.map(s => ({ ...s })) };
    }

    getUnlockedMessages() {
        return this._state
            .filter(s => s.unlocked)
            .map(s => ({ ...COMMS_MESSAGES.find(m => m.id === s.id), ...s }))
            .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
    }

    getUnreadCount() {
        return this._state.filter(s => s.unlocked && !s.read).length;
    }

    // Unlock a message by id. No-op if already unlocked. Returns true if newly unlocked.
    unlockMessage(id) {
        const entry = this._state.find(s => s.id === id);
        if (!entry || entry.unlocked) return false;

        this._state = this._state.map(s =>
            s.id === id ? { ...s, unlocked: true, unlockedAt: Date.now() } : s
        );

        this._onMessageUnlocked(id);
        return true;
    }

    markRead(id) {
        this._state = this._state.map(s =>
            s.id === id ? { ...s, read: true } : s
        );
        this._updateBadge();
        this._persist();
    }

    _onMessageUnlocked(id) {
        const def = COMMS_MESSAGES.find(m => m.id === id);
        if (def) {
            appToast.showRaw({
                icon: 'CM',
                title: def.sender,
                message: 'New message received.'
            });
        }
        this._updateBadge();
        this._persist();
        document.dispatchEvent(new CustomEvent('commsUpdated'));
    }

    _updateBadge() {
        const badge = document.querySelector('.comms-taskbar-badge');
        if (!badge) return;
        const count = this.getUnreadCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }

    _persist() {
        if (!window.desktop) return;
        window.desktop.appData = {
            ...window.desktop.appData,
            comms: this.getSaveData()
        };
        window.desktop.throttledSave();
    }
}

// Singleton — available before desktop initializes
const commsManager = new CommsManager();
window.commsManager = commsManager;

// ── CommsApp — UI renderer ───────────────────────────────────────────────────

class CommsApp extends App {
    constructor() {
        super();
        this.id = 'comms';
        this.title = 'STRATUM COMMS // OPERATOR INBOX';
        this.icon = 'CM';
        this.color = '#18a050';
        this._selectedId = null;
        this._commsListener = null;
        this._root = null;
    }

    mount(contentElement) {
        const template = document.getElementById('comms-app-template');
        if (!template) throw new Error('Comms app template not found');
        contentElement.appendChild(template.content.cloneNode(true));
        this._root = contentElement;

        this._render();

        this._commsListener = () => this._render();
        document.addEventListener('commsUpdated', this._commsListener);
    }

    _render() {
        const root = this._root;
        if (!root) return;

        const messages = commsManager.getUnlockedMessages();

        const listEl = root.querySelector('.comms-message-list');
        if (listEl) {
            if (messages.length === 0) {
                listEl.innerHTML = '<div class="comms-empty">NO MESSAGES</div>';
            } else {
                listEl.innerHTML = messages.map(msg => `
                    <div class="comms-message-item${msg.read ? '' : ' unread'}${this._selectedId === msg.id ? ' selected' : ''}" data-id="${msg.id}">
                        <div class="comms-msg-sender">${msg.sender}</div>
                        <div class="comms-msg-subject">${msg.subject}</div>
                        <div class="comms-msg-time">${this._formatTime(msg.unlockedAt)}</div>
                    </div>
                `).join('');

                listEl.querySelectorAll('.comms-message-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this._selectMessage(item.dataset.id);
                    });
                });
            }
        }

        // Render selected message body
        if (this._selectedId) {
            this._renderBody();
        } else {
            const bodyEl = root.querySelector('.comms-message-body');
            if (bodyEl) bodyEl.innerHTML = '<div class="comms-body-placeholder">SELECT A MESSAGE</div>';
        }
    }

    _selectMessage(id) {
        this._selectedId = id;
        commsManager.markRead(id);
        this._render();
    }

    _renderBody() {
        const root = this._root;
        if (!root) return;

        const def = COMMS_MESSAGES.find(m => m.id === this._selectedId);
        const state = commsManager._state.find(s => s.id === this._selectedId);
        const bodyEl = root.querySelector('.comms-message-body');
        if (!bodyEl || !def) return;

        bodyEl.innerHTML = `
            <div class="comms-body-header">
                <div class="comms-body-subject">${def.subject}</div>
                <div class="comms-body-meta">
                    <span class="comms-body-sender">${def.sender}</span>
                    <span class="comms-body-time">${this._formatTime(state?.unlockedAt)}</span>
                </div>
            </div>
            <div class="comms-body-divider"></div>
            <div class="comms-body-text">${def.body}</div>
        `;
    }

    _formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${mins}`;
    }

    close() {
        if (this._commsListener) {
            document.removeEventListener('commsUpdated', this._commsListener);
        }
        this._root = null;
    }

    // Comms state is managed directly by CommsManager — getSaveData returns nothing
    getSaveData() { return {}; }
    loadSaveData() {}
}
