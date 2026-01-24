// Space Market App Class
// Desktop application for buying and selling resources

class MarketApp extends App {
    constructor() {
        super();
        this.id = 'market';
        this.title = 'Space Market';
        this.icon = '🏪';
        this.currentPage = 'store';
        this.resourceManager = null;
        this.updateInterval = null;
        this.sellPrices = {
            ore: 0.5,
            metal: 3.0  // 2:1 ratio means 2 ore (1.0 cr) → 1 metal (3.0 cr) = 2.0 cr profit
        };
    }

    mount(contentElement) {
        // Clone market template
        const template = document.getElementById('market-app-template');
        if (!template) {
            console.error('Market app template not found!');
            return;
        }

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        // Get resource manager reference from global game instance
        this.resourceManager = window.gameInstance?.resources;

        if (!this.resourceManager) {
            console.warn('ResourceManager not available yet. Market app may not function properly.');
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
            console.error('ResourceManager not available');
            return;
        }

        const price = this.sellPrices[resourceType];
        if (!price) {
            console.error(`No sell price defined for ${resourceType}`);
            return;
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
            console.error('ResourceManager not available');
            return;
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
