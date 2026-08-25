import { initShell } from "./shell/shell.js";
import { initAboutDialog } from "./components/about-dialog.js";
import { initTutorial } from "./components/tutorial.js";
import { initFunctionCreator } from "./function-creator.js";

initShell({ pageNav: { showHeadingList: false } });

// Shell always mounts heading copy-link buttons; strip them for this app.
document.querySelectorAll(".heading-link-btn").forEach((btn) => btn.remove());
document.querySelectorAll(".heading-anchor").forEach((heading) => {
  heading.classList.remove("heading-anchor");
  delete heading.dataset.headingLink;
});

const aboutDialog = initAboutDialog({
  dialogEl: document.getElementById("about-dialog"),
  openTriggers: [document.getElementById("about-open-btn")],
});

const tour = initTutorial({
  id: "function-creator-tour",
  padding: 10,
  steps: [
    {
      title: "Welcome",
      body: "A short walk through the form: import or build a documented M function, then copy the generated output into Power Query.",
    },
    {
      target: "#import-section",
      title: "Import",
      body: "Paste an existing documented function here to load it into the form. Load example fills a sample that uses documentation, two examples, two scalar parameters, and a record parameter. You can also drop in a bare let…in expression and use it as the function body.",
      position: "bottom",
    },
    {
      target: "#expression-heading",
      title: "Expression",
      body: "This is the function body — usually a let…in query (or any M expression) that runs when the function is called.",
      position: "bottom",
    },
    {
      target: ".function-field-grid",
      title: "Function",
      body: "Set the function name, whether output uses let or shared, and the return type callers will see.",
      position: "bottom",
    },
    {
      target: "#documentation-heading",
      title: "Documentation",
      body: "Optional metadata shown in Power Query’s invoke dialog: display name, description, and examples.",
      position: "bottom",
    },
    {
      target: ".function-examples",
      title: "Examples",
      body: "Add sample calls and expected results. They appear in the generated Documentation.Examples metadata.",
      position: "bottom",
    },
    {
      target: "#parameters-heading",
      title: "Parameters",
      body: "Define named inputs with types, docs, and optional/nullable flags. Record parameters can include nested fields.",
      position: "bottom",
    },
    {
      target: "#output-preview",
      title: "Output",
      body: "The generated M appears here. Copy it, or maximise for a closer look, then paste into Excel or Power BI.",
      position: "top",
    },
  ],
});

document.getElementById("about-guided-tour")?.addEventListener("click", (event) => {
  event.preventDefault();
  aboutDialog?.closeDialog();
  tour?.start();
});

initFunctionCreator();
