import { IngredientIcon } from "@/components/IngredientIcon"
import { isRedundantHeading } from "@/domain/groupHeading"

// A parent type with children, on the shelf (My Bar redesign Stage 2).
// Softened from the old bordered card to just a small label plus its own
// stretch of shelf - it reads as part of the same shelf, not a separate
// box. The grouping logic still comes from the screen; this component only
// owns the label + sub-shelf layout. `renderCard`/`renderExpanded` are the
// same per-type dispatch used for standalone types.
//
// `categoryName` is the enclosing category heading MyBarScreen already
// renders directly above this cluster - when a parent type's own name
// duplicates it (domain/groupHeading.js's isRedundantHeading; found live:
// category "Beer" has a mid-level "Beer" parent type grouping Light Lager/
// Pilsner/Stout, so the family label and the category heading above it
// both rendered "BEER"), this label adds nothing and is skipped. Every
// other parent type in the catalogue (Rum, Whiskey, Sparkling Wine, ...)
// has a name distinct from its own category, so this only ever suppresses
// a genuine duplicate, never a real subheading.
export function FamilyCluster({
  parent,
  children,
  categoryName,
  renderCard,
  renderExpanded,
}) {
  const members = [
    { type: parent, isChild: false },
    ...children.map((c) => ({ type: c, isChild: true })),
  ]
  const labelIsRedundant = isRedundantHeading(parent.name, categoryName)
  return (
    <div className="flex flex-col gap-1.5">
      {!labelIsRedundant && (
        <div className="flex items-center gap-1.5 pl-1">
          <IngredientIcon
            shape={parent.shape}
            size={12}
            color="var(--text3)"
            fillColor={parent.color ?? "#4e6680"}
          />
          <div className="text-[10px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
            {parent.name}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-0 gap-y-5">
        {members.map(({ type, isChild }) => (
          // display:contents so the card and (when expanded) its full-width
          // product panel are both direct grid items.
          <div key={type.id} className="contents">
            {renderCard(type, isChild)}
            {renderExpanded(type, { gridColumn: "1 / -1" })}
          </div>
        ))}
      </div>
    </div>
  )
}
