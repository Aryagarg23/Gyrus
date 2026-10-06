// Main application logic

// Panel sizes. Keep in step with --header-element-height and --sidebar-width
// in styles/01-settings/_spacing.css.
const HEADER_HEIGHT_PX = 48;
const SIDEBAR_WIDTH_PX = 200;

// "@name words" shortcuts, shared by the query box and the tabs panel input.
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
  { name: 'duplicate', description: 'Copy a tab' },
  { name: 'close', description: 'Close this tab' },
  { name: 'closeall', description: 'Close every tab in this task' },
  { name: 'newtask', description: 'Start an empty task' },
  { name: 'closetask', description: 'Close this task' }
];

// Plain names for the five intents the classifier returns.
const INTENT_NAMES = {
  Research: 'Research',
  News: 'News',
  Answer: 'Answer',
  Navigational: 'Finding a site',
  Transactional: 'Buying something'
};

const LOBOTOMY_TITLE = 'Self-lobotomy';

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

// A query that is exactly one of these also counts. Generic words from the old
// list ("copy", "character", "simplified") are left out: they are real searches.
const LLM_CHAT_NAMES = new Set([
  'chatgpt', 'chat gpt', 'openai', 'claude', 'anthropic', 'gemini', 'bard',
  'copilot', 'perplexity', 'poe', 'replika', 'jasper', 'writesonic', 'rytr',
  'contentbot', 'peppertype'
]);

