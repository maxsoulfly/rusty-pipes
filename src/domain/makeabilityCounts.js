// Pure, framework-free "how many cocktails can I make with what I have?"
// summary (Stage D.4 - docs/plans/substitutes-and-variations.md -> "Stage
// D"). One shared calculation, imported by Library/Home/Build Your Bar, so
// no screen independently reinterprets makeability or invents its own
// wording - the answer is the same number everywhere.
//
// Reads each recipe's shared `display.tier` (computeMakeability(), Stage
// D.1), falling back to the bare `avail` string for a caller that hasn't
// gone through it (same defensive fallback every other Stage D.1/D.2
// consumer already uses). `strict`/`avail` stay available on each recipe
// for whatever else needs the honest, unadapted state - this module never
// reads them directly, only `display.tier`.

/**
 * @param {{ display?: { tier: string }, avail: string }[]} computed
 * @returns {{ possible: number, ready: number, adapted: number }}
 */
export function summarizeMakeability(computed) {
  let ready = 0
  let adapted = 0
  for (const c of computed) {
    const tier = c.display?.tier ?? c.avail
    if (tier === "perfect" || tier === "good") ready += 1
    else if (tier === "adapted") adapted += 1
  }
  return { possible: ready + adapted, ready, adapted }
}

/**
 * "8 cocktails possible · 5 ready, 3 with substitutions or preparation" -
 * the one approved wording, shared so it can't drift between screens. Drops
 * the breakdown clause entirely when nothing is adapted (every existing
 * recipe, before any substitute/preparation is ever curated) rather than
 * showing a redundant "· N ready, 0 with substitutions or preparation".
 *
 * @param {{ possible: number, ready: number, adapted: number }} counts
 * @returns {string}
 */
export function formatMakeabilityBreakdown({ possible, ready, adapted }) {
  const cocktailWord = possible === 1 ? "cocktail" : "cocktails"
  if (adapted === 0) return `${possible} ${cocktailWord} possible`
  return `${possible} ${cocktailWord} possible · ${ready} ready, ${adapted} with substitutions or preparation`
}
