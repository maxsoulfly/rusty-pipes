import { describe, expect, it } from "vitest"
import {
  resolveBaseRelationship,
  resolveDirectVariations,
  resolveRecipeVariationContext,
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
