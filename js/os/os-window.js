// OS Window Class
// Manages individual window instances with drag, resize, and controls

class OSWindow {
    constructor(windowManager, appInstance, options = {}) {
        this.manager = windowManager;
        this.app = appInstance;
        this.id = generateId();

        // Window state
        this.x = options.x || 100;
        this.y = options.y || 100;
        this.width = options.width || 800;
        this.height = options.height || 600;
        this.maximized = false;
        this.focused = false;

        // Pre-maximize state (for restore)
        this.preMaxState = null;

        // DOM elements
        this.element = null;
        this.titlebar = null;
        this.content = null;

        this.create();
        this.setupEvents();
    }

    create() {
        // Clone template
        const template = document.getElementById('window-template');
        this.element = template.content.cloneNode(true).firstElementChild;
        this.element.setAttribute('data-window-id', this.id);

        // Get references
        this.titlebar = this.element.querySelector('.window-titlebar');
        this.content = this.element.querySelector('.window-content');

        // Set title and icon
        this.element.querySelector('.window-title').textContent = this.app.title;
        this.element.querySelector('.window-icon').textContent = this.app.icon;

        // Set initial position/size
        this.updatePosition();

        // Inject app content
        this.app.mount(this.content);
    }

    setupEvents() {
        // Title bar drag
        this.titlebar.addEventListener('mousedown', (e) => this.startDrag(e));

        // Window controls
        this.element.querySelector('.maximize').addEventListener('click', () => this.toggleMaximize());
        this.element.querySelector('.close').addEventListener('click', () => this.close());

        // Resize handles
        this.element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.startResize(e, handle.classList[1]));
        });

        // Focus on click
        this.element.addEventListener('mousedown', () => this.focus());
    }

    startDrag(e) {
        if (this.maximized) return;
        e.preventDefault();

        const startX = e.clientX - this.x;
        const startY = e.clientY - this.y;

        const onMouseMove = (e) => {
            this.x = e.clientX - startX;
            this.y = e.clientY - startY;
            this.updatePosition();
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    startResize(e, direction) {
        if (this.maximized) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = this.width;
        const startHeight = this.height;
        const startPosX = this.x;
        const startPosY = this.y;

        const onMouseMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Update based on direction
            if (direction.includes('e')) this.width = Math.max(400, startWidth + dx);
            if (direction.includes('s')) this.height = Math.max(300, startHeight + dy);
            if (direction.includes('w')) {
                const newWidth = Math.max(400, startWidth - dx);
                this.x = startPosX + (startWidth - newWidth);
                this.width = newWidth;
            }
            if (direction.includes('n')) {
                const newHeight = Math.max(300, startHeight - dy);
                this.y = startPosY + (startHeight - newHeight);
                this.height = newHeight;
            }

            this.updatePosition();
            this.app.onResize(this.width, this.height);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updatePosition() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';
    }

    toggleMaximize() {
        if (this.maximized) {
            // Restore
            this.element.classList.remove('maximized');
            this.x = this.preMaxState.x;
            this.y = this.preMaxState.y;
            this.width = this.preMaxState.width;
            this.height = this.preMaxState.height;
            this.updatePosition();
            this.maximized = false;
            this.app.onResize(this.width, this.height);
        } else {
            // Maximize
            this.preMaxState = { x: this.x, y: this.y, width: this.width, height: this.height };
            this.element.classList.add('maximized');
            this.maximized = true;
            const fullWidth = window.innerWidth;
            const fullHeight = window.innerHeight - 40; // Minus taskbar
            this.app.onResize(fullWidth, fullHeight);
        }
    }

    focus() {
        this.manager.focusWindow(this);
    }

    close() {
        this.app.close();
        this.manager.closeWindow(this);
        this.element.remove();
    }

    getSaveData() {
        return {
            appId: this.app.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            maximized: this.maximized
        };
    }
}
