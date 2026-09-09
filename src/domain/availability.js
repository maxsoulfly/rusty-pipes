// Pure, framework-free availability matching. No React, no Supabase — takes plain
// data in, returns plain data out, so it can be unit tested in isolation and reused
// once recipe/ingredient data comes from Supabase instead of src/data/mockData.js.

/**
 * @param {{ ings: { ingId: string, role: 'required'|'optional'|'garnish', alternativeIds?: string[] }[] }} cocktail
 * @param {Set<string>} owned - satisfied ingredient type ids; build with resolveOwnedIngredientTypes()
 *   so product-mapping and parent/child hierarchy are already accounted for before this runs.
 * @param {(id: string) => string} [resolveIngredientName] - id -> display name; defaults to the id itself
 * @param {Set<string>} [householdBasicIds] - ingredient type ids flagged "assumed available"
 *   (Concept 1). Treated as satisfying their own exact id - never a parent, never a child - so a
 *   caller that forgot to also union these into `owned` still gets correct availability, and the
 *   only components tagged in the returned `householdBasics` map are ones satisfied *because of*
 *   the flag. Passing this never changes the four avail tiers' meaning, only which components count.
 */
export function computeAvail(
  cocktail,
  owned,
  resolveIngredientName,
  householdBasicIds,
) {
  const resolveName = resolveIngredientName ?? ((id) => id)
  const basics = householdBasicIds ?? new Set()
  const isAvailable = (id) => owned.has(id) || basics.has(id)

  // The id that actually satisfies a component: its own ingId, the first
  // owned (or household-basic) substitution alternative, or null if nothing
  // covers it.
  const matchedIdFor = (component) => {
    if (isAvailable(component.ingId)) return component.ingId
    return (
      (component.alternativeIds ?? []).find((id) => isAvailable(id)) ?? null
    )
  }
  const isSatisfied = (component) => matchedIdFor(component) !== null

  const missingRequiredIds = cocktail.ings
    .filter((i) => i.role === "required" && !isSatisfied(i))
    .map((i) => i.ingId)
  const missingRequired = missingRequiredIds.map(resolveName)
  const missingOptionalIds = cocktail.ings
    .filter((i) => i.role !== "required" && !isSatisfied(i))
    .map((i) => i.ingId)
  const missingOptional = missingOptionalIds.map(resolveName)

  let avail
  if (missingRequired.length === 0 && missingOptional.length === 0)
    avail = "perfect"
  else if (missingRequired.length === 0) avail = "good"
  else if (missingRequired.length === 1) avail = "almost"
  else avail = "unavail"

  // Components satisfied via a substitution alternative rather than the
  // primary ingredient itself, keyed by the component's own ingId.
  const substitutions = {}
  cocktail.ings.forEach((component) => {
    const matchedId = matchedIdFor(component)
    if (matchedId && matchedId !== component.ingId) {
      substitutions[component.ingId] = {
        matchedId,
        matchedName: resolveName(matchedId),
      }
    }
  })

  // Components satisfied directly by their own ingId where that ingId is a
  // flagged household basic (Concept 1). Same shape/keying as `substitutions`
  // so the ingredient list can render a "Household basic" note the same way.
  // A component reached only through an explicit alternativeIds entry that
  // happens to be a basic falls into `substitutions` above instead - that's
  // an authored substitution relationship, a different thing from "everyone
  // just has this".
  const householdBasics = {}
  cocktail.ings.forEach((component) => {
    if (
      matchedIdFor(component) === component.ingId &&
      basics.has(component.ingId)
    ) {
      householdBasics[component.ingId] = { name: resolveName(component.ingId) }
    }
  })

  return {
    avail,
    missingRequired,
    missingOptional,
    missingRequiredIds,
    missingOptionalIds,
    substitutions,
    householdBasics,
  }
}

export function mlToOz(ml) {
  const oz = ml / 29.5735
  if (oz < 0.3) return "¼ oz"
  if (Math.abs(oz - 0.5) < 0.1) return "½ oz"
  if (Math.abs(oz - 0.75) < 0.1) return "¾ oz"
  if (Math.abs(oz - 1) < 0.1) return "1 oz"
  if (Math.abs(oz - 1.5) < 0.1) return "1½ oz"
  if (Math.abs(oz - 2) < 0.1) return "2 oz"
  if (Math.abs(oz - 3) < 0.1) return "3 oz"
  return `${oz.toFixed(1)} oz`
}

// Inverse of mlToOz - lets the recipe editor accept an amount typed in oz
// (common for recipes sourced from US-style measurements) while storage
// stays canonically ml, per the spec's "store liquid quantities in
// millilitres" rule. Rounded to the nearest whole ml, matching how amounts
// are entered/displayed everywhere else in the app.
export function ozToMl(oz) {
  return Math.round(oz * 29.5735)
}

/**
 * @param {{ amount: number, unitLabel: string }} recipeIng
 * @param {'ml'|'oz'} unit
 */
export function formatAmount(recipeIng, unit) {
  if (recipeIng.amount === 0) return recipeIng.unitLabel
  if (unit === "oz") return mlToOz(recipeIng.amount)
  return `${recipeIng.amount}${recipeIng.unitLabel}`
}

/**
 * Expands raw ownership into the full set of ingredient type ids a user's
 * bar satisfies, per the spec's component-satisfaction rules (§10.1):
 * owning a product satisfies its mapped generic type, and owning a more
 * specific child type satisfies any of its ancestor types ("a compatible
 * explicit child type"). Do this expansion once, up front, so computeAvail()
 * itself can stay a plain Set membership check.
 *
 * @param {{
 *   ownedTypeIds: Set<string>,
 *   ownedProductIds: Set<string>,
 *   products: { id: string, ingredient_type_id: string }[],
 *   ingredientTypes: { id: string, parent_type_id: string|null }[],
 *   assumedAvailableTypeIds?: Set<string>,
 * }} args
 * @returns {Set<string>}
 */
export function resolveOwnedIngredientTypes({
  ownedTypeIds,
  ownedProductIds,
  products,
  ingredientTypes,
  assumedAvailableTypeIds,
}) {
  const typesById = new Map(ingredientTypes.map((t) => [t.id, t]))

  const direct = new Set(ownedTypeIds)
  products.forEach((p) => {
    if (ownedProductIds.has(p.id)) direct.add(p.ingredient_type_id)
  })

  const expanded = new Set(direct)
  direct.forEach((id) => {
    let current = typesById.get(id)
    while (current?.parent_type_id) {
      expanded.add(current.parent_type_id)
      current = typesById.get(current.parent_type_id)
    }
  })

  // Household basics (Concept 1): flagged type ids are unioned in AFTER the
  // ancestor walk and are never themselves walked - so a flagged type
  // satisfies only its own exact id, never a parent (not walked from here),
  // never a child (children were never added). Kept a separate argument
  // rather than folded into ownedTypeIds so callers that must stay
  // ownership-only - findRecipesUsingIngredient's synthetic "what am I
  // viewing" set - simply omit it and are structurally unaffected.
  if (assumedAvailableTypeIds) {
    assumedAvailableTypeIds.forEach((id) => expanded.add(id))
  }

  return expanded
}
