import { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import {
  IconChevD,
  IconFilter,
  IconGlass,
  IconPlus,
  IconSearch,
} from "@/components/icons"
import {
  AVAIL_CFG,
  AVAIL_TONE,
  BottomSheet,
  Btn,
  FilterChip,
  SectionTitle,
} from "@/components/primitives"
import {
  ADAPTED_CATEGORY_LABEL,
  AVAIL_FILTERS,
  SORT_FILTERS,
  SOURCE_FILTERS,
} from "@/data/constants"
import { groupByDisplayTier } from "@/domain/availabilityGroups"
import { findRecipesUsingIngredient } from "@/domain/ingredientRecipeMatches"
import {
  formatMakeabilityBreakdown,
  summarizeMakeability,
} from "@/domain/makeabilityCounts"

// Availability grouping is now the default Library view (plain /library
// included) - grouped section breaks communicate "available first" more
// clearly than a flat alphabetical list. "Show my cocktails" (Build Your
// Bar) and ingredient/product "View all" both still deep-link with the
// original ?sort=availability, which keeps working since any value other
// than "name" means availability (see sortMode below). Name A-Z is the
// other option, picked via the visible Sort control - not a third silent
// default, an explicit member choice.
//
// The tier order and grouping itself live in
// domain/availabilityGroups.js (Stage D.2) - grouped by `display.tier`, not
// raw `avail`, so a recipe resolvable via a configured, owned substitute
// ranks ahead of one that's genuinely still missing something, and never
// appears under "Almost There" once it's adapted. Only the group HEADING
// text is screen-specific, kept here.
//
// Matches HomeScreen.jsx's own section names exactly, for the same
// availability tiers - AVAIL_CFG's own `label` ("Perfect", not "Ready to
// Pour") is a different, shorter string used on the per-card badge, kept
// as-is; these are the group headings specifically.
const AVAIL_GROUP_LABEL = {
  perfect: "Ready to Pour",
  good: "Good Enough",
  adapted: ADAPTED_CATEGORY_LABEL,
  almost: "Almost There",
  unavail: "Unavailable",
}

export default function LibraryScreen() {
  const navigate = useNavigate()
  const { computed, catalog } = useOutletContext()
  const { tasteTags } = catalog
  const [searchParams, setSearchParams] = useSearchParams()
  // Deep-link support (?source=classic) for the Admin dashboard's stat
  // cards - read once on mount as the initial filter state, not kept in
  // sync afterward, so a member adjusting filters here doesn't fight with
  // the URL on every click.
  const initialSource = searchParams.get("source")
  // Read directly from the URL each render (not captured into its own
  // state) so it stays in sync both ways: the Sort control below writes it
  // via setSortMode, and an external deep link (?sort=availability from
  // "Show my cocktails", or "View all"'s ?sort=availability&ingredient=...)
  // is picked up correctly on arrival too. Anything other than "name" means
  // availability - plain /library (no param at all) and the pre-existing
  // "?sort=availability" links both land here unchanged.
  const sortMode = searchParams.get("sort") === "name" ? "name" : "availability"
  const currentSort = SORT_FILTERS.find((f) => f.key === sortMode)
  // Switching modes preserves every other query param (ingredient, source,
  // focus, ...) - only "sort" itself changes. Availability is the default,
  // so choosing it drops the param entirely rather than writing back the
  // canonical "?sort=availability" - keeps the URL at its simplest form
  // without changing behavior (any missing/non-"name" value already means
  // availability).
  const setSortMode = (mode) => {
    const next = new URLSearchParams(searchParams)
    if (mode === "name") {
      next.set("sort", "name")
    } else {
      next.delete("sort")
    }
    setSearchParams(next, { replace: true })
  }
  // "View all" (the ingredient/bottle detail page, Stage 3) deep-links here
  // with ?ingredient=<typeId> - matching always runs against the resolved
  // type, per the approved requirement, regardless of whether the origin
  // page was viewing a generic type or a specific product. Read directly,
  // not captured into removable filter-chip state, matching this file's
  // existing precedent for a deep-link-only filter.
  const ingredientId = searchParams.get("ingredient")
  const ingredientMatchIds = useMemo(() => {
    if (!ingredientId) return null
    const matches = findRecipesUsingIngredient(
      computed,
      { typeId: ingredientId },
      { types: catalog.types, products: catalog.products },
    )
    return new Set(matches.map((m) => m.id))
  }, [computed, ingredientId, catalog.types, catalog.products])
  const [query, setQuery] = useState("")
  const searchInputRef = useRef(null)
  // Home's own search bar is just a styled button, not a real input (it
  // can't own text entry across a route change) - it links here with
  // ?focus=1 instead, and this is the other half: focus the real input on
  // arrival so a search-cocktails tap doesn't cost a second tap to actually
  // start typing.
  useEffect(() => {
    if (searchParams.get("focus")) searchInputRef.current?.focus()
  }, [searchParams])
  const [availFilter, setAvailFilter] = useState("all")
  const [sourceFilters, setSourceFilters] = useState(
    initialSource && SOURCE_FILTERS.some((f) => f.key === initialSource)
      ? [initialSource]
      : [],
  )
  const [tasteFilters, setTasteFilters] = useState([])
  const [showFilters, setShowFilters] = useState(Boolean(sourceFilters.length))
  const [availPickerOpen, setAvailPickerOpen] = useState(false)
  const availTriggerRef = useRef(null)
  const currentAvail = AVAIL_FILTERS.find((f) => f.key === availFilter)
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const sortTriggerRef = useRef(null)

  const toggleArr = (arr, val, set) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])

  const filtered = useMemo(
    () =>
      computed.filter((c) => {
        if (ingredientMatchIds && !ingredientMatchIds.has(c.id)) return false
        if (
          query &&
          !c.name.toLowerCase().includes(query.toLowerCase()) &&
          !c.taste.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        )
          return false
        // Stage D.2: compares against the shared `display.tier`, not raw
        // `avail` - selecting "Almost" must not surface a recipe that's
        // actually adapted (display.tier === "adapted"), and selecting
        // "Make With Adaptations" must actually find something.
        if (
          availFilter !== "all" &&
          (c.display?.tier ?? c.avail) !== availFilter
        )
          return false
        if (sourceFilters.length && !sourceFilters.includes(c.source))
          return false
        if (
          tasteFilters.length &&
          !tasteFilters.some((t) => c.taste.includes(t))
        )
          return false
        return true
      }),
    [
      computed,
      ingredientMatchIds,
      query,
      availFilter,
      sourceFilters,
      tasteFilters,
    ],
  )

  // Grouped rendering only ever applies on top of the already-filtered set
  // above - search/availFilter/sourceFilters/tasteFilters all still run
  // first, exactly as they do for the flat view. Empty tiers are dropped
  // entirely (not rendered as an empty heading) rather than filtered out of
  // `filtered` itself, so the "No cocktails found" empty state below still
  // only fires when there's truly nothing to show, grouped or not.
  const groups = useMemo(
    () => (sortMode === "availability" ? groupByDisplayTier(filtered) : null),
    [filtered, sortMode],
  )

  // Stage D.4 - the same shared "how many can I make" answer Home/Build
  // Your Bar show. Deliberately based on the FULL `computed` set, not
  // `filtered` - a source/taste filter narrowing the visible grid must not
  // also change the answer to "how many can I make," which would disagree
  // with what Home/Build Your Bar report for the same account.
  const makeabilityCounts = summarizeMakeability(computed)

  // Name A-Z: the same already-filtered set, just alphabetically ordered
  // instead of grouped. Only actually used when sortMode is "name" (the
  // grouped branch takes over otherwise), computed unconditionally since
  // hooks can't be called conditionally.
  const sortedFlat = useMemo(
    () => [...filtered].sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  )

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <div className="pt-4 px-4 pb-0 bg-bg2 border-b border-bdr sticky top-0 z-10 backdrop-blur-md">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3"
            />
            <input
              ref={searchInputRef}
              placeholder="Search cocktails, tastes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-surface border border-bdr rounded-sm py-[9px] pl-9 pr-3 text-tx text-sm font-body w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "rounded-sm px-3 cursor-pointer flex items-center gap-1.5 border",
              showFilters
                ? "bg-cyan/12 border-cyan text-cyan"
                : "bg-surface border-bdr text-tx2",
            )}
          >
            <IconFilter size={16} />{" "}
            <span className="text-[13px] font-display font-semibold">
              Filter
            </span>
          </button>
          <button
            onClick={() => navigate("/library/new")}
            className="glow-cyan bg-cyan border-none rounded-sm w-10 h-10 cursor-pointer flex items-center justify-center text-[#07091a] shrink-0"
          >
            <IconPlus size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pb-3">
          <button
            ref={availTriggerRef}
            type="button"
            onClick={() => setAvailPickerOpen(true)}
            className="flex items-center gap-2 py-2 px-3 bg-surface border border-bdr rounded-full cursor-pointer w-fit"
          >
            <span className="text-[13px] text-cyan">{currentAvail.label}</span>
            <IconChevD size={14} className="text-tx3" />
          </button>
          <button
            ref={sortTriggerRef}
            type="button"
            onClick={() => setSortPickerOpen(true)}
            className="flex items-center gap-2 py-2 px-3 bg-surface border border-bdr rounded-full cursor-pointer w-fit"
          >
            <span className="text-[13px] text-tx3">
              Sort <span className="text-cyan">{currentSort.label}</span>
            </span>
            <IconChevD size={14} className="text-tx3" />
          </button>
          {SOURCE_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={sourceFilters.includes(f.key)}
              onClick={() => toggleArr(sourceFilters, f.key, setSourceFilters)}
            />
          ))}
        </div>
        {showFilters && (
          <div className="pb-3">
            <div className="text-[11px] font-bold text-tx3 font-display uppercase tracking-[0.06em] mb-1.5">
              Taste
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tasteTags.map((t) => (
                <FilterChip
                  key={t.id}
                  label={t.name}
                  active={tasteFilters.includes(t.name)}
                  onClick={() =>
                    toggleArr(tasteFilters, t.name, setTasteFilters)
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomSheet
        open={availPickerOpen}
        onClose={() => setAvailPickerOpen(false)}
        title="Filter by availability"
        anchorRef={availTriggerRef}
      >
        <div className="flex gap-2 flex-wrap">
          {AVAIL_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={availFilter === f.key}
              onClick={() => {
                setAvailFilter(f.key)
                setAvailPickerOpen(false)
              }}
            />
          ))}
        </div>
      </BottomSheet>
      <BottomSheet
        open={sortPickerOpen}
        onClose={() => setSortPickerOpen(false)}
        title="Sort by"
        anchorRef={sortTriggerRef}
      >
        <div className="flex gap-2 flex-wrap">
          {SORT_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={sortMode === f.key}
              onClick={() => {
                setSortMode(f.key)
                setSortPickerOpen(false)
              }}
            />
          ))}
        </div>
      </BottomSheet>

      {computed.length > 0 && (
        <p className="px-4 pt-3 text-xs text-tx3">
          {formatMakeabilityBreakdown(makeabilityCounts)}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-15 px-6 gap-3 text-tx3">
          <IconGlass size={40} className="opacity-30" />
          <p className="text-base font-display font-semibold">
            No cocktails found
          </p>
          <p className="text-[13px] text-center">
            Try adjusting your filters or search term.
          </p>
          <Btn
            variant="ghost"
            small
            onClick={() => {
              setQuery("")
              setAvailFilter("all")
              setSourceFilters([])
              setTasteFilters([])
            }}
          >
            Clear filters
          </Btn>
        </div>
      ) : groups ? (
        <div className="p-4 flex flex-col gap-6">
          {groups.map(({ tier, items }) => (
            <div key={tier}>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>{AVAIL_GROUP_LABEL[tier]}</SectionTitle>
                <span
                  className={clsx(
                    "text-xs font-mono flex items-center gap-1",
                    AVAIL_TONE[tier],
                  )}
                >
                  {AVAIL_CFG[tier].icon} {items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {items.map((c) => (
                  <CocktailCard
                    key={c.id}
                    c={c}
                    onClick={() => navigate(`/library/${c.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {sortedFlat.map((c) => (
            <CocktailCard
              key={c.id}
              c={c}
              onClick={() => navigate(`/library/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
