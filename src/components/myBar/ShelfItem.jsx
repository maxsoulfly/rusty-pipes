import clsx from "clsx"
import { IconCheck, IconChevD, IconChevR } from "@/components/icons"
import { IngredientIcon } from "@/components/IngredientIcon"

// One bottle on a shelf (My Bar redesign Stage 2). Same handler contract as
// TypeCard - My ingredients swaps this in for the shelf look, while Add
// ingredients and Build Your Bar keep TypeCard's plain grid card.
//
// Three distinct actions, unchanged from Stage 1:
//  - tap the bottle/name  -> onCardClick (view its recipes)
//  - tap the checkmark     -> onToggleOwned (generic ownership only)
//  - tap the chevron       -> onToggleExpand (product list)
// The bottle/name is a large tap target; the checkmark stays a real
// 44x44px button and stops propagation so viewing can never toggle
// ownership (or vice versa).
export function ShelfItem({
  type,
  isChild,
  owned,
  ownedProducts,
  allProducts,
  expanded,
  onToggleExpand,
  coveringChildren,
  onCardClick,
  onToggleOwned,
}) {
  return (
    // border-b is the shelf line: with the grid's gap-x-0, adjacent items'
    // borders butt together into one continuous shelf. h-full + the grid's
    // default stretch keeps every item in a row the same height so the
    // lines align regardless of how far a name wraps. Kept to 2px / the
    // standard border token so it reads as a shelf, not a loud rule.
    <div className="flex h-full flex-col items-stretch border-b-2 border-bdr pb-1.5">
      <button
        onClick={onCardClick}
        className="flex flex-1 flex-col items-center gap-1 px-1 pt-1.5 bg-transparent border-none cursor-pointer w-full"
      >
        <IngredientIcon
          shape={type.shape}
          size={isChild ? 34 : 42}
          color={owned ? "var(--text2)" : "var(--text3)"}
          fillColor={type.color ?? "#4e6680"}
        />
        <span
          className={clsx(
            "font-body text-center leading-tight break-words w-full",
            isChild ? "text-[10px]" : "text-[11px]",
            owned ? "text-tx" : "text-tx3",
          )}
        >
          {type.name}
        </span>
        {ownedProducts.length > 0 && (
          <span className="text-[9px] text-tx3 w-full overflow-hidden text-ellipsis whitespace-nowrap text-center">
            {ownedProducts.map((p) => p.name).join(", ")}
          </span>
        )}
        {coveringChildren.length > 0 && (
          <span className="text-[9px] text-cyan w-full overflow-hidden text-ellipsis whitespace-nowrap text-center">
            via {coveringChildren.map((c) => c.name).join(", ")}
          </span>
        )}
      </button>
      <div className="flex items-center justify-center gap-1 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleOwned()
          }}
          aria-label={
            owned
              ? `Remove ${type.name} from My Bar`
              : `Mark ${type.name} as owned`
          }
          aria-pressed={owned}
          className={clsx(
            "w-11 h-11 rounded-full border flex items-center justify-center shrink-0 cursor-pointer",
            owned
              ? "bg-cyan border-cyan text-[#07091a]"
              : "bg-transparent border-bdr text-tx3",
          )}
        >
          {owned && <IconCheck size={13} />}
        </button>
        {allProducts.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            title={`${allProducts.length} product(s)`}
            className="w-9 h-9 bg-transparent border-none cursor-pointer text-tx3 flex items-center justify-center shrink-0"
          >
            {expanded ? <IconChevD size={12} /> : <IconChevR size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}
