import { setHidden } from "./dom.js";
import { initDialog } from "./dialog.js";
import { initExpand } from "./expand.js";
import { mountIcon } from "./icons.js";
import { initTooltips } from "./tooltip.js";
import {
  getCodeBlockText,
  initCodeBlock,
  initCodeEditors,
  refreshCodeEditor,
  setCodeBlock,
} from "./code-editor.js";
import { saveDraft, loadDraftState } from "./function-creator-draft.js";
import { createExpandListController } from "./function-creator-expand.js";
import { createRenderer } from "./function-creator-render.js";
import { expressionWarning, generateOutput, validateState } from "./m/generate.js";
import { tryParseFunction } from "./m/parse.js";
import { parseLinesToValues } from "./m/escape.js";
import {
  createDefaultExample,
  createDefaultParameter,
  createDefaultRecordField,
  createDefaultState,
  normalizeLoadedState,
  OUTPUT_STYLES,
  PARAM_KINDS,
  PRIMITIVE_TYPES,
} from "./m/types.js";

const REGEN_DELAY_MS = 200;

/** @type {ReturnType<typeof createDefaultState> & { parameters: ReturnType<typeof createDefaultParameter>[] }} */
let state = createDefaultState();

let paramIdCounter = 0;
let exampleIdCounter = 0;
let fieldIdCounter = 0;
let regenTimer = null;

/** @type {import("./m/types.js").FunctionCreatorState | null} */
let pendingImportState = null;

const root = document.getElementById("function-creator");
const expressionInput = /** @type {HTMLTextAreaElement} */ (document.getElementById("expression-input"));
const functionNameInput = /** @type {HTMLInputElement} */ (document.getElementById("function-name"));
const returnTypeSelect = /** @type {HTMLSelectElement} */ (document.getElementById("return-type"));
const returnTypeCustomField = document.getElementById("return-type-custom-field");
const returnTypeCustomInput = /** @type {HTMLInputElement} */ (document.getElementById("return-type-custom"));
const docNameInput = /** @type {HTMLInputElement} */ (document.getElementById("doc-name"));
const docLongDescriptionInput = /** @type {HTMLTextAreaElement} */ (document.getElementById("doc-long-description"));
const examplesList = document.getElementById("examples-list");
const parametersList = document.getElementById("parameters-list");
const outputPreview = document.getElementById("output-preview");
const validationBanner = document.getElementById("validation-banner");
const expressionWarningBanner = document.getElementById("expression-warning-banner");
const copySuccessBanner = document.getElementById("copy-success-banner");
const outputStyleToggle = document.getElementById("output-style-toggle");
const importInput = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("import-input"));
const importErrorBanner = document.getElementById("import-error-banner");
const importSuccessBanner = document.getElementById("import-success-banner");

/**
 * @param {string} prefix
 */
function nextId(prefix) {
  if (prefix === "param") return `param-${++paramIdCounter}`;
  if (prefix === "example") return `example-${++exampleIdCounter}`;
  return `field-${++fieldIdCounter}`;
}

const { renderParameter, renderExample, renderRecordField } = createRenderer({ nextId });

/**
 * @returns {Set<string>}
 */
function allRecordFieldIds() {
  const ids = new Set();

  for (const param of state.parameters || []) {
    for (const field of param.fields || []) {
      if (field.id) ids.add(field.id);
    }
  }

  return ids;
}

/** @type {Map<string, boolean>} */
const recordFieldExpandOpen = new Map();

/** @type {WeakMap<Element, ReturnType<typeof createExpandListController>>} */
const recordFieldExpandByParam = new WeakMap();

const paramExpand = createExpandListController({
  getValidIds: () => new Set(state.parameters.map((param) => param.id).filter(Boolean)),
  expandSelector: ".expand[data-param-id]",
});

const exampleExpand = createExpandListController({
  getValidIds: () => new Set(state.functionMeta.examples.map((example) => example.id).filter(Boolean)),
  expandSelector: ".expand[data-example-id]",
});

