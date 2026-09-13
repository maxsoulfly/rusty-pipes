import { useNavigate } from "react-router-dom"
import { CocktailCard } from "@/components/CocktailCard"
import { SectionTitle } from "@/components/primitives"

// Linked Variations Stage V.3 - a compact, secondary "recipe context"
// block: this recipe's own base (if it's a variation, "Variation of")
// and/or its direct variations (if it's a base, "Variations"). Both can
// show together when a recipe sits in the middle of a chain (A<-B<-C: B
// shows both). Strictly one-hop, matching the domain resolver's own rule
// - never a grandparent, a sibling, or a recursive family tree; `base`/
// `variations` are expected to already be resolved via
// resolveRecipeVariationContext() (src/domain/recipeRelationships.js),
// not recomputed here.
//
// Reuses CocktailCard in the exact same grid Ingredient Detail's own
// "cocktails using this" section already established
// (IngredientDetailScreen.jsx) - one consistent "related recipes" visual
// language across the app, rather than a new row component. Each card is
// its own real, independently-computed recipe from `computed` (own
// availability badge, own ingredients) - nothing here derives or displays
// anything about ONE recipe from the OTHER side of the relationship; the
// optional `note` is shown as-is, exactly as saved, never a generated
// "uses X instead" description.
//
// Stage V.4 - `variations` arrives already sorted makeability-tier-first
// (src/domain/recipeRelationships.js's own
// `resolveRecipeVariationContext()`), so this component still just lays
// them out in order - no ranking logic here. `showMakeableFraming` is a
// single pre-computed boolean (via that module's own
// `shouldShowMakeableVariationFraming()`) - this component only renders
// the one line of copy when told to, never re-derives the condition
// itself. The framing belongs on the base -> variations side only, per
// the plan - a variation's own "Variation of" block never gets an
// equivalent line about the base's makeability.
//
// Stage V.5 (bugfix, manual-verification finding) - the stored
// relationship `note` is DIRECTIONAL: it always means "how the variation
// differs from its base," regardless of which recipe's own page is
// currently rendering it. On a variation's own page, `base.note` is
// still a fact about THIS recipe (the variation), not about the base
// recipe shown in the card above it - rendering it as a caption directly
// under that card (as every OTHER card/note pair in this app does)
// visually implied it described the base. It doesn't, so it's no longer
// rendered that way: the base's own card renders alone, with the note
// pulled out into its own clearly-labeled "How this version differs"
// block below the grid, so it can't be mistaken for a caption on that
// card. On a base's own page, the exact same note correctly describes
// each variation CARD relative to the base being viewed - that side is
// completely unchanged, note still directly under its own card, no new
// heading needed (the existing muted caption already reads unambiguously
// in that direction). Never rewrites/inverts/regenerates the note text
// either way - always the exact stored string, since it may not be
// mechanically invertible.
export function VariationsSection({ base, variations, showMakeableFraming }) {
  const navigate = useNavigate()
  const goTo = (id) => navigate(`/library/${id}`)

  if (!base && variations.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {base && (
        <div>
          <SectionTitle>Variation of</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <CocktailCard c={base.recipe} onClick={() => goTo(base.recipe.id)} />
          </div>
          {base.note && (
            <div className="mt-2.5">
              <span className="block text-[11px] font-bold text-tx2 uppercase tracking-[0.05em] mb-1">
                How this version differs
              </span>
              <p className="text-[11px] text-tx3 leading-snug">
                {base.note}
              </p>
            </div>
          )}
        </div>
      )}

      {variations.length > 0 && (
        <div>
          <SectionTitle>Variations</SectionTitle>
          {showMakeableFraming && (
            <p className="-mt-1 mb-2.5 text-xs text-cyan">
              Can't make the original? You can make one of these instead.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {variations.map(({ recipe, note }) => (
              <div key={recipe.id} className="flex flex-col gap-1">
                <CocktailCard c={recipe} onClick={() => goTo(recipe.id)} />
                {note && (
                  <span className="text-[11px] text-tx3 text-center">
                    {note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
