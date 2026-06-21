# AGENTS.md

Rules for AI agents working in the **Power Query M Function Creator** repository.

## App overview

Vanilla HTML/CSS/JS microapp (no build step) that generates documented M functions with `Value.ReplaceType`. Entry point: `index.html` → `app/main.js` → `initShell()` + `initFunctionCreator()`.

| Area | Key files |
| ---- | --------- |
| UI orchestration | `app/function-creator.js` |
| Card HTML templates | `app/function-creator-render.js` |
| Expand/collapse lists | `app/function-creator-expand.js` |
| localStorage draft | `app/function-creator-draft.js` |
| M generate/parse/format | `app/m/generate.js`, `parse.js`, `format.js`, `scan.js`, `types.js`, `escape.js` |
| Code highlighting | `app/code-editor.js` + Prism vendor |
| App-specific layout | `app/function-creator.css` (imported from `app/styles.css`) |
| Confirm dialog | `app/dialog.js` — import uses `#import-confirm-dialog` in `index.html` |

Template-only modules (`combo.js`, `dropdown.js`, `tabs.js`, `menu.js`, `demo.js`) were removed; keep `dialog.js` and `document-listeners.js` for modals.

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
2. Link `app/styles.css` (imports `tokens.css` + `components.css` + `function-creator.css`)
3. Call `initShell()` from `app/shell.js` as the first step in the page module

`initShell()` renders shared chrome via `renderPageShell()` (`app/render-shell.js`), then boots icons, theme toggle, and jump-up. Do **not** duplicate footer, theme toggle, or jump-up markup in HTML.

## Module conventions

| Pattern | Use for |
| -------- | ------- |
| `initX({ … })` | Single instance (dialog, expand) |
| `initXBlocks(root)` | Scan a subtree for `.x` blocks (expand, tooltips) |
| `initShell()` | Standard page boot |
| `setHidden(el, hidden)` | Toggle visibility — always sets **both** `.hidden` class and `hidden` attribute |
| `onDocumentClickOutside()` / `onDocumentEscape()` | Shared document listeners — do not add per-instance `document` listeners for these |
| `createExpandListController()` | Parameter/example/record-field expand-all lists |
| `createRenderer({ nextId })` | Parameter, example, and record-field card HTML |

### Document listeners

`app/document-listeners.js` registers **one** click and one keydown handler on `document`. Dialogs use Escape priority `100`.

### Visibility

Always use `setHidden()` from `app/dom.js` when showing/hiding elements programmatically.

### Icons

- Declare icons with `data-icon="name"` and optional `data-icon-class="…"` in HTML
- Call `initIcons()` (via `initShell()`) to inject SVGs
- Add new icon paths only in `app/icons.js`

### HTML escaping

Use `escapeText`, `escapeAttr`, and `escapeHtml` from `app/m/escape.js` — do not duplicate escaping helpers.

### Event delegation

`#function-creator` listens for `input` and `change` to schedule regeneration. Per-card handlers should only cover actions that need custom behaviour (title updates, kind toggles, add/remove) — do not attach duplicate regenerate listeners on every input.

### Draft persistence

- Key: `pqm-function-creator-draft` (`STORAGE_KEY` in `function-creator-draft.js`)
- Envelope: `{ v: 1, state: … }` — bump `DRAFT_VERSION` when the state shape changes
- Load path: `loadDraftState()` → `normalizeLoadedState()` in `app/m/types.js`

## CSS structure

| File | Contents |
| ---- | -------- |
| `app/styles.css` | Entry point — `@import` only |
| `app/tokens.css` | Reset, tokens, dark theme, base typography |
| `app/components.css` | Shared shell, buttons, inputs, modal, footer |
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

## When extending this app

1. Read `README.md` for the one-line description
2. Keep M logic in `app/m/`; keep DOM wiring in `function-creator*.js`
3. Update this file if you add modules, change draft schema, or new workflows
