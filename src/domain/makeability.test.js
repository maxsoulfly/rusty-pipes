import { describe, expect, it } from "vitest"
import { computeMakeability } from "./makeability"

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
  lime: "Lime",
}
const name = (id) => NAMES[id] ?? id

const WHITE_RUM_TO_SPICED = {
  from_type_id: "white-rum",
  to_type_id: "spiced-rum",
  flavor_note: "Adds sweetness and spice.",
}

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
})
