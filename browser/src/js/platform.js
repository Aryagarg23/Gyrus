// Platform shim. Loaded before components.js.
//
// In Electron, preload.js exposes window.electronAPI and the <webview> tag works.
// In a plain browser neither exists, so this file:
//   - sets window.GYRUS_IN_ELECTRON
//   - provides a harmless electronAPI stand-in (window buttons do nothing)
//   - after components load, swaps <webview id="browser-webview"> for an <iframe>
//     with the same id/class and the webview methods/events app.js relies on
//   - hides the window minimize/maximize/close controls
(function () {
  const inElectron = !!(window.electronAPI && typeof window.electronAPI.getPlatform === 'function');
  window.GYRUS_IN_ELECTRON = inElectron;

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

  // A URL is "frameable as far as we can tell" if it is not http(s), or is same-origin.
  // Anything else may be refused by the site (X-Frame-Options / CSP frame-ancestors),
  // and the browser gives us no reliable way to detect that, so we always offer a way out.
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
    // set src again (e.g. the easter-egg redirect) don't re-enter.
    setTimeout(() => {
      const ev = new CustomEvent(type);
      if (url !== undefined) ev.url = url;
      el.dispatchEvent(ev);
    }, 0);
  }

  function upgradeWebviewToIframe() {
    const webview = document.getElementById('browser-webview');
    if (!webview || webview.tagName.toLowerCase() !== 'webview') return;

    const iframe = document.createElement('iframe');
    iframe.id = webview.id;
    iframe.className = webview.className;
    iframe.setAttribute('title', 'Page');
    iframe.style.border = '0';

    // Plain wording, minimal style; restyled later.
    const notice = document.createElement('div');
    notice.className = 'frame-notice';
    notice.setAttribute('role', 'note');
    notice.style.cssText =
      'position:absolute;top:8px;right:8px;z-index:5;display:none;max-width:360px;' +
      'padding:6px 10px;background:#fff;color:#222;border:1px solid #ccc;font:13px/1.4 sans-serif;';
    const noticeText = document.createElement('span');
    noticeText.textContent = 'Some sites refuse to load inside this page. ';
    const noticeLink = document.createElement('a');
    noticeLink.textContent = 'Open in a new tab';
    noticeLink.target = '_blank';
    noticeLink.rel = 'noopener noreferrer';
    const noticeClose = document.createElement('button');
    noticeClose.type = 'button';
    noticeClose.textContent = '×';
    noticeClose.setAttribute('aria-label', 'Dismiss');
    noticeClose.style.cssText = 'margin-left:8px;border:0;background:none;cursor:pointer;font:inherit;';
    noticeClose.addEventListener('click', () => { notice.style.display = 'none'; });
    notice.append(noticeText, noticeLink, noticeClose);

    const updateNotice = (url) => {
      if (isExternal(url)) {
        noticeLink.href = url;
        notice.style.display = 'block';
      } else {
        notice.style.display = 'none';
      }
    };

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
      updateNotice(currentUrl);
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
      try {
        const u = new URL(currentUrl);
        return u.protocol.startsWith('http') ? u.hostname : '';
      } catch (_) {
        return '';
      }
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
    iframe.parentNode.appendChild(notice);
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
