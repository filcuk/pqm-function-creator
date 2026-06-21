import { escapeRegExp } from "./escape.js";
import { formatExpression } from "./format.js";
import {
  extractBalanced,
  findMatchingDelimiter,
  parseStringLiteralAt,
  skipWhitespace,
  splitTopLevel as splitTopLevelCommas,
} from "./scan.js";
import { PRIMITIVE_TYPES, PARAM_KINDS, OUTPUT_STYLES, createDefaultState } from "./types.js";
import { functionNameFromParts } from "./names.js";

/** @typedef {import("./types.js").FunctionCreatorState} FunctionCreatorState */
/** @typedef {import("./types.js").Parameter} Parameter */
/** @typedef {import("./types.js").RecordField} RecordField */
/** @typedef {import("./types.js").ScalarMeta} ScalarMeta */
/** @typedef {import("./types.js").FunctionExample} FunctionExample */

export class ParseError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * @param {string} text
 * @param {number} start
 */
function parseStringLiteral(text, start) {
  try {
    return parseStringLiteralAt(text, start);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid string literal";
    throw new ParseError(message);
  }
}

/**
 * @param {string} text
 * @param {number} start
 * @param {string} open
 * @param {string} close
 */
function findMatching(text, start, open, close) {
  try {
    return findMatchingDelimiter(text, start, open, close);
  } catch (error) {
    const message = error instanceof Error ? error.message : `Expected "${open}"`;
    throw new ParseError(message);
  }
}

/**
 * Split by comma at depth 0 (respecting strings and nesting).
 * @param {string} text
 */
function splitTopLevel(text) {
  return splitTopLevelCommas(text, (source, index) => parseStringLiteral(source, index).end);
}

/**
 * @param {string} literal
 */
function parseMString(literal) {
  const trimmed = literal.trim();
  if (!trimmed.startsWith('"')) return trimmed;
  return parseStringLiteral(trimmed, 0).value;
}

/**
 * @param {string} listText
 * @returns {string[]}
 */
function parseListValues(listText) {
  const trimmed = listText.trim();
  if (!trimmed.startsWith("{")) return [parseMString(trimmed)];

  const inner = extractBalanced(trimmed, 0, "{", "}");
  return splitTopLevel(inner.content).map((part) => {
    const value = part.trim();
    if (value === "true" || value === "false") return value;
    if (value === "null") return "null";
    if (/^-?\d+(\.\d+)?$/.test(value)) return value;
    return parseMString(value);
  });
}

/**
 * @param {string} recordText
 * @returns {Record<string, string | boolean>}
 */
function parseMetaFields(recordText) {
  const trimmed = recordText.trim();
  if (!trimmed.startsWith("[")) return {};

  const inner = extractBalanced(trimmed, 0, "[", "]");
  /** @type {Record<string, string | boolean>} */
  const fields = {};

  for (const part of splitTopLevel(inner.content)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;

    const key = part.slice(0, eq).trim();
    const rawValue = part.slice(eq + 1).trim();

    if (rawValue === "true" || rawValue === "false") {
      fields[key] = rawValue === "true";
    } else if (rawValue.startsWith("{")) {
      fields[key] = rawValue;
    } else if (rawValue.startsWith("[")) {
      fields[key] = rawValue;
    } else {
      fields[key] = parseMString(rawValue);
    }
  }

  return fields;
}

/**
 * @param {Record<string, string | boolean>} fields
 * @returns {ScalarMeta}
 */
function metaFieldsToScalarMeta(fields) {
  /** @type {ScalarMeta} */
  const meta = {};

  if (typeof fields["Documentation.FieldCaption"] === "string") {
    meta.fieldCaption = fields["Documentation.FieldCaption"];
  }
  if (typeof fields["Documentation.FieldDescription"] === "string") {
    meta.fieldDescription = fields["Documentation.FieldDescription"];
  }
  if (typeof fields["Documentation.SampleValues"] === "string") {
    meta.sampleValues = parseListValues(fields["Documentation.SampleValues"]);
  }
  if (typeof fields["Documentation.AllowedValues"] === "string") {
    meta.allowedValues = parseListValues(fields["Documentation.AllowedValues"]);
  }
  if (fields["Formatting.IsMultiLine"] === true) meta.isMultiLine = true;
  if (fields["Formatting.IsCode"] === true) meta.isCode = true;

  return meta;
}

/**
 * @param {string} typeExpr
 */
function parseSimpleType(typeExpr) {
  const trimmed = typeExpr.trim();
  let nullable = false;
  let rest = trimmed;

  if (/^nullable\s+/i.test(rest)) {
    nullable = true;
    rest = rest.replace(/^nullable\s+/i, "").trim();
  }

  return { mType: rest || "any", nullable };
}

/**
 * @param {string} typeExpr
 */
