import { IMPL_NAME_SUFFIX } from "./m/names.js";
import { normalizeLoadedState } from "./m/types.js";

export const STORAGE_KEY = "pqm-function-creator-draft";
export const DRAFT_VERSION = 1;

/**
 * @param {import("./m/types.js").FunctionCreatorState} state
 */
export function saveDraft(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: DRAFT_VERSION, state }));
  } catch {
    /* quota or private mode */
  }
}

/**
 * @param {unknown} parsed
 */
export function draftPayloadToState(parsed) {
  const envelope =
    parsed &&
    typeof parsed === "object" &&
    "state" in parsed &&
    /** @type {{ v?: unknown }} */ (parsed).v != null
      ? /** @type {{ state: unknown }} */ (parsed).state
      : parsed;

  const merged = normalizeLoadedState(envelope);

  if (
    typeof envelope === "object" &&
    envelope &&
    !/** @type {Record<string, unknown>} */ (envelope).functionName &&
    (/** @type {Record<string, unknown>} */ (envelope).sharedName ||
      /** @type {Record<string, unknown>} */ (envelope).implName)
  ) {
    const legacy = /** @type {Record<string, unknown>} */ (envelope);
    merged.functionName =
      (typeof legacy.sharedName === "string" ? legacy.sharedName : "") ||
      (typeof legacy.implName === "string" && legacy.implName.endsWith(IMPL_NAME_SUFFIX)
        ? legacy.implName.slice(0, -IMPL_NAME_SUFFIX.length)
        : typeof legacy.implName === "string"
          ? legacy.implName
          : "") ||
      "MyFunc";
  }

  return merged;
}

/**
 * @returns {import("./m/types.js").FunctionCreatorState | null}
 */
export function loadDraftState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    return draftPayloadToState(JSON.parse(raw));
  } catch {
    return null;
  }
}
