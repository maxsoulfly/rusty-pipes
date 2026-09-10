import { supabase } from "@/lib/supabaseClient"

// Admin-managed raw -> prepared ingredient form conversions (Concept 2,
// supabase/migrations/20260910140000_ingredient_form_conversions.sql).
// "Owning the raw ingredient satisfies a recipe that asks for its prepared
// form" - own Lemon and a Lemon Juice requirement is met, shown inline with
// `guidance` ("Squeeze fresh juice from Lemon"). Strictly one-directional:
// the availability engine only ever looks a pair up by a component's own
// (prepared) id, and a DB trigger refuses the inverse pair, so owning the
// juice never implies the whole fruit.
//
// Readable by any member via the "members read" RLS policy; only admins
// write. Never touched by src/domain/recommendations.js - Buy Next only
// sees the knock-on effect through computeAvail()'s avail / missing ids.
export async function fetchIngredientFormConversions() {
  const { data, error } = await supabase
    .from("ingredient_form_conversions")
    .select("id, raw_type_id, prepared_type_id, guidance")
    .order("guidance")
  if (error) throw error
  return data
}

// Admin-only via the "admin writes" RLS policy. The DB rejects (surfaced
// as-is): a self-pair (raw = prepared), a duplicate pair, or the inverse of
// an existing pair (one-direction trigger).
export async function createIngredientFormConversion({
  rawTypeId,
  preparedTypeId,
  guidance,
}) {
  const { data, error } = await supabase
    .from("ingredient_form_conversions")
    .insert({
      raw_type_id: rawTypeId,
      prepared_type_id: preparedTypeId,
      guidance,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Only the guidance text is editable - changing which two types a row links
// is a delete + re-add (keeps the inverse/self/duplicate guards simple and
// makes the change obvious in the admin list).
export async function updateIngredientFormConversionGuidance(id, guidance) {
  const { data, error } = await supabase
    .from("ingredient_form_conversions")
    .update({ guidance })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIngredientFormConversion(id) {
  const { error } = await supabase
    .from("ingredient_form_conversions")
    .delete()
    .eq("id", id)
  if (error) throw error
}
