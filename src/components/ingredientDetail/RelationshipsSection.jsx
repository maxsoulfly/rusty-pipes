import { IngredientLink } from "@/components/detail/IngredientLink"
import { SectionTitle } from "@/components/primitives"
import { formatAmount } from "@/domain/availability"
import { isPreparationSatisfiable } from "@/domain/makeability"

// Ingredient Detail Stage I.3 - relationships + homemade preparation.
// Purely presentational: `canProvideRows`/`canBeReplacedByRows`/
// `preparationRow` arrive already resolved via domain/ingredientRelationships.js
// (pure, unit-tested there) - this component only lays them out. Each
// section is only rendered when data exists (no empty headings).
// Directional by construction: "Can provide"/"Can be replaced by" only ever
// show this type's own from/raw side, never the reverse - the plan's own
// explicit "do not add the reverse direction" scope boundary means there is
// no prop here that could show one.
export function RelationshipsSection({
  displayName,
  canProvideRows,
  canBeReplacedByRows,
  preparationRow,
  preparationInputs,
  resolvedOwnedTypeIds,
  householdBasicIds,
  formConversionsForSatisfiability,
  unit,
}) {
  return (
    <>
      {canProvideRows.length > 0 && (
        <div className="mb-4">
          <SectionTitle>Can provide</SectionTitle>
          <p className="text-xs text-tx3 mb-2 leading-snug">
            One-way - doesn't mean the reverse is also true.
          </p>
          <div className="flex flex-col gap-2">
            {canProvideRows.map((row) => (
              <div
                key={row.preparedTypeId}
                className="rounded-sm border border-bdr bg-surface2 p-2.5"
              >
                <div className="flex items-center gap-2">
                  {/* Secondary availability signal only (per the plan's
                      "keep this secondary" instruction) - reads the same
                      resolved ownership Set every other screen already
                      reads, no new availability system. */}
                  {resolvedOwnedTypeIds.has(row.preparedTypeId) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />
                  )}
                  <IngredientLink
                    ingId={row.preparedTypeId}
                    className="text-[13px] text-tx font-display font-semibold"
                  >
                    {row.preparedName}
                  </IngredientLink>
                </div>
                {row.guidance && (
                  <div className="text-xs text-tx2 mt-0.5">{row.guidance}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canBeReplacedByRows.length > 0 && (
        <div className="mb-4">
          <SectionTitle>Can be replaced by</SectionTitle>
          <p className="text-xs text-tx3 mb-2 leading-snug">
            One-way - doesn't mean these can replace {displayName} back.
          </p>
          <div className="flex flex-col gap-2">
            {canBeReplacedByRows.map((row) => (
              <div
                key={row.toTypeId}
                className="rounded-sm border border-bdr bg-surface2 p-2.5"
              >
                <div className="flex items-center gap-2">
                  {resolvedOwnedTypeIds.has(row.toTypeId) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />
                  )}
                  <IngredientLink
                    ingId={row.toTypeId}
                    className="text-[13px] text-tx font-display font-semibold"
                  >
                    {row.toName}
                  </IngredientLink>
                </div>
                {row.flavorNote && (
                  <div className="text-xs text-tx2 mt-0.5">{row.flavorNote}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {preparationRow && (
        <div className="mb-4">
          <SectionTitle>Homemade preparation</SectionTitle>
          {/* Only shown when it adds information beyond the page's own
              title, same rule as the product/type name line above. */}
          {preparationRow.name && preparationRow.name !== displayName && (
            <p className="text-[13px] text-tx font-display font-semibold mb-1.5">
              {preparationRow.name}
            </p>
          )}
          <div className="flex flex-col gap-1.5 mb-2.5">
            {preparationInputs.map((input) => (
              <div key={input.ingredientTypeId} className="flex items-center gap-2">
                {/* Per-input satisfiability (Stage D.1's own helper, not
                    a new check) - "you have 1 of 2," never implying the
                    produced ingredient itself is owned just because its
                    inputs are on hand. */}
                {isPreparationSatisfiable(
                  [input],
                  resolvedOwnedTypeIds,
                  householdBasicIds,
                  formConversionsForSatisfiability,
                ) && <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />}
                <IngredientLink
                  ingId={input.ingredientTypeId}
                  className="text-[13px] text-tx font-body"
                >
                  {input.name}
                </IngredientLink>
                <span className="text-[13px] font-mono text-tx2 ml-auto whitespace-nowrap">
                  {formatAmount(
                    { amount: input.amount, unitLabel: input.unitLabel },
                    unit,
                  )}
                </span>
              </div>
            ))}
          </div>
          {preparationRow.instructions?.length > 0 && (
            <>
              <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] mb-1.5 font-display">
                Steps
              </div>
              <ol className="list-decimal list-inside text-[13px] text-tx2 flex flex-col gap-1">
                {preparationRow.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </>
  )
}
