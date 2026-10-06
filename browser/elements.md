# UI elements

What is on screen, where its markup, style and behaviour live. Design rules and tokens are in `styling_guide.md`.

## Start page

The hero tile and a large "Gyrus" title, then a white pill search box (`components/query-input.html`, `_query-input.css`), placeholder "Search, or type a site". Under it, a short intro saying what Gyrus does and where the panels are; the hero and intro hide once any tab exists (`body.has-tabs`). Enter submits. Over 50 characters (or Shift+Enter) the box becomes a taller editor: Enter adds a line, Ctrl/Cmd+Enter or the Search button submits, Esc leaves it. Typing `@` lists shortcuts (`@google words`, `@duplicate`, `@close`, ...).

After a search the box collapses into an orange "Search" button bottom-right that brings it back.

## Edges

The header and both sidebars are hidden until the pointer reaches an edge (`app.js setupHeaderVisibility`):

- Top or left edge: the header (address bar, back, forward, start page, Memory, menu, window buttons) and the **Tasks** panel open together.
- Right edge: the **Tabs** panel.
- Small labelled handles "Tasks" and "Tabs" sit on the left and right edges (`_edge-tabs.css`). Hover, click or keyboard focus opens the panel. Esc closes open panels. The menu's "Keep the panels open" pins them.

When a panel opens, the page area moves aside on the panel curve instead of sitting under it (`updateWebviewPosition`).

## Tasks and tabs

- **General** is permanent and holds everyday searches (Answer, Navigational, Transactional), typed addresses and `@` searches.
- A Research or News search creates its own task with one tab per source the crew returned. Each row shows the task's kind as a label and its tab count.
- Tasks and tabs are `.row`s in a white card, iOS grouped-table style (focusable; Enter opens). The selected one gets an orange wash and bar. Closing the last tab anywhere returns to the start page.

## Page area

`components/webview.html`, `_webview.css`.

- A one-line status above the page says how the tab got there, from the API's intent, e.g. "Research: the research crew found 2 sources" or "Answer: opened a normal search".
- In Electron the page is a `<webview>`.
- In a plain browser (`js/platform.js`) the webview becomes an `<iframe>`. Same-origin pages (such as `lobotomy.html`) load in it. External pages are not framed (most sites refuse): a preview card shows the title, address, snippet, where it came from, and an orange "Open in a new tab" button, on a white card.

## Memory

The graph button in the header (or the menu) opens "What Gyrus remembers" (`components/network-modal.html`, `_network-modal.css`, `app.js updateNetworkGraph`, d3). Topics are filled squares, searches open circles, links small dots, in text colours. Clicking an item turns it and its edges orange. Esc or the close button closes it.

## Menu

The header menu button opens a small dropdown (`_menu-button.css`): keep the panels open, Memory, New search, and About Gyrus (shown when `js/easter-eggs.js` has loaded).

## About

"About Gyrus" (`js/easter-eggs.js`, `components/about-panel.html`, `_about-panel.css`) is a grouped-card sheet with the hero tile in its header.

## Demo mode

With no backend on port 5000, `js/api.js` answers locally and shows a note bottom-left: "Demo mode. No backend running, so the crews return search links instead of results."

## Joke

Navigating to a real chat product (hostname is or is under `claude.ai`, `chatgpt.com`, `gemini.google.com` and the rest of `LLM_CHAT_DOMAINS` in `app.js`), or searching exactly a product name, opens `lobotomy.html`. Searches that merely contain a name do not.

## Platforms

`js/components.js` puts window buttons left and navigation right on macOS (`07-platforms/_macos.css`), the reverse on Windows and Linux (`_windows.css`). Window buttons are hidden outside Electron.
