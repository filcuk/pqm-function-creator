import {
  escapeMString,
  formatListLiteral,
  formatMetaRecord,
  indentBlock,
  isValidIdentifier,
} from "./escape.js";
import { formatExpression, M_INDENT } from "./format.js";
import { resolveFunctionNames } from "./names.js";
import { OUTPUT_STYLES, PARAM_KINDS } from "./types.js";

/** @typedef {import("./types.js").Parameter} Parameter */
/** @typedef {import("./types.js").RecordField} RecordField */
/** @typedef {import("./types.js").ScalarMeta} ScalarMeta */
/** @typedef {import("./types.js").FunctionMeta} FunctionMeta */
/** @typedef {import("./types.js").FunctionCreatorState} FunctionCreatorState */

/**
 * @param {ScalarMeta} meta
 */
function buildScalarMetaFields(meta) {
  /** @type {Record<string, string | boolean>} */
  const fields = {};

  if (meta.fieldCaption?.trim()) {
    fields["Documentation.FieldCaption"] = escapeMString(meta.fieldCaption.trim());
  }
  if (meta.fieldDescription?.trim()) {
    fields["Documentation.FieldDescription"] = escapeMString(meta.fieldDescription.trim());
  }

  const sampleValues = formatListLiteral(meta.sampleValues || []);
  if (sampleValues) {
    fields["Documentation.SampleValues"] = sampleValues;
  }

  const allowedValues = formatListLiteral(meta.allowedValues || []);
  if (allowedValues) {
    fields["Documentation.AllowedValues"] = allowedValues;
  }

  if (meta.isMultiLine) {
    fields["Formatting.IsMultiLine"] = true;
  }
  if (meta.isCode) {
    fields["Formatting.IsCode"] = true;
  }

  return fields;
}

/**
 * @param {string} mType
 * @param {boolean} nullable
 */
function wrapType(mType, nullable) {
  const base = mType.trim() || "any";
  return nullable ? `nullable ${base}` : base;
}

/**
 * @param {ScalarMeta} meta
 * @param {string} mType
 * @param {boolean} nullable
 */
function buildTypedMeta(meta, mType, nullable) {
  const metaFields = buildScalarMetaFields(meta);
  const typeExpr = wrapType(mType, nullable);

  if (Object.keys(metaFields).length === 0) {
    return typeExpr;
  }

  const metaRecord = formatMetaRecord(metaFields);
  return `(type ${typeExpr} meta ${metaRecord})`;
}

/**
 * @param {RecordField} field
 */
function buildRecordFieldType(field) {
  const metaFields = buildScalarMetaFields(field.meta);
  const typeExpr = wrapType(field.mType, field.nullable);

  if (Object.keys(metaFields).length === 0) {
    return typeExpr;
  }

  const metaRecord = formatMetaRecord(metaFields);
  return `(type ${typeExpr} meta ${metaRecord})`;
}

/**
 * @param {RecordField[]} fields
 */
function buildRecordType(fields) {
  const parts = fields
    .filter((field) => field.name.trim())
    .map((field) => {
      const optionalPrefix = field.optional ? "optional " : "";
      const typeExpr = buildRecordFieldType(field);
      return `${optionalPrefix}${field.name.trim()} = ${typeExpr}`;
    });

  if (parts.length === 0) {
    return "record";
  }

  return `[\n        ${parts.join(",\n        ")}\n    ]`;
}

/**
 * @param {Parameter} param
 */
function buildParameterTypeExpr(param) {
  if (param.kind === PARAM_KINDS.RECORD) {
    return buildRecordType(param.fields || []);
  }
  return buildTypedMeta(param.meta, param.mType, param.nullable);
}

/**
 * @param {Parameter} param
 */
function buildImplParameter(param) {
  const optionalPrefix = param.optional ? "optional " : "";
  let typeExpr;

  if (param.kind === PARAM_KINDS.RECORD) {
    typeExpr = "record";
  } else {
    typeExpr = wrapType(param.mType, param.nullable);
  }

  return `${optionalPrefix}${param.name.trim()} as ${typeExpr}`;
}

/**
 * @param {Parameter} param
 */
function buildTypeParameter(param) {
  const optionalPrefix = param.optional ? "optional " : "";
  const typeExpr = buildParameterTypeExpr(param);
  return `${optionalPrefix}${param.name.trim()} as ${typeExpr}`;
}

/**
 * @param {import("./types.js").FunctionExample} example
 */
function formatExampleRecord(example) {
  const parts = [];
  if (example.description?.trim()) {
    parts.push(`Description = ${escapeMString(example.description.trim())}`);
  }
  if (example.code?.trim()) {
    parts.push(`Code = ${escapeMString(example.code.trim())}`);
  }
  if (example.result?.trim()) {
    parts.push(`Result = ${escapeMString(example.result.trim())}`);
  }

  if (parts.length === 0) return null;

  return `[\n                ${parts.join(",\n                ")}\n            ]`;
}

/**
 * @param {import("./types.js").FunctionExample[]} examples
 */
function formatExamplesLiteral(examples) {
  const records = examples
    .filter((example) => example.description?.trim() || example.code?.trim() || example.result?.trim())
    .map(formatExampleRecord)
    .filter((record) => record != null);

  if (records.length === 0) return null;

  return `{\n            ${records.join(",\n            ")}\n        }`;
}

