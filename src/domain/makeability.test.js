import { describe, expect, it } from "vitest"
import { computeMakeability, isPreparationSatisfiable } from "./makeability"

function component(overrides) {
  return {
    ingId: "white-rum",
    alternativeIds: [],
    amount: 30,
    unitLabel: "ml",
    role: "required",
    ...overrides,
  }
}

const NAMES = {
  "white-rum": "White Rum",
  "spiced-rum": "Spiced Rum",
  "gold-rum": "Gold Rum",
  "lime-juice": "Lime Juice",
  "lemon-juice": "Lemon Juice",
  "simple-syrup": "Simple Syrup",
  "white-sugar": "White Sugar",
  water: "Water",
  lime: "Lime",
}
const name = (id) => NAMES[id] ?? id

const WHITE_RUM_TO_SPICED = {
  from_type_id: "white-rum",
  to_type_id: "spiced-rum",
  flavor_note: "Adds sweetness and spice.",
}

const LIME_JUICE_TO_LEMON = {
  from_type_id: "lime-juice",
  to_type_id: "lemon-juice",
  flavor_note: "Tangier, less floral.",
}

const SIMPLE_SYRUP_PREP = {
  id: "prep-simple-syrup",
  name: "Simple Syrup",
  instructions: ["Combine equal parts sugar and water", "Heat until dissolved"],
  inputs: [{ ingredientTypeId: "white-sugar" }, { ingredientTypeId: "water" }],
}
const SIMPLE_SYRUP_BY_PRODUCED = new Map([["simple-syrup", SIMPLE_SYRUP_PREP]])

