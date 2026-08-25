# AGENTS.md

Rules for AI agents working in the **Power Query M Function Creator** repository.

Based on [SMA1 Framework](https://github.com/filcuk/sma1-framework) `FRAMEWORK_VERSION` in `app/version.js` (currently **0.13.0**). Pin and sync via `framework.lock.json` + `npm run sync:framework` / `verify:framework`.

## App overview

Vanilla HTML/CSS/JS microapp (no build step) that generates documented M functions with `Value.ReplaceType`. Entry point: `index.html` → `app/main.js` → `initShell()` + `initAboutDialog()` + `initFunctionCreator()`.

| Area | Key files |
| ---- | --------- |
| Fork defaults | `app/config.js` (repo/Pages URLs, also-see, theme keys) |
| Versions | `app/version.js` (`APP_VERSION`, `FRAMEWORK_VERSION`) |
| Framework pin | `framework.lock.json`, `framework-manifest.json`, `scripts/sync-framework.mjs` |
| Shell chrome | `app/shell/` (`shell.js`, `render-shell.js`, `also-see.js`, `page-nav.js`, `theme.js`, …) |
| Shared utils | `app/utils/` (`dom.js`, `icons.js`, `icons-framework.js`, `icons-app.js`, `menu.js`, `document-listeners.js`, `brand-icon.js`) |
| Shared components | `app/components/` (`dialog.js`, `about-dialog.js`, `expand.js`, `tooltip.js`, `banner.js`, `dropdown.js`, `segmented-control.js`, `chip.js`, `toggle-button.js`, `code-block.js`, `expandable-surface.js`, `popover.js`, `badge.js`, `tutorial.js`) |
| UI orchestration | `app/function-creator.js` |
| Card HTML templates | `app/function-creator-render.js` |
| Expand/collapse lists | `app/function-creator-expand.js` |
| localStorage draft | `app/function-creator-draft.js` |
| M generate/parse/format | `app/m/generate.js`, `parse.js`, `format.js`, `scan.js`, `types.js`, `escape.js` |
| Code highlighting | Editable: `app/code-editor.js`. Output: catalogue `code-block` + Prism (`prism.min.js`, `prism-line-numbers.min.js`, fork `prism-powerquery.min.js`) |
| App-specific layout | `app/function-creator.css` (imported from `app/css/app.css`) |
| About / What? dialog | `app/components/about-dialog.js` — `#about-dialog` + tagline `#about-open-btn` in `index.html` (markup stages) |
| Confirm dialog | `app/components/dialog.js` — `#import-confirm-dialog` in `index.html` |

Partial lock keeps: `dialog`, `about-dialog`, `expand`, `fields`, `dropdown`, `segmented-control`, `chip`, `toggle-button`, `code-block`, `expandable-surface`, `popover`, `badge`, `tutorial` (plus always-on shell pieces). Unused catalogue demos (tabular-input, rich-text, Toast UI, charts, etc.) are **not** selected. Keep `menu.js` for the footer also-see dropdown. Fork-owned editable fields use `code-editor.js`; generated **Output** uses catalogue `code-block` + Power Query Prism (`prism-powerquery.min.js`).

Slim `package.json` exists only for framework sync/verify scripts — not a runtime or bundler step.

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
- Keep `package.json` limited to framework tooling (`sync:framework` / `verify:framework`) unless the user asks for more

## Reuse the design system

- Use CSS custom properties from `app/tokens.css` (`--bg`, `--accent`, etc.)
- Fork brand accent overrides belong in `app/css/app.css` (not `tokens.css`)
- Use existing component classes: `.btn`, `.btn-primary`, `.modal`, `.banner`, `.theme-toggle`
- Add fork icons in `app/utils/icons-app.js` only; framework catalogue is `icons-framework.js` (synced). Public API: `icons.js`
- Do not invent SVG path data — use `add-icon` / `handle-assets`
- Do not introduce parallel styling systems (Tailwind, CSS-in-JS, component libraries)

## Page boot conventions

Every HTML entry point should:

1. Set `window.__MICROAPP__ = { themeStorageKey: "…" }` before `theme-init.js` (must match `APP_CONFIG.themeStorageKey`)
2. Include blocking `app/theme-init.js` in `<head>` (prevents theme flash)
3. Link `app/styles.css` (fork entry: `tokens.css` → `css/framework.css` → `css/app.css`)
4. Use `<main id="main">` (skip link + page-nav). Keep app root as `#function-creator` inside main
5. Call `initShell()` from `app/shell/shell.js` as the first step in the page module

`initShell()` reads `APP_CONFIG`, renders shared chrome via `renderPageShell()`, then boots icons, external/heading links, also-see, theme, sticky chrome, tooltips, and page-nav. Do **not** duplicate footer, theme toggle, or page-nav markup in HTML.

Optional: `data-sticky-header` / `data-sticky-section-headings` on `<html>`. Section titles use `.section-title` (not `.section-heading`).

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, about-dialog, expand) |
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
- Framework icons: `app/utils/icons-framework.js` (synced). Fork icons / aliases: `app/utils/icons-app.js`
- Domain alias: `add` → `plus` in `icons-app.js` (keep existing `data-icon="add"` call sites)

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
| `app/styles.css` | Fork entry — `tokens.css` → `css/framework.css` → `css/app.css` |
| `app/tokens.css` | Reset, tokens, dark theme, base typography (synced) |
| `app/css/framework.css` | Generated partial index (sync regenerates; do not hand-edit) |
| `app/css/app.css` | Fork-owned — Prism CSS, `prism-theme.css`, `function-creator.css`, optional accent |
| `app/css/layout.css` | Shell layout, footer, page-nav, also-see, sticky |
| `app/css/controls-*.css` | Buttons, fields, disclosure, menus |
| `app/css/overlays.css` | Banners, tooltips, modals, about-dialog stages |
| `app/function-creator.css` | Function creator layout and cards |

