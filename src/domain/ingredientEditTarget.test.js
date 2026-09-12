import { describe, expect, it } from "vitest"
import { resolveIngredientEditTarget } from "./ingredientEditTarget"

const tomatoJuiceType = { id: "tomato-juice" }

describe("resolveIngredientEditTarget", () => {
  it("an admin/moderator viewing a type page gets a valid edit target - the type's own id", () => {
    const result = resolveIngredientEditTarget({
      isStaff: true,
      resolvedType: tomatoJuiceType,
    })
    expect(result).toBe("tomato-juice")
  })

  it("a regular member never gets an edit target, regardless of resolvedType", () => {
    const result = resolveIngredientEditTarget({
      isStaff: false,
      resolvedType: tomatoJuiceType,
    })
    expect(result).toBeNull()
  })

  it("a type-page route resolves correctly - the viewed type's own id", () => {
    // Mirrors IngredientDetailScreen.jsx's own resolution for kind="type":
    // resolvedType IS the viewed type, not something derived from it.
    const viewedType = { id: "lemon" }
    const result = resolveIngredientEditTarget({
      isStaff: true,
      resolvedType: viewedType,
    })
    expect(result).toBe("lemon")
  })

  it("a product-page route resolves to the product's MAPPED type, never the product's own id - the existing model, not a fabricated one", () => {
    // Mirrors IngredientDetailScreen.jsx's own resolution for
    // kind="product": by the time this function is called, `resolvedType`
    // is already the product's mapped ingredient type (a product always
    // has exactly one - AGENTS.md), never the product row itself - this
    // function only consumes that, it does not re-derive it.
    const mappedType = { id: "gin" } // NOT "product-tanqueray"
    const result = resolveIngredientEditTarget({
      isStaff: true,
      resolvedType: mappedType,
    })
    expect(result).toBe("gin")
    expect(result).not.toBe("product-tanqueray")
  })

  it("does not fabricate a target when there is no resolved type (a stale/deleted link) - null, not a guess", () => {
    const result = resolveIngredientEditTarget({
      isStaff: true,
      resolvedType: null,
    })
    expect(result).toBeNull()
  })

  it("a non-staff viewer with no resolved type also gets null (both conditions independently absent)", () => {
    const result = resolveIngredientEditTarget({
      isStaff: false,
      resolvedType: undefined,
    })
    expect(result).toBeNull()
  })
})
