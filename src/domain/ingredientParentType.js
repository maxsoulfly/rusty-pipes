// Parent Type resolution for the Ingredient Type editor (Admin -> Ingredient
// Types). Two already-existing invariants, made explicit/testable here
// rather than left as inline filter logic: a parent type must belong to the
// same category as the type being edited, and a type can never be its own
// parent.

/**
 * @param {{id: string, category_id: string}[]} types
 * @param {{ excludeTypeId: string, categoryId: string }} opts
 */
export function resolveParentTypeCandidates(types, { excludeTypeId, categoryId }) {
  return types.filter(
    (t) => t.id !== excludeTypeId && t.category_id === categoryId,
  )
}

// When Category changes, a previously-selected parent only survives if it's
// still a real type in the NEW category - a parent type is always scoped to
// exactly one category, so in practice this almost always clears it, but the
// check is written generally (confirm validity, don't just unconditionally
// reset) rather than assuming every category change invalidates the parent.
// "" (no parent type) always passes through unchanged.
/**
 * @param {string} currentParentTypeId
 * @param {{ types: {id: string, category_id: string}[], categoryId: string }} opts
 */
export function resolveParentTypeIdForCategory(
  currentParentTypeId,
  { types, categoryId },
) {
  if (!currentParentTypeId) return ""
  const stillValid = types.some(
    (t) => t.id === currentParentTypeId && t.category_id === categoryId,
  )
  return stillValid ? currentParentTypeId : ""
}
