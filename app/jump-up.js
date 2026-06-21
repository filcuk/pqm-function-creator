import { prefersReducedMotion } from "./dom.js";

export function initJumpUp(buttonEl, { showAfter = 200, onClick } = {}) {
  if (!buttonEl) return null;

  let ticking = false;

  function update() {
    const scrollY = window.scrollY;
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress =
      maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
    const visible = scrollY > showAfter;

    buttonEl.style.setProperty("--scroll-progress", String(progress));
    buttonEl.classList.toggle("is-visible", visible);
    buttonEl.setAttribute("aria-hidden", visible ? "false" : "true");
    buttonEl.tabIndex = visible ? 0 : -1;

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  buttonEl.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    onClick?.({ buttonEl });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();

  return { update };
}

/** Wire the page jump-up control (defaults to `#jump-up`). */
export function initJumpUpButton(selector = "#jump-up") {
  return initJumpUp(document.querySelector(selector));
}
