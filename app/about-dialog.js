import { initDialog } from "./components/dialog.js";
import { setHidden } from "./utils/dom.js";

const PBS_KIDS_URL = "https://pbskids.org/games/play/symmetry-painter/11734";

const CONFUSED_APPENDIX = [
  `<p class="about-extra-block"><em>Okay</em>, so Power Query is the data-cleaning bit of Excel and Power BI. You write a <code>let … in</code> block that does something useful. To share it as a proper function, you need parameter names, types, docs the UI can show, and usually <code>Value.ReplaceType</code>. This page builds that wrapper for you. Fill the form on the left (ish). Copy the M on the bottom. Paste it into Power Query. That's the whole trick.</p>`,
  `<p class="about-extra-block">You make work. Work good. Work need many times. Hard write by hand. We wrap. You fill boxes. Pretty come out. Copy. Paste. Happy.</p>`,
];

/**
 * About / “What?” dialog — same pattern as PQM Stepper (progressive Huh? help).
 */
export function initAboutDialog() {
  const dialogEl = document.getElementById("about-dialog");
  const openBtn = document.getElementById("about-open-btn");
  const confusedBtn = document.getElementById("about-confused-btn");
  const extraContentEl = document.getElementById("about-extra-content");

  if (!dialogEl || !openBtn || !confusedBtn || !extraContentEl) return null;

  let confusedStage = 0;

  function resetConfusedState() {
    confusedStage = 0;
    confusedBtn.textContent = "Huh?";
    setHidden(confusedBtn, false);
    extraContentEl.innerHTML = "";
    setHidden(extraContentEl, true);
  }

  const dialog = initDialog({
    dialogEl,
    openTriggers: [openBtn],
    onOpen: resetConfusedState,
    onClose: resetConfusedState,
  });

  confusedBtn.addEventListener("click", () => {
    if (confusedStage === 0) {
      extraContentEl.insertAdjacentHTML("beforeend", CONFUSED_APPENDIX[0]);
      setHidden(extraContentEl, false);
      confusedBtn.textContent = "Uhh...";
      confusedStage = 1;
      return;
    }

    if (confusedStage === 1) {
      extraContentEl.insertAdjacentHTML("beforeend", CONFUSED_APPENDIX[1]);
      confusedBtn.textContent = "I don't get it";
      confusedStage = 2;
      return;
    }

    window.location.href = PBS_KIDS_URL;
  });

  return dialog;
}
