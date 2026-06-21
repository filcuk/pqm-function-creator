import { resolveElements, setHidden } from "./dom.js";
import { onDocumentEscape } from "./document-listeners.js";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initDialog({ dialogEl, openTriggers = [], onOpen, onClose }) {
  if (!dialogEl) return null;

  let isOpen = false;
  let previouslyFocused = null;

  const closeElements = dialogEl.querySelectorAll("[data-dialog-close]");
  const triggers = resolveElements(openTriggers);

  function getFocusableElements() {
    return [...dialogEl.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null && !el.closest(".hidden")
    );
  }

  function trapFocus(e) {
    if (!isOpen || e.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openDialog() {
    if (isOpen) return;

    previouslyFocused = document.activeElement;
    setHidden(dialogEl, false);
    document.body.classList.add("modal-open");
    isOpen = true;

    const closeBtn = dialogEl.querySelector(".modal-close");
    (closeBtn || dialogEl).focus();

    onOpen?.();
  }

  function closeDialog() {
    if (!isOpen) return;

    setHidden(dialogEl, true);
    document.body.classList.remove("modal-open");
    isOpen = false;

    if (previouslyFocused?.focus) {
      previouslyFocused.focus();
    }

    onClose?.();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", openDialog);
  });

  closeElements.forEach((el) => {
    el.addEventListener("click", closeDialog);
  });

  dialogEl.addEventListener("keydown", trapFocus);

  const removeEscape = onDocumentEscape(() => {
    if (!isOpen) return false;
    closeDialog();
    return true;
  }, { priority: 100 });

  return {
    openDialog,
    closeDialog,
    isDialogOpen: () => isOpen,
    destroy() {
      removeEscape();
    },
  };
}
