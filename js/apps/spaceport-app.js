// Spaceport App
// Planet 1 win condition — launch checklist and launch sequence

const LAUNCH_REQUIREMENTS = {
    hullPlating:    5,
    fuelTank:       3,
    wiringHarness:  4,
    navCore:        2,
    engineAssembly: 1,
    refinedFuel:    50
};

const LAUNCH_LABELS = {
    hullPlating:    'HULL PLATING',
    fuelTank:       'FUEL TANK',
    wiringHarness:  'WIRING HARNESS',
    navCore:        'NAVIGATION CORE',
    engineAssembly: 'ENGINE ASSEMBLY',
    refinedFuel:    'REFINED FUEL'
};

class SpaceportApp extends App {
    constructor() {
        super();
        this.id = 'spaceport';
        this.title = 'SPACEPORT CONTROL';
        this.icon = 'SP';
        this.color = '#4068d0';
        this.updateInterval = null;
        this.launched = false;
        this.launching = false;
    }

    mount(contentElement) {
        const template = document.getElementById('spaceport-app-template');
        if (!template) throw new Error('Spaceport app template not found');

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        const launchBtn = contentElement.querySelector('.sp-launch-btn');
        launchBtn.addEventListener('click', () => this.handleLaunchClick(contentElement));

        this.updateDisplay(contentElement);
        this.updateInterval = setInterval(() => this.updateDisplay(contentElement), 500);
    }

    // Get total stored amount for a resource type across all storage nodes
    _getStoredAmount(resourceType) {
        const gameInstance = window.gameInstance;
        if (!gameInstance?.canvas) return 0;
        return gameInstance.canvas.nodes
            .filter(n => (n.buildingDef?.isStorage || n.buildingType === 'storageNode') && n.storedResourceType === resourceType)
            .reduce((sum, n) => sum + (n.inventory || 0), 0);
    }

    updateDisplay(root) {
        if (this.launched) {
            this._showLaunchedState(root);
            return;
        }

        let readyCount = 0;
        const totalCount = Object.keys(LAUNCH_REQUIREMENTS).length;

        Object.entries(LAUNCH_REQUIREMENTS).forEach(([resourceType, required]) => {
            const current = Math.floor(this._getStoredAmount(resourceType));
            const met = current >= required;
            if (met) readyCount++;

            const row = root.querySelector(`.sp-row[data-res="${resourceType}"]`);
            if (!row) return;

            const fill = row.querySelector('.sp-bar-fill');
            const countEl = row.querySelector('.sp-count');
            const check = row.querySelector('.sp-check');

            const pct = Math.min(100, (current / required) * 100);
            fill.style.width = pct + '%';
            countEl.textContent = `${Math.min(current, required)} / ${required}`;

            if (met) {
                row.classList.add('sp-row-met');
                check.textContent = '✓';
            } else {
                row.classList.remove('sp-row-met');
                check.textContent = '';
            }
        });

        const readinessEl = root.querySelector('.sp-readiness');
        if (readinessEl) {
            readinessEl.textContent = `Launch readiness: ${readyCount} / ${totalCount} systems ready`;
        }

        const launchBtn = root.querySelector('.sp-launch-btn');
        if (!launchBtn) return;

        const allReady = readyCount === totalCount;
        launchBtn.disabled = !allReady || this.launching;
        if (allReady) {
            launchBtn.classList.add('sp-launch-ready');
        } else {
            launchBtn.classList.remove('sp-launch-ready');
        }
    }

    _showLaunchedState(root) {
        const readinessEl = root.querySelector('.sp-readiness');
        if (readinessEl) readinessEl.textContent = 'VESSEL LAUNCHED // PLANET 1 OPERATIONS ACTIVE';

        const launchBtn = root.querySelector('.sp-launch-btn');
        if (launchBtn) {
            launchBtn.disabled = true;
            launchBtn.classList.remove('sp-launch-ready');
            launchBtn.textContent = '[ LAUNCH COMPLETE ]';
        }
    }

    handleLaunchClick(root) {
        if (this.launching || this.launched) return;

        const launchBtn = root.querySelector('.sp-launch-btn');
        if (!launchBtn || launchBtn.disabled) return;

        this.launching = true;
        launchBtn.disabled = true;
        launchBtn.classList.remove('sp-launch-ready');
        launchBtn.textContent = '[ INITIATING LAUNCH SEQUENCE... ]';

        setTimeout(() => {
            if (!this._deductResources()) {
                // Resources changed between check and deduct — abort
                this.launching = false;
                launchBtn.textContent = '[ LAUNCH SEQUENCE INITIATE ]';
                this.updateDisplay(root);
                return;
            }

            this.launched = true;
            this.launching = false;
            this._showCompletionOverlay();
        }, 1500);
    }

    _deductResources() {
        const gameInstance = window.gameInstance;
        if (!gameInstance?.canvas) return false;

        const storageNodes = gameInstance.canvas.nodes.filter(
            n => n.buildingDef?.isStorage || n.buildingType === 'storageNode'
        );

        // Verify we can still afford everything
        for (const [resourceType, required] of Object.entries(LAUNCH_REQUIREMENTS)) {
            const available = storageNodes
                .filter(n => n.storedResourceType === resourceType)
                .reduce((s, n) => s + (n.inventory || 0), 0);
            if (available < required) return false;
        }

        // Deduct from storage nodes
        for (const [resourceType, required] of Object.entries(LAUNCH_REQUIREMENTS)) {
            let remaining = required;
            const nodes = storageNodes.filter(n => n.storedResourceType === resourceType);
            for (const node of nodes) {
                const take = Math.min(remaining, node.inventory || 0);
                node.inventory -= take;
                remaining -= take;
                if (remaining <= 0) break;
            }
        }

        return true;
    }

    _showCompletionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'sp-completion-overlay';
        overlay.innerHTML = `
            <div class="sp-completion-modal">
                <div class="sp-completion-title">LAUNCH SUCCESSFUL</div>
                <div class="sp-completion-divider">// // // // // // // //</div>
                <div class="sp-completion-subtitle">SECTOR ALPHA-1 OPERATION COMPLETE</div>
                <div class="sp-completion-body">
                    <p>Your vessel has departed the surface.</p>
                    <p>Planet 1 operations remain active.</p>
                    <p class="sp-completion-placeholder">[ More to come ]</p>
                </div>
                <button class="sp-completion-continue">[ CONTINUE ]</button>
            </div>
        `;

        const continueBtn = overlay.querySelector('.sp-completion-continue');
        continueBtn.addEventListener('click', () => overlay.remove());

        document.body.appendChild(overlay);
    }

    close() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    getSaveData() {
        return { launched: this.launched };
    }

    loadSaveData(data) {
        if (data?.launched) this.launched = true;
    }
}
