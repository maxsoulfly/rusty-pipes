import { describe, expect, it } from "vitest"
import {
  resolveCanBeReplacedBy,
  resolveCanProvide,
  resolveHomemadePreparation,
} from "./ingredientRelationships"

const types = [
  { id: "lemon", name: "Lemon" },
  { id: "lemon-juice", name: "Lemon Juice" },
  { id: "white-rum", name: "White Rum" },
  { id: "spiced-rum", name: "Spiced Rum" },
  { id: "white-sugar", name: "White Sugar" },
  { id: "water", name: "Water" },
  { id: "simple-syrup", name: "Simple Syrup" },
]

describe("resolveCanProvide", () => {
  const formConversions = [
    {
      raw_type_id: "lemon",
      prepared_type_id: "lemon-juice",
      guidance: "Squeeze fresh juice from Lemon",
    },
  ]

  it("returns rows where the given type is the RAW side - the correct direction", () => {
    const result = resolveCanProvide("lemon", formConversions, types)
    expect(result).toEqual([
      {
        preparedTypeId: "lemon-juice",
        preparedName: "Lemon Juice",
        guidance: "Squeeze fresh juice from Lemon",
      },
    ])
  })

  it("does not fabricate the reverse relationship - Lemon Juice's own page shows nothing from this lookup", () => {
    const result = resolveCanProvide("lemon-juice", formConversions, types)
    expect(result).toEqual([])
  })

  it("returns an empty array when nothing is configured", () => {
    expect(resolveCanProvide("white-rum", formConversions, types)).toEqual([])
  })
})

describe("resolveCanBeReplacedBy", () => {
  const ingredientSubstitutions = [
    {
      from_type_id: "white-rum",
      to_type_id: "spiced-rum",
      flavor_note: "Adds sweetness and spice.",
    },
  ]

  it("returns rows where the given type is the FROM side - the correct direction, flavor note preserved", () => {
    const result = resolveCanBeReplacedBy(
      "white-rum",
      ingredientSubstitutions,
      types,
    )
    expect(result).toEqual([
      {
        toTypeId: "spiced-rum",
        toName: "Spiced Rum",
        flavorNote: "Adds sweetness and spice.",
      },
    ])
  })

  it("does not fabricate the reverse relationship - Spiced Rum's own page shows nothing from this lookup", () => {
    const result = resolveCanBeReplacedBy(
      "spiced-rum",
      ingredientSubstitutions,
      types,
    )
    expect(result).toEqual([])
  })

  it("recipe-specific alternatives never appear here - this function only ever reads the general catalogue table it's given, never recipe_component_alternatives, so a recipe-scoped alternative has no path into this result", () => {
    // Simulates the caller passing only the general table - a recipe-scoped
    // alternative (a different table entirely, never passed in here) has
    // no way to show up regardless of what recipes exist.
    const result = resolveCanBeReplacedBy("white-rum", [], types)
    expect(result).toEqual([])
  })
})

describe("resolveHomemadePreparation", () => {
  const ingredientPreparations = [
    {
      id: "prep-1",
      produces_type_id: "simple-syrup",
      name: "Simple Syrup",
      instructions: [
        "Combine sugar and water in a saucepan.",
        "Heat gently while stirring until the sugar is completely dissolved.",
        "Remove from heat and let cool.",
        "Transfer to a clean bottle and refrigerate.",
      ],
    },
  ]
  const ingredientPreparationInputs = [
    {
      preparation_id: "prep-1",
      ingredient_type_id: "white-sugar",
      amount: 100,
      unit_label: "g",
    },
    {
      preparation_id: "prep-1",
      ingredient_type_id: "water",
      amount: 100,
      unit_label: "ml",
    },
  ]

  it("returns the preparation's inputs (with resolved names/quantities/units) and ordered steps from existing data", () => {
    const result = resolveHomemadePreparation(
      "simple-syrup",
      ingredientPreparations,
      ingredientPreparationInputs,
      types,
    )
    expect(result).toEqual({
      id: "prep-1",
      name: "Simple Syrup",
      instructions: ingredientPreparations[0].instructions,
      inputs: [
        {
          ingredientTypeId: "white-sugar",
          name: "White Sugar",
          amount: 100,
          unitLabel: "g",
        },
        {
          ingredientTypeId: "water",
          name: "Water",
          amount: 100,
          unitLabel: "ml",
        },
      ],
    })
  })

  it("returns null when no preparation is configured for the type - the caller shows no section, not an empty one", () => {
    const result = resolveHomemadePreparation(
      "lemon",
      ingredientPreparations,
      ingredientPreparationInputs,
      types,
    )
    expect(result).toBeNull()
  })

  it("only ever matches by produces_type_id - the produced type's own page, not an input's page, gets the preparation", () => {
    const result = resolveHomemadePreparation(
      "white-sugar",
      ingredientPreparations,
      ingredientPreparationInputs,
      types,
    )
    expect(result).toBeNull()
  })
})
