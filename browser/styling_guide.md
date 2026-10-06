# Styling guide

Gyrus follows the look of Memento, the team's earlier app: iOS-native and warm, light and dark. This file says what the rules are and where they live. If the CSS and this file disagree, the CSS wins; fix this file.

## Tokens (`src/styles/01-settings/`)

**Colour, shape, shadow** (`_colors.css`). Light by default, dark under `prefers-color-scheme: dark`; `:root[data-theme="light"|"dark"]` forces either.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-ground` | `#F2F2F7` | `#000000` | page background |
| `--color-elevated` | `#F2F2F7` | `#1C1C1E` | header, sidebars, status line |
| `--color-surface` | `#FFFFFF` | `#2C2C2E` | cards and panels |
| `--color-ink` | `#1C1C1E` | `#F2F2F7` | primary text |
| `--color-ink-muted` | `#6E6E73` | `#98989D` | secondary text |
| `--color-hairline` | `#E5E5EA` | `#38383A` | separators |
| `--color-accent` | `#F09A37` | `#FFA94D` | the one accent |

Also `--color-accent-pressed`, `--color-accent-wash` (selected rows), `--color-fill` (inputs, hover), `--color-ink-faint` (placeholders). The accent is used for primary buttons, selected task and tab, links, focus rings and actionable icons. Nothing else is coloured.

Radii: cards 16px, buttons 12px, inputs 14px, search box pill, hero tile 24px. One shadow, `--shadow-card`, for floating surfaces only (query box, menu, modal, suggestions, preview card, edge handles, demo note).

**Type** (`_typography.css`). System UI stack (`-apple-system`, SF Pro Text, Inter, system-ui), weights 400 / 600 / 700. Five sizes: caption 12px, small 13px, body 15px, headline 17px, large title 28px. Sentence case everywhere. Section headers (`.label`) are 13px / 600 / secondary.

**Spacing** (`_spacing.css`). `--space-1` to `--space-7` = 4, 8, 12, 16, 24, 32, 48px. Component sizes are named tokens there too. `app.js` repeats the header height (48) and sidebar width (200).

**Motion** (`_transitions.css`). Hovers 200ms ease-out; panels 280ms on an ease-out curve. Both drop to 0 under `prefers-reduced-motion`. No bounce, no scaling.

## Shared components (`06-components/_controls.css`)

- `.button`: primary, accent fill, 12px radius, white 600 label. `.button--text`: accent text, no fill. `.icon-button`: accent line icon, soft fill on hover; `--quiet` for secondary icons (row close buttons).
- `.icon`: inline SVG, 16px, 2px stroke, round caps and joins, `currentColor`.
- `.card`: in-flow white card holding rows. `.panel`: card plus shadow, for floating surfaces.
- `.row`: every list item (tasks, tabs, suggestions, menu items). 44px min height, inset 1px separators that start after the icon, fill on hover. Selected: accent wash plus an accent bar on the leading edge.
- `.hero-mark`: the iridescent tile with a white line-art brain. Start page and About panel only.
- Focus: 2px accent outline, 2px offset (inset on rows, which sit in clipped cards).

## Exceptions

- macOS traffic-light window buttons keep their native colours and round shape.
- The hero tile uses its own gradient and a white highlight.
- `lobotomy.html` is deliberately off-system and is not styled from here.

## Architecture

ITCSS folders under `src/styles/` (settings, elements, objects, components, platforms) and BEM class names. Component files only add what the shared classes don't cover.
