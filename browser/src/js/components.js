// Component loader and platform detection
class ComponentManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.components = {};
  }

  detectPlatform() {
    // Check if we're in Electron environment
    if (typeof window !== 'undefined' && window.electronAPI) {
      // We'll get the platform from the main process
      const platform = window.electronAPI.getPlatform();
      console.log('Detected platform:', platform);
      return platform;
    }
    // Fallback for web testing
    const platform = navigator.platform.includes('Mac') ? 'darwin' : 'win32';
    console.log('Fallback platform detection:', platform);
    return platform;
  }

  async loadComponent(name) {
    try {
      const response = await fetch(`components/${name}.html`);
      const html = await response.text();
      this.components[name] = html;
      return html;
    } catch (error) {
      console.error(`Failed to load component: ${name}`, error);
      return '';
    }
  }

  insertComponent(containerId, componentName) {
    const container = document.getElementById(containerId);
    console.log(`Inserting component ${componentName} into ${containerId}:`, container);
    if (container && this.components[componentName]) {
      container.innerHTML = this.components[componentName];
      console.log(`Component ${componentName} inserted successfully`);
    } else {
      console.error(`Failed to insert component ${componentName}:`, {
        container: container,
        componentExists: !!this.components[componentName],
        componentContent: this.components[componentName]
      });
    }
  }

  setupPlatformSpecificLayout() {
    const header = document.querySelector('.app-header');
    const navControlsContainer = document.querySelector('.nav-controls-container');
    const urlBar = document.querySelector('.url-bar');
    const controlsRight = document.querySelector('.header__controls-right');

    console.log('Setting up layout for platform:', this.platform);

    if (this.platform === 'darwin') {
      // macOS: Window controls on the left, navigation on the right
      console.log('Setting up macOS layout');
      header.classList.add('platform-macos');
      
      // Move window controls to the left
      const windowControls = document.querySelector('.window-controls');
      if (windowControls) {
        header.insertBefore(windowControls, header.firstChild);
        console.log('Moved window controls to left');
      }
      
      // Move navigation controls to the right
      if (navControlsContainer) {
        controlsRight.insertBefore(navControlsContainer, controlsRight.firstChild);
        console.log('Moved navigation controls to right');
      }
    } else {
      // Windows/Linux: Navigation on the left, window controls on the right
      console.log('Setting up Windows/Linux layout');
      header.classList.add('platform-windows');
    }
  }

  async initialize() {
    // Load all components
    const componentNames = [
      this.platform === 'darwin' ? 'window-controls-macos' : 'window-controls',
      'navigation-controls', 
      'url-bar',
      'menu-button',
      'query-input',
      'webview',
      'sidebar',
      'right-sidebar',
      'buffer-button', // Add the new buffer button component
      'network-button', // Add the new network button component
      'network-modal' // Add the new network modal component
    ];

    for (const name of componentNames) {
      await this.loadComponent(name);
    }

    // Insert components into their containers
    this.insertComponent('sidebar-container', 'sidebar');
    this.insertComponent('right-sidebar-container', 'right-sidebar');
    this.insertComponent('nav-controls-container', 'navigation-controls');
    this.insertComponent('url-bar-container', 'url-bar');
    this.insertComponent('menu-button-container', 'menu-button');
    this.insertComponent('query-input-container', 'query-input');
    // Use the correct window controls component based on platform
    this.insertComponent('window-controls-container', this.platform === 'darwin' ? 'window-controls-macos' : 'window-controls');
    this.insertComponent('webview-container', 'webview');
    this.insertComponent('buffer-button-container', 'buffer-button'); // Insert buffer button
    this.insertComponent('network-button-container', 'network-button'); // Insert network button
    this.insertComponent('network-modal-container', 'network-modal'); // Insert network modal

    // Setup platform-specific layout
    this.setupPlatformSpecificLayout();

    // Outside Electron: swap <webview> for an <iframe> shim, hide window buttons
    if (window.GyrusPlatform) {
      window.GyrusPlatform.afterComponentsLoaded();
    }
  }
}

// Initialize component manager
const componentManager = new ComponentManager();