/**
 * @param {FunctionMeta} meta
 */
function buildFunctionMetaFields(meta) {
  /** @type {Record<string, string | boolean>} */
  const fields = {};

  if (meta.documentationName?.trim()) {
    fields["Documentation.Name"] = escapeMString(meta.documentationName.trim());
  }
  if (meta.longDescription?.trim()) {
    fields["Documentation.LongDescription"] = escapeMString(meta.longDescription.trim());
  }

  const examplesLiteral = formatExamplesLiteral(meta.examples || []);
  if (examplesLiteral) {
    fields["Documentation.Examples"] = examplesLiteral;
  }

  return fields;
}

/**
 * @param {FunctionCreatorState} state
 */
function buildImplSignature(state) {
  const { implName } = resolveFunctionNames(state.functionName);
  const returnType = state.returnType.trim() || "any";
  const implParams = state.parameters
    .filter((param) => param.name.trim())
    .map(buildImplParameter);

  if (implParams.length === 0) {
    return `${implName} = () as ${returnType} =>`;
  }

  const paramBlock = implParams
    .map((param, index) => {
      const comma = index < implParams.length - 1 ? "," : "";
      return `${M_INDENT}${param}${comma}`;
    })
    .join("\n");

  return `${implName} = (\n${paramBlock}\n) as ${returnType} =>`;
}

/**
 * @param {FunctionCreatorState} state
 */
export function buildImplementation(state) {
  const signature = buildImplSignature(state);
  const body = formatExpression(state.expression);

  return `${signature}\n${indentBlock(body, M_INDENT)}`;
}

/**
 * @param {FunctionCreatorState} state
 */
export function buildFunctionType(state) {
  const { typeName } = resolveFunctionNames(state.functionName);
  const params = state.parameters
    .filter((param) => param.name.trim())
    .map(buildTypeParameter)
    .join(",\n    ");

  const returnType = state.returnType.trim() || "any";
  const metaFields = buildFunctionMetaFields(state.functionMeta);
  const metaRecord = formatMetaRecord(metaFields);

  const paramBlock = params ? `\n    ${params}\n` : "\n";
  const returnSuffix = metaRecord ? ` meta ${metaRecord}` : "";

  return `${typeName} = type function (${paramBlock}) as ${returnType}${returnSuffix}`;
}

/**
 * @param {FunctionCreatorState} state
 */
export function buildLetOutput(state) {
  const { implName, sharedName, typeName } = resolveFunctionNames(state.functionName);

  const impl = buildImplementation(state);
  const typeDef = buildFunctionType(state);

  return `let
    ${impl},
    ${typeDef},
    ${sharedName} = Value.ReplaceType(${implName}, ${typeName})
in
    ${sharedName}`;
}

/**
 * @param {FunctionCreatorState} state
 */
export function buildSharedOutput(state) {
  const { implName, sharedName, typeName } = resolveFunctionNames(state.functionName);

  const impl = buildImplementation(state);
  const typeDef = buildFunctionType(state);

  return `shared ${sharedName} = Value.ReplaceType(${implName}, ${typeName});

${typeDef};

${impl};`;
}

/**
 * @param {FunctionCreatorState} state
 */
export function generateOutput(state) {
  if (state.outputStyle === OUTPUT_STYLES.SHARED) {
    return buildSharedOutput(state);
  }
  return buildLetOutput(state);
}

/**
 * @param {FunctionCreatorState} state
 * @returns {string[]}
 */
export function validateState(state) {
  const errors = [];

  if (!state.functionName.trim()) {
    errors.push("Function name is required.");
  } else if (!isValidIdentifier(state.functionName.trim())) {
    errors.push(`Function name "${state.functionName}" is not a valid M identifier.`);
  }

  if (!state.returnType.trim()) {
    errors.push("Return type is required.");
  }

  const seen = new Set();
  for (const param of state.parameters) {
    const name = param.name.trim();
    if (!name) continue;

    if (!isValidIdentifier(name)) {
      errors.push(`Parameter "${name}" is not a valid M identifier.`);
    }
    if (seen.has(name)) {
      errors.push(`Duplicate parameter name "${name}".`);
    }
    seen.add(name);

    if (param.kind === PARAM_KINDS.RECORD) {
      const fieldNames = new Set();
      for (const field of param.fields || []) {
        const fieldName = field.name.trim();
        if (!fieldName) continue;
        if (!isValidIdentifier(fieldName)) {
          errors.push(`Record field "${fieldName}" in parameter "${name}" is not a valid M identifier.`);
        }
        if (fieldNames.has(fieldName)) {
          errors.push(`Duplicate record field "${fieldName}" in parameter "${name}".`);
        }
        fieldNames.add(fieldName);
      }
    }
  }

  return errors;
}

/**
 * @param {FunctionCreatorState} state
 */
export function expressionWarning(state) {
  const trimmed = state.expression.trim();
  if (!trimmed) return "Expression is empty.";
  if (!/^let\b/i.test(trimmed)) {
    return "Expression does not start with let — it will be wrapped as-is after =>.";
  }
  return null;
}
