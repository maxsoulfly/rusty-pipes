import { describe, expect, it, vi } from "vitest"
import {
  resolveIngredientOwnershipState,
  toggleIngredientOwnership,
} from "./ingredientOwnership"

const baseArgs = {
  kind: "type",
  id: "tomato-juice",
  resolvedType: { assumed_available: false },
  products: [],
  ownedTypeIds: new Set(),
  ownedProductIds: new Set(),
}

describe("resolveIngredientOwnershipState", () => {
  it("an unowned normal ingredient type reads as not owned - the Add action", () => {
    const result = resolveIngredientOwnershipState(baseArgs)
    expect(result).toEqual({ isHouseholdBasic: false, owned: false })
  })

  it("an owned normal ingredient type (direct row) reads as owned - the Remove action", () => {
    const result = resolveIngredientOwnershipState({
      ...baseArgs,
      ownedTypeIds: new Set(["tomato-juice"]),
    })
    expect(result).toEqual({ isHouseholdBasic: false, owned: true })
  })

  it("a type owned only via a mapped product also reads as owned (combined-ownership read, mirrors MyBarScreen.jsx) - the toggle itself is unaffected by this, it's a read-only parity fix", () => {
    const result = resolveIngredientOwnershipState({
      ...baseArgs,
      products: [{ id: "product-1", ingredient_type_id: "tomato-juice" }],
      ownedProductIds: new Set(["product-1"]),
    })
    expect(result.owned).toBe(true)
  })

  it("a product NOT mapped to this type does not count", () => {
    const result = resolveIngredientOwnershipState({
      ...baseArgs,
      products: [{ id: "product-1", ingredient_type_id: "some-other-type" }],
      ownedProductIds: new Set(["product-1"]),
    })
    expect(result.owned).toBe(false)
  })

  it("a household basic reports isHouseholdBasic regardless of kind, so the caller never shows a misleading Add/Remove control", () => {
    const typeResult = resolveIngredientOwnershipState({
      ...baseArgs,
      resolvedType: { assumed_available: true },
    })
    expect(typeResult.isHouseholdBasic).toBe(true)

    const productResult = resolveIngredientOwnershipState({
      ...baseArgs,
      kind: "product",
      resolvedType: { assumed_available: true },
    })
    expect(productResult.isHouseholdBasic).toBe(true)
  })

  it("kind: 'product' reads ownership from ownedProductIds only - the combined type/product read never applies to a specific bottle", () => {
    const owned = resolveIngredientOwnershipState({
      ...baseArgs,
      kind: "product",
      id: "product-1",
      ownedTypeIds: new Set(["tomato-juice"]), // the type IS owned...
      ownedProductIds: new Set(), // ...but this specific bottle is not
    })
    expect(owned.owned).toBe(false)
  })

  it("live/reactive: re-deriving with an updated owned set reflects the new state (proves the UI's `owned` is never a stale snapshot)", () => {
    const before = resolveIngredientOwnershipState(baseArgs)
    const after = resolveIngredientOwnershipState({
      ...baseArgs,
      ownedTypeIds: new Set(["tomato-juice"]),
    })
    expect(before.owned).toBe(false)
    expect(after.owned).toBe(true)
  })
})

describe("toggleIngredientOwnership", () => {
  it("kind: 'type' calls the shared inventory's toggleType, never toggleProduct - the existing inventory mutation path, not a second one", async () => {
    const toggleType = vi.fn().mockResolvedValue(undefined)
    const toggleProduct = vi.fn().mockResolvedValue(undefined)
    await toggleIngredientOwnership("type", "tomato-juice", {
      toggleType,
      toggleProduct,
    })
    expect(toggleType).toHaveBeenCalledWith("tomato-juice")
    expect(toggleProduct).not.toHaveBeenCalled()
  })

  it("kind: 'product' calls the shared inventory's toggleProduct, never toggleType", async () => {
    const toggleType = vi.fn().mockResolvedValue(undefined)
    const toggleProduct = vi.fn().mockResolvedValue(undefined)
    await toggleIngredientOwnership("product", "product-1", {
      toggleType,
      toggleProduct,
    })
    expect(toggleProduct).toHaveBeenCalledWith("product-1")
    expect(toggleType).not.toHaveBeenCalled()
  })

  it("propagates a failed mutation rather than swallowing it - the caller's own local ownership state must never be flipped on a failure it never saw", async () => {
    const failure = new Error("network error")
    const toggleType = vi.fn().mockRejectedValue(failure)
    await expect(
      toggleIngredientOwnership("type", "tomato-juice", {
        toggleType,
        toggleProduct: vi.fn(),
      }),
    ).rejects.toBe(failure)
  })
})
