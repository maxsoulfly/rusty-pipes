import { describe, expect, it } from "vitest"
import {
  computeAvail,
  formatAmount,
  mlToOz,
  ozToMl,
  resolveOwnedIngredientTypes,
} from "./availability"

function component(overrides) {
  return {
    ingId: "gin",
    alternativeIds: [],
    amount: 30,
    unitLabel: "ml",
    role: "required",
    ...overrides,
  }
}

describe("computeAvail", () => {
  it("is perfect when every required, optional, and garnish component is owned", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "lime", role: "optional" }),
        component({ ingId: "mint", role: "garnish" }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["gin", "lime", "mint"]))
    expect(result.avail).toBe("perfect")
    expect(result.missingRequired).toEqual([])
    expect(result.missingOptional).toEqual([])
  })

  it("is good_enough when every required component is owned but optional/garnish are missing", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "lime", role: "optional" }),
        component({ ingId: "mint", role: "garnish" }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["gin"]))
    expect(result.avail).toBe("good")
    expect(result.missingRequired).toEqual([])
    expect(result.missingOptional).toEqual(["lime", "mint"])
    expect(result.missingOptionalIds).toEqual(["lime", "mint"])
  })

  it("is almost when exactly one required component is missing", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "vermouth", role: "required" }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["gin"]))
    expect(result.avail).toBe("almost")
    expect(result.missingRequired).toEqual(["vermouth"])
    expect(result.missingRequiredIds).toEqual(["vermouth"])
  })

  it("is unavailable when two or more required components are missing", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "vermouth", role: "required" }),
        component({ ingId: "campari", role: "required" }),
      ],
    }
    const result = computeAvail(cocktail, new Set())
    expect(result.avail).toBe("unavail")
    expect(result.missingRequired).toHaveLength(3)
  })

  it("satisfies a required component via a substitution alternative", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "gin",
          alternativeIds: ["vodka"],
          role: "required",
        }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["vodka"]))
    expect(result.avail).toBe("perfect")
    expect(result.missingRequired).toEqual([])
  })

  it("records which substitution alternative satisfied a component", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "gin",
          alternativeIds: ["vodka"],
          role: "required",
        }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["vodka"]), (id) =>
      id === "vodka" ? "Vodka" : id,
    )
    expect(result.substitutions).toEqual({
      gin: { matchedId: "vodka", matchedName: "Vodka" },
    })
  })

  it("does not record a substitution when the primary ingredient itself is owned", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "gin",
          alternativeIds: ["vodka"],
          role: "required",
        }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["gin", "vodka"]))
    expect(result.substitutions).toEqual({})
  })

  it("still reports the primary ingredient as missing when no alternative is owned either", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "gin",
          alternativeIds: ["vodka"],
          role: "required",
        }),
      ],
    }
    const result = computeAvail(cocktail, new Set(["rum"]))
    expect(result.missingRequiredIds).toEqual(["gin"])
  })

  it("resolves missing ingredient ids to display names via the provided resolver", () => {
    const cocktail = { ings: [component({ ingId: "gin", role: "required" })] }
    const result = computeAvail(cocktail, new Set(), (id) =>
      id === "gin" ? "Gin" : id,
    )
    expect(result.missingRequired).toEqual(["Gin"])
  })

  it("falls back to the raw id when no resolver is given", () => {
    const cocktail = { ings: [component({ ingId: "gin", role: "required" })] }
    const result = computeAvail(cocktail, new Set())
    expect(result.missingRequired).toEqual(["gin"])
  })
})

describe("mlToOz", () => {
  it("converts common bar measures to friendly fractions", () => {
    expect(mlToOz(15)).toBe("½ oz")
    expect(mlToOz(22)).toBe("¾ oz")
    expect(mlToOz(30)).toBe("1 oz")
    expect(mlToOz(45)).toBe("1½ oz")
    expect(mlToOz(60)).toBe("2 oz")
  })

  it("falls back to a decimal for uncommon amounts", () => {
    expect(mlToOz(100)).toBe("3.4 oz")
  })
})

describe("ozToMl", () => {
  it("converts common bar measures to whole ml, the inverse of mlToOz", () => {
    expect(ozToMl(0.5)).toBe(15)
    expect(ozToMl(0.75)).toBe(22)
    expect(ozToMl(1)).toBe(30)
    expect(ozToMl(1.5)).toBe(44)
    expect(ozToMl(2)).toBe(59)
  })
})

