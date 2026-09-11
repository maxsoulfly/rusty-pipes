import { supabase } from "@/lib/supabaseClient"

// Admin/moderator-curated "how to make this ingredient at home" (Stage D.3,
// supabase/migrations/20260911120000_ingredient_preparations.sql). Keyed by
// the PRODUCED ingredient type (unique - at most one preparation per type,
// the v1 boundary). Two flat fetches, not a nested/embedded select - same
// style as ingredient_form_conversions / ingredient_substitutions - merged
// client-side (see App.jsx's `preparationsByProducedType`) since a
// preparation is a small, rarely-changing catalogue relationship, not
// per-request data.
//
// Readable by any member via the "members read" RLS policy; only
// admins/moderators write, and only through save_ingredient_type() (the
// Ingredient Type editor's atomic save), so there is no create/update/
// delete helper here - just the two reads.
//
// Never handed to computeAvail() - the strict avail tiers are untouched.
// Feeds domain/makeability.js's computeMakeability() (tier 5) only.
export async function fetchIngredientPreparations() {
  const { data, error } = await supabase
    .from("ingredient_preparations")
    .select("id, produces_type_id, name, instructions")
    .order("name")
  if (error) throw error
  return data
}

export async function fetchIngredientPreparationInputs() {
  const { data, error } = await supabase
    .from("ingredient_preparation_inputs")
    .select("id, preparation_id, ingredient_type_id, amount, unit_label")
  if (error) throw error
  return data
}