/**
 * @param {HTMLElement} container
 * @param {string} iconName
 */
function safeMountIcon(container, iconName) {
  try {
    mountIcon(container, iconName, { className: container.dataset.iconClass || "" });
  } catch {
    /* placeholder icon — text label is enough */
  }
}

/**
 * @param {ParentNode} scope
 */
function initIconsIn(scope) {
  scope.querySelectorAll("[data-icon]").forEach((element) => {
    safeMountIcon(/** @type {HTMLElement} */ (element), element.dataset.icon || "");
  });
}

/**
 * @param {Element | null | undefined} el
 */
function isTogglePressed(el) {
  return el?.getAttribute("aria-pressed") === "true";
}

/**
 * @param {Element | null | undefined} el
 * @param {boolean} pressed
 */
function setTogglePressed(el, pressed) {
  if (!el) return;
  el.classList.toggle("is-active", pressed);
  el.setAttribute("aria-pressed", pressed ? "true" : "false");
}

/**
 * @param {ParentNode} scope
 */
function initParamToggles(scope) {
  scope.querySelectorAll(".param-toggle").forEach((button) => {
    if (button.dataset.toggleInit === "true") return;
    button.dataset.toggleInit = "true";

    button.addEventListener("click", () => {
      const nextPressed = !isTogglePressed(button);
      setTogglePressed(button, nextPressed);

      if (
        nextPressed &&
        (button.classList.contains("param-optional") || button.classList.contains("field-optional"))
      ) {
        const scopeEl = button.closest("[data-param-id], [data-field-id]");
        const nullable = scopeEl?.querySelector(".param-nullable, .field-nullable");
        setTogglePressed(nullable, true);
      }

      scheduleRegenerate();
    });
  });
}

function renderParameters({ ensureOpenIds = [], ensureOpenFieldIds = [] } = {}) {
  if (!parametersList) return;

  paramExpand.syncFromDom(parametersList, "data-param-id");

  parametersList.innerHTML = state.parameters.map(renderParameter).join("");
  paramExpand.initBlocks(parametersList, {
    idAttr: "data-param-id",
    ensureOpenIds,
    onToggle: () => paramExpand.updateToggleAllLabel(document.getElementById("toggle-all-parameters")),
  });
  paramExpand.updateToggleAllLabel(document.getElementById("toggle-all-parameters"));

  initTooltips(parametersList);
  initIconsIn(parametersList);
  bindParameterEvents();
  initParamToggles(parametersList);
  parametersList.querySelectorAll("[data-param-id]").forEach((card) => {
    initRecordFieldsForParamCard(card, { ensureOpenFieldIds });
  });
}

function toggleAllParameters() {
  paramExpand.toggleAll();
  paramExpand.updateToggleAllLabel(document.getElementById("toggle-all-parameters"));
}

function renderExamples({ ensureOpenIds = [] } = {}) {
  if (!examplesList) return;

  exampleExpand.syncFromDom(examplesList, "data-example-id");

  examplesList.innerHTML = state.functionMeta.examples
    .map((example, index) => renderExample(example, index))
    .join("");
  exampleExpand.initBlocks(examplesList, {
    idAttr: "data-example-id",
    ensureOpenIds,
    onToggle: () => exampleExpand.updateToggleAllLabel(document.getElementById("toggle-all-examples")),
  });
  exampleExpand.updateToggleAllLabel(document.getElementById("toggle-all-examples"));

  initTooltips(examplesList);
  initIconsIn(examplesList);
  initCodeEditors(examplesList);
  bindExampleEvents();
}

function toggleAllExamples() {
  exampleExpand.toggleAll();
  exampleExpand.updateToggleAllLabel(document.getElementById("toggle-all-examples"));
}

/**
 * @param {Element} paramCard
 * @param {{ ensureOpenFieldIds?: string[] }} [options]
 */