describe("computeMakeability", () => {
  it("display mirrors strict when the recipe is already perfect - no adaptation attempted", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const { strict, adapted, display } = computeMakeability(
      cocktail,
      new Set(["white-rum"]),
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED],
    )
    expect(strict.avail).toBe("perfect")
    expect(adapted).toBeNull()
    expect(display).toEqual({ tier: "perfect", label: null, isAdapted: false })
  })

  it("display mirrors strict when the recipe is good_enough - no adaptation attempted", () => {
    const cocktail = {
      ings: [
        component({ ingId: "white-rum", role: "required" }),
        component({ ingId: "lime", role: "garnish" }),
      ],
    }
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(["white-rum"]),
      name,
    )
    expect(adapted).toBeNull()
    expect(display).toEqual({ tier: "good", label: null, isAdapted: false })
  })

  it("adapts via an owned general substitute - the White Rum / Spiced Rum acceptance case", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const { strict, adapted, display } = computeMakeability(
      cocktail,
      new Set(["spiced-rum"]), // owns the substitute, not White Rum itself
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED],
    )
    // strict is untouched - White Rum still genuinely missing (a single
    // missing required ingredient reads "almost" per computeAvail()).
    expect(strict.avail).toBe("almost")
    expect(strict.missingRequiredIds).toEqual(["white-rum"])

    expect(adapted).toEqual({
      tier: "perfect",
      label: "Make with substitutions",
      resolvedRequired: [
        {
          ingId: "white-rum",
          via: "substitute",
          matchedId: "spiced-rum",
          matchedName: "Spiced Rum",
          note: "Adds sweetness and spice.",
        },
      ],
    })
    // The one thing every primary-status surface reads - never contradicts
    // strict by showing "unavailable" next to a makeable message.
    expect(display).toEqual({
      tier: "adapted",
      label: "Make with substitutions",
      isAdapted: true,
    })
  })

  it("does not adapt when the substitute is configured but not owned - stays the honest strict tier", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(), // owns neither White Rum nor Spiced Rum
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED],
    )
    expect(adapted).toBeNull()
    expect(display).toEqual({ tier: "almost", label: null, isAdapted: false })
  })

  it("is all-or-nothing across required components - one unresolvable component blocks the whole adaptation", () => {
    const cocktail = {
      ings: [
        component({ ingId: "white-rum", role: "required" }),
        component({ ingId: "lime-juice", role: "required" }),
      ],
    }
    // White Rum resolves via an owned substitute, but Lime Juice has no
    // configured substitute at all - the Daiquiri requirement: "Sugar
    // alone must not imply Simple Syrup" generalizes to "one resolved
    // ingredient must not imply the whole recipe is adapted."
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(["spiced-rum"]),
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED],
    )
    expect(adapted).toBeNull()
    expect(display.isAdapted).toBe(false)
    expect(display.tier).toBe("unavail")
  })

  it("never chains - owning a substitute's own substitute does not resolve the original component", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const rows = [
      WHITE_RUM_TO_SPICED,
      { from_type_id: "spiced-rum", to_type_id: "gold-rum", flavor_note: "x" },
    ]
    // Owns Gold Rum only - a hop through Spiced Rum's own substitute list
    // would be chaining, which is explicitly not allowed.
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(["gold-rum"]),
      name,
      undefined,
      undefined,
      rows,
    )
    expect(adapted).toBeNull()
    expect(display.isAdapted).toBe(false)
  })

  it("does not invent a reverse substitution - owning the general-substitute's target does not adapt the reverse-missing recipe", () => {
    // Only "white-rum -> spiced-rum" is configured. A recipe missing
    // Spiced Rum, with White Rum owned, must NOT adapt - there is no
    // "spiced-rum -> white-rum" row.
    const cocktail = { ings: [component({ ingId: "spiced-rum" })] }
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(["white-rum"]),
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED],
    )
    expect(adapted).toBeNull()
    expect(display.isAdapted).toBe(false)
  })

  it("household basics and form conversions still resolve through strict, unaffected by the adapted layer", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const { strict, adapted, display } = computeMakeability(
      cocktail,
      new Set(),
      name,
      new Set(["white-rum"]), // household basic
    )
    expect(strict.avail).toBe("perfect")
    expect(strict.householdBasics["white-rum"]).toBeTruthy()
    expect(adapted).toBeNull()
    expect(display.tier).toBe("perfect")
  })

  it("is null-safe with no general substitutes provided at all", () => {
    const cocktail = { ings: [component({ ingId: "white-rum" })] }
    const { adapted, display } = computeMakeability(cocktail, new Set(), name)
    expect(adapted).toBeNull()
    expect(display).toEqual({ tier: "almost", label: null, isAdapted: false })
  })

  // ── Stage D.3: tier 5, satisfiable preparations ──────────────────────

  it("adapts via a satisfiable preparation - all inputs owned", () => {
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    const { strict, adapted, display } = computeMakeability(
      cocktail,
      new Set(["white-sugar", "water"]),
      name,
      undefined,
      undefined,
      [],
      SIMPLE_SYRUP_BY_PRODUCED,
    )
    expect(strict.missingRequiredIds).toEqual(["simple-syrup"])
    expect(adapted).toEqual({
      tier: "perfect",
      label: "Prepare Simple Syrup first",
      resolvedRequired: [
        {
          ingId: "simple-syrup",
          via: "preparation",
          preparationId: "prep-simple-syrup",
          producedTypeId: "simple-syrup",
          producedName: "Simple Syrup",
          instructions: SIMPLE_SYRUP_PREP.instructions,
          inputs: [
            {
              ingredientTypeId: "white-sugar",
              name: "White Sugar",
              amount: undefined,
              unitLabel: undefined,
            },
            {
              ingredientTypeId: "water",
              name: "Water",
              amount: undefined,
              unitLabel: undefined,
            },
          ],
        },
      ],
    })
    expect(display).toEqual({
      tier: "adapted",
      label: "Prepare Simple Syrup first",
      isAdapted: true,
    })
  })

  it("does not adapt when only one preparation input is available - Sugar alone must not imply Simple Syrup", () => {
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    const { adapted, display } = computeMakeability(
      cocktail,
      new Set(["white-sugar"]), // no Water
      name,
      undefined,
      undefined,
      [],
      SIMPLE_SYRUP_BY_PRODUCED,
    )
    expect(adapted).toBeNull()
    expect(display.isAdapted).toBe(false)
  })

  it("resolves a preparation via household basics satisfying its inputs", () => {
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    const { adapted } = computeMakeability(
      cocktail,
      new Set(),
      name,
      new Set(["white-sugar", "water"]), // household basics, not owned
      undefined,
      [],
      SIMPLE_SYRUP_BY_PRODUCED,
    )
    expect(adapted).not.toBeNull()
    expect(adapted.resolvedRequired[0].via).toBe("preparation")
  })

  it("never marks the produced ingredient itself as owned - strict still reports it missing, and `owned` is never mutated", () => {
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    const owned = new Set(["white-sugar", "water"])
    const { strict, adapted } = computeMakeability(
      cocktail,
      owned,
      name,
      undefined,
      undefined,
      [],
      SIMPLE_SYRUP_BY_PRODUCED,
    )
    expect(adapted).not.toBeNull()
    expect(strict.missingRequiredIds).toEqual(["simple-syrup"])
    expect(owned.has("simple-syrup")).toBe(false)
    expect(owned).toEqual(new Set(["white-sugar", "water"]))
  })

  it("combines a substitution and a preparation into one composed label - the Daiquiri acceptance scenario", () => {
    const cocktail = {
      ings: [
        component({ ingId: "white-rum" }),
        component({ ingId: "lime-juice" }),
        component({ ingId: "simple-syrup" }),
      ],
    }
    const owned = new Set(["spiced-rum", "lemon-juice", "white-sugar", "water"])
    const { adapted, display } = computeMakeability(
      cocktail,
      owned,
      name,
      undefined,
      undefined,
      [WHITE_RUM_TO_SPICED, LIME_JUICE_TO_LEMON],
      SIMPLE_SYRUP_BY_PRODUCED,
    )
    expect(adapted.resolvedRequired.map((r) => r.via).sort()).toEqual([
      "preparation",
      "substitute",
      "substitute",
    ])
    expect(display.tier).toBe("adapted")
    expect(display.label).toBe(
      "Make with substitutions · Prepare Simple Syrup first",
    )
  })

  it("never chases a preparation input's own preparability - depth capped at exactly one level", () => {
    // Simple Syrup needs White Sugar + Water. White Sugar hypothetically has
    // its own configured preparation (from raw cane) - tier 5 must not walk
    // into it when checking Simple Syrup's own inputs; only strict tiers 1-2
    // count for an input, never another preparation.
    const preparations = new Map([
      ["simple-syrup", SIMPLE_SYRUP_PREP],
      [
        "white-sugar",
        {
          id: "prep-sugar",
          name: "White Sugar",
          inputs: [{ ingredientTypeId: "raw-cane" }],
        },
      ],
    ])
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    // Owns raw-cane and water, but genuinely not White Sugar itself - if
    // chaining happened, White Sugar would incorrectly resolve via its own
    // preparation and Simple Syrup would wrongly adapt too.
    const { adapted } = computeMakeability(
      cocktail,
      new Set(["raw-cane", "water"]),
      name,
      undefined,
      undefined,
      [],
      preparations,
    )
    expect(adapted).toBeNull()
  })

  it("is null-safe with no preparations map provided at all", () => {
    const cocktail = { ings: [component({ ingId: "simple-syrup" })] }
    const { adapted } = computeMakeability(
      cocktail,
      new Set(["white-sugar", "water"]),
      name,
    )
    expect(adapted).toBeNull()
  })
})

