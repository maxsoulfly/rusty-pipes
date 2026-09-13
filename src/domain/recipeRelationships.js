// Linked Variations Stage V.1 (docs/plans/linked-variations.md) - pure,
// one-hop resolution over already-fetched `recipe_relationships` rows.
// Deliberately never recursively walks ancestry/descendants for
// member-facing behavior - a variation's own page only ever shows its one
// direct base, and a base's page only ever shows its direct variations,
// however deep the underlying chain actually goes. Cycle PREVENTION itself
// lives in the database (a BEFORE INSERT/UPDATE trigger,
// 20260913120000_recipe_relationships.sql, `unique(recipe_id)` making the
// graph a forest of trees so a proposed new edge only ever needs a single
// linked-list walk to check) - this module only ever reads whatever rows
// already exist, one hop in either direction, and never re-derives or
// re-checks that invariant itself.
//
// Reads no recipe content and touches no availability - `computeAvail()`/
// `computeMakeability()`/`recommendations.js` have no parameter for this
// data and none is added here.

/**
 * @typedef {{ recipeId: string, relatedRecipeId: string, note: string|null }} RecipeRelationshipRow
 */

/**
 * The one relationship row where `recipeId` is the variation (i.e. its
 * base, if any) - `unique(recipe_id)` in the DB guarantees at most one
 * such row ever exists; `.find()` here returns the first match rather than
 * silently allowing multiple, defensively matching that same guarantee
 * even if fed malformed input.
 *
 * @param {string} recipeId
 * @param {RecipeRelationshipRow[]} relationships
 * @returns {{ baseRecipeId: string, note: string|null } | null}
 */
export function resolveBaseRelationship(recipeId, relationships) {
  const row = (relationships ?? []).find((r) => r.recipeId === recipeId)
  if (!row) return null
  return { baseRecipeId: row.relatedRecipeId, note: row.note ?? null }
}

/**
 * Every relationship row where `recipeId` is the BASE - every recipe that
 * directly declares itself a variation of this one. Never walks further:
 * a variation-of-a-variation (one more hop down the chain) is not
 * included, by construction - this only ever filters rows whose
 * `relatedRecipeId` matches `recipeId` exactly, once.
 *
 * @param {string} recipeId
 * @param {RecipeRelationshipRow[]} relationships
 * @returns {{ variationRecipeId: string, note: string|null }[]}
 */
export function resolveDirectVariations(recipeId, relationships) {
  return (relationships ?? [])
    .filter((r) => r.relatedRecipeId === recipeId)
    .map((r) => ({ variationRecipeId: r.recipeId, note: r.note ?? null }))
}

/**
 * Linked Variations Stage V.2 - candidate bases for the recipe editor's
 * "Variation of" picker: every given recipe except the one currently
 * being edited. Self-selection should not even be choosable in the UI,
 * not just rejected by the DB's own check constraint (the same
 * convenience-vs-authority split I.4's admin edit shortcut already
 * established). Deliberately does NOT also exclude this recipe's own
 * direct variations (the most obvious one-hop reverse case, which would
 * also be a cycle) - the plan explicitly keeps client-side filtering to
 * plain self-exclusion and leaves every other cycle case to the DB
 * trigger, rather than re-deriving any part of the cycle check here.
 *
 * @param {{ id: string }[]} recipes
 * @param {string | undefined} excludeRecipeId - undefined for a
 *   not-yet-saved new recipe (nothing to exclude yet)
 * @returns {object[]}
 */
export function resolveVariationCandidates(recipes, excludeRecipeId) {
  return (recipes ?? []).filter((r) => r.id !== excludeRecipeId)
}

/**
 * The screen-ready shape: resolves the one base (if any) and every direct
 * variation for `recipeId`, then looks each target up in `recipesById` -
 * tolerant of a stale/invisible relationship whose target recipe is
 * missing from `recipesById` (deleted, unpublished, or simply not visible
 * to the current viewer - the read RLS policy already excludes rows where
 * either side isn't visible, but this stays defensive regardless of what
 * filtered the input). A missing target is dropped, not surfaced as a
 * broken half-populated entry - a screen can render this result directly
 * with no further null-checking of its own.
 *
 * Stage V.3 - `variations` is sorted by name (locale-aware, deterministic)
 * before returning. The underlying `relationships` array has no
 * guaranteed row order (no `ORDER BY` on the flat fetch, and Postgres
 * itself never promises one without one), so relying on fetch/insertion
 * order would make "Variations" render in a different order from one
 * reload to the next. This is plain alphabetical determinism only - not
 * makeability-aware ranking (that's a V.4 concern, deliberately not built
 * here).
 *
 * @param {string} recipeId
 * @param {RecipeRelationshipRow[]} relationships
 * @param {Map<string, object>} recipesById - e.g. built from `computed`
 * @returns {{
 *   base: { recipe: object, note: string|null } | null,
 *   variations: { recipe: object, note: string|null }[],
 * }}
 */
export function resolveRecipeVariationContext(
  recipeId,
  relationships,
  recipesById,
) {
  const baseRelationship = resolveBaseRelationship(recipeId, relationships)
  const baseRecipe = baseRelationship
    ? (recipesById.get(baseRelationship.baseRecipeId) ?? null)
    : null
  const base = baseRecipe
    ? { recipe: baseRecipe, note: baseRelationship.note }
    : null

  const variations = resolveDirectVariations(recipeId, relationships)
    .map((v) => {
      const recipe = recipesById.get(v.variationRecipeId)
      return recipe ? { recipe, note: v.note } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name))

  return { base, variations }
}
