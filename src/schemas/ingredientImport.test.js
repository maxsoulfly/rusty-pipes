import { describe, expect, it } from "vitest"
import {
  buildIngredientImportPrompt,
  toIngredientTypeRow,
  validateIngredientImport,
} from "./ingredientImport"

const categories = [
  { id: "cat-spirit", name: "Spirit" },
  { id: "cat-juice", name: "Juice" },
]
const types = [
  { id: "type-rum", name: "Rum", category_id: "cat-spirit" },
  { id: "type-gin", name: "Gin", category_id: "cat-spirit" },
  { id: "type-lime", name: "Lime Juice", category_id: "cat-juice" },
]
const catalog = { categories, types }

describe("validateIngredientImport", () => {
  it("accepts a minimal valid item and resolves defaults", () => {
    const { results, validCount, errorCount } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit" }],
      catalog,
    )
    expect(validCount).toBe(1)
    expect(errorCount).toBe(0)
    expect(results[0].resolved).toEqual({
      name: "Cachaca",
      category_id: "cat-spirit",
      parent_type_id: null,
      color: null,
      bar_priority: "common",
      description: null,
      shape: null,
      assumed_available: false,
      aliases: [],
      conversions: [],
      substitutes: [],
      preparation: null,
    })
  })

  it("resolves a valid parentType within the same category", () => {
    const { results } = validateIngredientImport(
      [{ name: "Spiced Rum", category: "Spirit", parentType: "Rum" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.parent_type_id).toBe("type-rum")
  })

  it("rejects a missing name", () => {
    const { results } = validateIngredientImport(
      [{ category: "Spirit" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing name")
  })

  it("rejects a name that already exists in the catalog (case-insensitive)", () => {
    const { results } = validateIngredientImport(
      [{ name: "rum", category: "Spirit" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/already exists/)
  })

  it("rejects a duplicate name within the same import batch", () => {
    const { results } = validateIngredientImport(
      [
        { name: "Cachaca", category: "Spirit" },
        { name: "cachaca", category: "Spirit" },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[1].valid).toBe(false)
    expect(results[1].errors[0]).toMatch(/Duplicate/)
  })

  it("rejects an unknown category", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Nonsense" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain('Unknown category "Nonsense"')
  })

  it("rejects an unknown parentType", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", parentType: "Nope" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain('Unknown parentType "Nope"')
  })

  it("rejects a parentType from a different category", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", parentType: "Lime Juice" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/is not in category/)
  })

  it("rejects an invalid barPriority", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", barPriority: "urgent" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid barPriority/)
  })

  it("rejects an invalid color", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", color: "orange" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid color/)
  })

  it("accepts a valid hex color", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", color: "#a1b2c3" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.color).toBe("#a1b2c3")
  })

  it("accepts an 8-digit hex color with alpha (e.g. the 'Clear' swatch)", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", color: "#dbeafe80" }],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.color).toBe("#dbeafe80")
  })

  it("handles a non-object item without throwing", () => {
    const { results } = validateIngredientImport(["oops"], catalog)
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain("Missing name")
  })

  it("rejects a name that already resolves to an existing type via an alias", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit" }],
      {
        ...catalog,
        aliases: [{ alias: "Cachaca", ingredient_type_id: "type-rum" }],
      },
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(
      /already resolves to "Rum" via an existing alias/,
    )
  })

  it("resolves a parentType given as a known alias", () => {
    const { results } = validateIngredientImport(
      [{ name: "Spiced Rum", category: "Spirit", parentType: "Ron" }],
      {
        ...catalog,
        aliases: [{ alias: "Ron", ingredient_type_id: "type-rum" }],
      },
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.parent_type_id).toBe("type-rum")
  })

  // ── Rich fields (2026-09-14) ──────────────────────────────────────────

  it("accepts a fully-populated rich item and resolves every field", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Grenadine",
          category: "Juice",
          householdBasic: true,
          icon: "jar",
          aliases: ["Pomegranate Syrup"],
          canProvide: [{ preparedType: "Lime Juice", guidance: "Whisk together" }],
          canBeReplacedBy: [{ type: "Rum", note: "not remotely the same, but red" }],
          homemadePreparation: {
            name: "Homemade Grenadine",
            inputs: [
              { type: "Lime Juice", amount: 200, unit: "ml" },
              { type: "Rum", amount: 200, unit: "g" },
            ],
            steps: ["Combine and simmer", "Cool and bottle"],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved).toEqual({
      name: "Grenadine",
      category_id: "cat-juice",
      parent_type_id: null,
      color: null,
      bar_priority: "common",
      description: null,
      shape: "jar",
      assumed_available: true,
      aliases: ["Pomegranate Syrup"],
      conversions: [{ preparedTypeId: "type-lime", guidance: "Whisk together" }],
      substitutes: [
        { toTypeId: "type-rum", flavorNote: "not remotely the same, but red" },
      ],
      preparation: {
        name: "Homemade Grenadine",
        instructions: ["Combine and simmer", "Cool and bottle"],
        inputs: [
          { ingredientTypeId: "type-lime", amount: 200, unitLabel: "ml" },
          { ingredientTypeId: "type-rum", amount: 200, unitLabel: "g" },
        ],
      },
    })
  })

  it("rejects an invalid icon", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", icon: "cardboard_box" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid icon/)
  })

  it("rejects a non-boolean householdBasic", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", householdBasic: "yes" }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/Invalid householdBasic/)
  })

  it("drops blank aliases silently but rejects a real duplicate/collision", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Cachaca",
          category: "Spirit",
          aliases: ["", "  ", "Pinga", "pinga", "Rum"],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain(
      'aliases[3]: duplicate alias "pinga" within this item',
    )
    expect(results[0].errors[1]).toMatch(
      /already refers to an existing ingredient type "Rum"/,
    )
  })

  it("rejects an alias that duplicates the item's own name", () => {
    const { results } = validateIngredientImport(
      [{ name: "Cachaca", category: "Spirit", aliases: ["cachaca"] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/duplicates this item's own name/)
  })

  it("resolves a canProvide target via an existing alias", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Lime",
          category: "Juice",
          canProvide: [{ preparedType: "Lime Cordial", guidance: "Squeeze" }],
        },
      ],
      {
        ...catalog,
        aliases: [{ alias: "Lime Cordial", ingredient_type_id: "type-lime" }],
      },
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.conversions).toEqual([
      { preparedTypeId: "type-lime", guidance: "Squeeze" },
    ])
  })

  it("rejects a canProvide target that doesn't resolve to any existing type - never a dangling reference", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Lime",
          category: "Juice",
          canProvide: [{ preparedType: "Lime Cordial Deluxe", guidance: "Squeeze" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/unknown preparedType/)
  })

  it("rejects a canProvide entry missing its required guidance", () => {
    const { results } = validateIngredientImport(
      [{ name: "Lime", category: "Juice", canProvide: [{ preparedType: "Rum" }] }],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/guidance is required/)
  })

  it("rejects a duplicate canProvide target within the same item", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Lime",
          category: "Juice",
          canProvide: [
            { preparedType: "Rum", guidance: "a" },
            { preparedType: "Rum", guidance: "b" },
          ],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/duplicate preparedType/)
  })

  it("resolves a directional canBeReplacedBy substitute without implying the reverse", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Spiced Rum",
          category: "Spirit",
          canBeReplacedBy: [{ type: "Rum", note: "cleaner, drier" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.substitutes).toEqual([
      { toTypeId: "type-rum", flavorNote: "cleaner, drier" },
    ])
    // Nothing about validating "Spiced Rum can be replaced by Rum" ever
    // produces or implies a "Rum can be replaced by Spiced Rum" row -
    // directional, not automatically reversible.
    expect(results[0].resolved.substitutes).toHaveLength(1)
  })

  it("rejects an unknown canBeReplacedBy target", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Spiced Rum",
          category: "Spirit",
          canBeReplacedBy: [{ type: "Nonexistent Spirit", note: "n/a" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/unknown type/)
  })

  it("accepts a homemade preparation with multiple inputs, quantities, and steps", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: {
            name: "Homemade Sour Mix",
            inputs: [
              { type: "Lime Juice", amount: 250, unit: "ml" },
              { type: "Gin", amount: 10, unit: "g" },
            ],
            steps: ["Mix well", "Chill before use"],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(true)
    expect(results[0].resolved.preparation).toEqual({
      name: "Homemade Sour Mix",
      instructions: ["Mix well", "Chill before use"],
      inputs: [
        { ingredientTypeId: "type-lime", amount: 250, unitLabel: "ml" },
        { ingredientTypeId: "type-gin", amount: 10, unitLabel: "g" },
      ],
    })
  })

  it("rejects a homemade preparation with zero inputs", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: { name: "Homemade Sour Mix", inputs: [] },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain(
      "homemadePreparation: at least one input is required",
    )
  })

  it("rejects a homemade preparation input with an unresolvable type - never a guessed quantity or dangling reference", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: {
            name: "Homemade Sour Mix",
            inputs: [{ type: "Mystery Fruit", amount: 100, unit: "ml" }],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/unknown type "Mystery Fruit"/)
  })

  it("rejects a homemade preparation input with a non-positive amount", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: {
            name: "Homemade Sour Mix",
            inputs: [{ type: "Lime Juice", amount: 0, unit: "ml" }],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/amount must be a positive number/)
  })

  it("rejects a homemade preparation input with a non-controlled unit", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: {
            name: "Homemade Sour Mix",
            inputs: [{ type: "Lime Juice", amount: 100, unit: "cups" }],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(/invalid unit "cups"/)
  })

  it("rejects a homemade preparation input that is itself made by an existing preparation - depth-1 guard", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Cocktail Mix",
          category: "Juice",
          homemadePreparation: {
            name: "Homemade Cocktail Mix",
            inputs: [{ type: "Lime Juice", amount: 100, unit: "ml" }],
          },
        },
      ],
      {
        ...catalog,
        ingredientPreparations: [{ produces_type_id: "type-lime" }],
      },
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors[0]).toMatch(
      /is itself made by another preparation/,
    )
  })

  it("rejects a homemade preparation missing its required name", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Sour Mix",
          category: "Juice",
          homemadePreparation: {
            name: "",
            inputs: [{ type: "Lime Juice", amount: 100, unit: "ml" }],
          },
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].errors).toContain(
      "homemadePreparation: name is required (1-100 characters)",
    )
  })

  it("a malformed rich field invalidates the whole item rather than silently importing a partial/incorrect relationship", () => {
    const { results } = validateIngredientImport(
      [
        {
          name: "Cachaca",
          category: "Spirit",
          canProvide: [{ preparedType: "Not A Real Type", guidance: "x" }],
        },
      ],
      catalog,
    )
    expect(results[0].valid).toBe(false)
    expect(results[0].resolved).toBeNull()
  })
})

