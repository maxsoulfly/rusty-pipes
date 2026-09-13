import { supabase } from "@/lib/supabaseClient"

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
