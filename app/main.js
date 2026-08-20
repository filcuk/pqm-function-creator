import { initShell } from "./shell/shell.js";
import { initAboutDialog } from "./components/about-dialog.js";
import { initFunctionCreator } from "./function-creator.js";

initShell({ pageNav: { showHeadingList: false } });
initAboutDialog({
  dialogEl: document.getElementById("about-dialog"),
  openTriggers: [document.getElementById("about-open-btn")],
});
initFunctionCreator();
