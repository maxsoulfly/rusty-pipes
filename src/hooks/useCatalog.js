import { useCallback, useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import {
  fetchCocktailFamilies,
  fetchGlassAliases,
  fetchGlasses,
  fetchIngredientAliases,
  fetchIngredientCategories,
  fetchIngredientTypes,
  fetchLiquidColors,
  fetchProducts,
  fetchTasteTags,
} from "@/services/catalog"
import { fetchOnboardingIngredients } from "@/services/onboarding"

export function useCatalog() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    // True once the first successful fetch has landed, never reset by a
    // later failed refetch - lets App.jsx tell "we've never had real data,
    // show a blocking error screen" apart from "a refetch failed, but keep
    // showing what's already on screen" (e.g. AddProductScreen's
    // catalog.refetch() failing shouldn't nuke the whole app back to an
    // error screen and hide the product the user just successfully added).
    loaded: false,
    categories: [],
    types: [],
    aliases: [],
    products: [],
    glasses: [],
    glassAliases: [],
    tasteTags: [],
    families: [],
    liquidColors: [],
    onboardingIngredients: [],
  })

  // Deliberately doesn't re-set loading:true on refetch - same reasoning as
  // useRecipes.js: AppShell unmounts the whole Outlet while catalog.loading
  // is true, so every refetch (already triggered today by AddProductScreen
  // after adding a product) would flash the entire app blank and back.
  //
  // Never rejects - a failed fetch resolves into `error` state instead of
  // an unhandled promise rejection. Before this, a failed *initial* load
  // left `loading: true` forever (nothing ever set it false), which meant
  // AppShell's `isLoading` gate (App.jsx) got stuck on a bare "Loading..."
  // screen indefinitely with no way for the user to know anything had gone
  // wrong. On a refetch failure, the functional setState spread preserves
  // whatever data was already loaded rather than wiping it to empty.
  const load = useCallback(() => {
    // retryOnClockSkew: absorbs the brief "JWT issued at future" window on the
    // first read after a startup token refresh (see retryOnClockSkew.js).
    return retryOnClockSkew(() =>
      Promise.all([
        fetchIngredientCategories(),
        fetchIngredientTypes(),
        fetchIngredientAliases(),
        fetchProducts(),
        fetchGlasses(),
        fetchGlassAliases(),
        fetchTasteTags(),
        fetchCocktailFamilies(),
        fetchLiquidColors(),
        fetchOnboardingIngredients(),
      ]),
    )
      .then(
        ([
          categories,
          types,
          aliases,
          products,
          glasses,
          glassAliases,
          tasteTags,
          families,
          liquidColors,
          onboardingIngredients,
        ]) => {
          const next = {
            loading: false,
            error: null,
            loaded: true,
            categories,
            types,
            aliases,
            products,
            glasses,
            glassAliases,
            tasteTags,
            families,
            liquidColors,
            onboardingIngredients,
          }
          setState(next)
          return next
        },
      )
      .catch((err) => {
        setState((s) => ({ ...s, loading: false, error: err.message }))
        return undefined
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refetch: load }
}
