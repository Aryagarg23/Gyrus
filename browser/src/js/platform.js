// Platform shim. Loaded before components.js.
//
// In Electron, preload.js exposes window.electronAPI and the <webview> tag works.
// In a plain browser neither exists, so this file:
//   - sets window.GYRUS_IN_ELECTRON
//   - provides a harmless electronAPI stand-in (window buttons do nothing)
//   - after components load, swaps <webview id="browser-webview"> for an <iframe>
//     with the same id/class and the webview methods/events app.js relies on.
//     Same-origin pages (e.g. lobotomy.html) load in the iframe; external pages
//     get a local preview card instead (see buildPreview)
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

  // Local stand-in for an external page. Framing third-party sites mostly fails
  // (X-Frame-Options, CSP, bot walls), and the browser can't tell us when it did,
  // so outside Electron we never frame them: we show what we know about the link
  // and a button to open it for real. app.js supplies the details through
  // GyrusPlatform.describeUrl(url) -> { title, snippet, origin } (all optional).
  function buildPreview() {
    const el = document.createElement('div');
    el.className = 'page-preview';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Page preview');
    el.innerHTML =
      '<div class="page-preview__card">' +
      '<p class="page-preview__origin label"></p>' +
      '<h1 class="page-preview__title"></h1>' +
      '<p class="page-preview__url"></p>' +
      '<p class="page-preview__snippet"></p>' +
      '<div class="page-preview__actions">' +
      '<a class="button page-preview__open" target="_blank" rel="noopener noreferrer">Open in a new tab</a>' +
      '</div>' +
      '<p class="page-preview__note">Most sites refuse to load inside another page, so in a normal browser Gyrus shows this card instead. The desktop app opens the site itself.</p>' +
      '</div>';
    return el;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
  }

  function describe(url) {
    let info = {};
    try {
      const fn = window.GyrusPlatform && window.GyrusPlatform.describeUrl;
      info = (typeof fn === 'function' && fn(url)) || {};
    } catch (_) { info = {}; }
    return {
      title: info.title || hostOf(url) || url,
      snippet: info.snippet || '',
      origin: info.origin || 'A page you opened',
    };
  }

  function fillPreview(el, url) {
    const info = describe(url);
    el.querySelector('.page-preview__origin').textContent = info.origin;
    el.querySelector('.page-preview__title').textContent = info.title;
    el.querySelector('.page-preview__url').textContent = url;
    const snippet = el.querySelector('.page-preview__snippet');
    snippet.textContent = info.snippet;
    snippet.hidden = !info.snippet;
    el.querySelector('.page-preview__open').href = url;
    return info;
  }

  function upgradeWebviewToIframe() {
    const webview = document.getElementById('browser-webview');
    if (!webview || webview.tagName.toLowerCase() !== 'webview') return;

    const iframe = document.createElement('iframe');
    iframe.id = webview.id;
    iframe.className = webview.className;
    iframe.setAttribute('title', 'Page');

    const preview = buildPreview();
    let previewTitle = '';

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
      if (isExternal(currentUrl)) {
        previewTitle = fillPreview(preview, currentUrl).title;
        preview.classList.add('is-visible');
        iframe.style.visibility = 'hidden';
        nativeSrc.set.call(iframe, 'about:blank');
        emit(iframe, 'did-navigate', currentUrl);
        emit(iframe, 'did-stop-loading');
        return;
      }
      previewTitle = '';
      preview.classList.remove('is-visible');
      iframe.style.visibility = '';
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
      if (previewTitle) return previewTitle;
      try {
        const t = iframe.contentDocument && iframe.contentDocument.title;
        if (t) return t;
      } catch (_) { /* cross-origin */ }
      return hostOf(currentUrl);
    };

    iframe.addEventListener('load', () => {
      if (previewTitle) return; // the about:blank behind a preview card
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
    iframe.parentNode.insertBefore(preview, iframe.nextSibling);
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
    // Set by app.js: (url) => ({ title, snippet, origin }) for the preview card.
    describeUrl: null,
    // Called by ComponentManager once components are inserted, before App starts.
    afterComponentsLoaded() {
      if (inElectron) return;
      upgradeWebviewToIframe();
      hideWindowControls();
    },
  };
})();
