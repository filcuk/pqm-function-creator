/**
 * Shared M source scanning helpers (strings, brackets, top-level commas).
 */

/**
 * @param {string} text
 * @param {number} index
 */
export function skipWhitespace(text, index) {
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

/**
 * @param {string} text
 * @param {number} start
 * @returns {{ value: string, end: number }}
 */
export function parseStringLiteralAt(text, start) {
  if (text[start] !== '"') {
    throw new Error(`Expected string at position ${start}`);
  }

  let i = start + 1;
  let value = "";

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      if (text[i + 1] === '"') {
        value += '"';
        i += 2;
        continue;
      }
      return { value, end: i + 1 };
    }
    value += ch;
    i += 1;
  }

  throw new Error("Unterminated string literal");
}

/**
 * @param {string} text
 * @param {number} start
 */
export function skipStringEnd(text, start) {
  if (text[start] !== '"') return start + 1;

  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '"') {
      if (text[i + 1] === '"') {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }

  return text.length;
}

/**
 * @param {string} text
 * @param {number} start
 * @param {string} open
 * @param {string} close
 */
export function findMatchingDelimiter(text, start, open, close) {
  if (text[start] !== open) {
    throw new Error(`Expected "${open}" at position ${start}`);
  }

  let depth = 0;
  let i = start;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      const parsed = parseStringLiteralAt(text, i);
      i = parsed.end;
      continue;
    }

    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }

    i += 1;
  }

  throw new Error(`Unmatched "${open}" at position ${start}`);
}

/**
 * @param {string} text
 * @param {number} start
 * @param {string} open
 * @param {string} close
 */
export function extractBalanced(text, start, open, close) {
  const end = findMatchingDelimiter(text, start, open, close);
  return {
    content: text.slice(start + 1, end),
    end: end + 1,
    full: text.slice(start, end + 1),
  };
}

/**
 * Split by comma at depth 0 (respecting strings and nesting).
 * @param {string} text
 * @param {(text: string, index: number) => number} [skipString]
 */
export function splitTopLevel(text, skipString = skipStringEnd) {
  /** @type {string[]} */
  const parts = [];
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let current = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      const end = skipString(text, i);
      current += text.slice(i, end);
      i = end;
      continue;
    }

    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === "{") depthBrace += 1;
    else if (ch === "}") depthBrace -= 1;
    else if (ch === "," && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      parts.push(current.trim());
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