function parseScalarTypeExpr(typeExpr) {
  const trimmed = typeExpr.trim();

  const typedMetaMatch = trimmed.match(/^\(\s*type\s+([\s\S]+)\s+meta\s+(\[[\s\S]*\])\s*\)$/i);
  if (typedMetaMatch) {
    const { mType, nullable } = parseSimpleType(typedMetaMatch[1]);
    const meta = metaFieldsToScalarMeta(parseMetaFields(typedMetaMatch[2]));
    return { mType, nullable, meta };
  }

  const { mType, nullable } = parseSimpleType(trimmed);
  return { mType, nullable, meta: {} };
}

/**
 * @param {string} recordInner
 * @returns {RecordField[]}
 */
function parseRecordFields(recordInner) {
  /** @type {RecordField[]} */
  const fields = [];

  for (const part of splitTopLevel(recordInner)) {
    let optional = false;
    let segment = part.trim();
    if (/^optional\s+/i.test(segment)) {
      optional = true;
      segment = segment.replace(/^optional\s+/i, "").trim();
    }

    const eq = segment.indexOf("=");
    if (eq === -1) continue;

    const name = segment.slice(0, eq).trim();
    const typeExpr = segment.slice(eq + 1).trim();
    const { mType, nullable, meta } = parseScalarTypeExpr(typeExpr);

    fields.push({
      name,
      optional,
      nullable: nullable || optional,
      mType,
      meta,
    });
  }

  return fields;
}

/**
 * @param {string} paramSegment
 * @returns {Parameter}
 */
function parseTypeParameter(paramSegment) {
  let optional = false;
  let segment = paramSegment.trim();
  if (/^optional\s+/i.test(segment)) {
    optional = true;
    segment = segment.replace(/^optional\s+/i, "").trim();
  }

  const asIndex = segment.search(/\s+as\s+/i);
  if (asIndex === -1) {
    throw new ParseError(`Invalid parameter: ${paramSegment}`);
  }

  const name = segment.slice(0, asIndex).trim();
  const typeExpr = segment.slice(asIndex).replace(/^\s*as\s+/i, "").trim();

  if (typeExpr.startsWith("[")) {
    const inner = extractBalanced(typeExpr, 0, "[", "]");
    return {
      name,
      optional,
      nullable: optional,
      kind: PARAM_KINDS.RECORD,
      mType: "record",
      meta: {},
      fields: parseRecordFields(inner.content),
    };
  }

  const { mType, nullable, meta } = parseScalarTypeExpr(typeExpr);
  return {
    name,
    optional,
    nullable: nullable || optional,
    kind: PARAM_KINDS.SCALAR,
    mType,
    meta,
    fields: [],
  };
}

/**
 * @param {string} examplesText
 * @returns {FunctionExample[]}
 */
function parseExamples(examplesText) {
  const trimmed = examplesText.trim();
  if (!trimmed.startsWith("{")) return [];

  const inner = extractBalanced(trimmed, 0, "{", "}");
  /** @type {FunctionExample[]} */
  const examples = [];

  for (const part of splitTopLevel(inner.content)) {
    if (!part.trim().startsWith("[")) continue;
    const record = parseMetaFields(part);
    examples.push({
      description: typeof record.Description === "string" ? record.Description : "",
      code: typeof record.Code === "string" ? record.Code : "",
      result: typeof record.Result === "string" ? record.Result : "",
    });
  }

  return examples;
}

/**
 * @param {string} typeBlock
 */
function parseFunctionType(typeBlock) {
  const match = typeBlock.match(
    /type\s+function\s*\(([\s\S]*)\)\s*as\s+([\s\S]+?)(?:\s+meta\s+(\[[\s\S]*\]))?\s*$/i
  );
  if (!match) {
    throw new ParseError("Could not parse type function definition.");
  }

  const paramInner = match[1].trim();
  let returnPart = match[2].trim();
  const metaPart = match[3] || "";

  /** @type {Parameter[]} */
  const parameters = [];
  if (paramInner) {
    for (const segment of splitTopLevel(paramInner)) {
      if (segment.trim()) parameters.push(parseTypeParameter(segment));
    }
  }

  const returnType = returnPart.replace(/\s+meta\s+\[[\s\S]*\]\s*$/i, "").trim() || "any";
  const metaFields = metaPart ? parseMetaFields(metaPart) : {};

  return {
    returnType,
    parameters,
    functionMeta: {
      documentationName:
        typeof metaFields["Documentation.Name"] === "string"
          ? metaFields["Documentation.Name"]
          : "",
      longDescription:
        typeof metaFields["Documentation.LongDescription"] === "string"
          ? metaFields["Documentation.LongDescription"]
          : "",
      examples:
        typeof metaFields["Documentation.Examples"] === "string"
          ? parseExamples(metaFields["Documentation.Examples"])
          : [],
    },
  };
}

/**
 * @param {string} text
 * @param {string} implName
 */
