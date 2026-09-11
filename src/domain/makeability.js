// Pure, framework-free "adapted availability" (Stage D - see
// docs/plans/substitutes-and-variations.md -> "Stage D"). Wraps
// computeAvail() rather than replacing it: `strict` below is exactly
// today's computeAvail() output, byte-for-byte, kept for internal
// bookkeeping and for the detail page's honest per-ingredient rows. The
// point of this module is `display` - the ONE field every user-facing
// primary-status surface (card, hero badge, detail badge) should read, so
// a recipe never shows a contradictory pair like "Unavailable" next to
// "Make with substitutions".
//
// Stage D.1 shipped tier 4 ("owned general substitute"). Stage D.3 adds
// tier 5 ("satisfiable preparation" - ingredient_preparations /
// ingredient_preparation_inputs): a still-missing required component can
// also resolve when a configured preparation exists for it AND every one
// of that preparation's OWN inputs independently passes tiers 1-2 (exact
// availability / Can-provide) - never tier 3 (that's a recipe-component
// concept, meaningless for a preparation's own raw inputs), and never
// tiers 4-5 again (no chaining - a preparation's inputs can never
// themselves be another substitute or another preparation; the depth-1 DB
// guard, 20260911120000, enforces the same rule at the data layer). This is
// the exact mechanism behind "Sugar alone must not imply owned Simple
// Syrup": both White Sugar AND Water must independently satisfy tiers 1-2 -
// one input alone is not the whole preparation.

import { computeAvail } from "./availability"
import { groupSubstitutionsByFrom } from "./substituteSuggestions"

/**
 * True only when every one of a preparation's inputs is available through
 * tiers 1-2 (exact/household-basic, then Can-provide form conversion) -
 * reuses computeAvail() itself (asking it about a synthetic one-component
 * "recipe" with no recipe-scoped alternatives) rather than re-implementing
 * that resolution, so this never drifts from the real engine. Never
 * consults tier 3 (recipe-scoped substitution - not applicable outside an
 * actual recipe component) or tiers 4-5 (general substitutes / another
 * preparation) - a preparation's own inputs are never chained.
 *
 * @param {{ ingredientTypeId: string }[]} inputs
 * @param {Set<string>} owned
 * @param {Set<string>} [householdBasicIds]
 * @param {{ rawTypeId: string, preparedTypeId: string, guidance: string }[]} [formConversions]
 * @returns {boolean}
 */
export function isPreparationSatisfiable(
  inputs,
  owned,
  householdBasicIds,
  formConversions,
) {
  return (inputs ?? []).every(({ ingredientTypeId }) => {
    const result = computeAvail(
      { ings: [{ ingId: ingredientTypeId, role: "required" }] },
      owned,
      undefined,
      householdBasicIds,
      formConversions,
    )
    return result.missingRequiredIds.length === 0
  })
}

