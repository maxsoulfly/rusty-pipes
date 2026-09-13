import { describe, expect, it } from "vitest"
import {
  resolveParentTypeCandidates,
  resolveParentTypeIdForCategory,
} from "./ingredientParentType"

const types = [
  { id: "liqueur-root", category_id: "liqueur" },
  { id: "amaretto", category_id: "liqueur" },
  { id: "campari", category_id: "liqueur" },
  { id: "gin", category_id: "spirit" },
  { id: "vodka", category_id: "spirit" },
]

describe("resolveParentTypeCandidates", () => {
  it("only includes types from the same category", () => {
    const candidates = resolveParentTypeCandidates(types, {
      excludeTypeId: "does-not-exist",
      categoryId: "liqueur",
    })
    expect(candidates.map((t) => t.id).sort()).toEqual(
      ["liqueur-root", "amaretto", "campari"].sort(),
    )
  })

  it("excludes the type being edited even if it's in the same category", () => {
    const candidates = resolveParentTypeCandidates(types, {
      excludeTypeId: "amaretto",
      categoryId: "liqueur",
    })
    expect(candidates.map((t) => t.id)).not.toContain("amaretto")
    expect(candidates.map((t) => t.id).sort()).toEqual(
      ["liqueur-root", "campari"].sort(),
    )
  })

  it("returns an empty list for a category with no other types", () => {
    const candidates = resolveParentTypeCandidates(types, {
      excludeTypeId: "gin",
      categoryId: "wine",
    })
    expect(candidates).toEqual([])
  })
})

describe("resolveParentTypeIdForCategory", () => {
  it("keeps 'no parent type' (empty) unchanged", () => {
    expect(
      resolveParentTypeIdForCategory("", { types, categoryId: "spirit" }),
    ).toBe("")
  })

  it("preserves the current parent when it still belongs to the new category", () => {
    expect(
      resolveParentTypeIdForCategory("amaretto", {
        types,
        categoryId: "liqueur",
      }),
    ).toBe("amaretto")
  })

  it("clears the parent when it belongs to a different category than the new one", () => {
    expect(
      resolveParentTypeIdForCategory("gin", {
        types,
        categoryId: "liqueur",
      }),
    ).toBe("")
  })

  it("clears the parent when it no longer exists at all", () => {
    expect(
      resolveParentTypeIdForCategory("deleted-type", {
        types,
        categoryId: "liqueur",
      }),
    ).toBe("")
  })
})
