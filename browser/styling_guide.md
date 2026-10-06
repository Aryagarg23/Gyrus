# Styling guide

Gyrus uses the owner's design system: editorial-brutalist on warm paper, light and dark. This file says what the rules are and where they live. If the CSS and this file disagree, the CSS wins; fix this file.

## Tokens (`src/styles/01-settings/`)

**Colour** (`_colors.css`). Light by default, dark under `prefers-color-scheme: dark`; `:root[data-theme="light"|"dark"]` forces either.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-ground` | `#eae4d6` | `#1c1c1c` | page background |
| `--color-surface` | `#f2ede2` | `#232322` | panels, query box |
| `--color-ink` | `#282215` | `#f1ede4` | text, outlines, filled marks |
| `--color-hairline` | `#c6b99f` | `#4a4640` | 1px borders |
| `--color-blue` | `#3b42db` | `#6f76ec` | technical emphasis only: focus ring, selected graph node |
| `--color-hot` | `#e85b30` | `#d95526` | warnings only (none in the UI today) |

Muted text is ink mixed down with `color-mix`, never a gray: `--color-ink-muted` (60%), `--color-ink-faint` (45%), `--color-ink-wash` (6%, row hover).

**Type** (`_typography.css`). Space Grotesk 400 and 500 only, loaded from Google Fonts in `index.html`. Five sizes: `--font-size-label` 0.65rem, `-sm` 0.8rem, `-base` 0.9rem, `-title` 1.1rem, `-display` 1.6rem.

**Spacing** (`_spacing.css`). `--space-1` to `--space-7` = 4, 8, 12, 16, 24, 32, 48px. Component sizes (header height, sidebar width, row height, icon buttons) are named tokens in the same file. `app.js` repeats the header height (48) and sidebar width (200) as constants.

**Motion** (`_transitions.css`). Hovers `--duration-hover` 150ms; panels `--duration-panel` 340ms on `--ease-panel` `cubic-bezier(.32,.72,0,1)`. Both drop to 0 under `prefers-reduced-motion`. No bounce, no scale on hover.

## Rules

- Radius 0 everywhere. The only exception is the macOS traffic-light window buttons, which keep their native round shape and colours.
- 1px hairline borders instead of shadows. No gradients, no glows, no blur.
- Labels: `.label` = uppercase, 0.65rem, 0.14em tracking, ink at 60%.
- Buttons are never blue or hot.
- Keyboard focus: 2px blue outline, 2px offset (inset on list rows, which sit in clipped panels).
- Plain English in the UI: sentence case, short sentences, no emoji. Names: Tasks, Tabs, Memory.

## Shared components (`06-components/_controls.css`)

- `.button`: ink outline, inverts on hover. `.button--text`: no box, used for menu items. `.icon-button` (32px) and `.icon-button--sm` (24px): square, hairline, inverts on hover.
- `.icon`: inline SVG line icon, 16px, 1.5 stroke, `currentColor`.
- `.panel`: surface plus hairline. Used by the memory modal, the menu and suggestion lists. The sidebars use the same colours with a single edge border.
- `.row`: every list item (tasks, tabs, suggestions). Same height (44px), padding, hover wash and active state (2px ink rule on the leading edge).

## Architecture

ITCSS folders under `src/styles/` (settings, elements, objects, components, platforms) and BEM class names. Component files only add what the shared classes don't cover.
