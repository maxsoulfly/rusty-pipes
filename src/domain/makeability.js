// Pure, framework-free "adapted availability" (Stage D.1 -
// docs/plans/substitutes-and-variations.md -> "Stage D"). Wraps
// computeAvail() rather than replacing it: `strict` below is exactly
// today's computeAvail() output, byte-for-byte, kept for internal
// bookkeeping and for the detail page's honest per-ingredient rows. The
// point of this module is `display` - the ONE field every user-facing
// primary-status surface (card, hero badge, detail badge) should read, so
// a recipe never shows a contradictory pair like "Unavailable" next to
// "Make with substitutions".
//
// D.1 scope only: tier 4 ("owned general substitute") is implemented.
// Tier 5 ("satisfiable preparation") does not exist yet - Stage D.2 adds
// `ingredient_preparations`/`ingredient_preparation_inputs` and will extend
// `computeAdaptedResult` below to also try that route, and
// `composeAdaptedLabel` to produce "Prepare X first" / combined text. Until
// then, `adapted` (when non-null) always resolves purely through owned
// general substitutes and always carries the single "Make with
// substitutions" label.

import { computeAvail } from "./availability"
import { groupSubstitutionsByFrom } from "./substituteSuggestions"

/**
 * @param {ReturnType<typeof computeAvail>} strict
 * @param {Set<string>} owned
 * @param {(id: string) => string} resolveName
 * @param {Map<string, { to_type_id: string, flavor_note: string }[]>} substitutesByFrom
 * @returns {null | {
 *   tier: "perfect" | "good",
 *   label: string,
 *   resolvedRequired: { ingId: string, via: "substitute", matchedId: string, matchedName: string, note: string|null }[],
 * }}
 */
function computeAdaptedResult(strict, owned, resolveName, substitutesByFrom) {
  // Nothing left to adapt - strict already resolved every required
  // component (avail is "perfect" or "good").
  if (strict.missingRequiredIds.length === 0) return null

  const resolvedRequired = []
  for (const ingId of strict.missingRequiredIds) {
    const candidates = substitutesByFrom.get(ingId) ?? []
    // Only an OWNED stand-in counts - a suggestion you don't own never
    // flips makeability (matches Stage B's "Try:" hint, which shows the
    // same candidates regardless of ownership). Directional by
    // construction (substitutesByFrom is keyed by from_type_id only) and
    // never chained - this loop only ever looks at strict's own
    // missingRequiredIds, never at another candidate's own requirements.
    const ownedCandidate = candidates.find((s) => owned.has(s.to_type_id))
    // No tier-5 (preparation) fallback yet - see the module header. A
    // component that tier 4 can't resolve fails the whole adaptation: no
    // partial credit, mirrors strict's own all-or-nothing "good enough" bar.
    if (!ownedCandidate) return null

    resolvedRequired.push({
      ingId,
      via: "substitute",
      matchedId: ownedCandidate.to_type_id,
      matchedName: resolveName(ownedCandidate.to_type_id),
      note: ownedCandidate.flavor_note ?? null,
    })
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

// D.1 only ever produces `via: "substitute"` entries (see the module
// header), so this always returns the same text for now. Written as its
// own function, not inlined, so Stage D.2 can extend it (join in "Prepare
// <name> first" for `via: "preparation"` entries, "·" between the two)
// without touching computeAdaptedResult's own logic.
function composeAdaptedLabel(_resolvedRequired) {
  return "Make with substitutions"
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
) {
  const resolveName = resolveIngredientName ?? ((id) => id)
  const strict = computeAvail(
    cocktail,
    owned,
    resolveName,
    householdBasicIds,
    formConversions,
  )

  // strict.avail is already perfect/good - nothing to adapt, and no reason
  // to spend time matching substitutes for a recipe that's already
  // discoverably makeable.
  const adapted =
    strict.avail === "perfect" || strict.avail === "good"
      ? null
      : computeAdaptedResult(
          strict,
          owned,
          resolveName,
          groupSubstitutionsByFrom(generalSubstitutes),
        )

  const display = adapted
    ? { tier: "adapted", label: adapted.label, isAdapted: true }
    : { tier: strict.avail, label: null, isAdapted: false }

  return { strict, adapted, display }
}
