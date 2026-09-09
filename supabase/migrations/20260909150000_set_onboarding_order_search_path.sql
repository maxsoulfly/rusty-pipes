-- `npx supabase db advisors --linked --type security` flagged
-- public.set_onboarding_order (20260909130000_onboarding_ingredients) with
-- function_search_path_mutable - it was the only function in this schema
-- without a pinned search_path. The function already fully schema-qualifies
-- its single table reference (public.onboarding_ingredients), so an empty
-- search_path is safe and closes the finding.

alter function public.set_onboarding_order(uuid[]) set search_path = '';
