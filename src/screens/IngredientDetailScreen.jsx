import { useMemo, useState } from "react"
import clsx from "clsx"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import { IconBottle, IconGlass, IconStar } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import {
  AVAIL_CFG,
  AVAIL_TONE,
  Btn,
  SectionTitle,
} from "@/components/primitives"
import { AVAIL_GROUP_LABEL } from "@/data/constants"
import {
  capGroupsByTotal,
  groupByDisplayTier,
} from "@/domain/availabilityGroups"
import {
  resolveIngredientOwnershipState,
  toggleIngredientOwnership,
} from "@/domain/ingredientOwnership"
import { findRecipesUsingIngredient } from "@/domain/ingredientRecipeMatches"

// Ingredient Detail Stage I.1: this screen used to group by raw `avail`
// (it pre-dates Stage D's shared `display.tier` entirely - see
// docs/plans/ingredient-detail-page.md's audit), so a cocktail resolvable
// only via a configured substitute or a satisfiable preparation showed
// under "Unavailable" here even though Library/Home correctly showed it as
// makeable. Now shares the exact same grouping (`groupByDisplayTier`) and
// heading wording (`AVAIL_GROUP_LABEL`) as Library instead of keeping a
// second, stale copy of both.

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
  const { computed, catalog, inventory } = useOutletContext()
  const { types, products } = catalog

  // Speed Rack pin/unpin lives here, not on the shelf tile (keeps the
  // verified Stage 2 shelf layout untouched). Only offered for something
  // the member actually owns - you can't pin what isn't in your bar - and
  // it only ever flips the `pinned` flag, never touches ownership.
  const canPin =
    kind === "product"
      ? inventory.ownedProductIds.has(id)
      : inventory.ownedTypeIds.has(id)
  const isPinned =
    kind === "product"
      ? inventory.pinnedProductIds.has(id)
      : inventory.pinnedTypeIds.has(id)
  const togglePin = () =>
    kind === "product"
      ? inventory.togglePinProduct(id)
      : inventory.togglePinType(id)

  const product = kind === "product" ? products.find((p) => p.id === id) : null
  const resolvedType =
    kind === "product"
      ? types.find((t) => t.id === product?.ingredient_type_id)
      : types.find((t) => t.id === id)
  // Ingredient Detail Stage I.1 - identity only (category + description).
  // Both already loaded on every `catalog.types` row (services/catalog.js) -
  // `description` was fetched for batch import but never rendered to a
  // member anywhere before now; no new query, no new schema. Always the
  // resolved TYPE's own fields, even on a product page - a bottle doesn't
  // carry its own separate description (see the plan's Data model impact).
  const category = resolvedType
    ? catalog.categories.find((c) => c.id === resolvedType.category_id)
    : null

  // Ingredient Detail Stage I.2 - My Bar action. Decision logic lives in
  // domain/ingredientOwnership.js (pure, unit-tested there) so this
  // component stays thin; no new ownership model or write path - see that
  // file's own comments for exactly what's reused from MyBarScreen.jsx/
  // IngredientTypeEditor.jsx/useInventory.js.
  const { isHouseholdBasic, owned } = resolveIngredientOwnershipState({
    kind,
    id,
    resolvedType,
    products,
    ownedTypeIds: inventory.ownedTypeIds,
    ownedProductIds: inventory.ownedProductIds,
  })

  // Local pending/error state only - `toggleType`/`toggleProduct`
  // (useInventory.js) already apply the ownership change optimistically
  // and roll back to real state on failure via their own `load()`; this
  // component only needs to (a) disable the button and show a transient
  // label while the write is in flight, so a slow connection can't be
  // double-tapped into two writes, and (b) surface a failure inline - the
  // hook itself never lies about ownership on a failed write. No new
  // Supabase call, no second ownership path.
  const [ownershipPending, setOwnershipPending] = useState(false)
  const [ownershipError, setOwnershipError] = useState(null)
  const handleToggleOwnership = async () => {
    setOwnershipError(null)
    setOwnershipPending(true)
    try {
      await toggleIngredientOwnership(kind, id, inventory)
    } catch (err) {
      setOwnershipError(err.message)
    } finally {
      setOwnershipPending(false)
    }
  }

  const allMatches = useMemo(() => {
    if (!resolvedType) return []
    const viewing = kind === "product" ? { productId: id } : { typeId: id }
    return findRecipesUsingIngredient(computed, viewing, { types, products })
  }, [computed, resolvedType, kind, id, types, products])

  const { visibleGroups, totalCount } = useMemo(() => {
    const groups = groupByDisplayTier(allMatches)
    return {
      visibleGroups: capGroupsByTotal(groups, MAX_VISIBLE),
      totalCount: allMatches.length,
    }
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
      <TopBar
        title={displayName}
        onBack={() => navigate(-1)}
        right={
          canPin && (
            <button
              onClick={togglePin}
              aria-label={
                isPinned ? "Remove from Speed Rack" : "Pin to Speed Rack"
              }
              aria-pressed={isPinned}
              className={clsx(
                "rounded-sm w-9 h-9 cursor-pointer flex items-center justify-center border",
                isPinned
                  ? "bg-cyan/15 border-cyan text-cyan"
                  : "bg-surface border-bdr text-tx2",
              )}
            >
              <IconStar size={16} />
            </button>
          )
        }
      />
      <div className="p-4">
        {/* Only shown when it adds real information - viewing a type
            directly never shows this, since it would just repeat the
            title above. */}
        {kind === "product" && resolvedType.name !== displayName && (
          <p className="text-xs text-tx3 mb-1">{resolvedType.name}</p>
        )}

        {/* Ingredient Detail Stage I.1 - identity. Category only when it
            exists (an uncategorized type isn't expected in practice, but
            this stays defensive); description only when non-blank - no
            empty heading either way. */}
        {(category || resolvedType.description) && (
          <div className="mb-4 flex flex-col gap-1.5">
            {category && (
              <span className="text-[11px] uppercase tracking-[0.06em] text-tx3 font-display">
                {category.name}
              </span>
            )}
            {resolvedType.description && (
              <p className="text-[13px] text-tx2 leading-snug">
                {resolvedType.description}
              </p>
            )}
          </div>
        )}

        {/* Ingredient Detail Stage I.2 - the My Bar action. Placed right
            under identity, above "cocktails using this" - the whole point
            (fix ownership without leaving the page) needs to be reachable
            immediately, not buried under a long recipe list. */}
        <div className="mb-4">
          {isHouseholdBasic ? (
            <div className="flex items-center gap-2.5 rounded-sm border border-green/30 bg-green/10 py-2.5 px-3.5">
              <span className="w-2 h-2 rounded-full bg-green shrink-0" />
              <div>
                <div className="text-[13px] font-body font-medium text-tx">
                  Household basic
                </div>
                <div className="text-xs text-tx3 leading-snug">
                  Always considered available - not tracked as an owned
                  item.
                </div>
              </div>
            </div>
          ) : (
            <>
              <Btn
                variant={owned ? "secondary" : "primary"}
                full
                disabled={ownershipPending}
                onClick={handleToggleOwnership}
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
          )}
        </div>

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
