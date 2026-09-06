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

export async function addIngredientTypeOwnership(userId, ingredientTypeId) {
  const { error } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, ingredient_type_id: ingredientTypeId })
  if (error) throw error
}

export async function removeIngredientTypeOwnership(userId, ingredientTypeId) {
  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("user_id", userId)
    .eq("ingredient_type_id", ingredientTypeId)
  if (error) throw error
}

export async function addProductOwnership(userId, productId) {
  const { error } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, product_id: productId })
  if (error) throw error
}

export async function removeProductOwnership(userId, productId) {
  const { error } = await supabase
    .from("user_inventory")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId)
  if (error) throw error
}
