import clsx from "clsx"
import { SectionTitle } from "@/components/primitives"
import { formatAmount } from "@/domain/availability"
import {
  computePartsRatio,
  formatPartsAmount,
  hasConflictingPartsUnits,
  PARTS_MODE_CONFLICT_EXPLANATION,
  PARTS_MODE_EXPLANATION,
} from "@/domain/parts"
import { scaleIngredientAmount } from "@/domain/servings"

export function IngredientsSection({
  ings,
  substitutions,
  householdBasics,
  formConversions,
  missingOptional,
  owned,
  unit,
  setUnit,
  servings,
  partsMode,
  setPartsMode,
  // (missingTypeId) => [{ toId, toName, note, owned }] - catalogue "Suggested
  // substitutes" (Stage B). Display only: these never affect availability,
  // so a row that has suggestions still reads as missing.
  getSubstituteSuggestions,
  // Stage D.1 - the recipe's `adapted` result from computeMakeability(), or
  // null. A component listed in `adapted.resolvedRequired` is genuinely
  // still missing (never marked owned - no ownership is faked here); it
  // gets its own distinct violet row instead of the muted "Try:" hint,
  // since it's an actionable, resolved replacement rather than a mere
  // suggestion.
  adapted,
}) {
  const adaptedByIngId = new Map(
    (adapted?.resolvedRequired ?? []).map((r) => [r.ingId, r]),
  )
  // Computed from the recipe's base stored amounts (never servings-scaled -
  // see domain/parts.js) so the ratio never changes when servings does.
  // A recipe mixing stored ml with a manually-typed "part" component has no
  // single common part size - hasConflictingPartsUnits() catches that so
  // volume components fall back to plain ml/oz instead of being merged onto
  // a ratio they don't actually share (Stage 4 decision).
  const mixedConflict = partsMode && hasConflictingPartsUnits(ings)
  const showRatios = partsMode && !mixedConflict
  const partsRatios = showRatios ? computePartsRatio(ings) : null
  const ratioByIng = partsRatios
    ? new Map(ings.map((ri, i) => [ri, partsRatios[i]]))
    : null
  // The servings selector is hidden while parts mode is active (DetailScreen
  // .jsx) - a hidden serving count must never silently change what's shown,
  // so everything that isn't a computed ratio (non-volume quantities, and
  // any ml component in the mixed-conflict fallback below) displays at the
  // base 1-serving amount. The real `servings` state is left untouched, so
  // ml/oz picks back up exactly where it left off once parts mode turns off.
  const displayServings = partsMode ? 1 : servings

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Ingredients</SectionTitle>
          <div className="flex bg-surface border border-bdr rounded-sm overflow-hidden">
            {["ml", "oz"].map((u) => (
              <button
                key={u}
                onClick={() => {
                  setUnit(u)
                  setPartsMode(false)
                }}
                className={clsx(
                  "py-1 px-3 border-none cursor-pointer text-xs font-mono font-semibold transition-all duration-150",
                  !partsMode && unit === u
                    ? "bg-cyan text-[#07091a]"
                    : "text-tx2",
                )}
              >
                {u}
              </button>
            ))}
            <button
              onClick={() => setPartsMode(true)}
              className={clsx(
                "py-1 px-3 border-none cursor-pointer text-xs font-mono font-semibold transition-all duration-150",
                partsMode ? "bg-cyan text-[#07091a]" : "text-tx2",
              )}
            >
              parts
            </button>
          </div>
        </div>
        {partsMode && (
          <p className="mt-1.5 text-[11px] text-tx3 leading-snug">
            {mixedConflict
              ? PARTS_MODE_CONFLICT_EXPLANATION
              : PARTS_MODE_EXPLANATION}
          </p>
        )}
      </div>
      {["required", "optional", "garnish"].map((role) => {
        const roleIngs = ings.filter((i) => i.role === role)
        if (!roleIngs.length) return null
        return (
          <div key={role} className="mb-3">
            {role !== "required" && (
              <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] mb-1.5 font-display">
                {role}
              </div>
            )}
            {roleIngs.map((ri) => {
              const substitution = substitutions[ri.ingId]
              const householdBasic = householdBasics?.[ri.ingId]
              const formConversion = formConversions?.[ri.ingId]
              const isOwned =
                owned.has(ri.ingId) ||
                Boolean(substitution) ||
                Boolean(householdBasic) ||
                Boolean(formConversion)
              // Only consulted when strict has already left this component
              // missing (adaptedByIngId is built only from
              // adapted.resolvedRequired, which itself only ever lists
              // still-missing components) - never overrides an isOwned row.
              const adaptedMatch = isOwned
                ? undefined
                : adaptedByIngId.get(ri.ingId)
              const suggestions =
                isOwned || adaptedMatch
                  ? []
                  : (getSubstituteSuggestions?.(ri.ingId) ?? [])
              const ratio = ratioByIng?.get(ri)
              const amountText =
                ratio != null
                  ? formatPartsAmount(ratio)
                  : formatAmount(
                      scaleIngredientAmount(ri, displayServings),
                      unit,
                    )
              return (
                <div
                  key={ri.ingId}
                  className="flex items-center gap-3 py-2.5 border-b border-bdr"
                >
                  <div
                    className={clsx(
                      "w-2 h-2 rounded-full shrink-0",
                      isOwned
                        ? "bg-green shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                        : adaptedMatch
                          ? "bg-violet shadow-[0_0_6px_rgba(167,139,250,0.6)]"
                          : ri.role === "required"
                            ? "bg-coral"
                            : "bg-tx3",
                    )}
                  />
                  <span className="flex-1">
                    <span className="text-sm text-tx font-body">
                      {ri.name ?? ri.ingId}
                    </span>
                    {substitution ? (
                      <span className="block text-[11px] text-tx3">
                        Substituting: {substitution.matchedName}
                        {substitution.note ? ` — ${substitution.note}` : ""}
                      </span>
                    ) : formConversion ? (
                      <span className="block text-[11px] text-tx3">
                        {formConversion.guidance}
                      </span>
                    ) : householdBasic ? (
                      <span className="block text-[11px] text-tx3">
                        Household basic
                      </span>
                    ) : adaptedMatch ? (
                      // Stage D.1 - only `via: "substitute"` exists yet
                      // (Stage D.2 adds `via: "preparation"`, which will
                      // need its own branch here linking to the
                      // preparation's own ingredients/steps).
                      <span className="block text-[11px] text-violet">
                        Adapted: {adaptedMatch.matchedName}
                        {adaptedMatch.note ? ` — ${adaptedMatch.note}` : ""}
                      </span>
                    ) : (
                      suggestions.length > 0 && (
                        <span className="block text-[11px] text-tx3 leading-snug">
                          Try:{" "}
                          {suggestions.map((s, si) => (
                            <span key={s.toId}>
                              {si > 0 && " · "}
                              <span
                                className={
                                  s.owned ? "text-tx2 font-medium" : ""
                                }
                              >
                                {s.toName}
                              </span>
                              {s.owned ? " (in your bar)" : ""}
                              {s.note ? ` — ${s.note}` : ""}
                            </span>
                          ))}
                        </span>
                      )
                    )}
                  </span>
                  <span className="text-[13px] font-mono text-tx2 whitespace-nowrap">
                    {amountText}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
      {missingOptional.length > 0 && (
        <p className="mt-2 text-xs text-tx3">
          Optional/garnish: {missingOptional.join(", ")} not in your bar — still
          makeable.
        </p>
      )}
    </div>
  )
}
