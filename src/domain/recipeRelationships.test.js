import { describe, expect, it } from "vitest"
import {
  resolveBaseRelationship,
  resolveDirectVariations,
  resolveRecipeVariationContext,
  resolveVariationCandidates,
  shouldShowMakeableVariationFraming,
} from "./recipeRelationships"

// A ← B ← C: B is a variation of A, C is a variation of B. Cycle
// prevention itself is a DB-level guarantee (the migration's trigger) -
// this fixture is a valid, non-cyclic chain, used to prove the resolver
// never walks past one hop in either direction.
const chain = [
  { recipeId: "b", relatedRecipeId: "a", note: "Simpler home version" },
  { recipeId: "c", relatedRecipeId: "b", note: null },
]

describe("resolveBaseRelationship", () => {
  it("variation → base lookup resolves correctly", () => {
    expect(resolveBaseRelationship("b", chain)).toEqual({
      baseRecipeId: "a",
      note: "Simpler home version",
    })
  })

  it("a recipe with no base resolves to null", () => {
    expect(resolveBaseRelationship("a", chain)).toBeNull()
  })

  it("does not recursively flatten a chain - resolving C's base returns exactly B, not A", () => {
    // C's base is B; A is B's own base, two hops away from C - must never
    // appear here.
    expect(resolveBaseRelationship("c", chain)).toEqual({
      baseRecipeId: "b",
      note: null,
    })
  })

  it("null note normalizes to null, not undefined", () => {
    const result = resolveBaseRelationship("c", chain)
    expect(result.note).toBeNull()
  })

  it("is null-safe for an empty or missing relationships array", () => {
    expect(resolveBaseRelationship("a", [])).toBeNull()
    expect(resolveBaseRelationship("a", undefined)).toBeNull()
  })

  it("defensively returns only one base even if malformed input somehow contains two rows for the same recipeId (the DB's unique(recipe_id) guarantees this never happens for real data)", () => {
    const malformed = [
      { recipeId: "x", relatedRecipeId: "a", note: null },
      { recipeId: "x", relatedRecipeId: "z", note: null },
    ]
    const result = resolveBaseRelationship("x", malformed)
    expect(result.baseRecipeId).toBe("a") // the first match, not both/an array
  })
})

describe("resolveDirectVariations", () => {
  it("base → direct variations lookup finds exactly its direct children", () => {
    expect(resolveDirectVariations("a", chain)).toEqual([
      { variationRecipeId: "b", note: "Simpler home version" },
    ])
  })

  it("does not recursively flatten a chain - A's variations list is exactly [B], never [B, C]", () => {
    const result = resolveDirectVariations("a", chain)
    expect(result.map((v) => v.variationRecipeId)).toEqual(["b"])
  })

  it("one base can have multiple direct variations", () => {
    const multi = [
      { recipeId: "b", relatedRecipeId: "a", note: "Practical version" },
      { recipeId: "d", relatedRecipeId: "a", note: "Spiced version" },
    ]
    const result = resolveDirectVariations("a", multi)
    expect(result.map((v) => v.variationRecipeId).sort()).toEqual(["b", "d"])
  })

  it("a recipe with no variations resolves to an empty array", () => {
    expect(resolveDirectVariations("c", chain)).toEqual([])
  })

  it("is null-safe for an empty or missing relationships array", () => {
    expect(resolveDirectVariations("a", [])).toEqual([])
    expect(resolveDirectVariations("a", undefined)).toEqual([])
  })
})

