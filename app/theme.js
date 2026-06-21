const STORAGE_KEY = "microapp-theme";
const MODES = ["auto", "light", "dark"];

function getStoredPreference() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return MODES.includes(stored) ? stored : "auto";
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(preference = getStoredPreference()) {
  if (preference === "auto") return getSystemTheme();
  return preference;
}

function applyTheme(preference = getStoredPreference()) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.dispatchEvent(
    new CustomEvent("microapp-theme-change", {
      detail: { preference, resolved },
    })
  );
}

function setThemePreference(preference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
  syncThemeToggle(preference);
}

function syncThemeToggle(preference) {
  document.querySelectorAll("[data-theme-mode]").forEach((button) => {
    const active = button.dataset.themeMode === preference;
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

export function initThemeToggle(container) {
  if (!container) return;

  container.querySelectorAll("[data-theme-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setThemePreference(button.dataset.themeMode);
    });
  });

  syncThemeToggle(getStoredPreference());

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getStoredPreference() === "auto") {
        applyTheme("auto");
      }
    });
}

export function initTheme() {
  applyTheme(getStoredPreference());
}