## Keep GitHub Pages deployable

- Entry HTML at repo root (`index.html`)
- Shared assets under `app/`
- ES modules need a local server for development (`npx serve .`)

## Accessibility

- Dialogs: focus trap, Escape to close, restore focus, `aria-modal`, labelled titles
- Toggle buttons: framework `.btn-toggle` + `initToggleButton` (`aria-pressed`)
- Tooltips: `aria-describedby` via `initTooltips()`
- Collapsible cards: expand component with `aria-expanded` on triggers
- Skip link → `#main`; page-nav up/down jumps (`showHeadingList: false` in `main.js`)

## Manual smoke-test checklist

Run with `npx serve .` and verify:

1. **Fresh load** — default function name, empty expression, parameters/examples collapsed, output generates when expression is filled in.
2. **Parameters** — add scalar and record parameters; toggle optional/nullable; expand/collapse all; record fields add/remove/expand.
3. **Examples** — add/remove; description updates card title; code/result edit and appear in generated meta.
4. **Return type** — primitive options including `null` and `none`; custom type field shows for “custom…”.
5. **Output** — section has no card chrome; top toolbar Copy / Maximize; maximize expands overlay; switch let/shared regenerates.
6. **Import** — invalid paste shows error banner; valid paste opens confirm dialog; cancel leaves form; confirm replaces state and shows success banner.
7. **Draft** — edit fields, reload page, draft restores; corrupt localStorage does not break the app.
8. **Theme** — light/dark/auto via footer toggle without flash on reload.
9. **Shell** — page-nav up/down jumps (heading hover menu off); footer shows app version; **also see** loads Power BI peers (this app absent).
10. **About** — tagline **What?** opens dialog; **Got it** / Escape / backdrop close; **Huh?** reveals simpler stages; after the last stage, **I don't get it** link appears (opens PBS Kids in a new tab). **Guided tour** closes the dialog and runs a spotlight walkthrough of Import → Output.

## When extending this app

1. Read `README.md` for the one-line description
2. Keep M logic in `app/m/`; keep DOM wiring in `function-creator*.js`
3. Prefer shared modules under `app/shell/`, `app/components/`, `app/utils/`, `app/css/` over reinventing chrome
4. Prefer `npm run sync:framework` / `verify:framework` over hand-merging framework files; use `migrate-framework` for version bumps
5. Update this file if you add modules, change draft schema, bump framework version, or new workflows
