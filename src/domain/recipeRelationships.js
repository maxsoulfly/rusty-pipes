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
//
// Stage V.4 additions (makeability-aware PRESENTATION only, still zero
// effect on either recipe's own makeability): variations are ordered by
// the same shared `DISPLAY_TIER_ORDER` (src/domain/availabilityGroups.js)
// every other "grouped by makeability" view in this app already uses -
// not a new ranking system - with a deterministic alphabetical tie-break
// inside a tier (unchanged from V.3). `shouldShowMakeableVariationFraming()`
// answers the one boolean the "can't make the original? you can make this
// variation" copy needs, reusing `isPossibleTier()`
// (src/domain/makeabilityCounts.js, the same "perfect/good/adapted count,
// almost/unavail don't" rule `summarizeMakeability()` already uses) rather
// than re-deriving a second definition of "makeable" here.

import { DISPLAY_TIER_ORDER } from "./availabilityGroups"
import { isPossibleTier } from "./makeabilityCounts"

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
 * before returning, since the underlying `relationships` array has no
 * guaranteed row order (no `ORDER BY` on the flat fetch, and Postgres
 * itself never promises one without one).
 *
 * Stage V.4 - the sort is now makeability-tier-aware first (reusing the
 * shared `DISPLAY_TIER_ORDER` - perfect > good > adapted > almost >
 * unavail, exactly matching every other "grouped by makeability" view in
 * this app), with V.3's alphabetical order as the tie-break inside a tier.
 * Each `recipe` here is a full entry from the caller's `computed` array
 * (via `recipesById`), so its own `display.tier` is already present - no
 * new computation, just reading a field that's already there.
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
    .sort((a, b) => {
      const tierDiff =
        tierRank(a.recipe.display?.tier ?? a.recipe.avail) -
        tierRank(b.recipe.display?.tier ?? b.recipe.avail)
      if (tierDiff !== 0) return tierDiff
      return a.recipe.name.localeCompare(b.recipe.name)
    })

  return { base, variations }
}

// Unknown/missing tiers sort last, after every real DISPLAY_TIER_ORDER
// entry - defensive only; every recipe in `computed` is expected to carry
// a real `display.tier` (computeMakeability() sets it for every recipe),
// so this path is not expected to be hit in practice.
function tierRank(tier) {
  const i = DISPLAY_TIER_ORDER.indexOf(tier)
  return i === -1 ? DISPLAY_TIER_ORDER.length : i
}

/**
 * Stage V.4 - the one boolean the "can't make the original? you can make
 * this variation" framing needs, belonging on the BASE -> variations side
 * only (per the plan: a variation's own page never editorializes about its
 * base's makeability). True only when the current recipe's own tier is
 * NOT already possible (see `isPossibleTier()`) and at least one of its
 * direct variations IS possible - never shown when the base is already
 * makeable, and never shown when no variation is makeable either. Reads
 * only `display.tier` fields already present on `recipe`/each variation's
 * `recipe` - no new computation, and this changes nothing about either
 * recipe's own makeability, only whether this one line of copy renders.
 *
 * @param {{ display?: { tier: string }, avail?: string } | null | undefined} recipe
 *   - the currently-viewed recipe (the potential "base" side)
 * @param {{ recipe: { display?: { tier: string }, avail?: string } }[]} variations
 *   - this recipe's own resolved direct variations (already sorted, if
 *   produced by `resolveRecipeVariationContext()` above)
 * @returns {boolean}
 */
export function shouldShowMakeableVariationFraming(recipe, variations) {
  if (!recipe) return false
  const tier = (r) => r.display?.tier ?? r.avail
  if (isPossibleTier(tier(recipe))) return false
  return (variations ?? []).some((v) => isPossibleTier(tier(v.recipe)))
}

/**
 * Stage V.5 clarity polish (manual-testing finding, final pass) - the
 * heading above a variation's "how it differs" note. Even after the note
 * moved off the base card and into its own labeled block (the earlier
 * V.5 bugfix), a generic "How this version differs" heading was still
 * easy to misread as being about the BASE card shown directly above it,
 * rather than about the CURRENT recipe (the variation whose page this
 * is) - the note always describes the variation relative to its base, so
 * naming the variation explicitly in the heading removes the ambiguity.
 * Extracted as its own pure function (rather than an inline template
 * string in `VariationsSection.jsx`) purely so this exact contract - the
 * heading names the CURRENT recipe, never the base - is unit-testable
 * without a component-rendering harness (this project has none - no
 * jsdom/testing-library, the same established limit every other
 * component-adjacent decision in this feature has worked around the same
 * way). Deliberately does not touch, truncate, or otherwise transform
 * `currentRecipeName` - an exceptionally long name is expected to wrap
 * naturally in the caller's own markup (ordinary page content, unlike the
 * sticky editor header), not be shortened here.
 *
 * @param {string} currentRecipeName - the variation's own display name
 *   (e.g. `c.name` in DetailScreen.jsx) - never the base's name.
 * @returns {string}
 */
export function formatVariationDifferenceHeading(currentRecipeName) {
  return `How ${currentRecipeName} differs`
}
