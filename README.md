# microapp-template

A reusable starter for small static microapps: vanilla HTML/CSS/JS, GitHub Pages deployment, and a design system inspired by [pqm-stepper](https://github.com/filcuk/pqm-stepper).

**Live demo:** after enabling GitHub Pages, open `demo.html` on your site (e.g. `https://<user>.github.io/<repo>/demo.html`).

## Quick start

1. Click **Use this template** on GitHub to create a new repo.
2. Rename the app in `index.html` (title, heading, tagline).
3. Build your UI in the `<main>` area and wire logic in [`app/main.js`](app/main.js).
4. Push to `main` — the included workflow deploys to GitHub Pages.

## Available features and components

| Feature | Description |
| -------- | ----------- |
| **Design tokens** | CSS custom properties in [`app/tokens.css`](app/tokens.css) for background, surface, text, borders, accent, banners, and code blocks. Light and dark values via `[data-theme="dark"]`. Component styles in [`app/components.css`](app/components.css). |
| **Theme toggle** | Footer control (injected by `initShell()`): light, dark, or system (`auto`). Stored in `localStorage` under `microapp-theme`. `app/theme-init.js` runs in `<head>` to avoid flash of wrong theme. |
| **Layout shell** | Semantic `header` / `main` / `footer` (footer rendered by JS), max-width 1200px, flex column page. |
| **Buttons** | `.btn` (default), `.btn-primary`, `.btn-icon` (with `aria-pressed` for toggles), `.btn-link`, disabled state. |
| **Inputs** | `.field` / `.field-label` with `.input` (single line) and `.textarea` (multi-line). |
| **Combo button** | Split `.combo-btn` with main action + chevron menu; behaviour from [`app/combo.js`](app/combo.js). |
| **Dropdown** | `.dropdown` with `.dropdown-trigger` and `.dropdown-menu`; behaviour from [`app/dropdown.js`](app/dropdown.js). |
| **Expand** | `.expand` disclosure with notch + label trigger and collapsible `.expand-panel`; behaviour from [`app/expand.js`](app/expand.js). |
| **Tabs** | `.tabs` block with `.tabs-list` / `.tabs-tab` and `.tabs-panel` content; behaviour from [`app/tabs.js`](app/tabs.js). |
| **Jump up** | Fixed `#jump-up` button; border ring shows scroll progress; appears after scrolling; click returns to top. [`app/jump-up.js`](app/jump-up.js). |
| **Dialogs** | Accessible modal: backdrop, focus trap, Escape, focus restore. Markup uses `.modal` / `.modal-panel`; behaviour from [`app/dialog.js`](app/dialog.js). |
| **Tooltips** | Instant custom tooltips — no native `title` delay. Add `data-tooltip="…"` and optional `data-tooltip-position="top\|bottom\|left\|right"`. See [`app/tooltip.js`](app/tooltip.js). |
| **Banners** | `.banner.banner-important`, `.banner-info`, `.banner-success`, `.banner-note`, `.banner-warning`, `.banner-error` with left icon via `data-icon` (`important`, `info`, `success`, `note`, `warning`, `error`). |
| **Icons** | Inline SVGs in [`app/icons.js`](app/icons.js) (`light-mode`, `dark-mode`, `auto-mode`, `lines`, …); use `data-icon` in HTML or `createIcon()` in JS. Source from [Icônes — Material Icons (Round)](https://icones.js.org/collection/ic?s=info&variant=Round). Logo files stay in `app/res/`. |
| **Toolbar helper** | `.toolbar` flex row for button groups. |
| **Demo page** | [`demo.html`](demo.html) showcases all components. |
| **GitHub Pages** | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes `index.html`, `demo.html`, and `app/`. |

## Project structure

```
index.html          # Starter homepage
demo.html           # Component showcase
.nojekyll           # Skip Jekyll on GitHub Pages
app/
  styles.css            # Imports tokens.css + components.css
  tokens.css            # Design tokens, base typography, reduced motion
  components.css        # Layout shell and UI components
  theme-init.js         # Theme before first paint
  theme.js              # Theme preference module
  render-shell.js       # Injects footer + jump-up markup
  shell.js              # Shared page boot (render, icons, theme, jump-up)
  document-listeners.js # Single document click / Escape registry
  dom.js                # setHidden(), resolveElements(), prefersReducedMotion()
  menu.js               # Shared popup menu logic (combo, dropdown)
  dialog.js         # Modal controller
  combo.js          # Combo button controller
  dropdown.js       # Dropdown menu controller
  expand.js         # Expand / disclosure controller
  tabs.js           # Tabbed section controller
  jump-up.js        # Scroll-to-top button
  icons.js          # Inline SVG icon registry
  tooltip.js        # Instant tooltips
  main.js           # index.html entry
  demo.js           # demo.html entry
  res/icon.svg      # Placeholder logo
```

## Local preview

ES modules require a local server (opening `index.html` directly may block imports):

```bash
npx serve .
```

Then open `http://localhost:3000` and `http://localhost:3000/demo.html`.

## GitHub Pages setup

1. Push to `main` (includes the workflow).
2. In the repo **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. After the workflow runs, the site is at `https://<username>.github.io/<repo>/`.

The workflow copies only publishable files into `_site/` (`index.html`, `demo.html`, `.nojekyll`, `app/`). README and other repo files are not published.

## Using components

### Theme

```html
<script src="app/theme-init.js"></script>
<link rel="stylesheet" href="app/styles.css" />
<script type="module" src="app/main.js"></script>
```

```javascript
import { initShell } from "./shell.js";

initShell(); // footer + jump-up + icons + theme in one call
```

Or wire individually:

```javascript
import { initTheme, initThemeToggle } from "./theme.js";
initTheme();
initThemeToggle(document.getElementById("theme-toggle"));
```

### Dialog

```javascript
import { initDialog } from "./dialog.js";

const dialog = initDialog({
  dialogEl: document.getElementById("my-dialog"),
  openTriggers: "#open-my-dialog",
});
// dialog.openDialog(), dialog.closeDialog(), dialog.isDialogOpen()
```

Close controls use `data-dialog-close` on backdrop, × button, or footer buttons.

### Tooltip

```html
<button type="button" data-tooltip="Help text" data-tooltip-position="top">?</button>
```

```javascript
import { initTooltips } from "./tooltip.js";
initTooltips(document);
```

### Inputs

```html
<label class="field" for="name">
  <span class="field-label">Name</span>
  <input type="text" id="name" class="input" placeholder="Enter text…" />
</label>

<label class="field" for="notes">
  <span class="field-label">Notes</span>
  <textarea id="notes" class="textarea" rows="4"></textarea>
</label>
```

### Combo button

```javascript
import { initCombo } from "./combo.js";

initCombo(document.getElementById("my-combo"), {
  onMainClick: () => { /* primary action */ },
  onSelect: ({ value, label }) => { /* menu item chosen */ },
});
```

Markup: `.combo-btn` > `.combo-btn-main` + `.combo-btn-toggle` + `ul.combo-menu` with `.combo-menu-item` buttons.

### Dropdown

```javascript
import { initDropdown } from "./dropdown.js";

initDropdown(document.getElementById("my-dropdown"), {
  onSelect: ({ value, label }) => { /* item chosen */ },
});
```

Markup: `.dropdown` > `.dropdown-trigger` + `ul.dropdown-menu` with `.dropdown-menu-item` buttons.

### Expand

```html
<div class="expand">
  <button type="button" class="expand-trigger" aria-expanded="false" aria-controls="my-expand-panel">
    <span class="expand-notch" aria-hidden="true"></span>
    <span class="expand-label">Advanced options</span>
  </button>
  <div id="my-expand-panel" class="expand-panel hidden" hidden>
    <div class="expand-body">More content here.</div>
  </div>
</div>
```

```javascript
import { initExpand, initExpands } from "./expand.js";

initExpands(document); // all .expand blocks

// or one instance:
const expand = initExpand(document.getElementById("my-expand"));
// expand.open(), expand.close(), expand.toggle(), expand.isOpen()
```

### Tabs

```html
<div class="tabs">
  <div class="tabs-list" role="tablist" aria-label="Sections">
    <button type="button" class="tabs-tab" role="tab" id="tab-a" aria-selected="true" aria-controls="panel-a">Overview</button>
    <button type="button" class="tabs-tab" role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b" tabindex="-1">Details</button>
  </div>
  <div id="panel-a" class="tabs-panel" role="tabpanel" aria-labelledby="tab-a">
    <div class="tabs-body">Overview content</div>
  </div>
  <div id="panel-b" class="tabs-panel hidden" role="tabpanel" aria-labelledby="tab-b" hidden>
    <div class="tabs-body">Details content</div>
  </div>
</div>
```

```javascript
import { initTabs, initTabsBlocks } from "./tabs.js";

initTabsBlocks(document); // all .tabs blocks

// or one instance:
const tabs = initTabs(document.getElementById("my-tabs"));
// tabs.selectTab(1), tabs.getActiveIndex()
```

Arrow keys move between tabs when the tab list is focused.

### Jump up

Injected by `initShell()` via [`app/render-shell.js`](app/render-shell.js). To customize repo links when forking:

```javascript
import { initShell } from "./shell.js";

initShell({ repoUrl: "https://github.com/you/your-app" });
```

Or wire manually:

```javascript
import { renderPageShell } from "./render-shell.js";
import { initJumpUpButton } from "./jump-up.js";

renderPageShell();
initJumpUpButton();
```

The accent border ring fills with scroll progress (`--scroll-progress`, 0–1). The button fades in after ~200px scroll.

### Icons

All inline UI icons live in [`app/icons.js`](app/icons.js). Edit paths there once; pages mount them at load via `initIcons()`.

Browse and copy SVG paths from [Icônes — Google Material Icons (Round variant)](https://icones.js.org/collection/ic?s=info&variant=Round) (`ic` collection, `variant=Round`).

HTML:

```html
<button type="button" data-icon="light-mode" data-icon-class="theme-icon" aria-label="Light"></button>
```

JavaScript:

```javascript
import { createIcon, initIcons } from "./icons.js";

initIcons(document); // mounts every [data-icon] in the page

const svg = createIcon("lines", { className: "btn-icon-svg" });
button.append(svg);
```

Add new icons to the `ICONS` object in `app/icons.js`. Favicon and brand images (`app/res/icon.svg`, `app/res/icon/fi.svg`) stay as files.

Licensed icon sets (e.g. Material Icons) can use optional metadata on each entry:

```javascript
import { ICON_ATTRIBUTIONS } from "./icons.js";

export const ICONS = {
  info: {
    viewBox: "0 0 24 24",
    markup: `<path fill="currentColor" d="…"/>`,
    attribution: ICON_ATTRIBUTIONS.materialIcons,
    name: "round-info", // source collection id (Icônes / Material Icons)
  },
};
```

- `name` — original icon name in the source collection (metadata only; not used at runtime)
- `attribution` — license notice, inserted as an HTML comment inside the SVG
- `ref` — alias to another `ICONS` key (e.g. `lines: { ref: "note" }`)

Pass `includeAttribution: false` to `createIcon()` if you need the SVG without the comment.

## Agent guidelines

See [`AGENTS.md`](AGENTS.md) for rules when using AI assistants in this repo (confirm before external deps, stay vanilla, reuse components).

## License

MIT — see [LICENSE](LICENSE).
