import { describe, expect, it } from "vitest"
import {
  formatMakeabilityBreakdown,
  summarizeMakeability,
} from "./makeabilityCounts"

function recipe(tier) {
  return { display: { tier }, avail: tier }
}

describe("summarizeMakeability", () => {
  it("counts perfect and good as ready, adapted separately, and sums both into possible", () => {
    const computed = [
      recipe("perfect"),
      recipe("perfect"),
      recipe("good"),
      recipe("adapted"),
      recipe("adapted"),
      recipe("adapted"),
      recipe("almost"),
      recipe("unavail"),
    ]
    expect(summarizeMakeability(computed)).toEqual({
      possible: 6,
      ready: 3,
      adapted: 3,
    })
  })

  it("matches the approved acceptance example - 8 possible, 5 ready, 3 adapted", () => {
    const computed = [
      ...Array(5)
        .fill(null)
        .map(() => recipe("perfect")),
      ...Array(3)
        .fill(null)
        .map(() => recipe("adapted")),
      recipe("almost"),
      recipe("unavail"),
    ]
    expect(summarizeMakeability(computed)).toEqual({
      possible: 8,
      ready: 5,
      adapted: 3,
    })
  })

  it("falls back to the bare avail string for a recipe with no display field", () => {
    const computed = [
      { avail: "perfect" },
      { avail: "good" },
      { avail: "almost" },
    ]
    expect(summarizeMakeability(computed)).toEqual({
      possible: 2,
      ready: 2,
      adapted: 0,
    })
  })

  it("is zero for an empty list", () => {
    expect(summarizeMakeability([])).toEqual({
      possible: 0,
      ready: 0,
      adapted: 0,
    })
  })
})

describe("formatMakeabilityBreakdown", () => {
  it("matches the approved wording exactly", () => {
    expect(
      formatMakeabilityBreakdown({ possible: 8, ready: 5, adapted: 3 }),
    ).toBe(
      "8 cocktails possible · 5 ready, 3 with substitutions or preparation",
    )
  })

  it("omits the breakdown clause when nothing is adapted", () => {
    expect(
      formatMakeabilityBreakdown({ possible: 5, ready: 5, adapted: 0 }),
    ).toBe("5 cocktails possible")
  })

  it("uses the singular 'cocktail' for exactly one", () => {
    expect(
      formatMakeabilityBreakdown({ possible: 1, ready: 1, adapted: 0 }),
    ).toBe("1 cocktail possible")
  })

  it("handles zero possible", () => {
    expect(
      formatMakeabilityBreakdown({ possible: 0, ready: 0, adapted: 0 }),
    ).toBe("0 cocktails possible")
  })
})
