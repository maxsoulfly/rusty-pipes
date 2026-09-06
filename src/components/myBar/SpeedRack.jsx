import { IngredientIcon } from "@/components/IngredientIcon"

// Speed Rack strip at the top of My ingredients (My Bar redesign Stage 3):
// a member's pinned owned bottles, for fast access. Renders nothing until
// there is at least one pin. Each item is a wrapping pill (>=44px tall, no
// horizontal scroll) that opens its recipe page - exactly like a shelf
// item; pin/unpin lives on that page, so this strip stays minimal and the
// verified shelf layout below is untouched.
export function SpeedRack({ items, onOpen }) {
  if (items.length === 0) return null
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.08em] font-display mb-2">
        Speed Rack
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => onOpen(it)}
            className="flex items-center gap-1.5 py-1.5 px-3 min-h-11 max-w-full bg-surface border border-cyan/40 rounded-full cursor-pointer"
          >
            <IngredientIcon
              shape={it.shape}
              size={18}
              color="var(--text2)"
              fillColor={it.color ?? "#4e6680"}
            />
            <span className="text-[12px] text-tx truncate">{it.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
