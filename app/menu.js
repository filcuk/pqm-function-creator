import { onDocumentClickOutside, onDocumentEscape } from "./document-listeners.js";

/**
 * Shared open/close behaviour for anchored popup menus (combo chevron, dropdown).
 */
export function initPopupMenu({
  containerEl,
  menuEl,
  toggleEl,
  itemSelector,
  onSelect,
}) {
  if (!containerEl || !menuEl) return null;

  let isOpen = false;

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    menuEl.classList.add("hidden");
    toggleEl?.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    isOpen = true;
    menuEl.classList.remove("hidden");
    toggleEl?.setAttribute("aria-expanded", "true");
  }

  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  function onToggleClick(e) {
    e.stopPropagation();
    toggleMenu();
  }

  function onMenuClick(e) {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    closeMenu();
    onSelect?.({
      containerEl,
      item,
      value: item.dataset.value,
      label: item.textContent.trim(),
    });
  }

  toggleEl?.addEventListener("click", onToggleClick);
  menuEl.addEventListener("click", onMenuClick);

  const removeClickOutside = onDocumentClickOutside((e) => {
    if (!containerEl.contains(e.target)) closeMenu();
  });

  const removeEscape = onDocumentEscape(() => {
    if (!isOpen) return false;
    closeMenu();
    return true;
  }, { priority: 50 });

  return {
    closeMenu,
    openMenu,
    toggleMenu,
    isOpen: () => isOpen,
    destroy() {
      toggleEl?.removeEventListener("click", onToggleClick);
      menuEl.removeEventListener("click", onMenuClick);
      removeClickOutside();
      removeEscape();
    },
  };
}
