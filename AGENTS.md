# AGENTS.md

Rules for AI agents working in this microapp template repository.

## Confirm before complexity

Ask the user before adding:

- External dependencies (npm packages, CDN libraries, frameworks)
- Build tools or bundlers (Vite, Webpack, Rollup, etc.)
- Non-trivial architecture (state managers, routers, SSR)

Prefer the simplest approach that fits the existing template.

## Stay vanilla

- Plain HTML, CSS, and JavaScript ES modules
- No build step unless explicitly approved
- No `package.json` unless the user requests it

## Reuse the design system

- Use CSS custom properties from `app/tokens.css` (`--bg`, `--accent`, etc.)
- Use existing component classes: `.btn`, `.btn-primary`, `.modal`, `.banner`, `.theme-toggle`
- Add or edit inline UI icons in `app/icons.js` only — do not duplicate SVG paths in HTML
- Do not introduce parallel styling systems (Tailwind, CSS-in-JS, component libraries)

## Page boot conventions

Every HTML entry point should:

1. Include blocking `app/theme-init.js` in `<head>` (prevents theme flash)
2. Link `app/styles.css` (imports `tokens.css` + `components.css`)
3. Call `initShell()` from `app/shell.js` as the first step in the page module

`initShell()` renders shared chrome via `renderPageShell()` (`app/render-shell.js`), then boots icons, theme toggle, and jump-up. Do **not** duplicate footer, theme toggle, or jump-up markup in HTML.

Optional `renderPageShell({ repoUrl, brandUrl, brandName })` overrides for forks.

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, combo, dropdown, expand) |
| `initXBlocks(root)` | Scan a subtree for `.x` blocks (tabs, expand, tooltips) |
| `initShell()` | Standard page boot |
| `setHidden(el, hidden)` | Toggle visibility — always sets **both** `.hidden` class and `hidden` attribute |
| `initPopupMenu()` | Anchored popup menus (combo chevron, dropdown) |
| `onDocumentClickOutside()` / `onDocumentEscape()` | Shared document listeners — do not add per-instance `document` listeners for these |

### Document listeners

`app/document-listeners.js` registers **one** click and one keydown handler on `document`. Modules register callbacks:

- **Click outside:** all handlers run on every click (menus close when click is outside)
- **Escape:** handlers sorted by priority (higher first). Return `true` when handled. Dialogs use priority `100`, menus use `50`.

When a module registers listeners, store and call the returned unsubscribe in `destroy()` if provided.

### Visibility

Always use `setHidden()` from `app/dom.js` when showing/hiding elements programmatically. Do not toggle `.hidden` alone.

### Icons

- Declare icons with `data-icon="name"` and optional `data-icon-class="…"` in HTML
- Call `initIcons()` (via `initShell()`) to inject SVGs
- Add new icon paths only in `app/icons.js`
- Source SVGs from [Icônes — Google Material Icons (Round variant)](https://icones.js.org/collection/ic?s=info&variant=Round); copy path markup into `ICONS` and set `attribution` when required
- For sourced icons, set `name` to the original collection id (e.g. `round-info`) — metadata for traceability; omit for custom or in-house icons. The `ICONS` object key remains the app id used in `data-icon`
- To alias one app id to another, use `{ ref: "other-icon" }` instead of duplicating markup (e.g. `lines: { ref: "note" }`)
- Third-party icons that require a license notice: set `attribution` on the icon definition (use `ICON_ATTRIBUTIONS` for common sets). Rendered as an SVG comment via `createIcon()` / `initIcons()`

## CSS structure

| File | Contents |
| ---- | -------- |
| `app/styles.css` | Entry point — `@import` only |
| `app/tokens.css` | Reset, `:root` tokens, dark theme, base typography, `.hidden`, reduced-motion |
| `app/components.css` | Layout shell, buttons, inputs, components, footer, theme toggle |

Keep HTML linking only `styles.css`. Edit tokens or components directly; do not merge back into a monolith.

Respect `prefers-reduced-motion: reduce` — transitions live in components; global overrides are in `tokens.css`. JS scroll behaviour should use `prefersReducedMotion()` from `app/dom.js`.

## Keep GitHub Pages deployable

- Entry HTML files live at the repo root (`index.html`, optional pages like `demo.html`)
- Shared assets live under `app/`
- Avoid features that require a backend or server-only APIs
- ES modules need a local server for development (`npx serve .`) — document if adding fetch-based features

## Match aesthetics

Match the established look (based on [pqm-stepper](https://github.com/filcuk/pqm-stepper)):

- GitHub-inspired palette and 6px border radii
- System UI font stack
- Light / dark / auto theme via `data-theme` on `:root`
- Blocking `app/theme-init.js` in `<head>` to prevent flash of wrong theme

## Accessibility

- Dialogs: focus trap, Escape to close (via document listener), restore focus, `aria-modal` and labelled titles
- Toggle buttons: `aria-pressed` where state toggles
- Tooltips: `aria-describedby` linking trigger to `#tooltip` on show/hide; keyboard focus support
- Prefer semantic HTML (`header`, `main`, `footer`, `button`)
- Popup menus: `aria-expanded` on toggle buttons

## When extending this template

1. Read `README.md` for available components
2. Check `demo.html` for usage examples
3. Keep changes focused — one concern per file when possible
4. Update `README.md` if you add a new reusable component or workflow step