function initRecordFieldsForParamCard(paramCard, { ensureOpenFieldIds = [] } = {}) {
  let controller = recordFieldExpandByParam.get(paramCard);

  if (!controller) {
    controller = createExpandListController({
      getValidIds: allRecordFieldIds,
      openMap: recordFieldExpandOpen,
      expandSelector: ".expand[data-field-id]",
    });
    recordFieldExpandByParam.set(paramCard, controller);
  }

  controller.syncFromDom(paramCard, "data-field-id");

  const list = paramCard.querySelector(".record-fields-list");
  if (!list) return;

  controller.initBlocks(list, {
    idAttr: "data-field-id",
    ensureOpenIds: ensureOpenFieldIds,
    onToggle: () => updateToggleAllRecordFieldsLabel(paramCard),
  });
  updateToggleAllRecordFieldsLabel(paramCard);
}

/**
 * @param {Element} paramCard
 */
function updateToggleAllRecordFieldsLabel(paramCard) {
  const controller = recordFieldExpandByParam.get(paramCard);
  controller?.updateToggleAllLabel(paramCard.querySelector(".toggle-all-record-fields"));
}

/**
 * @param {Element} paramCard
 */
function toggleAllRecordFields(paramCard) {
  const controller = recordFieldExpandByParam.get(paramCard);
  if (!controller) return;

  controller.toggleAll();
  updateToggleAllRecordFieldsLabel(paramCard);
}

function syncIdCounters() {
  let maxExample = 0;
  let maxParam = 0;
  let maxField = 0;

  for (const example of state.functionMeta?.examples || []) {
    const match = example.id?.match(/^example-(\d+)$/);
    if (match) maxExample = Math.max(maxExample, Number(match[1]));
  }

  for (const param of state.parameters || []) {
    const paramMatch = param.id?.match(/^param-(\d+)$/);
    if (paramMatch) maxParam = Math.max(maxParam, Number(paramMatch[1]));

    for (const field of param.fields || []) {
      const fieldMatch = field.id?.match(/^field-(\d+)$/);
      if (fieldMatch) maxField = Math.max(maxField, Number(fieldMatch[1]));
    }
  }

  exampleIdCounter = maxExample;
  paramIdCounter = maxParam;
  fieldIdCounter = maxField;
}

/**
 * @param {Element} row
 */
function readExampleFromCard(row) {
  const id = row.getAttribute("data-example-id") || "";

  return {
    id: id || undefined,
    description: row.querySelector(".example-description")?.value ?? "",
    code: row.querySelector("textarea.example-code")?.value ?? "",
    result: row.querySelector("textarea.example-result")?.value ?? "",
  };
}

/**
 * @param {Element} card
 */
function readScalarMeta(card) {
  return {
    fieldCaption: card.querySelector(".meta-caption")?.value || "",
    fieldDescription: card.querySelector(".meta-description")?.value || "",
    sampleValues: parseLinesToValues(card.querySelector(".meta-sample")?.value || ""),
    allowedValues: parseLinesToValues(card.querySelector(".meta-allowed")?.value || ""),
    isMultiLine: isTogglePressed(card.querySelector(".meta-multiline")),
    isCode: isTogglePressed(card.querySelector(".meta-code")),
  };
}

function readExamplesFromDom() {
  /** @type {Set<string>} */
  const usedIds = new Set();

  return [...(examplesList?.querySelectorAll("[data-example-id]") || [])].map((row) => {
    const example = readExampleFromCard(row);
    let id = example.id;

    if (!id || usedIds.has(id)) {
      id = nextId("example");
    }

    usedIds.add(id);
    return { ...example, id };
  });
}