// Line icons: 16px, 2px round stroke, currentColor (see .icon in _controls.css).
const ICON_CLOSE = '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class App {
  constructor() {
    this.tasks = [];
    this.activeTaskIndex = 0;
    this.activeTabIndex = 0;
    this.hasActiveWebview = false;

    // The permanent General task holds Navigational, Transactional and Answer
    // searches, typed addresses and @-searches.
    this.generalTask = {
      id: 'general-permanent',
      title: 'General',
      intent: null,
      tabs: [],
      createdAt: new Date(),
      isGeneralTask: true
    };

    this.isGeneralTaskActive = true;

    // Last search, sent with add-links calls.
    this.currentQuery = null;
    this.currentIntent = null;

    // The preview card (plain browser) asks us what we know about a URL.
    if (window.GyrusPlatform) {
      window.GyrusPlatform.describeUrl = (url) => this.describeUrl(url);
    }

    this.initializeEventListeners();
    this.waitForComponents();
  }

  // Whichever task is showing: General or a regular one.
  get activeTask() {
    return this.isGeneralTaskActive ? this.generalTask : this.tasks[this.activeTaskIndex];
  }

  // Tabs of whichever task is active (General or a regular task). Tabs live under
  // tasks; setupWebview's handlers read this.tabs, which was never defined.
  get tabs() {
    const task = this.activeTask;
    return task ? task.tabs : [];
  }

  // Every task's tabs, General first.
  allTabs() {
    return [this.generalTask, ...this.tasks].flatMap((task) => task.tabs);
  }

  // For the plain-browser preview card (js/platform.js).
  describeUrl(url) {
    const tab = this.tabs.find((t) => t.url === url) || this.allTabs().find((t) => t.url === url);
    if (!tab) return null;
    return { title: tab.title, snippet: tab.snippet, origin: tab.origin };
  }

  async waitForComponents() {
    // Components are inserted before App starts; this is a safety net.
    for (let attempt = 0; attempt < 50; attempt++) {
      if (document.querySelector('.sidebar') && document.querySelector('.sidebar__add-tab')) {
        this.initializeTasks();
        this.setupTaskManagement();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.error('Failed to load components after 5 seconds');
    this.createFallbackTaskButton();
  }

  createFallbackTaskButton() {
    const sidebarContainer = document.querySelector('#sidebar-container');
    if (!sidebarContainer) return;
    sidebarContainer.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-background"></div>
        <div class="sidebar__content">
          <div class="sidebar__header">
            <h3 class="sidebar__title label">Tasks</h3>
            <button class="sidebar__add-tab" type="button" title="New search (Ctrl+T)" aria-label="New search">+</button>
          </div>
          <div class="sidebar__tab-list"></div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.initializeTasks();
      this.setupTaskManagement();
    }, 100);
  }

  initializeEventListeners() {
    this.setupWindowControls();
    this.setupButtonActiveStates();
    this.setupQueryInput();
    this.setupMenuButton();
    this.setupNetworkButton();
    this.setupWebview();
    this.setupHeaderVisibility();
    this.preventZoomFunctionality();
    this.setupCollapsedQueryInput();
  }

  initializeTasks() {
    // Start with no tasks. General is always there.
    this.isGeneralTaskActive = true;
    this.renderTasks();
    this.renderTabs();
  }

  setupTaskManagement() {
    // Delegated, because the task list is re-rendered often.
    document.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar__add-tab')) {
        e.preventDefault();
        e.stopPropagation();
        this.openQueryInput();
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        this.openQueryInput();
      }
    });
  }

  // Back to the start page: the query box, focused.
  openQueryInput() {
    this.deactivateWebview();
    const queryInputTextArea = document.querySelector('.query-input__text-area');
    if (queryInputTextArea) {
      setTimeout(() => queryInputTextArea.focus(), 100);
    }
  }

  createTask(title = 'New task', intent = null) {
    const task = {
      id: Date.now() + Math.random(),
      title: title,
      intent: intent,
      tabs: [],
      createdAt: new Date()
    };

    this.tasks.push(task);
    this.renderTasks();
    this.switchToTask(this.tasks.length - 1);
  }

  newTab(url, title, snippet, origin) {
    return {
      id: Date.now() + Math.random(),
      url: url,
      title: title || 'New tab',
      snippet: snippet || '',
      origin: origin || '',
      favicon: this.getFaviconUrl(url),
      webview: null
    };
  }

  // Adds a tab to the active regular task (creating one if needed).
  // Pass { recordLink: false } when the caller sends links to the backend itself.
  async createTab(url, title = 'New tab', snippet = '', origin = '', { recordLink = true } = {}) {
    if (this.tasks.length === 0 || this.isGeneralTaskActive) {
      this.createTask('New task');
    }

    const activeTask = this.tasks[this.activeTaskIndex];
    if (!activeTask) return;

    activeTask.tabs.push(this.newTab(url, title, snippet, origin));
    this.renderTasks();
    this.renderTabs();
    this.switchToTab(activeTask.tabs.length - 1);

    if (recordLink) {
      await this.addLinksToBackend([url]);
    }
  }

  createTabInGeneralTask(url, title = 'New tab', snippet = '', origin = '') {
    this.generalTask.tabs.push(this.newTab(url, title, snippet, origin));
    this.renderTasks();
    this.renderTabs();
    this.switchToTab(this.generalTask.tabs.length - 1);
  }

  // One add-links call for any number of URLs (the API takes a list).
  async addLinksToBackend(urls) {
    // Only links that came from a search in a regular task are recorded.
    if (!this.currentQuery || this.isGeneralTaskActive || !urls.length) return;

    try {
      await window.GyrusAPI.addLinks({
        links: urls,
        query: this.currentQuery,
        intent: this.currentIntent
      });
    } catch (error) {
      // Recording the click is optional; never break the UI over it.
      console.error('Error calling add-links API:', error);
    }
  }

  switchToGeneralTask() {
    this.isGeneralTaskActive = true;
    this.activeTabIndex = 0;

    const webview = document.getElementById('browser-webview');
    const first = this.generalTask.tabs[0];
    if (webview) {
      webview.src = first ? first.url : 'about:blank';
    }

    const urlBarInput = document.querySelector('.url-bar__input');
    if (urlBarInput) {
      urlBarInput.value = first ? first.url : '';
    }

    this.renderTasks();
    this.renderTabs();
  }

  switchToTask(index) {
    if (index < 0 || index >= this.tasks.length) return;

    this.isGeneralTaskActive = false;
    this.activeTaskIndex = index;
    this.activeTabIndex = 0;

    const activeTask = this.tasks[index];

    if (activeTask.tabs.length > 0) {
      this.switchToTab(0);
    } else {
      const webview = document.getElementById('browser-webview');
      if (webview) {
        webview.src = 'about:blank';
      }
      const urlBarInput = document.querySelector('.url-bar__input');
      if (urlBarInput) {
        urlBarInput.value = '';
      }
    }

    this.renderTasks();
    this.renderTabs();
  }

  switchToTab(index) {
    const activeTask = this.activeTask;
    if (!activeTask || index < 0 || index >= activeTask.tabs.length) return;

    this.activeTabIndex = index;
    const activeTab = activeTask.tabs[index];

    const webview = document.getElementById('browser-webview');
    if (webview) {
      webview.src = activeTab.url;
    }

    const urlBarInput = document.querySelector('.url-bar__input');
    if (urlBarInput) {
      urlBarInput.value = activeTab.url;
    }

    this.renderTabs();
  }

  closeTask(index) {
    // General is not in this.tasks, so it can't be closed here.
    if (index < 0 || index >= this.tasks.length) return;

    this.tasks.splice(index, 1);

    if (this.tasks.length === 0) {
      this.switchToGeneralTask();
      this.showStartPageIfEmpty();
      return;
    }

    if (this.activeTaskIndex >= index) {
      this.activeTaskIndex = Math.max(0, this.activeTaskIndex - 1);
    }

    this.switchToTask(this.activeTaskIndex);
  }

  // Works for General and regular tasks. Closing the last tab of a task leaves
  // it empty; if no tab is left anywhere, the start page comes back.
  closeTab(index) {
    const activeTask = this.activeTask;
    if (!activeTask || index < 0 || index >= activeTask.tabs.length) return;

    activeTask.tabs.splice(index, 1);

    if (this.activeTabIndex > index || this.activeTabIndex >= activeTask.tabs.length) {
      this.activeTabIndex = Math.max(0, this.activeTabIndex - 1);
    }

    this.renderTasks();

    if (activeTask.tabs.length === 0) {
      const webview = document.getElementById('browser-webview');
      if (webview) webview.src = 'about:blank';
      const urlBarInput = document.querySelector('.url-bar__input');
      if (urlBarInput) urlBarInput.value = '';
      this.activeTabIndex = 0;
      this.renderTabs();
      this.showStartPageIfEmpty();
      return;
    }

    this.switchToTab(this.activeTabIndex);
  }

  showStartPageIfEmpty() {
    if (this.allTabs().length === 0) {
      this.deactivateWebview();
    }
  }

  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return null;
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch (e) {
      return null;
    }
  }

  duplicateTab(tab) {
    const activeTask = this.activeTask;
    if (!activeTask) return;

    activeTask.tabs.push(this.newTab(tab.url, `${tab.title} (copy)`, tab.snippet, tab.origin));
    this.renderTasks();
    this.renderTabs();
    this.switchToTab(activeTask.tabs.length - 1);
  }

  renderTasks() {
    const tabList = document.querySelector('.sidebar__tab-list');
    if (!tabList) return;

    tabList.innerHTML = '';

    const rows = [this.generalTask, ...this.tasks];
    rows.forEach((task, i) => {
      const isGeneral = i === 0;
      const index = i - 1; // index into this.tasks
      const isActive = isGeneral ? this.isGeneralTaskActive
        : (!this.isGeneralTaskActive && index === this.activeTaskIndex);

      const kind = isGeneral ? 'Everyday searches' : (INTENT_NAMES[task.intent] || 'Task');
      const taskElement = this.rowElement({
        className: `sidebar__tab${isGeneral ? ' is-general-task' : ''}`,
        isActive,
        title: task.title,
        meta: kind,
        count: task.tabs.length,
        closeLabel: isGeneral ? null : 'Close task',
        onOpen: () => (isGeneral ? this.switchToGeneralTask() : this.switchToTask(index))
      });

      const closeButton = taskElement.querySelector('.row__close');
      closeButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTask(index);
      });

      tabList.appendChild(taskElement);
    });

    this.updateTabsPresence();
  }

  renderTabs() {
    const rightSidebar = document.querySelector('.right-sidebar__tab-list');
    if (!rightSidebar) return;

    rightSidebar.innerHTML = '';

    const activeTask = this.activeTask;

    if (activeTask && activeTask.tabs.length > 0) {
      activeTask.tabs.forEach((tab, index) => {
        const tabElement = this.rowElement({
          className: 'right-sidebar__tab',
          isActive: index === this.activeTabIndex,
          title: tab.title,
          favicon: tab.favicon,
          closeLabel: 'Close tab',
          onOpen: () => this.switchToTab(index)
        });

        tabElement.querySelector('.row__close').addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeTab(index);
        });

        rightSidebar.appendChild(tabElement);
      });
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'No tabs in this task yet.';
      rightSidebar.appendChild(empty);
    }

    this.updateTabsPresence();
    this.updatePageStatus();
  }

  // The one list row used for tasks and tabs (.row in _controls.css).
  // Focusable; Enter or Space opens it.
  rowElement({ className, isActive, title, meta, count, favicon, closeLabel, onOpen }) {
    const row = document.createElement('div');
    row.className = `row ${className}${isActive ? ' is-active' : ''}`;
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    if (isActive) row.setAttribute('aria-current', 'true');
    row.innerHTML = `
      ${favicon !== undefined ? `<span class="row__icon">${favicon ? `<img src="${escapeHtml(favicon)}" alt="" onerror="this.remove()">` : ''}</span>` : ''}
      <span class="row__text">
        <span class="row__title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        ${meta ? `<span class="row__meta label">${escapeHtml(meta)}</span>` : ''}
      </span>
      ${count !== undefined ? `<span class="row__count" title="Tabs in this task">${count}</span>` : ''}
      ${closeLabel ? `<button class="icon-button icon-button--sm icon-button--quiet row__close" type="button" title="${closeLabel}" aria-label="${closeLabel}">${ICON_CLOSE}</button>` : ''}
    `;
    row.addEventListener('click', (e) => {
      if (!e.target.closest('.row__close')) onOpen();
    });
    row.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === row) {
        e.preventDefault();
        onOpen();
      }
    });
    return row;
  }

  // The intro under the query box only shows until the first tab exists.
  updateTabsPresence() {
    document.body.classList.toggle('has-tabs', this.allTabs().length > 0);
  }

  // One quiet line above the page saying how the open tab got there.
  updatePageStatus() {
    const container = document.querySelector('#webview-container .webview-container');
    const status = container?.querySelector('.page-status');
    const text = status?.querySelector('.page-status__text');
    if (!container || !status || !text) return;

    const tab = this.tabs[this.activeTabIndex];
    const line = tab && tab.origin;
    text.textContent = line || '';
    status.hidden = !line;
    container.classList.toggle('has-status', !!line);
  }

  // What happened after a search, in one line. Uses the intent from the API.
  searchOutcome(intent, linkCount) {
    const name = INTENT_NAMES[intent] || intent || 'Answer';
    if (intent === 'Research' || intent === 'News') {
      const crew = intent === 'Research' ? 'research crew' : 'news crew';
      if (linkCount > 0) {
        return `${name}: the ${crew} found ${linkCount} ${linkCount === 1 ? 'source' : 'sources'}`;
      }
      return `${name}: the ${crew} found nothing, so this is a normal search`;
    }
    return `${name}: opened a normal search`;
  }

  setupWindowControls() {
    document
      .getElementById('close-btn')
      ?.addEventListener('click', () => window.electronAPI.closeWindow());
    document
      .getElementById('minimize-btn')
      ?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    document
      .getElementById('maximize-btn')
      ?.addEventListener('click', () => window.electronAPI.maximizeWindow());
  }

  setupButtonActiveStates() {
    const buttons = document.querySelectorAll('.nav-button');
    buttons.forEach(button => {
      button.addEventListener('mousedown', () => {
        button.classList.add('is-active');
      });
      button.addEventListener('mouseup', () => {
        button.classList.remove('is-active');
      });
      // Also remove class if mouse leaves the button while pressed
      button.addEventListener('mouseleave', () => {
        button.classList.remove('is-active');
      });
    });
  }

  // Suggestions for "@..." input: commands, search engines, and with
  // "@duplicate words" the matching tabs of the active task.
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
      this.tabs.forEach((tab) => {
        if (tab.title.toLowerCase().includes(wanted) || tab.url.toLowerCase().includes(wanted)) {
          suggestions.push({ type: 'duplicate', name: tab.title, description: 'Copy this tab', tab });
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
      const tabs = this.tabs.filter((tab) =>
        tab.title.toLowerCase().startsWith(wanted) || tab.url.toLowerCase().includes(wanted));
      if (tabs.length === 1) return { type: 'duplicate', text: `@duplicate ${tabs[0].title}` };
    }
    return null;
  }

  suggestionElement(className, suggestion) {
    const item = document.createElement('div');
    item.className = `row ${className}`;
    item.setAttribute('role', 'option');
    const name = suggestion.type === 'duplicate' ? '@duplicate' : `@${suggestion.name}`;
    const description = suggestion.type === 'duplicate' ? suggestion.name : suggestion.description;
    item.innerHTML = `
      <span class="row__text">
        <span class="row__title">${escapeHtml(name)}</span>
        <span class="row__meta label">${escapeHtml(description)}</span>
      </span>
    `;
    return item;
  }

  setupQueryInput() {
    const queryInput_container = document.querySelector('.query-input-container');
    const queryInput_textArea = document.querySelector('.query-input__text-area');
    const queryInput_sendButton = document.querySelector('.query-input__send-button');
    const focusOverlay = document.querySelector('.focus-overlay');
    const characterLimit = 50;

    if (!queryInput_container || !queryInput_textArea) return;

    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'query-input__autocomplete suggestions panel';
    autocompleteContainer.setAttribute('role', 'listbox');
    queryInput_container.appendChild(autocompleteContainer);

    let selectedIndex = -1;
    let filteredSuggestions = [];

    const placeCaretAtEnd = () => {
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(queryInput_textArea);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const fillWith = (text) => {
      queryInput_textArea.innerText = text;
      hideAutocomplete();
      queryInput_textArea.focus();
      placeCaretAtEnd();
    };

    const showAutocomplete = (text) => {
      const suggestions = this.buildSuggestions(text);
      if (suggestions.length === 0) {
        hideAutocomplete();
        return;
      }

      filteredSuggestions = suggestions;
      autocompleteContainer.innerHTML = '';

      suggestions.forEach((suggestion) => {
        const item = this.suggestionElement('query-input__autocomplete-item', suggestion);
        item.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus
        item.addEventListener('click', async () => {
          if (suggestion.type === 'duplicate') {
            queryInput_textArea.innerText = `@duplicate ${suggestion.name}`;
            await submitQuery();
          } else {
            fillWith(`@${suggestion.name} `);
          }
        });
        autocompleteContainer.appendChild(item);
      });

      autocompleteContainer.style.display = 'block';
      selectedIndex = -1;
    };

    const hideAutocomplete = () => {
      autocompleteContainer.style.display = 'none';
      selectedIndex = -1;
    };

    const selectAutocompleteItem = (direction) => {
      const items = autocompleteContainer.querySelectorAll('.query-input__autocomplete-item');
      if (items.length === 0) return;
      if (selectedIndex >= 0) items[selectedIndex].classList.remove('is-selected');
      if (direction === 'up') {
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      } else {
        selectedIndex = selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
      }
      items[selectedIndex].classList.add('is-selected');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    };

    const handleTabCompletion = async () => {
      const text = queryInput_textArea.innerText;
      const completion = this.completeSuggestion(text);
      if (completion) {
        fillWith(completion.text);
        if (completion.type === 'duplicate') await submitQuery();
        return;
      }
      showAutocomplete(text);
    };

    // Clicking the dimmed area leaves editor mode.
    if (focusOverlay) {
      focusOverlay.addEventListener('click', (e) => {
        if (e.target === focusOverlay) {
          queryInput_container.classList.remove('is-editor-mode');
          focusOverlay.classList.remove('is-active');
          queryInput_textArea.blur();
        }
      });
    }

    const switchToEditorMode = () => {
      if (!queryInput_container.classList.contains('is-editor-mode')) {
        queryInput_container.classList.remove('is-collapsed');
        queryInput_container.classList.add('is-editor-mode');
        focusOverlay?.classList.add('is-active');
        adjustHeight();
      }
    };

    const toggleEditorMode = () => {
      queryInput_container.classList.toggle('is-editor-mode');
      focusOverlay?.classList.toggle('is-active');
      adjustHeight();
    };

    const clearInput = () => {
      queryInput_textArea.innerText = '';
      queryInput_textArea.style.height = 'auto';
    };

    const submitQuery = async () => {
      const query = queryInput_textArea.innerText.trim();
      if (!query) return;

      hideAutocomplete();
      queryInput_container.classList.add('is-active');
      setTimeout(() => queryInput_container.classList.remove('is-active'), 100);

      // Team joke: asking for a chatbot gets you the lobotomy page.
      if (this.isLLMProvider(query)) {
        const lobotomyUrl = this.getLobotomyUrl(query);
        const origin = 'You asked for an AI chat site';
        if (this.isGeneralTaskActive) {
          this.createTabInGeneralTask(lobotomyUrl, LOBOTOMY_TITLE, '', origin);
        } else {
          await this.createTab(lobotomyUrl, LOBOTOMY_TITLE, '', origin, { recordLink: false });
        }
        clearInput();
        this.activateWebview();
        return;
      }

      // "@engine words", "@command", or a typed address: no backend involved.
      const isAtCommand = /^@(\w+)(?:\s+(.+))?$/.test(query);
      const looksLikeUrl = query.startsWith('http') ||
        (!/\s/.test(query) && /\.(com|org|net|ai)(\/|:|\?|#|$)/i.test(query));
      if (isAtCommand || looksLikeUrl) {
        await this.processUrlInput(query);
        clearInput();
        if (this.allTabs().length > 0) this.activateWebview();
        return;
      }

      const searchUrl = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

      try {
        // Real backend if running, otherwise the demo stand-in (js/api.js)
        const data = await window.GyrusAPI.searchQuery(query);

        this.currentQuery = query;
        this.currentIntent = data.intent || 'Answer';
        const intent = this.currentIntent;

        const links = (intent === 'News' || intent === 'Research')
          ? (Array.isArray(data) ? data : (data.links || []))
          : [];

        if (links.length > 0) {
          // Research and News get their own task, one tab per source.
          const taskTitle = query.length > 30 ? query.substring(0, 30) + '...' : query;
          this.createTask(taskTitle, intent);

          const origin = this.searchOutcome(intent, links.length);
          for (const link of links) {
            await this.createTab(link.link, link.title, link.snippet, origin, { recordLink: false });
          }
          // One add-links call for the whole set.
          await this.addLinksToBackend(links.map((link) => link.link).filter(Boolean));
          this.switchToTab(0);
        } else {
          // Navigational, Transactional, Answer (or a crew that found nothing):
          // a normal search in General.
          const searchText = data.query || query;
          this.switchToGeneralTask();
          this.createTabInGeneralTask(searchUrl(searchText), `${searchText} - Google search`, '',
            this.searchOutcome(intent, 0));
        }
      } catch (error) {
        console.error('Error calling backend API:', error);
        this.switchToGeneralTask();
        this.createTabInGeneralTask(searchUrl(query), `${query} - Google search`, '',
          'Something went wrong, so this is a normal search');
      }

      clearInput();
      this.activateWebview();
    };

    // Grow with the text; long queries switch to editor mode.
    const adjustHeight = () => {
      queryInput_textArea.style.height = 'auto';
      queryInput_textArea.style.height = queryInput_textArea.scrollHeight + 'px';
      if (queryInput_textArea.innerText.length > characterLimit) {
        switchToEditorMode();
      }
    };

    queryInput_textArea.addEventListener('input', (e) => {
      adjustHeight();
      showAutocomplete(e.target.innerText);
    });

    queryInput_textArea.addEventListener('keydown', (e) => {
      if (autocompleteContainer.style.display === 'block') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectAutocompleteItem('down');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectAutocompleteItem('up');
          return;
        }
        if (e.key === 'Enter' && selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          const picked = filteredSuggestions[selectedIndex];
          if (picked.type === 'duplicate') {
            queryInput_textArea.innerText = `@duplicate ${picked.name}`;
            submitQuery();
          } else {
            fillWith(`@${picked.name} `);
          }
          return;
        }
        if (e.key === 'Escape') {
          hideAutocomplete();
          return;
        }
      }

      if (e.key === 'Tab' && queryInput_textArea.innerText.startsWith('@')) {
        e.preventDefault();
        handleTabCompletion();
        return;
      }

      if (e.key === 'Escape' && queryInput_container.classList.contains('is-editor-mode')) {
        e.preventDefault();
        toggleEditorMode();
        queryInput_textArea.blur();
        return;
      }
      // Shift+Enter toggles editor mode for short queries.
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (queryInput_textArea.innerText.length <= characterLimit) {
          toggleEditorMode();
        }
        return;
      }
      // Enter submits in the one-line box; Ctrl/Cmd+Enter submits in editor mode.
      if (e.key === 'Enter' &&
          (!queryInput_container.classList.contains('is-editor-mode') || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitQuery();
      }
    });

    queryInput_sendButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      submitQuery();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.query-input-container')) {
        hideAutocomplete();
      }
    });

    queryInput_textArea.addEventListener('blur', () => {
      setTimeout(hideAutocomplete, 150);
    });
  }

  // Menu button opens a small dropdown. The dropdown lives on <body> because
  // the header clips its overflow.
  setupMenuButton() {
    const menuButton = document.querySelector('.menu-button');
    if (!menuButton) return;

    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown panel';
    dropdown.setAttribute('role', 'menu');
    document.body.appendChild(dropdown);

    const close = () => {
      dropdown.classList.remove('is-open');
      menuButton.classList.remove('is-active');
      menuButton.setAttribute('aria-expanded', 'false');
    };

    const items = () => [
      {
        label: this.panelsPinned ? 'Let the panels hide again' : 'Keep the panels open',
        run: () => this.setPanelsPinned?.(!this.panelsPinned)
      },
      { label: 'Memory', run: () => this.openNetworkModal() },
      { label: 'New search', run: () => this.openQueryInput() },
      {
        label: 'About Gyrus',
        run: () => window.GyrusEasterEggs?.openAbout?.(),
        hidden: !(window.GyrusEasterEggs && typeof window.GyrusEasterEggs.openAbout === 'function')
      }
    ];

    const open = () => {
      dropdown.innerHTML = '';
      items().filter((item) => !item.hidden).forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'row';
        button.setAttribute('role', 'menuitem');
        button.textContent = item.label;
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          close();
          item.run();
        });
        dropdown.appendChild(button);
      });
      const rect = menuButton.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 4}px`; // --space-1 below the button
      dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      dropdown.classList.add('is-open');
      menuButton.classList.add('is-active');
      menuButton.setAttribute('aria-expanded', 'true');
      dropdown.querySelector('button')?.focus();
    };

    menuButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropdown.classList.contains('is-open')) close(); else open();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-dropdown')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.classList.contains('is-open')) close();
    });
  }

  openNetworkModal() {
    const networkModal = document.getElementById('network-modal');
    if (!networkModal) return;
    networkModal.classList.add('is-visible');
    document.querySelector('.network-button')?.classList.add('is-active');
    networkModal.querySelector('.network-modal__close')?.focus();
    this.updateNetworkGraph();
  }

  closeNetworkModal() {
    document.getElementById('network-modal')?.classList.remove('is-visible');
    document.querySelector('.network-button')?.classList.remove('is-active');
  }

  setupNetworkButton() {
    const networkButton = document.querySelector('.network-button');
    const networkModal = document.getElementById('network-modal');
    if (!networkButton || !networkModal) return;

    networkButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openNetworkModal();
    });

    networkModal.querySelector('.network-modal__overlay')
      ?.addEventListener('click', () => this.closeNetworkModal());
    networkModal.querySelector('.network-modal__close')
      ?.addEventListener('click', () => this.closeNetworkModal());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && networkModal.classList.contains('is-visible')) {
        this.closeNetworkModal();
      }
    });

    document.getElementById('refresh-network')
      ?.addEventListener('click', () => this.updateNetworkGraph());
  }

  // Draws the memory graph. Ink on paper: topics are filled squares, searches
  // are open circles, links are small dots. Clicking a node turns it blue and
  // darkens its edges; that is the only use of colour.
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

    const shortName = (d) => {
      if (d.type !== 'link') return d.name.length > 40 ? d.name.slice(0, 40) + '...' : d.name;
      try { return new URL(d.name).hostname.replace(/^www\./, ''); } catch (_) { return d.name; }
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

    node.append('title').text((d) => d.name);

    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', (d) => `graph-label${d.type === 'concept' ? ' graph-label--concept' : ''}`)
      .attr('dx', 10)
      .attr('dy', 4)
      .text(shortName);

    // Click a node: it turns blue, its edges go to full ink. Click it again to clear.
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

  setupWebview() {
    const webview = document.getElementById('browser-webview');
    const webviewContainer = document.getElementById('webview-container');
    const urlBarInput = document.querySelector('.url-bar__input');
    const loadingIndicator = document.querySelector('.webview-loading');

    if (!webview || !webviewContainer) return;

    const showLobotomy = (destination) => {
      const lobotomyUrl = this.getLobotomyUrl(destination);
      webview.src = lobotomyUrl;
      const tab = this.tabs[this.activeTabIndex];
      if (tab) {
        tab.url = lobotomyUrl;
        tab.title = LOBOTOMY_TITLE;
        tab.origin = 'You asked for an AI chat site';
        this.renderTabs();
      }
    };

    webview.addEventListener('did-start-loading', () => {
      if (loadingIndicator) loadingIndicator.style.display = 'block';
    });

    webview.addEventListener('did-stop-loading', () => {
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      webview.setAttribute('data-ready', 'true');

      const tab = this.tabs[this.activeTabIndex];
      if (tab) {
        tab.url = webview.src;
        tab.title = webview.getTitle() || tab.title || 'New tab';
        this.renderTabs();
      }
    });

    webview.addEventListener('did-fail-load', () => {
      if (loadingIndicator) loadingIndicator.style.display = 'none';
      console.error('Webview failed to load');
    });

    // Address bar: an address opens in the current tab; anything with spaces
    // (or no dot) is a Google search.
    urlBarInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const typed = urlBarInput.value.trim();
      if (!typed) return;

      if (this.isLLMProvider(typed)) {
        if (this.tabs.length === 0) {
          this.createTabInGeneralTask(this.getLobotomyUrl(typed), LOBOTOMY_TITLE, '', 'You asked for an AI chat site');
        } else {
          showLobotomy(typed);
        }
        this.activateWebview();
        return;
      }

      let url = typed;
      if (!/^(https?|about|file):/i.test(typed)) {
        url = (/\s/.test(typed) || !typed.includes('.'))
          ? `https://www.google.com/search?q=${encodeURIComponent(typed)}`
          : `https://${typed}`;
      }

      const tab = this.tabs[this.activeTabIndex];
      if (tab) {
        tab.url = url;
        tab.origin = 'Opened the address you typed';
        webview.src = url;
        this.renderTabs();
      } else {
        this.createTabInGeneralTask(url, typed, '', 'Opened the address you typed');
      }
      urlBarInput.blur();
      this.activateWebview();
    });

    document.getElementById('back-btn')?.addEventListener('click', () => {
      if (webview.canGoBack()) webview.goBack();
    });

    document.getElementById('forward-btn')?.addEventListener('click', () => {
      if (webview.canGoForward()) webview.goForward();
    });

    // "Start page": back to the query box. Open tabs stay where they are.
    document.getElementById('home-btn')?.addEventListener('click', () => this.openQueryInput());

    webview.addEventListener('did-navigate', (e) => {
      if (urlBarInput) urlBarInput.value = e.url;
      const tab = this.tabs[this.activeTabIndex];
      if (tab) tab.url = e.url;
      if (this.isLLMProvider(e.url)) showLobotomy(e.url);
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (urlBarInput) urlBarInput.value = e.url;
      const tab = this.tabs[this.activeTabIndex];
      if (tab) tab.url = e.url;
    });
  }

  // Header + tasks panel open together from the top or left edge; the tabs
  // panel opens from the right edge. Hover, click or keyboard focus on the
  // edge tabs opens them too. "Keep the panels open" in the menu pins them.
  setupHeaderVisibility() {
    const header = document.querySelector('.app-header');
    const sidebar = document.querySelector('.sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');
    const urlBarInput = document.querySelector('.url-bar__input');
    if (!header) return;

    const EDGE_PX = 5;
    const HIDE_DELAY_MS = 750;

    let headerOn = false;
    let leftOn = false;
    let rightOn = false;
    let pinned = false;
    let inHeader = false;
    let inLeft = false;
    let inRight = false;
    let focusInHeader = false;
    let focusInLeft = false;
    let focusInRight = false;
    let hideTimer = null;

    const sync = () => {
      header.classList.toggle('is-visible', headerOn);
      sidebar?.classList.toggle('is-visible', leftOn);
      rightSidebar?.classList.toggle('is-visible', rightOn);
      document.body.classList.toggle('tasks-open', leftOn);
      document.body.classList.toggle('tabs-open', rightOn);
      if (this.hasActiveWebview) this.updateWebviewPosition();
    };

    const cancelHide = () => {
      clearTimeout(hideTimer);
      hideTimer = null;
    };

    const showBoth = () => {
      cancelHide();
      if (!headerOn || !leftOn) {
        headerOn = true;
        leftOn = true;
        sync();
      }
    };

    const hideBoth = () => {
      if (pinned) return;
      const keep = inHeader || inLeft || focusInHeader || focusInLeft || document.activeElement === urlBarInput;
      if (keep || (!headerOn && !leftOn)) return;
      headerOn = false;
      leftOn = false;
      sync();
    };

    const startHideTimer = () => {
      if (hideTimer || pinned) return;
      hideTimer = setTimeout(() => {
        hideTimer = null;
        hideBoth();
      }, HIDE_DELAY_MS);
    };

    const showRight = () => {
      if (!rightOn) {
        rightOn = true;
        sync();
      }
    };

    const hideRight = (force = false) => {
      if (!rightOn || (!force && (pinned || inRight || focusInRight))) return;
      rightOn = false;
      sync();
    };

    this.panelsPinned = false;
    this.setPanelsPinned = (on) => {
      pinned = !!on;
      this.panelsPinned = pinned;
      if (pinned) {
        showBoth();
        showRight();
      } else {
        startHideTimer();
        hideRight();
      }
    };

    document.addEventListener('mousemove', (e) => {
      const nearTop = e.clientY <= EDGE_PX;
      const nearLeft = e.clientX <= EDGE_PX;
      if (nearTop || nearLeft) {
        showBoth();
      } else if ((headerOn || leftOn) && !inHeader && !inLeft) {
        startHideTimer();
      }

      const fromRight = window.innerWidth - e.clientX;
      const rightZone = rightOn ? SIDEBAR_WIDTH_PX : EDGE_PX;
      if (fromRight <= rightZone) {
        showRight();
      } else {
        hideRight();
      }
    });

    const track = (el, onEnter, onLeave, setFocus) => {
      if (!el) return;
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('focusin', () => { setFocus(true); onEnter(); });
      el.addEventListener('focusout', (e) => {
        setFocus(!!(e.relatedTarget && el.contains(e.relatedTarget)));
        onLeave();
      });
    };

    track(header,
      () => { inHeader = true; showBoth(); },
      () => { inHeader = false; startHideTimer(); },
      (v) => { focusInHeader = v; });
    track(sidebar,
      () => { inLeft = true; showBoth(); },
      () => { inLeft = false; startHideTimer(); },
      (v) => { focusInLeft = v; });
    track(rightSidebar,
      () => { inRight = true; showRight(); },
      () => { inRight = false; },
      (v) => { focusInRight = v; });

    urlBarInput?.addEventListener('blur', startHideTimer);

    // Visible handles for the hidden panels.
    const leftTab = document.querySelector('.edge-tab--left');
    const rightTab = document.querySelector('.edge-tab--right');
    ['mouseenter', 'click', 'focus'].forEach((type) => {
      leftTab?.addEventListener(type, () => {
        showBoth();
        if (type !== 'mouseenter') sidebar?.querySelector('.sidebar__add-tab')?.focus();
      });
      rightTab?.addEventListener(type, () => {
        showRight();
        if (type !== 'mouseenter') rightSidebar?.querySelector('.right-sidebar__url-input')?.focus();
      });
    });

    // Esc closes open panels (unless pinned).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || pinned) return;
      if (rightOn) hideRight(true);
      if (headerOn || leftOn) {
        const active = document.activeElement;
        if (active && (header.contains(active) || sidebar?.contains(active))) active.blur();
        focusInHeader = false;
        focusInLeft = false;
        cancelHide();
        hideBoth();
      }
    });

    this.setupRightSidebarInput();
  }

  setupRightSidebarInput() {
    const urlInput = document.querySelector('.right-sidebar__url-input');
    const autocomplete = document.querySelector('.right-sidebar__autocomplete');
    if (!urlInput || !autocomplete) return;

    let selectedIndex = -1;
    let filteredSuggestions = [];

    const run = async (text) => {
      urlInput.value = '';
      hideAutocomplete();
      await this.processUrlInput(text);
      if (this.allTabs().length > 0) this.activateWebview();
    };

    const fillWith = (text) => {
      urlInput.value = text;
      hideAutocomplete();
      urlInput.focus();
    };

    const showAutocomplete = (text) => {
      const suggestions = this.buildSuggestions(text);
      if (suggestions.length === 0) {
        hideAutocomplete();
        return;
      }

      filteredSuggestions = suggestions;
      autocomplete.innerHTML = '';
      suggestions.forEach((suggestion) => {
        const item = this.suggestionElement('right-sidebar__autocomplete-item', suggestion);
        item.addEventListener('mousedown', (e) => e.preventDefault());
        item.addEventListener('click', () => {
          if (suggestion.type === 'duplicate') run(`@duplicate ${suggestion.name}`);
          else fillWith(`@${suggestion.name} `);
        });
        autocomplete.appendChild(item);
      });

      autocomplete.style.display = 'block';
      selectedIndex = -1;
    };

    const hideAutocomplete = () => {
      autocomplete.style.display = 'none';
      selectedIndex = -1;
    };

    const selectAutocompleteItem = (direction) => {
      const items = autocomplete.querySelectorAll('.right-sidebar__autocomplete-item');
      if (items.length === 0) return;
      if (selectedIndex >= 0) items[selectedIndex].classList.remove('is-selected');
      if (direction === 'up') {
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      } else {
        selectedIndex = selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
      }
      items[selectedIndex].classList.add('is-selected');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    };

    urlInput.addEventListener('input', (e) => showAutocomplete(e.target.value));

    urlInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const picked = autocomplete.style.display === 'block' && selectedIndex >= 0
          ? filteredSuggestions[selectedIndex] : null;
        if (picked) {
          if (picked.type === 'duplicate') run(`@duplicate ${picked.name}`);
          else fillWith(`@${picked.name} `);
          return;
        }
        const text = urlInput.value.trim();
        if (text) run(text);
      } else if (e.key === 'Escape') {
        hideAutocomplete();
        urlInput.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectAutocompleteItem('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectAutocompleteItem('up');
      } else if (e.key === 'Tab' && urlInput.value.startsWith('@')) {
        e.preventDefault();
        const completion = this.completeSuggestion(urlInput.value);
        if (!completion) showAutocomplete(urlInput.value);
        else if (completion.type === 'duplicate') run(completion.text);
        else fillWith(completion.text);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.right-sidebar__new-tab-input')) hideAutocomplete();
    });

    urlInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));
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

  // lobotomy.html sits next to index.html, so it is same-origin and loads in
  // the page area in both Electron and a plain browser.
  // The lobotomy page offers "Proceed with lobotomy" when it knows where you
  // were going, so pass the destination along as ?to= (http/https only).
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

  // Input from the tabs panel and the query box's "@..." / address path.
  // "a | b" (or ; ,) opens several. Everything here lands in General except
  // the @-commands, which act on the task you are in.
  async processUrlInput(input) {
    const delimiter = ['|', ';', ','].find((d) => input.includes(d));
    if (delimiter) {
      const parts = input.split(delimiter).map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        await this.processUrlInput(part);
      }
      return;
    }

    const atMatch = input.match(/^@(\w+)(?:\s+(.+))?$/);
    if (atMatch) {
      const name = atMatch[1].toLowerCase();
      const argument = (atMatch[2] || '').trim();

      switch (name) {
        case 'duplicate': {
          if (!argument) return;
          const wanted = argument.toLowerCase();
          const match = this.tabs.find((tab) =>
            tab.title.toLowerCase().includes(wanted) || tab.url.toLowerCase().includes(wanted));
          if (match) this.duplicateTab(match);
          return;
        }
        case 'close':
          this.closeTab(this.activeTabIndex);
          return;
        case 'closeall': {
          const task = this.activeTask;
          if (task) {
            task.tabs = [];
            this.activeTabIndex = 0;
            const webview = document.getElementById('browser-webview');
            if (webview) webview.src = 'about:blank';
            this.renderTasks();
            this.renderTabs();
            this.showStartPageIfEmpty();
          }
          return;
        }
        case 'newtask':
          this.createTask('New task');
          return;
        case 'closetask':
          if (!this.isGeneralTaskActive) this.closeTask(this.activeTaskIndex);
          return;
        default:
          break;
      }

      // "@engine words" searches that site; "@engine" alone opens it.
      const engine = ENGINE_URLS[name] ? name : 'google';
      const [homeUrl, searchUrl] = ENGINE_URLS[engine];
      const url = argument ? searchUrl(encodeURIComponent(argument)) : homeUrl;
      const title = argument ? `${engine} search: ${argument}` : engine;

      this.switchToGeneralTask();
      if (this.isLLMProvider(argument) || this.isLLMProvider(url)) {
        this.createTabInGeneralTask(this.getLobotomyUrl(url), LOBOTOMY_TITLE, '', 'You asked for an AI chat site');
        return;
      }
      this.createTabInGeneralTask(url, title, '',
        argument ? `Opened a ${engine} search` : `Opened ${engine}`);
      return;
    }

    const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    try {
      new URL(url);
    } catch (e) {
      console.error('Invalid URL:', input);
      return;
    }

    this.switchToGeneralTask();
    if (this.isLLMProvider(url)) {
      this.createTabInGeneralTask(this.getLobotomyUrl(url), LOBOTOMY_TITLE, '', 'You asked for an AI chat site');
      return;
    }
    this.createTabInGeneralTask(url, input, '', 'Opened the address you typed');
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

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, false);
  }

  activateWebview() {
    this.hasActiveWebview = true;
    document.querySelector('.content-area')?.classList.add('has-active-webview');

    const queryInputContainer = document.querySelector('.query-input-container');
    if (queryInputContainer) {
      queryInputContainer.classList.add('is-collapsed');
      queryInputContainer.classList.remove('is-editor-mode');
    }
    document.querySelector('.focus-overlay')?.classList.remove('is-active');

    const webviewContainer = document.getElementById('webview-container');
    if (webviewContainer) webviewContainer.style.display = 'block';

    this.updateWebviewPosition();
    this.updatePageStatus();
  }

  // The page layer is fixed to the viewport and sized around whichever panels
  // are open, moving on the same curve as the panels.
  updateWebviewPosition() {
    const page = document.querySelector('#webview-container .webview-container');
    if (!page) return;

    const headerOn = document.querySelector('.app-header')?.classList.contains('is-visible');
    const leftOn = document.querySelector('.sidebar')?.classList.contains('is-visible');
    const rightOn = document.querySelector('.right-sidebar')?.classList.contains('is-visible');
    // The header's hairline sits inside its 48px; each sidebar adds a 1px border.
    const top = headerOn ? HEADER_HEIGHT_PX : 0;
    const left = leftOn ? SIDEBAR_WIDTH_PX + 1 : 0;
    const right = rightOn ? SIDEBAR_WIDTH_PX + 1 : 0;

    const move = 'var(--duration-panel) var(--ease-panel)';
    Object.assign(page.style, {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: `${right}px`,
      bottom: '0',
      width: 'auto',
      height: 'auto',
      zIndex: '1',
      transition: `top ${move}, left ${move}, right ${move}`
    });
  }

  deactivateWebview() {
    this.hasActiveWebview = false;
    document.querySelector('.content-area')?.classList.remove('has-active-webview');
    document.querySelector('.query-input-container')?.classList.remove('is-collapsed');

    const webviewContainer = document.getElementById('webview-container');
    if (webviewContainer) webviewContainer.style.display = 'none';

    const page = webviewContainer?.querySelector('.webview-container');
    if (page) {
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'zIndex', 'transition']
        .forEach((prop) => { page.style[prop] = ''; });
    }
  }

  setupCollapsedQueryInput() {
    const queryInputContainer = document.querySelector('.query-input-container');
    if (!queryInputContainer) return;

    // The collapsed "Search" button is a real control: focusable, Enter/Space open it.
    const expand = (e) => {
      if (!queryInputContainer.classList.contains('is-collapsed')) return;
      // Only the collapsed button itself. The Enter that submits a search
      // bubbles up from the text area after the box has already collapsed,
      // and must not reopen it.
      if (e.target !== queryInputContainer) return;
      e.preventDefault();
      e.stopPropagation();
      this.openQueryInput();
    };
    queryInputContainer.addEventListener('click', expand);
    queryInputContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') expand(e);
    });

    const syncRole = () => {
      const collapsed = queryInputContainer.classList.contains('is-collapsed');
      if (collapsed) {
        queryInputContainer.setAttribute('role', 'button');
        queryInputContainer.setAttribute('tabindex', '0');
        queryInputContainer.setAttribute('aria-label', 'New search');
      } else {
        queryInputContainer.removeAttribute('role');
        queryInputContainer.removeAttribute('tabindex');
        queryInputContainer.removeAttribute('aria-label');
      }
    };
    new MutationObserver(syncRole).observe(queryInputContainer, { attributes: true, attributeFilter: ['class'] });
    syncRole();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  componentManager.initialize().then(() => {
    new App();
  });
});
