# AGENTS.md

Rules for AI agents working in the **Power Query M Function Creator** repository.

Based on [microapp-template](https://github.com/filcuk/microapp-template) `TEMPLATE_VERSION` in `app/version.js` (currently **0.8.0**).

## App overview

Vanilla HTML/CSS/JS microapp (no build step) that generates documented M functions with `Value.ReplaceType`. Entry point: `index.html` → `app/main.js` → `initShell()` + `initFunctionCreator()`.

| Area | Key files |
| ---- | --------- |
| Fork defaults | `app/config.js` (repo/Pages URLs, also-see, theme keys) |
| Versions | `app/version.js` (`APP_VERSION`, `TEMPLATE_VERSION`) |
| Shell chrome | `app/shell/` (`shell.js`, `render-shell.js`, `also-see.js`, `page-nav.js`, `theme.js`, …) |
| Shared utils | `app/utils/` (`dom.js`, `icons.js`, `menu.js`, `document-listeners.js`, `brand-icon.js`) |
| Shared components | `app/components/` (`dialog.js`, `expand.js`, `tooltip.js`, `banner.js`) |
| UI orchestration | `app/function-creator.js` |
| Card HTML templates | `app/function-creator-render.js` |
| Expand/collapse lists | `app/function-creator-expand.js` |
| localStorage draft | `app/function-creator-draft.js` |
| M generate/parse/format | `app/m/generate.js`, `parse.js`, `format.js`, `scan.js`, `types.js`, `escape.js` |
| Code highlighting | `app/code-editor.js` + Prism vendor |
| App-specific layout | `app/function-creator.css` (imported from `app/styles.css`) |
| About / What? dialog | `app/about-dialog.js` — `#about-dialog` + tagline `#about-open-btn` in `index.html` |
| Confirm dialog | `app/components/dialog.js` — `#import-confirm-dialog` in `index.html` |

Unused template demo modules (tabular-input, rich-text, Toast UI, combo/tabs demos, etc.) are **not** vendored. Keep `menu.js` for the footer also-see dropdown.

## Confirm before complexity

Ask the user before adding:

- External dependencies (npm packages, CDN libraries, frameworks)
- Build tools or bundlers (Vite, Webpack, Rollup, etc.)
- Non-trivial architecture (state managers, routers, SSR)
- Unused template components just for parity

Prefer the simplest approach that fits the existing template.

## Stay vanilla

- Plain HTML, CSS, and JavaScript ES modules
- No build step unless explicitly approved
- No `package.json` unless the user requests it

## Reuse the design system

- Use CSS custom properties from `app/tokens.css` (`--bg`, `--accent`, etc.)
- Use existing component classes: `.btn`, `.btn-primary`, `.modal`, `.banner`, `.theme-toggle`
- Add or edit inline UI icons in `app/utils/icons.js` only — do not duplicate SVG paths in HTML
- Do not introduce parallel styling systems (Tailwind, CSS-in-JS, component libraries)

## Page boot conventions

Every HTML entry point should:

1. Set `window.__MICROAPP__ = { themeStorageKey: "…" }` before `theme-init.js` (must match `APP_CONFIG.themeStorageKey`)
2. Include blocking `app/theme-init.js` in `<head>` (prevents theme flash)
3. Link `app/styles.css` (imports `tokens.css` + used `app/css/*` partials + `function-creator.css`)
4. Use `<main id="main">` (skip link + page-nav). Keep app root as `#function-creator` inside main
5. Call `initShell()` from `app/shell/shell.js` as the first step in the page module

`initShell()` reads `APP_CONFIG`, renders shared chrome via `renderPageShell()`, then boots icons, external/heading links, also-see, theme, sticky chrome, tooltips, and page-nav. Do **not** duplicate footer, theme toggle, or page-nav markup in HTML.

Optional: `data-sticky-header` / `data-sticky-section-headings` on `<html>`.

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, expand) |
| `initXBlocks(root)` / `initTooltips(root)` | Scan a subtree for blocks |
| `initShell()` | Standard page boot |
| `setHidden(el, hidden)` | Toggle visibility — always sets **both** `.hidden` class and `hidden` attribute |
| `onDocumentClickOutside()` / `onDocumentEscape()` | Shared document listeners — do not add per-instance `document` listeners for these |
| `createExpandListController()` | Parameter/example/record-field expand-all lists |
| `createRenderer({ nextId })` | Parameter, example, and record-field card HTML |

