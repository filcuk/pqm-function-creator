/** Toggle visibility using `.hidden` class and the `hidden` attribute together. */
export function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("hidden", hidden);
  el.hidden = hidden;
}

/** Whether the user prefers reduced motion. */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolve a selector string, element, or iterable to an array of elements. */
export function resolveElements(value) {
  if (!value) return [];
  if (typeof value === "string") {
    return [...document.querySelectorAll(value)];
  }
  if (value instanceof Element) return [value];
  return [...value];
}
