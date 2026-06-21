import { initShell } from "./shell.js";
import { initDialog } from "./dialog.js";
import { initTooltips } from "./tooltip.js";
import { initCombo } from "./combo.js";
import { initDropdown } from "./dropdown.js";
import { initExpands } from "./expand.js";
import { initTabsBlocks } from "./tabs.js";
import { setHidden } from "./dom.js";

initShell();
initTooltips(document);
initExpands(document);
initTabsBlocks(document);

const comboResultEl = document.getElementById("demo-combo-result");
const dropdownResultEl = document.getElementById("demo-dropdown-result");

const comboOptions = [
  { value: "example-1", label: "Example 1" },
  { value: "example-2", label: "Example 2" },
  { value: "example-3", label: "Example 3" },
];

function pickRandomOption(options, excludeValue) {
  const pool = excludeValue
    ? options.filter((option) => option.value !== excludeValue)
    : options;
  if (!pool.length) return options[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

let lastComboValue = null;

initCombo(document.getElementById("demo-combo"), {
  onMainClick: () => {
    const picked = pickRandomOption(comboOptions, lastComboValue);
    lastComboValue = picked.value;
    if (comboResultEl) {
      comboResultEl.textContent = `Main action picked: ${picked.label}`;
    }
  },
  onSelect: ({ label, value }) => {
    lastComboValue = value;
    if (comboResultEl) {
      comboResultEl.textContent = `Menu selected: ${label}`;
    }
  },
});

initDropdown(document.getElementById("demo-dropdown"), {
  onSelect: ({ label }) => {
    if (dropdownResultEl) {
      dropdownResultEl.textContent = `Selected: ${label}`;
    }
  },
});

const iconToggleBtn = document.getElementById("icon-toggle-btn");
if (iconToggleBtn) {
  iconToggleBtn.addEventListener("click", () => {
    const pressed = iconToggleBtn.getAttribute("aria-pressed") === "true";
    iconToggleBtn.setAttribute("aria-pressed", pressed ? "false" : "true");
  });
}

const infoDialog = initDialog({
  dialogEl: document.getElementById("info-dialog"),
  openTriggers: "#open-info-dialog",
});

const confirmDialog = initDialog({
  dialogEl: document.getElementById("confirm-dialog"),
  openTriggers: "#open-confirm-dialog",
});

document.getElementById("confirm-dialog-ok")?.addEventListener("click", () => {
  confirmDialog?.closeDialog();
});

const bannerIds = [
  "demo-important-banner",
  "demo-info-banner",
  "demo-success-banner",
  "demo-note-banner",
  "demo-warning-banner",
  "demo-error-banner",
];

const bannerToggles = [
  ["toggle-important-banner", "demo-important-banner"],
  ["toggle-info-banner", "demo-info-banner"],
  ["toggle-success-banner", "demo-success-banner"],
  ["toggle-note-banner", "demo-note-banner"],
  ["toggle-warning-banner", "demo-warning-banner"],
  ["toggle-error-banner", "demo-error-banner"],
];

function isBannerHidden(bannerEl) {
  return bannerEl.classList.contains("hidden") || bannerEl.hidden;
}

function getBannerElements() {
  return bannerIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
}

for (const [buttonId, bannerId] of bannerToggles) {
  document.getElementById(buttonId)?.addEventListener("click", () => {
    const bannerEl = document.getElementById(bannerId);
    if (!bannerEl) return;
    setHidden(bannerEl, !isBannerHidden(bannerEl));
  });
}

document.getElementById("toggle-all-banners")?.addEventListener("click", () => {
  const banners = getBannerElements();
  const anyVisible = banners.some((banner) => !isBannerHidden(banner));
  const hideAll = anyVisible;

  for (const banner of banners) {
    setHidden(banner, hideAll);
  }
});