function readStateFromDom() {
  const returnType =
    returnTypeSelect.value === "custom"
      ? returnTypeCustomInput.value.trim() || "any"
      : returnTypeSelect.value;

  state.expression = expressionInput.value;
  state.functionName = functionNameInput.value;
  state.returnType = returnType;
  state.functionMeta = {
    documentationName: docNameInput.value,
    longDescription: docLongDescriptionInput.value,
    examples: readExamplesFromDom(),
  };
  state.parameters = [];

  parametersList?.querySelectorAll("[data-param-id]").forEach((card) => {
    const kind = card.querySelector(".param-kind")?.value || PARAM_KINDS.SCALAR;
    const param = {
      id: card.getAttribute("data-param-id") || undefined,
      name: card.querySelector(".param-name")?.value || "",
      optional: isTogglePressed(card.querySelector(".param-optional")),
      nullable: isTogglePressed(card.querySelector(".param-nullable")),
      kind,
      mType: card.querySelector(".param-type")?.value || "text",
      meta: readScalarMeta(card),
      fields: [],
    };

    if (kind === PARAM_KINDS.RECORD) {
      card.querySelectorAll("[data-field-id]").forEach((fieldCard) => {
        param.fields.push({
          id: fieldCard.getAttribute("data-field-id") || undefined,
          name: fieldCard.querySelector(".field-name")?.value || "",
          optional: isTogglePressed(fieldCard.querySelector(".field-optional")),
          nullable: isTogglePressed(fieldCard.querySelector(".field-nullable")),
          mType: fieldCard.querySelector(".field-type")?.value || "text",
          meta: readScalarMeta(fieldCard),
        });
      });
    }

    state.parameters.push(param);
  });
}

/**
 * @param {HTMLElement | null} banner
 * @param {string} message
 */
function setBannerMessage(banner, message) {
  if (!banner) return;
  const body = banner.querySelector(".banner-body");
  if (body) {
    body.textContent = message;
    return;
  }
  banner.textContent = message;
}

function updateBanners() {
  const errors = validateState(state);
  if (errors.length > 0) {
    setBannerMessage(validationBanner, errors.join(" "));
    setHidden(validationBanner, false);
  } else {
    setHidden(validationBanner, true);
  }

  const exprWarning = expressionWarning(state);
  if (exprWarning) {
    setBannerMessage(expressionWarningBanner, exprWarning);
    setHidden(expressionWarningBanner, false);
  } else {
    setHidden(expressionWarningBanner, true);
  }
}

function updateOutputFromState() {
  updateBanners();
  const output = errorsBlockGeneration() ? "" : generateOutput(state);
  if (outputPreview) setCodeBlock(outputPreview, output);
  saveDraft(state);
}

function regenerate() {
  readStateFromDom();
  updateOutputFromState();
}

/**
 * @returns {boolean}
 */
function errorsBlockGeneration() {
  return validateState(state).length > 0;
}

function scheduleRegenerate() {
  clearTimeout(regenTimer);
  regenTimer = setTimeout(regenerate, REGEN_DELAY_MS);
}

function applyStateToDom() {
  expressionInput.value = state.expression || "";
  functionNameInput.value = state.functionName || "MyFunc";
  docNameInput.value = state.functionMeta?.documentationName || "";
  docLongDescriptionInput.value = state.functionMeta?.longDescription || "";

  const isCustomReturn = !PRIMITIVE_TYPES.includes(state.returnType);
  if (isCustomReturn) {
    returnTypeSelect.value = "custom";
    returnTypeCustomInput.value = state.returnType;
    setHidden(returnTypeCustomField, false);
  } else {
    returnTypeSelect.value = state.returnType || "table";
    setHidden(returnTypeCustomField, true);
  }

  setOutputStyle(state.outputStyle || OUTPUT_STYLES.LET);
  syncIdCounters();
  renderExamples();
  renderParameters();
  refreshCodeEditor(expressionInput);
  if (importInput) refreshCodeEditor(importInput);
  regenerate();
}

function applyImportedState(importedState) {
  state = normalizeLoadedState(importedState);
  syncIdCounters();
  applyStateToDom();
  saveDraft(state);

  setHidden(importSuccessBanner, false);
  setTimeout(() => setHidden(importSuccessBanner, true), 4000);
}

function requestImportFromPaste() {
  const source = importInput?.value || "";
  const result = tryParseFunction(source);

  setHidden(importErrorBanner, true);
  setHidden(importSuccessBanner, true);

  if (!result.ok) {
    setBannerMessage(importErrorBanner, result.error);
    setHidden(importErrorBanner, false);
    return;
  }

  pendingImportState = normalizeLoadedState(result.state);
  importConfirmDialog?.openDialog();
}