describe("formatAmount", () => {
  it("displays ml amounts as-is when the unit preference is ml", () => {
    expect(formatAmount({ amount: 30, unitLabel: "ml" }, "ml")).toBe("30ml")
  })

  it("converts to oz for display without mutating the input (stored data is never rewritten)", () => {
    const recipeIng = { amount: 30, unitLabel: "ml" }
    const snapshot = { ...recipeIng }
    const result = formatAmount(recipeIng, "oz")
    expect(result).toBe("1 oz")
    expect(recipeIng).toEqual(snapshot)
  })

  it("passes non-volume semantic units through verbatim regardless of unit preference", () => {
    const recipeIng = { amount: 0, unitLabel: "2 dashes" }
    expect(formatAmount(recipeIng, "ml")).toBe("2 dashes")
    expect(formatAmount(recipeIng, "oz")).toBe("2 dashes")
  })
})

describe("resolveOwnedIngredientTypes", () => {
  const types = [
    { id: "spirit", parent_type_id: null },
    { id: "gin", parent_type_id: "spirit" },
    { id: "london-dry-gin", parent_type_id: "gin" },
    { id: "vodka", parent_type_id: "spirit" },
  ]

  it("includes directly owned types", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(["gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
    })
    expect(owned.has("gin")).toBe(true)
  })

  it("satisfies an ancestor type when a more specific child type is owned", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(["london-dry-gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
    })
    expect(owned.has("london-dry-gin")).toBe(true)
    expect(owned.has("gin")).toBe(true)
    expect(owned.has("spirit")).toBe(true)
  })

  it("does not satisfy a child type just because its parent is owned", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(["gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
    })
    expect(owned.has("london-dry-gin")).toBe(false)
  })

  it("does not leak satisfaction across unrelated branches of the hierarchy", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(["gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
    })
    expect(owned.has("vodka")).toBe(false)
  })

  it("satisfies a type via an owned product mapped to it, including that type's ancestors", () => {
    const products = [{ id: "product-1", ingredient_type_id: "london-dry-gin" }]
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(["product-1"]),
      products,
      ingredientTypes: types,
    })
    expect(owned.has("london-dry-gin")).toBe(true)
    expect(owned.has("gin")).toBe(true)
    expect(owned.has("spirit")).toBe(true)
  })

  it("ignores a product that isn't actually owned", () => {
    const products = [{ id: "product-1", ingredient_type_id: "gin" }]
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(),
      products,
      ingredientTypes: types,
    })
    expect(owned.has("gin")).toBe(false)
  })

  it("includes an assumed-available type with no real ownership at all", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
      assumedAvailableTypeIds: new Set(["gin"]),
    })
    expect(owned.has("gin")).toBe(true)
  })

  it("does not propagate an assumed-available type upward to its ancestors", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
      assumedAvailableTypeIds: new Set(["london-dry-gin"]),
    })
    expect(owned.has("london-dry-gin")).toBe(true)
    expect(owned.has("gin")).toBe(false)
    expect(owned.has("spirit")).toBe(false)
  })

  it("does not propagate an assumed-available type downward to its children", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
      assumedAvailableTypeIds: new Set(["gin"]),
    })
    expect(owned.has("gin")).toBe(true)
    expect(owned.has("london-dry-gin")).toBe(false)
  })

  it("does not let an assumed-available type leak across unrelated branches", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
      assumedAvailableTypeIds: new Set(["gin"]),
    })
    expect(owned.has("vodka")).toBe(false)
  })

  it("still applies the real ancestor walk to genuinely owned types when assumed ids are also passed", () => {
    const owned = resolveOwnedIngredientTypes({
      ownedTypeIds: new Set(["london-dry-gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
      assumedAvailableTypeIds: new Set(["vodka"]),
    })
    // owned child still walks up
    expect(owned.has("gin")).toBe(true)
    expect(owned.has("spirit")).toBe(true)
    // assumed id is exact-only, no walk
    expect(owned.has("vodka")).toBe(true)
  })

  it("produces the exact same set as before when no assumed ids are passed", () => {
    const args = {
      ownedTypeIds: new Set(["london-dry-gin"]),
      ownedProductIds: new Set(),
      products: [],
      ingredientTypes: types,
    }
    const before = resolveOwnedIngredientTypes(args)
    const withUndefined = resolveOwnedIngredientTypes({
      ...args,
      assumedAvailableTypeIds: undefined,
    })
    expect([...withUndefined].sort()).toEqual([...before].sort())
    expect([...before].sort()).toEqual(
      ["london-dry-gin", "gin", "spirit"].sort(),
    )
  })
})

