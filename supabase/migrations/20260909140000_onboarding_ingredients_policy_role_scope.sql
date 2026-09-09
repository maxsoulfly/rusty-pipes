-- onboarding_ingredients' two policies (20260909130000_onboarding_ingredients)
-- were written with plain `for select using (...)` / `for all using (...)
-- with check (...)`, which defaults to `to public` - the same slip
-- 20260823150000_liquid_colors.sql made, and fixed the same way in
-- 20260823160000_liquid_colors_policy_role_scope.sql.
--
-- Caught immediately by the RLS regression suite: an anon request evaluates
-- is_member()/is_admin() (a `to public` policy applies to every role), but
-- anon has no EXECUTE grant on either function, so instead of the clean
-- empty result every sibling table gives an unauthenticated caller, it
-- throws a raw "permission denied for function is_member". Not a real
-- exposure (nothing calls this table unauthenticated), but it must match
-- the project's established `to authenticated` policy shape.

alter policy "onboarding_ingredients: members read"
  on public.onboarding_ingredients to authenticated;
alter policy "onboarding_ingredients: admin writes"
  on public.onboarding_ingredients to authenticated;
