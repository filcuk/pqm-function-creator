const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Escape a string for safe use inside a RegExp.
 * @param {string} text
 */
export function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape text for HTML text nodes.
 * @param {string} value
 */
export function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
}

/**
 * Escape a string for HTML attribute values.
 * @param {string} value
 */
export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Escape text for HTML (text nodes and attribute-safe subset with `>`).
 * @param {string} text
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {string} name
 */
export function isValidIdentifier(name) {
  return IDENTIFIER_RE.test(name);
}

/**
 * @param {string} text
 */
export function escapeMString(text) {
  return `"${String(text).replace(/"/g, '""')}"`;
}

/**
 * Parse one line from a list editor into an M literal fragment.
 * @param {string} line
 */
export function parseListValue(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  if (/^null$/i.test(trimmed)) {
    return "null";
  }

  return escapeMString(trimmed);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parseLinesToValues(text) {
  if (!text || !text.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * @param {string[]} lines
 */
export function formatListLiteral(lines) {
  const values = lines
    .map(parseListValue)
    .filter((value) => value !== null);

  if (values.length === 0) return null;
  return `{ ${values.join(", ")} }`;
}

/**
 * @param {Record<string, string | boolean>} fields
 */
export function formatMetaRecord(fields) {
  const entries = Object.entries(fields).filter(([, value]) => {
    if (typeof value === "boolean") return value;
    return value !== "" && value != null;
  });

  if (entries.length === 0) return null;

  const body = entries
    .map(([key, value]) => {
      if (typeof value === "boolean") {
        return `${key} = ${value}`;
      }
      return `${key} = ${value}`;
    })
    .join(",\n        ");

  return `[\n        ${body}\n    ]`;
}

/**
 * Indent each line of a block.
 * @param {string} text
 * @param {string} indent
 */
export function indentBlock(text, indent) {
  return text
    .split(/\r?\n/)
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
}
