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
export function VariationsSection({ base, variations }) {
  const navigate = useNavigate()
  const goTo = (id) => navigate(`/library/${id}`)

  if (!base && variations.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {base && (
        <div>
          <SectionTitle>Variation of</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            <div className="flex flex-col gap-1">
              <CocktailCard
                c={base.recipe}
                onClick={() => goTo(base.recipe.id)}
              />
              {base.note && (
                <span className="text-[11px] text-tx3 text-center">
                  {base.note}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {variations.length > 0 && (
        <div>
          <SectionTitle>Variations</SectionTitle>
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
