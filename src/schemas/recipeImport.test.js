import { describe, expect, it } from "vitest"
import { buildRecipeImportPrompt, validateRecipeImport } from "./recipeImport"

const types = [
  { id: "type-gin", name: "Gin" },
  { id: "type-vermouth", name: "Dry Vermouth" },
  { id: "type-olive", name: "Olive" },
]
const glasses = [
  { id: "glass-martini", name: "Martini" },
  { id: "glass-rocks", name: "Rocks" },
]
const families = [{ id: "fam-stirred", name: "Stirred" }]
const tasteTags = [{ id: "tag-dry", name: "Dry" }]
const catalog = { types, glasses, families, tasteTags }

const validItem = {
  name: "Martini",
  description: "Classic stirred cocktail.",
  glass: "Martini",
  family: "Stirred",
  liquidColor: "#dbeafe",
  tasteTags: ["Dry"],
  steps: ["Stir with ice.", "Strain into a chilled glass."],
  components: [
    { ingredient: "Gin", amount: 60, unit: "ml", role: "required" },
    { ingredient: "Dry Vermouth", amount: 10, unit: "ml", role: "required" },
    { ingredient: "Olive", amount: 1, unit: "piece", role: "garnish" },
  ],
}

describe("validateRecipeImport", () => {
  it("accepts a fully-specified valid recipe", () => {
    const { results, validCount, errorCount } = validateRecipeImport(
      [validItem],
      catalog,
    )
    expect(errorCount).toBe(0)
    expect(validCount).toBe(1)
    expect(results[0].resolved).toEqual({
      name: "Martini",
      description: "Classic stirred cocktail.",
      glassId: "glass-martini",
      familyId: "fam-stirred",
      liquidColor: "#dbeafe",
      liquidColor2: null,
      steps: ["Stir with ice.", "Strain into a chilled glass."],
      tasteTagIds: ["tag-dry"],
      components: [
        {
          ingredientTypeId: "type-gin",
          amount: 60,
          unitLabel: "ml",
          role: "required",
        },
        {
          ingredientTypeId: "type-vermouth",
          amount: 10,
          unitLabel: "ml",
          role: "required",
        },
        {
          ingredientTypeId: "type-olive",
          amount: 0,
          unitLabel: "1 piece",
          role: "garnish",
        },
      ],
    })
  })

  it("accepts a weight-based (g) component", () => {
    const { results } = validateRecipeImport(
      [
        {
          name: "Muddled",
          glass: "Rocks",
          steps: ["Muddle."],
          components: [
            { ingredient: "Olive", amount: 50, unit: "g", role: "required" },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.components[0]).toEqual({
      ingredientTypeId: "type-olive",
      amount: 0,
      unitLabel: "50 g",
      role: "required",
    })
  })

  it("accepts a countable splash component", () => {
    const { results } = validateRecipeImport(
      [
        {
          name: "Splashy",
          glass: "Rocks",
          steps: ["Build over ice."],
          components: [
            { ingredient: "Gin", amount: 60, unit: "ml" },
            {
              ingredient: "Olive",
              amount: 2,
              unit: "splash",
              role: "optional",
            },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.components[1]).toEqual({
      ingredientTypeId: "type-olive",
      amount: 0,
      unitLabel: "2 splash",
      role: "optional",
    })
  })

  it("accepts a bare, no-count 'to taste' component", () => {
    const { results } = validateRecipeImport(
      [
        {
          name: "Seasoned",
          glass: "Rocks",
          steps: ["Build over ice."],
          components: [
            { ingredient: "Gin", amount: 60, unit: "ml" },
            { ingredient: "Olive", unit: "to taste", role: "optional" },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.components[1]).toEqual({
      ingredientTypeId: "type-olive",
      amount: 0,
      unitLabel: "to taste",
      role: "optional",
    })
  })

  it("accepts a minimal valid recipe with no family/color/tags", () => {
    const { results } = validateRecipeImport(
      [
        {
          name: "Plain",
          glass: "Rocks",
          steps: ["Build over ice."],
          components: [{ ingredient: "Gin", amount: 45, unit: "ml" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.familyId).toBeNull()
    expect(results[0].resolved.liquidColor).toBeNull()
    expect(results[0].resolved.tasteTagIds).toEqual([])
    expect(results[0].resolved.components[0].role).toBe("required")
  })

  it("rejects a missing name", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, name: "" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing name")
  })

  it("flags a name matching an existing recipe (case-insensitive)", () => {
    const { results } = validateRecipeImport([validItem], {
      ...catalog,
      existingRecipeNames: ["martini"],
    })
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Possible duplicate/)
  })

  it("rejects a duplicate name within the same import batch", () => {
    const { results } = validateRecipeImport(
      [validItem, { ...validItem, name: "martini" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[1].valid).toBe(false)
    expect(results[1].errors[0]).toMatch(/Duplicate/)
  })

  it("rejects an unknown glass", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, glass: "Snifter" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain('Unknown glass "Snifter"')
  })

  it("rejects an unknown family", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, family: "Sours" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain('Unknown family "Sours"')
  })

  it("rejects an unknown taste tag", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, tasteTags: ["Bitter"] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain('Unknown taste tag "Bitter"')
  })

  it("rejects an invalid liquidColor", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, liquidColor: "blue" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid liquidColor/)
  })

  it("accepts an optional liquidColor2 for a layered/gradient drink", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, liquidColor2: "#f97316" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.liquidColor2).toBe("#f97316")
  })

  it("accepts an 8-digit hex color with alpha (e.g. the 'Clear' swatch)", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, liquidColor: "#dbeafe80" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.liquidColor).toBe("#dbeafe80")
  })

  it("rejects an invalid liquidColor2", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, liquidColor2: "orange" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid liquidColor2/)
  })

  it("rejects missing steps", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, steps: [] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing steps")
  })

  it("rejects missing components", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, components: [] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing components")
  })

  it("rejects a component with an unresolved ingredient name (no fuzzy matching)", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          components: [{ ingredient: "Gyn", amount: 60, unit: "ml" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/unresolved ingredient "Gyn"/)
  })

  it("resolves a component ingredient given as a known alias", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          components: [{ ingredient: "London Dry", amount: 60, unit: "ml" }],
        },
      ],
      {
        ...catalog,
        aliases: [{ alias: "London Dry", ingredient_type_id: "type-gin" }],
      },
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.components[0].ingredientTypeId).toBe("type-gin")
  })

  it("rejects a component with an invalid unit", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          components: [{ ingredient: "Gin", amount: 2, unit: "cl" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/invalid unit "cl"/)
  })

  it("rejects a non-positive ml amount", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          components: [{ ingredient: "Gin", amount: 0, unit: "ml" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/invalid ml amount/)
  })

  it("rejects an invalid component role", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          components: [
            { ingredient: "Gin", amount: 60, unit: "ml", role: "double" },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/invalid role "double"/)
  })

  it("surfaces AI-flagged unresolvedIngredients as a review error", () => {
    const { results } = validateRecipeImport(
      [{ ...validItem, unresolvedIngredients: ["Yuzu Bitters"] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Unresolved ingredient.*Yuzu Bitters/)
    expect(results[0].missingIngredientNames).toEqual(["Yuzu Bitters"])
  })

  it("does not offer to add an unresolvedIngredients name that already resolves against the live catalog", () => {
    // Real bug this covers: an AI flagged a name as unresolved at
    // generation time, but the catalog gained that exact type since (or
    // the JSON is just stale/reused) - offering "+Add" for it would only
    // ever fail with "already exists in the catalog".
    const { results } = validateRecipeImport(
      [{ ...validItem, unresolvedIngredients: ["Gin"] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].missingIngredientNames).toEqual([])
    expect(results[0].errors.join(" ")).toMatch(/Gin.*now in the catalog/i)
  })

  it("collects missingIngredientNames from both unresolvedIngredients and unmatched components, deduped", () => {
    const { results } = validateRecipeImport(
      [
        {
          ...validItem,
          unresolvedIngredients: ["Salt"],
          components: [
            { ingredient: "Gin", amount: 60, unit: "ml" },
            { ingredient: "salt", amount: 1, unit: "piece" },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].missingIngredientNames).toEqual(["Salt"])
  })

  it("handles a non-object item without throwing", () => {
    const { results } = validateRecipeImport(["oops"], catalog)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing name")
  })
})

describe("buildRecipeImportPrompt", () => {
  it("lists existing ingredients, glasses, families, and taste tags", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toContain("Gin")
    expect(prompt).toContain("Dry Vermouth")
    expect(prompt).toContain("Martini")
    expect(prompt).toContain("Stirred")
    expect(prompt).toContain("Dry")
  })

  it("names the allowed non-volume units, calling out grams separately", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toContain(
      "part, dash, barspoon, piece, slice, wedge, top-up, to taste, splash",
    )
    expect(prompt).toContain('"g" (grams, for weight-based solids)')
  })

  it("tells the AI to keep ingredient names bare, no quantity or notes", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toMatch(/never append quantity/i)
  })

  it("annotates an ingredient type with its known aliases", () => {
    const prompt = buildRecipeImportPrompt({
      ...catalog,
      aliases: [{ alias: "London Dry", ingredient_type_id: "type-gin" }],
    })
    expect(prompt).toContain("Gin (also known as: London Dry)")
  })

  // Rusty Pipes convention: liquidColor is always the BOTTOM/base layer,
  // liquidColor2 (when set) is always the layer above it, at the TOP - by
  // the drink's actual visual position in the finished glass, never by
  // ingredient/pour order or which color is more prominent. The prompt used
  // to only say liquidColor was the "base" the drink is "built on," which
  // read as ambiguous enough that real AI output sometimes reversed the two
  // fields - this locks the explicit bottom/top wording in place.
  it("defines liquidColor as the bottom layer and liquidColor2 as the top layer", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toMatch(/"liquidColor":.*BOTTOM/)
    expect(prompt).toMatch(/"liquidColor2":.*ABOVE liquidColor, at the TOP/)
  })

  it("says the bottom/top assignment is by visual position, not ingredient/pour order or dominance", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toMatch(/never from ingredient order/)
    expect(prompt).toMatch(/never on pour order, ingredient order, or dominance/)
  })

  it("gives an explicit Tequila Sunrise example mapping grenadine/red to liquidColor (bottom) and orange juice/orange to liquidColor2 (top)", () => {
    const prompt = buildRecipeImportPrompt(catalog)
    expect(prompt).toMatch(
      /grenadine sinks and colors the BOTTOM of the glass red/,
    )
    expect(prompt).toMatch(
      /liquidColor is the red \(grenadine, bottom\) and liquidColor2 is the orange \(orange juice, top\)/,
    )
  })
})
