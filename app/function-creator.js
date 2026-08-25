import { setHidden } from "./utils/dom.js";
import { initDialog } from "./components/dialog.js";
import { initExpand } from "./components/expand.js";
import { initSegmentedControl } from "./components/segmented-control.js";
import { initChipInput } from "./components/chip.js";
import { initToggleButton } from "./components/toggle-button.js";
import { initBadge } from "./components/badge.js";
import { initCodeBlock } from "./components/code-block.js";
import { initExpandableSurfaces } from "./components/expandable-surface.js";
import { initPopover } from "./components/popover.js";
import { showBanner, hideBanner } from "./components/banner.js";
import { mountIcon } from "./utils/icons.js";
import { initTooltips } from "./components/tooltip.js";
import { initPopupMenu } from "./utils/menu.js";
import {
  initCodeEditors,
  refreshCodeEditor,
} from "./code-editor.js";
import { saveDraft, loadDraftState } from "./function-creator-draft.js";
import { createExpandListController } from "./function-creator-expand.js";
import { createRenderer, typeDropdownHtml } from "./function-creator-render.js";
import { generateOutput, getValidationIssues, validateState } from "./m/generate.js";
import { tryParseFunction } from "./m/parse.js";
import { isValidIdentifier } from "./m/escape.js";
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
const IMPORT_SUCCESS_EXPIRE_MS = 4000;

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
const returnTypeHost = document.getElementById("return-type-host");
const returnTypeCustomField = document.getElementById("return-type-custom-field");
const returnTypeCustomInput = /** @type {HTMLInputElement} */ (document.getElementById("return-type-custom"));
const docNameInput = /** @type {HTMLInputElement} */ (document.getElementById("doc-name"));
const docLongDescriptionInput = /** @type {HTMLTextAreaElement} */ (document.getElementById("doc-long-description"));
const examplesList = document.getElementById("examples-list");
const parametersList = document.getElementById("parameters-list");
const outputPreview = document.getElementById("output-preview");
const functionValidationBanner = document.getElementById("function-validation-banner");
const parametersValidationBanner = document.getElementById("parameters-validation-banner");
const outputStyleEl = document.getElementById("output-style");
const importInput = /** @type {HTMLTextAreaElement | null} */ (document.getElementById("import-input"));
const importFunctionBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById("import-function"));
const clearImportBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById("clear-import"));
const importErrorBanner = document.getElementById("import-error-banner");
const importErrorHelpBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("import-error-help")
);
const importWarningBanner = document.getElementById("import-warning-banner");
const importUseAsExpressionBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById("import-use-as-expression")
);
const importSuccessBanner = document.getElementById("import-success-banner");

/** @type {ReturnType<typeof initSegmentedControl> | null} */
let outputStyleControl = null;

/** @type {ReturnType<typeof initCodeBlock> | null} */
let outputCodeBlock = null;

/** @type {HTMLElement | null} */
let returnTypeDropdown = null;

/** @type {ReturnType<typeof initExpand> | null} */
let importExpand = null;

/** @type {ReturnType<typeof initPopover> | null} */
let importHelpPopover = null;

/** @type {ReturnType<typeof initPopover> | null} */
let outputStylePopover = null;

/** @type {ReturnType<typeof initBadge> | null} */
let examplesCountBadge = null;

/** @type {ReturnType<typeof initBadge> | null} */
let parametersCountBadge = null;

/** @type {string | null} */
let pendingExpressionOffer = null;

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
 * @param {HTMLElement} dropdownEl
 * @param {string} value
 */
function setTypeDropdownValue(dropdownEl, value) {
  const next = value || "";
  const hidden = /** @type {HTMLInputElement | null} */ (
    dropdownEl.querySelector(".type-dropdown-value")
  );
  const triggerLabel = dropdownEl.querySelector(".dropdown-trigger-label");
  if (hidden) hidden.value = next;
  if (triggerLabel) {
    triggerLabel.textContent = next === "custom" ? "custom…" : next;
  }
  dropdownEl.querySelectorAll(".dropdown-menu-item").forEach((item) => {
    const selected = item.getAttribute("data-value") === next;
    item.classList.toggle("is-selected", selected);
    if (selected) item.setAttribute("aria-checked", "true");
    else item.removeAttribute("aria-checked");
  });
}

