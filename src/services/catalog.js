import { supabase } from "@/lib/supabaseClient"

export async function fetchIngredientCategories() {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("id, name, sort_order, shape")
    .order("sort_order")
    .order("name")
  if (error) throw error
  return data
}

export async function fetchIngredientAliases() {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .select("id, ingredient_type_id, alias")
    .order("alias")
  if (error) throw error
  return data
}

// Admin-only via the pre-existing "ingredient_aliases: admin insert/update/
// delete" RLS policies - real spec scope (Phase 2, §12.3's "resolve through
// IDs, canonical names, or controlled aliases") that had zero application
// code until now. Uniqueness (one alias string can only ever mean one
// ingredient type) is enforced by a case-insensitive unique index
// (20260822150000_ingredient_alias_global_uniqueness.sql), not just app-side
// checking - the DB is the actual source of truth for that guarantee.
export async function createIngredientAlias({ alias, ingredientTypeId }) {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .insert({ alias, ingredient_type_id: ingredientTypeId })
    .select()
    .single()
  if (error) throw error
  return data
}
export async function updateIngredientAlias(id, { alias, ingredientTypeId }) {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .update({ alias, ingredient_type_id: ingredientTypeId })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}
export async function deleteIngredientAlias(id) {
  const { error } = await supabase
    .from("ingredient_aliases")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function fetchIngredientTypes() {
  const { data, error } = await supabase
    .from("ingredient_types")
    .select(
      "id, category_id, parent_type_id, name, color, bar_priority, recommend_by_default, description, shape, assumed_available",
    )
    .order("name")
  if (error) throw error
  return data
}

// Admin-only via ingredient_types' existing "admin insert" RLS policy - no
// new grant needed. `rows` are already-validated resolved objects from
// src/schemas/ingredientImport.js, not raw import JSON.
export async function createIngredientTypes(rows) {
  const { error } = await supabase.from("ingredient_types").insert(rows)
  if (error) throw error
}

// Admin-only via the pre-existing "ingredient_types: admin update" RLS
// policy - same "existed since the RLS-hardening pass, never had a caller"
// situation as updateProduct()/deleteProduct(). Once a type was created
// (Single Ingredient, batch import, or a live data fix), nothing could ever
// correct its name/category/parent/color/priority/description again.
export async function updateIngredientType(
  id,
  {
    name,
    categoryId,
    parentTypeId,
    barPriority,
    color,
    description,
    shape,
    assumedAvailable,
  },
) {
  const { data, error } = await supabase
    .from("ingredient_types")
    .update({
      name,
      category_id: categoryId,
      parent_type_id: parentTypeId || null,
      bar_priority: barPriority,
      color: color || null,
      description: description || null,
      shape,
      assumed_available: assumedAvailable,
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only via the pre-existing "ingredient_types: admin delete" RLS
// policy - existed since the RLS-hardening pass with no caller until now.
// No pre-check for in-use: a child type, product, recipe component, or
// substitution alternative referencing this type all have their own
// restricting FK, so the DB rejects the delete with a real error naming the
// referencing table (same precedent as glasses/taste tags/families).
// ingredient_aliases and user_inventory rows pointing at this type cascade
// away, since a dangling alias or ownership record for a deleted type is
// meaningless, not something worth blocking on.
export async function deleteIngredientType(id) {
  const { error } = await supabase
    .from("ingredient_types")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// Admin-only via admin_merge_ingredient_type()'s own is_admin() check (not
// an RLS policy - this is a SECURITY DEFINER function call). Reassigns every
// recipe/product/inventory/alias row referencing loserId onto survivorId,
// then deletes the loser type outright - see the migration's own header
// comment for why each of the 6 referencing tables needs its own handling.
export async function mergeIngredientType({ loserId, survivorId, addAlias }) {
  const { error } = await supabase.rpc("admin_merge_ingredient_type", {
    p_loser_id: loserId,
    p_survivor_id: survivorId,
    p_add_alias: addAlias,
  })
  if (error) throw error
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, ingredient_type_id, name, brand, is_homemade, created_by")
    .order("name")
  if (error) throw error
  return data
}

export async function createProduct({
  name,
  ingredientTypeId,
  brand,
  isHomemade,
}) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      ingredient_type_id: ingredientTypeId,
      brand: brand || null,
      is_homemade: isHomemade,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only via the pre-existing "products: admin update" RLS policy - a
// product created by anyone (member's Add Product, or admin batch import)
// can be miscategorized (wrong ingredient type, a typo) with no way to fix
// it short of an admin recreating the row. No new grant needed - the policy
// already exists, just never had a caller.
export async function updateProduct(
  id,
  { name, ingredientTypeId, brand, isHomemade },
) {
  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      ingredient_type_id: ingredientTypeId,
      brand: brand || null,
      is_homemade: isHomemade,
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only via the pre-existing "products: admin delete" RLS policy - same
// "existed since step 5, never had a caller" situation as updateProduct().
// user_inventory.product_id is `on delete cascade`, so any ownership record
// pointing at this product is cleaned up automatically.
export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

// Admin batch import - `rows` are already-validated resolved objects from
// src/schemas/productImport.js (snake_case, matching the table), not raw
// import JSON. Uses the same "products: member insert" RLS policy any
// member's single Add Product goes through (created_by defaults to
// auth.uid() at the column level) - no new grant needed, and no per-row
// children to insert, so a single bulk insert is enough (unlike recipes).
export async function createProducts(rows) {
  const { error } = await supabase.from("products").insert(rows)
  if (error) throw error
}

export async function fetchGlasses() {
  const { data, error } = await supabase
    .from("glasses")
    .select("id, name, shape")
    .order("name")
  if (error) throw error
  return data
}

export async function fetchGlassAliases() {
  const { data, error } = await supabase
    .from("glass_aliases")
    .select("id, glass_id, alias")
    .order("alias")
  if (error) throw error
  return data
}

// Admin/moderator-only via glass_aliases' "admin insert/update/delete" RLS
// policies - same shape as createIngredientAlias() above. Uniqueness (one
// alias string can only ever mean one glass) is enforced by a
// case-insensitive unique index (20260825140000_glass_aliases.sql), not
// just app-side checking.
export async function createGlassAlias({ alias, glassId }) {
  const { data, error } = await supabase
    .from("glass_aliases")
    .insert({ alias, glass_id: glassId })
    .select()
    .single()
  if (error) throw error
  return data
}
export async function deleteGlassAlias(id) {
  const { error } = await supabase.from("glass_aliases").delete().eq("id", id)
  if (error) throw error
}

export async function fetchTasteTags() {
  const { data, error } = await supabase
    .from("taste_tags")
    .select("id, name")
    .order("name")
  if (error) throw error
  return data
}

export async function fetchCocktailFamilies() {
  const { data, error } = await supabase
    .from("cocktail_families")
    .select("id, name, shape")
    .order("name")
  if (error) throw error
  return data
}

export async function fetchLiquidColors() {
  const { data, error } = await supabase
    .from("liquid_colors")
    .select("id, name, hex")
    .order("name")
  if (error) throw error
  return data
}

// Shared by glasses/taste_tags/cocktail_families - all three are just
// `(id, name unique)` with the same admin-insert/update/delete RLS shape (no
// new grant needed, existed since the RLS-hardening pass with no caller
// until now, same pattern as products/ingredient_types earlier this
// session). A row referenced by a recipe (glass_id/family_id) or
// recipe_taste_tags is protected from deletion by its own foreign key
// constraint - no application-level "is this in use" check needed, the DB
// already refuses and callers surface that error message as-is.
function createNamedRow(table, name) {
  return supabase
    .from(table)
    .insert({ name })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
function updateNamedRow(table, id, name) {
  return supabase
    .from(table)
    .update({ name })
    .eq("id", id)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
function deleteNamedRow(table, id) {
  return supabase
    .from(table)
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) throw error
    })
}

// Glasses carry a `shape` (which GlassSvg pictogram to draw) alongside
// `name`, unlike the other three lookup tables - can't reuse
// createNamedRow/updateNamedRow as-is.
export function createGlass(name, shape) {
  return supabase
    .from("glasses")
    .insert({ name, shape })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export function updateGlass(id, name, shape) {
  return supabase
    .from("glasses")
    .update({ name, shape })
    .eq("id", id)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export const deleteGlass = (id) => deleteNamedRow("glasses", id)

export const createTasteTag = (name) => createNamedRow("taste_tags", name)
export const updateTasteTag = (id, name) =>
  updateNamedRow("taste_tags", id, name)
export const deleteTasteTag = (id) => deleteNamedRow("taste_tags", id)

// Cocktail families carry a `shape` (which FamilyIcon pictogram to draw)
// alongside `name`, same reason glasses can't reuse createNamedRow/
// updateNamedRow as-is (see above).
export function createCocktailFamily(name, shape) {
  return supabase
    .from("cocktail_families")
    .insert({ name, shape })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export function updateCocktailFamily(id, name, shape) {
  return supabase
    .from("cocktail_families")
    .update({ name, shape })
    .eq("id", id)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export const deleteCocktailFamily = (id) =>
  deleteNamedRow("cocktail_families", id)

// Liquid colors carry a `hex` value alongside `name`, same reason glasses/
// cocktail_families can't reuse createNamedRow/updateNamedRow as-is.
export function createLiquidColor(name, hex) {
  return supabase
    .from("liquid_colors")
    .insert({ name, hex })
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export function updateLiquidColor(id, name, hex) {
  return supabase
    .from("liquid_colors")
    .update({ name, hex })
    .eq("id", id)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
}
export const deleteLiquidColor = (id) => deleteNamedRow("liquid_colors", id)

// ingredient_categories carries sort_order too (added in
// 20260816010047_category_order_and_spirit_hierarchy.sql), so it doesn't fit
// the plain name-only helpers above.
export async function createIngredientCategory({ name, sortOrder, shape }) {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .insert({ name, sort_order: sortOrder ?? 0, shape })
    .select()
    .single()
  if (error) throw error
  return data
}
export async function updateIngredientCategory(id, { name, sortOrder, shape }) {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .update({ name, sort_order: sortOrder ?? 0, shape })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}
export async function deleteIngredientCategory(id) {
  const { error } = await supabase
    .from("ingredient_categories")
    .delete()
    .eq("id", id)
  if (error) throw error
}
