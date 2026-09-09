import { describe, expect, it } from "vitest"
import { findRecipesUsingIngredient } from "./ingredientRecipeMatches"

const types = [
  { id: "whiskey", name: "Whiskey", parent_type_id: null },
  { id: "bourbon", name: "Bourbon", parent_type_id: "whiskey" },
  { id: "rye", name: "Rye Whiskey", parent_type_id: "whiskey" },
  { id: "gin", name: "Gin", parent_type_id: null },
  { id: "vodka", name: "Vodka", parent_type_id: null },
]

const products = [{ id: "product-tanqueray", ingredient_type_id: "gin" }]

function component(ingId, name, role, alternativeIds = []) {
  return { ingId, name, role, alternativeIds }
}

function recipe(id, name, avail, ings) {
  return { id, name, avail, ings }
}

describe("findRecipesUsingIngredient", () => {
  it("matches a recipe that requires the viewed type directly", () => {
    const martini = recipe("martini", "Martini", "perfect", [
      component("gin", "Gin", "required"),
    ])
    const results = findRecipesUsingIngredient([martini], { typeId: "gin" }, {
      types,
      products,
    })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("martini")
    expect(results[0].matchType).toBe("direct")
    expect(results[0].matches).toEqual([
      { ingId: "gin", ingName: "Gin", role: "required", matchType: "direct" },
    ])
  })

  it("preserves the recipe's real, already-computed avail unchanged - viewing never implies ownership", () => {
    const martini = recipe("martini", "Martini", "unavail", [
      component("gin", "Gin", "required"),
    ])
    const results = findRecipesUsingIngredient([martini], { typeId: "gin" }, {
      types,
      products,
    })
    expect(results[0].avail).toBe("unavail")
  })

  it("does NOT match a recipe requiring a specific child type when viewing the generic parent (never implies every whiskey satisfies every whiskey recipe)", () => {
    const oldFashioned = recipe("old-fashioned", "Old Fashioned", "unavail", [
      component("bourbon", "Bourbon", "required"),
    ])
    const results = findRecipesUsingIngredient(
      [oldFashioned],
      { typeId: "whiskey" },
      { types, products },
    )
    expect(results).toHaveLength(0)
  })

  it("matches a recipe requiring the generic parent when viewing a specific child (a child genuinely satisfies its ancestor)", () => {
    const hotToddy = recipe("hot-toddy", "Hot Toddy", "unavail", [
      component("whiskey", "Whiskey", "required"),
    ])
    const results = findRecipesUsingIngredient(
      [hotToddy],
      { typeId: "bourbon" },
      { types, products },
    )
    expect(results).toHaveLength(1)
    expect(results[0].matchType).toBe("direct")
  })

  it("does NOT match a recipe requiring a sibling child type", () => {
    const ryeCocktail = recipe("rye-cocktail", "Rye Cocktail", "unavail", [
      component("rye", "Rye Whiskey", "required"),
    ])
    const results = findRecipesUsingIngredient(
      [ryeCocktail],
      { typeId: "bourbon" },
      { types, products },
    )
    expect(results).toHaveLength(0)
  })

  it("resolves a viewed product to its mapped type, matching the same recipes as viewing that type directly", () => {
    const martini = recipe("martini", "Martini", "perfect", [
      component("gin", "Gin", "required"),
    ])
    const byProduct = findRecipesUsingIngredient(
      [martini],
      { productId: "product-tanqueray" },
      { types, products },
    )
    const byType = findRecipesUsingIngredient([martini], { typeId: "gin" }, {
      types,
      products,
    })
    expect(byProduct).toEqual(byType)
    expect(byProduct).toHaveLength(1)
  })

  it("matches as a substitution when only reachable via alternativeIds, naming the PRIMARY ingredient being replaced (for 'Can replace X' copy, not an active-substitution claim)", () => {
    const vodkaMartini = recipe("vodka-martini", "Vodka Martini", "good", [
      component("vodka", "Vodka", "required", ["gin"]),
    ])
    const results = findRecipesUsingIngredient(
      [vodkaMartini],
      { typeId: "gin" },
      { types, products },
    )
    expect(results).toHaveLength(1)
    expect(results[0].matchType).toBe("substitution")
    expect(results[0].matches).toEqual([
      {
        ingId: "vodka",
        ingName: "Vodka",
        role: "required",
        matchType: "substitution",
      },
    ])
  })

  it("reports the recipe-level matchType as 'direct' when at least one matching component is direct, even if another is substitution-only", () => {
    const mixed = recipe("mixed", "Mixed", "perfect", [
      component("gin", "Gin", "required"),
      component("vodka", "Vodka", "optional", ["gin"]),
    ])
    const results = findRecipesUsingIngredient([mixed], { typeId: "gin" }, {
      types,
      products,
    })
    expect(results[0].matchType).toBe("direct")
    expect(results[0].matches).toHaveLength(2)
  })

  it("matches components regardless of role - optional and garnish included, role preserved", () => {
    const gimlet = recipe("gimlet", "Gimlet", "good", [
      component("gin", "Gin", "optional"),
    ])
    const mojito = recipe("mojito", "Mojito", "good", [
      component("gin", "Gin", "garnish"),
    ])
    const results = findRecipesUsingIngredient(
      [gimlet, mojito],
      { typeId: "gin" },
      { types, products },
    )
    expect(results.map((r) => r.matches[0].role).sort()).toEqual([
      "garnish",
      "optional",
    ])
  })

  it("deduplicates a recipe with multiple matching components into one result, preserving every match's detail", () => {
    const doubleGin = recipe("double-gin", "Double Gin", "perfect", [
      component("gin", "Gin", "required"),
      component("gin", "Gin", "garnish"),
    ])
    const results = findRecipesUsingIngredient([doubleGin], { typeId: "gin" }, {
      types,
      products,
    })
    expect(results).toHaveLength(1)
    expect(results[0].matches).toHaveLength(2)
    expect(results[0].matches.map((m) => m.role)).toEqual([
      "required",
      "garnish",
    ])
  })

  it("excludes a recipe with no matching component at all", () => {
    const daiquiri = recipe("daiquiri", "Daiquiri", "perfect", [
      component("vodka", "Vodka", "required"),
    ])
    const results = findRecipesUsingIngredient([daiquiri], { typeId: "gin" }, {
      types,
      products,
    })
    expect(results).toHaveLength(0)
  })

  it("stays ownership-blind to household basics: viewing an unrelated ingredient never surfaces a recipe just because it also uses a flagged basic (Concept 1)", () => {
    // "ice" is a household basic elsewhere in the app, but this lookup takes
    // no assumed-available set - viewing Vodka must not pull in an Ice recipe.
    const typesWithIce = [
      ...types,
      { id: "ice", name: "Ice", parent_type_id: null },
    ]
    const ginAndIce = recipe("gin-rocks", "Gin on the Rocks", "perfect", [
      component("gin", "Gin", "required"),
      component("ice", "Ice", "required"),
    ])
    const results = findRecipesUsingIngredient(
      [ginAndIce],
      { typeId: "vodka" },
      { types: typesWithIce, products },
    )
    expect(results).toHaveLength(0)
  })

  it("never mutates its inputs - frozen computed/types/products still work, proving no write is ever attempted", () => {
    const frozenComponent = Object.freeze(component("gin", "Gin", "required"))
    const frozenRecipe = Object.freeze(
      recipe("martini", "Martini", "perfect", Object.freeze([frozenComponent])),
    )
    const frozenComputed = Object.freeze([frozenRecipe])
    const frozenTypes = Object.freeze(types.map((t) => Object.freeze({ ...t })))
    const frozenProducts = Object.freeze(
      products.map((p) => Object.freeze({ ...p })),
    )
    expect(() =>
      findRecipesUsingIngredient(frozenComputed, { typeId: "gin" }, {
        types: frozenTypes,
        products: frozenProducts,
      }),
    ).not.toThrow()
  })
})