function confirmImport() {
  if (!pendingImportState) return;

  applyImportedState(pendingImportState);
  pendingImportState = null;
  importConfirmDialog?.closeDialog();
}

/** @type {ReturnType<typeof initDialog> | null} */
let importConfirmDialog = null;

function setOutputStyle(style) {
  state.outputStyle = style;
  outputStyleToggle?.querySelectorAll("[data-output-style]").forEach((button) => {
    const isActive = button.getAttribute("data-output-style") === style;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function bindParameterEvents() {
  parametersList?.querySelectorAll("[data-param-id]").forEach((card) => {
    const paramId = card.getAttribute("data-param-id");

    card.querySelector(".param-name")?.addEventListener("input", (event) => {
      const title = card.querySelector(".param-card-title");
      if (title) {
        title.textContent = event.target.value.trim() || "New parameter";
      }
    });

    card.querySelector(".param-kind")?.addEventListener("change", (event) => {
      const isRecord = event.target.value === PARAM_KINDS.RECORD;
      const scalarMeta = card.querySelector(".param-scalar-meta");
      const recordFields = card.querySelector(".param-record-fields");
      card.querySelectorAll(".param-scalar-type, .param-scalar-only").forEach((el) => {
        setHidden(el, isRecord);
      });
      setHidden(scalarMeta, isRecord);
      setHidden(recordFields, !isRecord);

      if (isRecord) {
        const list = card.querySelector(".record-fields-list");
        if (list && list.children.length === 0) {
          syncIdCounters();
          const field = createDefaultRecordField();
          field.id = nextId("field");
          list.innerHTML = renderRecordField(field, 0);
          initTooltips(list);
          initIconsIn(list);
          bindRecordFieldEvents(card);
          initParamToggles(list);
          initRecordFieldsForParamCard(card, { ensureOpenFieldIds: [field.id] });
        }
      }
    });

    card.querySelector(".remove-parameter")?.addEventListener("click", () => {
      readStateFromDom();
      state.parameters = state.parameters.filter((param) => param.id !== paramId);
      renderParameters();
      regenerate();
    });

    card.querySelector(".add-record-field")?.addEventListener("click", () => {
      readStateFromDom();
      syncIdCounters();
      const param = state.parameters.find((p) => p.id === paramId);
      if (!param) return;
      if (!param.fields) param.fields = [];
      const field = createDefaultRecordField();
      field.id = nextId("field");
      param.fields.push(field);
      renderParameters({ ensureOpenFieldIds: [field.id] });
      regenerate();
    });

    card.querySelector(".toggle-all-record-fields")?.addEventListener("click", () => {
      toggleAllRecordFields(card);
    });

    bindRecordFieldEvents(card);
  });
}

/**
 * @param {Element} card
 */
function bindRecordFieldEvents(card) {
  card.querySelectorAll("[data-field-id]").forEach((fieldCard) => {
    fieldCard.querySelector(".field-name")?.addEventListener("input", (event) => {
      const title = fieldCard.querySelector(".record-field-title");
      const fieldIndex = [...card.querySelectorAll("[data-field-id]")].indexOf(fieldCard);
      if (title) {
        title.textContent = event.target.value.trim() || `Field ${fieldIndex + 1}`;
      }
    });
  });

  card.querySelectorAll(".remove-record-field").forEach((button) => {
    button.addEventListener("click", () => {
      const fieldCard = button.closest("[data-field-id]");
      const paramCard = button.closest("[data-param-id]");
      const paramId = paramCard?.getAttribute("data-param-id");
      const fieldId = fieldCard?.getAttribute("data-field-id");
      readStateFromDom();
      const param = state.parameters.find((p) => p.id === paramId);
      if (param?.fields) {
        param.fields = param.fields.filter((field) => field.id !== fieldId);
      }
      renderParameters();
      regenerate();
    });
  });
}

function bindExampleEvents() {
  examplesList?.querySelectorAll("[data-example-id]").forEach((card) => {
    const exampleId = card.getAttribute("data-example-id");

    card.querySelector(".example-description")?.addEventListener("input", (event) => {
      const title = card.querySelector(".param-card-title");
      const index = [...(examplesList?.querySelectorAll("[data-example-id]") || [])].indexOf(card);
      if (title) {
        title.textContent = event.target.value.trim() || `Example ${index + 1}`;
      }
    });

    card.querySelector(".remove-example")?.addEventListener("click", () => {
      readStateFromDom();
      state.functionMeta.examples = state.functionMeta.examples.filter(
        (example) => example.id !== exampleId
      );
      renderExamples();
      updateOutputFromState();
    });
  });
}

function bindStaticEvents() {
  root?.addEventListener("input", scheduleRegenerate);
  root?.addEventListener("change", (event) => {
    if (event.target === returnTypeSelect) {
      const isCustom = returnTypeSelect.value === "custom";
      setHidden(returnTypeCustomField, !isCustom);
    }
    scheduleRegenerate();
  });

  document.getElementById("add-parameter")?.addEventListener("click", () => {
    readStateFromDom();
    syncIdCounters();
    const param = createDefaultParameter();
    param.id = nextId("param");
    state.parameters.push(param);
    renderParameters({ ensureOpenIds: [param.id] });
    regenerate();
  });

  document.getElementById("toggle-all-parameters")?.addEventListener("click", toggleAllParameters);

  document.getElementById("toggle-all-examples")?.addEventListener("click", toggleAllExamples);

  document.getElementById("add-example")?.addEventListener("click", () => {
    readStateFromDom();
    syncIdCounters();
    const example = createDefaultExample();
    example.id = nextId("example");
    state.functionMeta.examples.push(example);
    renderExamples({ ensureOpenIds: [example.id] });
    updateOutputFromState();
  });

  outputStyleToggle?.querySelectorAll("[data-output-style]").forEach((button) => {
    button.addEventListener("click", () => {
      setOutputStyle(button.getAttribute("data-output-style") || OUTPUT_STYLES.LET);
      scheduleRegenerate();
    });
  });

  document.getElementById("copy-output")?.addEventListener("click", async () => {
    regenerate();
    const text = outputPreview ? getCodeBlockText(outputPreview) : "";

    if (!text) {
      const errors = validateState(state);
      if (errors.length > 0) {
        setBannerMessage(validationBanner, errors.join(" "));
        setHidden(validationBanner, false);
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setHidden(copySuccessBanner, false);
      setTimeout(() => setHidden(copySuccessBanner, true), 2500);
    } catch {
      if (outputPreview) {
        const range = document.createRange();
        range.selectNodeContents(outputPreview);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("copy");
        selection?.removeAllRanges();
        setHidden(copySuccessBanner, false);
        setTimeout(() => setHidden(copySuccessBanner, true), 2500);
      }
    }
  });

  document.getElementById("import-function")?.addEventListener("click", requestImportFromPaste);

  document.getElementById("clear-import")?.addEventListener("click", () => {
    if (importInput) {
      importInput.value = "";
      refreshCodeEditor(importInput);
    }
    setHidden(importErrorBanner, true);
    setHidden(importSuccessBanner, true);
  });

  importConfirmDialog = initDialog({
    dialogEl: document.getElementById("import-confirm-dialog"),
    onClose: () => {
      pendingImportState = null;
    },
  });

  document.getElementById("import-confirm-dialog-ok")?.addEventListener("click", confirmImport);
}

export function initFunctionCreator() {
  if (!root) return;

  bindStaticEvents();

  initExpand(document.getElementById("import-section"));

  initCodeEditors(root);
  if (outputPreview) initCodeBlock(outputPreview);

  const draft = loadDraftState();
  if (draft) {
    state = draft;
    applyStateToDom();
  } else {
    renderExamples();
    renderParameters();
    regenerate();
  }

  initTooltips(root);
  initIconsIn(root);
}
