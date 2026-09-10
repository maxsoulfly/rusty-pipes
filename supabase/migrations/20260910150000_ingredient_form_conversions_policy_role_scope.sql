-- Scope the ingredient_form_conversions policies to `authenticated`, the
-- same slip (and same fix) as 20260909140000 did for onboarding_ingredients.
--
-- Created with the default role list (PUBLIC), the "members read" policy is
-- also evaluated for an anon request, and `is_member()` is SECURITY DEFINER
-- with EXECUTE granted only to `authenticated` - so an anon REST read fails
-- with "permission denied for function is_member" (HTTP 401) instead of the
-- intended empty 200. Restricting the policies to `authenticated` means an
-- anon request matches no policy and simply sees zero rows, matching every
-- other "member read, admin write" table.

alter policy "ingredient_form_conversions: members read"
  on public.ingredient_form_conversions to authenticated;

alter policy "ingredient_form_conversions: admin writes"
  on public.ingredient_form_conversions to authenticated;
