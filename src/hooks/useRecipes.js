import { useCallback, useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import { fetchRecipeRelationships, fetchRecipes } from "@/services/recipes"

export function useRecipes() {
  const [recipes, setRecipes] = useState([])
  // Linked Variations Stage V.2 - the whole recipe_relationships table,
  // flat (src/domain/recipeRelationships.js resolves it per-recipe).
  // Fetched alongside recipes, not via useCatalog() - this is recipe-level
  // data, not ingredient-catalog data, and needs the exact same refetch
  // trigger (refetchRecipes(), already called after every recipe
  // create/edit/publish/etc.) to stay in sync.
  const [relationships, setRelationships] = useState([])
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
    // Both fetches wrapped together - a relationship-table hiccup shouldn't
    // succeed halfway and leave `loaded` claiming a consistent snapshot
    // that isn't one.
    return retryOnClockSkew(() =>
      Promise.all([fetchRecipes(), fetchRecipeRelationships()]),
    )
      .then(([recipesData, relationshipsData]) => {
        setRecipes(recipesData)
        setRelationships(relationshipsData)
        setLoading(false)
        setError(null)
        setLoaded(true)
        return recipesData
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

  return { recipes, relationships, loading, error, loaded, refetch: load }
}
