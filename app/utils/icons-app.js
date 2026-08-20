/**
 * Fork-owned inline SVG icons. Never overwritten by template sync.
 *
 * Add app-specific entries here (or blank stubs with empty `markup` when the
 * user will supply paths). Prefer `{ ref: "template-id" }` to alias a template
 * icon. Import `ICON_ATTRIBUTIONS` from `./icons.js` (or `./icons-template.js`)
 * when setting `attribution`.
 *
 * Available (app): add (ref→plus)
 */

/** @typedef {{ viewBox: string, markup: string, attribution?: string, name?: string }} IconSvgDef */
/** @typedef {{ ref: string }} IconRefDef */
/** @typedef {IconSvgDef | IconRefDef} IconDef */

/** @type {Record<string, IconDef>} */
export const APP_ICONS = {
  /** Domain alias — keep existing `data-icon="add"` call sites working. */
  add: { ref: "plus" },
};