### Document listeners

`app/utils/document-listeners.js` registers **one** click and one keydown handler on `document`. Dialogs use Escape priority `100`.

### Visibility

Always use `setHidden()` from `app/utils/dom.js` when showing/hiding elements programmatically.

### Icons

- Declare icons with `data-icon="name"` and optional `data-icon-class="…"` in HTML
- Call `initIcons()` (via `initShell()`) to inject SVGs
- Add new icon paths only in `app/utils/icons.js`
- Domain alias: `add` → `plus` (keep existing `data-icon="add"` call sites)

### HTML escaping

Use `escapeText`, `escapeAttr`, and `escapeHtml` from `app/m/escape.js` — do not duplicate escaping helpers.

### Event delegation

`#function-creator` listens for `input` and `change` to schedule regeneration. Per-card handlers should only cover actions that need custom behaviour (title updates, kind toggles, add/remove) — do not attach duplicate regenerate listeners on every input.

### Draft persistence

- Key: `pqm-function-creator-draft` (`STORAGE_KEY` in `function-creator-draft.js`)
- Envelope: `{ v: 1, state: … }` — bump `DRAFT_VERSION` when the state shape changes
- Load path: `loadDraftState()` → `normalizeLoadedState()` in `app/m/types.js`

### Also see

Configured in `app/config.js` (`alsoSeeUrl`, `alsoSeeTopics`, `alsoSee`, `appUrl`). Remote JSON replaces the menu on success; `alsoSee: false` hides the control until then. `appUrl` must match the public Pages URL so this app is omitted from its own list.

## CSS structure

| File | Contents |
| ---- | -------- |
| `app/styles.css` | Entry point — `@import` only |
| `app/tokens.css` | Reset, tokens, dark theme, base typography |
| `app/css/layout.css` | Shell layout, footer, page-nav, also-see, sticky |
| `app/css/controls-*.css` | Buttons, fields, disclosure, menus |
| `app/css/overlays.css` | Banners, tooltips, modals |
| `app/function-creator.css` | Function creator layout and cards |

## Keep GitHub Pages deployable

- Entry HTML at repo root (`index.html`)
- Shared assets under `app/`
- ES modules need a local server for development (`npx serve .`)

## Accessibility

- Dialogs: focus trap, Escape to close, restore focus, `aria-modal`, labelled titles
- Toggle buttons: `aria-pressed` on `.param-toggle`
- Tooltips: `aria-describedby` via `initTooltips()`
- Collapsible cards: expand component with `aria-expanded` on triggers
- Skip link → `#main`; page-nav up/down jumps (`showHeadingList: false` in `main.js`)

## Manual smoke-test checklist

Run with `npx serve .` and verify:

1. **Fresh load** — default function name, empty expression, parameters/examples collapsed, output generates when expression is filled in.
2. **Parameters** — add scalar and record parameters; toggle optional/nullable; expand/collapse all; record fields add/remove/expand.
3. **Examples** — add/remove; description updates card title; code/result edit and appear in generated meta.
4. **Return type** — primitive options including `null` and `none`; custom type field shows for “custom…”.
5. **Output styles** — switch let/shared; copy button copies M or shows validation banner when invalid.
6. **Import** — invalid paste shows error banner; valid paste opens confirm dialog; cancel leaves form; confirm replaces state and shows success banner.
7. **Draft** — edit fields, reload page, draft restores; corrupt localStorage does not break the app.
8. **Theme** — light/dark/auto via footer toggle without flash on reload.
9. **Shell** — page-nav up/down jumps (heading hover menu off); footer shows app version; **also see** loads Power BI peers (this app absent).
10. **About** — tagline **What?** opens dialog; **Got it** / Escape / backdrop close; **Huh?** reveals simpler help, then redirects on third click.

## When extending this app

1. Read `README.md` for the one-line description
2. Keep M logic in `app/m/`; keep DOM wiring in `function-creator*.js`
3. Prefer shared modules under `app/shell/`, `app/components/`, `app/utils/`, `app/css/` over reinventing chrome
4. Update this file if you add modules, change draft schema, bump template version, or new workflows
