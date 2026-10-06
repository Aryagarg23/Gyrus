// Backend client with a demo fallback.
//
// searchQuery(query), addLinks(payload), getGraph() first try the real Flask API
// on http://127.0.0.1:5000 with the same request shapes app.js always used. If the
// backend is not there, or a call fails, they fall back to a local demo
// implementation (a small fake, see "Demo crews") and set window.GYRUS_DEMO = true. With the real backend, a
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
  // Mode tracking. Demo mode puts `is-demo` on <html>; the start screen and task
  // view show their one-line demo note from that (styles: .demo-only).
  // ---------------------------------------------------------------------------
  window.GYRUS_DEMO = false;
  const listeners = [];

  function setDemo(on) {
    const changed = window.GYRUS_DEMO !== on;
    window.GYRUS_DEMO = on;
    document.documentElement.classList.toggle('is-demo', on);
    if (!changed) return;
    listeners.forEach((fn) => { try { fn(on); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('gyrus:mode', { detail: { demo: on } }));
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

  // Served from a website (the copy on aryagarg23.com), there is no local
  // backend to find, and asking for 127.0.0.1 makes browsers prompt visitors
  // for local-network access. Only the Electron app (file://) and a local dev
  // server look for it.
  const LOCAL_PAGE = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

  async function backendReachable() {
    if (!LOCAL_PAGE) return false;
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

  async function withFallback(real, demo) {
    try {
      const data = await real();
      setDemo(false);
      return data;
    } catch (_) {
      // No backend (or it failed): answer locally. Not an error in demo mode.
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

  const INTENT_NAMES = ['Research', 'News', 'Transactional', 'Navigational', 'Answer'];

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
  // Demo crews: a small fake, not a search. No web request is made. Each source
  // is a local stand-in page (demo-page.html) whose title says "(example)", so
  // nothing here can be mistaken for a real paper or article: no authors, DOIs,
  // journals or numbers. The three start-screen examples have canned crews;
  // any other query gets generic stand-ins built from its own words.
  //
  // The step lines name the real crews in backend/MCP: the research crew is a
  // Query Enhancer and a Learning Router (researchcrew.py), the news crew a
  // News Router and a News Explainer (newscrew_http.py).
  // ---------------------------------------------------------------------------
  function demoPageUrl(params) {
    const url = new URL('demo-page.html', location.href);
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, String(v)); });
    return url.href;
  }

  const CANNED = {
    'why do we procrastinate': {
      rewrite: 'psychology of procrastination: mood, task aversion and present bias',
      sources: [
        ['Procrastination as mood repair: an overview (example)', 'Semantic Scholar', 'Explains the main idea: putting a task off makes you feel better now.'],
        ['Task aversion and delay: why some tasks feel harder (example)', 'Semantic Scholar', 'Covers which kinds of tasks people put off most.'],
        ['Present bias and the planning gap (example)', 'arXiv', 'A modelling angle on why later always looks easier.'],
        ['Ways to reduce procrastination: a survey of approaches (example)', 'arXiv', 'Moves from why it happens to what helps.'],
      ],
    },
    'latest on neuromorphic chips': {
      sources: [
        ['Neuromorphic chips: where the field stands this year (example)', 'NewsAPI', 'A recent roundup, good for the big picture.'],
        ['A new low-power chip design, explained (example)', 'NewsAPI', 'Covers the latest announcement in plain terms.'],
        ['Coverage of neuromorphic computing over time (example)', 'GDELT', 'Shows when the topic has been in the news.'],
      ],
    },
  };

  function cannedFor(query) {
    const key = String(query || '').toLowerCase().replace(/[?.!]+$/, '').replace(/\s+/g, ' ').trim();
    return CANNED[key] || null;
  }

  // The topic inside a query, for generic stand-in titles: "latest news on
  // fusion power" -> "Fusion power". Drops a leading intent phrase and the end
  // punctuation; falls back to the query as typed.
  function topicOf(query) {
    const raw = String(query || '').trim().replace(/[?.!]+$/, '');
    const topic = raw
      .replace(/^(what('s| is) )?(the )?(latest|recent|breaking|today'?s?)( news)?( on| about| in)?\s+/i, '')
      .replace(/^news( on| about| in)?\s+/i, '')
      .replace(/^(why|how) (do|does|did|is|are|can)\s+/i, '')
      .replace(/^(what|who) (is|are|was|were)\s+/i, '')
      .replace(/^(buy|order|cheapest|cheap|best)( a| an| the)?\s+/i, '')
      .replace(/(\s+(news|today|this week))+$/i, '')
      .trim() || raw;
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  function genericSources(query, intent) {
    const q = topicOf(query);
    if (intent === 'Research') {
      return [
        [`${q}: an introduction (example)`, 'Semantic Scholar', 'A starting point that lays out the basics.'],
        [`${q}: key ideas and evidence (example)`, 'Semantic Scholar', 'Goes one level deeper than the introduction.'],
        [`${q}: open questions (example)`, 'arXiv', 'Shows what is still argued about.'],
        [`${q}: a short history (example)`, 'arXiv', 'Explains how the current view came about.'],
      ];
    }
    return [
      [`${q}: what happened this week (example)`, 'NewsAPI', 'The most recent story on this.'],
      [`${q}: background to the story (example)`, 'NewsAPI', 'Fills in what you need to follow the news.'],
      [`${q}: coverage over time (example)`, 'GDELT', 'Shows when this has been in the news.'],
    ];
  }

  function demoCrew(query, intent) {
    const canned = cannedFor(query);
    const rows = (canned && canned.sources) || genericSources(query, intent);
    const kind = intent === 'Research' ? 'research' : 'news';
    const links = rows.map(([title, source, why]) => ({
      title,
      link: demoPageUrl({ kind, title, source, why }),
      snippet: why,
      source,
      why,
    }));
    const count = `Collected ${links.length} sources`;
    const steps = intent === 'Research'
      ? [
        `Query enhancer: rewrote your search as "${(canned && canned.rewrite) || `${topicOf(query).toLowerCase()}: key ideas, evidence and open questions`}"`,
        'Learning router: picked arXiv and Semantic Scholar',
        count,
      ]
      : [
        'News router: picked NewsAPI and GDELT',
        'News explainer: put the stories in date order',
        count,
      ];
    return { links, steps };
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
      console.error(`[api] new-query failed (${err.message}); the search still worked`);
    }
  }

  // options.intent (demo only): run as this intent instead of classifying.
  // The real backend classifies for itself and takes no such option.
  async function searchQuery(query, options = {}) {
    return withFallback(
      async () => {
        const data = await callReal('/api/search', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ query }) }, 180000);
        await recordNewQuery(query, (data && data.intent) || 'Answer');
        return data;
      },
      () => {
        // Same shape as backend/src/app.py /api/search.
        const intent = INTENT_NAMES.includes(options.intent) ? options.intent : classifyIntent(query);
        recordSearch(query);
        if (intent === 'Research' || intent === 'News') {
          const crew = demoCrew(query, intent);
          return { links: crew.links, intent, steps: crew.steps, demo: true };
        }
        return { query, intent, demo: true };
      }
    );
  }

  async function addLinks(payload) {
    return withFallback(
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
    demoPageUrl,
    isDemo: () => window.GYRUS_DEMO,
    onModeChange: (fn) => { if (typeof fn === 'function') listeners.push(fn); },
  };

  // Probe once at startup so the demo note shows before the first search.
  const startupProbe = () => backendReachable().then((ok) => setDemo(!ok));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startupProbe);
  } else {
    startupProbe();
  }
})();
