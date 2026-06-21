const DEFAULTS = {
  repoUrl: "https://github.com/filcuk/microapp-template",
  brandUrl: "https://github.com/filcuk",
  brandName: "Filcuk",
};

/**
 * Inject shared page chrome: footer (links + theme toggle) and jump-up button.
 * Skips if `#app-page-footer` already exists.
 */
export function renderPageShell(options = {}) {
  if (document.getElementById("app-page-footer")) return;

  const { repoUrl, brandUrl, brandName } = { ...DEFAULTS, ...options };
  const issuesUrl = `${repoUrl}/issues`;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<footer id="app-page-footer">
      <p class="footer-meta">
        <span>
          report an
          <a href="${issuesUrl}" target="_blank" rel="noopener noreferrer">issue</a>
          · star on
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>
          · microapp by
        </span>
        <a class="footer-brand" href="${brandUrl}" target="_blank" rel="noopener noreferrer">
          <img src="app/res/icon/fi.svg" alt="${brandName}" width="26" height="26" />
        </a>
      </p>
      <div id="theme-toggle" class="theme-toggle" role="group" aria-label="Theme">
        <button type="button" class="theme-toggle-btn" data-theme-mode="light" data-icon="light-mode" data-icon-class="theme-icon" aria-label="Light theme" aria-pressed="false" title="Light"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="dark" data-icon="dark-mode" data-icon-class="theme-icon" aria-label="Dark theme" aria-pressed="false" title="Dark"></button>
        <button type="button" class="theme-toggle-btn" data-theme-mode="auto" data-icon="auto-mode" data-icon-class="theme-icon" aria-label="System theme" aria-pressed="false" title="System"></button>
      </div>
    </footer>
    <button type="button" id="jump-up" class="jump-up" aria-label="Back to top" aria-hidden="true" tabindex="-1">
      <span class="jump-up-ring" aria-hidden="true"></span>
      <span class="jump-up-inner">
        <span data-icon="chevron-up" data-icon-class="jump-up-icon-svg"></span>
      </span>
    </button>`
  );
}
