// Loads the HTML components into their containers and applies the
// platform layout (macOS: window buttons left; Windows/Linux: right).
class ComponentManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.components = {};
  }

  detectPlatform() {
    // platform.js provides electronAPI.getPlatform() in both Electron and a plain browser.
    if (window.electronAPI) return window.electronAPI.getPlatform();
    return navigator.platform.includes('Mac') ? 'darwin' : 'win32';
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
    if (container && this.components[componentName]) {
      container.innerHTML = this.components[componentName];
    } else {
      console.error(`Failed to insert component ${componentName} into #${containerId}`);
    }
  }

  setupPlatformSpecificLayout() {
    const header = document.querySelector('.app-header');
    const navControlsContainer = document.querySelector('.nav-controls-container');
    const controlsRight = document.querySelector('.header__controls-right');

    if (this.platform === 'darwin') {
      header.classList.add('platform-macos');
      const windowControls = document.querySelector('.window-controls');
      if (windowControls) header.insertBefore(windowControls, header.firstChild);
      if (navControlsContainer) controlsRight.insertBefore(navControlsContainer, controlsRight.firstChild);
    } else {
      header.classList.add('platform-windows');
    }
  }

  async initialize() {
    const windowControls = this.platform === 'darwin' ? 'window-controls-macos' : 'window-controls';
    const placements = [
      ['sidebar-container', 'sidebar'],
      ['right-sidebar-container', 'right-sidebar'],
      ['nav-controls-container', 'navigation-controls'],
      ['url-bar-container', 'url-bar'],
      ['menu-button-container', 'menu-button'],
      ['query-input-container', 'query-input'],
      ['window-controls-container', windowControls],
      ['webview-container', 'webview'],
      ['buffer-button-container', 'buffer-button'],
      ['network-button-container', 'network-button'],
      ['network-modal-container', 'network-modal']
    ];

    await Promise.all(placements.map(([, name]) => this.loadComponent(name)));
    placements.forEach(([containerId, name]) => this.insertComponent(containerId, name));

    this.setupPlatformSpecificLayout();

    // Outside Electron: swap <webview> for an <iframe> shim, hide window buttons.
    window.GyrusPlatform?.afterComponentsLoaded();
  }
}

const componentManager = new ComponentManager();
