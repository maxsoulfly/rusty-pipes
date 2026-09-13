import { supabase } from "@/lib/supabaseClient"

// The 5 admin-managed catalog lookup tables (ingredient_categories, glasses
// + glass_aliases, taste_tags, cocktail_families, liquid_colors) - all share
// the identical "member read, admin write" RLS shape and are all edited
// together from one place (Admin -> Catalog, CatalogTab.jsx). Kept as one
// module rather than five, since that's the actual caller boundary - see
// docs/plans/archive/catalog-service-split.md.

export async function fetchIngredientCategories() {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("id, name, sort_order, shape")
    .order("sort_order")
    .order("name")
  if (error) throw error
  return data
}

// ingredient_categories carries sort_order too (added in
// 20260816010047_category_order_and_spirit_hierarchy.sql), so it doesn't fit
// the plain name-only helpers below.
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
// policies - same shape as createIngredientAlias() (services/ingredientTypes.js).
// Uniqueness (one alias string can only ever mean one glass) is enforced by
// a case-insensitive unique index (20260825140000_glass_aliases.sql), not
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
