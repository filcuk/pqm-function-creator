/** Suffix appended to the function name for the implementation binding. */
export const IMPL_NAME_SUFFIX = "Impl";

/**
 * @param {string} functionName
 */
export function resolveFunctionNames(functionName) {
  const sharedName = functionName.trim();
  const implName = `${sharedName}${IMPL_NAME_SUFFIX}`;
  return {
    sharedName,
    implName,
    typeName: `${implName}Type`,
  };
}

/**
 * Derive the user-facing function name from parsed implementation and shared names.
 * @param {string} implName
 * @param {string} sharedName
 */
export function functionNameFromParts(implName, sharedName) {
  const shared = sharedName.trim();
  const impl = implName.trim();

  if (shared) {
    if (!impl || impl === `${shared}${IMPL_NAME_SUFFIX}`) return shared;
    return shared;
  }

  if (impl.endsWith(IMPL_NAME_SUFFIX)) {
    return impl.slice(0, -IMPL_NAME_SUFFIX.length);
  }

  return impl;
}
