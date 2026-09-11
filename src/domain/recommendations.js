// Pure, framework-free purchase-recommendation ranking (spec §11). Candidates
// are ingredient types that would unlock a recipe currently missing exactly
// one required ingredient ("almost"). Ranked by readable rules, in the
// spec's exact order - not an opaque weighted score, per the spec's explicit
// instruction to add numeric weighting only if real usage ever shows it's
// needed.
//
// Stage D.4 (docs/plans/substitutes-and-variations.md -> "Stage D"): the
// gathering step still finds candidates the exact same way (a recipe
// missing exactly one required ingredient, per its STRICT avail - "one
// ingredient away" is a fact about the original recipe, unaffected by
// adaptation), but a candidate whose recipe is ALREADY `display.tier ===
// "adapted"` (makeable today via a substitute/preparation) is split into a
// separate, lower-ranked bucket - buying that one remaining ingredient
// doesn't unlock a new drink (it's already makeable); it only lets the user
// make the ORIGINAL recipe as written instead of the adapted version. Built
// on the shared computeMakeability() result (a recipe's own `display`
// field, already computed once in App.jsx) rather than a Buy-Next-specific
// availability rule.

/**
 * @param {{
 *   computed: { id: string, name: string, source: string, avail: string, missingRequiredIds: string[], missingOptionalIds?: string[], display?: { tier: string } }[],
 *   ingredientTypesById: Map<string, { name: string, bar_priority?: string, recommend_by_default?: boolean }>,
 *   favoriteIds: Set<string>,
 *   wantToMakeIds: Set<string>,
 *   limit?: number,
 * }} args
 */
export function rankPurchaseRecommendations({
  computed,
  ingredientTypesById,
  favoriteIds,
  wantToMakeIds,
  limit,
}) {
  const candidates = new Map()
  const getCandidate = (ingId) => {
    if (!candidates.has(ingId))
      candidates.set(ingId, {
        unlockedRecipes: [],
        restoresOriginalRecipes: [],
        upgradedRecipes: [],
      })
    return candidates.get(ingId)
  }

  // Primary candidate source: recipes missing exactly one required
  // ingredient (by strict avail - this identifies "one ingredient away"
  // regardless of any adaptation). Split by the SAME recipe's `display.tier`:
  // already `"adapted"` means the ingredient only restores the original,
  // never a fresh unlock, even though it's still the recipe's one
  // strict-missing ingredient.
  computed.forEach((recipe) => {
    if (recipe.avail === "almost" && recipe.missingRequiredIds.length === 1) {
      const ingId = recipe.missingRequiredIds[0]
      const displayTier = recipe.display?.tier ?? recipe.avail
      if (displayTier === "adapted") {
        getCandidate(ingId).restoresOriginalRecipes.push(recipe)
      } else {
        getCandidate(ingId).unlockedRecipes.push(recipe)
      }
    }
  })

  // Secondary signal (ranking rule 5): the same ingredient might also be a
  // missing optional/garnish on an already-good-enough recipe, upgrading it
  // to perfect too.
  if (candidates.size > 0) {
    computed.forEach((recipe) => {
      if (recipe.avail !== "good") return
      ;(recipe.missingOptionalIds ?? []).forEach((ingId) => {
        if (candidates.has(ingId))
          getCandidate(ingId).upgradedRecipes.push(recipe)
      })
    })
  }

  const scored = [...candidates.entries()].map(
    ([
      ingredientTypeId,
      { unlockedRecipes, restoresOriginalRecipes, upgradedRecipes },
    ]) => {
      const type = ingredientTypesById.get(ingredientTypeId)
      const priority = type?.bar_priority ?? "common"
      const recommendByDefault = type?.recommend_by_default ?? true
      const isNicheOrSpecialized =
        priority === "niche" || priority === "specialized"
      // Deliberately scoped to genuine unlocks only - a restore-original
      // signal doesn't "unlock" anything, so it shouldn't earn the
      // favorite/want-to-make boost that a real unlock does.
      const unlocksFavoriteOrWantToMake = unlockedRecipes.some(
        (r) => favoriteIds.has(r.id) || wantToMakeIds.has(r.id),
      )
      const classicsUnlocked = unlockedRecipes.filter(
        (r) => r.source === "classic",
      )
      const unlocksClassic = classicsUnlocked.length > 0
      const isEssentialOrCommon =
        (priority === "essential" || priority === "common") &&
        recommendByDefault

      // A candidate with zero genuine unlocks but at least one
      // restore-original gets its own, clearly lower-value reason text -
      // never the "Unlocks N recipes" wording, which would overstate what
      // buying this ingredient actually does (the recipe is already
      // makeable). A candidate that has BOTH keeps the normal "Unlocks..."
      // reason - the restore signal there is a bonus reflected only in
      // ranking (restoreCount below), not the headline text.
      const reason =
        unlockedRecipes.length === 0 && restoresOriginalRecipes.length > 0
          ? `Also lets you make the original version of ${restoresOriginalRecipes.length} already-possible recipe${
              restoresOriginalRecipes.length === 1 ? "" : "s"
            }`
          : unlocksFavoriteOrWantToMake
            ? "Unlocks a recipe you've favorited or want to make"
            : unlocksClassic
              ? `Unlocks ${classicsUnlocked.length} classic${
                  classicsUnlocked.length === 1 ? "" : "s"
                }`
              : `Unlocks ${unlockedRecipes.length} ${
                  unlockedRecipes.length === 1 ? "recipe" : "recipes"
                }`

      return {
        ingredientTypeId,
        name: type?.name ?? ingredientTypeId,
        reason,
        unlockedRecipeNames: unlockedRecipes.map((r) => r.name),
        unlockCount: unlockedRecipes.length,
        restoresOriginalRecipeNames: restoresOriginalRecipes.map((r) => r.name),
        restoreCount: restoresOriginalRecipes.length,
        upgradeCount: upgradedRecipes.length,
        unlocksFavoriteOrWantToMake,
        unlocksClassic,
        isEssentialOrCommon,
        // Suppressed from *general* suggestions per spec §11, unless it
        // completes a Favorite/Want to Make recipe. This function only ever
        // produces the general list - a specific cocktail's own missing-item
        // display (DetailScreen) is a separate, unfiltered path.
        suppressed: isNicheOrSpecialized && !unlocksFavoriteOrWantToMake,
      }
    },
  )

  const ranked = scored
    .filter((c) => !c.suppressed)
    .sort((a, b) => {
      if (a.unlocksFavoriteOrWantToMake !== b.unlocksFavoriteOrWantToMake)
        return a.unlocksFavoriteOrWantToMake ? -1 : 1
      if (a.unlocksClassic !== b.unlocksClassic)
        return a.unlocksClassic ? -1 : 1
      if (a.isEssentialOrCommon !== b.isEssentialOrCommon)
        return a.isEssentialOrCommon ? -1 : 1
      // A genuine unlock always outranks a restore-only candidate: unlockCount
      // is 0 for any candidate that only restores originals, so this
      // comparison alone already separates the two groups; restoreCount
      // (next) only orders WITHIN a tied unlockCount (most commonly two
      // restore-only candidates against each other).
      if (a.unlockCount !== b.unlockCount) return b.unlockCount - a.unlockCount
      if (a.upgradeCount !== b.upgradeCount)
        return b.upgradeCount - a.upgradeCount
      if (a.restoreCount !== b.restoreCount)
        return b.restoreCount - a.restoreCount
      return a.name.localeCompare(b.name) // deterministic tiebreak
    })

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked
}