/**
 * @param {ParentNode | null | undefined} scope
 * @param {{ onSelect?: (detail: { value: string, label: string, dropdownEl: HTMLElement }) => void }} [options]
 */
function initTypeDropdowns(scope, { onSelect } = {}) {
  if (!scope) return;
  scope.querySelectorAll(".type-dropdown").forEach((dropdownEl) => {
    if (!(dropdownEl instanceof HTMLElement)) return;
    if (dropdownEl.dataset.typeDropdownReady === "1") return;
    dropdownEl.dataset.typeDropdownReady = "1";

    const trigger = dropdownEl.querySelector(".dropdown-trigger");
    const menu = dropdownEl.querySelector(".dropdown-menu");
    initPopupMenu({
      containerEl: dropdownEl,
      menuEl: menu,
      toggleEl: trigger,
      itemSelector: ".dropdown-menu-item",
      fixed: true,
      onSelect: (detail) => {
        setTypeDropdownValue(dropdownEl, detail.value || "");
        onSelect?.({ ...detail, dropdownEl });
        scheduleRegenerate();
      },
    });
  });
}

function mountReturnTypeDropdown() {
  if (!returnTypeHost) return;
  returnTypeHost.innerHTML = typeDropdownHtml({
    id: "return-type",
    selected: "table",
    includeRecord: true,
    includeCustom: true,
    grid: true,
  });
  returnTypeDropdown = returnTypeHost.querySelector(".type-dropdown");
  initTypeDropdowns(returnTypeHost, {
    onSelect: ({ value }) => {
      setHidden(returnTypeCustomField, value !== "custom");
    },
  });
}

/**
 * @returns {string}
 */
function getReturnTypeDropdownValue() {
  const hidden = /** @type {HTMLInputElement | null} */ (
    returnTypeDropdown?.querySelector(".type-dropdown-value")
  );
  return hidden?.value || "table";
}

/**
 * @param {HTMLElement} el
 * @returns {string[]}
 */
function parseChipValuesAttr(el) {
  try {
    const raw = el.getAttribute("data-chip-values");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string" && value.trim())
      : [];
  } catch {
    return [];
  }
}

/**
 * @param {Element | null | undefined} chipInputEl
 * @returns {string[]}
 */
function readChipInputValues(chipInputEl) {
  if (!chipInputEl) return [];
  return [...chipInputEl.querySelectorAll(":scope > .chip-input-list .chip")]
    .map((chip) => {
      const label = chip.querySelector(".chip-label");
      return (chip.getAttribute("data-chip-value") ?? label?.textContent ?? "").trim();
    })
    .filter(Boolean);
}

/**
 * @param {ParentNode | null | undefined} scope
 */
function initMetaChipInputs(scope) {
  if (!scope) return;
  scope.querySelectorAll(".chip-input.meta-sample, .chip-input.meta-allowed").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.dataset.chipInputReady === "1") return;
    el.dataset.chipInputReady = "1";
    initChipInput(el, {
      values: parseChipValuesAttr(el),
      onChange: () => scheduleRegenerate(),
    });
  });
}

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
 * @returns {boolean}
 */
function isTogglePressed(el) {
  return el?.getAttribute("aria-pressed") === "true";
}

/**
 * @param {ParentNode} scope
 */
function initParamToggles(scope) {
  scope.querySelectorAll(".btn-toggle[data-toggle-button]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.dataset.toggleInit === "true") return;
    button.dataset.toggleInit = "true";

    const api = initToggleButton(button, {
      onChange: ({ pressed, source }) => {
        if (source === "init") return;

        if (
          pressed &&
          (button.classList.contains("param-optional") || button.classList.contains("field-optional"))
        ) {
          const scopeEl = button.closest("[data-param-id], [data-field-id]");
          const nullable = scopeEl?.querySelector(".param-nullable, .field-nullable");
          /** @type {{ setPressed?: (next: boolean, opts?: { emit?: boolean }) => void } | undefined} */
          const nullableApi = nullable?.__fcToggle;
          nullableApi?.setPressed?.(true, { emit: false });
        }

        scheduleRegenerate();
      },
    });
    button.__fcToggle = api;
  });
}

