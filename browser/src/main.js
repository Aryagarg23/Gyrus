const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  // Platform-specific window configuration
  const windowConfig = {
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(__dirname, 'components', 'gyrus_icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Enable webview functionality
      webviewTag: true,
      // Allow webview to load external URLs
      webSecurity: false,
      // Disable zoom persistence to prevent cached zoom levels
      zoomFactor: 1.0,
    },
  };

  // macOS-specific configuration
  if (process.platform === 'darwin') {
    windowConfig.titleBarStyle = 'hidden';
    windowConfig.titleBarOverlay = false;
  }

  const mainWindow = new BrowserWindow(windowConfig);

  // Hide default macOS traffic lights
  if (process.platform === 'darwin' && mainWindow.setWindowButtonVisibility) {
    mainWindow.setWindowButtonVisibility(false);
  }

  // Set zoom level to 100% on startup and clear any cached zoom settings
  mainWindow.webContents.setZoomLevel(0);
  
  // Clear zoom factor cache to ensure fresh start
  mainWindow.webContents.setZoomFactor(1.0);
  
  // Disable zoom to prevent future issues
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Force reset zoom after page loads to ensure it's at 100%
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomLevel(0);
    mainWindow.webContents.setZoomFactor(1.0);
  });
}

app.whenReady().then(() => {
  // Set the dock/taskbar icon
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'components', 'gyrus_icon.png'));
  }
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('window-minimize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.minimize();
});

ipcMain.on('window-maximize', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    if (process.platform === 'darwin') {
      // Toggle fullscreen on macOS
      window.setFullScreen(!window.isFullScreen());
    } else {
      // Maximize/unmaximize on Windows/Linux
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  }
});

ipcMain.on('window-close', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) window.close();
});



app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 