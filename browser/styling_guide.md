# Styling guide

Gyrus follows the look of Memento, the team's earlier app: iOS-native and warm, light and dark. This file says what the rules are and where they live. If the CSS and this file disagree, the CSS wins; fix this file.

## Tokens (`src/styles/01-settings/`)

**Colour, shape, shadow** (`_colors.css`). Light by default, dark under `prefers-color-scheme: dark`; `:root[data-theme="light"|"dark"]` forces either.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-ground` | `#F2F2F7` | `#000000` | page background |
| `--color-elevated` | `#F2F2F7` | `#1C1C1E` | rail and top bar |
| `--color-surface` | `#FFFFFF` | `#2C2C2E` | cards and panels |
| `--color-ink` | `#1C1C1E` | `#F2F2F7` | primary text |
| `--color-ink-muted` | `#6E6E73` | `#98989D` | secondary text |
| `--color-hairline` | `#E5E5EA` | `#38383A` | separators |
| `--color-accent` | `#F09A37` | `#FFA94D` | the one accent |

Also `--color-accent-pressed`, `--color-accent-wash` (selected rows), `--color-fill` (inputs, hover), `--color-ink-faint` (placeholders). The accent is used for primary buttons, the selected task, finished crew steps, intent labels on the example searches, links, focus rings and actionable icons. Nothing else is coloured.

Radii: cards 16px, buttons 12px, inputs 14px, search box pill, hero tile 24px. One shadow, `--shadow-card`, for floating surfaces only (search box, chooser, modal, suggestions).

**Type** (`_typography.css`). System UI stack (`-apple-system`, SF Pro Text, Inter, system-ui), weights 400 / 600 / 700. Five sizes: caption 12px, small 13px, body 15px, headline 17px, large title 28px. Sentence case everywhere. Section headers (`.label`) are 13px / 600 / secondary.

**Spacing** (`_spacing.css`). `--space-1` to `--space-7` = 4, 8, 12, 16, 24, 32, 48px. Component sizes are named tokens there too (rail 232px, 64px when collapsed; top bar 48px).

**Motion** (`_transitions.css`). Hovers 200ms ease-out; panels 280ms on an ease-out curve. Both drop to 0 under `prefers-reduced-motion`, and `_base.css` stops all animation there. No bounce, no scaling. The run screen's timing lives in `app.js RUN_TIMING`; under reduced motion it skips the ticking.

## Shared components (`06-components/_controls.css`)

- `.button`: primary, accent fill, 12px radius, white 600 label. `.button--text`: accent text, no fill. `.icon-button`: accent line icon, soft fill on hover; `--quiet` for secondary icons (row close buttons).
- `.icon`: inline SVG, 16px, 2px stroke, round caps and joins, `currentColor`.
- `.card`: in-flow white card holding rows. `.panel`: card plus shadow, for floating surfaces.
- `.row`: every list item (tasks, suggestions, chooser options). 44px min height, inset 1px separators that start after the icon, fill on hover. Selected: accent wash plus an accent bar on the leading edge.
- `.intent`, `.crew`, `.steps` (`_run.css`): the intent guess and the crew's steps, shared by the run screen and the task view. A step is a hairline ring while pending, an accent ring while running, an accent disc with a check when done.
- `.source` (`_task.css`): a reading-list card. Source name as a label, title at 17px semibold, one muted line on why. Read cards drop to a regular-weight muted title.
- `.hero-mark`: the iridescent tile with a white line-art brain. Start screen and About panel only.
- Focus: 2px accent outline, 2px offset (inset on rows, which sit in clipped cards).

## Exceptions

- macOS traffic-light window buttons keep their native colours and round shape.
- The hero tile uses its own gradient and a white highlight.
- `lobotomy.html` is deliberately off-system and is not styled from here.
- `demo-page.html` (the demo's stand-in page) loads the shared tokens and base, and keeps its few reader styles inline.

## Architecture

ITCSS folders under `src/styles/` (settings, elements, objects, components, platforms) and BEM class names. Component files only add what the shared classes don't cover.
