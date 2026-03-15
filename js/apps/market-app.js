// Space Market App Class
// Desktop application for buying and selling resources

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'STRATUM.EXCHANGE';
        this.icon = '🏪';
        this.currentPage = 'store';
        this.resourceManager = null;
        this.updateInterval = null;
        this.sellPrices = {
            // Tier 1 - Raw Ores
            oreA: 0.5,    // Iron Ore
            oreB: 0.8,    // Copper Ore (slightly more valuable)

            // Tier 2 - Bars
            barA: 2.0,    // Iron Bar
            barB: 3.0,    // Copper Bar

            // Tier 3 - Components
            componentA: 10.0,   // Steel Plate
            componentB: 8.0,    // Wire (produced 2x, worth less per unit)
            componentC: 20.0,   // Circuit (requires both bar types)

            // Tier 4 - Advanced Products
            productA: 80.0,     // Engine
            productB: 100.0     // Computer
        };
    }

    mount(contentElement) {
        // Clone market template
        const template = document.getElementById('market-app-template');
        if (!template) {
            throw new Error('Market app template not found');
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        // Get resource manager reference from global game instance
        this.resourceManager = window.gameInstance?.resources;

        if (!this.resourceManager) {
            log('ResourceManager not available yet. Market app may not function properly.');
        }

        // Setup navigation
        this.setupNavigation(contentElement);

        // Setup sell buttons
        this.setupSellButtons(contentElement);

        // Show store page
        this.showStorePage(contentElement);

        // Start update loop for real-time display
        this.startUpdateLoop(contentElement);
    }

    setupNavigation(root) {
        const navButtons = root.querySelectorAll('[data-page]');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.getAttribute('data-page');
                this.navigateToPage(root, page);
            });
        });
    }

    navigateToPage(root, page) {
        this.currentPage = page;

        // Update active button
        const navButtons = root.querySelectorAll('[data-page]');
        navButtons.forEach(btn => {
            if (btn.getAttribute('data-page') === page) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update URL bar
        const urlBar = root.querySelector('.url-bar');
        if (urlBar) {
            urlBar.textContent = `galactic://market.space/${page}`;
        }

        // Show appropriate page content
        if (page === 'store') {
            this.showStorePage(root);
        } else if (page === 'about') {
            this.showAboutPage(root);
        }
    }

    showStorePage(root) {
        // Store page is default, just update display
        const storePage = root.querySelector('.store-page');
        const aboutPage = root.querySelector('.about-page');

        if (storePage) storePage.style.display = 'block';
        if (aboutPage) aboutPage.style.display = 'none';
    }

    showAboutPage(root) {
        const storePage = root.querySelector('.store-page');
        const aboutPage = root.querySelector('.about-page');

        if (storePage) storePage.style.display = 'none';
        if (aboutPage) aboutPage.style.display = 'block';
    }

    setupSellButtons(root) {
        const sellButtons = root.querySelectorAll('.sell-btn');
        sellButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const resourceType = btn.getAttribute('data-resource');
                const amount = btn.getAttribute('data-amount');

                if (amount === 'all') {
                    this.sellAll(resourceType);
                } else {
                    this.sellResource(resourceType, parseInt(amount));
                }

                // Update display immediately
                this.updateDisplay(root);
            });
        });
    }

    sellResource(resourceType, amount) {
        if (!this.resourceManager) {
            throw new Error('ResourceManager not available');
        }

        const price = this.sellPrices[resourceType];
        if (!price) {
            throw new Error(`No sell price defined for ${resourceType}`);
        }

        // Check how much is available
        const available = this.resourceManager.get(resourceType);
        const actualAmount = Math.min(amount, available);

        if (actualAmount <= 0) {
            log(`No ${resourceType} available to sell`);
            return;
        }

        // Remove resource
        this.resourceManager.remove(resourceType, actualAmount);

        // Add credits
        const credits = actualAmount * price;
        this.resourceManager.add('credits', credits);

        log(`Sold ${formatNumber(actualAmount)} ${resourceType} for ${formatNumber(credits)} credits`);
    }

    sellAll(resourceType) {
        if (!this.resourceManager) {
            throw new Error('ResourceManager not available');
        }

        const available = this.resourceManager.get(resourceType);
        if (available > 0) {
            this.sellResource(resourceType, available);
        }
    }

    startUpdateLoop(root) {
        this.updateInterval = setInterval(() => {
            this.updateDisplay(root);
        }, 1000);
    }

    updateDisplay(root) {
        if (!this.resourceManager) return;

        // Update resource amounts
        Object.keys(this.sellPrices).forEach(resourceType => {
            const amountEl = root.querySelector(`#market-${resourceType}-amount`);
            if (amountEl) {
                const amount = this.resourceManager.get(resourceType);
                amountEl.textContent = formatNumber(amount);
            }

            // Update potential value
            const valueEl = root.querySelector(`#market-${resourceType}-value`);
            if (valueEl) {
                const amount = this.resourceManager.get(resourceType);
                const value = amount * this.sellPrices[resourceType];
                valueEl.textContent = formatNumber(value);
            }
        });

        // Update credits display
        const creditsEl = root.querySelector('#market-credits');
        if (creditsEl) {
            const credits = this.resourceManager.get('credits');
            creditsEl.textContent = formatNumber(credits);
        }
    }

    close() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    getSaveData() {
        return {};
    }

    loadSaveData(data) {
        // No persistent state for market app yet
    }
}
