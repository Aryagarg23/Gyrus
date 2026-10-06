# UI elements

What is on screen, where its markup, style and behaviour live. Design rules and tokens are in `styling_guide.md`.

## Layout

Two columns: a left rail that is always there, and a main area (`index.html`, `05-objects/_layout.css`). The main area shows one view at a time; `app.js` sets `body[data-view]` to `start`, `run`, `task` or `page`. Nothing is hidden behind a hover.

## Rail

`components/rail.html`, `_rail.css`, `app.js renderRail`.

- **New search** at the top (also Ctrl/Cmd+T) goes back to the start screen.
- **Tasks**: a card of rows. **General** is permanent and holds everyday searches (Answer, Shopping, Site), typed addresses and `@` searches. Each Research or News search adds a row with its intent and source count. Rows are focusable; Enter opens. The open task gets the accent wash and bar. A task's close button shows on hover or focus.
- **Memory** at the bottom opens the graph. **About** under it opens the About panel.
- Below 760px wide the rail shows icons only. Names stay as tooltips and for screen readers. It is never hidden.

## Top bar

Back, forward and the address bar, shown only while a page is open (`components/navigation-controls.html`, `url-bar.html`, `_url-bar.css`). In Electron the bar is always there because it is the window's drag area; it holds the Windows/Linux window buttons. On macOS the traffic lights sit at the top of the rail instead (`components.js`). In a plain browser there are no window buttons. The address bar opens an address in General, or a normal search for anything with spaces.

## Start screen

`components/start-screen.html`, `_start.css`. Hero tile, "Gyrus", and one line: "A browser that sends a small crew to help you research, instead of answering for you." Then the search box ("What do you want to look into?", Enter submits), three example searches labelled with their intent (Research, News, Shopping), and "How it works" in three numbered lines. In demo mode one more quiet line: "Demo: the crew and its sources are simulated."

Typing `@` in the box lists shortcuts (`@google words`, `@duplicate`, `@close`, `@newtask`, ...). They are not advertised anywhere else.

## Run screen

What happens after a search, in the main area (`app.js runSearch`, `renderRunOutcome`, `_run.css`). About 2.5 seconds; Skip or Esc jumps to the end.

1. "Working out what you're trying to do" while the backend (or the demo) answers.
2. "Gyrus thinks you're doing: Research" with the plain meaning (Research: understanding a topic in depth; News: what's happening now; Answer: one quick fact; Shopping: buying something; Site: going to a specific site) and **Not right?**.
3. Research or News: the crew's three steps tick through, then the new task opens. Research is the query enhancer, the learning router and the count; News is the news router, the news explainer and the count (the crews in `backend/MCP`). Anything else: one line saying Gyrus leaves it to a normal search and sends no crew, then the page opens in General.

Under `prefers-reduced-motion` nothing ticks: the steps show done, and the task opens after a short pause.

**Not right?** opens a small chooser of intents. Picking one throws away what the search made and runs it again as that intent. With the real backend only the everyday intents are offered, because the backend decides by itself when to send a crew; the chooser says so.

## Task view

`app.js renderTaskView`, `_task.css`. The query as the title, the intent line with **Not right?**, "What the research crew did" (the steps, done), and the reading list: one card per source with the source name, title and one line on why the crew picked it. Opened cards get "Read" and a lighter title; the list heading counts what is unread. General's view lists its pages the same way.

## Page view

`components/webview.html`, `_webview.css`. A bar with **Back to sources** (or **Back to General**), the page title and how it got here, then the page. In Electron the page is a `<webview>`. In a plain browser `js/platform.js` swaps in an `<iframe>`; pages from this folder load in it, and external pages get an **Open in a new tab** link in the bar because most sites refuse to be framed. A page opened from a General search also has **Not right?** in the bar.

## Demo mode

With no backend on port 5000, `js/api.js` answers locally and puts `is-demo` on `<html>`. It does not search the web. The three example searches have canned crews with three or four sources each; any other Research or News search gets generic stand-ins built from its topic ("Fusion power: background to the story (example)"). Every source, and every Answer, Shopping or Site result, opens `demo-page.html`: a plain reader page that says it is a stand-in, built from URL parameters (`kind`, `title`, `source`, `why`, `q`). Its back link returns to the task. The task view repeats the demo note. With the backend running, the real API and real URLs are used.

## Memory

The rail's **Memory** opens "What Gyrus remembers" (`components/network-modal.html`, `_network-modal.css`, `app.js updateNetworkGraph`, d3), with a one-line legend under the title: searches (open circles), the topics they belong to (filled squares) and the links you opened (small dots). Clicking an item turns it and its edges orange. Esc or the close button closes it. In demo mode the graph starts from `js/demo-seed.js`, every search adds a topic and a search, and every source you open adds a link (labelled by its title).

## About

**About** in the rail (`js/easter-eggs.js`, `components/about-panel.html`, `_about-panel.css`) opens a grouped-card sheet with the hero tile in its header. Esc closes it.

## Keyboard

Enter submits the search box and the address bar. Esc closes the innermost overlay (chooser, Memory, About), or skips the run screen. Ctrl/Cmd+T is New search. Every control shows a 2px accent focus ring.

## Joke

Navigating to a real chat product (hostname is or is under `claude.ai`, `chatgpt.com`, `gemini.google.com` and the rest of `LLM_CHAT_DOMAINS` in `app.js`), or searching exactly a product name, opens `lobotomy.html` with the destination as `?to=`. Searches that merely contain a name do not.
