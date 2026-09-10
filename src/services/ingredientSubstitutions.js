import { supabase } from "@/lib/supabaseClient"

// Catalogue-wide directional "when a recipe needs from_type_id, to_type_id
// can stand in - <flavor_note>" (Stage B,
// supabase/migrations/20260910190000_ingredient_substitutions.sql).
// Readable by any member via the "members read" RLS policy; only
// admins/moderators write, and only through save_ingredient_type() (the
// Ingredient Type editor's atomic save), so there is no create/update/
// delete helper here - just the read.
//
// SUGGESTION ONLY: never handed to computeAvail(). It drives the muted
// "Try: ..." hint on a recipe's missing ingredient rows and the one-tap
// adopt list in the recipe editor; nothing here changes availability.
export async function fetchIngredientSubstitutions() {
  const { data, error } = await supabase
    .from("ingredient_substitutions")
    .select("id, from_type_id, to_type_id, flavor_note")
    .order("flavor_note")
  if (error) throw error
  return data
}