describe("computeAvail — household basics (Concept 1)", () => {
  it("an assumed basic alone satisfies its exact component (no inventory row)", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "ice", role: "required" }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin"]),
      undefined,
      new Set(["ice"]),
    )
    expect(result.avail).toBe("perfect")
    expect(result.missingRequired).toEqual([])
    expect(result.householdBasics).toEqual({ ice: { name: "ice" } })
  })

  it("a recipe missing only a flagged basic is not 'almost' and reports nothing missing (Buy Next never sees it)", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "ice", role: "required" }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin"]),
      undefined,
      new Set(["ice"]),
    )
    expect(result.avail).not.toBe("almost")
    expect(result.missingRequiredIds).toEqual([])
  })

  it("does not tag a component whose own id is not a flagged basic", () => {
    const cocktail = {
      ings: [component({ ingId: "gin", role: "required" })],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin"]),
      undefined,
      new Set(["ice"]),
    )
    expect(result.householdBasics).toEqual({})
  })

  it("never cross-satisfies a different type: a flagged basic only covers its own exact id", () => {
    // "ice" is flagged; a component that needs "crushed-ice" is unrelated and
    // has no alternativeIds - it must still read as missing.
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({
          ingId: "crushed-ice",
          role: "required",
          alternativeIds: [],
        }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin"]),
      undefined,
      new Set(["ice"]),
    )
    expect(result.avail).toBe("almost")
    expect(result.missingRequiredIds).toEqual(["crushed-ice"])
    expect(result.householdBasics).toEqual({})
  })

  it("a flagged basic participates in an EXISTING authored alternative exactly like ownership would - and reads as a substitution, not a household basic", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({
          ingId: "crushed-ice",
          role: "required",
          alternativeIds: ["ice"],
        }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin"]),
      (id) => id,
      new Set(["ice"]),
    )
    expect(result.avail).toBe("perfect")
    expect(result.substitutions).toEqual({
      "crushed-ice": { matchedId: "ice", matchedName: "ice" },
    })
    expect(result.householdBasics).toEqual({})
  })

  it("omitting householdBasicIds reproduces the pre-Stage-2 output exactly", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "ice", role: "required" }),
      ],
    }
    const withArg = computeAvail(
      cocktail,
      new Set(["gin"]),
      undefined,
      new Set(),
    )
    const withoutArg = computeAvail(cocktail, new Set(["gin"]))
    expect(withoutArg.avail).toBe("almost")
    expect(withoutArg.missingRequiredIds).toEqual(["ice"])
    expect(withoutArg.householdBasics).toEqual({})
    expect(withArg).toEqual(withoutArg)
  })

  it("normal ownership is unchanged when a basics set is also supplied", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "vermouth", role: "required" }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin", "vermouth"]),
      undefined,
      new Set(["ice"]),
    )
    expect(result.avail).toBe("perfect")
    expect(result.householdBasics).toEqual({})
  })
})