describe("isPreparationSatisfiable", () => {
  it("is true when every input is owned", () => {
    expect(
      isPreparationSatisfiable(
        [{ ingredientTypeId: "white-sugar" }, { ingredientTypeId: "water" }],
        new Set(["white-sugar", "water"]),
      ),
    ).toBe(true)
  })

  it("is false when any input is missing", () => {
    expect(
      isPreparationSatisfiable(
        [{ ingredientTypeId: "white-sugar" }, { ingredientTypeId: "water" }],
        new Set(["white-sugar"]),
      ),
    ).toBe(false)
  })

  it("counts a household basic as satisfying an input", () => {
    expect(
      isPreparationSatisfiable(
        [{ ingredientTypeId: "water" }],
        new Set(),
        new Set(["water"]),
      ),
    ).toBe(true)
  })

  it("counts a Can-provide form conversion as satisfying an input (tier 2)", () => {
    expect(
      isPreparationSatisfiable(
        [{ ingredientTypeId: "lemon-juice" }],
        new Set(["lemon"]),
        undefined,
        [
          {
            rawTypeId: "lemon",
            preparedTypeId: "lemon-juice",
            guidance: "Squeeze fresh juice from Lemon",
          },
        ],
      ),
    ).toBe(true)
  })

  it("is vacuously true for an empty input list", () => {
    expect(isPreparationSatisfiable([], new Set())).toBe(true)
  })

  it("is null-safe when inputs is null/undefined", () => {
    expect(isPreparationSatisfiable(undefined, new Set())).toBe(true)
  })
})
