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
