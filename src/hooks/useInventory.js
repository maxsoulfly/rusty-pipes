import { useCallback, useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import {
  addIngredientTypeOwnership,
  addProductOwnership,
  fetchInventory,
  removeIngredientTypeOwnership,
  removeProductOwnership,
  setInventoryPinned,
} from "@/services/inventory"

export function useInventory(userId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // See useCatalog.js's `loaded` comment - true once resolved with real
  // data (or a definitive "no user" state), never reset by a later failed
  // refetch.
  const [loaded, setLoaded] = useState(false)

  // Never rejects - see useCatalog.js's load() comment for why (a failed
  // initial fetch used to leave `loading: true` forever). This also fixes a
  // second-order issue: toggleType/ownProduct/toggleProduct below call
  // load() fire-and-forget to roll back optimistic state after a failed
  // write, never awaiting or catching it - if that rollback fetch itself
  // failed, it used to be an unhandled rejection too.
  const load = useCallback(() => {
    if (!userId) {
      setRows([])
      setLoading(false)
      setError(null)
      setLoaded(true)
      return Promise.resolve([])
    }
    setLoading(true)
    // retryOnClockSkew: absorbs the brief "JWT issued at future" window on the
    // first read after a startup token refresh (see retryOnClockSkew.js). Only
    // the read is wrapped - the ownership writes below must never be retried.
    return retryOnClockSkew(() => fetchInventory(userId))
      .then((data) => {
        setRows(data)
        setLoading(false)
        setError(null)
        setLoaded(true)
        return data
      })
      .catch((err) => {
        setLoading(false)
        setError(err.message)
        return undefined
      })
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const ownedTypeIds = new Set(
    rows.filter((r) => r.ingredient_type_id).map((r) => r.ingredient_type_id),
  )
  const ownedProductIds = new Set(
    rows.filter((r) => r.product_id).map((r) => r.product_id),
  )
  // Speed Rack: which owned rows are pinned. Kept independent from the
  // owned sets above - pinning is a flag on an already-owned row, never a
  // second way to own something.
  const pinnedTypeIds = new Set(
    rows
      .filter((r) => r.ingredient_type_id && r.pinned)
      .map((r) => r.ingredient_type_id),
  )
  const pinnedProductIds = new Set(
    rows.filter((r) => r.product_id && r.pinned).map((r) => r.product_id),
  )

  // Optimistic pin toggle, same shape as toggleType: flip local state now,
  // write in the background, reload to the real state only if it fails. The
  // row must already exist and be persisted (a just-created optimistic
  // ownership row has a fake id and no server row to update yet) - callers
  // only offer the pin control on an owned, loaded item, and this bails
  // quietly otherwise.
  const setPinnedOnRow = async (matchRow, nextPinned) => {
    const row = rows.find(matchRow)
    if (!row || String(row.id).startsWith("optimistic-")) return
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, pinned: nextPinned } : r)),
    )
    try {
      await setInventoryPinned(userId, row.id, nextPinned)
    } catch (err) {
      load()
      throw err
    }
  }
  const togglePinType = (typeId) =>
    setPinnedOnRow(
      (r) => r.ingredient_type_id === typeId,
      !pinnedTypeIds.has(typeId),
    )
  const togglePinProduct = (productId) =>
    setPinnedOnRow(
      (r) => r.product_id === productId,
      !pinnedProductIds.has(productId),
    )

  // Optimistic: update local state immediately so the toggle feels instant,
  // fire the write in the background, and only pay the network round-trip
  // (via a full reload) if it actually fails. Toggling only ever manages the
  // *generic* ownership row - a type owned via a product still displays as
  // owned (see MyBarScreen's combined isOwned check) but the toggle itself
  // won't touch that product's ownership row - there's no "unown a product"
  // flow in this MVP.
  const toggleType = async (typeId) => {
    const wasOwned = ownedTypeIds.has(typeId)
    setRows((prev) =>
      wasOwned
        ? prev.filter((r) => r.ingredient_type_id !== typeId)
        : [
            ...prev,
            {
              id: `optimistic-${typeId}`,
              ingredient_type_id: typeId,
              product_id: null,
            },
          ],
    )
    try {
      if (wasOwned) {
        await removeIngredientTypeOwnership(userId, typeId)
      } else {
        await addIngredientTypeOwnership(userId, typeId)
      }
    } catch (err) {
      load() // roll back to real state on failure
      throw err
    }
  }

  const ownProduct = async (productId) => {
    setRows((prev) => [
      ...prev,
      {
        id: `optimistic-${productId}`,
        ingredient_type_id: null,
        product_id: productId,
      },
    ])
    try {
      await addProductOwnership(userId, productId)
    } catch (err) {
      load()
      throw err
    }
  }

  // Browsing an existing catalog product (e.g. one an admin batch-imported)
  // and claiming/un-claiming ownership of it - distinct from ownProduct(),
  // which only ever adds (used right after AddProductScreen creates a brand
  // new product, when it can't possibly be owned yet).
  const toggleProduct = async (productId) => {
    const wasOwned = ownedProductIds.has(productId)
    setRows((prev) =>
      wasOwned
        ? prev.filter((r) => r.product_id !== productId)
        : [
            ...prev,
            {
              id: `optimistic-${productId}`,
              ingredient_type_id: null,
              product_id: productId,
            },
          ],
    )
    try {
      if (wasOwned) {
        await removeProductOwnership(userId, productId)
      } else {
        await addProductOwnership(userId, productId)
      }
    } catch (err) {
      load()
      throw err
    }
  }

  return {
    loading,
    error,
    loaded,
    ownedTypeIds,
    ownedProductIds,
    pinnedTypeIds,
    pinnedProductIds,
    toggleType,
    ownProduct,
    toggleProduct,
    togglePinType,
    togglePinProduct,
    refetch: load,
  }
}
