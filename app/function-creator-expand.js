import { initExpand } from "./expand.js";

/**
 * Expand/collapse tracking for a list of `.expand` cards sharing one id attribute.
 * @param {{
 *   getValidIds: () => Set<string>,
 *   expandSelector?: string,
 *   openMap?: Map<string, boolean>,
 * }} options
 */
export function createExpandListController({ getValidIds, expandSelector = ".expand", openMap }) {
  /** @type {ReturnType<typeof initExpand>[]} */
  let instances = [];

  /** @type {Map<string, boolean>} */
  const openState = openMap ?? new Map();

  /**
   * @param {ParentNode} root
   * @param {string} idAttr
   */
  function syncFromDom(root, idAttr) {
    root.querySelectorAll(`[${idAttr}]`).forEach((el) => {
      const id = el.getAttribute(idAttr);
      if (!id) return;
      openState.set(id, el.classList.contains("is-open"));
    });
  }

  /**
   * @param {string} id
   * @param {string[]} ensureOpenIds
   * @param {boolean} [fallbackOpen]
   */
  function resolveDefaultOpen(id, ensureOpenIds, fallbackOpen = false) {
    if (ensureOpenIds.includes(id)) return true;
    if (openState.has(id)) return openState.get(id) ?? fallbackOpen;
    return fallbackOpen;
  }

  function prune() {
    const validIds = getValidIds();

    for (const id of openState.keys()) {
      if (!validIds.has(id)) openState.delete(id);
    }
  }

  /**
   * @param {Element} listRoot
   * @param {{
   *   idAttr: string,
   *   ensureOpenIds?: string[],
   *   fallbackOpen?: boolean,
   *   onToggle?: (detail: { expandEl: Element, isOpen: boolean }) => void,
   * }} options
   */
  function initBlocks(listRoot, { idAttr, ensureOpenIds = [], fallbackOpen = false, onToggle }) {
    instances = [];

    listRoot.querySelectorAll(expandSelector).forEach((el) => {
      if (!el.hasAttribute(idAttr)) return;

      const id = el.getAttribute(idAttr) || "";
      const instance = initExpand(el, {
        defaultOpen: resolveDefaultOpen(id, ensureOpenIds, fallbackOpen),
        onToggle: (detail) => {
          const expandId = detail.expandEl.getAttribute(idAttr);
          if (expandId) openState.set(expandId, detail.isOpen);
          onToggle?.(detail);
        },
      });

      if (instance) instances.push(instance);
    });

    prune();
    return instances;
  }

  /**
   * @param {HTMLButtonElement | null | undefined} button
   */
  function updateToggleAllLabel(button) {
    if (!button) return;

    const hasItems = instances.length > 0;
    button.disabled = !hasItems;
    if (!hasItems) {
      button.textContent = "Expand all";
      return;
    }

    const allOpen = instances.every((instance) => instance?.isOpen());
    button.textContent = allOpen ? "Collapse all" : "Expand all";
  }

  function toggleAll() {
    if (instances.length === 0) return;

    const expandAll = instances.some((instance) => !instance?.isOpen());
    instances.forEach((instance) => {
      if (!instance) return;
      if (expandAll) instance.open();
      else instance.close();
    });
  }

  return {
    syncFromDom,
    initBlocks,
    updateToggleAllLabel,
    toggleAll,
    getInstances: () => instances,
  };
}