describe("resolveRecipeVariationContext", () => {
  const recipesById = new Map([
    ["a", { id: "a", name: "Bloody Mary" }],
    ["b", { id: "b", name: "Bloody Mary (Practical Version)" }],
    // "c" deliberately omitted - simulates a stale/invisible relationship
    // (deleted, unpublished, or not visible to this viewer).
  ])

  it("resolves the base recipe object + note when the target is present", () => {
    const result = resolveRecipeVariationContext("b", chain, recipesById)
    expect(result.base).toEqual({
      recipe: { id: "a", name: "Bloody Mary" },
      note: "Simpler home version",
    })
  })

  it("resolves direct variation recipe objects + notes when present", () => {
    const result = resolveRecipeVariationContext("a", chain, recipesById)
    expect(result.variations).toEqual([
      {
        recipe: { id: "b", name: "Bloody Mary (Practical Version)" },
        note: "Simpler home version",
      },
    ])
  })

  it("a missing/invisible related recipe is handled safely - dropped, not a broken entry or a throw", () => {
    // "c"'s base is "b", which IS in recipesById - so instead exercise the
    // missing case directly: "b"'s own variation "c" is not in
    // recipesById, so it must not appear in b's resolved variations.
    expect(() =>
      resolveRecipeVariationContext("b", chain, recipesById),
    ).not.toThrow()
    const result = resolveRecipeVariationContext("b", chain, recipesById)
    expect(result.variations).toEqual([])
  })

  it("a recipe in the middle of a chain resolves BOTH its base and its direct variations at once (Stage V.3 - A<-B<-C: B shows base=A and variations=[C])", () => {
    const fullRecipesById = new Map([
      ...recipesById,
      ["c", { id: "c", name: "Bloody Mary (Extra Spicy)" }],
    ])
    const result = resolveRecipeVariationContext("b", chain, fullRecipesById)
    expect(result.base).toEqual({
      recipe: { id: "a", name: "Bloody Mary" },
      note: "Simpler home version",
    })
    expect(result.variations).toEqual([
      { recipe: { id: "c", name: "Bloody Mary (Extra Spicy)" }, note: null },
    ])
  })

  it("a base with multiple direct variations returns all of them, sorted deterministically by name regardless of input order (Stage V.3)", () => {
    const multiRecipesById = new Map([
      ["a", { id: "a", name: "Bloody Mary" }],
      ["z", { id: "z", name: "Zombie Variation" }],
      ["m", { id: "m", name: "Mild Variation" }],
    ])
    // Deliberately out-of-alphabetical-order input rows - the output must
    // not just echo whatever order the rows happened to arrive in.
    const relationships = [
      { recipeId: "z", relatedRecipeId: "a", note: null },
      { recipeId: "m", relatedRecipeId: "a", note: null },
    ]
    const result = resolveRecipeVariationContext(
      "a",
      relationships,
      multiRecipesById,
    )
    expect(result.variations.map((v) => v.recipe.id)).toEqual(["m", "z"])
  })

  it("Stage V.4 - variations are ordered by display tier first (perfect > good > adapted > almost > unavail), regardless of input row order", () => {
    const tieredRecipesById = new Map([
      ["a", { id: "a", name: "Bloody Mary" }],
      ["u", { id: "u", name: "Unavail Variation", display: { tier: "unavail" } }],
      ["p", { id: "p", name: "Perfect Variation", display: { tier: "perfect" } }],
      ["ad", { id: "ad", name: "Adapted Variation", display: { tier: "adapted" } }],
      ["al", { id: "al", name: "Almost Variation", display: { tier: "almost" } }],
      ["g", { id: "g", name: "Good Variation", display: { tier: "good" } }],
    ])
    // Deliberately worst-to-best input order - the resolver must re-sort,
    // never just echo the relationship rows' own order.
    const relationships = [
      { recipeId: "u", relatedRecipeId: "a", note: null },
      { recipeId: "al", relatedRecipeId: "a", note: null },
      { recipeId: "ad", relatedRecipeId: "a", note: null },
      { recipeId: "g", relatedRecipeId: "a", note: null },
      { recipeId: "p", relatedRecipeId: "a", note: null },
    ]
    const result = resolveRecipeVariationContext(
      "a",
      relationships,
      tieredRecipesById,
    )
    expect(result.variations.map((v) => v.recipe.id)).toEqual([
      "p",
      "g",
      "ad",
      "al",
      "u",
    ])
  })

  it("Stage V.4 - alphabetical order is still the tie-break for two variations in the same tier", () => {
    const sameTierRecipesById = new Map([
      ["a", { id: "a", name: "Bloody Mary" }],
      ["z", { id: "z", name: "Zombie Variation", display: { tier: "adapted" } }],
      ["m", { id: "m", name: "Mild Variation", display: { tier: "adapted" } }],
    ])
    const relationships = [
      { recipeId: "z", relatedRecipeId: "a", note: null },
      { recipeId: "m", relatedRecipeId: "a", note: null },
    ]
    const result = resolveRecipeVariationContext(
      "a",
      relationships,
      sameTierRecipesById,
    )
    expect(result.variations.map((v) => v.recipe.id)).toEqual(["m", "z"])
  })

  it("a recipe with neither a base nor variations resolves to { base: null, variations: [] } cleanly", () => {
    const result = resolveRecipeVariationContext(
      "z",
      chain,
      new Map([["z", { id: "z", name: "Unrelated Recipe" }]]),
    )
    expect(result).toEqual({ base: null, variations: [] })
  })

  it("removing a relationship (an empty relationships array) never touches the recipe objects themselves - same references, untouched content", () => {
    const before = recipesById.get("a")
    const result = resolveRecipeVariationContext("b", [], recipesById)
    expect(result).toEqual({ base: null, variations: [] })
    // The recipe object in the lookup is completely unaffected - proves
    // unlinking is purely a relationship-table concern, never a recipe
    // content mutation.
    expect(recipesById.get("a")).toBe(before)
  })
})

