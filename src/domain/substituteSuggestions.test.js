import { describe, expect, it } from "vitest"
import { buildSubstituteSuggester } from "./substituteSuggestions"

const NAMES = {
  "white-rum": "White Rum",
  "spiced-rum": "Spiced Rum",
  "gold-rum": "Gold Rum",
  "dark-rum": "Dark Rum",
  "aged-rum": "Aged Rum",
  campari: "Campari",
  aperol: "Aperol",
}
const name = (id) => NAMES[id] ?? id

const SUBS = [
  {
    from_type_id: "white-rum",
    to_type_id: "spiced-rum",
    flavor_note: "sweeter, warm spice",
  },
  { from_type_id: "white-rum", to_type_id: "gold-rum", flavor_note: "rounder" },
  {
    from_type_id: "white-rum",
    to_type_id: "dark-rum",
    flavor_note: "heavier, molasses",
  },
  { from_type_id: "white-rum", to_type_id: "aged-rum", flavor_note: "oaky" },
  // reverse direction is a separate row and must never leak into a
  // white-rum suggestion
  {
    from_type_id: "spiced-rum",
    to_type_id: "white-rum",
    flavor_note: "cleaner, drier",
  },
  {
    from_type_id: "campari",
    to_type_id: "aperol",
    flavor_note: "lighter, less bitter",
  },
]

describe("buildSubstituteSuggester", () => {
  it("only offers replacements whose from side is the missing ingredient (directional)", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    const rows = suggest("white-rum")
    expect(rows.every((r) => r.toId !== "white-rum")).toBe(true)
    // the spiced-rum -> white-rum row must not surface here
    expect(rows.map((r) => r.toId)).not.toContain("white-rum")
  })

  it("does not surface the reverse direction", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    // nothing has spiced-rum as a `from` except the one reverse row
    expect(suggest("spiced-rum").map((r) => r.toId)).toEqual(["white-rum"])
  })

  it("lists owned replacements first, then alphabetical, and caps the list", () => {
    // own gold-rum and aged-rum; spiced-rum and dark-rum not owned
    const suggest = buildSubstituteSuggester(
      SUBS,
      new Set(["gold-rum", "aged-rum"]),
      name,
    )
    const rows = suggest("white-rum")
    expect(rows).toHaveLength(3) // default limit
    expect(rows.map((r) => r.toId)).toEqual([
      "aged-rum", // owned, "Aged Rum" < "Gold Rum"
      "gold-rum", // owned
      "dark-rum", // not owned, "Dark Rum" < "Spiced Rum"
    ])
    expect(rows[0].owned).toBe(true)
    expect(rows[2].owned).toBe(false)
  })

  it("respects a custom limit", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name, 2)
    expect(suggest("white-rum")).toHaveLength(2)
  })

  it("returns an empty list for an ingredient with no substitutions, and is null-safe", () => {
    expect(buildSubstituteSuggester(SUBS, new Set(), name)("vodka")).toEqual([])
    expect(
      buildSubstituteSuggester(null, new Set(), name)("white-rum"),
    ).toEqual([])
  })

  it("carries the flavor note through unchanged", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    const [first] = suggest("campari")
    expect(first).toEqual({
      toId: "aperol",
      toName: "Aperol",
      note: "lighter, less bitter",
      owned: false,
    })
  })

  // ── Stage D.4: per-component exclusion ───────────────────────────────

  it("drops an excluded candidate from the suggestion list (Set form)", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    const rows = suggest("white-rum", new Set(["spiced-rum"]))
    expect(rows.map((r) => r.toId)).not.toContain("spiced-rum")
    expect(rows.map((r) => r.toId)).toEqual(
      expect.arrayContaining(["gold-rum", "dark-rum", "aged-rum"]),
    )
  })

  it("also accepts a plain array for the excluded ids", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    const rows = suggest("white-rum", ["spiced-rum"])
    expect(rows.map((r) => r.toId)).not.toContain("spiced-rum")
  })

  it("is unaffected when no exclusion is passed at all", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name, 10)
    expect(suggest("white-rum").map((r) => r.toId)).toContain("spiced-rum")
  })

  it("excluding a candidate for one call does not affect a later call for a different missing ingredient", () => {
    const suggest = buildSubstituteSuggester(SUBS, new Set(), name)
    suggest("white-rum", new Set(["spiced-rum"]))
    expect(suggest("campari").map((r) => r.toId)).toEqual(["aperol"])
  })
})