function syncSectionCountBadges() {
  examplesCountBadge?.setValue(state.functionMeta?.examples?.length || 0);
  parametersCountBadge?.setValue(state.parameters?.length || 0);
}

function renderParameters({ ensureOpenIds = [], ensureOpenFieldIds = [] } = {}) {
  if (!parametersList) return;

  paramExpand.syncFromDom(parametersList, "data-param-id");

  parametersList.innerHTML = state.parameters.map(renderParameter).join("");
  syncSectionCountBadges();
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
  initTypeDropdowns(parametersList);
  initMetaChipInputs(parametersList);
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
  syncSectionCountBadges();
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
    sampleValues: readChipInputValues(card.querySelector(".meta-sample")),
    allowedValues: readChipInputValues(card.querySelector(".meta-allowed")),
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
  const selectedReturn = getReturnTypeDropdownValue();
  const returnType =
    selectedReturn === "custom"
      ? returnTypeCustomInput.value.trim() || "any"
      : selectedReturn;

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
    const kindEl = /** @type {HTMLInputElement | null} */ (
      card.querySelector(".param-kind-value")
    );
    const kind = kindEl?.value === PARAM_KINDS.RECORD ? PARAM_KINDS.RECORD : PARAM_KINDS.SCALAR;
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

/**
 * @param {HTMLElement | null} el
 * @param {boolean} invalid
 */
function setAriaInvalid(el, invalid) {
  if (!el) return;
  if (invalid) el.setAttribute("aria-invalid", "true");
  else el.removeAttribute("aria-invalid");
}

/**
 * Highlight invalid identifier fields using the framework `aria-invalid` style.
 */
function syncFieldValidity() {
  const functionName = state.functionName.trim();
  setAriaInvalid(functionNameInput, !functionName || !isValidIdentifier(functionName));
  setAriaInvalid(returnTypeCustomInput, !state.returnType.trim());

  const seenParams = new Set();
  for (const param of state.parameters) {
    if (!param.id) continue;
    const name = param.name.trim();
    const paramInput = /** @type {HTMLInputElement | null} */ (
      parametersList?.querySelector(`[data-param-id="${CSS.escape(param.id)}"] .param-name`)
    );
    let paramInvalid = false;
    if (name) {
      paramInvalid = !isValidIdentifier(name) || seenParams.has(name);
      seenParams.add(name);
    }
    setAriaInvalid(paramInput, paramInvalid);

    if (param.kind !== PARAM_KINDS.RECORD) continue;

    const seenFields = new Set();
    for (const field of param.fields || []) {
      if (!field.id) continue;
      const fieldName = field.name.trim();
      const fieldInput = /** @type {HTMLInputElement | null} */ (
        parametersList?.querySelector(`[data-field-id="${CSS.escape(field.id)}"] .field-name`)
      );
      let fieldInvalid = false;
      if (fieldName) {
        fieldInvalid = !isValidIdentifier(fieldName) || seenFields.has(fieldName);
        seenFields.add(fieldName);
      }
      setAriaInvalid(fieldInput, fieldInvalid);
    }
  }
}

/**
 * @param {HTMLElement | null} banner
 * @param {string[]} messages
 */
function updateSectionBanner(banner, messages) {
  if (!banner) return;
  if (messages.length > 0) {
    setBannerMessage(banner, messages.join(" "));
    setHidden(banner, false);
  } else {
    setHidden(banner, true);
  }
}

function updateBanners() {
  const issues = getValidationIssues(state);
  updateSectionBanner(functionValidationBanner, issues.function);
  updateSectionBanner(parametersValidationBanner, issues.parameters);
  syncFieldValidity();
}

function updateOutputFromState() {
  updateBanners();
  const output = errorsBlockGeneration() ? "" : generateOutput(state);
  outputCodeBlock?.setSource(output);
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
    if (returnTypeDropdown) setTypeDropdownValue(returnTypeDropdown, "custom");
    returnTypeCustomInput.value = state.returnType;
    setHidden(returnTypeCustomField, false);
  } else {
    if (returnTypeDropdown) setTypeDropdownValue(returnTypeDropdown, state.returnType || "table");
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

  hideImportBanners();
  setBannerMessage(importSuccessBanner, "Function imported.");
  showBanner(importSuccessBanner, { expire: IMPORT_SUCCESS_EXPIRE_MS });
}

function hideImportBanners() {
  hideBanner(importErrorBanner);
  hideBanner(importWarningBanner);
  hideBanner(importSuccessBanner);
  setHidden(importUseAsExpressionBtn, true);
  setHidden(importErrorHelpBtn, true);
  importHelpPopover?.close();
  pendingExpressionOffer = null;
}

function applyExpressionFromImport(expression) {
  expressionInput.value = expression;
  refreshCodeEditor(expressionInput);
  readStateFromDom();
  regenerate();

  if (importInput) {
    importInput.value = "";
    refreshCodeEditor(importInput);
  }
  syncImportActions();
  hideImportBanners();
  importExpand?.close();
}

function syncImportActions() {
  const hasText = Boolean(importInput?.value.trim());
  if (importFunctionBtn) importFunctionBtn.disabled = !hasText;
  if (clearImportBtn) clearImportBtn.disabled = !hasText;
}

function requestImportFromPaste() {
  const source = importInput?.value || "";
  if (!source.trim()) {
    syncImportActions();
    return;
  }

  const result = tryParseFunction(source);

  hideImportBanners();

  if (!result.ok) {
    if (result.kind === "expression-only") {
      pendingExpressionOffer = result.expression;
      setBannerMessage(importWarningBanner, result.warning);
      setHidden(importWarningBanner, false);
      setHidden(importUseAsExpressionBtn, false);
      return;
    }

    setBannerMessage(importErrorBanner, result.error);
    setHidden(importErrorBanner, false);
    setHidden(importErrorHelpBtn, !result.help);
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
  const next = style === OUTPUT_STYLES.SHARED ? OUTPUT_STYLES.SHARED : OUTPUT_STYLES.LET;
  state.outputStyle = next;
  outputStyleControl?.selectValue(next, { emit: false });
}

/**
 * @param {"let" | "shared"} style
 */
function outputStylePreviewBody(style) {
  const wrap = document.createElement("div");
  wrap.className = "output-style-preview";

  const blurb = document.createElement("p");
  const pre = document.createElement("pre");
  pre.className = "output-style-preview-code";

  if (style === OUTPUT_STYLES.SHARED) {
    blurb.textContent = "Emits top-level shared declarations (common in the query editor).";
    pre.textContent = `shared MyFunc = Value.ReplaceType(MyFuncImpl, MyFuncImplType);

MyFuncImplType = type function (…) as … meta [ … ];

MyFuncImpl = (…) as … =>
    …;`;
  } else {
    blurb.textContent = "Emits a nested let … in expression (easy to paste into another query).";
    pre.textContent = `let
    MyFuncImpl = (…) as … =>
        …,
    MyFuncImplType = type function (…) as … meta [ … ],
    MyFunc = Value.ReplaceType(MyFuncImpl, MyFuncImplType)
in
    MyFunc`;
  }

  wrap.append(blurb, pre);
  return wrap;
}

/**
 * @param {HTMLElement | null} controlEl
 */
function initOutputStylePreviews(controlEl) {
  if (!controlEl) return;

  const listEl = controlEl.querySelector(".segmented-control-list");
  const items = [
    ...controlEl.querySelectorAll(".segmented-control-item[data-segmented-control-value]"),
  ];
  if (!listEl || !items.length) return;

  outputStylePopover = initPopover({
    anchor: items[0],
    title: "let … in",
    body: outputStylePreviewBody(OUTPUT_STYLES.LET),
    position: "bottom",
    dismissible: false,
    closeOnOutsideClick: true,
    trapFocus: false,
    actions: [],
  });
  outputStylePopover.getElement()?.classList.add("output-style-popover");

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let closeTimer;

  function cancelClose() {
    window.clearTimeout(closeTimer);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer = window.setTimeout(() => {
      outputStylePopover?.close();
    }, 150);
  }

  /**
   * @param {HTMLElement} item
   */
  function showPreview(item) {
    cancelClose();
    const value = item.getAttribute("data-segmented-control-value");
    const style = value === OUTPUT_STYLES.SHARED ? OUTPUT_STYLES.SHARED : OUTPUT_STYLES.LET;
    outputStylePopover?.setAnchor(item);
    outputStylePopover?.update({
      title: style === OUTPUT_STYLES.SHARED ? "shared" : "let … in",
      body: outputStylePreviewBody(style),
    });
    outputStylePopover?.open();
    // Catalogue popover focuses itself on open; keep the segment focused for keyboard use.
    item.focus({ preventScroll: true });
    cancelClose();
  }

  for (const item of items) {
    if (!(item instanceof HTMLElement)) continue;
    item.addEventListener("mouseenter", () => showPreview(item));
    item.addEventListener("focus", () => showPreview(item));
  }

  listEl.addEventListener("mouseleave", scheduleClose);
  listEl.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && listEl.contains(next)) return;
    scheduleClose();
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

    const kindControl = card.querySelector(".param-kind");
    initSegmentedControl(kindControl, {
      onChange: ({ value, source }) => {
        if (source === "init") return;

        const isRecord = value === PARAM_KINDS.RECORD;
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
            initTypeDropdowns(list);
            initMetaChipInputs(list);
            initRecordFieldsForParamCard(card, { ensureOpenFieldIds: [field.id] });
          }
        }

        scheduleRegenerate();
      },
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
  root?.addEventListener("change", scheduleRegenerate);

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

  outputStyleControl = initSegmentedControl(outputStyleEl, {
    defaultValue: state.outputStyle || OUTPUT_STYLES.LET,
    onChange: ({ value, source }) => {
      state.outputStyle =
        value === OUTPUT_STYLES.SHARED ? OUTPUT_STYLES.SHARED : OUTPUT_STYLES.LET;
      if (source !== "init") scheduleRegenerate();
    },
  });
  initOutputStylePreviews(outputStyleEl);

  importFunctionBtn?.addEventListener("click", requestImportFromPaste);

  importInput?.addEventListener("input", () => {
    hideBanner(importWarningBanner);
    setHidden(importUseAsExpressionBtn, true);
    pendingExpressionOffer = null;
    syncImportActions();
  });

  clearImportBtn?.addEventListener("click", () => {
    if (importInput) {
      importInput.value = "";
      refreshCodeEditor(importInput);
    }
    hideImportBanners();
    syncImportActions();
  });

  importUseAsExpressionBtn?.addEventListener("click", () => {
    if (!pendingExpressionOffer) return;
    applyExpressionFromImport(pendingExpressionOffer);
  });

  importHelpPopover = initPopover({
    anchor: importErrorHelpBtn,
    title: "What can I import?",
    body: (() => {
      const wrap = document.createElement("div");
      wrap.className = "import-help-popover-body";

      const intro = document.createElement("p");
      intro.textContent =
        "Input a documented Power Query function that ends with Value.ReplaceType(impl, type) — either a let … in block or a shared declaration.";

      const shape = document.createElement("p");
      shape.textContent = "Typical shape:";

      const list = document.createElement("ul");
      for (const item of [
        "an implementation (parameters) as type => expression",
        "a type function (…) as type meta [ Documentation… ]",
        "Value.ReplaceType(implementation, type)",
      ]) {
        const li = document.createElement("li");
        li.textContent = item;
        list.append(li);
      }

      const tip = document.createElement("p");
      tip.textContent =
        "A plain let … in expression (without Value.ReplaceType) can be moved into the Expression field instead.";

      wrap.append(intro, shape, list, tip);
      return wrap;
    })(),
    position: "auto",
    dismissible: true,
    actions: [{ label: "Got it", className: "btn btn-primary" }],
  });

  importErrorHelpBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    importHelpPopover?.open();
  });

  importConfirmDialog = initDialog({
    dialogEl: document.getElementById("import-confirm-dialog"),
    onClose: () => {
      pendingImportState = null;
    },
  });

  document.getElementById("import-confirm-dialog-ok")?.addEventListener("click", confirmImport);

  syncImportActions();
}

export function initFunctionCreator() {
  if (!root) return;

  examplesCountBadge = initBadge(document.getElementById("examples-count-badge"), { value: 0 });
  parametersCountBadge = initBadge(document.getElementById("parameters-count-badge"), { value: 0 });

  mountReturnTypeDropdown();
  bindStaticEvents();

  importExpand = initExpand(document.getElementById("import-section"));

  initCodeEditors(root);
  if (outputPreview instanceof HTMLElement) {
    outputCodeBlock = initCodeBlock(outputPreview);
    initExpandableSurfaces(root);
  }

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
