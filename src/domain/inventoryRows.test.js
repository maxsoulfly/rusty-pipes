import { describe, expect, it } from "vitest"
import {
  findPinnableRow,
  isOptimisticId,
  reconcileOptimisticRow,
} from "./inventoryRows"

// Mirror the exact row shapes useInventory.js produces.
const optimisticType = (typeId) => ({
  id: `optimistic-${typeId}`,
  ingredient_type_id: typeId,
  product_id: null,
})
const realType = (typeId, id, pinned = false) => ({
  id,
  ingredient_type_id: typeId,
  product_id: null,
  pinned,
})
const optimisticProduct = (productId) => ({
  id: `optimistic-${productId}`,
  ingredient_type_id: null,
  product_id: productId,
})
const realProduct = (productId, id, pinned = false) => ({
  id,
  ingredient_type_id: null,
  product_id: productId,
  pinned,
})

const byType = (typeId) => (r) => r.ingredient_type_id === typeId
const byProduct = (productId) => (r) => r.product_id === productId
// how useInventory flips the flag once findPinnableRow gives it a real row
const setPinned = (rows, rowId, pinned) =>
  rows.map((r) => (r.id === rowId ? { ...r, pinned } : r))

describe("isOptimisticId", () => {
  it("recognises the optimistic placeholder id, rejects real uuids", () => {
    expect(isOptimisticId("optimistic-abc")).toBe(true)
    expect(isOptimisticId("3f1c9b2a-0000-4000-8000-000000000000")).toBe(false)
  })
})

describe("findPinnableRow", () => {
  it("returns null while only an optimistic row exists (nothing to UPDATE yet)", () => {
    const rows = [optimisticType("gin")]
    expect(findPinnableRow(rows, byType("gin"))).toBeNull()
  })

  it("returns the real row once present", () => {
    const rows = [realType("gin", "row-1")]
    expect(findPinnableRow(rows, byType("gin"))?.id).toBe("row-1")
  })
})

describe("reconcileOptimisticRow", () => {
  it("swaps the placeholder for the real row and leaves others untouched", () => {
    const other = realType("vodka", "row-v")
    const rows = [other, optimisticType("gin")]
    const next = reconcileOptimisticRow(
      rows,
      "optimistic-gin",
      realType("gin", "row-g"),
    )
    expect(next).toEqual([other, realType("gin", "row-g")])
  })

  it("is a no-op when the placeholder is already gone", () => {
    const rows = [realType("vodka", "row-v")]
    expect(
      reconcileOptimisticRow(rows, "optimistic-gin", realType("gin", "x")),
    ).toEqual(rows)
  })
})

// The reported bug: own -> pin -> un-own -> re-own -> pin (star didn't
// respond on the second pin because the only matching row was a stale
// optimistic placeholder).
describe("own -> pin -> un-own -> re-own -> pin lifecycle", () => {
  it("generic ingredient: pin, unpin both work again after re-owning", () => {
    const T = "gin"
    let rows = []

    // 1. own (optimistic) — not pinnable yet
    rows = [...rows, optimisticType(T)]
    expect(findPinnableRow(rows, byType(T))).toBeNull()
    // add resolves -> reconcile
    rows = reconcileOptimisticRow(rows, `optimistic-${T}`, realType(T, "row-1"))
    let r = findPinnableRow(rows, byType(T))
    expect(r?.id).toBe("row-1")

    // 2. pin
    rows = setPinned(rows, r.id, true)
    expect(findPinnableRow(rows, byType(T)).pinned).toBe(true)

    // 3. un-own — row gone
    rows = rows.filter((x) => x.ingredient_type_id !== T)
    expect(findPinnableRow(rows, byType(T))).toBeNull()

    // 4. re-own (optimistic again) — still not pinnable...
    rows = [...rows, optimisticType(T)]
    expect(findPinnableRow(rows, byType(T))).toBeNull()
    // ...until the new insert reconciles with its NEW server id
    rows = reconcileOptimisticRow(rows, `optimistic-${T}`, realType(T, "row-2"))
    r = findPinnableRow(rows, byType(T))
    expect(r?.id).toBe("row-2") // regression: used to stay the stale placeholder -> pin no-op
    expect(r.pinned).toBe(false) // fresh row starts unpinned

    // 5. pin again works
    rows = setPinned(rows, r.id, true)
    expect(findPinnableRow(rows, byType(T)).pinned).toBe(true)

    // 6. unpin works
    rows = setPinned(rows, r.id, false)
    expect(findPinnableRow(rows, byType(T)).pinned).toBe(false)
  })

  it("specific product: same lifecycle via the product path", () => {
    const P = "tanqueray"
    let rows = []

    rows = [...rows, optimisticProduct(P)]
    expect(findPinnableRow(rows, byProduct(P))).toBeNull()
    rows = reconcileOptimisticRow(
      rows,
      `optimistic-${P}`,
      realProduct(P, "prow-1"),
    )
    let r = findPinnableRow(rows, byProduct(P))
    expect(r?.id).toBe("prow-1")

    rows = setPinned(rows, r.id, true)
    expect(findPinnableRow(rows, byProduct(P)).pinned).toBe(true)

    rows = rows.filter((x) => x.product_id !== P)
    expect(findPinnableRow(rows, byProduct(P))).toBeNull()

    rows = [...rows, optimisticProduct(P)]
    rows = reconcileOptimisticRow(
      rows,
      `optimistic-${P}`,
      realProduct(P, "prow-2"),
    )
    r = findPinnableRow(rows, byProduct(P))
    expect(r?.id).toBe("prow-2")
    expect(r.pinned).toBe(false)

    rows = setPinned(rows, r.id, true)
    expect(findPinnableRow(rows, byProduct(P)).pinned).toBe(true)
    rows = setPinned(rows, r.id, false)
    expect(findPinnableRow(rows, byProduct(P)).pinned).toBe(false)
  })

  it("pinning a generic type and a product of that same type stay independent", () => {
    // ownership separation: a generic row and a product row for the same
    // type are different user_inventory rows with different ids.
    let rows = [realType("gin", "trow"), realProduct("tanqueray", "prow")]
    rows = setPinned(rows, findPinnableRow(rows, byType("gin")).id, true)
    expect(findPinnableRow(rows, byType("gin")).pinned).toBe(true)
    expect(findPinnableRow(rows, byProduct("tanqueray")).pinned).toBe(false)
  })
})
