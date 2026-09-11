import { describe, expect, it } from "vitest"
import { computeAvail } from "./availability"
import { rankPurchaseRecommendations } from "./recommendations"

function recipe(overrides) {
  return {
    id: "r1",
    name: "Recipe",
    source: "private",
    avail: "almost",
    missingRequiredIds: [],
    missingOptionalIds: [],
    ...overrides,
  }
}

describe("rankPurchaseRecommendations", () => {
  it("ignores recipes not missing exactly one required ingredient", () => {
    const computed = [
      recipe({ id: "r1", avail: "unavail", missingRequiredIds: ["a", "b"] }),
      recipe({ id: "r2", avail: "perfect", missingRequiredIds: [] }),
    ]
    const types = new Map([
      ["a", { name: "A" }],
      ["b", { name: "B" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toEqual([])
  })

  it("suppresses a niche ingredient from general recommendations by default", () => {
    const computed = [recipe({ id: "r1", missingRequiredIds: ["absinthe"] })]
    const types = new Map([
      ["absinthe", { name: "Absinthe", bar_priority: "niche" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toEqual([])
  })

  it("suppresses specialized ingredients the same way as niche", () => {
    const computed = [recipe({ id: "r1", missingRequiredIds: ["chartreuse"] })]
    const types = new Map([
      ["chartreuse", { name: "Chartreuse", bar_priority: "specialized" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toEqual([])
  })

  it("still shows a niche ingredient if it unlocks a favorited recipe", () => {
    const computed = [recipe({ id: "r1", missingRequiredIds: ["absinthe"] })]
    const types = new Map([
      ["absinthe", { name: "Absinthe", bar_priority: "niche" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(["r1"]),
      wantToMakeIds: new Set(),
    })
    expect(result).toHaveLength(1)
    expect(result[0].ingredientTypeId).toBe("absinthe")
  })

  it("still shows a niche ingredient if it unlocks a want-to-make recipe", () => {
    const computed = [recipe({ id: "r1", missingRequiredIds: ["absinthe"] })]
    const types = new Map([
      ["absinthe", { name: "Absinthe", bar_priority: "niche" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(["r1"]),
    })
    expect(result).toHaveLength(1)
  })

  it("ranks a favorite/want-to-make unlock above a classic unlock", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Fav Recipe",
        source: "private",
        missingRequiredIds: ["gin"],
      }),
      recipe({
        id: "r2",
        name: "Classic Recipe",
        source: "classic",
        missingRequiredIds: ["vodka"],
      }),
    ]
    const types = new Map([
      ["gin", { name: "Gin", bar_priority: "common" }],
      ["vodka", { name: "Vodka", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(["r1"]),
      wantToMakeIds: new Set(),
    })
    expect(result.map((c) => c.ingredientTypeId)).toEqual(["gin", "vodka"])
  })

  it("ranks a classic unlock above a non-classic essential/common unlock", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Classic Recipe",
        source: "classic",
        missingRequiredIds: ["vodka"],
      }),
      recipe({
        id: "r2",
        name: "Private Recipe",
        source: "private",
        missingRequiredIds: ["rum"],
      }),
    ]
    const types = new Map([
      ["vodka", { name: "Vodka", bar_priority: "common" }],
      ["rum", { name: "Rum", bar_priority: "essential" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].ingredientTypeId).toBe("vodka")
  })

  it("does not grant the essential/common boost when recommend_by_default is false", () => {
    const computed = [
      recipe({ id: "r1", name: "R1", missingRequiredIds: ["a"] }),
      recipe({ id: "r2", name: "R2", missingRequiredIds: ["b"] }),
    ]
    const types = new Map([
      [
        "a",
        { name: "A", bar_priority: "essential", recommend_by_default: false },
      ],
      ["b", { name: "B", bar_priority: "common", recommend_by_default: true }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].ingredientTypeId).toBe("b")
  })

  it("breaks ties by number of recipes unlocked", () => {
    const computed = [
      recipe({ id: "r1", name: "R1", missingRequiredIds: ["a"] }),
      recipe({ id: "r2", name: "R2", missingRequiredIds: ["a"] }),
      recipe({ id: "r3", name: "R3", missingRequiredIds: ["b"] }),
    ]
    const types = new Map([
      ["a", { name: "A", bar_priority: "common" }],
      ["b", { name: "B", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].ingredientTypeId).toBe("a")
    expect(result[0].unlockCount).toBe(2)
  })

  it("uses the good-enough-to-perfect upgrade count as the final tiebreak", () => {
    const computed = [
      recipe({ id: "r1", name: "R1", missingRequiredIds: ["a"] }),
      recipe({ id: "r2", name: "R2", missingRequiredIds: ["b"] }),
      recipe({
        id: "r3",
        name: "R3",
        avail: "good",
        missingRequiredIds: [],
        missingOptionalIds: ["a"],
      }),
    ]
    const types = new Map([
      ["a", { name: "A", bar_priority: "common" }],
      ["b", { name: "B", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].ingredientTypeId).toBe("a")
    expect(result[0].upgradeCount).toBe(1)
  })

  it("respects the limit option", () => {
    const computed = [
      recipe({ id: "r1", missingRequiredIds: ["a"] }),
      recipe({ id: "r2", missingRequiredIds: ["b"] }),
      recipe({ id: "r3", missingRequiredIds: ["c"] }),
    ]
    const types = new Map([
      ["a", { name: "A" }],
      ["b", { name: "B" }],
      ["c", { name: "C" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
      limit: 2,
    })
    expect(result).toHaveLength(2)
  })

  it("builds a plain-language reason mentioning unlocked classics", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Negroni",
        source: "classic",
        missingRequiredIds: ["campari"],
      }),
    ]
    const types = new Map([
      ["campari", { name: "Campari", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].reason).toBe("Unlocks 1 classic")
  })

  it("never recommends a flagged household basic (Concept 1) - a recipe missing only Ice is not a candidate", () => {
    const cocktail = {
      id: "r1",
      name: "Gin on the Rocks",
      source: "classic",
      ings: [
        { ingId: "gin", role: "required", alternativeIds: [] },
        { ingId: "ice", role: "required", alternativeIds: [] },
      ],
    }
    // Run through the real engine with Ice flagged assumed-available.
    const computed = [
      {
        ...cocktail,
        ...computeAvail(
          cocktail,
          new Set(["gin"]),
          (id) => id,
          new Set(["ice"]),
        ),
      },
    ]
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: new Map([
        ["ice", { name: "Ice", bar_priority: "common" }],
      ]),
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toEqual([])
  })

  // ── Stage D.4: unlocks vs. restores-original ──────────────────────────

  it("does not count an already-adapted cocktail's last missing ingredient as a fresh unlock", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Daiquiri",
        source: "classic",
        missingRequiredIds: ["white-rum"],
        display: { tier: "adapted" },
      }),
    ]
    const types = new Map([
      ["white-rum", { name: "White Rum", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toHaveLength(1)
    expect(result[0].unlockCount).toBe(0)
    expect(result[0].restoreCount).toBe(1)
    expect(result[0].reason).toBe(
      "Also lets you make the original version of 1 already-possible recipe",
    )
  })

  it("ranks a genuine unlock above a candidate that only restores an original", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Genuinely Almost",
        missingRequiredIds: ["gin"],
      }),
      recipe({
        id: "r2",
        name: "Already Adapted",
        missingRequiredIds: ["white-rum"],
        display: { tier: "adapted" },
      }),
    ]
    const types = new Map([
      ["gin", { name: "Gin", bar_priority: "common" }],
      ["white-rum", { name: "White Rum", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result.map((c) => c.ingredientTypeId)).toEqual(["gin", "white-rum"])
  })

  it("still ranks a genuine unlock above a restore-only candidate even when the restore count is larger", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "One Genuine Unlock",
        missingRequiredIds: ["gin"],
      }),
      recipe({
        id: "r2",
        name: "Adapted A",
        missingRequiredIds: ["white-rum"],
        display: { tier: "adapted" },
      }),
      recipe({
        id: "r3",
        name: "Adapted B",
        missingRequiredIds: ["white-rum"],
        display: { tier: "adapted" },
      }),
      recipe({
        id: "r4",
        name: "Adapted C",
        missingRequiredIds: ["white-rum"],
        display: { tier: "adapted" },
      }),
    ]
    const types = new Map([
      ["gin", { name: "Gin", bar_priority: "common" }],
      ["white-rum", { name: "White Rum", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].ingredientTypeId).toBe("gin")
    expect(result[1].ingredientTypeId).toBe("white-rum")
    expect(result[1].restoreCount).toBe(3)
  })

  it("breaks a tie between two restore-only candidates by restore count", () => {
    const computed = [
      recipe({
        id: "r1",
        name: "Adapted A",
        missingRequiredIds: ["a"],
        display: { tier: "adapted" },
      }),
      recipe({
        id: "r2",
        name: "Adapted B1",
        missingRequiredIds: ["b"],
        display: { tier: "adapted" },
      }),
      recipe({
        id: "r3",
        name: "Adapted B2",
        missingRequiredIds: ["b"],
        display: { tier: "adapted" },
      }),
    ]
    const types = new Map([
      ["a", { name: "A", bar_priority: "common" }],
      ["b", { name: "B", bar_priority: "common" }],
    ])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result.map((c) => c.ingredientTypeId)).toEqual(["b", "a"])
  })

  it("existing 'Unlocks N' behavior is unchanged when nothing is adapted", () => {
    const computed = [
      recipe({ id: "r1", name: "R1", missingRequiredIds: ["a"] }),
      recipe({ id: "r2", name: "R2", missingRequiredIds: ["a"] }),
    ]
    const types = new Map([["a", { name: "A", bar_priority: "common" }]])
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: types,
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result[0].reason).toBe("Unlocks 2 recipes")
    expect(result[0].restoreCount).toBe(0)
  })

  it("never recommends a prepared ingredient the user can already make from an owned raw one (Concept 2)", () => {
    const cocktail = {
      id: "r1",
      name: "Whiskey Sour",
      source: "classic",
      ings: [
        { ingId: "bourbon", role: "required", alternativeIds: [] },
        { ingId: "lemon-juice", role: "required", alternativeIds: [] },
      ],
    }
    // The user owns Bourbon and a whole Lemon; a Lemon -> Lemon Juice
    // conversion exists, so the recipe resolves to "perfect" and Lemon Juice
    // must not surface as a purchase suggestion.
    const computed = [
      {
        ...cocktail,
        ...computeAvail(
          cocktail,
          new Set(["bourbon", "lemon"]),
          (id) => id,
          new Set(),
          [
            {
              rawTypeId: "lemon",
              preparedTypeId: "lemon-juice",
              guidance: "Squeeze fresh juice from Lemon",
            },
          ],
        ),
      },
    ]
    const result = rankPurchaseRecommendations({
      computed,
      ingredientTypesById: new Map([
        ["lemon-juice", { name: "Lemon Juice", bar_priority: "common" }],
      ]),
      favoriteIds: new Set(),
      wantToMakeIds: new Set(),
    })
    expect(result).toEqual([])
  })
})
