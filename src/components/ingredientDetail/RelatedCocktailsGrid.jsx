import clsx from "clsx"
import { useNavigate } from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import { IconGlass } from "@/components/icons"
import { AVAIL_CFG, AVAIL_TONE, Btn, SectionTitle } from "@/components/primitives"
import { AVAIL_GROUP_LABEL } from "@/data/constants"

// "Up to 10 matching recipes total" per the approved requirement - a
// straight cap on the tier-ordered list (perfect, then good, then almost,
// then unavailable), not a per-tier cap and not restricted to only
// available ones. A recipe that only became visible by padding out to 10
// with unavailable matches is still an honest, real match - it just isn't
// makeable right now.
export const MAX_VISIBLE = 10

// Minimal first version (per the approved decision) - shows the single
// most relevant match detail per recipe (its first matching component),
// not every match a recipe might have. Role is only called out when it
// isn't the unremarkable default (a required, directly-matching
// ingredient needs no extra label); a substitution is always called out,
// phrased as a possibility ("Can replace Bourbon"), never as an active
// substitution - see domain/ingredientRecipeMatches.js's own comment for
// why that distinction matters.
function matchAnnotation(match) {
  const parts = []
  if (match.role !== "required") {
    parts.push(match.role === "garnish" ? "Garnish" : "Optional")
  }
  if (match.matchType === "substitution") {
    parts.push(`Can replace ${match.ingName}`)
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

// "Cocktails using this" - IngredientDetailScreen's own tail section.
// `visibleGroups`/`totalCount` arrive already computed (groupByDisplayTier +
// capGroupsByTotal, per the shell) - this component only lays them out, it
// never re-derives grouping/ordering/limits itself. `viewAllTypeId` is the
// resolved ingredient TYPE's id (never a product id - matching stays keyed
// off the type everywhere else on this screen too).
export function RelatedCocktailsGrid({ visibleGroups, totalCount, viewAllTypeId }) {
  const navigate = useNavigate()

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-15 px-6 gap-3 text-tx3">
        <IconGlass size={40} className="opacity-30" />
        <p className="text-base font-display font-semibold">
          No recipes use this yet
        </p>
        <p className="text-[13px] text-center">
          Check back as more recipes are added.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {visibleGroups.map(({ tier, items }) => (
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
            {items.map((m) => {
              const annotation = matchAnnotation(m.matches[0])
              return (
                <div key={m.id} className="flex flex-col gap-1">
                  <CocktailCard c={m} onClick={() => navigate(`/library/${m.id}`)} />
                  {annotation && (
                    <span className="text-[11px] text-tx3 text-center">
                      {annotation}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {totalCount > MAX_VISIBLE && (
        <Btn
          variant="ghost"
          full
          onClick={() =>
            navigate(`/library?ingredient=${viewAllTypeId}&sort=availability`)
          }
        >
          View all {totalCount}
        </Btn>
      )}
    </div>
  )
}
