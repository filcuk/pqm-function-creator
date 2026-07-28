import { initShell } from "./shell/shell.js";
import { initAboutDialog } from "./about-dialog.js";
import { initFunctionCreator } from "./function-creator.js";

initShell({ pageNav: { showHeadingList: false } });
initAboutDialog();
initFunctionCreator();
