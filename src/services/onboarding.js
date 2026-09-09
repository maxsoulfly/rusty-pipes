import { supabase } from "@/lib/supabaseClient"

// Admin-curated "Build your bar" onboarding config
// (supabase/migrations/20260909130000_onboarding_ingredients.sql). Readable
// by any member via the "onboarding_ingredients: members read" RLS policy;
// only admins write it (write helpers land in Stage 3c alongside the admin
// tab). Rows are ID references into ingredient_types - the pure resolver
// resolveOnboardingSelection() (src/domain/buildYourBar.js) turns them into
// the homepage tile lists.
//
// Ordered by `position` here so the raw rows are already in overall order;
// the resolver re-sorts defensively (position has no DB uniqueness
// guarantee) and applies ingredient_types.name as the tiebreak.
export async function fetchOnboardingIngredients() {
  const { data, error } = await supabase
    .from("onboarding_ingredients")
    .select("ingredient_type_id, position, is_initial, group_label")
    .order("position")
  if (error) throw error
  return data
}