describe("resolveVariationCandidates", () => {
  const recipes = [
    { id: "a", name: "Bloody Mary" },
    { id: "b", name: "Bloody Mary (Practical Version)" },
    { id: "c", name: "Zombie" },
  ]

  it("excludes the recipe currently being edited - self-selection should not even be choosable", () => {
    const result = resolveVariationCandidates(recipes, "b")
    expect(result.map((r) => r.id)).toEqual(["a", "c"])
  })

  it("excludes nothing when editing a recipe not in the list (defensive) or a brand-new recipe (excludeRecipeId undefined)", () => {
    expect(resolveVariationCandidates(recipes, "not-in-list").map((r) => r.id)).toEqual(["a", "b", "c"])
    expect(resolveVariationCandidates(recipes, undefined).map((r) => r.id)).toEqual(["a", "b", "c"])
  })

  it("is null-safe for a missing recipes array", () => {
    expect(resolveVariationCandidates(undefined, "a")).toEqual([])
  })
})

describe("shouldShowMakeableVariationFraming", () => {
  function withTier(id, name, tier) {
    return { recipe: { id, name, display: { tier } }, note: null }
  }

  it("shows the framing when the base is not makeable and a direct variation is (unavail base, perfect variation)", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "unavail" } }
    const variations = [withTier("b", "Bloody Mary (Practical Version)", "perfect")]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(true)
  })

  it("shows the framing when the base is 'almost' and a variation is 'adapted' - adapted counts as makeable under the app's existing possible/makeable semantics", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "almost" } }
    const variations = [withTier("b", "Adapted Variation", "adapted")]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(true)
  })

  it("hides the framing when the base is already makeable (perfect), even if a variation is also makeable", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "perfect" } }
    const variations = [withTier("b", "Variation", "perfect")]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(false)
  })

  it("hides the framing when the base is already makeable via 'adapted' alone - strict vs adapted are both already 'possible', not a reason to show the line", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "adapted" } }
    const variations = [withTier("b", "Variation", "perfect")]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(false)
  })

  it("hides the framing when the base is not makeable but no variation is makeable either", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "unavail" } }
    const variations = [
      withTier("b", "Variation One", "almost"),
      withTier("c", "Variation Two", "unavail"),
    ]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(false)
  })

  it("hides the framing when there are no variations at all", () => {
    const base = { id: "a", name: "Bloody Mary", display: { tier: "unavail" } }
    expect(shouldShowMakeableVariationFraming(base, [])).toBe(false)
  })

  it("is null-safe for a missing recipe", () => {
    expect(shouldShowMakeableVariationFraming(null, [])).toBe(false)
    expect(shouldShowMakeableVariationFraming(undefined, [])).toBe(false)
  })

  it("falls back to the bare avail string when display is absent, matching every other consumer of this tier rule", () => {
    const base = { id: "a", name: "Bloody Mary", avail: "unavail" }
    const variations = [{ recipe: { id: "b", name: "Variation", avail: "perfect" }, note: null }]
    expect(shouldShowMakeableVariationFraming(base, variations)).toBe(true)
  })
})
