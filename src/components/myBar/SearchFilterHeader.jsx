import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { IconChevD, IconPlus, IconSearch } from "@/components/icons"
import { IngredientIcon } from "@/components/IngredientIcon"
import { AdminMenu } from "@/components/myBar/AdminMenu"
import { BottomSheet, FilterChip } from "@/components/primitives"

// My ingredients' sticky header: search within the owned set, a visible
// "+ Add ingredients" entry point (My Bar redesign Stage 1 - the screen is
// owned-only now, so adding is its own separate flow at /bar/add-ingredients
// rather than an "Owned only" toggle on a full-catalogue list), and a
// category jump. "+ Add ingredients" is always present, not a mode toggle.
export function SearchFilterHeader({
  query,
  onQueryChange,
  onAddClick,
  cats,
  cat,
  onCatChange,
  categoryShapeByName,
  isAdmin,
}) {
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const catTriggerRef = useRef(null)
  const currentShape = categoryShapeByName.get(cat)

  // Same ?focus=1 -> autofocus convention LibraryScreen already uses.
  const [searchParams] = useSearchParams()
  const searchInputRef = useRef(null)
  useEffect(() => {
    if (searchParams.get("focus")) searchInputRef.current?.focus()
  }, [searchParams])
  return (
    <div className="pt-4 px-4 pb-3 bg-bg2 border-b border-bdr sticky top-0 z-10 backdrop-blur-md">
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3"
          />
          <input
            ref={searchInputRef}
            placeholder="Search your bar..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="bg-surface border border-bdr rounded-sm py-[9px] pl-9 pr-3 text-tx text-sm font-body w-full"
          />
        </div>
        <AdminMenu isAdmin={isAdmin} />
      </div>
      <button
        onClick={onAddClick}
        className="glow-cyan bg-cyan border-none rounded-sm w-full min-h-11 cursor-pointer flex items-center justify-center gap-1.5 text-[#07091a] text-[13px] font-display font-bold mb-2"
      >
        <IconPlus size={16} /> Add ingredients
      </button>
      <button
        ref={catTriggerRef}
        type="button"
        onClick={() => setCatPickerOpen(true)}
        className="w-full flex items-center gap-2 py-2 px-3 bg-surface border border-bdr rounded-full cursor-pointer min-w-0"
      >
        {currentShape && (
          <IngredientIcon shape={currentShape} size={15} color="var(--cyan)" />
        )}
        <span className="flex-1 text-left text-[13px] text-cyan truncate">
          {cat}
        </span>
        <IconChevD size={14} className="text-tx3 shrink-0" />
      </button>
      <BottomSheet
        open={catPickerOpen}
        onClose={() => setCatPickerOpen(false)}
        title="Jump to category"
        anchorRef={catTriggerRef}
      >
        <div className="flex gap-2 flex-wrap">
          {cats.map((c) => {
            const shape = categoryShapeByName.get(c)
            return (
              <FilterChip
                key={c}
                label={c}
                icon={
                  shape && (
                    <IngredientIcon
                      shape={shape}
                      size={15}
                      color={cat === c ? "var(--cyan)" : "var(--text3)"}
                    />
                  )
                }
                active={cat === c}
                onClick={() => {
                  onCatChange(c)
                  setCatPickerOpen(false)
                }}
              />
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}
