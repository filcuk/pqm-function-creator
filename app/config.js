/** Fork-sensitive defaults — edit when creating your app from this template. */
export const APP_CONFIG = {
  /** Public site URL (GitHub Pages / custom domain). Used to hide this app in “also see”. */
  appUrl: "https://filcuk.github.io/pqm-function-creator/",
  repoUrl: "https://github.com/filcuk/pqm-function-creator",
  brandUrl: "https://github.com/filcuk",
  brandName: "Filcuk",
  themeStorageKey: "microapp-theme",
  themeChangeEvent: "microapp-theme-change",
  /**
   * Remote JSON for the footer “also see” menu.
   * Top-level array of `{ topic, items }` sections and/or flat link objects.
   * Prefer a raw.githubusercontent.com or GitHub Pages URL. Empty = skip fetch.
   * On success, replaces local `alsoSee`. On failure, keeps `alsoSee` as fallback.
   */
  alsoSeeUrl:
    "https://raw.githubusercontent.com/filcuk/shared/refs/heads/main/apps/links.json",
  /**
   * Optional topic whitelist (case-insensitive). Omit / `null` / `false` → all topics.
   * Empty array → hide named topics (ungrouped flat links still show).
   * Ungrouped flat links are never filtered by this list.
   */
  alsoSeeTopics: ["Power BI"],
  /**
   * Local related apps (fallback when `alsoSeeUrl` is empty or fetch fails).
   * Set to `[]` or `false` to hide the control when there is no remote list.
   */
  alsoSee: false,
};
