import { describe, expect, it } from "vitest"
import { rankAdapted, rankAlmostThere } from "./almostThere"

describe("rankAlmostThere", () => {
  it("filters to only avail === 'almost' recipes", () => {
    const computed = [
      { id: "1", name: "Perfect One", avail: "perfect" },
      { id: "2", name: "Almost One", avail: "almost" },
      { id: "3", name: "Unavailable One", avail: "unavail" },
    ]
    const ranked = rankAlmostThere(computed)
    expect(ranked.map((r) => r.id)).toEqual(["2"])
  })

  // Stage D.2: a recipe whose strict avail happens to be "almost" but
  // resolves via a configured, owned general substitute (display.tier ===
  // "adapted") must not appear in this bucket - it belongs in "Make With
  // Substitutions" instead. This is the exact case computeMakeability()
  // produces: adaptation is only attempted on a component strict already
  // left missing, so an adapted recipe's own strict.avail can still read
  // "almost" underneath.
  it("excludes a recipe that is display.tier === 'adapted', even when its strict avail is 'almost'", () => {
    const computed = [
      { id: "1", name: "Genuinely Almost", avail: "almost" },
      {
        id: "2",
        name: "Adapted But Strict-Almost",
        avail: "almost",
        display: { tier: "adapted", label: "Make with substitutions" },
      },
    ]
    const ranked = rankAlmostThere(computed)
    expect(ranked.map((r) => r.id)).toEqual(["1"])
  })

  it("ranks by total popularity (favoriteCount + wantToMakeCount) descending", () => {
    const computed = [
      {
        id: "1",
        name: "A",
        avail: "almost",
        favoriteCount: 1,
        wantToMakeCount: 0,
      },
      {
        id: "2",
        name: "B",
        avail: "almost",
        favoriteCount: 5,
        wantToMakeCount: 2,
      },
      {
        id: "3",
        name: "C",
        avail: "almost",
        favoriteCount: 0,
        wantToMakeCount: 0,
      },
    ]
    const ranked = rankAlmostThere(computed)
    expect(ranked.map((r) => r.id)).toEqual(["2", "1", "3"])
  })

  it("breaks a popularity tie by name, alphabetically", () => {
    const computed = [
      { id: "1", name: "Zombie", avail: "almost", favoriteCount: 2 },
      { id: "2", name: "Aviation", avail: "almost", favoriteCount: 2 },
    ]
    const ranked = rankAlmostThere(computed)
    expect(ranked.map((r) => r.id)).toEqual(["2", "1"])
  })

  it("treats a missing favoriteCount/wantToMakeCount as zero, not a crash", () => {
    const computed = [{ id: "1", name: "A", avail: "almost" }]
    expect(() => rankAlmostThere(computed)).not.toThrow()
  })

  it("does not mutate the input array", () => {
    const computed = [
      { id: "1", name: "B", avail: "almost", favoriteCount: 0 },
      { id: "2", name: "A", avail: "almost", favoriteCount: 5 },
    ]
    const original = [...computed]
    rankAlmostThere(computed)
    expect(computed).toEqual(original)
  })
})

describe("rankAdapted", () => {
  it("filters to only display.tier === 'adapted' recipes", () => {
    const computed = [
      { id: "1", name: "Perfect", avail: "perfect" },
      {
        id: "2",
        name: "Adapted",
        avail: "almost",
        display: { tier: "adapted" },
      },
      { id: "3", name: "Almost", avail: "almost" },
      { id: "4", name: "Unavailable", avail: "unavail" },
    ]
    const ranked = rankAdapted(computed)
    expect(ranked.map((r) => r.id)).toEqual(["2"])
  })

  it("is null-safe with no display field at all (falls back to avail, matching nothing)", () => {
    const computed = [{ id: "1", name: "A", avail: "almost" }]
    expect(rankAdapted(computed)).toEqual([])
  })

  it("ranks by total popularity (favoriteCount + wantToMakeCount) descending, same tie-break as rankAlmostThere", () => {
    const computed = [
      {
        id: "1",
        name: "A",
        display: { tier: "adapted" },
        favoriteCount: 1,
        wantToMakeCount: 0,
      },
      {
        id: "2",
        name: "B",
        display: { tier: "adapted" },
        favoriteCount: 5,
        wantToMakeCount: 2,
      },
    ]
    const ranked = rankAdapted(computed)
    expect(ranked.map((r) => r.id)).toEqual(["2", "1"])
  })

  it("does not mutate the input array", () => {
    const computed = [
      { id: "1", name: "B", display: { tier: "adapted" }, favoriteCount: 0 },
      { id: "2", name: "A", display: { tier: "adapted" }, favoriteCount: 5 },
    ]
    const original = [...computed]
    rankAdapted(computed)
    expect(computed).toEqual(original)
  })
})
