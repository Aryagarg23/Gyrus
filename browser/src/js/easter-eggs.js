// Small, non-intrusive easter eggs for the Gyrus browser UI.
//
//  - window.GyrusEasterEggs.openAbout(): fetches components/about-panel.html,
//    injects it once, and opens it. Esc or a click on the backdrop closes it.
//  - A console greeting, printed once per page load, in the team's voices
//    (styled after their real commit messages) plus one plain pointer line.
//  - A hidden key sequence: typing "clay" or the Konami code outside any text
//    field shows a short toast about the project's first name.
//
// Self-contained: needs only its stylesheet (styles/06-components/_about-panel.css).
(function () {
  if (window.GyrusEasterEggs) return;

  const PANEL_URL = 'components/about-panel.html';
  const CLAY_TOAST = 'Gyrus was called Clay first. Renamed for the hackathon in case Weights & Biases minded the name.';

  let root = null;
  let loading = null;
  let lastFocus = null;

  function ensurePanel() {
    if (root) return Promise.resolve(root);
    if (loading) return loading;
    loading = fetch(PANEL_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`about panel: HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        root = document.createElement('div');
        root.className = 'gyrus-about';
        root.hidden = true;
        root.innerHTML = html;
        root.addEventListener('click', (e) => {
          if (e.target.closest('[data-about-close]')) closeAbout();
        });
        document.body.appendChild(root);
        return root;
      })
      .finally(() => { loading = null; });
    return loading;
  }

  function onKeydownWhileOpen(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAbout();
    }
  }

  function openAbout() {
    return ensurePanel()
      .then((el) => {
        if (!el.hidden) return;
        lastFocus = document.activeElement;
        el.hidden = false;
        document.addEventListener('keydown', onKeydownWhileOpen, true);
        const panel = el.querySelector('.gyrus-about__panel');
        if (panel) panel.focus();
      })
      .catch((err) => console.warn('[Gyrus] Could not open About:', err));
  }

  function closeAbout() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.removeEventListener('keydown', onKeydownWhileOpen, true);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  // --- toast -----------------------------------------------------------------
  let toastTimer = null;
  function showToast(text) {
    let toast = document.querySelector('.gyrus-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'gyrus-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    // next frame so the opacity transition runs on first show
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 5000);
  }

  // --- hidden key sequence ---------------------------------------------------
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  const WORD = ['c', 'l', 'a', 'y'];
  const keys = [];

  function isTyping(target) {
    if (!target || target === document.body) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'WEBVIEW';
  }

  function endsWith(seq) {
    if (keys.length < seq.length) return false;
    const tail = keys.slice(-seq.length);
    return seq.every((k, i) => tail[i] === k);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    keys.push(String(e.key).toLowerCase());
    if (keys.length > KONAMI.length) keys.shift();
    if (endsWith(WORD) || endsWith(KONAMI)) {
      keys.length = 0;
      showToast(CLAY_TOAST);
    }
  });

  // --- console greeting --------------------------------------------------------
  if (!window.__gyrusGreeted) {
    window.__gyrusGreeted = true;
    const head = 'font: 500 20px "Space Grotesk", system-ui, sans-serif;';
    const body = 'font: 400 12px "Space Grotesk", system-ui, sans-serif;';
    console.log('%cGyrus', head);
    console.log('%cRaihan: OMEGA DEVTOOLS PUSH! Za console is open!!', body);
    console.log('%cKaaustaaub: console thing in the middle', body);
    console.log('%cArya: go you go!!', body);
    console.log('%cWho built this: click About at the bottom of the left rail, or run GyrusEasterEggs.openAbout().', body);
  }

  window.GyrusEasterEggs = { openAbout, closeAbout };
})();
