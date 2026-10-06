// Main application logic.
//
// Layout: a persistent left rail (New search, Tasks, Memory, About) and a main
// area that shows one of four views (body[data-view]):
//   start  the empty state: what Gyrus is, a search box, three examples
//   run    a search happening: the intent guess, then the crew's steps
//   task   a task: its intent, what the crew did, and its reading list
//   page   one open page, with a bar leading back to the list it came from
//
// A search goes to js/api.js (the real backend, or the demo fake). Research
// and News results become a task with one source per link; everything else
// is a normal page in the permanent General task.

// "@name words" shortcuts in the search box. Kept, not advertised: they only
// show when you type "@".
const SEARCH_ENGINES = [
  { name: 'google', description: 'Search Google' },
  { name: 'bing', description: 'Search Bing' },
  { name: 'youtube', description: 'Search YouTube' },
  { name: 'github', description: 'Search GitHub' },
  { name: 'stackoverflow', description: 'Search Stack Overflow' },
  { name: 'reddit', description: 'Search Reddit' },
  { name: 'wikipedia', description: 'Search Wikipedia' },
  { name: 'arxiv', description: 'Search arXiv papers' },
  { name: 'twitter', description: 'Search Twitter' },
  { name: 'linkedin', description: 'Search LinkedIn' },
  { name: 'amazon', description: 'Search Amazon' },
  { name: 'ebay', description: 'Search eBay' },
  { name: 'spotify', description: 'Search Spotify' },
  { name: 'netflix', description: 'Search Netflix' },
  { name: 'medium', description: 'Search Medium' },
  { name: 'quora', description: 'Search Quora' },
  { name: 'discord', description: 'Search Discord' },
  { name: 'slack', description: 'Search Slack' },
  { name: 'notion', description: 'Search Notion' },
  { name: 'figma', description: 'Search Figma' }
];