describe("toIngredientTypeRow", () => {
  it("strips the relationship fields, keeping only real ingredient_types columns", () => {
    const row = toIngredientTypeRow({
      name: "Grenadine",
      category_id: "cat-juice",
      parent_type_id: null,
      color: null,
      bar_priority: "common",
      description: null,
      shape: "jar",
      assumed_available: true,
      aliases: ["Pomegranate Syrup"],
      conversions: [{ preparedTypeId: "type-lime", guidance: "x" }],
      substitutes: [{ toTypeId: "type-rum", flavorNote: "y" }],
      preparation: { name: "Homemade Grenadine", instructions: [], inputs: [] },
    })
    expect(row).toEqual({
      name: "Grenadine",
      category_id: "cat-juice",
      parent_type_id: null,
      color: null,
      bar_priority: "common",
      description: null,
      shape: "jar",
      assumed_available: true,
    })
  })

  it("omits the shape key entirely when no icon was resolved, so the column default applies", () => {
    const row = toIngredientTypeRow({
      name: "Cachaca",
      category_id: "cat-spirit",
      parent_type_id: null,
      color: null,
      bar_priority: "common",
      description: null,
      shape: null,
      assumed_available: false,
      aliases: [],
      conversions: [],
      substitutes: [],
      preparation: null,
    })
    expect(row).not.toHaveProperty("shape")
  })
})

