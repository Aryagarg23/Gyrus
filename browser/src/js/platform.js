// Platform shim. Loaded before components.js.
//
// In Electron, preload.js exposes window.electronAPI and the <webview> tag works.
// In a plain browser neither exists, so this file:
//   - sets window.GYRUS_IN_ELECTRON and, in Electron, the `in-electron` class on <html>
//   - provides a harmless electronAPI stand-in (window buttons do nothing)
//   - after components load, swaps <webview id="browser-webview"> for an <iframe>
//     with the same id/class and the webview methods/events app.js relies on
//   - hides the window minimize/maximize/close controls
//
// Pages from this folder (demo-page.html, lobotomy.html) load in the iframe
// normally. External sites often refuse to be framed and the browser gives no
// reliable signal when they do, so the page bar offers "Open in a new tab" for
// them (app.js, using GyrusPlatform.isExternal).
(function () {
  const inElectron = !!(window.electronAPI && typeof window.electronAPI.getPlatform === 'function');
  window.GYRUS_IN_ELECTRON = inElectron;
  if (inElectron) document.documentElement.classList.add('in-electron');

  if (!inElectron) {
    const platformFromNavigator = () => {
      const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
      if (/mac/i.test(p)) return 'darwin';
      if (/win/i.test(p)) return 'win32';
      return 'linux';
    };
    window.electronAPI = {
      minimizeWindow: () => {},
      maximizeWindow: () => {},
      closeWindow: () => {},
      getPlatform: platformFromNavigator,
    };
  }

  // http(s) on another origin.
  function isExternal(url) {
    try {
      const u = new URL(url, location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      return u.origin !== location.origin;
    } catch (_) {
      return false;
    }
  }

  function emit(el, type, url) {
    // Electron fires webview events asynchronously; do the same so handlers that
    // set src again (e.g. the lobotomy redirect) don't re-enter.
    setTimeout(() => {
      const ev = new CustomEvent(type);
      if (url !== undefined) ev.url = url;
      el.dispatchEvent(ev);
    }, 0);
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
  }

  function upgradeWebviewToIframe() {
    const webview = document.getElementById('browser-webview');
    if (!webview || webview.tagName.toLowerCase() !== 'webview') return;

    const iframe = document.createElement('iframe');
    iframe.id = webview.id;
    iframe.className = webview.className;
    iframe.setAttribute('title', 'Page');

    // Our own history: cross-origin frames don't expose theirs.
    const history = [];
    let index = -1;
    let currentUrl = 'about:blank';
    const nativeSrc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');

    const navigate = (url, fromHistory) => {
      currentUrl = String(url || 'about:blank');
      if (!fromHistory) {
        history.splice(index + 1);
        history.push(currentUrl);
        index = history.length - 1;
      }
      emit(iframe, 'did-start-loading');
      nativeSrc.set.call(iframe, currentUrl);
      emit(iframe, 'did-navigate', currentUrl);
    };

    Object.defineProperty(iframe, 'src', {
      configurable: true,
      get: () => currentUrl,
      set: (url) => navigate(url, false),
    });

    iframe.canGoBack = () => index > 0;
    iframe.canGoForward = () => index < history.length - 1;
    iframe.goBack = () => { if (index > 0) { index--; navigate(history[index], true); } };
    iframe.goForward = () => { if (index < history.length - 1) { index++; navigate(history[index], true); } };
    iframe.reload = () => navigate(currentUrl, true);
    iframe.getURL = () => currentUrl;
    iframe.getTitle = () => {
      try {
        const t = iframe.contentDocument && iframe.contentDocument.title;
        if (t) return t;
      } catch (_) { /* cross-origin */ }
      return hostOf(currentUrl);
    };

    iframe.addEventListener('load', () => {
      // Same-origin frames can navigate themselves (links inside them); report that.
      try {
        const href = iframe.contentWindow && iframe.contentWindow.location.href;
        let expected = currentUrl;
        try { expected = new URL(currentUrl, location.href).href; } catch (_) { /* keep raw */ }
        if (href && href !== 'about:blank' && href !== expected && !isExternal(href)) {
          currentUrl = href;
          history.splice(index + 1);
          history.push(href);
          index = history.length - 1;
          emit(iframe, 'did-navigate', href);
        }
      } catch (_) { /* cross-origin */ }
      emit(iframe, 'did-stop-loading');
    });

    const initial = webview.getAttribute('src') || 'about:blank';
    webview.replaceWith(iframe);
    navigate(initial, false);
  }

  function hideWindowControls() {
    document.querySelectorAll('.window-controls').forEach((el) => {
      el.style.display = 'none';
    });
  }

  window.GyrusPlatform = {
    inElectron,
    isExternal,
    // Called by ComponentManager once components are inserted, before App starts.
    afterComponentsLoaded() {
      if (inElectron) return;
      upgradeWebviewToIframe();
      hideWindowControls();
    },
  };
})();
