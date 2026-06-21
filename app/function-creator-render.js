import { escapeAttr, escapeText } from "./m/escape.js";
import { PARAM_KINDS, PRIMITIVE_TYPES } from "./m/types.js";

/**
 * @param {{ nextId: (prefix: string) => string }} deps
 */
export function createRenderer({ nextId }) {
  /**
   * @param {string} selected
   * @param {boolean} [includeRecord]
   */
  function typeOptionsHtml(selected, includeRecord = false) {
    const types = includeRecord
      ? [...PRIMITIVE_TYPES, "record"]
      : PRIMITIVE_TYPES.filter((t) => t !== "record");
    return types
      .map((type) => `<option value="${type}"${type === selected ? " selected" : ""}>${type}</option>`)
      .join("");
  }

  /**
   * @param {{ id: string, className: string, label: string, pressed: boolean }} options
   */
  function renderToggleButton({ id, className, label, pressed }) {
    return `<button type="button" id="${id}" class="btn param-toggle ${className}${pressed ? " is-active" : ""}" aria-pressed="${pressed ? "true" : "false"}">${escapeText(label)}</button>`;
  }

  /**
   * @param {import("./m/types.js").ScalarMeta} meta
   * @param {string} idPrefix
   * @param {{ captionClass?: string, descriptionClass?: string, hidden?: boolean }} [options]
   */
  function scalarCaptionDescriptionHtml(meta, idPrefix, options = {}) {
    const captionClass = options.captionClass || "meta-field-caption";
    const descriptionClass = options.descriptionClass || "meta-field-description";
    const hiddenAttr = options.hidden ? " hidden" : "";
    const hiddenClass = options.hidden ? " hidden" : "";

    return `
    <label class="field ${captionClass}${hiddenClass}" for="${idPrefix}-caption"${hiddenAttr}>
      <span class="field-label">Caption</span>
      <input type="text" id="${idPrefix}-caption" class="input meta-caption" value="${escapeAttr(meta.fieldCaption || "")}" />
    </label>
    <label class="field ${descriptionClass}${hiddenClass}" for="${idPrefix}-description"${hiddenAttr}>
      <span class="field-label">Description</span>
      <input type="text" id="${idPrefix}-description" class="input meta-description" value="${escapeAttr(meta.fieldDescription || "")}" />
    </label>
  `;
  }

  /**
   * @param {import("./m/types.js").ScalarMeta} meta
   * @param {string} idPrefix
   */
  function scalarSampleAllowedHtml(meta, idPrefix) {
    return `
    <label class="field field-span-all" for="${idPrefix}-sample">
      <span class="field-label-line">
        <span class="field-label">Sample values</span>
        <span class="field-hint">One value per line</span>
      </span>
      <textarea id="${idPrefix}-sample" class="textarea meta-sample" rows="2" spellcheck="false">${escapeText(meta.sampleValues?.join("\n") || "")}</textarea>
    </label>
    <label class="field field-span-all" for="${idPrefix}-allowed">
      <span class="field-label-line">
        <span class="field-label">Allowed values</span>
        <span class="field-hint">One value per line; enables dropdown in function invocation dialog</span>
      </span>
      <textarea id="${idPrefix}-allowed" class="textarea meta-allowed" rows="2" spellcheck="false">${escapeText(meta.allowedValues?.join("\n") || "")}</textarea>
    </label>
  `;
  }

  /**
   * @param {import("./m/types.js").ScalarMeta} meta
   * @param {string} idPrefix
   */
  function scalarFormatToggleHtml(meta, idPrefix) {
    return `
    ${renderToggleButton({
      id: `${idPrefix}-multiline`,
      className: "meta-multiline",
      label: "Multi-line input",
      pressed: Boolean(meta.isMultiLine),
    })}
    ${renderToggleButton({
      id: `${idPrefix}-code`,
      className: "meta-code",
      label: "Code font",
      pressed: Boolean(meta.isCode),
    })}
  `;
  }

  /**
   * @param {import("./m/types.js").RecordField} field
   * @param {number} index
   */
  function renderRecordField(field, index) {
    const id = field.id || nextId("field");
    field.id = id;
    const idPrefix = `record-${id}`;
    const panelId = `record-field-panel-${id}`;
    const title = field.name.trim() || `Field ${index + 1}`;

    return `
    <div class="record-field-card param-card expand" data-field-id="${id}">
      <div class="param-card-top">
        <button type="button" class="expand-trigger" aria-expanded="false" aria-controls="${panelId}">
          <span class="expand-notch" aria-hidden="true"></span>
          <span class="expand-label record-field-title">${escapeText(title)}</span>
        </button>
        <button type="button" class="btn btn-with-icon remove-record-field" aria-label="Remove field">
          <span data-icon="remove" aria-hidden="true"></span>
          Remove
        </button>
      </div>
      <div id="${panelId}" class="expand-panel">
        <div class="record-field-body">
        <div class="field-grid record-field-grid">
          <label class="field record-field-name" for="${idPrefix}-name">
            <span class="field-label">Field name</span>
            <input type="text" id="${idPrefix}-name" class="input field-name" value="${escapeAttr(field.name)}" autocomplete="off" />
          </label>
          <label class="field record-field-type" for="${idPrefix}-type">
            <span class="field-label">Type</span>
            <select id="${idPrefix}-type" class="input field-type">${typeOptionsHtml(field.mType)}</select>
          </label>
          ${scalarCaptionDescriptionHtml(field.meta, idPrefix, {
            captionClass: "record-field-caption",
            descriptionClass: "record-field-description",
          })}
          <div class="record-field-toggles">
            ${renderToggleButton({
              id: `${idPrefix}-optional`,
              className: "field-optional",
              label: "Optional",
              pressed: Boolean(field.optional),
            })}
            ${renderToggleButton({
              id: `${idPrefix}-nullable`,
              className: "field-nullable",
              label: "Nullable",
              pressed: Boolean(field.nullable),
            })}
            ${scalarFormatToggleHtml(field.meta, idPrefix)}
          </div>
        </div>
        <div class="meta-grid record-meta-grid">
          ${scalarSampleAllowedHtml(field.meta, idPrefix)}
        </div>
      </div>
      </div>
    </div>
  `;
  }

  /**
   * @param {import("./m/types.js").Parameter} param
   */
  function renderParameter(param) {
    const id = param.id || nextId("param");
    param.id = id;
    const panelId = `param-panel-${id}`;
    const isRecord = param.kind === PARAM_KINDS.RECORD;
    const title = param.name.trim() || "New parameter";

    const fieldsHtml = (param.fields || [])
      .map((field, index) => renderRecordField(field, index))
      .join("");

    return `
    <div class="param-card expand" data-param-id="${id}">
      <div class="param-card-top">
        <button type="button" class="expand-trigger" aria-expanded="false" aria-controls="${panelId}">
          <span class="expand-notch" aria-hidden="true"></span>
          <span class="expand-label param-card-title">${escapeText(title)}</span>
        </button>
        <button type="button" class="btn btn-with-icon remove-parameter" aria-label="Remove parameter">
          <span data-icon="remove" aria-hidden="true"></span>
          Remove
        </button>
      </div>
      <div id="${panelId}" class="expand-panel">
        <div class="param-card-body">
          <div class="field-grid param-field-grid">
            <label class="field param-field-name" for="param-${id}-name">
              <span class="field-label">Parameter name</span>
              <input type="text" id="param-${id}-name" class="input param-name" value="${escapeAttr(param.name)}" autocomplete="off" />
            </label>
            <label class="field param-field-kind" for="param-${id}-kind">
              <span class="field-label">Kind</span>
              <select id="param-${id}-kind" class="input param-kind">
                <option value="${PARAM_KINDS.SCALAR}"${!isRecord ? " selected" : ""}>Scalar</option>
                <option value="${PARAM_KINDS.RECORD}"${isRecord ? " selected" : ""}>Record</option>
              </select>
            </label>
            <label class="field param-field-type param-scalar-type${isRecord ? " hidden" : ""}" for="param-${id}-type" ${isRecord ? "hidden" : ""}>
              <span class="field-label">Type</span>
              <select id="param-${id}-type" class="input param-type">${typeOptionsHtml(param.mType)}</select>
            </label>
            ${scalarCaptionDescriptionHtml(param.meta, `param-${id}`, {
              captionClass: "param-field-caption param-scalar-only",
              descriptionClass: "param-field-description param-scalar-only",
              hidden: isRecord,
            })}
            <div class="param-field-toggles">
              ${renderToggleButton({
                id: `param-${id}-optional`,
                className: "param-optional",
                label: "Optional",
                pressed: Boolean(param.optional),
              })}
              ${renderToggleButton({
                id: `param-${id}-nullable`,
                className: "param-nullable",
                label: "Nullable",
                pressed: Boolean(param.nullable),
              })}
              <span class="param-scalar-toggles param-scalar-type${isRecord ? " hidden" : ""}" ${isRecord ? "hidden" : ""}>${scalarFormatToggleHtml(param.meta, `param-${id}`)}</span>
            </div>
          </div>
          <div class="param-scalar-meta meta-grid param-meta-grid${isRecord ? " hidden" : ""}" ${isRecord ? "hidden" : ""}>
            ${scalarSampleAllowedHtml(param.meta, `param-${id}`)}
          </div>
          <div class="param-record-fields record-fields${isRecord ? "" : " hidden"}" ${isRecord ? "" : "hidden"}>
            <div class="toolbar record-fields-toolbar">
              <span class="section-heading">Record fields</span>
              <div class="record-fields-toolbar-actions">
                <button type="button" class="btn toggle-all-record-fields" disabled>Expand all</button>
                <button type="button" class="btn btn-with-icon add-record-field">
                  <span data-icon="add" aria-hidden="true"></span>
                  Add field
                </button>
              </div>
            </div>
            <div class="record-fields-list param-list">${fieldsHtml}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  /**
   * @param {import("./m/types.js").FunctionExample} example
   * @param {number} index
   */
  function renderExample(example, index) {
    const id = example.id || nextId("example");
    example.id = id;
    const panelId = `example-panel-${id}`;
    const title = example.description.trim() || `Example ${index + 1}`;

    return `
    <div class="param-card expand" data-example-id="${id}">
      <div class="param-card-top">
        <button type="button" class="expand-trigger" aria-expanded="false" aria-controls="${panelId}">
          <span class="expand-notch" aria-hidden="true"></span>
          <span class="expand-label param-card-title">${escapeText(title)}</span>
        </button>
        <button type="button" class="btn btn-with-icon remove-example" aria-label="Remove example">
          <span data-icon="remove" aria-hidden="true"></span>
          Remove
        </button>
      </div>
      <div id="${panelId}" class="expand-panel">
        <div class="param-card-body example-field-grid">
          <label class="field example-field-description" for="example-${id}-description">
            <span class="field-label">Description</span>
            <input type="text" id="example-${id}-description" class="input example-description" value="${escapeAttr(example.description)}" />
          </label>
          <label class="field example-field-code" for="example-${id}-code">
            <span class="field-label">Code</span>
            <textarea id="example-${id}-code" class="textarea code-input example-code" rows="2" spellcheck="false">${escapeText(example.code)}</textarea>
          </label>
          <label class="field example-field-result" for="example-${id}-result">
            <span class="field-label">Result</span>
            <textarea id="example-${id}-result" class="textarea code-input code-input-plain example-result" data-code-language="plain" rows="2" spellcheck="false">${escapeText(example.result)}</textarea>
          </label>
        </div>
      </div>
    </div>
  `;
  }

  return { renderParameter, renderExample, renderRecordField };
}
