/** One indent step in generated M (4 spaces). */
import { skipStringEnd, splitTopLevel } from "./scan.js";

export const M_INDENT = "    ";

/**
 * Normalize and reformat an M expression with consistent indentation.
 * @param {string} text
 */
export function formatExpression(text) {
  const trimmed = text?.trim();
  if (!trimmed) return "null";

  const singleLineLet = tryFormatSingleLineLet(trimmed);
  if (singleLineLet) return singleLineLet;

  const lines = dedentToLines(trimmed);
  if (lines.length === 0) return "null";

  if (/^let\b/i.test(lines[0].trim())) {
    return formatLetBlock(lines).join("\n");
  }

  return lines.join("\n");
}

/**
 * @param {string} line
 */
function tryFormatSingleLineLet(line) {
  if (line.includes("\n")) return null;

  const match = line.match(/^let\s+(.+)\s+in\s+(.+)$/i);
  if (!match) return null;

  const pseudoLines = ["let", ...splitBindings(match[1]), "in", match[2].trim()];
  return formatLetBlock(pseudoLines).join("\n");
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function dedentToLines(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, M_INDENT)
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""));

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length === 0) return [];

  const minIndent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => leadingSpaces(line))
  );

  return lines.map((line) => (line.trim() ? line.slice(minIndent) : ""));
}

/**
 * @param {string} line
 */
function leadingSpaces(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

/**
 * @param {string[]} lines
 */
function formatLetBlock(lines) {
  const inInfo = findOuterInLine(lines);
  if (!inInfo) return lines;

  /** @type {string[]} */
  const out = ["let"];

  const bindingsText = lines.slice(1, inInfo.index).join("\n").trim();
  const bindings = splitBindings(bindingsText);

  bindings.forEach((binding, index) => {
    const formatted = formatBinding(binding.trim().replace(/,\s*$/, ""));
    appendIndented(out, formatted, index < bindings.length - 1);
  });

  out.push("in");

  const resultText = inInfo.inlineResult ?? lines.slice(inInfo.index + 1).join("\n").trim();
  appendIndented(out, formatValue(resultText || "null"), false);

  return out;
}

/**
 * @param {string[]} lines
 */
function findOuterInLine(lines) {
  let depth = 0;

  for (let i = lines.length - 1; i > 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (/^in\b/i.test(trimmed)) {
      if (depth === 0) {
        const inlineResult = trimmed.replace(/^in\b/i, "").trim();
        return {
          index: i,
          inlineResult: inlineResult || null,
        };
      }
      depth -= 1;
      continue;
    }
    if (/^let(\s|$)/i.test(trimmed)) {
      depth += 1;
    }
  }

  return null;
}

/**
 * @param {string} bindingText
 * @returns {string[]}
 */
function splitBindings(bindingText) {
  const trimmed = bindingText.trim();
  if (!trimmed) return [];

  const commaParts = splitTopLevel(trimmed);
  if (commaParts.length > 1) return commaParts;

  const lines = trimmed.split("\n");
  /** @type {string[]} */
  const bindings = [];
  /** @type {string[]} */
  let chunk = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (chunk.length > 0 && startsNewBinding(trimmedLine) && bindingLineComplete(chunk)) {
      bindings.push(chunk.join("\n").trim());
      chunk = [line.trim()];
      continue;
    }

    chunk.push(line.trim());
  }

  if (chunk.length) bindings.push(chunk.join("\n").trim());
  return bindings;
}

/**
 * @param {string[]} chunkLines
 */
function bindingLineComplete(chunkLines) {
  const last = chunkLines[chunkLines.length - 1]?.trim() || "";
  if (/,\s*$/.test(last)) return true;
  if (/=\s*let\b/i.test(last)) return false;
  if (/^in\b/i.test(last)) return true;
  if (chunkLines.length === 1 && splitBindingNameValue(last) && !/\blet\b/i.test(last)) {
    return true;
  }
  return false;
}

/**
 * @param {string} line
 */
function startsNewBinding(line) {
  if (/^let\b/i.test(line)) return false;
  if (/^in\b/i.test(line)) return false;
  return Boolean(splitBindingNameValue(line));
}

/**
 * @param {string} binding
 */
function formatBinding(binding) {
  const split = splitBindingNameValue(binding);
  if (!split) return binding;

  const formattedValue = formatValue(split.value);
  if (!formattedValue.includes("\n")) {
    return `${split.name} = ${formattedValue}`;
  }

  const valueLines = formattedValue.split("\n");
  return [`${split.name} = ${valueLines[0]}`, ...valueLines.slice(1)].join("\n");
}

/**
 * @param {string} value
 */
function formatValue(value) {
  const trimmed = value.trim().replace(/,\s*$/, "");
  if (!trimmed) return "null";

  const singleLineLet = tryFormatSingleLineLet(trimmed);
  if (singleLineLet) return singleLineLet;

  const lines = dedentToLines(trimmed);
  if (lines.length > 0 && /^let\b/i.test(lines[0].trim())) {
    return formatLetBlock(lines).join("\n");
  }

  return lines.join("\n");
}

/**
 * @param {string[]} out
 * @param {string} text
 * @param {boolean} trailingComma
 */
function appendIndented(out, text, trailingComma) {
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    const suffix = isLast && trailingComma ? "," : "";
    out.push(`${M_INDENT}${line}${suffix}`);
  });
}

/**
 * @param {string} text
 */
function splitBindingNameValue(text) {
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '"') {
      i = skipStringEnd(text, i) - 1;
      continue;
    }

    const ch = text[i];
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === "{") depthBrace += 1;
    else if (ch === "}") depthBrace -= 1;
    else if (ch === "=" && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      return {
        name: text.slice(0, i).trim(),
        value: text.slice(i + 1).trim(),
      };
    }
  }

  return null;
}
