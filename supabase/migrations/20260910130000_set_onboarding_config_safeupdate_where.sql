-- Fix: set_onboarding_config (added 20260910120000) failed on the real
-- authenticated Data API path with "ERROR: DELETE requires a WHERE clause".
--
-- Root cause: the Supabase `authenticator` role - the connection PostgREST
-- uses for every REST/RPC request before it SET ROLEs to `authenticated` /
-- `anon` - has `session_preload_libraries = supautils, safeupdate`.
-- pg-safeupdate installs a post_parse_analyze hook that rejects any
-- UPDATE/DELETE whose analyzed query has `jointree->quals == NULL`, i.e. a
-- bare `DELETE FROM t`. The function's whole-list wipe was exactly that.
--
-- Why the RLS suite missed it: `supabase db query --linked` connects as a
-- direct Postgres login that does NOT preload safeupdate, and `SET ROLE
-- authenticated` (how the suite simulates identities) does not load
-- `session_preload_libraries` mid-session - those load once at connection
-- start. So the parser hook was never installed for the suite and the same
-- call succeeded there.
--
-- Fix: give the DELETE an explicit `WHERE true` - pg-safeupdate's own HINT
-- ("use WHERE true or similar"). Its check runs at parse-analyze, before the
-- planner folds the constant away, so `quals` is a non-NULL Const node and
-- the statement is allowed. This does NOT disable safeupdate (it stays
-- active for every other statement), does not touch permissions (still
-- SECURITY INVOKER, still gated by the "admin writes" RLS policy row by
-- row), and keeps the save atomic (still one DELETE + one INSERT in the
-- function's single transaction).
--
-- create or replace keeps the existing ACL; the revoke/grant below is
-- re-asserted for explicitness (create function defaults EXECUTE to PUBLIC).

create or replace function public.set_onboarding_config(p_rows jsonb)
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

  -- `where true`: satisfies pg-safeupdate's "DELETE requires a WHERE clause"
  -- guard (its own recommended form) without narrowing the wipe - every row
  -- still goes, subject to the admin-write RLS policy.
  delete from public.onboarding_ingredients where true;

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
