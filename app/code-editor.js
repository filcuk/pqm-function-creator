/**
 * Code blocks with line numbers. Editable fields are plain textareas;
 * readonly output uses Prism syntax highlighting.
 * Requires global Prism + powerquery component (loaded from index.html).
 */

import { escapeHtml } from "./m/escape.js";

const DEFAULT_LANGUAGE = "powerquery";

/**
 * @returns {boolean}
 */
export function isPrismReady() {
  return (
    typeof window.Prism !== "undefined" &&
    Boolean(window.Prism.languages?.[DEFAULT_LANGUAGE])
  );
}

/**
 * @param {string} code
 * @param {string} [language]
 */
export function highlightCode(code, language = DEFAULT_LANGUAGE) {
  if (!code) return "";

  const normalized = code.endsWith("\n") ? code : `${code}\n`;

  if (language === "plain") {
    return escapeHtml(normalized);
  }

  if (!isPrismReady()) return escapeHtml(normalized);

  const grammar = Prism.languages[language] || Prism.languages[DEFAULT_LANGUAGE];
  return Prism.highlight(normalized, grammar, language);
}

/**
 * @param {string} code
 */
export function highlightM(code) {
  return highlightCode(code, DEFAULT_LANGUAGE);
}

/**
 * @param {string} text
 */
function countLines(text) {
  if (!text) return 1;
  return text.split("\n").length;
}

/**
 * @param {Element} wrapper
 * @param {string} text
 */
function updateLineNumbers(wrapper, text) {
  const gutter = wrapper.querySelector(".code-editor-gutter");
  if (!gutter) return;

  const lineCount = countLines(text);
  gutter.innerHTML = Array.from({ length: lineCount }, (_, index) => {
    return `<span class="code-editor-ln">${index + 1}</span>`;
  }).join("");
}

/**
 * @param {Element} wrapper
 */
function ensureCodeEditorLayout(wrapper) {
  if (wrapper.querySelector(".code-editor-body")) return;

  const gutter = document.createElement("div");
  gutter.className = "code-editor-gutter";
  gutter.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "code-editor-body";

  while (wrapper.firstChild) {
    body.appendChild(wrapper.firstChild);
  }

  wrapper.append(gutter, body);
}

/**
 * @param {Element} wrapper
 * @param {Element} scrollSource
 */
function bindGutterScroll(wrapper, scrollSource) {
  const gutter = wrapper.querySelector(".code-editor-gutter");
  if (!gutter || scrollSource.dataset.gutterScrollBound === "true") return;

  scrollSource.dataset.gutterScrollBound = "true";
  scrollSource.addEventListener("scroll", () => {
    gutter.scrollTop = scrollSource.scrollTop;
  });
}

/**
 * @param {HTMLTextAreaElement} textarea
 */
export function refreshCodeEditor(textarea) {
  if (!textarea) return;
  if (textarea.dataset.codeEditorInit !== "true") {
    initCodeEditor(textarea);
    return;
  }

  const wrapper = textarea.closest(".code-editor");
  if (wrapper) updateLineNumbers(wrapper, textarea.value);
}

/**
 * Plain monospace textarea with a line-number gutter.
 * @param {HTMLTextAreaElement} textarea
 */
export function initCodeEditor(textarea) {
  if (!textarea || textarea.dataset.codeEditorInit === "true") {
    refreshCodeEditor(textarea);
    return null;
  }

  textarea.dataset.codeEditorInit = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "code-editor code-editor-editable";
  const rows = textarea.getAttribute("rows");
  if (rows) wrapper.style.setProperty("--code-rows", rows);

  textarea.classList.add("code-editor-input");
  textarea.parentNode?.insertBefore(wrapper, textarea);
  wrapper.append(textarea);
  ensureCodeEditorLayout(wrapper);

  const syncScroll = () => {
    const gutter = wrapper.querySelector(".code-editor-gutter");
    if (gutter) gutter.scrollTop = textarea.scrollTop;
  };

  const refresh = () => updateLineNumbers(wrapper, textarea.value);

  textarea.addEventListener("input", refresh);
  textarea.addEventListener("scroll", syncScroll);
  bindGutterScroll(wrapper, textarea);
  refresh();

  return { update: refresh, wrapper };
}

/**
 * @param {ParentNode} [root]
 */
export function initCodeEditors(root = document) {
  root.querySelectorAll("textarea.code-input").forEach((textarea) => {
    initCodeEditor(/** @type {HTMLTextAreaElement} */ (textarea));
  });
}

/**
 * @param {Element} container
 * @param {string} text
 */
export function setCodeBlock(container, text) {
  ensureCodeEditorLayout(container);

  const code = container.querySelector("code");
  if (!code) return;

  if (text) {
    code.innerHTML = highlightM(text);
    container.classList.remove("is-empty");
  } else {
    code.textContent = "";
    code.innerHTML = "";
    container.classList.add("is-empty");
  }

  updateLineNumbers(container, text);

  const scrollSource = container.querySelector(".code-editor-body");
  if (scrollSource) bindGutterScroll(container, scrollSource);
}

/**
 * @param {Element} container
 */
export function getCodeBlockText(container) {
  return container.querySelector("code")?.textContent || "";
}

/**
 * @param {Element} container
 */
export function initCodeBlock(container) {
  ensureCodeEditorLayout(container);

  const scrollSource = container.querySelector(".code-editor-body");
  if (scrollSource) bindGutterScroll(container, scrollSource);

  const text = getCodeBlockText(container);
  setCodeBlock(container, text);
}
