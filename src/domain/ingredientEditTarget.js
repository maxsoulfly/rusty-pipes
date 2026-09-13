// Ingredient Detail Stage I.4 - pure decision logic for the admin/
// moderator "Edit ingredient" shortcut on IngredientDetailScreen.jsx,
// extracted so it's unit-testable without rendering (this project's
// vitest setup has no jsdom/component testing - see AGENTS.md).

/**
 * Whether to show the "Edit ingredient" shortcut, and which ingredient
 * TYPE it should deep-link to (`/admin?tab=types&type=<id>`, opening the
 * existing `IngredientTypeEditor` inline in Admin -> Ingredient Types -
 * AdminScreen.jsx/TypesTab.jsx). This is a convenience-UI decision only:
 * the real authorization boundary is unchanged and stays server-side
 * (`save_ingredient_type()`'s own RLS/role check) - `isStaff` here only
 * decides whether a member SEES the shortcut, never whether an edit is
 * actually allowed. No new role/permission model.
 *
 * Always resolves to the ingredient TYPE's own id, on both a type page
 * and a product page - a product always maps to exactly one ingredient
 * type (AGENTS.md: "a product must map to an existing ingredient type"),
 * and there is no separate product-level editor in Admin -> Ingredient
 * Types, so the type it maps to is the one valid, existing edit target
 * either way (the caller is expected to have already resolved a product
 * page's `resolvedType` to that mapped type, same as every other section
 * on this screen already does - this function does not re-derive that
 * resolution, only consumes it).
 *
 * Returns null (no shortcut) when the viewer isn't staff, or when there's
 * no resolved type at all (a stale/deleted link) - never fabricates a
 * fallback target in either case.
 *
 * @param {{ isStaff: boolean, resolvedType: { id: string } | null | undefined }} args
 * @returns {string | null} the ingredient type id to deep-link to, or null
 */
export function resolveIngredientEditTarget({ isStaff, resolvedType }) {
  if (!isStaff || !resolvedType) return null
  return resolvedType.id
}

/**
 * The search-box text TypesTab.jsx should pre-fill when it's opened via the
 * deep link above (`?type=<id>`), so the *existing* search/filter mechanism
 * - not a separate "featured row"/scroll-into-view mechanism - naturally
 * narrows the list down to (near enough) just the target type. Superseded
 * a plain mount-time `scrollIntoView()` (see git history) once manual
 * verification showed filtering alone already puts the target at or very
 * near the top; kept as its own pure function, not inlined in TypesTab.jsx,
 * so "what text to seed" is independently testable without mounting
 * anything.
 *
 * Returns "" (the ordinary empty/full-list starting state) when there's no
 * id, or the id doesn't resolve to a real type (stale/deleted link) - never
 * fabricates a name.
 *
 * @param {string | null | undefined} typeId
 * @param {{ id: string, name: string }[]} types
 * @returns {string}
 */
export function resolveDeepLinkedSearchQuery(typeId, types) {
  if (!typeId) return ""
  return types.find((t) => t.id === typeId)?.name ?? ""
}
