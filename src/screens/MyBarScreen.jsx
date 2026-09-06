import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { IngredientIcon } from "@/components/IngredientIcon"
import { EmptyState } from "@/components/myBar/EmptyState"
import { ExpandedProducts } from "@/components/myBar/ExpandedProducts"
import { FamilyCluster } from "@/components/myBar/FamilyCluster"
import { SearchFilterHeader } from "@/components/myBar/SearchFilterHeader"
import { ShelfItem } from "@/components/myBar/ShelfItem"
import { Btn } from "@/components/primitives"

// Within a category, order by real-world "how likely is this on a bar" -
// bar_priority already exists on every type (currently only consumed by
// src/domain/recommendations.js for purchase suggestions), name as
// tiebreaker. Previously pure alphabetical, which put e.g. Absinthe ahead
// of Gin purely on spelling - no relationship to which one an actual bar
// would stock.
const PRIORITY_RANK = { essential: 0, common: 1, specialized: 2, niche: 3 }
const byPriorityThenName = (a, b) =>
  (PRIORITY_RANK[a.bar_priority] ?? 99) -
    (PRIORITY_RANK[b.bar_priority] ?? 99) || a.name.localeCompare(b.name)

// My ingredients preserves its own browsing state (search text, category
// jump, which type rows are expanded, scroll offset) across a round trip to
// an ingredient/bottle recipe page and back. React Router does NOT restore
// any of this on its own - the screen fully unmounts when navigating to
// /bar/type/:id, so component state is gone and navigate(-1) only brings
// back the URL. sessionStorage is the least invasive fix: session-scoped,
// survives the unmount, and every read/write is guarded (private mode /
// quota / disabled storage all just mean "don't restore").
const VIEW_STATE_KEY = "rustyPipes.myIngredients.viewState"
function readViewState() {
  try {
    const raw = sessionStorage.getItem(VIEW_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function patchViewState(patch) {
  try {
    const current = readViewState() ?? {}
    sessionStorage.setItem(
      VIEW_STATE_KEY,
      JSON.stringify({ ...current, ...patch }),
    )
  } catch {
    /* storage unavailable - fine, state just won't be restored */
  }
}
// The scroll happens on AppShell's own overflow container (App.jsx), not
// window - MyBarScreen doesn't own that DOM node, so walk up to it.
const findScroller = (el) => el?.closest(".overflow-y-auto") ?? null

export default function MyBarScreen() {
  const navigate = useNavigate()
  const { catalog, inventory, isAdmin } = useOutletContext()
  const {
    loading: catalogLoading,
    categories,
    types,
    products,
    aliases,
  } = catalog
  const {
    loading: inventoryLoading,
    ownedTypeIds,
    ownedProductIds,
    toggleType,
    toggleProduct,
  } = inventory

  // Hydrate browsing state once, from the last visit this session.
  const restored = useRef(readViewState()).current
  const [query, setQuery] = useState(restored?.query ?? "")
  const [cat, setCat] = useState(restored?.cat ?? "All")
  const [expandedTypeIds, setExpandedTypeIds] = useState(
    () => new Set(restored?.expandedTypeIds ?? []),
  )
  const toggleExpanded = (typeId) =>
    setExpandedTypeIds((prev) => {
      const next = new Set(prev)
      if (next.has(typeId)) next.delete(typeId)
      else next.add(typeId)
      return next
    })

  const rootRef = useRef(null)
  // Kept pointed at AppShell's scroll container after every render (it may
  // not exist yet on the loading render) so the unmount handler below can
  // still read scrollTop even though React has detached rootRef by then.
  const scrollerRef = useRef(null)
  useEffect(() => {
    scrollerRef.current = findScroller(rootRef.current)
  })

  // Persist filters/expanded whenever they change.
  useEffect(() => {
    patchViewState({
      query,
      cat,
      expandedTypeIds: [...expandedTypeIds],
    })
  }, [query, cat, expandedTypeIds])

  // Capture scroll offset on unmount (i.e. exactly when navigating to a
  // recipe page) - a scroll listener would be needless churn since this is
  // the only moment the value matters.
  useEffect(() => {
    return () => {
      if (scrollerRef.current) {
        patchViewState({ scrollTop: scrollerRef.current.scrollTop })
      }
    }
  }, [])

  // Restore scroll once, after the first render that actually has content
  // (the loading branch below renders a shorter placeholder, so restoring
  // before data lands would just clamp to the bottom of that).
  const didRestoreScroll = useRef(false)
  useLayoutEffect(() => {
    if (didRestoreScroll.current || catalogLoading || inventoryLoading) return
    const scroller = findScroller(rootRef.current)
    if (!scroller) return
    didRestoreScroll.current = true
    const saved = readViewState()
    if (saved?.scrollTop) scroller.scrollTop = saved.scrollTop
  })

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

  // Renders parent types followed immediately by their (filtered) children,
  // indented - a child whose parent didn't pass the filter (e.g. searching
  // "dark" matches "Dark Rum" but not "Rum", or the parent simply isn't
  // owned) still shows, just flat, so grouping never hides a real match.
  const buildRows = (items) => {
    const filteredIds = new Set(items.map((t) => t.id))
    const topLevel = items.filter((t) => !t.parent_type_id)
    const orphanChildren = items.filter(
      (t) => t.parent_type_id && !filteredIds.has(t.parent_type_id),
    )
    const rows = []
    topLevel.forEach((t) => {
      rows.push({ type: t, isChild: false })
      ;(childrenByParentId.get(t.id) ?? [])
        .filter((child) => filteredIds.has(child.id))
        .forEach((child) => rows.push({ type: child, isChild: true }))
    })
    orphanChildren.forEach((t) => rows.push({ type: t, isChild: false }))
    return rows
  }

  // Groups buildRows()'s flat [{type, isChild}] list into
  // [{parent, children}] clusters, one per top-level type - lets the render
  // below box a parent + its children together (a "family" cluster) instead
  // of relying on card size alone to suggest the relationship, which tested
  // as too subtle to notice.
  const buildClusters = (items) => {
    const clusters = []
    buildRows(items).forEach(({ type, isChild }) => {
      if (!isChild) clusters.push({ parent: type, children: [] })
      else clusters[clusters.length - 1].children.push(type)
    })
    return clusters
  }

  const grouped = categories.reduce((acc, c) => {
    const items = filtered
      .filter((t) => t.category_id === c.id)
      .sort(byPriorityThenName)
    if (items.length) acc[c.name] = buildClusters(items)
    return acc
  }, {})

  const renderCard = (type, isChild) => {
    const owned = isOwned(type.id)
    const ownedProducts = productsByType.get(type.id) ?? []
    const allProducts = allProductsByType.get(type.id) ?? []
    const expanded = expandedTypeIds.has(type.id)
    // A parent type's own toggle only reflects direct/generic ownership of
    // it specifically - it can show "off" even though the availability
    // engine already treats an owned child (e.g. Dark Rum) as satisfying
    // it, via the same parent-walk in resolveOwnedIngredientTypes(). Surface
    // that here so the toggle being off doesn't read as a contradiction.
    const coveringChildren =
      !owned && !isChild
        ? (childrenByParentId.get(type.id) ?? []).filter((c) => isOwned(c.id))
        : []
    return (
      <ShelfItem
        type={type}
        isChild={isChild}
        owned={owned}
        ownedProducts={ownedProducts}
        allProducts={allProducts}
        expanded={expanded}
        onToggleExpand={() => toggleExpanded(type.id)}
        coveringChildren={coveringChildren}
        // Tap-to-view, not tap-to-select - the one deliberate difference
        // from Build Your Bar / Add ingredients, which use TypeCard for
        // tap-to-own. Only the dedicated checkmark button changes ownership
        // here.
        onCardClick={() => navigate(`/bar/type/${type.id}`)}
        onToggleOwned={() => toggleType(type.id)}
      />
    )
  }

  const renderExpanded = (type, style) => {
    if (!expandedTypeIds.has(type.id)) return null
    const allProducts = allProductsByType.get(type.id) ?? []
    return (
      <ExpandedProducts
        typeName={type.name}
        products={allProducts}
        types={types}
        aliases={aliases}
        ownedProductIds={ownedProductIds}
        isAdmin={isAdmin}
        onToggleProduct={toggleProduct}
        onProductsChanged={catalog.refetch}
        onViewProduct={(productId) => navigate(`/bar/product/${productId}`)}
        style={style}
      />
    )
  }

  if (catalogLoading || inventoryLoading) {
    return (
      <div className="py-15 px-6 text-center text-tx2 text-sm">
        Loading your bar...
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]"
    >
      <SearchFilterHeader
        query={query}
        onQueryChange={setQuery}
        onAddClick={() => navigate("/bar/add-ingredients")}
        cats={cats}
        cat={effectiveCat}
        onCatChange={setCat}
        categoryShapeByName={categoryShapeByName}
        isAdmin={isAdmin}
      />

      <div className="p-4">
        {Object.entries(grouped).map(([categoryName, clusters]) => (
          <div key={categoryName} className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <IngredientIcon
                shape={categoryShapeByName.get(categoryName) ?? "spirit_bottle"}
                size={16}
                color="var(--text3)"
              />
              <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.08em] font-display">
                {categoryName}
              </div>
            </div>
            {/* Singles render as one contiguous shelf before any family
                sub-shelf, not interleaved by priority/name order with them -
                a single sandwiched between two clusters in sort order could
                otherwise never share a shelf row with another single (the
                "Tequila stranded alone" layout bug a live screenshot once
                surfaced). Each half keeps its own priority/name order. */}
            <div className="flex flex-col gap-6">
              {clusters.some(({ children }) => children.length === 0) && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-0 gap-y-5">
                  {clusters
                    .filter(({ children }) => children.length === 0)
                    .map(({ parent }) => (
                      // display:"contents" makes this wrapper invisible to
                      // the grid, so the shelf item and (if expanded) its
                      // full-width product panel both participate as direct
                      // grid items.
                      <div key={parent.id} className="contents">
                        {renderCard(parent, false)}
                        {renderExpanded(parent, { gridColumn: "1 / -1" })}
                      </div>
                    ))}
                </div>
              )}
              {clusters
                .filter(({ children }) => children.length > 0)
                .map(({ parent, children }) => (
                  <FamilyCluster
                    key={parent.id}
                    parent={parent}
                    children={children}
                    renderCard={renderCard}
                    renderExpanded={renderExpanded}
                  />
                ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 &&
          (hasAnyOwned ? (
            <EmptyState />
          ) : (
            <div className="text-center py-12 text-tx3">
              <p className="text-[15px] font-display font-semibold text-tx2">
                Your bar is empty
              </p>
              <p className="mt-1.5 text-[13px]">
                Add the ingredients you already have to see what you can make.
              </p>
              <div className="mt-4 flex justify-center">
                <Btn
                  variant="primary"
                  small
                  onClick={() => navigate("/bar/add-ingredients")}
                >
                  Add ingredients
                </Btn>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
