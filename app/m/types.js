/** @typedef {"let" | "shared"} OutputStyle */

export const OUTPUT_STYLES = /** @type {const} */ ({
  LET: "let",
  SHARED: "shared",
});

export const PRIMITIVE_TYPES = [
  "any",
  "text",
  "number",
  "logical",
  "date",
  "datetime",
  "datetimezone",
  "time",
  "duration",
  "binary",
  "list",
  "record",
  "table",
  "function",
  "type",
  "null",
  "none",
];

export const PARAM_KINDS = /** @type {const} */ ({
  SCALAR: "scalar",
  RECORD: "record",
});

/**
 * @typedef {Object} ScalarMeta
 * @property {string} [fieldCaption]
 * @property {string} [fieldDescription]
 * @property {string[]} [sampleValues]
 * @property {string[]} [allowedValues]
 * @property {boolean} [isMultiLine]
 * @property {boolean} [isCode]
 */

/**
 * @typedef {Object} RecordField
 * @property {string} [id]
 * @property {string} name
 * @property {boolean} optional
 * @property {boolean} nullable
 * @property {string} mType
 * @property {ScalarMeta} meta
 */

/**
 * @typedef {Object} Parameter
 * @property {string} [id]
 * @property {string} name
 * @property {boolean} optional
 * @property {boolean} nullable
 * @property {"scalar" | "record"} kind
 * @property {string} mType
 * @property {ScalarMeta} meta
 * @property {RecordField[]} [fields]
 */

/**
 * @typedef {Object} FunctionExample
 * @property {string} [id]
 * @property {string} description
 * @property {string} code
 * @property {string} result
 */

/**
 * @typedef {Object} FunctionMeta
 * @property {string} [documentationName]
 * @property {string} [longDescription]
 * @property {FunctionExample[]} examples
 */

/**
 * @typedef {Object} FunctionCreatorState
 * @property {string} expression
 * @property {string} functionName
 * @property {string} returnType
 * @property {OutputStyle} outputStyle
 * @property {FunctionMeta} functionMeta
 * @property {Parameter[]} parameters
 */

export function createDefaultParameter() {
  return {
    name: "",
    optional: false,
    nullable: false,
    kind: PARAM_KINDS.SCALAR,
    mType: "text",
    meta: {},
    fields: [],
  };
}

export function createDefaultRecordField() {
  return {
    name: "",
    optional: false,
    nullable: false,
    mType: "text",
    meta: {},
  };
}

export function createDefaultExample() {
  return {
    description: "",
    code: "",
    result: "",
  };
}

export function createDefaultState() {
  return {
    expression: "",
    functionName: "MyFunc",
    returnType: "table",
    outputStyle: OUTPUT_STYLES.LET,
    functionMeta: {
      documentationName: "",
      longDescription: "",
      examples: [],
    },
    parameters: [],
  };
}

const DOM_ID_PATTERNS = {
  param: /^param-\d+$/,
  example: /^example-\d+$/,
  field: /^field-\d+$/,
};

/**
 * @param {unknown} id
 * @param {"param" | "example" | "field"} kind
 */
function sanitizeDomId(id, kind) {
  return typeof id === "string" && DOM_ID_PATTERNS[kind].test(id) ? id : undefined;
}

/**
 * @param {unknown} value
 */
function normalizeScalarMeta(value) {
  const meta = value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};

  return {
    fieldCaption: typeof meta.fieldCaption === "string" ? meta.fieldCaption : "",
    fieldDescription: typeof meta.fieldDescription === "string" ? meta.fieldDescription : "",
    sampleValues: Array.isArray(meta.sampleValues)
      ? meta.sampleValues.filter((item) => typeof item === "string")
      : [],
    allowedValues: Array.isArray(meta.allowedValues)
      ? meta.allowedValues.filter((item) => typeof item === "string")
      : [],
    isMultiLine: Boolean(meta.isMultiLine),
    isCode: Boolean(meta.isCode),
  };
}

/**
 * @param {unknown} value
 */
function normalizeRecordField(value) {
  const defaults = createDefaultRecordField();
  const field = value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};
  const id = sanitizeDomId(field.id, "field");

  return {
    ...defaults,
    id,
    name: typeof field.name === "string" ? field.name : defaults.name,
    optional: Boolean(field.optional),
    nullable: Boolean(field.nullable),
    mType: typeof field.mType === "string" ? field.mType : defaults.mType,
    meta: normalizeScalarMeta(field.meta),
  };
}

/**
 * @param {unknown} value
 */
function normalizeParameter(value) {
  const defaults = createDefaultParameter();
  const param = value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};
  const kind = param.kind === PARAM_KINDS.RECORD ? PARAM_KINDS.RECORD : PARAM_KINDS.SCALAR;
  const id = sanitizeDomId(param.id, "param");

  return {
    ...defaults,
    id,
    name: typeof param.name === "string" ? param.name : defaults.name,
    optional: Boolean(param.optional),
    nullable: Boolean(param.nullable),
    kind,
    mType: typeof param.mType === "string" ? param.mType : defaults.mType,
    meta: normalizeScalarMeta(param.meta),
    fields: kind === PARAM_KINDS.RECORD && Array.isArray(param.fields)
      ? param.fields.map((field) => normalizeRecordField(field))
      : [],
  };
}

/**
 * @param {unknown} value
 */
function normalizeExample(value) {
  const defaults = createDefaultExample();
  const example = value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};
  const id = sanitizeDomId(example.id, "example");

  return {
    ...defaults,
    id,
    description: typeof example.description === "string" ? example.description : defaults.description,
    code: typeof example.code === "string" ? example.code : defaults.code,
    result: typeof example.result === "string" ? example.result : defaults.result,
  };
}

/**
 * Merge persisted or imported partial state onto defaults safely.
 * @param {unknown} partial
 */
export function normalizeLoadedState(partial) {
  const defaults = createDefaultState();
  const source = partial && typeof partial === "object" ? /** @type {Record<string, unknown>} */ (partial) : {};
  const metaSource =
    source.functionMeta && typeof source.functionMeta === "object"
      ? /** @type {Record<string, unknown>} */ (source.functionMeta)
      : {};

  return {
    expression: typeof source.expression === "string" ? source.expression : defaults.expression,
    functionName:
      typeof source.functionName === "string" && source.functionName.trim()
        ? source.functionName
        : defaults.functionName,
    returnType: typeof source.returnType === "string" ? source.returnType : defaults.returnType,
    outputStyle: source.outputStyle === OUTPUT_STYLES.SHARED ? OUTPUT_STYLES.SHARED : OUTPUT_STYLES.LET,
    functionMeta: {
      documentationName:
        typeof metaSource.documentationName === "string" ? metaSource.documentationName : "",
      longDescription: typeof metaSource.longDescription === "string" ? metaSource.longDescription : "",
      examples: Array.isArray(metaSource.examples)
        ? metaSource.examples.map((example) => normalizeExample(example))
        : [],
    },
    parameters: Array.isArray(source.parameters)
      ? source.parameters.map((param) => normalizeParameter(param))
      : [],
  };
}
