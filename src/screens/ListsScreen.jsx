import { useRef, useState } from "react"
import clsx from "clsx"
import { useNavigate, useOutletContext } from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import { IconBookmark, IconChevD, IconHeart } from "@/components/icons"
import { BottomSheet, FilterChip } from "@/components/primitives"
import { AVAIL_FILTERS } from "@/data/constants"

export default function ListsScreen() {
  const navigate = useNavigate()
  const { computed, favorites, wantToMake } = useOutletContext()
  const [tab, setTab] = useState("favorites") // favorites | wantToMake
  const [availFilter, setAvailFilter] = useState("all")
  const [availPickerOpen, setAvailPickerOpen] = useState(false)
  const availTriggerRef = useRef(null)
  const currentAvail = AVAIL_FILTERS.find((f) => f.key === availFilter)

  const listIds = tab === "favorites" ? favorites : wantToMake
  // Stage D.2: compares against the shared `display.tier`, not raw `avail`
  // - keeps this screen's filter consistent with Library's, which shares
  // the same AVAIL_FILTERS list (including "Make With Substitutions").
  const filtered = computed.filter(
    (c) =>
      listIds.has(c.id) &&
      (availFilter === "all" || (c.display?.tier ?? c.avail) === availFilter),
  )

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <div className="bg-bg2 border-b border-bdr sticky top-0 z-10 backdrop-blur-md">
        <div className="flex pt-4 px-4 pb-0">
          {["favorites", "wantToMake"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 p-2.5 bg-transparent border-none cursor-pointer border-b-2 font-display text-sm flex items-center justify-center gap-1.5 transition-all duration-150",
                tab === t
                  ? "border-cyan text-cyan font-bold"
                  : "border-transparent text-tx2 font-normal",
              )}
            >
              {t === "favorites" ? (
                <>
                  <IconHeart size={16} /> Favorites{" "}
                  <span className="text-xs font-mono">({favorites.size})</span>
                </>
              ) : (
                <>
                  <IconBookmark size={16} /> Want to Make{" "}
                  <span className="text-xs font-mono">({wantToMake.size})</span>
                </>
              )}
            </button>
          ))}
        </div>
        <div className="py-2.5 px-4">
          <button
            ref={availTriggerRef}
            type="button"
            onClick={() => setAvailPickerOpen(true)}
            className="flex items-center gap-2 py-2 px-3 bg-surface border border-bdr rounded-full cursor-pointer w-fit"
          >
            <span className="text-[13px] text-cyan">{currentAvail.label}</span>
            <IconChevD size={14} className="text-tx3" />
          </button>
        </div>
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-15 px-6 gap-3 text-tx3">
          {tab === "favorites" ? (
            <IconHeart size={40} className="opacity-30" />
          ) : (
            <IconBookmark size={40} className="opacity-30" />
          )}
          <p className="text-base font-display font-semibold text-tx2">
            {listIds.size === 0
              ? tab === "favorites"
                ? "No favorites yet"
                : "Nothing saved yet"
              : "No results for this filter"}
          </p>
          <p className="text-[13px] text-center">
            {listIds.size === 0
              ? "Tap the heart or bookmark icon on any cocktail to add it here."
              : "Try a different availability filter."}
          </p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {filtered.map((c) => (
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
