import { useMemo, useState } from "react"
import clsx from "clsx"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { OwnershipAction } from "@/components/ingredientDetail/OwnershipAction"
import { RelatedCocktailsGrid, MAX_VISIBLE } from "@/components/ingredientDetail/RelatedCocktailsGrid"
import { RelationshipsSection } from "@/components/ingredientDetail/RelationshipsSection"
import { IconBottle, IconEdit, IconStar } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import { Btn } from "@/components/primitives"
import {
  capGroupsByTotal,
  groupByDisplayTier,
} from "@/domain/availabilityGroups"
import { resolveIngredientEditTarget } from "@/domain/ingredientEditTarget"
import {
  resolveIngredientOwnershipState,
  toggleIngredientOwnership,
} from "@/domain/ingredientOwnership"
import { findRecipesUsingIngredient } from "@/domain/ingredientRecipeMatches"
import {
  resolveCanBeReplacedBy,
  resolveCanProvide,
  resolveHomemadePreparation,
} from "@/domain/ingredientRelationships"

// Ingredient Detail Stage I.1: this screen used to group by raw `avail`
// (it pre-dates Stage D's shared `display.tier` entirely - see
// docs/plans/ingredient-detail-page.md's audit), so a cocktail resolvable
// only via a configured substitute or a satisfiable preparation showed
// under "Unavailable" here even though Library/Home correctly showed it as
// makeable. Now shares the exact same grouping (`groupByDisplayTier`) and
// heading wording (`AVAIL_GROUP_LABEL`) as Library instead of keeping a
// second, stale copy of both.

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
  // `owned` renamed at destructure time to `resolvedOwnedTypeIds` - this is
  // the app-wide resolved-ownership Set (App.jsx's `resolvedOwned`: direct
  // ownership + product-mapped + ancestor walk + household basics already
  // unioned in), used below for a secondary "do you have this related
  // ingredient" indicator. Kept distinct from Stage I.2's own local `owned`
  // (a boolean - "is THIS page's ingredient itself owned") so the two don't
  // collide.
  const {
    computed,
    catalog,
    inventory,
    owned: resolvedOwnedTypeIds,
    unit,
    isStaff,
  } = useOutletContext()
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

  // Ingredient Detail Stage I.4 - admin/moderator "Edit ingredient"
  // shortcut. Decision logic (isStaff gate + always-the-type target, on
  // both a type and a product page) lives in domain/ingredientEditTarget.js
  // (pure, unit-tested there) so this component stays a thin caller.
  const editTargetTypeId = resolveIngredientEditTarget({ isStaff, resolvedType })

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

  // Ingredient Detail Stage I.3 - relationships + homemade preparation.
  // Decision/shaping logic lives in domain/ingredientRelationships.js
  // (pure, unit-tested there) so this component stays a thin caller; see
  // that file for exactly why each is directional and never reads
  // recipe_component_alternatives. Always keyed off `resolvedType.id` (the
  // TYPE), never the product id - same rule as identity (I.1) and matching
  // (below): these are facts about the ingredient TYPE, not one bottle.
  const canProvideRows = resolvedType
    ? resolveCanProvide(resolvedType.id, catalog.formConversions, types)
    : []
  const canBeReplacedByRows = resolvedType
    ? resolveCanBeReplacedBy(
        resolvedType.id,
        catalog.ingredientSubstitutions,
        types,
      )
    : []
  const preparationRow = resolvedType
    ? resolveHomemadePreparation(
        resolvedType.id,
        catalog.ingredientPreparations,
        catalog.ingredientPreparationInputs,
        types,
      )
    : null
  // Reuses computeMakeability()'s exact input shape via
  // isPreparationSatisfiable() (RelationshipsSection), rather than
  // inventing a new representation - `preparationRow.inputs` already has
  // the shape it expects (ingredientTypeId/amount/unitLabel).
  const preparationInputs = preparationRow?.inputs ?? []

  // Household-basic id set + camelCase form-conversion list - both needed
  // by RelationshipsSection's isPreparationSatisfiable() call, neither
  // exposed via outlet context today (App.jsx keeps them as its own local
  // variables feeding computeMakeability directly) - recomputed here the
  // same one-line way App.jsx already does, rather than widening shared
  // context for one screen's read of a per-input "do you have this" signal.
  const householdBasicIds = useMemo(
    () =>
      new Set(catalog.types.filter((t) => t.assumed_available).map((t) => t.id)),
    [catalog.types],
  )
  const formConversionsForSatisfiability = useMemo(
    () =>
      (catalog.formConversions ?? []).map((c) => ({
        rawTypeId: c.raw_type_id,
        preparedTypeId: c.prepared_type_id,
        guidance: c.guidance,
      })),
    [catalog.formConversions],
  )

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
          (editTargetTypeId || canPin) && (
            <div className="flex items-center gap-2">
              {/* Ingredient Detail Stage I.4 - admin/moderator convenience
                  only, gated the same way "Can provide"/"Can be replaced
                  by" editing already is (D3: admins AND moderators manage
                  the catalogue) - this is UI visibility only; the
                  destination route/component (`save_ingredient_type()`,
                  RLS) is the real, unchanged authorization boundary - a
                  member who somehow reached this URL directly would still
                  be denied there, same as today. Deliberately small/
                  secondary (a plain icon button, same size as the pin
                  button next to it), not a prominent control - the
                  primary action on this page is still Add/Remove My Bar
                  below. */}
              {editTargetTypeId && (
                <button
                  onClick={() =>
                    navigate(`/admin/ingredient-types?type=${editTargetTypeId}`)
                  }
                  aria-label="Edit ingredient"
                  title="Edit ingredient"
                  className="rounded-sm w-9 h-9 cursor-pointer flex items-center justify-center border bg-surface border-bdr text-tx2"
                >
                  <IconEdit size={16} />
                </button>
              )}
              {canPin && (
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
              )}
            </div>
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
          <OwnershipAction
            isHouseholdBasic={isHouseholdBasic}
            owned={owned}
            ownershipPending={ownershipPending}
            ownershipError={ownershipError}
            onToggle={handleToggleOwnership}
          />
        </div>

        <RelationshipsSection
          displayName={displayName}
          canProvideRows={canProvideRows}
          canBeReplacedByRows={canBeReplacedByRows}
          preparationRow={preparationRow}
          preparationInputs={preparationInputs}
          resolvedOwnedTypeIds={resolvedOwnedTypeIds}
          householdBasicIds={householdBasicIds}
          formConversionsForSatisfiability={formConversionsForSatisfiability}
          unit={unit}
        />

        <RelatedCocktailsGrid
          visibleGroups={visibleGroups}
          totalCount={totalCount}
          viewAllTypeId={resolvedType.id}
        />
      </div>
    </div>
  )
}
