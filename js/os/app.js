// App Base Class
// Interface for all desktop applications

class App {
    constructor() {
        this.id = 'app';
        this.title = 'Application';
        this.icon = '📦';
    }

    // Called when app window is created - inject content here
    mount(contentElement) {
        contentElement.innerHTML = '<p>Base app - override mount() method</p>';
    }

    // Called when window is resized
    onResize(width, height) {
        // Override in subclass if needed
    }

    // Called when app window is closed
    close() {
        // Override in subclass for cleanup
    }

    // Return app-specific save data
    getSaveData() {
        return {};
    }

    // Load app-specific save data
    loadSaveData(data) {
        // Override in subclass
    }
}
