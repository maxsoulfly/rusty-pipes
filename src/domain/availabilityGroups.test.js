import { describe, expect, it } from "vitest"
import {
  capGroupsByTotal,
  DISPLAY_TIER_ORDER,
  groupByDisplayTier,
} from "./availabilityGroups"

function recipe(id, tier, avail) {
  // A caller that's gone through computeMakeability() always has `display`
  // - `avail` alone is only ever a fallback for one that hasn't.
  return { id, name: id, avail: avail ?? tier, display: { tier } }
}

describe("DISPLAY_TIER_ORDER", () => {
  it("orders cocktails needing no adaptation ahead of adapted ones, and adapted ones ahead of Almost There/Unavailable", () => {
    expect(DISPLAY_TIER_ORDER).toEqual([
      "perfect",
      "good",
      "adapted",
      "almost",
      "unavail",
    ])
  })
})

describe("groupByDisplayTier", () => {
  it("groups by display.tier, not raw avail", () => {
    const computed = [
      // strict avail is "almost" (one component genuinely missing at the
      // strict level), but resolved via a configured, owned general
      // substitute - display.tier is "adapted", so it must NOT land in the
      // "almost" group even though its own `avail` field still says so.
      recipe("daiquiri", "adapted", "almost"),
      recipe("martini", "perfect"),
      recipe("negroni", "almost"),
    ]
    const groups = groupByDisplayTier(computed)
    const byTier = Object.fromEntries(
      groups.map((g) => [g.tier, g.items.map((i) => i.id)]),
    )
    expect(byTier.adapted).toEqual(["daiquiri"])
    expect(byTier.almost).toEqual(["negroni"])
    expect(byTier.perfect).toEqual(["martini"])
  })

  // The exact regression this stage exists to guarantee: cocktails needing
  // no adaptation come first, adapted ones come after them but still ahead
  // of genuinely almost/unavailable ones - never the reverse, and an
  // adapted cocktail is never folded into "Almost There".
  it("orders groups Perfect > Good Enough > Adapted > Almost There > Unavailable", () => {
    const computed = [
      recipe("u", "unavail"),
      recipe("a", "almost"),
      recipe("ad", "adapted"),
      recipe("g", "good"),
      recipe("p", "perfect"),
    ]
    const groups = groupByDisplayTier(computed)
    expect(groups.map((g) => g.tier)).toEqual([
      "perfect",
      "good",
      "adapted",
      "almost",
      "unavail",
    ])
  })

  it("drops empty tiers entirely rather than rendering an empty group", () => {
    const computed = [recipe("p", "perfect")]
    const groups = groupByDisplayTier(computed)
    expect(groups).toEqual([{ tier: "perfect", items: [computed[0]] }])
  })

  it("falls back to the bare avail string for a caller with no display field", () => {
    const computed = [{ id: "1", name: "A", avail: "perfect" }]
    const groups = groupByDisplayTier(computed)
    expect(groups).toEqual([{ tier: "perfect", items: computed }])
  })

  it("returns an empty array for an empty input", () => {
    expect(groupByDisplayTier([])).toEqual([])
  })
})

// Ingredient Detail Stage I.1 - the shared cap this screen's "up to 10
// matching recipes" now uses, on top of groupByDisplayTier's own output.
describe("capGroupsByTotal", () => {
  it("fills from the highest-ranked tier down, never trimming a Perfect match to make room for an Unavailable one", () => {
    const groups = [
      { tier: "perfect", items: ["p1", "p2"] },
      { tier: "unavail", items: ["u1", "u2", "u3"] },
    ]
    expect(capGroupsByTotal(groups, 3)).toEqual([
      { tier: "perfect", items: ["p1", "p2"] },
      { tier: "unavail", items: ["u1"] },
    ])
  })

  it("keeps an adapted recipe in its own 'adapted' group even when capping - the exact regression this cap must not reintroduce", () => {
    // Same daiquiri/negroni shape as groupByDisplayTier's own test above:
    // daiquiri is display.tier "adapted" despite avail "almost" - capping
    // must never merge or reclassify it into "almost".
    const groups = groupByDisplayTier([
      { id: "daiquiri", name: "daiquiri", avail: "almost", display: { tier: "adapted" } },
      { id: "negroni", name: "negroni", avail: "almost", display: { tier: "almost" } },
    ])
    const capped = capGroupsByTotal(groups, 10)
    const byTier = Object.fromEntries(
      capped.map((g) => [g.tier, g.items.map((i) => i.id)]),
    )
    expect(byTier.adapted).toEqual(["daiquiri"])
    expect(byTier.almost).toEqual(["negroni"])
  })

  it("drops a tier entirely once the cap is exhausted, rather than rendering an empty group", () => {
    const groups = [
      { tier: "perfect", items: ["p1", "p2", "p3"] },
      { tier: "almost", items: ["a1"] },
    ]
    expect(capGroupsByTotal(groups, 3)).toEqual([
      { tier: "perfect", items: ["p1", "p2", "p3"] },
    ])
  })

  it("returns every item unchanged when the total is under the cap", () => {
    const groups = [{ tier: "perfect", items: ["p1"] }]
    expect(capGroupsByTotal(groups, 10)).toEqual(groups)
  })

  it("returns an empty array for an empty input", () => {
    expect(capGroupsByTotal([], 10)).toEqual([])
  })
})
