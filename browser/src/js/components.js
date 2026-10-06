// Loads the HTML components into their containers and places the window
// buttons for the platform (macOS: top of the rail; Windows/Linux: right end
// of the top bar). Window buttons only exist in Electron.
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    const isMac = this.platform === 'darwin';
    document.body.classList.add(isMac ? 'platform-macos' : 'platform-windows');
    if (!isMac) return;
    // macOS: traffic lights at the top-left, which is the top of the rail.
    const windowControls = document.querySelector('.topbar .window-controls');
    const railHead = document.querySelector('.rail__head');
    if (windowControls && railHead) railHead.appendChild(windowControls);
  }

  async initialize() {
    const windowControls = this.platform === 'darwin' ? 'window-controls-macos' : 'window-controls';
    const placements = [
      ['rail-container', 'rail'],
      ['start-container', 'start-screen'],
      ['nav-controls-container', 'navigation-controls'],
      ['url-bar-container', 'url-bar'],
      ['window-controls-container', windowControls],
      ['webview-container', 'webview'],
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
