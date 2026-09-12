// Ingredient Detail Stage I.3 - pure lookups for the "relationships" and
// "homemade preparation" sections on IngredientDetailScreen.jsx, extracted
// so directionality and data shaping are unit-testable without rendering
// (this project's vitest setup has no jsdom/component testing - see
// AGENTS.md). No new catalogue tables or relationships - every function
// here filters an already-fetched `catalog` array by the exact same
// column IngredientTypeEditor.jsx's own admin editor already filters by.

function nameLookup(types) {
  const nameById = new Map(types.map((t) => [t.id, t.name]))
  return (id) => nameById.get(id) ?? "?"
}

/**
 * "Can provide" - directional rows where `typeId` is the RAW side of a
 * configured `ingredient_form_conversions` row (Concept 2). One-way: A can
 * provide B never implies B can provide A - the reverse side
 * (`prepared_type_id === typeId`) is never looked up here, so there is no
 * code path that could fabricate it.
 *
 * @param {string} typeId
 * @param {{ raw_type_id: string, prepared_type_id: string, guidance: string }[]} formConversions
 * @param {{ id: string, name: string }[]} types
 * @returns {{ preparedTypeId: string, preparedName: string, guidance: string }[]}
 */
export function resolveCanProvide(typeId, formConversions, types) {
  const nameOf = nameLookup(types)
  return (formConversions ?? [])
    .filter((c) => c.raw_type_id === typeId)
    .map((c) => ({
      preparedTypeId: c.prepared_type_id,
      preparedName: nameOf(c.prepared_type_id),
      guidance: c.guidance,
    }))
}

/**
 * "Can be replaced by" - directional rows where `typeId` is the FROM side
 * of a configured general catalogue substitute (`ingredient_substitutions`,
 * Stage B) - suggestion-only, never affects availability. Deliberately
 * never reads `recipe_component_alternatives`: a recipe-specific, adopted
 * alternative is true for one recipe, not a catalogue fact about the
 * ingredient, and that table is never passed to this function at all, so
 * there is no way for one to leak in here as a "global" relationship. The
 * reverse side (`to_type_id === typeId`) is likewise never looked up.
 *
 * @param {string} typeId
 * @param {{ from_type_id: string, to_type_id: string, flavor_note: string }[]} ingredientSubstitutions
 * @param {{ id: string, name: string }[]} types
 * @returns {{ toTypeId: string, toName: string, flavorNote: string }[]}
 */
export function resolveCanBeReplacedBy(
  typeId,
  ingredientSubstitutions,
  types,
) {
  const nameOf = nameLookup(types)
  return (ingredientSubstitutions ?? [])
    .filter((s) => s.from_type_id === typeId)
    .map((s) => ({
      toTypeId: s.to_type_id,
      toName: nameOf(s.to_type_id),
      flavorNote: s.flavor_note,
    }))
}

/**
 * Homemade preparation - at most one row per produced type
 * (`ingredient_preparations.produces_type_id`, Stage D.3's own uniqueness
 * rule enforced in the schema). Returns null when none is configured for
 * this type - the caller renders no section at all in that case, never an
 * empty heading.
 *
 * @param {string} typeId
 * @param {{ id: string, produces_type_id: string, name: string, instructions: string[] }[]} ingredientPreparations
 * @param {{ preparation_id: string, ingredient_type_id: string, amount: number, unit_label: string }[]} ingredientPreparationInputs
 * @param {{ id: string, name: string }[]} types
 * @returns {{ id: string, name: string, instructions: string[], inputs: { ingredientTypeId: string, name: string, amount: number, unitLabel: string }[] } | null}
 */
export function resolveHomemadePreparation(
  typeId,
  ingredientPreparations,
  ingredientPreparationInputs,
  types,
) {
  const prep = (ingredientPreparations ?? []).find(
    (p) => p.produces_type_id === typeId,
  )
  if (!prep) return null
  const nameOf = nameLookup(types)
  return {
    id: prep.id,
    name: prep.name,
    instructions: prep.instructions ?? [],
    inputs: (ingredientPreparationInputs ?? [])
      .filter((i) => i.preparation_id === prep.id)
      .map((i) => ({
        ingredientTypeId: i.ingredient_type_id,
        name: nameOf(i.ingredient_type_id),
        amount: i.amount,
        unitLabel: i.unit_label,
      })),
  }
}
