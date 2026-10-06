// Backend client with a demo fallback.
//
// searchQuery(query), addLinks(payload), getGraph() first try the real Flask API
// on http://127.0.0.1:5000 with the same request shapes app.js always used. If the
// backend is not there, or a call fails, they fall back to a local demo
// implementation and set window.GYRUS_DEMO = true. With the real backend, a
// search is /api/search then /api/new-query (query + intent), so the memory
// graph gets its Concept nodes; demo mode records the same shape locally.
//
// Reachability: GET /api/health with a 1.5s timeout, cached for 20s. Only a 200
// with {"ok": true} counts, because on macOS the AirPlay Receiver also listens on
// port 5000 and answers with a 403. The real call itself then gets a long timeout,
// since the Research/News crews can take a while.
(function () {
  const API_BASE = 'http://127.0.0.1:5000';
  const PROBE_TIMEOUT_MS = 1500;
  const PROBE_CACHE_MS = 20000;
  const STORAGE_KEY = 'gyrus.demoGraph.v1';

  // ---------------------------------------------------------------------------
  // Mode tracking + indicator hook
  // ---------------------------------------------------------------------------
  window.GYRUS_DEMO = false;
  const listeners = [];

  function setDemo(on) {
    const changed = window.GYRUS_DEMO !== on;
    window.GYRUS_DEMO = on;
    renderIndicator();
    if (!changed) return;
    listeners.forEach((fn) => { try { fn(on); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('gyrus:mode', { detail: { demo: on } }));
  }

  // Bottom-left note; styles in styles/06-components/_demo-indicator.css.
  function renderIndicator() {
    if (!document.body) return;
    let el = document.getElementById('gyrus-demo-indicator');
    if (!window.GYRUS_DEMO) {
      if (el) el.hidden = true;
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'gyrus-demo-indicator';
      el.className = 'demo-indicator';
      el.setAttribute('role', 'status');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = 'Demo mode.';
      el.append(label, ' No backend running, so the crews return search links instead of results.');
      document.body.appendChild(el);
    }
    el.hidden = false;
  }

  // ---------------------------------------------------------------------------
  // Real backend
  // ---------------------------------------------------------------------------
  let probe = { at: 0, ok: false, pending: null };

  async function fetchWithTimeout(url, options, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function backendReachable() {
    if (Date.now() - probe.at < PROBE_CACHE_MS) return probe.ok;
    if (probe.pending) return probe.pending;
    probe.pending = (async () => {
      let ok = false;
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/health`, { method: 'GET' }, PROBE_TIMEOUT_MS);
        if (res.ok) {
          const body = await res.json();
          ok = !!(body && body.ok === true);
        }
      } catch (_) {
        ok = false;
      }
      probe = { at: Date.now(), ok, pending: null };
      return ok;
    })();
    return probe.pending;
  }

  async function callReal(path, options, timeoutMs) {
    if (!(await backendReachable())) throw new Error('backend not reachable');
    const res = await fetchWithTimeout(`${API_BASE}${path}`, options, timeoutMs);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }

  async function withFallback(name, real, demo) {
    try {
      const data = await real();
      setDemo(false);
      return data;
    } catch (err) {
      console.warn(`[api] ${name}: real backend unavailable (${err.message}); using demo`);
      setDemo(true);
      return demo();
    }
  }

  // ---------------------------------------------------------------------------
  // Demo intent classifier
  //
  // Mirrors the five backend intents (backend/src/fivedvector.py INTENT_LABELS).
  // Rules, applied to the lowercased query:
  //   Research      paper(s), study/studies, research, arxiv, survey, literature,
  //                 journal, thesis, theory, evidence, mechanism, "how does", "why do/does/is"
  //   News          news, today, latest, breaking, headline(s), this week, yesterday,
  //                 announced, update(s)
  //   Transactional buy, price(s), cheap/cheapest, order, deal(s), discount, coupon,
  //                 subscribe, for sale, shipping, cost
  //   Navigational  a site name (youtube, github, gmail, wikipedia, reddit, amazon,
  //                 netflix, linkedin, twitter, facebook, instagram, stackoverflow),
  //                 or "login", "sign in", "homepage", "website", "go to", "open "
  //   Answer        anything that scores zero on all of the above
  // Score = number of distinct rules matched per intent. Highest score wins; ties go
  // to the earlier intent in the order Research, News, Transactional, Navigational.
  // ---------------------------------------------------------------------------
  const INTENT_RULES = [
    ['Research', [/\bpapers?\b/, /\bstud(y|ies)\b/, /\bresearch\b/, /\barxiv\b/, /\bsurvey\b/, /\bliterature\b/,
      /\bjournal\b/, /\bthesis\b/, /\btheory\b/, /\bevidence\b/, /\bmechanism\b/, /\bhow does\b/, /\bwhy (do|does|is)\b/]],
    ['News', [/\bnews\b/, /\btoday\b/, /\blatest\b/, /\bbreaking\b/, /\bheadlines?\b/, /\bthis week\b/,
      /\byesterday\b/, /\bannounced\b/, /\bupdates?\b/]],
    ['Transactional', [/\bbuy\b/, /\bprices?\b/, /\bcheap(est)?\b/, /\border\b/, /\bdeals?\b/, /\bdiscount\b/,
      /\bcoupon\b/, /\bsubscribe\b/, /\bfor sale\b/, /\bshipping\b/, /\bcost\b/]],
    ['Navigational', [/\b(youtube|github|gmail|wikipedia|reddit|amazon|netflix|linkedin|twitter|facebook|instagram|stackoverflow)\b/,
      /\blog ?in\b/, /\bsign in\b/, /\bhomepage\b/, /\bwebsite\b/, /\bgo to\b/, /^open /]],
  ];

  function classifyIntent(query) {
    const q = String(query || '').toLowerCase();
    let best = 'Answer';
    let bestScore = 0;
    for (const [intent, rules] of INTENT_RULES) {
      const score = rules.filter((re) => re.test(q)).length;
      if (score > bestScore) {
        best = intent;
        bestScore = score;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Demo crew links: real search URLs for the sources the crews use. No invented
  // titles, authors or results. Exa (no public search page found) and NewsAPI
  // (no public UI) are skipped.
  // ---------------------------------------------------------------------------
  function demoCrewLinks(query, intent) {
    const q = encodeURIComponent(query);
    const crew = intent === 'Research' ? 'research' : 'news';
    const note = (source) =>
      `A live ${source} search for this query. This is a demo stand-in: with the ` +
      `backend running, the ${crew} crew reads the results and picks the links itself.`;
    if (intent === 'Research') {
      return [
        { title: `arXiv: search for ${query}`, link: `https://arxiv.org/search/?query=${q}&searchtype=all`, snippet: note('arXiv') },
        { title: `Semantic Scholar: search for ${query}`, link: `https://www.semanticscholar.org/search?q=${q}`, snippet: note('Semantic Scholar') },
      ];
    }
    return [
      { title: `GDELT: article list for ${query}`, link: `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=html`, snippet: note('GDELT') },
      { title: `Google News: search for ${query}`, link: `https://news.google.com/search?q=${q}`, snippet: note('Google News') },
    ];
  }

  // ---------------------------------------------------------------------------
  // Demo memory graph: Concept / Query / Link nodes, {nodes, links} format.
  // Edges mirror backend/src/query_orch.py: Concept-SEARCHED_BY->Query,
  // Query-CLICKED->Link. Kept in memory, mirrored to localStorage when allowed.
  // ---------------------------------------------------------------------------
  const STOPWORDS = new Set(('a an the of in on for to and or with about from by at is are was were be ' +
    'how what why when where which who whom does do did can could should would will i me my you your ' +
    'it its this that these those vs versus latest news today breaking buy price prices cheap cheapest ' +
    'order best top new paper papers study studies research arxiv explain explained').split(' '));

  function conceptFor(query) {
    const words = String(query || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w));
    const phrase = words.slice(0, 3).join(' ');
    return phrase || String(query || '').toLowerCase().trim().slice(0, 40) || 'untitled';
  }

  function emptyGraph() { return { nodes: [], links: [] }; }

  function loadGraph() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const g = JSON.parse(raw);
        if (g && Array.isArray(g.nodes) && Array.isArray(g.links)) return g;
      }
    } catch (_) { /* storage blocked or corrupt: fall through to seed */ }
    const seed = window.GYRUS_DEMO_SEED;
    return seed ? JSON.parse(JSON.stringify(seed)) : emptyGraph();
  }

  const graph = loadGraph();

  function saveGraph() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(graph)); } catch (_) { /* ignore */ }
  }

  function addNode(type, name) {
    const id = `${type}:${name}`;
    if (!graph.nodes.some((n) => n.id === id)) graph.nodes.push({ id, name, type });
    return id;
  }

  function addEdge(source, target, type) {
    if (!graph.links.some((l) => l.source === source && l.target === target && l.type === type)) {
      graph.links.push({ source, target, type });
    }
  }

  function recordSearch(query) {
    const text = String(query || '').trim();
    if (!text) return;
    const c = addNode('concept', conceptFor(text));
    const q = addNode('query', text);
    addEdge(c, q, 'SEARCHED_BY');
    saveGraph();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  const JSON_HEADERS = { 'Content-Type': 'application/json' };

  // backend/src/app.py /api/new-query files the query under a Concept node
  // (creating the Concept if nothing similar exists). It needs the intent, so it
  // runs after /api/search and before any /api/add-links for the same query.
  // A failure here is logged, not surfaced: the search result is still good.
  async function recordNewQuery(query, intent) {
    try {
      await callReal('/api/new-query', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ query, intent }),
      }, 60000);
    } catch (err) {
      console.warn(`[api] new-query failed (${err.message}); the search still worked`);
    }
  }

  async function searchQuery(query) {
    return withFallback(
      'search',
      async () => {
        const data = await callReal('/api/search', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ query }) }, 180000);
        await recordNewQuery(query, (data && data.intent) || 'Answer');
        return data;
      },
      () => {
        // Same shape as backend/src/app.py /api/search.
        const intent = classifyIntent(query);
        recordSearch(query);
        if (intent === 'Research' || intent === 'News') {
          return { links: demoCrewLinks(query, intent), intent };
        }
        return { query, intent };
      }
    );
  }

  async function addLinks(payload) {
    return withFallback(
      'add-links',
      () => callReal('/api/add-links', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }, 15000),
      () => {
        const text = String((payload && payload.query) || '').trim();
        const urls = (payload && Array.isArray(payload.links)) ? payload.links : [];
        if (text) {
          recordSearch(text);
          const q = `query:${text}`;
          urls.filter(Boolean).forEach((url) => addEdge(q, addNode('link', String(url)), 'CLICKED'));
          saveGraph();
        }
        return 'Success!';
      }
    );
  }

  async function getGraph() {
    return withFallback(
      'get-graph',
      () => callReal('/api/get-graph', { method: 'GET', headers: JSON_HEADERS }, 15000),
      // Deep copy: d3.forceLink replaces source/target ids with node objects.
      () => JSON.parse(JSON.stringify(graph))
    );
  }

  window.GyrusAPI = {
    searchQuery,
    addLinks,
    getGraph,
    classifyIntent,
    isDemo: () => window.GYRUS_DEMO,
    onModeChange: (fn) => { if (typeof fn === 'function') listeners.push(fn); },
  };

  // Probe once at startup so the indicator shows before the first search.
  const startupProbe = () => backendReachable().then((ok) => setDemo(!ok));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startupProbe);
  } else {
    startupProbe();
  }
})();
