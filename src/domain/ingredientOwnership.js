// Ingredient Detail Stage I.2 - pure decision logic for the "My Bar
// action" on IngredientDetailScreen.jsx, extracted so it's unit-testable
// without rendering (this project's vitest setup has no jsdom/component
// testing - see AGENTS.md's Testing & verification section). No new
// ownership model or write path: reads the exact same `assumed_available`
// flag and owned-id Sets every other My Bar surface already reads
// (IngredientTypeEditor.jsx's household-basic toggle,
// MyBarScreen.jsx's combined-ownership `isOwned` check), and mutates
// through the exact same shared `useInventory()` functions every other
// screen calls.

/**
 * What the My Bar action section should show. `assumed_available` lives on
 * the ingredient TYPE (services/catalog.js), so a household basic is
 * checked via `resolvedType` regardless of `kind` - a product mapped to a
 * household-basic type is just as "already considered available" as the
 * generic type itself (a recipe component only ever references the type
 * id; `resolveOwnedIngredientTypes` unions household-basic ids in after
 * the ancestor walk - see App.jsx), so an Add/Remove control would be
 * equally misleading for either.
 *
 * `owned` on a `kind: "type"` call is a combined-ownership *read* only
 * (mirrors MyBarScreen.jsx's own
 * `isOwned = ownedTypeIds.has(typeId) || productsByType.has(typeId)`) - a
 * type reads as owned if a specific mapped product is owned, even though
 * the generic row itself was never toggled. The actual toggle
 * (`toggleIngredientOwnership` below) still only ever writes the generic
 * row, matching TypeCard.jsx's already-established rule - this is a
 * read-only parity fix, not a new ownership model. Irrelevant when
 * `isHouseholdBasic` is true - the caller shows the non-editable
 * household-basic state instead and never reads `owned` in that case.
 *
 * @param {{
 *   kind: "type" | "product",
 *   id: string,
 *   resolvedType: { assumed_available?: boolean } | null | undefined,
 *   products: { id: string, ingredient_type_id: string }[],
 *   ownedTypeIds: Set<string>,
 *   ownedProductIds: Set<string>,
 * }} args
 * @returns {{ isHouseholdBasic: boolean, owned: boolean }}
 */
export function resolveIngredientOwnershipState({
  kind,
  id,
  resolvedType,
  products,
  ownedTypeIds,
  ownedProductIds,
}) {
  const isHouseholdBasic = resolvedType?.assumed_available ?? false
  if (kind === "product") {
    return { isHouseholdBasic, owned: ownedProductIds.has(id) }
  }
  const ownedViaProduct = products.some(
    (p) => p.ingredient_type_id === id && ownedProductIds.has(p.id),
  )
  return { isHouseholdBasic, owned: ownedTypeIds.has(id) || ownedViaProduct }
}

/**
 * Performs the actual ownership toggle for either kind, always through the
 * existing shared `inventory` mutation functions
 * (`toggleType`/`toggleProduct`, useInventory.js) - never a second write
 * path. A thin, deliberately un-clever passthrough: it does not catch,
 * retry, or locally track anything itself - `useInventory.js`'s own
 * optimistic update + failure rollback (via `load()`) is the only place
 * ownership state actually lives, so a rejected write here always
 * propagates to the caller exactly as `toggleType`/`toggleProduct`
 * themselves rejected it, never silently swallowed.
 *
 * @param {"type" | "product"} kind
 * @param {string} id
 * @param {{ toggleType: (id: string) => Promise<void>, toggleProduct: (id: string) => Promise<void> }} inventory
 * @returns {Promise<void>}
 */
export function toggleIngredientOwnership(kind, id, inventory) {
  return kind === "product"
    ? inventory.toggleProduct(id)
    : inventory.toggleType(id)
}
