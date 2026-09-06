import { useEffect, useMemo, useRef, useState } from "react"
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom"
import { IconBack, IconSearch } from "@/components/icons"
import { IngredientIcon } from "@/components/IngredientIcon"
import { TopBar } from "@/components/Nav"
import { AdminMenu } from "@/components/myBar/AdminMenu"
import { TypeCard } from "@/components/myBar/TypeCard"

// Same within-category order My ingredients uses (see MyBarScreen.jsx) -
// "how likely is this on a real bar" first, name as tiebreaker.
const PRIORITY_RANK = { essential: 0, common: 1, specialized: 2, niche: 3 }
const byPriorityThenName = (a, b) =>
  (PRIORITY_RANK[a.bar_priority] ?? 99) -
    (PRIORITY_RANK[b.bar_priority] ?? 99) || a.name.localeCompare(b.name)

const NOOP = () => {}

// The "find and add ingredients" flow, split out from My ingredients (My
// Bar redesign Stage 1). Starts on category tiles, supports a global
// catalogue search that ignores the selected category, and toggles generic
// ownership in place (no navigation) so several can be added in one visit.
// A specific bottle/brand/homemade product is still tracked via /bar/add.
export default function AddIngredientsScreen() {
  const navigate = useNavigate()
  const { catalog, inventory, isAdmin } = useOutletContext()
  const { loading, categories, types, products, aliases } = catalog
  const { ownedTypeIds, ownedProductIds, toggleType } = inventory

  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState(null)

  // Preserve the "Find more ingredients" search-focus behavior - Build Your
  // Bar links here as /bar/add-ingredients?focus=1.
  const searchRef = useRef(null)
  useEffect(() => {
    if (searchParams.get("focus")) searchRef.current?.focus()
  }, [searchParams])

  // owned-for-display: generic ownership OR an owned product mapped to the
  // type - same rule My ingredients uses. Tapping a card only ever writes
  // the generic row (toggleType); an owned-via-product type shows as owned
  // but its checkmark toggles the generic row independently and never
  // removes the product (see useInventory.js). So this screen can never
  // silently drop an owned product or silently add generic ownership as a
  // side effect of something else.
  const ownedViaProductTypeIds = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (ownedProductIds.has(p.id)) set.add(p.ingredient_type_id)
    })
    return set
  }, [products, ownedProductIds])
  const isOwned = (typeId) =>
    ownedTypeIds.has(typeId) || ownedViaProductTypeIds.has(typeId)

  const aliasesByTypeId = useMemo(() => {
    const map = new Map()
    aliases.forEach((a) => {
      if (!map.has(a.ingredient_type_id)) map.set(a.ingredient_type_id, [])
      map.get(a.ingredient_type_id).push(a.alias)
    })
    return map
  }, [aliases])

  const q = query.trim().toLowerCase()
  // Global catalogue search - name or a known alias, across every category,
  // regardless of which one is selected. Literal substring matching of text
  // the user typed, not fuzzy resolution.
  const searchResults = useMemo(() => {
    if (!q) return null
    return types
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (aliasesByTypeId.get(t.id) ?? []).some((a) =>
            a.toLowerCase().includes(q),
          ),
      )
      .sort(byPriorityThenName)
  }, [q, types, aliasesByTypeId])

  const categoryTypes = useMemo(() => {
    if (!categoryId) return []
    return types
      .filter((t) => t.category_id === categoryId)
      .sort(byPriorityThenName)
  }, [categoryId, types])

  const selectedCategory = categories.find((c) => c.id === categoryId)

  const renderTypeTile = (type) => {
    const toggle = () => toggleType(type.id)
    return (
      <TypeCard
        key={type.id}
        type={type}
        isChild={Boolean(type.parent_type_id)}
        owned={isOwned(type.id)}
        ownedProducts={[]}
        allProducts={[]}
        expanded={false}
        onToggleExpand={NOOP}
        coveringChildren={[]}
        onCardClick={toggle}
        onToggleOwned={toggle}
      />
    )
  }

  if (loading) {
    return (
      <div className="py-15 px-6 text-center text-tx2 text-sm">
        Loading catalogue...
      </div>
    )
  }

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <TopBar
        title="Add ingredients"
        onBack={() => navigate(-1)}
        right={<AdminMenu isAdmin={isAdmin} />}
      />

      <div className="p-4">
        <div className="relative mb-4">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3"
          />
          <input
            ref={searchRef}
            placeholder="Search all ingredients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-surface border border-bdr rounded-sm py-[9px] pl-9 pr-3 text-tx text-sm font-body w-full"
          />
        </div>

        {searchResults ? (
          searchResults.length === 0 ? (
            <p className="text-tx3 text-sm text-center py-10">
              No ingredients match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
              {searchResults.map(renderTypeTile)}
            </div>
          )
        ) : categoryId ? (
          <>
            <button
              onClick={() => setCategoryId(null)}
              className="text-cyan text-[13px] font-display font-semibold bg-transparent border-none cursor-pointer p-0 mb-3 min-h-11 flex items-center gap-1"
            >
              <IconBack size={14} /> All categories
            </button>
            <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.08em] font-display mb-2">
              {selectedCategory?.name}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
              {categoryTypes.map(renderTypeTile)}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="flex flex-col items-center justify-center gap-2 py-4 px-2 min-h-[88px] bg-surface border border-bdr rounded-lg cursor-pointer"
              >
                <IngredientIcon
                  shape={c.shape ?? "spirit_bottle"}
                  size={28}
                  color="var(--text2)"
                />
                <span className="text-[13px] text-tx text-center font-medium">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/bar/add")}
          className="mt-6 text-tx2 text-[13px] font-display bg-transparent border-none cursor-pointer p-0 min-h-11 flex items-center underline"
        >
          Track a specific bottle instead
        </button>
      </div>
    </div>
  )
}
