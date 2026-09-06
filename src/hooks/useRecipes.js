import { useCallback, useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import { fetchRecipes } from "@/services/recipes"

export function useRecipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // See useCatalog.js's `loaded` comment - true once the first successful
  // fetch lands, never reset by a later failed refetch.
  const [loaded, setLoaded] = useState(false)

  // Deliberately doesn't re-set loading:true on refetch - AppShell unmounts
  // the whole Outlet (and shows a bare loading screen) while `recipesLoading`
  // is true, so every publish/unpublish/create/edit would otherwise flash
  // the entire app to a blank screen and back. Same class of bug already
  // fixed for My Bar toggles in useInventory.js/useLists.js (there via
  // optimistic updates); here the simpler fix is just never re-entering the
  // blocking state after the first load, since stale-then-fresh data is a
  // much better experience than an unmount/remount flash.
  //
  // Never rejects - see useCatalog.js's load() comment for why (a failed
  // initial fetch used to leave `loading: true` forever, since nothing
  // ever set it false).
  const load = useCallback(() => {
    // retryOnClockSkew: absorbs the brief "JWT issued at future" window on the
    // first read after a startup token refresh (see retryOnClockSkew.js).
    return retryOnClockSkew(() => fetchRecipes())
      .then((data) => {
        setRecipes(data)
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { recipes, loading, error, loaded, refetch: load }
}