function extractImplementation(text, implName) {
  const pattern = new RegExp(`\\b${escapeRegExp(implName)}\\s*=\\s*\\(`);
  const match = pattern.exec(text);
  if (!match) {
    throw new ParseError(`Could not find implementation "${implName}".`);
  }

  const openParen = match.index + match[0].length - 1;
  const closeParen = findMatching(text, openParen, "(", ")");
  let i = skipWhitespace(text, closeParen + 1);

  const asMatch = text.slice(i).match(/^as\s+(.+?)\s*=>\s*/is);
  if (!asMatch) {
    throw new ParseError(`Could not parse return type and body for "${implName}".`);
  }

  const returnType = asMatch[1].trim();
  i += asMatch[0].length;

  let bodyEnd = text.length;
  const typePattern = new RegExp(`\\n\\s*\\w+\\s*=\\s*type\\s+function\\b`);
  const typeMatch = typePattern.exec(text.slice(i));
  if (typeMatch) {
    bodyEnd = i + typeMatch.index;
    bodyEnd = text.lastIndexOf(",", bodyEnd);
    if (bodyEnd === -1 || bodyEnd < i) bodyEnd = i + typeMatch.index;
  } else {
    const semi = text.indexOf(";", i);
    if (semi !== -1) bodyEnd = semi;
  }

  let body = text.slice(i, bodyEnd).trim();
  if (body.endsWith(",")) body = body.slice(0, -1).trim();

  return { returnType, body };
}

/**
 * @param {string} text
 * @param {string} typeName
 */
function extractTypeDefinition(text, typeName) {
  const pattern = new RegExp(`\\b${escapeRegExp(typeName)}\\s*=\\s*type\\s+function\\b`, "i");
  const match = pattern.exec(text);
  if (!match) {
    throw new ParseError(`Could not find type definition "${typeName}".`);
  }

  let i = match.index + match[0].indexOf("type");
  const funcKeyword = text.slice(i, i + "type function".length);
  if (funcKeyword.toLowerCase() !== "type function") {
    throw new ParseError(`Malformed type definition for "${typeName}".`);
  }

  const openParen = text.indexOf("(", i);
  if (openParen === -1) throw new ParseError(`Missing parameter list for "${typeName}".`);

  const closeParen = findMatching(text, openParen, "(", ")");
  i = skipWhitespace(text, closeParen + 1);

  const asMatch = text.slice(i).match(/^as\s+/i);
  if (!asMatch) throw new ParseError(`Missing return type for "${typeName}".`);
  i += asMatch[0].length;

  const afterAs = text.slice(i);
  let returnType;
  let metaPart = "";
  const metaIdx = afterAs.search(/\smeta\s+\[/i);

  if (metaIdx !== -1) {
    returnType = afterAs.slice(0, metaIdx).trim();
    const bracketStart = afterAs.indexOf("[", metaIdx);
    metaPart = extractBalanced(afterAs, bracketStart, "[", "]").full;
  } else {
    const terminal = afterAs.search(/[;\n]/);
    returnType = (terminal === -1 ? afterAs : afterAs.slice(0, terminal)).trim();
  }

  const paramInner = text.slice(openParen + 1, closeParen);
  const typeBlock = `type function (${paramInner}) as ${returnType}${metaPart ? ` meta ${metaPart}` : ""}`;
  return parseFunctionType(typeBlock);
}

/**
 * @param {string} text
 */
function detectReplaceType(text) {
  const sharedMatch = text.match(
    /^\s*shared\s+(\w+)\s*=\s*Value\.ReplaceType\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/im
  );
  if (sharedMatch) {
    return {
      outputStyle: OUTPUT_STYLES.SHARED,
      sharedName: sharedMatch[1],
      implName: sharedMatch[2],
      typeName: sharedMatch[3],
    };
  }

  const letMatch = text.match(
    /(\w+)\s*=\s*Value\.ReplaceType\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i
  );
  if (letMatch) {
    return {
      outputStyle: OUTPUT_STYLES.LET,
      sharedName: letMatch[1],
      implName: letMatch[2],
      typeName: letMatch[3],
    };
  }

  throw new ParseError(
    "Could not find Value.ReplaceType(impl, type). Paste a documented function in let or shared form."
  );
}

/**
 * Parse pasted M function code into form state.
 * @param {string} source
 * @returns {FunctionCreatorState}
 */
export function parseFunction(source) {
  const text = source.trim().replace(/\r\n/g, "\n");
  if (!text) throw new ParseError("Input is empty.");

  const { outputStyle, sharedName, implName, typeName } = detectReplaceType(text);
  const typeInfo = extractTypeDefinition(text, typeName);
  const implInfo = extractImplementation(text, implName);

  const state = createDefaultState();
  state.outputStyle = outputStyle;
  state.functionName = functionNameFromParts(implName, sharedName);
  state.expression = implInfo.body.trim() ? formatExpression(implInfo.body) : "";
  state.returnType = typeInfo.returnType || implInfo.returnType;
  state.functionMeta = typeInfo.functionMeta;
  state.parameters = typeInfo.parameters;

  return state;
}

/**
 * @param {string} source
 * @returns {{ ok: true, state: FunctionCreatorState } | { ok: false, error: string }}
 */
export function tryParseFunction(source) {
  try {
    return { ok: true, state: parseFunction(source) };
  } catch (error) {
    const message = error instanceof ParseError ? error.message : "Failed to parse function.";
    return { ok: false, error: message };
  }
}
