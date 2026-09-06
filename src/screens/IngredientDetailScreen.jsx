import { useMemo } from "react"
import clsx from "clsx"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import { IconBottle, IconGlass } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import {
  AVAIL_CFG,
  AVAIL_TONE,
  Btn,
  SectionTitle,
} from "@/components/primitives"
import { findRecipesUsingIngredient } from "@/domain/ingredientRecipeMatches"

// Same grouping language LibraryScreen.jsx's ?sort=availability view
// already established (Stage 2 of this same effort) - one shared visual
// vocabulary for "here's how available this is" across the app, not a
// second one invented for this screen.
const GROUP_ORDER = ["perfect", "good", "almost", "unavail"]
const GROUP_LABEL = {
  perfect: "Ready to Pour",
  good: "Good Enough",
  almost: "Almost There",
  unavail: "Unavailable",
}

// "Up to 10 matching recipes total" per the approved requirement - a
// straight cap on the tier-ordered list (perfect, then good, then almost,
// then unavailable), not a per-tier cap and not restricted to only
// available ones. A recipe that only became visible by padding out to 10
// with unavailable matches is still an honest, real match - it just isn't
// makeable right now.
const MAX_VISIBLE = 10

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

// One screen, two routes (/bar/type/:id and /bar/product/:id in App.jsx),
// distinguished by the `kind` prop each route passes explicitly - simpler
// and more explicit than sniffing the current path. Matching always runs
// against the resolved ingredient TYPE (see
// domain/ingredientRecipeMatches.js), but a product's own bottle name is
// what's shown as the page's own context, per the approved requirement -
// "Tanqueray Gin" stays "Tanqueray Gin" even though it matches exactly the
// same recipes as generic "Gin".
export default function IngredientDetailScreen({ kind }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { computed, catalog } = useOutletContext()
  const { types, products } = catalog

  const product = kind === "product" ? products.find((p) => p.id === id) : null
  const resolvedType =
    kind === "product"
      ? types.find((t) => t.id === product?.ingredient_type_id)
      : types.find((t) => t.id === id)

  const allMatches = useMemo(() => {
    if (!resolvedType) return []
    const viewing = kind === "product" ? { productId: id } : { typeId: id }
    return findRecipesUsingIngredient(computed, viewing, { types, products })
  }, [computed, resolvedType, kind, id, types, products])

  const { visibleGroups, totalCount } = useMemo(() => {
    const byTier = { perfect: [], good: [], almost: [], unavail: [] }
    allMatches.forEach((m) => byTier[m.avail]?.push(m))
    let remaining = MAX_VISIBLE
    const groups = GROUP_ORDER.map((tier) => {
      const items = byTier[tier].slice(0, Math.max(remaining, 0))
      remaining -= items.length
      return { tier, items }
    }).filter((g) => g.items.length > 0)
    return { visibleGroups: groups, totalCount: allMatches.length }
  }, [allMatches])

  // Invalid/stale link (a deleted type, a typo'd id, a product whose type
  // has since been merged/removed) - a clear way back rather than a blank
  // or broken screen.
  if (!resolvedType) {
    return (
      <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
        <TopBar title="Not found" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center py-15 px-6 gap-3 text-tx3">
          <IconBottle size={40} className="opacity-30" />
          <p className="text-base font-display font-semibold">
            Ingredient not found
          </p>
          <p className="text-[13px] text-center">
            This link may be out of date.
          </p>
          <Btn variant="ghost" small onClick={() => navigate("/bar")}>
            Back to My Bar
          </Btn>
        </div>
      </div>
    )
  }

  const displayName =
    kind === "product"
      ? (product?.name ?? resolvedType.name)
      : resolvedType.name

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <TopBar title={displayName} onBack={() => navigate(-1)} />
      <div className="p-4">
        {/* Only shown when it adds real information - viewing a type
            directly never shows this, since it would just repeat the
            title above. */}
        {kind === "product" && resolvedType.name !== displayName && (
          <p className="text-xs text-tx3 mb-4">{resolvedType.name}</p>
        )}

        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-15 px-6 gap-3 text-tx3">
            <IconGlass size={40} className="opacity-30" />
            <p className="text-base font-display font-semibold">
              No recipes use this yet
            </p>
            <p className="text-[13px] text-center">
              Check back as more recipes are added.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map(({ tier, items }) => (
              <div key={tier}>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>{GROUP_LABEL[tier]}</SectionTitle>
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
                        <CocktailCard
                          c={m}
                          onClick={() => navigate(`/library/${m.id}`)}
                        />
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
                  navigate(
                    `/library?ingredient=${resolvedType.id}&sort=availability`,
                  )
                }
              >
                View all {totalCount}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
