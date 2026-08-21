import { initShell } from "./shell/shell.js";
import { initAboutDialog } from "./components/about-dialog.js";
import { initFunctionCreator } from "./function-creator.js";

initShell({ pageNav: { showHeadingList: false } });

// Shell always mounts heading copy-link buttons; strip them for this app.
document.querySelectorAll(".heading-link-btn").forEach((btn) => btn.remove());
document.querySelectorAll(".heading-anchor").forEach((heading) => {
  heading.classList.remove("heading-anchor");
  delete heading.dataset.headingLink;
});

initAboutDialog({
  dialogEl: document.getElementById("about-dialog"),
  openTriggers: [document.getElementById("about-open-btn")],
});
initFunctionCreator();
