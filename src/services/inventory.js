import { supabase } from "@/lib/supabaseClient"

export async function fetchInventory(userId) {
  const { data, error } = await supabase
    .from("user_inventory")
    .select("id, ingredient_type_id, product_id, pinned")
    .eq("user_id", userId)
  if (error) throw error
  return data
}

// Speed Rack: flip the `pinned` flag on one already-owned inventory row.
// The column-scoped UPDATE grant (20260906130000) means this can only ever
// touch `pinned` - it can never move ownership between rows.
export async function setInventoryPinned(userId, inventoryId, pinned) {
  const { error } = await supabase
    .from("user_inventory")
    .update({ pinned })
    .eq("id", inventoryId)
    .eq("user_id", userId)
  if (error) throw error
}

// Returns the inserted row (real id + server defaults) so useInventory can
// swap out the optimistic placeholder - without that reconciliation the
// local row keeps its fake `optimistic-<id>` id forever, which later
// breaks anything that needs the real id (e.g. a Speed Rack pin UPDATE).
// The trailing select reads the just-inserted own row, allowed by the same
// "read own" RLS policy as any other inventory read.
export async function addIngredientTypeOwnership(userId, ingredientTypeId) {
  const { data, error } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, ingredient_type_id: ingredientTypeId })
    .select("id, ingredient_type_id, product_id, pinned")
    .single()
  if (error) throw error
  return data
}

export async function removeIngredientTypeOwnership(userId, ingredientTypeId) {
  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("user_id", userId)
    .eq("ingredient_type_id", ingredientTypeId)
  if (error) throw error
}

// Returns the inserted row - see addIngredientTypeOwnership above.
export async function addProductOwnership(userId, productId) {
  const { data, error } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, product_id: productId })
    .select("id, ingredient_type_id, product_id, pinned")
    .single()
  if (error) throw error
  return data
}

export async function removeProductOwnership(userId, productId) {
  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
  if (error) throw error
}
