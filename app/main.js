import { initShell } from "./shell/shell.js";
import { initAboutDialog } from "./components/about-dialog.js";
import { initPopover } from "./components/popover.js";
import { initTutorial } from "./components/tutorial.js";
import { initFunctionCreator } from "./function-creator.js";

const TOUR_HINT_STORAGE_KEY = "pqm-function-creator-tour-hint-seen";

initShell({ pageNav: { showHeadingList: false } });

// Shell always mounts heading copy-link buttons; strip them for this app.
document.querySelectorAll(".heading-link-btn").forEach((btn) => btn.remove());
document.querySelectorAll(".heading-anchor").forEach((heading) => {
  heading.classList.remove("heading-anchor");
  delete heading.dataset.headingLink;
});

const aboutOpenBtn = document.getElementById("about-open-btn");

/** @type {ReturnType<typeof initPopover> | null} */
let tourHintPopover = null;

function hasSeenTourHint() {
  try {
    return localStorage.getItem(TOUR_HINT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markTourHintSeen() {
  try {
    localStorage.setItem(TOUR_HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function dismissTourHint() {
  if (!tourHintPopover) return;
  const popover = tourHintPopover;
  tourHintPopover = null;
  markTourHintSeen();
  popover.destroy();
}

const aboutDialog = initAboutDialog({
  dialogEl: document.getElementById("about-dialog"),
  openTriggers: [aboutOpenBtn],
  onOpen: () => dismissTourHint(),
});

const tour = initTutorial({
  id: "function-creator-tour",
  padding: 10,
  steps: [
    {
      target: "#import-section",
      title: "Import",
      body: "If you have an existing function that you want to modify, you can import it here.",
      position: "bottom",
    },
    {
      target: "#expression-editor",
      title: "Expression",
      body: "This is the main logic of our function-to-be, executed when the function is called.",
      position: "bottom",
    },
    {
      target: "#function-section",
      title: "Function",
      body: "Set the function name and properties.",
      position: "bottom",
    },
    {
      target: "#documentation-section",
      title: "Documentation",
      body: "Optional metadata shown in Power Query’s invoke dialog: display name, description, and examples.",
      position: "bottom",
    },
    {
      target: "#parameters-section",
      title: "Parameters",
      body: "Define named inputs with types, docs, and flags. Record parameters can include nested fields.",
      position: "top",
    },
    {
      target: "#output-preview",
      title: "Output",
      body: "The generated M appears here. Copy it, or maximise for a closer look, then paste into Excel or Power BI.",
      position: "top",
    },
    {
      target: "#load-example",
      title: "Try it out",
      body: "Press the button now to see it in action!.",
      position: "top",
      interactive: true,
      advanceOn: "click",
    },
  ],
});

document.getElementById("about-guided-tour")?.addEventListener("click", (event) => {
  event.preventDefault();
  dismissTourHint();
  aboutDialog?.closeDialog();
  tour?.start();
});

if (aboutOpenBtn instanceof HTMLElement && !hasSeenTourHint()) {
  tourHintPopover = initPopover({
    anchor: aboutOpenBtn,
    body: "Check here for more into and a guided tour!",
    position: "right",
    dismissible: false,
    trapFocus: false,
    actions: [
      {
        label: "Got it",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: () => dismissTourHint(),
      },
    ],
    onClose: () => {
      // Escape / outside click / × — destroy after close() returns.
      if (!tourHintPopover) return;
      const popover = tourHintPopover;
      tourHintPopover = null;
      markTourHintSeen();
      queueMicrotask(() => popover.destroy());
    },
  });
  // Let shell / layout settle before measuring the anchor.
  window.requestAnimationFrame(() => {
    tourHintPopover?.open();
  });
}

initFunctionCreator();
