import { useMemo } from "react"
import { buildFamilyClusters, byPriorityThenName } from "@/domain/myBarGrouping"

// My Bar's derived view-model: every lookup map, grouping transform, and
// computed flag the screen renders from, given the current catalog/
// inventory data plus the current search/category browsing state. Owns
// only derivation - no mutations, no persistence, no navigation. See
// docs/plans/archive/my-bar-screen-modularization.md for what stayed in
// MyBarScreen.jsx and why (browsing-state persistence, rendering,
// mutations).
export function useMyBarViewModel({
  categories,
  types,
  products,
  aliases,
  ownedTypeIds,
  ownedProductIds,
  pinnedTypeIds,
  pinnedProductIds,
  query,
  cat,
}) {
  const productsByType = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      if (!ownedProductIds.has(p.id)) return
      if (!map.has(p.ingredient_type_id)) map.set(p.ingredient_type_id, [])
      map.get(p.ingredient_type_id).push(p)
    })
    return map
  }, [products, ownedProductIds])

  // Every catalog product under a type, owned or not - what the expanded
  // browse list renders, as opposed to productsByType above (owned-only,
  // used for the collapsed subtitle).
  const allProductsByType = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      if (!map.has(p.ingredient_type_id)) map.set(p.ingredient_type_id, [])
      map.get(p.ingredient_type_id).push(p)
    })
    return map
  }, [products])

  // "Owned" for display combines generic ownership and any owned product
  // mapped to the type, per the spec ("owning a product satisfies its
  // mapped generic type"). Direct ownership only - a parent type is NOT
  // treated as owned just because an owned child (e.g. Dark Rum) satisfies
  // it for recipe matching. That keeps an inferred parent out of My
  // ingredients as a standalone possession (My Bar redesign Stage 1),
  // while an explicitly owned parent still shows. The toggle itself only
  // ever writes the generic row - see useInventory.js.
  const isOwned = (typeId) =>
    ownedTypeIds.has(typeId) || productsByType.has(typeId)

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  )
  const categoryShapeByName = useMemo(
    () => new Map(categories.map((c) => [c.name, c.shape])),
    [categories],
  )
  const cats = ["All", ...categories.map((c) => c.name)]
  // A restored category that has since been renamed/removed would silently
  // filter everything out - fall back to "All" rather than showing an empty
  // screen with a stale label.
  const effectiveCat =
    cat === "All" || categories.some((c) => c.name === cat) ? cat : "All"

  // Some types are mid-level groupings for a category (e.g. "Rum", "Whiskey"
  // under Spirit - see supabase/migrations/20260816010047) rather than
  // things anyone would search for by name - see childrenByParentId below.
  const childrenByParentId = useMemo(() => {
    const map = new Map()
    types.forEach((t) => {
      if (!t.parent_type_id) return
      if (!map.has(t.parent_type_id)) map.set(t.parent_type_id, [])
      map.get(t.parent_type_id).push(t)
    })
    map.forEach((children) => children.sort(byPriorityThenName))
    return map
  }, [types])

  // "Wodka" -> Vodka: an alias is exactly a stand-in name for its type, so
  // search should match it too, not just the canonical name - a member who
  // added an alias for their own language/brand slang would otherwise never
  // be able to find the thing they just named. Substring search against a
  // known, explicit alias list, not fuzzy matching - AGENTS.md's "no fuzzy
  // ingredient-name matching" rule is about availability/import resolution
  // inferring a match on its own, not a search box filtering by literal text
  // the user (or an admin) already typed in.
  const aliasesByTypeId = useMemo(() => {
    const map = new Map()
    aliases.forEach((a) => {
      if (!map.has(a.ingredient_type_id)) map.set(a.ingredient_type_id, [])
      map.get(a.ingredient_type_id).push(a.alias)
    })
    return map
  }, [aliases])

  // /bar is owned-only now (My Bar redesign Stage 1) - finding and adding
  // ingredients is its own flow at /bar/add-ingredients.
  const hasAnyOwned = ownedTypeIds.size > 0 || ownedProductIds.size > 0

  const filtered = types.filter((t) => {
    if (!isOwned(t.id)) return false
    if (
      effectiveCat !== "All" &&
      categoryNameById.get(t.category_id) !== effectiveCat
    )
      return false
    if (query) {
      const q = query.toLowerCase()
      const matchesName = t.name.toLowerCase().includes(q)
      const matchesAlias = (aliasesByTypeId.get(t.id) ?? []).some((a) =>
        a.toLowerCase().includes(q),
      )
      if (!matchesName && !matchesAlias) return false
    }
    return true
  })

  const grouped = categories.reduce((acc, c) => {
    const items = filtered
      .filter((t) => t.category_id === c.id)
      .sort(byPriorityThenName)
    if (items.length) acc[c.name] = buildFamilyClusters(items, childrenByParentId)
    return acc
  }, {})

  // Speed Rack strip: pinned generic types + pinned specific products,
  // name-sorted. Ignores the search/category filters above - it's a
  // fast-access strip, not part of the browse. A product borrows its
  // type's icon/color.
  const speedRackItems = useMemo(() => {
    const items = []
    types.forEach((t) => {
      if (pinnedTypeIds.has(t.id))
        items.push({
          key: `t-${t.id}`,
          name: t.name,
          shape: t.shape,
          color: t.color,
          to: `/bar/type/${t.id}`,
        })
    })
    products.forEach((p) => {
      if (pinnedProductIds.has(p.id)) {
        const pt = types.find((t) => t.id === p.ingredient_type_id)
        items.push({
          key: `p-${p.id}`,
          name: p.name,
          shape: pt?.shape ?? "spirit_bottle",
          color: pt?.color,
          to: `/bar/product/${p.id}`,
        })
      }
    })
    return items.sort((a, b) => a.name.localeCompare(b.name))
  }, [types, products, pinnedTypeIds, pinnedProductIds])

  return {
    productsByType,
    allProductsByType,
    isOwned,
    categoryNameById,
    categoryShapeByName,
    cats,
    effectiveCat,
    childrenByParentId,
    aliasesByTypeId,
    hasAnyOwned,
    filtered,
    grouped,
    speedRackItems,
  }
}
