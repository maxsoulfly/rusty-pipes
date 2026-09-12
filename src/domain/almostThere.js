// Ranks Home's "Almost There" and "Make With Adaptations" (Stage D.2,
// renamed from "Make With Substitutions" 2026-09-12 - see
// docs/plans/substitutes-and-variations.md's finalization note) lists.
// Both buckets are read off the shared `display.tier` (Stage D.1,
// domain/makeability.js), not raw `avail` - a recipe resolvable via a
// configured, owned general substitute has `display.tier === "adapted"`
// and belongs in the second list, never the first, even though its
// underlying `strict.avail` may still be exactly "almost" (see
// makeability.js: adaptation is only attempted on a component `strict`
// already left missing, so an adapted recipe's own strict tier is
// unaffected and can be "almost" or "unavail" underneath).
//
// "Almost There" (`avail === "almost"`, see availability.js) is only ever
// set at exactly one missing required ingredient - every candidate left in
// that bucket after excluding adapted ones is still tied on "how close" by
// that same definition, so real cross-user popularity (favoriteCount +
// wantToMakeCount, a denormalized counter - see
// 20260826110000_recipe_popularity_counters.sql) is the only signal that
// actually differentiates them. "Make With Adaptations" has no such
// single shared "closeness" number (an adapted recipe can have resolved
// any number of components), so it uses the same popularity tie-break for
// consistency rather than inventing a second ranking rule.
//
// Both return the full ranked list, not pre-sliced - the caller
// (HomeScreen) owns how many to show and any "load more" reveal.

function sortByPopularityThenName(items) {
  return items.slice().sort((a, b) => {
    const popularityA = (a.favoriteCount ?? 0) + (a.wantToMakeCount ?? 0)
    const popularityB = (b.favoriteCount ?? 0) + (b.wantToMakeCount ?? 0)
    if (popularityA !== popularityB) return popularityB - popularityA
    return a.name.localeCompare(b.name) // deterministic tiebreak
  })
}

/**
 * @param {{ id: string, name: string, avail: string, display?: { tier: string }, favoriteCount?: number, wantToMakeCount?: number }[]} computed
 * @returns {object[]}
 */
export function rankAlmostThere(computed) {
  return sortByPopularityThenName(
    computed.filter((c) => (c.display?.tier ?? c.avail) === "almost"),
  )
}

/**
 * @param {{ id: string, name: string, avail: string, display?: { tier: string }, favoriteCount?: number, wantToMakeCount?: number }[]} computed
 * @returns {object[]}
 */
export function rankAdapted(computed) {
  return sortByPopularityThenName(
    computed.filter((c) => (c.display?.tier ?? c.avail) === "adapted"),
  )
}