// Joins preparation/component names into readable prose: "X", "X and Y", or
// "X, Y, and Z". No truncation - v1 preparations are expected to be rare
// enough per recipe that a "+N more" affordance isn't warranted yet.
function joinWithAnd(names) {
  if (names.length <= 1) return names[0] ?? ""
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

/**
 * @param {ReturnType<typeof computeAvail>} strict
 * @param {Set<string>} owned
 * @param {(id: string) => string} resolveName
 * @param {Map<string, { to_type_id: string, flavor_note: string }[]>} substitutesByFrom
 * @param {Map<string, { id: string, name: string, inputs: { ingredientTypeId: string }[] }>} preparationsByProducedType
 * @param {Set<string>} [householdBasicIds]
 * @param {{ rawTypeId: string, preparedTypeId: string, guidance: string }[]} [formConversions]
 * @param {Map<string, Set<string>>} [excludedByIngId] - Stage D.4 per-component
 *   exclusion (`recipe_components.excluded_substitute_type_ids`): a
 *   component's own excluded `to_type_id`s, skipped at tier 4 only - never
 *   affects tier 5 (preparations) or tier 3 (adopted alternatives).
 * @returns {null | {
 *   tier: "perfect" | "good",
 *   label: string,
 *   resolvedRequired: (
 *     { ingId: string, via: "substitute", matchedId: string, matchedName: string, note: string|null } |
 *     { ingId: string, via: "preparation", preparationId: string, producedTypeId: string, producedName: string, instructions: string[], inputs: { ingredientTypeId: string, name: string, amount: number, unitLabel: string }[] }
 *   )[],
 * }}
 */
function computeAdaptedResult(
  strict,
  owned,
  resolveName,
  substitutesByFrom,
  preparationsByProducedType,
  householdBasicIds,
  formConversions,
  excludedByIngId,
) {
  // Nothing left to adapt - strict already resolved every required
  // component (avail is "perfect" or "good").
  if (strict.missingRequiredIds.length === 0) return null

  const resolvedRequired = []
  for (const ingId of strict.missingRequiredIds) {
    // Tier 4 first (matches the plan's precedence order) - an owned general
    // substitute. Directional by construction (substitutesByFrom is keyed
    // by from_type_id only) and never chained - this loop only ever looks
    // at strict's own missingRequiredIds, never at a candidate's own
    // requirements. A candidate this component has explicitly excluded
    // (Stage D.4) is skipped here only - every other configured substitute
    // for the same ingredient, and tier 5, are unaffected.
    const excluded = excludedByIngId?.get(ingId)
    const candidates = substitutesByFrom.get(ingId) ?? []
    const ownedCandidate = candidates.find(
      (s) => owned.has(s.to_type_id) && !excluded?.has(s.to_type_id),
    )
    if (ownedCandidate) {
      resolvedRequired.push({
        ingId,
        via: "substitute",
        matchedId: ownedCandidate.to_type_id,
        matchedName: resolveName(ownedCandidate.to_type_id),
        note: ownedCandidate.flavor_note ?? null,
      })
      continue
    }

    // Tier 5 - a configured preparation whose own inputs are all
    // independently satisfiable (never chained into tiers 4-5 again).
    const prep = preparationsByProducedType.get(ingId)
    if (
      prep &&
      isPreparationSatisfiable(
        prep.inputs,
        owned,
        householdBasicIds,
        formConversions,
      )
    ) {
      resolvedRequired.push({
        ingId,
        via: "preparation",
        preparationId: prep.id,
        producedTypeId: ingId,
        producedName: resolveName(ingId),
        // Carried through fully resolved (like a substitute's matchedName/
        // note) so the detail page can explain and link to the preparation
        // without a second lookup - "show what needs to be prepared and
        // enough instruction to actually do it," per the acceptance
        // scenario, without exposing raw ids to the UI layer.
        instructions: prep.instructions ?? [],
        inputs: (prep.inputs ?? []).map((input) => ({
          ingredientTypeId: input.ingredientTypeId,
          name: resolveName(input.ingredientTypeId),
          amount: input.amount,
          unitLabel: input.unitLabel,
        })),
      })
      continue
    }

    // Neither tier resolved this component - no partial credit, the whole
    // adaptation fails (mirrors strict's own all-or-nothing "good enough").
    return null
  }

  return {
    // Mirrors strict's own perfect/good distinction for the required set:
    // every required component now resolves, so this is "perfect" unless
    // there's still a missing optional/garnish (then "good" - adaptation is
    // scoped to required components only in v1, per the plan doc).
    tier: strict.missingOptionalIds.length === 0 ? "perfect" : "good",
    label: composeAdaptedLabel(resolvedRequired),
    resolvedRequired,
  }
}

// One badge, composed text - not four. Substitute-only -> "Make with
// substitutions". Preparation-only -> "Prepare <name(s)> first". Both ->
// joined with " · ", exactly the acceptance scenario's "Make with
// substitutions · Prepare syrup first".
function composeAdaptedLabel(resolvedRequired) {
  const hasSubstitute = resolvedRequired.some((r) => r.via === "substitute")
  const preparationNames = resolvedRequired
    .filter((r) => r.via === "preparation")
    .map((r) => r.producedName)

  const parts = []
  if (hasSubstitute) parts.push("Make with substitutions")
  if (preparationNames.length > 0)
    parts.push(`Prepare ${joinWithAnd(preparationNames)} first`)
  return parts.join(" · ")
}

/**
 * The one shared makeability result every display surface should read.
 *
 * @param {Parameters<typeof computeAvail>[0]} cocktail
 * @param {Set<string>} owned
 * @param {(id: string) => string} [resolveIngredientName]
 * @param {Set<string>} [householdBasicIds]
 * @param {{ rawTypeId: string, preparedTypeId: string, guidance: string }[]} [formConversions]
 * @param {{ from_type_id: string, to_type_id: string, flavor_note: string }[]} [generalSubstitutes] -
 *   raw `ingredient_substitutions` rows (catalog.ingredientSubstitutions) -
 *   grouped internally, same "raw array in, per-recipe call" shape
 *   computeAvail() already uses for `formConversions`.
 * @param {Map<string, { id: string, name: string, instructions: string[], inputs: { ingredientTypeId: string, amount: number, unitLabel: string }[] }>} [preparationsByProducedType] -
 *   pre-joined (App.jsx builds this once via useMemo from the two
 *   preparation tables - unlike `generalSubstitutes`, joining two tables
 *   per-recipe-per-render would be wasteful, so this one arrives already
 *   grouped rather than as a raw array).
 * @returns {{
 *   strict: ReturnType<typeof computeAvail>,
 *   adapted: ReturnType<typeof computeAdaptedResult>,
 *   display: { tier: "perfect"|"good"|"almost"|"unavail"|"adapted", label: string|null, isAdapted: boolean },
 * }}
 */
export function computeMakeability(
  cocktail,
  owned,
  resolveIngredientName,
  householdBasicIds,
  formConversions,
  generalSubstitutes,
  preparationsByProducedType,
) {
  const resolveName = resolveIngredientName ?? ((id) => id)
  const strict = computeAvail(
    cocktail,
    owned,
    resolveName,
    householdBasicIds,
    formConversions,
  )

  // Stage D.4 - each component may carry its own excluded_substitute_type_ids
  // (mapRecipe() puts this on `component.excludedSubstituteTypeIds`). Built
  // once here, keyed by the component's own ingId, and only for components
  // that actually have an exclusion - a component with none is simply
  // absent from the map, so `excludedByIngId.get(ingId)` is undefined and
  // the `?.has(...)` check in computeAdaptedResult short-circuits to "not
  // excluded," identical to today's behavior for every existing recipe.
  const excludedByIngId = new Map(
    (cocktail.ings ?? [])
      .filter((c) => (c.excludedSubstituteTypeIds ?? []).length > 0)
      .map((c) => [c.ingId, new Set(c.excludedSubstituteTypeIds)]),
  )

  // strict.avail is already perfect/good - nothing to adapt, and no reason
  // to spend time matching substitutes/preparations for a recipe that's
  // already discoverably makeable.
  const adapted =
    strict.avail === "perfect" || strict.avail === "good"
      ? null
      : computeAdaptedResult(
          strict,
          owned,
          resolveName,
          groupSubstitutionsByFrom(generalSubstitutes),
          preparationsByProducedType ?? new Map(),
          householdBasicIds,
          formConversions,
          excludedByIngId,
        )

  const display = adapted
    ? { tier: "adapted", label: adapted.label, isAdapted: true }
    : { tier: strict.avail, label: null, isAdapted: false }

  return { strict, adapted, display }
}
