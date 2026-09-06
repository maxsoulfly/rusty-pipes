import clsx from "clsx"
import { IconCheck, IconChevD, IconChevR } from "@/components/icons"
import { IngredientIcon } from "@/components/IngredientIcon"
import { Card } from "@/components/primitives"

// The per-ingredient-type card: color swatch, name, owned-products
// subtitle, and (for a parent not directly owned) a "via <child>" note -
// see coveringChildren below.
//
// `onCardClick` and `onToggleOwned` are deliberately separate props, not
// one dual-purpose handler - exploring an ingredient must never risk
// silently changing what's owned (found as a real inconsistency during the
// Cocktail Library + My Bar UX audit: ExpandedProducts.jsx already got
// this right via its own OwnedToggle, this card didn't). Each consumer
// decides what tapping the card body does: Build Your Bar and Add
// ingredients pass the same function to both (tap-to-select-and-own), My
// ingredients passes a navigate-to-view handler to `onCardClick` and keeps
// `onToggleOwned` as the only thing the dedicated checkmark button below
// ever does.
//
// Admin ingredient-type editing is NOT here - it moved to an admin-only
// "Edit type" action on IngredientDetailScreen (My Bar redesign Stage 1);
// full editing also stays in Admin -> Ingredient Types. Keeping the pencil
// off the browsing grid keeps the card a pure browse/own control.
export function TypeCard({
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
    <Card
      onClick={onCardClick}
      className="pt-2.5 px-2 pb-2 cursor-pointer flex flex-col items-center text-center gap-1 overflow-hidden"
      style={{
        // Border/background stay inline rather than className: Card's own
        // base classes already set both, so a conditional className here
        // would compete with Card's for the same properties at equal
        // specificity (see primitives.jsx's ConfirmPanel for the same
        // pattern). Without this, a card with a long owned-products list
        // (e.g. several bottles of one whiskey type) could visually grow
        // wider than its fixed-width slot (w-26/w-24 in a family cluster's
        // flex-wrap row) instead of the product-name text truncating
        // within it - the ellipsis styling below only works if the box
        // it's ellipsizing inside actually stays put (see overflow-hidden
        // above).
        border: `1px solid ${owned ? "var(--cyan)" : "var(--border-s)"}`,
        background: owned ? "rgba(34,211,238,0.08)" : "var(--surface)",
      }}
    >
      {/* Always rendered - the ownership checkmark must always be reachable,
          not just "when there's something to show". flex-wrap is a
          deliberate defensive choice: the checkmark button alone is 44x44px
          (a stricter minimum than the 32px chevron, per the explicit
          touch-target requirement) on cards as narrow as 104px in My
          ingredients' own singles grid - wrapping to a second line rather
          than overflowing/clipping if the checkmark + expand chevron can't
          fit one row on a family-cluster child card. */}
      <div className="w-full flex flex-wrap items-center justify-between gap-1">
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
          {owned && <IconCheck size={14} />}
        </button>
        {allProducts.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            title={`${allProducts.length} product(s)`}
            className="bg-transparent border-none cursor-pointer w-8 h-8 text-tx3 flex items-center justify-center"
          >
            {expanded ? <IconChevD size={12} /> : <IconChevR size={12} />}
          </button>
        )}
      </div>
      {/* No tinted background tile - the icon's own fillColor already
          carries the ingredient's real color (same as a "Clear" swatch,
          which never had a visible tile either since its color is near-
          transparent). Removing the tile for every color, not just pale
          ones, meant the icon itself could grow instead of sharing space
          with a box around it. */}
      <IngredientIcon
        shape={type.shape}
        size={isChild ? 38 : 46}
        color={owned ? "var(--text2)" : "var(--text3)"}
        fillColor={type.color ?? "#4e6680"}
      />
      <div
        className={clsx(
          "font-body w-full overflow-hidden text-ellipsis whitespace-nowrap transition-colors duration-150",
          isChild ? "text-xs font-normal" : "text-[13px] font-medium",
          owned ? "text-tx" : "text-tx3",
        )}
      >
        {type.name}
      </div>
      {ownedProducts.length > 0 && (
        <div className="text-[10px] text-tx3 w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {ownedProducts.map((p) => p.name).join(", ")}
        </div>
      )}
      {coveringChildren.length > 0 && (
        <div className="text-[10px] text-cyan w-full overflow-hidden text-ellipsis whitespace-nowrap">
          via {coveringChildren.map((c) => c.name).join(", ")}
        </div>
      )}
    </Card>
  )
}