describe("computeAvail — ingredient form conversions (Concept 2)", () => {
  const LEMON_CONV = [
    {
      rawTypeId: "lemon",
      preparedTypeId: "lemon-juice",
      guidance: "Squeeze fresh juice from Lemon",
    },
  ]

  it("owning the raw ingredient satisfies a component that requires its prepared form", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "lemon-juice", role: "required" }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin", "lemon"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("perfect")
    expect(result.missingRequiredIds).toEqual([])
    expect(result.formConversions).toEqual({
      "lemon-juice": {
        rawId: "lemon",
        rawName: "lemon",
        guidance: "Squeeze fresh juice from Lemon",
      },
    })
    expect(result.substitutions).toEqual({})
    expect(result.householdBasics).toEqual({})
  })

  it("is one-directional: owning the prepared form never satisfies a raw requirement", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        // recipe wants a whole Lemon (e.g. a wedge); only juice is owned
        component({ ingId: "lemon", role: "required", alternativeIds: [] }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin", "lemon-juice"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("almost")
    expect(result.missingRequiredIds).toEqual(["lemon"])
    expect(result.formConversions).toEqual({})
  })

  it("exact availability wins over a form conversion (own both the fruit and the juice -> no guidance)", () => {
    const cocktail = {
      ings: [component({ ingId: "lemon-juice", role: "required" })],
    }
    const result = computeAvail(
      cocktail,
      new Set(["lemon", "lemon-juice"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("perfect")
    expect(result.formConversions).toEqual({})
    expect(result.substitutions).toEqual({})
  })

  it("a household basic on the component's own id also wins over a form conversion", () => {
    const cocktail = {
      ings: [component({ ingId: "lemon-juice", role: "required" })],
    }
    const result = computeAvail(
      cocktail,
      new Set(["lemon"]),
      (id) => id,
      new Set(["lemon-juice"]),
      LEMON_CONV,
    )
    expect(result.avail).toBe("perfect")
    expect(result.formConversions).toEqual({})
    expect(result.householdBasics).toEqual({
      "lemon-juice": { name: "lemon-juice" },
    })
  })

  it("a form conversion wins over an authored substitution when both could apply", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "lemon-juice",
          role: "required",
          // an admin also listed lime juice as an allowed alternative here
          alternativeIds: ["lime-juice"],
        }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["lemon", "lime-juice"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("perfect")
    expect(result.formConversions).toEqual({
      "lemon-juice": {
        rawId: "lemon",
        rawName: "lemon",
        guidance: "Squeeze fresh juice from Lemon",
      },
    })
    // the substitution label must NOT also be produced
    expect(result.substitutions).toEqual({})
  })

  it("falls back to the authored substitution when the raw ingredient is not owned", () => {
    const cocktail = {
      ings: [
        component({
          ingId: "lemon-juice",
          role: "required",
          alternativeIds: ["lime-juice"],
        }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["lime-juice"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("perfect")
    expect(result.formConversions).toEqual({})
    expect(result.substitutions).toEqual({
      "lemon-juice": { matchedId: "lime-juice", matchedName: "lime-juice" },
    })
  })

  it("never applies a conversion to an unrelated component that shares nothing but a category", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        // owning Lemon must NOT satisfy an Orange Juice requirement
        component({ ingId: "orange-juice", role: "required" }),
      ],
    }
    const result = computeAvail(
      cocktail,
      new Set(["gin", "lemon"]),
      (id) => id,
      undefined,
      LEMON_CONV,
    )
    expect(result.avail).toBe("almost")
    expect(result.missingRequiredIds).toEqual(["orange-juice"])
    expect(result.formConversions).toEqual({})
  })

  it("omitting formConversions reproduces the pre-Concept-2 output exactly", () => {
    const cocktail = {
      ings: [
        component({ ingId: "gin", role: "required" }),
        component({ ingId: "lemon-juice", role: "required" }),
      ],
    }
    const withEmpty = computeAvail(
      cocktail,
      new Set(["gin", "lemon"]),
      undefined,
      new Set(),
      [],
    )
    const withoutArg = computeAvail(cocktail, new Set(["gin", "lemon"]))
    expect(withoutArg.avail).toBe("almost")
    expect(withoutArg.missingRequiredIds).toEqual(["lemon-juice"])
    expect(withoutArg.formConversions).toEqual({})
    expect(withEmpty).toEqual(withoutArg)
  })

  it("supports more than one raw source for the same prepared type", () => {
    const cocktail = {
      ings: [component({ ingId: "lemon-juice", role: "required" })],
    }
    const conversions = [
      ...LEMON_CONV,
      {
        rawTypeId: "bottled-lemon",
        preparedTypeId: "lemon-juice",
        guidance: "Use bottled lemon juice",
      },
    ]
    const result = computeAvail(
      cocktail,
      new Set(["bottled-lemon"]),
      (id) => id,
      undefined,
      conversions,
    )
    expect(result.avail).toBe("perfect")
    expect(result.formConversions["lemon-juice"].guidance).toBe(
      "Use bottled lemon juice",
    )
  })
})
