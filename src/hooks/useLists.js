import { useCallback, useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import {
  addFavorite,
  addWantToMake,
  fetchFavorites,
  fetchWantToMake,
  removeFavorite,
  removeWantToMake,
} from "@/services/lists"

// Same optimistic-update shape as useInventory.js: flip local state
// immediately, write in the background, roll back via a full reload only if
// the write actually fails.
export function useLists(userId) {
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [wantToMakeIds, setWantToMakeIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // See useCatalog.js's `loaded` comment - true once resolved with real
  // data (or a definitive "no user" state), never reset by a later failed
  // refetch.
  const [loaded, setLoaded] = useState(false)

  // Never rejects - see useCatalog.js's load() comment for why (a failed
  // initial fetch used to leave `loading: true` forever). Same
  // fire-and-forget rollback-on-failure concern as useInventory.js applies
  // here too (toggleFavorite/toggleWantToMake below).
  const load = useCallback(() => {
    if (!userId) {
      setFavoriteIds(new Set())
      setWantToMakeIds(new Set())
      setLoading(false)
      setError(null)
      setLoaded(true)
      return Promise.resolve()
    }
    setLoading(true)
    // retryOnClockSkew: absorbs the brief "JWT issued at future" window on the
    // first read after a startup token refresh (see retryOnClockSkew.js). Only
    // the read is wrapped - the favorite/want-to-make writes must not retry.
    return retryOnClockSkew(() =>
      Promise.all([fetchFavorites(userId), fetchWantToMake(userId)]),
    )
      .then(([favs, wtm]) => {
        setFavoriteIds(new Set(favs.map((r) => r.recipe_id)))
        setWantToMakeIds(new Set(wtm.map((r) => r.recipe_id)))
        setLoading(false)
        setError(null)
        setLoaded(true)
      })
      .catch((err) => {
        setLoading(false)
        setError(err.message)
      })
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async (recipeId) => {
    const wasFav = favoriteIds.has(recipeId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (wasFav) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })
    try {
      if (wasFav) await removeFavorite(userId, recipeId)
      else await addFavorite(userId, recipeId)
    } catch (err) {
      load()
      throw err
    }
  }

  const toggleWantToMake = async (recipeId) => {
    const was = wantToMakeIds.has(recipeId)
    setWantToMakeIds((prev) => {
      const next = new Set(prev)
      if (was) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })
    try {
      if (was) await removeWantToMake(userId, recipeId)
      else await addWantToMake(userId, recipeId)
    } catch (err) {
      load()
      throw err
    }
  }

  return {
    loading,
    error,
    loaded,
    favoriteIds,
    wantToMakeIds,
    toggleFavorite,
    toggleWantToMake,
    refetch: load,
  }
}