// [homepage, (encodedQuery) => search URL] per @engine.
const ENGINE_URLS = {
  google: ['https://www.google.com', (q) => `https://www.google.com/search?q=${q}`],
  bing: ['https://www.bing.com', (q) => `https://www.bing.com/search?q=${q}`],
  youtube: ['https://www.youtube.com', (q) => `https://www.youtube.com/results?search_query=${q}`],
  github: ['https://github.com', (q) => `https://github.com/search?q=${q}`],
  stackoverflow: ['https://stackoverflow.com', (q) => `https://stackoverflow.com/search?q=${q}`],
  reddit: ['https://www.reddit.com', (q) => `https://www.reddit.com/search/?q=${q}`],
  wikipedia: ['https://en.wikipedia.org', (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${q}`],
  arxiv: ['https://arxiv.org', (q) => `https://arxiv.org/search/?query=${q}&searchtype=all&source=header`],
  twitter: ['https://twitter.com', (q) => `https://twitter.com/search?q=${q}`],
  linkedin: ['https://www.linkedin.com', (q) => `https://www.linkedin.com/search/results/all/?keywords=${q}`],
  amazon: ['https://www.amazon.com', (q) => `https://www.amazon.com/s?k=${q}`],
  ebay: ['https://www.ebay.com', (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`],
  spotify: ['https://open.spotify.com', (q) => `https://open.spotify.com/search/${q}`],
  netflix: ['https://www.netflix.com', (q) => `https://www.netflix.com/search?q=${q}`],
  medium: ['https://medium.com', (q) => `https://medium.com/search?q=${q}`],
  quora: ['https://www.quora.com', (q) => `https://www.quora.com/search?q=${q}`],
  discord: ['https://discord.com', (q) => `https://discord.com/search?q=${q}`],
  slack: ['https://slack.com', (q) => `https://slack.com/search?q=${q}`],
  notion: ['https://www.notion.so', (q) => `https://www.notion.so/search?q=${q}`],
  figma: ['https://www.figma.com', (q) => `https://www.figma.com/search?model_type=files&q=${q}`]
};

const AT_COMMANDS = [
  { name: 'duplicate', description: 'Copy a page' },
  { name: 'close', description: 'Close this page' },
  { name: 'closeall', description: 'Close every page in this task' },
  { name: 'newtask', description: 'Start an empty task' },
  { name: 'closetask', description: 'Close this task' }
];

// The five intents the classifier returns (backend/src/fivedvector.py), with
// the plain name and meaning a newcomer sees. Only Research and News send a crew.
const INTENTS = {
  Research: { name: 'Research', meaning: 'Understanding a topic in depth.', crew: 'research crew' },
  News: { name: 'News', meaning: "What's happening now.", crew: 'news crew' },
  Answer: { name: 'Answer', meaning: 'One quick fact.' },
  Transactional: { name: 'Shopping', meaning: 'Buying something.' },
  Navigational: { name: 'Site', meaning: 'Going to a specific site.' }
};
const INTENT_ORDER = ['Research', 'News', 'Answer', 'Transactional', 'Navigational'];

const NO_CREW_LINES = {
  Answer: 'This looks like a quick fact. Gyrus leaves these to a normal search and does not send a crew.',
  Transactional: 'This looks like shopping. Gyrus leaves these to a normal search and does not send a crew.',
  Navigational: 'This looks like a specific site. Gyrus leaves these to a normal search and does not send a crew.'
};

// With the real backend the crews don't report their steps, so these say what
// each crew is built to do (backend/MCP/researchcrew.py, newscrew_http.py).
// The demo fake supplies its own, more specific steps.
function defaultSteps(intent, count) {
  const collected = `Collected ${count} ${count === 1 ? 'source' : 'sources'}`;
  if (intent === 'Research') {
    return [
      'Query enhancer: rewrote your search to be clearer',
      'Learning router: chose from Exa, arXiv and Semantic Scholar',
      collected
    ];
  }
  return [
    'News router: chose from NewsAPI, GDELT and Exa',
    'News explainer: wrote a dated note for each story',
    collected
  ];
}

// The run screen: about 2.5 s in all, skippable (Skip button or Esc).
const RUN_TIMING = { think: 500, intent: 900, step: 600, open: 500, still: 1500 };

const LOBOTOMY_TITLE = 'Self-lobotomy';
const LOBOTOMY_ORIGIN = 'You asked for an AI chat site';

// Real chat products. A URL matches when its hostname is one of these or a
// subdomain of one. Company homepages (openai.com, anthropic.com) are not chat
// products and are left out on purpose.
const LLM_CHAT_DOMAINS = [
  'chat.com',
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'perplexity.ai',
  'poe.com',
  'character.ai',
  'replika.com',
  'jasper.ai',
  'writesonic.com',
  'copy.ai',
  'rytr.me',
  'simplified.co',
  'contentbot.ai',
  'peppertype.ai'
];

// A query that is exactly one of these also counts. Generic words ("copy",
// "character", "simplified") are left out: they are real searches.
const LLM_CHAT_NAMES = new Set([
  'chatgpt', 'chat gpt', 'openai', 'claude', 'anthropic', 'gemini', 'bard',
  'copilot', 'perplexity', 'poe', 'replika', 'jasper', 'writesonic', 'rytr',
  'contentbot', 'peppertype'
]);

// Line icons: 16px, 2px round stroke, currentColor (see .icon in _controls.css).
const svgIcon = (paths) => `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  close: svgIcon('<path d="M4 4l8 8M12 4l-8 8"/>'),
  check: svgIcon('<path d="M3.5 8.5l3 3 6-7"/>'),
  general: svgIcon('<circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c1.7 1.6 2.5 3.4 2.5 5.5S9.7 11.9 8 13.5M8 2.5C6.3 4.1 5.5 5.9 5.5 8s.8 3.9 2.5 5.5"/>'),
  Research: svgIcon('<path d="M2.5 3.5h4A1.5 1.5 0 0 1 8 5v8.5A1.5 1.5 0 0 0 6.5 12h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8.5A1.5 1.5 0 0 1 9.5 12h4z"/>'),
  News: svgIcon('<rect x="2.5" y="3" width="11" height="10" rx="1.5"/><path d="M5 6h6M5 8.5h6M5 11h3.5"/>'),
  task: svgIcon('<rect x="3" y="2.5" width="10" height="11" rx="1.5"/><path d="M5.5 6h5M5.5 8.5h5"/>')
};

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDemo = () => !!window.GYRUS_DEMO;

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
}

class App {
  constructor() {
    // The permanent General task: everyday searches (Answer, Shopping, Site),
    // typed addresses and @-searches.
    this.general = { id: 'general', title: 'General', isGeneral: true, tabs: [] };
    this.tasks = [];
    this.activeTask = null;   // the task shown in the task or page view
    this.activeTab = null;    // the page shown in the page view
    this.view = 'start';
    this.run = null;          // the search currently on the run screen

    this.el = {
      rail: document.querySelector('.rail'),
      railTasks: document.querySelector('.rail__tasks'),
      start: document.getElementById('start-container'),
      searchForm: document.querySelector('.search'),
      searchInput: document.querySelector('.search__input'),
      runView: document.getElementById('run-view'),
      taskView: document.getElementById('task-view'),
      pageView: document.getElementById('webview-container'),
      urlBar: document.querySelector('.url-bar__input'),
      webview: document.getElementById('browser-webview'),
      modal: document.getElementById('network-modal')
    };

    this.setupRail();
    this.setupSearch();
    this.setupWebview();
    this.setupPageBar();
    this.setupMemory();
    this.setupWindowControls();
    this.setupKeyboard();
    this.preventZoomFunctionality();

    this.renderRail();
    this.setView('start');
    this.el.searchInput?.focus();
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  setView(view) {
    this.view = view;
    document.body.dataset.view = view;
    this.el.start.hidden = view !== 'start';
    this.el.runView.hidden = view !== 'run';
    this.el.taskView.hidden = view !== 'task';
    // The page view is never display:none, so Electron's <webview> keeps its
    // page; CSS hides it unless body[data-view="page"].
    this.el.pageView.setAttribute('aria-hidden', view === 'page' ? 'false' : 'true');
    this.renderRail();
  }

  openStart({ focus = true } = {}) {
    this.cancelRun();
    this.activeTask = null;
    this.activeTab = null;
    if (this.el.searchInput) this.el.searchInput.value = '';
    this.setView('start');
    if (focus) this.el.searchInput?.focus();
  }

  openTask(task) {
    this.cancelRun();
    this.activeTask = task;
    this.activeTab = null;
    this.renderTaskView();
    this.setView('task');
    this.el.taskView.querySelector('.task__title')?.focus({ preventScroll: true });
  }

  openTab(task, tab) {
    this.cancelRun();
    this.activeTask = task;
    this.activeTab = tab;
    const firstVisit = !tab.visited;
    tab.visited = true;

    if (this.el.webview) this.el.webview.src = tab.url;
    if (this.el.urlBar) this.el.urlBar.value = this.displayAddress(tab.url);
    this.renderPageBar();
    this.setView('page');

    // A crew source you open becomes a CLICKED link in the memory graph.
    if (firstVisit && !task.isGeneral && task.query && tab.isSource) {
      window.GyrusAPI.addLinks({ links: [tab.url], query: task.query, intent: task.intent })
        .catch((error) => console.error('Error calling add-links API:', error));
    }
  }

  // "Back to sources" / "Back to General".
  backToList() {
    if (this.activeTask) this.openTask(this.activeTask);
    else this.openStart();
  }

  // ---------------------------------------------------------------------------
  // Tasks and pages
  // ---------------------------------------------------------------------------

  addTask({ query, intent, steps, sources = [], searchId = null, demo = false }) {
    const task = {
      id: uid(),
      title: query,
      query,
      intent,
      steps: steps || [],
      searchId,
      demo,
      tabs: sources.map((link) => this.newTab({
        url: link.link,
        title: link.title || hostOf(link.link) || 'Untitled source',
        source: link.source || hostOf(link.link),
        why: link.why || link.snippet || '',
        isSource: true,
        fixedTitle: true
      }))
    };
    this.tasks.push(task);
    this.renderRail();
    return task;
  }

  newTab({ url, title, source = '', why = '', origin = '', isSource = false, fixedTitle = false, query = null, intent = null, searchId = null }) {
    return { id: uid(), url, title: title || hostOf(url) || 'Page', source, why, origin, isSource, fixedTitle, query, intent, searchId, visited: false };
  }

  addGeneralTab(fields) {
    const tab = this.newTab(fields);
    this.general.tabs.push(tab);
    this.renderRail();
    return tab;
  }

  // Answer / Shopping / Site (or a crew that came back empty): a normal search
  // in General. In demo mode this is a local stand-in page, never a real URL.
  addGeneralSearch(query, intent, searchId, { crewFoundNothing = false, failed = false } = {}) {
    const info = INTENTS[intent] || INTENTS.Answer;
    let url;
    if (isDemo()) {
      const kind = { Transactional: 'shopping', Navigational: 'site' }[intent] || 'answer';
      url = window.GyrusAPI.demoPageUrl(kind === 'site'
        ? { kind, title: `${query} (example)` }
        : { kind, q: query });
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    let origin = `${info.name}: a normal search, no crew`;
    if (crewFoundNothing) origin = `${info.name}: the crew found nothing, so this is a normal search`;
    if (failed) origin = 'Something went wrong, so this is a normal search';
    return this.addGeneralTab({
      url,
      title: query,
      source: info.name,
      why: origin,
      origin,
      fixedTitle: true,
      query,
      intent,
      searchId
    });
  }

  // Undo what one search created (used when the intent is corrected).
  removeSearch(searchId) {
    if (!searchId) return;
    this.tasks = this.tasks.filter((task) => task.searchId !== searchId);
    this.general.tabs = this.general.tabs.filter((tab) => tab.searchId !== searchId);
    if (this.activeTask && this.activeTask.searchId === searchId) {
      this.activeTask = null;
      this.activeTab = null;
    }
    this.renderRail();
  }

  closeTask(task) {
    if (!task || task.isGeneral) return;
    this.tasks = this.tasks.filter((t) => t !== task);
    this.renderRail();
    if (this.activeTask === task) this.openStart();
  }

  closeTab(task, tab) {
    if (!task || !tab) return;
    task.tabs = task.tabs.filter((t) => t !== tab);
    this.renderRail();
    if (this.activeTab === tab) {
      if (task.isGeneral && task.tabs.length === 0) this.openStart();
      else this.openTask(task);
    } else if (this.view === 'task' && this.activeTask === task) {
      this.renderTaskView();
    }
  }

  // ---------------------------------------------------------------------------
  // Rail
  // ---------------------------------------------------------------------------

  setupRail() {
    document.querySelector('.rail__new')?.addEventListener('click', () => this.openStart());
    document.querySelector('.rail__memory')?.addEventListener('click', () => this.openMemory());
    // easter-eggs.js owns the About panel; looked up at click time.
    document.querySelector('.rail__about')?.addEventListener('click', () => window.GyrusEasterEggs?.openAbout?.());
  }

  renderRail() {
    const list = this.el.railTasks;
    if (!list) return;
    list.innerHTML = '';
    const showing = this.view === 'task' || this.view === 'page';

    [this.general, ...this.tasks].forEach((task) => {
      const isActive = showing && this.activeTask === task;
      const meta = task.isGeneral ? 'Everyday searches' : (INTENTS[task.intent]?.name || 'Task');
      const row = this.rowElement({
        className: 'rail__task',
        isActive,
        icon: task.isGeneral ? ICONS.general : (ICONS[task.intent] || ICONS.task),
        title: task.title,
        meta,
        count: task.tabs.length,
        countLabel: task.isGeneral ? 'Pages' : 'Sources',
        closeLabel: task.isGeneral ? null : 'Close task',
        onOpen: () => this.openTask(task),
        onClose: () => this.closeTask(task)
      });
      list.appendChild(row);
    });

    document.querySelector('.rail__new')?.classList.toggle('is-active', this.view === 'start');
  }

  // The one list row (.row in _controls.css). Focusable; Enter or Space opens it.
  rowElement({ className, isActive, icon, title, meta, count, countLabel, closeLabel, onOpen, onClose }) {
    const row = document.createElement('div');
    row.className = `row ${className}${isActive ? ' is-active' : ''}`;
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.title = meta ? `${title} (${meta})` : title;
    if (isActive) row.setAttribute('aria-current', 'true');
    row.innerHTML = `
      ${icon ? `<span class="rail__icon">${icon}</span>` : ''}
      <span class="row__text">
        <span class="row__title">${escapeHtml(title)}</span>
        ${meta ? `<span class="row__meta">${escapeHtml(meta)}</span>` : ''}
      </span>
      ${count !== undefined ? `<span class="row__count" title="${escapeHtml(countLabel || '')}">${count}</span>` : ''}
      ${closeLabel ? `<button class="icon-button icon-button--sm icon-button--quiet row__close" type="button" title="${closeLabel}" aria-label="${closeLabel}">${ICONS.close}</button>` : ''}
    `;
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row__close')) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      onOpen();
    });
    row.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === row) {
        e.preventDefault();
        onOpen();
      }
    });
    return row;
  }

  // ---------------------------------------------------------------------------
  // Search box (start screen)
  // ---------------------------------------------------------------------------

  setupSearch() {
    const form = this.el.searchForm;
    const input = this.el.searchInput;
    if (!form || !input) return;

    const suggestions = document.createElement('div');
    suggestions.className = 'search__suggestions suggestions panel';
    suggestions.setAttribute('role', 'listbox');
    suggestions.hidden = true;
    form.appendChild(suggestions);

    let items = [];
    let selected = -1;

    const hide = () => {
      suggestions.hidden = true;
      selected = -1;
    };
    const fillWith = (text) => {
      input.value = text;
      hide();
      input.focus();
    };
    const pick = (s) => {
      if (s.type === 'duplicate') {
        input.value = `@duplicate ${s.name}`;
        submit();
      } else {
        fillWith(`@${s.name} `);
      }
    };
    const show = () => {
      items = this.buildSuggestions(input.value);
      if (items.length === 0) { hide(); return; }
      suggestions.innerHTML = '';
      items.forEach((s) => {
        const item = this.suggestionElement(s);
        item.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus
        item.addEventListener('click', () => pick(s));
        suggestions.appendChild(item);
      });
      suggestions.hidden = false;
      selected = -1;
    };
    const move = (step) => {
      const rows = suggestions.querySelectorAll('.row');
      if (rows.length === 0) return;
      rows[selected]?.classList.remove('is-selected');
      selected = (selected + step + rows.length) % rows.length;
      rows[selected].classList.add('is-selected');
      rows[selected].scrollIntoView({ block: 'nearest' });
    };

    const submit = () => {
      const query = input.value.trim();
      if (!query) return;
      hide();
      this.submitQuery(query);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!suggestions.hidden && selected >= 0 && items[selected]) {
        pick(items[selected]);
        return;
      }
      submit();
    });

    input.addEventListener('input', show);
    input.addEventListener('keydown', (e) => {
      if (!suggestions.hidden) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
        if (e.key === 'Escape') { e.stopPropagation(); hide(); return; }
      }
      if (e.key === 'Tab' && input.value.startsWith('@')) {
        const completion = this.completeSuggestion(input.value);
        if (completion) {
          e.preventDefault();
          fillWith(completion.text);
          if (completion.type === 'duplicate') submit();
        }
      }
    });
    input.addEventListener('blur', () => setTimeout(hide, 150));

    document.querySelectorAll('.example').forEach((button) => {
      button.addEventListener('click', () => {
        input.value = button.dataset.query || button.textContent.trim();
        submit();
      });
    });
  }

  // Suggestions for "@..." input: commands, search engines, and with
  // "@duplicate words" the matching pages of the current task.
  buildSuggestions(text) {
    if (!text.startsWith('@')) return [];
    const term = text.substring(1).toLowerCase();
    const matches = (item) =>
      item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term);

    const suggestions = [
      ...AT_COMMANDS.filter(matches).map((c) => ({ type: 'command', name: c.name, description: c.description })),
      ...SEARCH_ENGINES.filter(matches).map((e) => ({ type: 'engine', name: e.name, description: e.description }))
    ];

    if (term.startsWith('duplicate')) {
      const wanted = term.substring(9).trim();
      this.currentTabs().forEach((tab) => {
        if (tab.title.toLowerCase().includes(wanted) || tab.url.toLowerCase().includes(wanted)) {
          suggestions.push({ type: 'duplicate', name: tab.title, description: 'Copy this page', tab });
        }
      });
    }
    return suggestions;
  }

  // Exactly-one completion for Tab: an engine name, or a single duplicate match.
  completeSuggestion(text) {
    if (!text.startsWith('@')) return null;
    const term = text.substring(1).toLowerCase();
    const engines = SEARCH_ENGINES.filter((e) => e.name.startsWith(term));
    if (engines.length === 1) return { type: 'engine', text: `@${engines[0].name} ` };

    if (term.startsWith('duplicate')) {
      const wanted = term.substring(9).trim();
      const tabs = this.currentTabs().filter((tab) =>
        tab.title.toLowerCase().startsWith(wanted) || tab.url.toLowerCase().includes(wanted));
      if (tabs.length === 1) return { type: 'duplicate', text: `@duplicate ${tabs[0].title}` };
    }
    return null;
  }

  suggestionElement(suggestion) {
    const item = document.createElement('div');
    item.className = 'row';
    item.setAttribute('role', 'option');
    const name = suggestion.type === 'duplicate' ? '@duplicate' : `@${suggestion.name}`;
    const description = suggestion.type === 'duplicate' ? suggestion.name : suggestion.description;
    item.innerHTML = `
      <span class="row__text">
        <span class="row__title">${escapeHtml(name)}</span>
        <span class="row__meta">${escapeHtml(description)}</span>
      </span>
    `;
    return item;
  }

  currentTabs() {
    return (this.activeTask || this.general).tabs;
  }

  // Everything typed into the search box comes through here.
  async submitQuery(query) {
    // Team joke: asking for a chatbot gets you the lobotomy page.
    if (this.isLLMProvider(query)) {
      const tab = this.addGeneralTab({ url: this.getLobotomyUrl(query), title: LOBOTOMY_TITLE, origin: LOBOTOMY_ORIGIN, why: LOBOTOMY_ORIGIN, fixedTitle: true });
      this.openTab(this.general, tab);
      return;
    }

    // "@engine words", "@command", or a typed address: no backend involved.
    const isAtCommand = /^@(\w+)(?:\s+(.+))?$/.test(query);
    const looksLikeUrl = /^https?:\/\//i.test(query) ||
      (!/\s/.test(query) && /\.(com|org|net|ai|io|dev|edu|gov)(\/|:|\?|#|$)/i.test(query));
    if (isAtCommand || looksLikeUrl) {
      this.processUrlInput(query);
      return;
    }

    await this.runSearch(query);
  }

  // ---------------------------------------------------------------------------
  // The run: intent guess, then the crew (or a normal search)
  // ---------------------------------------------------------------------------

  // Waits ms, or less if the run is skipped or cancelled.
  wait(run, ms) {
    if (run.skip || run.cancelled || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        run.wakers.delete(done);
        resolve();
      }
      run.wakers.add(done);
    });
  }

  wake(run) {
    [...run.wakers].forEach((fn) => fn());
  }

  skipRun() {
    if (!this.run) return;
    this.run.skip = true;
    this.wake(this.run);
  }

  // Leaving the run screen stops the animation. What the search created stays.
  cancelRun() {
    if (!this.run) return;
    this.run.cancelled = true;
    this.wake(this.run);
    this.run = null;
    this.closeChooser({ resume: false });
  }

  // forcedIntent comes from "Not right?"; replaces is the search it corrects.
  async runSearch(query, { forcedIntent = null, replaces = null } = {}) {
    this.cancelRun();
    const run = { query, skip: false, cancelled: false, held: false, wakers: new Set(), result: null };
    this.run = run;
    this.activeTask = null;
    this.activeTab = null;
    this.renderRunThinking(query);
    this.setView('run');

    const started = Date.now();
    // The real crews can take a while; say so if the wait gets long.
    const slowNote = setTimeout(() => {
      const thinking = this.run === run && this.el.runView.querySelector('.run__thinking');
      if (!thinking) return;
      const note = document.createElement('p');
      note.className = 'run__slow caption';
      note.textContent = 'Research and news crews can take a minute.';
      thinking.after(note);
    }, 3000);
    let data;
    if (forcedIntent && !INTENTS[forcedIntent].crew && !isDemo()) {
      // The real backend classifies for itself; a correction to an everyday
      // intent needs no crew, so it skips the backend.
      data = { query, intent: forcedIntent };
    } else {
      try {
        data = await window.GyrusAPI.searchQuery(query, forcedIntent ? { intent: forcedIntent } : {});
      } catch (error) {
        console.error('Error calling backend API:', error);
        data = { query, intent: 'Answer', failed: true };
      }
    }
    clearTimeout(slowNote);
    await this.wait(run, RUN_TIMING.think - (Date.now() - started));

    if (replaces) this.removeSearch(replaces);

    const intent = INTENTS[data.intent] ? data.intent : 'Answer';
    const links = INTENTS[intent].crew ? (Array.isArray(data) ? data : (data.links || [])) : [];
    const searchId = uid();

    if (links.length > 0) {
      run.result = {
        task: this.addTask({
          query,
          intent,
          steps: Array.isArray(data.steps) ? data.steps : defaultSteps(intent, links.length),
          sources: links,
          searchId,
          demo: !!data.demo
        })
      };
    } else {
      run.result = {
        tab: this.addGeneralSearch(data.query || query, intent, searchId, {
          crewFoundNothing: !!INTENTS[intent].crew,
          failed: !!data.failed
        })
      };
    }
    run.intent = intent;
    run.searchId = searchId;

    if (run.cancelled) return;
    this.renderRunOutcome(run);

    if (reducedMotion()) {
      // No ticking: everything shows at once, then the task opens.
      this.setAllSteps('is-done');
      await this.wait(run, RUN_TIMING.still);
    } else {
      await this.wait(run, RUN_TIMING.intent);
      const steps = [...this.el.runView.querySelectorAll('.step')];
      for (const step of steps) {
        if (run.skip || run.cancelled) break;
        step.className = 'step is-active';
        await this.wait(run, RUN_TIMING.step);
        step.className = 'step is-done';
      }
      await this.wait(run, RUN_TIMING.open);
    }
    if (!run.held) this.finishRun(run);
  }

  finishRun(run) {
    if (this.run !== run || run.cancelled) return;
    this.run = null;
    if (run.result.task) this.openTask(run.result.task);
    else this.openTab(this.general, run.result.tab);
  }

  setAllSteps(state) {
    this.el.runView.querySelectorAll('.step').forEach((step) => { step.className = `step ${state}`; });
  }

  renderRunThinking(query) {
    this.el.runView.innerHTML = `
      <div class="run">
        <p class="label">You searched</p>
        <h1 class="run__query">${escapeHtml(query)}</h1>
        <div class="run__guess card">
          <p class="run__thinking">Working out what you're trying to do</p>
        </div>
        <button class="run__skip button button--text" type="button">Skip</button>
      </div>
    `;
    this.el.runView.querySelector('.run__skip').addEventListener('click', () => this.skipRun());
  }

  renderRunOutcome(run) {
    const info = INTENTS[run.intent];
    const task = run.result.task;
    const crewHtml = task
      ? `
        <div class="crew card">
          <h2 class="crew__title label">The ${escapeHtml(info.crew)} at work</h2>
          ${this.stepsHtml(task.steps, 'is-pending')}
        </div>`
      : `<p class="run__note">${escapeHtml(info.crew
        ? `The ${info.crew} found nothing for this, so Gyrus opens a normal search.`
        : NO_CREW_LINES[run.intent])}</p>`;

    this.el.runView.innerHTML = `
      <div class="run">
        <p class="label">You searched</p>
        <h1 class="run__query">${escapeHtml(run.query)}</h1>
        ${this.intentHtml(run.intent, 'run__guess card')}
        ${crewHtml}
        <button class="run__skip button button--text" type="button">${task ? 'Skip to the sources' : 'Skip'}</button>
      </div>
    `;
    this.el.runView.querySelector('.run__skip').addEventListener('click', () => this.skipRun());
    this.el.runView.querySelector('.intent__fix').addEventListener('click', (e) => {
      // Hold the run where it is while the user picks.
      run.held = true;
      this.skipRun();
      this.setAllSteps('is-done');
      this.openChooser(e.currentTarget, { query: run.query, current: run.intent, replaces: run.searchId, run });
    });
  }

  // "Gyrus thinks you're doing: Research" + meaning + "Not right?"
  intentHtml(intent, className) {
    const info = INTENTS[intent] || INTENTS.Answer;
    return `
      <div class="intent ${className}">
        <p class="intent__guess"><span class="intent__lead">Gyrus thinks you're doing:</span> <strong class="intent__name">${escapeHtml(info.name)}</strong></p>
        <p class="intent__meaning caption">${escapeHtml(info.meaning)}</p>
        <button class="intent__fix button button--text" type="button" aria-haspopup="true">Not right?</button>
      </div>
    `;
  }

  stepsHtml(steps, state) {
    return `<ol class="steps">${steps.map((text) => `
      <li class="step ${state}">
        <span class="step__mark" aria-hidden="true">${ICONS.check}</span>
        <span class="step__text">${escapeHtml(text)}</span>
      </li>`).join('')}</ol>`;
  }

  // ---------------------------------------------------------------------------
  // "Not right?": pick another intent and run the search again
  // ---------------------------------------------------------------------------

  openChooser(anchor, { query, current, replaces, run = null }) {
    this.closeChooser({ resume: false });
    const chooser = document.createElement('div');
    chooser.className = 'chooser panel';
    chooser.setAttribute('role', 'menu');
    chooser.setAttribute('aria-label', 'What are you trying to do?');

    // The real backend decides on its own whether to send a crew, so a
    // correction can only move a search to an everyday intent.
    const canForceCrew = isDemo();
    const options = INTENT_ORDER.filter((key) => key === current || !INTENTS[key].crew || canForceCrew);

    chooser.innerHTML = `
      <p class="chooser__head label">What are you trying to do?</p>
      ${options.map((key) => `
        <button class="row${key === current ? ' is-active' : ''}" type="button" role="menuitem" data-intent="${key}"${key === current ? ' aria-current="true"' : ''}>
          <span class="row__text">
            <span class="row__title">${escapeHtml(INTENTS[key].name)}</span>
            <span class="row__meta">${escapeHtml(INTENTS[key].meaning)}</span>
          </span>
        </button>`).join('')}
      ${canForceCrew ? '' : '<p class="chooser__note caption">With the backend running, Gyrus decides by itself when to send a crew.</p>'}
    `;
    chooser.addEventListener('click', (e) => {
      const button = e.target.closest('[data-intent]');
      if (!button) return;
      const intent = button.dataset.intent;
      if (intent === current) {
        this.closeChooser({ resume: true });
        return;
      }
      this.closeChooser({ resume: false });
      this.runSearch(query, { forcedIntent: intent, replaces });
    });
    document.body.appendChild(chooser);

    const rect = anchor.getBoundingClientRect();
    const width = chooser.offsetWidth;
    chooser.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - chooser.offsetHeight - 8)}px`;
    chooser.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;

    this.chooser = { el: chooser, run, anchor };
    anchor.setAttribute('aria-expanded', 'true');
    chooser.querySelector('button:not(.is-active)')?.focus();
  }

  // resume: carry on to where the run was going.
  closeChooser({ resume }) {
    if (!this.chooser) return;
    const { el, run, anchor } = this.chooser;
    this.chooser = null;
    el.remove();
    anchor?.setAttribute('aria-expanded', 'false');
    if (run && resume) {
      run.held = false;
      this.finishRun(run);
    } else if (anchor && document.body.contains(anchor)) {
      anchor.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Task view
  // ---------------------------------------------------------------------------

  renderTaskView() {
    const task = this.activeTask;
    const view = this.el.taskView;
    if (!task) { view.innerHTML = ''; return; }

    const cards = task.tabs.map((tab, i) => `
      <button class="source card${tab.visited ? ' is-visited' : ''}" type="button" data-index="${i}">
        <span class="source__top">
          <span class="source__name label">${escapeHtml(tab.source || hostOf(tab.url))}</span>
          ${tab.visited ? `<span class="source__read caption">${ICONS.check}Read</span>` : ''}
        </span>
        <span class="source__title">${escapeHtml(tab.title)}</span>
        ${tab.why ? `<span class="source__why">${escapeHtml(tab.why)}</span>` : ''}
      </button>`).join('');

    if (task.isGeneral) {
      view.innerHTML = `
        <div class="task">
          <header class="task__head">
            <p class="label">Task</p>
            <h1 class="task__title" tabindex="-1">General</h1>
            <p class="task__intro caption">Everyday searches Gyrus left alone: quick facts, shopping and sites. No crew is sent for these.</p>
          </header>
          <section class="task__list" aria-label="Pages">
            <h2 class="label">${task.tabs.length === 1 ? '1 page' : `${task.tabs.length} pages`}</h2>
            ${task.tabs.length ? `<div class="sources">${cards}</div>`
              : '<p class="task__empty caption">Nothing here yet. Quick facts, shopping and sites you search for will land here.</p>'}
          </section>
        </div>
      `;
    } else {
      const unread = task.tabs.filter((t) => !t.visited).length;
      view.innerHTML = `
        <div class="task">
          <header class="task__head">
            <p class="label">Task</p>
            <h1 class="task__title" tabindex="-1">${escapeHtml(task.title)}</h1>
            ${task.intent ? this.intentHtml(task.intent, 'task__intent') : ''}
          </header>
          ${task.steps.length ? `
          <section class="crew card" aria-label="What the crew did">
            <h2 class="crew__title label">What the ${escapeHtml(INTENTS[task.intent]?.crew || 'crew')} did</h2>
            ${this.stepsHtml(task.steps, 'is-done')}
          </section>` : ''}
          <section class="task__list" aria-label="Reading list">
            <h2 class="label">Reading list${task.tabs.length ? `: ${task.tabs.length} ${task.tabs.length === 1 ? 'source' : 'sources'}, ${unread} unread` : ''}</h2>
            ${task.tabs.length ? `<div class="sources">${cards}</div>`
              : '<p class="task__empty caption">No sources in this task yet.</p>'}
          </section>
          ${task.demo ? '<p class="task__demo caption">Demo: the crew and its sources are simulated.</p>' : ''}
        </div>
      `;
      view.querySelector('.intent__fix')?.addEventListener('click', (e) => {
        this.openChooser(e.currentTarget, { query: task.query, current: task.intent, replaces: task.searchId });
      });
    }

    view.querySelectorAll('.source').forEach((card) => {
      card.addEventListener('click', () => this.openTab(task, task.tabs[Number(card.dataset.index)]));
    });
  }

  // ---------------------------------------------------------------------------
  // Page view
  // ---------------------------------------------------------------------------

  setupPageBar() {
    document.querySelector('.page__back')?.addEventListener('click', () => this.backToList());
    document.querySelector('.page__intent')?.addEventListener('click', (e) => {
      const tab = this.activeTab;
      if (!tab || !tab.query || !tab.intent) return;
      this.openChooser(e.currentTarget, { query: tab.query, current: tab.intent, replaces: tab.searchId });
    });
  }

  renderPageBar() {
    const tab = this.activeTab;
    const task = this.activeTask;
    if (!tab || !task) return;
    const label = document.querySelector('.page__back-label');
    if (label) label.textContent = task.isGeneral ? 'Back to General' : 'Back to sources';
    const title = document.querySelector('.page__title');
    if (title) title.textContent = tab.title;
    const origin = document.querySelector('.page__origin');
    if (origin) {
      origin.textContent = task.isGeneral ? (tab.origin || '') : `${tab.source ? `${tab.source}, ` : ''}picked by the ${INTENTS[task.intent]?.crew || 'crew'}`;
    }
    const fix = document.querySelector('.page__intent');
    if (fix) fix.hidden = !(tab.query && tab.intent);
    this.updateOpenLink();
  }

  // In a plain browser most external sites refuse to load in a frame, so offer
  // the real tab. Electron's <webview> loads them itself.
  updateOpenLink() {
    const open = document.querySelector('.page__open');
    if (!open) return;
    const url = this.el.webview?.src || '';
    const show = !window.GYRUS_IN_ELECTRON && !!window.GyrusPlatform?.isExternal(url);
    open.hidden = !show;
    if (show) open.href = url;
  }

  setupWebview() {
    const webview = this.el.webview;
    const urlBar = this.el.urlBar;
    const loading = document.querySelector('.webview-loading');
    if (!webview) return;

    const showLobotomy = (destination) => {
      const url = this.getLobotomyUrl(destination);
      webview.src = url;
      if (this.activeTab) {
        Object.assign(this.activeTab, { url, title: LOBOTOMY_TITLE, origin: LOBOTOMY_ORIGIN, why: LOBOTOMY_ORIGIN });
        this.renderPageBar();
      }
    };

    webview.addEventListener('did-start-loading', () => { if (loading) loading.hidden = false; });
    webview.addEventListener('did-stop-loading', () => {
      if (loading) loading.hidden = true;
      const tab = this.activeTab;
      if (tab && !tab.fixedTitle) {
        tab.title = webview.getTitle() || tab.title;
        this.renderPageBar();
        this.renderRail();
      }
    });
    webview.addEventListener('did-fail-load', () => { if (loading) loading.hidden = true; });

    webview.addEventListener('did-navigate', (e) => {
      if (this.isLLMProvider(e.url)) {
        showLobotomy(e.url);
        return;
      }
      if (urlBar) urlBar.value = this.displayAddress(e.url);
      if (this.activeTab && e.url !== 'about:blank') this.activeTab.url = e.url;
      this.updateOpenLink();
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      // demo-page.html's "Back to sources" link, inside Electron's <webview>.
      if (/demo-page\.html[^#]*#back$/.test(e.url || '')) {
        this.backToList();
        return;
      }
      if (urlBar) urlBar.value = this.displayAddress(e.url);
      if (this.activeTab) this.activeTab.url = e.url;
    });

    // The same link inside the plain-browser iframe posts a message instead.
    window.addEventListener('message', (e) => {
      if (e.source && e.source === webview.contentWindow && e.data && e.data.gyrus === 'back') {
        this.backToList();
      }
    });

    // Address bar: an address opens in this page; anything with spaces (or no
    // dot) is a normal search. In demo mode that search is a stand-in page.
    urlBar?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        urlBar.value = this.displayAddress(this.activeTab?.url || '');
        urlBar.blur();
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const typed = urlBar.value.trim();
      if (!typed) return;
      urlBar.blur();

      if (this.isLLMProvider(typed)) {
        if (this.activeTab) showLobotomy(typed);
        else this.submitQuery(typed);
        return;
      }

      let url = typed;
      let title = typed;
      if (!/^(https?|about|file):/i.test(typed)) {
        const isSearch = /\s/.test(typed) || !typed.includes('.');
        if (isSearch) {
          url = isDemo()
            ? window.GyrusAPI.demoPageUrl({ kind: 'search', q: typed })
            : `https://www.google.com/search?q=${encodeURIComponent(typed)}`;
        } else {
          url = `https://${typed}`;
        }
      } else {
        title = hostOf(typed) || typed;
      }
      const tab = this.addGeneralTab({ url, title, origin: 'Opened what you typed in the address bar', why: 'Opened what you typed in the address bar', fixedTitle: false });
      this.openTab(this.general, tab);
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
      if (webview.canGoBack()) webview.goBack();
      else this.backToList();
    });
    document.getElementById('forward-btn')?.addEventListener('click', () => {
      if (webview.canGoForward()) webview.goForward();
    });
  }

  // ---------------------------------------------------------------------------
  // @-commands and typed addresses (search box)
  // ---------------------------------------------------------------------------

  // "a | b" (or ; ,) opens several. Pages land in General; the @-commands act on
  // the task you are in.
  processUrlInput(input) {
    const delimiter = ['|', ';', ','].find((d) => input.includes(d));
    if (delimiter) {
      input.split(delimiter).map((part) => part.trim()).filter(Boolean)
        .forEach((part) => this.processUrlInput(part));
      return;
    }

    const atMatch = input.match(/^@(\w+)(?:\s+(.+))?$/);
    if (atMatch) {
      const name = atMatch[1].toLowerCase();
      const argument = (atMatch[2] || '').trim();
      const task = this.activeTask || this.general;

      switch (name) {
        case 'duplicate': {
          if (!argument) return;
          const wanted = argument.toLowerCase();
          const match = task.tabs.find((tab) =>
            tab.title.toLowerCase().includes(wanted) || tab.url.toLowerCase().includes(wanted));
          if (match) {
            const copy = { ...match, id: uid(), title: `${match.title} (copy)`, visited: false, searchId: null };
            task.tabs.push(copy);
            this.renderRail();
            this.openTab(task, copy);
          }
          return;
        }
        case 'close':
          if (this.activeTab) this.closeTab(task, this.activeTab);
          return;
        case 'closeall':
          task.tabs = [];
          this.renderRail();
          if (task.isGeneral) this.openStart(); else this.openTask(task);
          return;
        case 'newtask':
          this.openTask(this.addTask({ query: 'New task', intent: null }));
          return;
        case 'closetask':
          if (!task.isGeneral) this.closeTask(task);
          return;
        default:
          break;
      }

      // "@engine words" searches that site; "@engine" alone opens it.
      const engine = ENGINE_URLS[name] ? name : 'google';
      const [homeUrl, searchUrl] = ENGINE_URLS[engine];
      let url = argument ? searchUrl(encodeURIComponent(argument)) : homeUrl;
      if (this.isLLMProvider(argument) || this.isLLMProvider(url)) {
        const tab = this.addGeneralTab({ url: this.getLobotomyUrl(url), title: LOBOTOMY_TITLE, origin: LOBOTOMY_ORIGIN, why: LOBOTOMY_ORIGIN, fixedTitle: true });
        this.openTab(this.general, tab);
        return;
      }
      if (isDemo() && argument) {
        url = window.GyrusAPI.demoPageUrl({ kind: 'search', q: argument, title: `${argument}: ${engine} search (example)` });
      }
      const origin = argument ? `Opened a ${engine} search` : `Opened ${engine}`;
      const tab = this.addGeneralTab({ url, title: argument ? `${engine} search: ${argument}` : engine, origin, why: origin, fixedTitle: !!argument });
      this.openTab(this.general, tab);
      return;
    }

    const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    try {
      new URL(url);
    } catch (e) {
      return;
    }
    if (this.isLLMProvider(url)) {
      const tab = this.addGeneralTab({ url: this.getLobotomyUrl(url), title: LOBOTOMY_TITLE, origin: LOBOTOMY_ORIGIN, why: LOBOTOMY_ORIGIN, fixedTitle: true });
      this.openTab(this.general, tab);
      return;
    }
    const origin = 'Opened the address you typed';
    const tab = this.addGeneralTab({ url, title: hostOf(url) || input, origin, why: origin });
    this.openTab(this.general, tab);
  }

  // Team joke: real navigation to a chat product goes to lobotomy.html.
  // Matches a URL whose hostname is (or is under) a chat product's domain, or a
  // query that is exactly a product name or domain. Searching "claude shannon
  // information theory", or a search URL that merely contains a name, does not.
  isLLMProvider(input) {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) return false;

    if (LLM_CHAT_NAMES.has(raw.replace(/\s+/g, ' '))) return true;
    if (/\s/.test(raw)) return false; // a phrase, not an address

    let url;
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`);
    } catch (_) {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const host = url.hostname.replace(/^www\./, '');
    if (host === 'bing.com' && url.pathname.startsWith('/chat')) return true;
    return LLM_CHAT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }

  // Demo stand-in pages live at a long local demo-page.html?... address.
  // Show where the source would have come from instead.
  displayAddress(url) {
    try {
      const u = new URL(url, window.location.href);
      if (/demo-page\.html$/.test(u.pathname)) {
        return `${u.searchParams.get('source') || 'Search'} (example page)`;
      }
    } catch (_) { /* not a URL: show as is */ }
    return url;
  }

  // lobotomy.html sits next to index.html, so it is same-origin and loads in
  // the page area in both Electron and a plain browser. It offers "Proceed with
  // lobotomy" when it knows where you were going, so pass the destination as
  // ?to= (http/https only).
  getLobotomyUrl(destination = '') {
    const page = new URL('lobotomy.html', window.location.href);
    const raw = String(destination || '').trim();
    if (raw && !/\s/.test(raw)) {
      try {
        const target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
        if (target.hostname.includes('.')) page.searchParams.set('to', target.href);
      } catch (_) { /* not a URL: no way through */ }
    }
    return page.href;
  }

  // ---------------------------------------------------------------------------
  // Memory
  // ---------------------------------------------------------------------------

  setupMemory() {
    const modal = this.el.modal;
    if (!modal) return;
    modal.querySelector('.network-modal__overlay')?.addEventListener('click', () => this.closeMemory());
    modal.querySelector('.network-modal__close')?.addEventListener('click', () => this.closeMemory());
    document.getElementById('refresh-network')?.addEventListener('click', () => this.updateNetworkGraph());
  }

  openMemory() {
    const modal = this.el.modal;
    if (!modal) return;
    this.memoryReturnFocus = document.activeElement;
    modal.classList.add('is-visible');
    document.querySelector('.rail__memory')?.classList.add('is-active');
    modal.querySelector('.network-modal__close')?.focus();
    this.updateNetworkGraph();
  }

  closeMemory() {
    this.el.modal?.classList.remove('is-visible');
    document.querySelector('.rail__memory')?.classList.remove('is-active');
    this.memoryReturnFocus?.focus?.();
    this.memoryReturnFocus = null;
  }

  // Draws the memory graph. Topics are filled squares, searches open circles,
  // links small dots, all in text colours. Clicking a node turns it and its
  // edges orange; that is the only use of colour.
  async updateNetworkGraph() {
    const container = document.getElementById('network-graph');
    if (!container) return;

    const showMessage = (title, detail) => {
      container.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'network-graph__empty';
      const strong = document.createElement('strong');
      strong.textContent = title;
      const p = document.createElement('span');
      p.textContent = detail;
      box.append(strong, p);
      container.appendChild(box);
    };

    if (typeof d3 === 'undefined') {
      showMessage('The graph could not be drawn.', 'Its drawing library (d3) did not load. Check your connection and try Refresh.');
      return;
    }

    container.innerHTML = '';

    let nodes = [];
    let links = [];

    try {
      const data = await window.GyrusAPI.getGraph();
      if (data && data.concepts && data.queries && data.relationships) {
        // Older backend shape: names plus relationships.
        nodes = [
          ...data.concepts.map((name, i) => ({ id: `concept_${i}`, name, type: 'concept' })),
          ...data.queries.map((name, i) => ({ id: `query_${i}`, name, type: 'query' }))
        ];
        links = data.relationships.map((r) => ({ source: r.source, target: r.target }));
      } else if (data && data.nodes && data.links) {
        nodes = data.nodes;
        links = data.links;
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
    }

    if (nodes.length === 0) {
      showMessage('Nothing here yet.', 'Search for something and it will show up here.');
      return;
    }

    // Drop edges whose ends are missing, so d3 doesn't throw.
    const ids = new Set(nodes.map((n) => n.id));
    links = links.filter((l) => ids.has(l.source) && ids.has(l.target));

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Memory graph with ${nodes.length} items`);

    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Links show their host; a demo stand-in shows its title instead.
    const shortName = (d) => {
      if (d.type !== 'link') return d.name.length > 40 ? d.name.slice(0, 40) + '...' : d.name;
      try {
        const u = new URL(d.name);
        if (/demo-page\.html$/.test(u.pathname)) {
          const t = u.searchParams.get('title') || 'Demo page';
          return t.length > 40 ? t.slice(0, 40) + '...' : t;
        }
        return u.hostname.replace(/^www\./, '');
      } catch (_) { return d.name; }
    };

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'graph-link');

    const node = g.append('g')
      .selectAll('.graph-node')
      .data(nodes)
      .enter()
      .append((d) => document.createElementNS('http://www.w3.org/2000/svg', d.type === 'concept' ? 'rect' : 'circle'))
      .attr('class', (d) => `graph-node graph-node--${d.type === 'concept' || d.type === 'query' ? d.type : 'link'}`)
      .each(function (d) {
        const el = d3.select(this);
        if (d.type === 'concept') el.attr('width', 14).attr('height', 14);
        else el.attr('r', d.type === 'query' ? 6 : 3.5);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('title').text((d) => shortName(d) === d.name ? d.name : `${shortName(d)}\n${d.name}`);

    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', (d) => `graph-label${d.type === 'concept' ? ' graph-label--concept' : ''}`)
      .attr('dx', 10)
      .attr('dy', 4)
      .text(shortName);

    let selectedId = null;
    const select = (id) => {
      selectedId = selectedId === id ? null : id;
      const endId = (end) => (typeof end === 'object' ? end.id : end);
      node.classed('is-selected', (d) => d.id === selectedId);
      label.classed('is-selected', (d) => d.id === selectedId);
      link.classed('is-highlighted', (l) => selectedId !== null &&
        (endId(l.source) === selectedId || endId(l.target) === selectedId));
    };
    node.on('click', (event, d) => {
      event.stopPropagation();
      select(d.id);
    });

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked);

    svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.15, height * 0.15).scale(0.7));

    function ticked() {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.each(function (d) {
        const el = d3.select(this);
        if (d.type === 'concept') el.attr('x', d.x - 7).attr('y', d.y - 7);
        else el.attr('cx', d.x).attr('cy', d.y);
      });

      label
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y);
    }

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Window, keyboard, zoom
  // ---------------------------------------------------------------------------

  setupWindowControls() {
    document.getElementById('close-btn')?.addEventListener('click', () => window.electronAPI.closeWindow());
    document.getElementById('minimize-btn')?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    document.getElementById('maximize-btn')?.addEventListener('click', () => window.electronAPI.maximizeWindow());
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.openStart();
        return;
      }
      if (e.key !== 'Escape') return;
      // One overlay at a time, innermost first. The About panel handles its own Esc.
      if (this.chooser) {
        e.preventDefault();
        this.closeChooser({ resume: true });
      } else if (this.el.modal?.classList.contains('is-visible')) {
        e.preventDefault();
        this.closeMemory();
      } else if (this.view === 'run') {
        e.preventDefault();
        this.skipRun();
      }
    });

    // Clicking outside the chooser closes it.
    document.addEventListener('mousedown', (e) => {
      if (this.chooser && !this.chooser.el.contains(e.target) && e.target !== this.chooser.anchor) {
        this.closeChooser({ resume: true });
      }
    });
  }

  // Block zoom shortcuts and gestures on the shell (pages keep their own).
  preventZoomFunctionality() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '0'].includes(e.key)) {
        e.preventDefault();
      }
    });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, (e) => e.preventDefault());
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  componentManager.initialize().then(() => {
    window.gyrusApp = new App();
  });
});
