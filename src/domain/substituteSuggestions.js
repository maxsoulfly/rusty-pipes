// Pure, framework-free. General catalogue "when a recipe needs X, Y can
// stand in" suggestions (ingredient_substitutions). DISPLAY ONLY - this
// never feeds computeAvail(), so it can't change a recipe's availability
// state, its makeable count, or Buy Next. It only decides which muted
// "Try: ..." hints to show on a recipe's MISSING ingredient rows.
//
// Directional by construction: a hint is offered only when the missing
// ingredient is a row's `from_type_id`, never the reverse. No chaining -
// each row stands alone.

export const SUBSTITUTE_SUGGESTION_LIMIT = 3

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
  const byFrom = new Map()
  for (const s of substitutions ?? []) {
    if (!byFrom.has(s.from_type_id)) byFrom.set(s.from_type_id, [])
    byFrom.get(s.from_type_id).push(s)
  }

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
