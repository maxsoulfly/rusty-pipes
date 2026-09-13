import { Btn } from "@/components/primitives"

// Ingredient Detail Stage I.2 - the My Bar action. Purely presentational:
// the actual ownership mutation (handleToggleOwnership, pending/error state)
// stays owned by IngredientDetailScreen itself - see
// domain/ingredientOwnership.js for the decision logic this reads
// (isHouseholdBasic/owned) and useInventory.js for the real write path this
// component never touches directly.
export function OwnershipAction({
  isHouseholdBasic,
  owned,
  ownershipPending,
  ownershipError,
  onToggle,
}) {
  if (isHouseholdBasic) {
    return (
      <div className="flex items-center gap-2.5 rounded-sm border border-green/30 bg-green/10 py-2.5 px-3.5">
        <span className="w-2 h-2 rounded-full bg-green shrink-0" />
        <div>
          <div className="text-[13px] font-body font-medium text-tx">
            Household basic
          </div>
          <div className="text-xs text-tx3 leading-snug">
            Always considered available - not tracked as an owned item.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Btn
        variant={owned ? "secondary" : "primary"}
        full
        disabled={ownershipPending}
        onClick={onToggle}
      >
        {owned
          ? ownershipPending
            ? "Removing..."
            : "Remove from My Bar"
          : ownershipPending
            ? "Adding..."
            : "Add to My Bar"}
      </Btn>
      {ownershipError && (
        <p className="mt-1.5 text-xs text-coral">{ownershipError}</p>
      )}
    </>
  )
}
