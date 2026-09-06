import { useCallback, useEffect, useState } from "react"
import { findPinnableRow, reconcileOptimisticRow } from "@/domain/inventoryRows"
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

  // Optimistic pin toggle: flip local state now, write in the background,
  // revert just that flag if the write fails. `findPinnableRow` returns
  // null while the only matching row is a not-yet-reconciled optimistic
  // ownership add (no real id to UPDATE) - a rare, sub-second window now
  // that adds reconcile on success (see toggleType); the toggle is a
  // no-op until then rather than a failed UPDATE on a fake id.
  const setPinnedOnRow = async (matchRow, nextPinned) => {
    const row = findPinnableRow(rows, matchRow)
    if (!row) return
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, pinned: nextPinned } : r)),
    )
    try {
      await setInventoryPinned(userId, row.id, nextPinned)
    } catch (err) {
      // Revert only the optimistic flag change - no full reload (which
      // would flash the app to its loading screen via App.jsx's gate).
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, pinned: !nextPinned } : r)),
      )
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
        // Swap the optimistic placeholder for the real row so its id is
        // usable (e.g. a later Speed Rack pin UPDATE) - without this the
        // local row keeps its fake id until the next full reload.
        const realRow = await addIngredientTypeOwnership(userId, typeId)
        setRows((prev) =>
          reconcileOptimisticRow(prev, `optimistic-${typeId}`, realRow),
        )
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
      const realRow = await addProductOwnership(userId, productId)
      setRows((prev) =>
        reconcileOptimisticRow(prev, `optimistic-${productId}`, realRow),
      )
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
        const realRow = await addProductOwnership(userId, productId)
        setRows((prev) =>
          reconcileOptimisticRow(prev, `optimistic-${productId}`, realRow),
        )
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
