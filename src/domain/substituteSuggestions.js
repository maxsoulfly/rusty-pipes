// Pure, framework-free. General catalogue "when a recipe needs X, Y can
// stand in" suggestions (ingredient_substitutions). `buildSubstituteSuggester`
// below is DISPLAY ONLY - this never feeds computeAvail(), so it can't
// change a recipe's availability state, its makeable count, or Buy Next. It
// only decides which muted "Try: ..." hints to show on a recipe's MISSING
// ingredient rows. (`groupSubstitutionsByFrom` is also reused by
// domain/makeability.js, Stage D.1, to check whether one of the SAME
// candidates is actually owned - that's a separate, clearly-labeled
// `adapted`/`display` result, not a change to this module's own suggester.)
//
// Directional by construction: a hint is offered only when the missing
// ingredient is a row's `from_type_id`, never the reverse. No chaining -
// each row stands alone.

export const SUBSTITUTE_SUGGESTION_LIMIT = 3

/**
 * Groups raw `ingredient_substitutions` rows by their `from_type_id` - the
 * one piece of indexing both this module's suggester and
 * `domain/makeability.js`'s tier-4 "owned general substitute" check need,
 * kept in one place so the two never drift on how a row is keyed.
 * @param {{ from_type_id: string, to_type_id: string, flavor_note: string }[]} [substitutions]
 * @returns {Map<string, { from_type_id: string, to_type_id: string, flavor_note: string }[]>}
 */
export function groupSubstitutionsByFrom(substitutions) {
  const byFrom = new Map()
  for (const s of substitutions ?? []) {
    if (!byFrom.has(s.from_type_id)) byFrom.set(s.from_type_id, [])
    byFrom.get(s.from_type_id).push(s)
  }
  return byFrom
}

/**
 * @param {{ from_type_id: string, to_type_id: string, flavor_note: string }[]} substitutions
 *   the ingredient_substitutions rows (catalog.ingredientSubstitutions)
 * @param {Set<string>} owned - the SAME resolved owned-type-id set computeAvail() uses
 *   (from resolveOwnedIngredientTypes) so "owned first" agrees with the rest of the screen
 * @param {(typeId: string) => string} resolveName - id -> display name
 * @param {number} [limit] - max suggestions per missing ingredient (default 3)
 * @returns {(missingTypeId: string) => { toId: string, toName: string, note: string, owned: boolean }[]}
 *   a lookup returning this ingredient's suggested stand-ins, the ones the
 *   user already owns first, then alphabetical, capped at `limit`.
 */
export function buildSubstituteSuggester(
  substitutions,
  owned,
  resolveName,
  limit = SUBSTITUTE_SUGGESTION_LIMIT,
) {
  const byFrom = groupSubstitutionsByFrom(substitutions)

  return (missingTypeId) => {
    const rows = (byFrom.get(missingTypeId) ?? []).map((s) => ({
      toId: s.to_type_id,
      toName: resolveName(s.to_type_id),
      note: s.flavor_note,
      owned: owned.has(s.to_type_id),
    }))
    rows.sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? -1 : 1
      return a.toName.localeCompare(b.toName)
    })
    return rows.slice(0, limit)
  }
}
