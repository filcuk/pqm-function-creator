import { renderPageShell } from "./render-shell.js";
import { initIcons } from "./icons.js";
import { initTheme, initThemeToggle } from "./theme.js";
import { initJumpUpButton } from "./jump-up.js";

/**
 * Render shared chrome, then boot icons, theme, and jump-up.
 * Call once per HTML entry point before page-specific inits.
 */
export function initShell(options = {}) {
  renderPageShell(options);
  initIcons();
  initTheme();
  initThemeToggle(document.getElementById("theme-toggle"));
  initJumpUpButton();
}
