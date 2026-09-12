// Shared ordering for a "grouped by makeability" view (Library's grouped
// view; Home's stacked sections follow the same order by construction,
// though Home renders each section directly rather than importing this).
// Stage D.2 (docs/plans/substitutes-and-variations.md -> "Stage D") - one
// ordered list so a screen never independently re-interprets `avail`:
// cocktails needing no adaptation rank first (Perfect, Good Enough), then
// ones resolvable via a configured, owned substitute (Adapted - "Make With
// Substitutions"), then genuinely Almost/Unavailable ones. Reads a
// recipe's `display.tier` (computeMakeability(), Stage D.1), falling back
// to the raw `avail` string for a caller that hasn't gone through it.

export const DISPLAY_TIER_ORDER = [
  "perfect",
  "good",
  "adapted",
  "almost",
  "unavail",
]

/**
 * @param {{ display?: { tier: string }, avail: string }[]} computed
 * @returns {{ tier: string, items: object[] }[]} - non-empty tiers only, in
 *   DISPLAY_TIER_ORDER (Perfect > Good Enough > Adapted > Almost > Unavailable)
 */
export function groupByDisplayTier(computed) {
  const byTier = Object.fromEntries(DISPLAY_TIER_ORDER.map((t) => [t, []]))
  computed.forEach((c) => {
    const tier = c.display?.tier ?? c.avail
    byTier[tier]?.push(c)
  })
  return DISPLAY_TIER_ORDER.map((tier) => ({
    tier,
    items: byTier[tier],
  })).filter((g) => g.items.length > 0)
}

// Caps an already-tiered group list (groupByDisplayTier's own output shape)
// to at most `max` items total, filling from the highest-ranked tier down
// (DISPLAY_TIER_ORDER's own order, since that's the order `groups` already
// arrives in) - never truncates a Perfect match to make room for an
// Unavailable one just because the latter happened to be enumerated first.
// Added for IngredientDetailScreen's "up to 10 matching recipes" cap
// (Ingredient Detail Stage I.1) - previously a local, avail-keyed version of
// this same cap lived on that screen; this is the shared, tier-aware
// replacement so the cap composes correctly with `groupByDisplayTier` above
// instead of each caller re-deriving it.
/**
 * @param {{ tier: string, items: object[] }[]} groups
 * @param {number} max
 * @returns {{ tier: string, items: object[] }[]} - non-empty tiers only
 */
export function capGroupsByTotal(groups, max) {
  let remaining = max
  return groups
    .map(({ tier, items }) => {
      const sliced = items.slice(0, Math.max(remaining, 0))
      remaining -= sliced.length
      return { tier, items: sliced }
    })
    .filter((g) => g.items.length > 0)
}