describe("buildIngredientImportPrompt", () => {
  it("lists every category and its types", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toContain("Spirit")
    expect(prompt).toContain("Juice")
    expect(prompt).toContain("Gin, Rum")
    expect(prompt).toContain("Lime Juice")
  })

  it("names all allowed bar priorities", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toContain("essential, common, specialized, niche")
  })

  it("annotates a type with its known aliases", () => {
    const prompt = buildIngredientImportPrompt({
      ...catalog,
      aliases: [{ alias: "Ron", ingredient_type_id: "type-rum" }],
    })
    expect(prompt).toContain("Rum (also known as: Ron)")
  })

  it("instructs the AI to research first and never invent metadata", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/research/i)
    expect(prompt).toMatch(/NEVER invent metadata/)
    expect(prompt).toMatch(/sparse but correct/i)
  })

  it("lists the controlled icon vocabulary", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toContain("jar")
    expect(prompt).toContain("spirit_bottle")
  })

  it("lists the controlled homemade-preparation unit vocabulary", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toContain("dash")
    expect(prompt).toContain("barspoon")
  })

  it("tells the AI relationship targets must already exist, never invented or from this same batch", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/never another new item in this array/)
  })

  it("surfaces the known liquid-color palette when given one", () => {
    const prompt = buildIngredientImportPrompt({
      ...catalog,
      liquidColors: [{ name: "Amber", hex: "#d97706" }],
    })
    expect(prompt).toContain("Amber: #d97706")
  })

  // Regression coverage for a real reported bug (2026-09-14): pasting this
  // prompt into an existing AI conversation about a specific ingredient
  // (observed with Elderflower Cordial) returned `[]` instead of formatting
  // it - the prompt thoroughly specified HOW to research/format but never
  // told the AI to look at the surrounding conversation for WHICH
  // ingredient(s) to format when none are listed in the prompt text itself.
  it("tells the AI to use the surrounding conversation to identify which ingredient(s) to format", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/immediately preceding conversation/i)
    expect(prompt).toMatch(/Elderflower Cordial/)
  })

  it("tells the AI not to return an empty array merely because no explicit name list follows the prompt", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/Do NOT return an empty array `\[\]`/)
  })

  it("tells the AI to ask which ingredient(s) rather than guess when none can be identified", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/ASK the user which ingredient\(s\)/)
    expect(prompt).toMatch(/instead of guessing or returning `\[\]`/)
  })

  it("still carries every existing research-first/non-invention/accuracy instruction", () => {
    const prompt = buildIngredientImportPrompt(catalog)
    expect(prompt).toMatch(/research/i)
    expect(prompt).toMatch(/NEVER invent metadata/)
    expect(prompt).toMatch(/sparse but correct/i)
    expect(prompt).toMatch(/never another new item in this array/)
    expect(prompt).toMatch(/Return ONLY a JSON array \(no markdown fences, no commentary\)/)
  })
})
