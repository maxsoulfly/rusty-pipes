-- Household Basics Stage 3c: atomic whole-config replace for the admin
-- "Onboarding ingredients" editor (src/components/admin/OnboardingTab.jsx).
--
-- Stage 3a shipped set_onboarding_order(uuid[]) for a reorder-only up/down
-- move. The Stage 3c editor instead builds a full local draft - additions,
-- removals, group changes, initial flags and order all at once - and commits
-- it in a single call. A client-side "delete all, then insert all" would be
-- two round trips with a window where the live table is empty; this function
-- does both inside one transaction (a plpgsql function body runs atomically
-- in the caller's transaction), so a failure on any row rolls the delete
-- back too and the live config is never left partial or empty.
--
-- SECURITY INVOKER, exactly like set_onboarding_order: the
-- "onboarding_ingredients: admin writes" RLS policy still gates every
-- statement. A non-admin caller's DELETE matches zero rows (RLS
-- `using is_admin()` is false) and, for any non-empty payload, the INSERT
-- trips the policy's WITH CHECK and the whole call rolls back - no partial
-- write, no way for a member to empty the list. set_onboarding_order is kept
-- (already shipped, covered by the RLS suite) but the app no longer calls it.
--
-- p_rows: a jsonb array of objects, each
--   { "ingredient_type_id": uuid, "position": int,
--     "is_initial": bool, "group_label": "Spirits"|"Mixers"|"Kitchen basics" }
-- group_label and the ingredient_type_id FK are validated by the table's own
-- CHECK / foreign key on insert; this function additionally enforces the
-- "at most 6 initial" rule and rejects a duplicated ingredient_type_id with
-- a clearer message than the raw PK violation.

create function public.set_onboarding_config(p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_initial_count int;
  v_total int;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'set_onboarding_config: p_rows must be a jsonb array';
  end if;

  v_total := jsonb_array_length(p_rows);

  select count(*) into v_initial_count
  from jsonb_array_elements(p_rows) e
  where coalesce((e ->> 'is_initial')::boolean, false);

  if v_initial_count > 6 then
    raise exception
      'set_onboarding_config: at most 6 initial items allowed (got %)',
      v_initial_count;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) e
    group by (e ->> 'ingredient_type_id')
    having count(*) > 1
  ) then
    raise exception
      'set_onboarding_config: the same ingredient appears more than once in the payload';
  end if;

  delete from public.onboarding_ingredients;

  if v_total > 0 then
    insert into public.onboarding_ingredients
      (ingredient_type_id, position, is_initial, group_label)
    select
      (e ->> 'ingredient_type_id')::uuid,
      (e ->> 'position')::int,
      coalesce((e ->> 'is_initial')::boolean, false),
      e ->> 'group_label'
    from jsonb_array_elements(p_rows) e;
  end if;
end;
$$;

revoke execute on function public.set_onboarding_config(jsonb) from public, anon;
grant execute on function public.set_onboarding_config(jsonb) to authenticated;
