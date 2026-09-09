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

// Atomic whole-config replace, backing the admin "Onboarding ingredients"
// editor (src/components/admin/OnboardingTab.jsx). The editor builds a full
// local draft - additions, removals, group changes, initial flags and order
// - and commits it in one call so the live list is never left partial
// (see 20260910120000_set_onboarding_config.sql). `rows` is the desired
// config in display order; `position` is assigned here from that order (1-N)
// so callers never track it. Admin-only: the "admin writes" RLS policy gates
// every statement inside the function - a non-admin call rolls back whole.
// On failure the error propagates unchanged for the caller to surface while
// keeping the unsaved draft intact.
export async function saveOnboardingConfig(rows) {
  const payload = rows.map((r, i) => ({
    ingredient_type_id: r.ingredientTypeId,
    position: i + 1,
    is_initial: Boolean(r.isInitial),
    group_label: r.groupLabel,
  }))
  const { error } = await supabase.rpc("set_onboarding_config", {
    p_rows: payload,
  })
  if (error) throw error
}
