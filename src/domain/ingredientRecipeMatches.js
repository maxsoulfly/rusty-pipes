// Pure, framework-free "which recipes use this ingredient" matching - the
// reverse of domain/availability.js's computeAvail() (which asks "given
// what I own, is this recipe makeable"), this asks "given one ingredient
// type or product, which recipes call for it, directly or as a possible
// substitute." Built for the ingredient/bottle detail page (My Bar ->
// TypeCard tap / ExpandedProducts product row - see current-context.md for
// the staged plan).
//
// Deliberately reuses resolveOwnedIngredientTypes() (domain/availability.js)
// with a SYNTHETIC single-item "owned" set for whatever's being viewed,
// rather than a new hierarchy-walking implementation - the exact same
// ancestor-walk that already decides real ownership satisfaction decides
// "does this ingredient satisfy that recipe component" here too, so the two
// can never disagree about the same rule (owning/viewing a child type
// satisfies an ancestor's requirement; the reverse is never true - viewing
// generic Whiskey does NOT match a recipe that specifically requires
// Bourbon, even though both are "whiskey").
//
// Never touches ownership. Every recipe's `avail` is passed through exactly
// as already computed elsewhere (real inventory, unaffected by what's being
// viewed) - this module only filters/reshapes what's already there, and
// takes no inventory-mutating capability at all, so viewing an ingredient
// can never imply or cause ownership.

import { resolveOwnedIngredientTypes } from "./availability"

// A component matches directly when its own required ingredient (or an
// ancestor it happens to satisfy, e.g. viewing Bourbon against a component
// that just needs generic Whiskey) is what's being viewed. It matches as a
// possible substitution when it's only reachable through the component's
// alternativeIds - a real, distinct case: the component's own primary
// ingredient is what the recipe actually calls for, and what's being
// viewed could stand in for it, not the other way around. Callers should
// phrase this as a possibility ("Can replace <ingName>"), never as an
// active substitution - that's only true once someone's real inventory
// actually lacks the primary and owns the alternative (see computeAvail()'s
// own `substitutions` map for that separate, ownership-aware case).
function matchComponent(component, satisfiedIds) {
  if (satisfiedIds.has(component.ingId)) {
    return {
      ingId: component.ingId,
      ingName: component.name ?? component.ingId,
      role: component.role,
      matchType: "direct",
    }
  }
  const substitutable = (component.alternativeIds ?? []).some((altId) =>
    satisfiedIds.has(altId),
  )
  if (!substitutable) return null
  return {
    ingId: component.ingId,
    ingName: component.name ?? component.ingId,
    role: component.role,
    matchType: "substitution",
  }
}

/**
 * @param {object[]} computed - recipes with their already-computed avail and
 *   `ings` (see domain/availability.js's computeAvail() and
 *   AppShell/services/recipes.js for this shape)
 * @param {{ typeId?: string, productId?: string }} viewing - exactly one of
 *   typeId (an ingredient_types row) or productId (a products row, resolved
 *   to its mapped type the same way real ownership resolution already
 *   does) identifies what's being viewed
 * @param {{ types: { id: string, name: string, parent_type_id: string|null }[],
 *   products: { id: string, ingredient_type_id: string }[] }} catalog
 * @returns {object[]} one entry per matching recipe (deduplicated - a
 *   recipe with several matching components still appears once), each the
 *   original recipe spread with:
 *   - matchType: "direct" | "substitution" - "direct" if ANY matching
 *     component matched directly, even if others only matched as a
 *     possible substitution
 *   - matches: { ingId, ingName, role, matchType }[] - every matching
 *     component on this recipe, in its original order, so a caller that
 *     wants the full picture (not just the strongest match) still can
 */
export function findRecipesUsingIngredient(
  computed,
  viewing,
  { types, products },
) {
  // No `assumedAvailableTypeIds` here, deliberately. This lookup is
  // ownership-blind (viewing != owning) - it answers "which recipes use the
  // one thing I'm looking at", so its "satisfied" set must contain ONLY that
  // thing (and the ancestors it genuinely satisfies). Feeding household
  // basics in would make every recipe that needs Ice show up under every
  // unrelated ingredient's detail page. Keep it omitted.
  const satisfiedIds = resolveOwnedIngredientTypes({
    ownedTypeIds: new Set(viewing.typeId ? [viewing.typeId] : []),
    ownedProductIds: new Set(viewing.productId ? [viewing.productId] : []),
    products,
    ingredientTypes: types,
  })

  const results = []
  computed.forEach((recipe) => {
    const matches = recipe.ings
      .map((component) => matchComponent(component, satisfiedIds))
      .filter(Boolean)
    if (matches.length === 0) return
    const matchType = matches.some((m) => m.matchType === "direct")
      ? "direct"
      : "substitution"
    results.push({ ...recipe, matchType, matches })
  })
  return results
}
