-- RLS regression suite, run on demand against the hosted linked project:
--   npx supabase db query --linked --file supabase/tests/rls_suite.sql
--
-- Why this exists: RLS on this project has so far only ever been verified
-- by hand, one migration at a time, via ad-hoc `supabase db query` calls
-- that are never re-run once the next migration lands. Two real RLS bugs
-- (recipes:read had an accidental admin-can-read-anyone's-private-recipe
-- clause; profiles was admin-or-self-only, blocking cross-member author
-- display) shipped and sat live before a user noticed - a repeatable suite
-- that anyone (or a future agent) can run in one command is the point.
--
-- No Docker/Podman is available in this sandbox, so a local Supabase
-- instance (`supabase start`, which `supabase test db`'s pgTAP support
-- needs) isn't an option here. This runs plain SQL directly against the
-- hosted linked project instead, using the same identity-simulation
-- technique already used for manual verification all session:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
-- `db query --linked` connects with full superuser privilege, so switching
-- the `role` GUC genuinely downgrades what the rest of the transaction can
-- see/do - it isn't just cosmetic.
--
-- Everything runs inside one transaction, rolled back at the very end, so
-- no fixture data is ever left behind on the hosted project regardless of
-- whether every check passes. Each check either raises a NOTICE ("PASS:
-- ...") or aborts the whole run with an exception ("FAIL: ..." or a real
-- Postgres error) - a failure is loud and stops at the exact broken check
-- rather than silently continuing or being averaged away in a pass count.
--
-- Fixture identities: reuses the three real accounts already live in this
-- project from manual QA (an admin's `profiles.id` and two ordinary
-- members') rather than inserting synthetic ones - `profiles.id` has a
-- hard FK to `auth.users(id)`, which can't be populated with a plain
-- insert (Supabase Auth owns that table), so real accounts are the only
-- practical fixture identities without standing up a local instance.
--
-- Coverage: all 19 RLS-protected tables, plus the admin_set_user_role()/
-- admin_set_membership_revoked() SECURITY DEFINER functions. recipes,
-- ingredient_types, memberships (the three tables that already had a real
-- RLS bug found and fixed this session) and the five simple "member read,
-- admin write" lookup tables (glasses, taste_tags, cocktail_families,
-- liquid_colors, ingredient_categories, plus ingredient_aliases which
-- shares the identical shape) via one generic pg_temp.test_lookup_table()
-- helper. products, invitations, ingredient_requests each have their own
-- dedicated block (real per-row owner/admin logic, not a flat lookup-table
-- shape). user_inventory, user_favorites, user_want_to_make are all
-- "strictly private, no admin override" - the latter two share a generic
-- pg_temp.test_private_user_recipe_table() helper, user_inventory gets its
-- own block for its polymorphic ingredient_type_id/product_id shape.
-- recipe_components/recipe_component_alternatives/recipe_taste_tags all
-- gate through the recipe_is_editable()/recipe_is_visible() helper
-- functions rather than their own ownership columns. profiles gets its own
-- block covering the role column-grant boundary specifically (the
-- highest-blast-radius gap this schema could have, since profiles.role
-- gates admin access everywhere) - admin_set_user_role()/
-- admin_set_membership_revoked() then get a dedicated block of their own
-- exercising the actual function calls (non-admin caller, self-targeting,
-- invalid role, real promote/demote/block/unblock), not just confirming
-- direct table writes are denied.
--
-- A "moderator role" section covers the newer moderator tier: full write
-- power on all 7 "member read, admin write" lookup tables plus
-- ingredient_requests resolution, the promote/demote/unpublish trio on
-- recipes, and negative assertions proving the scope fence holds (no
-- admin_set_user_role()/admin_set_membership_revoked() access, no direct
-- classic-recipe authoring, no products or invitations access).
--
-- A final "admin_merge_ingredient_type()" section (deliberately last,
-- reuses member_other_id while it's still sitting at role = 'moderator'
-- from the section above) covers the newest admin tool: real reassignment
-- across all 6 tables that reference ingredient_types.id, the
-- collision-drop cases (recipe_component_alternatives, user_inventory), the
-- p_add_alias option, and negative assertions (non-admin caller including a
-- moderator, self-merge, merge-into-own-descendant).

begin;

-- pg_temp is session-local and is dropped automatically when this
-- connection closes - no schema pollution risk even outside the normal
-- rollback path below.
create function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', msg;
  end if;
  raise notice 'PASS: %', msg;
end;
$$;

create temporary table rls_original_role (name text) on commit drop;
insert into rls_original_role select current_user;
grant all on rls_original_role to authenticated, anon;

-- Switches identity for the rest of the transaction. Always resets to the
-- real connecting role first, then assumes the target - `anon` isn't a
-- member of `authenticated` (they're siblings, not nested), so jumping
-- straight from one to the other without going through a role that IS
-- allowed to assume both (the original superuser connection) fails with
-- "permission denied to set role". Pass p_role = 'anon' or 'authenticated';
-- p_sub is ignored for 'anon' (auth.uid() has nothing to return regardless).
create function pg_temp.set_identity(p_role text, p_sub uuid) returns void
language plpgsql as $$
begin
  perform set_config('role', (select name from rls_original_role), true);
  if p_role = 'anon' then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
  end if;
end;
$$;

-- Real fixture identities (see header comment for why these aren't
-- synthetic). If these accounts ever get deleted/renamed, re-point these
-- three ids at whichever real admin + two real members exist instead. Runs
-- before any identity switch, so still full superuser privilege here.
create temporary table rls_fixture_ids (
  admin_id uuid,
  member_owner_id uuid,
  member_other_id uuid,
  glass_id uuid,
  category_id uuid,
  type_a_id uuid,
  type_b_id uuid
) on commit drop;

-- role in ('member', 'moderator'), not just 'member': a real account can
-- have been left sitting at moderator from earlier live browser QA (found
-- 2026-08-25 - this exact query used to require role = 'member' and came up
-- one short with only 1 matching account, since the other had been promoted
-- during testing). The normalizing update right below forces both fixture
-- accounts back to plain 'member' for the rest of this transaction (rolled
-- back at the end, so it never touches the real live row) - every earlier
-- "ordinary member" assertion in this file needs a genuine non-staff
-- account, and the moderator role section further down re-promotes
-- member_other_id on purpose at the point it actually needs one.
insert into rls_fixture_ids
select
  (select id from public.profiles where role = 'admin' limit 1),
  (select p.id from public.profiles p
     join public.memberships m on m.user_id = p.id
     where p.role in ('member', 'moderator') and m.revoked_at is null
     order by m.granted_at asc limit 1),
  (select p.id from public.profiles p
     join public.memberships m on m.user_id = p.id
     where p.role in ('member', 'moderator') and m.revoked_at is null
     order by m.granted_at asc offset 1 limit 1),
  (select id from public.glasses limit 1),
  (select id from public.ingredient_categories limit 1),
  (select id from public.ingredient_types order by id limit 1),
  (select id from public.ingredient_types order by id offset 1 limit 1);
grant all on rls_fixture_ids to authenticated, anon;

update public.profiles set role = 'member'
where id in (
  select member_owner_id from rls_fixture_ids
  union select member_other_id from rls_fixture_ids
) and role <> 'member';

do $$
declare f record;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.assert(f.admin_id is not null, 'fixture: a real admin account exists');
  perform pg_temp.assert(f.member_owner_id is not null, 'fixture: a real member account exists (owner)');
  perform pg_temp.assert(f.member_other_id is not null, 'fixture: a second real member account exists (non-owner)');
  perform pg_temp.assert(f.member_owner_id <> f.member_other_id, 'fixture: the two member accounts are distinct');
  perform pg_temp.assert(f.glass_id is not null, 'fixture: a real glass exists');
  perform pg_temp.assert(f.category_id is not null, 'fixture: a real ingredient category exists');
  perform pg_temp.assert(f.type_a_id is not null, 'fixture: a real ingredient type exists (a)');
  perform pg_temp.assert(f.type_b_id is not null, 'fixture: a second real ingredient type exists (b)');
  perform pg_temp.assert(f.type_a_id <> f.type_b_id, 'fixture: the two ingredient types are distinct');
end;
$$;

-- ── recipes ──────────────────────────────────────────────────────────────

create temporary table rls_recipe_ids (private_id uuid, shared_id uuid) on commit drop;
insert into rls_recipe_ids (private_id, shared_id) values (null, null);
grant all on rls_recipe_ids to authenticated, anon;

-- Set up as member_owner: a member can only ever insert visibility='private'
-- (recipes:insert's with_check ties non-admin inserts to that), so the
-- shared/published fixture below has to be created as admin instead.
do $$
declare f record; v_id uuid;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.recipes (name, source_type, owner_id, visibility, glass_id)
  values ('RLS_TEST private recipe', 'user', f.member_owner_id, 'private', f.glass_id)
  returning id into v_id;
  update rls_recipe_ids set private_id = v_id;

  perform pg_temp.assert(true, 'recipes: owner can insert their own private recipe');
end;
$$;

do $$
declare f record;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    insert into public.recipes (name, source_type, owner_id, visibility, glass_id)
    values ('RLS_TEST forged-owner recipe', 'user', f.member_other_id, 'private', f.glass_id);
    perform pg_temp.assert(false, 'recipes: a member inserting with someone else''s owner_id should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'recipes: a member cannot insert a recipe owned by someone else');
  end;
end;
$$;

-- Admin fixture: a published community recipe, owned by member_owner. Admin
-- insert bypasses the visibility='private' restriction entirely (is_admin()
-- short-circuits recipes:insert's with_check), which is the only way to
-- seed a visibility='shared' row without going through the app's own
-- publish flow.
do $$
declare f record; v_id uuid;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  insert into public.recipes (name, source_type, owner_id, visibility, moderation_status, glass_id)
  values ('RLS_TEST shared recipe', 'user', f.member_owner_id, 'shared', 'active', f.glass_id)
  returning id into v_id;
  update rls_recipe_ids set shared_id = v_id;

  perform pg_temp.assert(true, 'recipes: admin can insert a published community recipe fixture');
end;
$$;

-- Reads
do $$
declare f record; r record; n int;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.recipes where id = r.private_id;
  perform pg_temp.assert(n = 1, 'recipes: owner can read their own private recipe');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.recipes where id = r.private_id;
  perform pg_temp.assert(n = 0, 'recipes: a non-owner member cannot read someone else''s private recipe');

  -- Regression case: recipes:read used to have an `or is_admin()` branch,
  -- letting admin read any member's still-private recipe. Fixed in
  -- 20260823110000_tighten_recipe_read_scope.sql to match the spec, which
  -- has no admin clause for this policy at all.
  perform pg_temp.set_identity('authenticated', f.admin_id);
  select count(*) into n from public.recipes where id = r.private_id;
  perform pg_temp.assert(n = 0, 'recipes: admin cannot read another member''s private recipe (regression case)');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.recipes where id = r.private_id;
  perform pg_temp.assert(n = 0, 'recipes: anon cannot read a private recipe');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.recipes where id = r.shared_id;
  perform pg_temp.assert(n = 1, 'recipes: any member can read a published community recipe');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.recipes where id = r.shared_id;
  perform pg_temp.assert(n = 0, 'recipes: anon cannot read a published community recipe either (default-deny for unauthenticated)');
end;
$$;

-- Writes
do $$
declare f record; r record; affected int;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.recipes set name = 'RLS_TEST hijacked' where id = r.private_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipes: a non-owner member cannot update someone else''s private recipe');

  delete from public.recipes where id = r.private_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipes: a non-owner member cannot delete someone else''s private recipe');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  update public.recipes set name = 'RLS_TEST renamed' where id = r.private_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'recipes: the owner can update their own private recipe');
end;
$$;

-- ── ingredient_types ─────────────────────────────────────────────────────

create temporary table rls_type_ids (new_id uuid) on commit drop;
insert into rls_type_ids (new_id) values (null);
grant all on rls_type_ids to authenticated, anon;

do $$
declare f record; n int;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.ingredient_types;
  perform pg_temp.assert(n > 0, 'ingredient_types: an ordinary member can read the catalog');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.ingredient_types;
  perform pg_temp.assert(n = 0, 'ingredient_types: anon cannot read the catalog (member-only, no anon branch)');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    insert into public.ingredient_types (category_id, name, bar_priority, recommend_by_default)
    values (f.category_id, 'RLS_TEST type', 'essential', false);
    perform pg_temp.assert(false, 'ingredient_types: an ordinary member inserting a new type should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'ingredient_types: an ordinary member cannot insert a new type');
  end;
end;
$$;

do $$
declare f record; v_type_id uuid; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  insert into public.ingredient_types (category_id, name, bar_priority, recommend_by_default)
  values (f.category_id, 'RLS_TEST type', 'essential', false)
  returning id into v_type_id;
  update rls_type_ids set new_id = v_type_id;
  perform pg_temp.assert(true, 'ingredient_types: admin can insert a new type');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.ingredient_types set name = 'RLS_TEST hijacked type' where id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_types: an ordinary member cannot update a type');

  delete from public.ingredient_types where id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_types: an ordinary member cannot delete a type');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  update public.ingredient_types set name = 'RLS_TEST renamed type' where id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_types: admin can update a type');

  delete from public.ingredient_types where id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_types: admin can delete a type');
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────
-- role is deliberately NOT in the client-facing column grant (see
-- 20260815200430_initial_schema.sql's `grant update (display_name,
-- unit_preference, theme_preference)`) - promoting to admin only ever
-- happens through admin_set_user_role(), a SECURITY DEFINER function
-- tested below. This confirms that boundary actually holds at the grant
-- layer itself, not just that the app never sends that field - the
-- highest-blast-radius gap this table could have, since profiles.role is
-- what App.jsx's isAdmin check (and every is_admin() RLS policy) reads.

do $$
declare f record; n int; affected int;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.profiles where id = f.member_owner_id;
  perform pg_temp.assert(n = 1, 'profiles: a member can read their own profile');

  select count(*) into n from public.profiles where id = f.member_other_id;
  perform pg_temp.assert(n = 1, 'profiles: a member can read a fellow member''s profile (display names are shared, not private, per 20260823120000)');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.profiles where id = f.member_owner_id;
  perform pg_temp.assert(n = 0, 'profiles: anon cannot read any profile');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  update public.profiles set display_name = 'RLS_TEST display name' where id = f.member_owner_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'profiles: a member can update their own display_name');

  update public.profiles set display_name = 'RLS_TEST hijacked' where id = f.member_other_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'profiles: a member cannot update someone else''s display_name');

  begin
    update public.profiles set role = 'admin' where id = f.member_owner_id;
    perform pg_temp.assert(false, 'profiles: a member updating their own role should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'profiles: a member cannot self-promote via a direct role update - the column grant excludes role entirely');
  end;
end;
$$;

-- ── memberships ──────────────────────────────────────────────────────────
-- No write policy exists for anyone, including admin - every membership
-- mutation goes through admin_set_membership_revoked()/create_invitation()'s
-- redemption path instead (both SECURITY DEFINER), specifically to avoid a
-- self-escalation path via a direct column grant. See current-context.md's
-- "Decisions made & why" for the reasoning. These checks confirm that
-- boundary holds at the RLS layer itself, not just by app-code discipline.

do $$
declare f record; n int; affected int;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.memberships where user_id = f.member_owner_id;
  perform pg_temp.assert(n = 1, 'memberships: a member can read their own membership row');

  select count(*) into n from public.memberships where user_id = f.member_other_id;
  perform pg_temp.assert(n = 0, 'memberships: a member cannot read someone else''s membership row');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  select count(*) into n from public.memberships where user_id = f.member_other_id;
  perform pg_temp.assert(n = 1, 'memberships: admin can read any membership row');

  -- Direct update, bypassing admin_set_membership_revoked() entirely.
  update public.memberships set revoked_at = now() where user_id = f.member_other_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'memberships: even admin cannot write directly - only the SECURITY DEFINER function can');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  update public.memberships set revoked_at = now() where user_id = f.member_owner_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'memberships: a member cannot even revoke their own membership directly');

  perform pg_temp.set_identity('anon', null);
  begin
    insert into public.memberships (user_id, granted_at) values (f.member_owner_id, now());
    perform pg_temp.assert(false, 'memberships: anon inserting a membership row should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'memberships: anon cannot insert a membership row');
  end;
end;
$$;

-- ── admin_set_user_role() / admin_set_membership_revoked() ───────────────
-- The two SECURITY DEFINER functions that provide the only legitimate write
-- path onto profiles.role and memberships.revoked_at (confirmed denied via
-- direct writes just above, in the profiles and memberships blocks).
-- Exercises the actual positive path plus each function's guard clauses:
-- caller must be admin, caller cannot target themselves, and (role only)
-- the value must be a real enum member. Both custom `raise exception`
-- calls surface as plpgsql condition raise_exception (SQLSTATE P0001).

do $$
declare f record; v_role text; v_revoked timestamptz;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    perform public.admin_set_user_role(f.member_other_id, 'admin');
    perform pg_temp.assert(false, 'admin_set_user_role: a non-admin caller should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_set_user_role: a non-admin caller is rejected');
  end;

  begin
    perform public.admin_set_membership_revoked(f.member_other_id, true);
    perform pg_temp.assert(false, 'admin_set_membership_revoked: a non-admin caller should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_set_membership_revoked: a non-admin caller is rejected');
  end;

  perform pg_temp.set_identity('authenticated', f.admin_id);
  begin
    perform public.admin_set_user_role(f.admin_id, 'member');
    perform pg_temp.assert(false, 'admin_set_user_role: an admin targeting their own account should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_set_user_role: an admin cannot change their own role');
  end;

  begin
    perform public.admin_set_membership_revoked(f.admin_id, true);
    perform pg_temp.assert(false, 'admin_set_membership_revoked: an admin blocking their own account should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_set_membership_revoked: an admin cannot block their own account');
  end;

  begin
    perform public.admin_set_user_role(f.member_other_id, 'superadmin');
    perform pg_temp.assert(false, 'admin_set_user_role: an invalid role value should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_set_user_role: an invalid role value is rejected');
  end;

  perform public.admin_set_user_role(f.member_other_id, 'admin');
  select role into v_role from public.profiles where id = f.member_other_id;
  perform pg_temp.assert(v_role = 'admin', 'admin_set_user_role: an admin can promote another member to admin');

  perform public.admin_set_user_role(f.member_other_id, 'member');
  select role into v_role from public.profiles where id = f.member_other_id;
  perform pg_temp.assert(v_role = 'member', 'admin_set_user_role: an admin can demote back to member');

  perform public.admin_set_membership_revoked(f.member_other_id, true);
  select revoked_at into v_revoked from public.memberships where user_id = f.member_other_id;
  perform pg_temp.assert(v_revoked is not null, 'admin_set_membership_revoked: an admin can block another member');

  perform public.admin_set_membership_revoked(f.member_other_id, false);
  select revoked_at into v_revoked from public.memberships where user_id = f.member_other_id;
  perform pg_temp.assert(v_revoked is null, 'admin_set_membership_revoked: an admin can unblock another member');
end;
$$;

-- ── glasses / taste_tags / cocktail_families / liquid_colors /
--    ingredient_categories ────────────────────────────────────────────────
-- All five share the identical "member read, admin write" shape (verified
-- live via pg_policies before writing this - liquid_colors' policies
-- target role {public} rather than {authenticated} like the other four,
-- but the outcome is the same either way since is_member()/is_admin() both
-- evaluate false with no identity set, so anon is denied regardless of
-- which mechanism the policy uses). One generic helper instead of five
-- near-identical copies - p_insert_cols/p_insert_vals are trusted literals
-- this file controls itself, not user input, so the dynamic SQL below
-- carries no injection risk.
create function pg_temp.test_lookup_table(
  p_table text, p_insert_cols text, p_insert_vals text,
  p_update_col text, p_update_val text
) returns void language plpgsql as $$
declare
  f record;
  v_id uuid;
  n int;
  affected int;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  execute format('select count(*) from public.%I', p_table) into n;
  perform pg_temp.assert(n > 0, format('%s: an ordinary member can read', p_table));

  perform pg_temp.set_identity('anon', null);
  execute format('select count(*) from public.%I', p_table) into n;
  perform pg_temp.assert(n = 0, format('%s: anon cannot read', p_table));

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    execute format('insert into public.%I (%s) values (%s)', p_table, p_insert_cols, p_insert_vals);
    perform pg_temp.assert(false, format('%s: an ordinary member inserting should be denied', p_table));
  exception when insufficient_privilege then
    perform pg_temp.assert(true, format('%s: an ordinary member cannot insert', p_table));
  end;

  perform pg_temp.set_identity('authenticated', f.admin_id);
  execute format('insert into public.%I (%s) values (%s) returning id', p_table, p_insert_cols, p_insert_vals) into v_id;
  perform pg_temp.assert(true, format('%s: admin can insert', p_table));

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  execute format('update public.%I set %I = %L where id = $1', p_table, p_update_col, p_update_val) using v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, format('%s: an ordinary member cannot update', p_table));

  execute format('delete from public.%I where id = $1', p_table) using v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, format('%s: an ordinary member cannot delete', p_table));

  perform pg_temp.set_identity('authenticated', f.admin_id);
  execute format('update public.%I set %I = %L where id = $1', p_table, p_update_col, p_update_val) using v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, format('%s: admin can update', p_table));

  execute format('delete from public.%I where id = $1', p_table) using v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, format('%s: admin can delete', p_table));
end;
$$;

do $$ begin
  perform pg_temp.test_lookup_table('glasses', 'name, shape', $vals$'RLS_TEST glass', 'martini'$vals$, 'name', 'RLS_TEST glass renamed');
end $$;
do $$ begin
  perform pg_temp.test_lookup_table('taste_tags', 'name', $vals$'RLS_TEST tag'$vals$, 'name', 'RLS_TEST tag renamed');
end $$;
do $$ begin
  perform pg_temp.test_lookup_table('cocktail_families', 'name, shape', $vals$'RLS_TEST family', 'highball'$vals$, 'name', 'RLS_TEST family renamed');
end $$;
do $$ begin
  perform pg_temp.test_lookup_table('liquid_colors', 'name, hex', $vals$'RLS_TEST color', '#123456'$vals$, 'name', 'RLS_TEST color renamed');
end $$;
do $$ begin
  perform pg_temp.test_lookup_table('ingredient_categories', 'name, sort_order', $vals$'RLS_TEST category', 999$vals$, 'name', 'RLS_TEST category renamed');
end $$;

-- ingredient_aliases shares the exact same "member read, admin write" shape
-- as the five lookup tables above - the only difference is its insert needs
-- a real ingredient_type_id, which isn't known until runtime, so the values
-- string is built dynamically instead of being a literal like the others.
do $$
declare f record; v_vals text;
begin
  select * into f from rls_fixture_ids;
  v_vals := format('%L, %L', f.type_a_id, 'RLS_TEST alias');
  perform pg_temp.test_lookup_table('ingredient_aliases', 'ingredient_type_id, alias', v_vals, 'alias', 'RLS_TEST alias renamed');
end $$;

-- ── onboarding_ingredients ───────────────────────────────────────────────
-- Admin-curated "Build your bar" config (20260909130000). "member read,
-- admin write" like the lookup tables above, but a different shape (PK is
-- ingredient_type_id, no `id`/`name` column) so it can't reuse
-- test_lookup_table(). Also exercises set_onboarding_order() - a plain
-- SECURITY INVOKER helper: authenticated may execute it, but the UPDATE
-- inside is still gated by the admin-write policy, so a non-admin's call
-- changes nothing; anon has no EXECUTE grant at all.

do $$
declare
  f record;
  v_type_id uuid;
  v_id_a uuid;
  v_id_b uuid;
  n int;
  affected int;
  pos_before int;
  v_grp text;
  v_payload jsonb;
begin
  select * into f from rls_fixture_ids;

  -- Still the real connecting role here: pick a type not already seeded into
  -- onboarding_ingredients (PK is ingredient_type_id), and grab two that ARE
  -- seeded for the reorder checks.
  select id into v_type_id from public.ingredient_types
    where id not in (select ingredient_type_id from public.onboarding_ingredients)
    limit 1;
  perform pg_temp.assert(v_type_id is not null, 'fixture: an ingredient type not already in onboarding_ingredients exists');
  select ingredient_type_id into v_id_a from public.onboarding_ingredients order by position asc limit 1;
  select ingredient_type_id into v_id_b from public.onboarding_ingredients order by position desc limit 1;
  perform pg_temp.assert(v_id_a is not null and v_id_b is not null and v_id_a <> v_id_b, 'fixture: onboarding_ingredients has at least two seeded rows');

  -- read
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.onboarding_ingredients;
  perform pg_temp.assert(n > 0, 'onboarding_ingredients: an ordinary member can read');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.onboarding_ingredients;
  perform pg_temp.assert(n = 0, 'onboarding_ingredients: anon cannot read');

  -- member write denied
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    insert into public.onboarding_ingredients (ingredient_type_id, position, is_initial, group_label)
    values (v_type_id, 999, false, 'Spirits');
    perform pg_temp.assert(false, 'onboarding_ingredients: an ordinary member inserting should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'onboarding_ingredients: an ordinary member cannot insert');
  end;

  update public.onboarding_ingredients set is_initial = not is_initial where ingredient_type_id = v_id_a;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'onboarding_ingredients: an ordinary member cannot update');

  delete from public.onboarding_ingredients where ingredient_type_id = v_id_a;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'onboarding_ingredients: an ordinary member cannot delete');

  -- admin write allowed
  perform pg_temp.set_identity('authenticated', f.admin_id);
  insert into public.onboarding_ingredients (ingredient_type_id, position, is_initial, group_label)
  values (v_type_id, 999, false, 'Kitchen basics');
  perform pg_temp.assert(true, 'onboarding_ingredients: admin can insert');

  update public.onboarding_ingredients set group_label = 'Mixers' where ingredient_type_id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'onboarding_ingredients: admin can update');

  delete from public.onboarding_ingredients where ingredient_type_id = v_type_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'onboarding_ingredients: admin can delete');

  -- group_label check constraint
  begin
    insert into public.onboarding_ingredients (ingredient_type_id, position, is_initial, group_label)
    values (v_type_id, 999, false, 'Not A Real Group');
    perform pg_temp.assert(false, 'onboarding_ingredients: an unknown group_label should be rejected');
  exception when check_violation then
    perform pg_temp.assert(true, 'onboarding_ingredients: group_label is constrained to the 3 fixed headings');
  end;

  -- set_onboarding_order(): admin call actually reorders
  perform pg_temp.set_identity('authenticated', f.admin_id);
  perform public.set_onboarding_order(array[v_id_b, v_id_a]);
  select position into n from public.onboarding_ingredients where ingredient_type_id = v_id_b;
  perform pg_temp.assert(n = 1, 'set_onboarding_order: an admin call reassigns position atomically');

  -- member may execute the function, but the UPDATE inside is RLS-gated -> no-op
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select position into pos_before from public.onboarding_ingredients where ingredient_type_id = v_id_a;
  perform public.set_onboarding_order(array[v_id_a, v_id_b]);
  select position into n from public.onboarding_ingredients where ingredient_type_id = v_id_a;
  perform pg_temp.assert(n = pos_before, 'set_onboarding_order: a member call changes nothing (admin-write policy still gates the UPDATE)');

  -- anon has no EXECUTE grant at all
  perform pg_temp.set_identity('anon', null);
  begin
    perform public.set_onboarding_order(array[v_id_a]);
    perform pg_temp.assert(false, 'set_onboarding_order: anon should have no EXECUTE grant');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'set_onboarding_order: anon cannot execute it');
  end;

  -- set_onboarding_config(): atomic whole-list replace behind the admin
  -- "Onboarding ingredients" editor. SECURITY INVOKER like the reorder
  -- helper - the admin-write policy still gates every statement inside, and
  -- the delete + insert run in one transaction so a rejected payload leaves
  -- the live config exactly as it was (never partial, never empty).

  -- admin: a valid payload replaces the whole config in one call
  perform pg_temp.set_identity('authenticated', f.admin_id);
  perform public.set_onboarding_config(jsonb_build_array(
    jsonb_build_object('ingredient_type_id', v_id_a, 'position', 1, 'is_initial', true,  'group_label', 'Spirits'),
    jsonb_build_object('ingredient_type_id', v_id_b, 'position', 2, 'is_initial', false, 'group_label', 'Mixers')
  ));
  select count(*) into n from public.onboarding_ingredients;
  perform pg_temp.assert(n = 2, 'set_onboarding_config: an admin call replaces the entire list in one shot');
  select group_label into v_grp from public.onboarding_ingredients where ingredient_type_id = v_id_b;
  perform pg_temp.assert(v_grp = 'Mixers', 'set_onboarding_config: an admin call writes each row''s group_label');

  -- admin: more than 6 initial rows is rejected and the previous config stands
  select jsonb_agg(jsonb_build_object(
           'ingredient_type_id', t.id, 'position', t.rn,
           'is_initial', true, 'group_label', 'Spirits'))
    into v_payload
    from (select id, row_number() over (order by id) as rn
          from public.ingredient_types limit 7) t;
  begin
    perform public.set_onboarding_config(v_payload);
    perform pg_temp.assert(false, 'set_onboarding_config: a payload with more than 6 initial rows should be rejected');
  exception when raise_exception then
    perform pg_temp.assert(true, 'set_onboarding_config: rejects a payload with more than 6 initial rows');
  end;
  select count(*) into n from public.onboarding_ingredients;
  perform pg_temp.assert(n = 2, 'set_onboarding_config: a rejected payload leaves the previous config intact');

  -- member: EXECUTE is granted to authenticated, but the insert inside trips
  -- the admin-write WITH CHECK and the whole call rolls back
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    perform public.set_onboarding_config(jsonb_build_array(
      jsonb_build_object('ingredient_type_id', v_id_a, 'position', 1, 'is_initial', false, 'group_label', 'Spirits')
    ));
    perform pg_temp.assert(false, 'set_onboarding_config: a member call should be denied by RLS');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'set_onboarding_config: a member cannot write the config (admin-write WITH CHECK)');
  end;
  select count(*) into n from public.onboarding_ingredients;
  perform pg_temp.assert(n = 2, 'set_onboarding_config: a denied member call leaves the config intact (the delete rolls back too)');

  -- anon has no EXECUTE grant at all
  perform pg_temp.set_identity('anon', null);
  begin
    perform public.set_onboarding_config('[]'::jsonb);
    perform pg_temp.assert(false, 'set_onboarding_config: anon should have no EXECUTE grant');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'set_onboarding_config: anon cannot execute it');
  end;

  -- Regression (2026-09-10): set_onboarding_config first shipped with a bare
  -- `DELETE FROM public.onboarding_ingredients;`. That works from this suite
  -- (db query --linked connects without session_preload_libraries), but the
  -- real Data API path runs as `authenticator`, which preloads pg-safeupdate
  -- - its post_parse_analyze hook rejects a no-WHERE DELETE with
  -- "DELETE requires a WHERE clause", so every admin Save failed live while
  -- every check above passed. This suite cannot LOAD safeupdate to fire the
  -- hook, so guard the function source instead: the whole-list DELETE must
  -- carry an explicit WHERE (`where true`).
  perform pg_temp.set_identity('authenticated', f.admin_id);
  if pg_get_functiondef('public.set_onboarding_config(jsonb)'::regprocedure)
       ~* 'delete\s+from\s+public\.onboarding_ingredients\s*;' then
    perform pg_temp.assert(false,
      'set_onboarding_config: the whole-list DELETE has no WHERE clause - pg-safeupdate rejects it on the real authenticated API path');
  else
    perform pg_temp.assert(true,
      'set_onboarding_config: the whole-list DELETE carries an explicit WHERE (pg-safeupdate safe)');
  end if;
end;
$$;

-- ── ingredient_form_conversions ─────────────────────────────────────────
-- Concept 2 (20260910140000). "member read, admin write" like
-- onboarding_ingredients. Also exercises the CHECK constraints and the
-- forbid_inverse_form_conversion() BEFORE trigger that keeps the mapping
-- one-directional.

do $$
declare
  f record;
  v_raw uuid;
  v_prep uuid;
  v_third uuid;
  v_id uuid;
  n int;
  affected int;
begin
  select * into f from rls_fixture_ids;

  -- Three ingredient types not already wired into a conversion, picked while
  -- still the superuser connection.
  select id into v_raw from public.ingredient_types
    where id not in (
      select raw_type_id from public.ingredient_form_conversions
      union select prepared_type_id from public.ingredient_form_conversions)
    order by name limit 1;
  select id into v_prep from public.ingredient_types
    where id <> v_raw
      and id not in (
        select raw_type_id from public.ingredient_form_conversions
        union select prepared_type_id from public.ingredient_form_conversions)
    order by name limit 1;
  select id into v_third from public.ingredient_types
    where id not in (v_raw, v_prep)
      and id not in (
        select raw_type_id from public.ingredient_form_conversions
        union select prepared_type_id from public.ingredient_form_conversions)
    order by name limit 1;
  perform pg_temp.assert(
    v_raw is not null and v_prep is not null and v_third is not null,
    'fixture: three ingredient types outside any existing form conversion exist');

  -- read
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.ingredient_form_conversions;
  perform pg_temp.assert(n >= 2, 'ingredient_form_conversions: a member can read (seed rows present)');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.ingredient_form_conversions;
  perform pg_temp.assert(n = 0, 'ingredient_form_conversions: anon cannot read');

  -- member write denied
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_raw, v_prep, 'member should not be able to add this');
    perform pg_temp.assert(false, 'ingredient_form_conversions: a member inserting should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'ingredient_form_conversions: a member cannot insert');
  end;

  -- admin write allowed
  perform pg_temp.set_identity('authenticated', f.admin_id);
  insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
  values (v_raw, v_prep, 'RLS_TEST squeeze it')
  returning id into v_id;
  perform pg_temp.assert(v_id is not null, 'ingredient_form_conversions: admin can insert');

  update public.ingredient_form_conversions set guidance = 'RLS_TEST edited' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_form_conversions: admin can update the guidance text');

  -- self-pair rejected by the CHECK
  begin
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_third, v_third, 'a type cannot convert to itself');
    perform pg_temp.assert(false, 'ingredient_form_conversions: a self-referential pair should be rejected');
  exception when check_violation then
    perform pg_temp.assert(true, 'ingredient_form_conversions: raw_type_id <> prepared_type_id is enforced');
  end;

  -- blank guidance rejected by the CHECK
  begin
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_prep, v_third, '   ');
    perform pg_temp.assert(false, 'ingredient_form_conversions: blank guidance should be rejected');
  exception when check_violation then
    perform pg_temp.assert(true, 'ingredient_form_conversions: guidance must be non-blank');
  end;

  -- duplicate pair rejected by the UNIQUE constraint
  begin
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_raw, v_prep, 'duplicate of the row above');
    perform pg_temp.assert(false, 'ingredient_form_conversions: a duplicate (raw, prepared) pair should be rejected');
  exception when unique_violation then
    perform pg_temp.assert(true, 'ingredient_form_conversions: (raw_type_id, prepared_type_id) is unique');
  end;

  -- inverse pair rejected by forbid_inverse_form_conversion()
  begin
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_prep, v_raw, 'the inverse direction');
    perform pg_temp.assert(false, 'ingredient_form_conversions: registering the inverse pair should be rejected');
  exception when raise_exception then
    perform pg_temp.assert(true, 'ingredient_form_conversions: the inverse-pair trigger keeps the mapping one-directional');
  end;

  -- on delete cascade: dropping a referenced ingredient type removes its
  -- rows. Uses a throwaway type so an unrelated RESTRICT FK (recipe
  -- components, products) on a real catalogue row can't derail the check.
  declare
    v_scratch_type uuid;
    v_scratch_conv uuid;
  begin
    insert into public.ingredient_types (name, category_id)
    values ('RLS_TEST scratch juice', (select category_id from public.ingredient_types where id = v_raw))
    returning id into v_scratch_type;
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    values (v_raw, v_scratch_type, 'RLS_TEST cascade target')
    returning id into v_scratch_conv;
    delete from public.ingredient_types where id = v_scratch_type;
    select count(*) into n from public.ingredient_form_conversions where id = v_scratch_conv;
    perform pg_temp.assert(n = 0, 'ingredient_form_conversions: a row is cascade-deleted when its ingredient type is removed');
  end;

  -- member cannot delete a remaining admin-made row
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  delete from public.ingredient_form_conversions where guidance like 'Squeeze fresh juice%';
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_form_conversions: a member cannot delete a row');

  -- admin can delete
  perform pg_temp.set_identity('authenticated', f.admin_id);
  insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
  values (v_raw, v_third, 'RLS_TEST deletable');
  delete from public.ingredient_form_conversions where raw_type_id = v_raw and prepared_type_id = v_third;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_form_conversions: admin can delete a row');
end;
$$;

-- ── products ─────────────────────────────────────────────────────────────
-- Shared catalog: any member can read and insert (their own created_by),
-- but only admin can update/delete - unlike the lookup tables, ordinary
-- members DO get an insert path here (spec: members can add products, never
-- new ingredient types).

create temporary table rls_product_ids (new_id uuid) on commit drop;
insert into rls_product_ids (new_id) values (null);
grant all on rls_product_ids to authenticated, anon;

do $$
declare f record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.products (ingredient_type_id, name)
  values (f.type_a_id, 'RLS_TEST product')
  returning id into v_id;
  update rls_product_ids set new_id = v_id;
  perform pg_temp.assert(true, 'products: an ordinary member can insert a product (created_by defaults to their own id)');

  begin
    insert into public.products (ingredient_type_id, name, created_by)
    values (f.type_a_id, 'RLS_TEST forged product', f.member_other_id);
    perform pg_temp.assert(false, 'products: a member inserting with someone else''s created_by should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'products: a member cannot insert a product credited to someone else');
  end;

  select count(*) into n from public.products where id = v_id;
  perform pg_temp.assert(n = 1, 'products: any member can read the shared catalog');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.products where id = v_id;
  perform pg_temp.assert(n = 0, 'products: anon cannot read the catalog');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.products set name = 'RLS_TEST hijacked product' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'products: an ordinary member cannot update a product (admin-only, even a stranger''s)');

  delete from public.products where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'products: an ordinary member cannot delete a product');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  update public.products set name = 'RLS_TEST renamed product' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'products: admin can update a product');

  delete from public.products where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'products: admin can delete a product');
end;
$$;

-- ── invitations ──────────────────────────────────────────────────────────
-- Single "ALL" policy gated on is_admin() alone - no owner branch at all,
-- so even the admin who created a given invitation has no special claim
-- over it beyond just being admin. Ordinary members get zero access,
-- including to their own eventual invitation (redemption goes through the
-- separate redeem_invitation() SECURITY DEFINER function, never direct
-- table access).

do $$
declare f record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  select count(*) into n from public.invitations;
  perform pg_temp.assert(n = 0, 'invitations: an ordinary member cannot read any invitation');

  begin
    insert into public.invitations (code, created_by, expires_at)
    values ('RLS_TEST_INVITE', f.member_owner_id, now() + interval '1 day');
    perform pg_temp.assert(false, 'invitations: an ordinary member inserting an invitation should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'invitations: an ordinary member cannot insert an invitation');
  end;

  perform pg_temp.set_identity('authenticated', f.admin_id);
  insert into public.invitations (code, created_by, expires_at)
  values ('RLS_TEST_INVITE', f.admin_id, now() + interval '1 day')
  returning id into v_id;
  perform pg_temp.assert(true, 'invitations: admin can insert an invitation');

  select count(*) into n from public.invitations where id = v_id;
  perform pg_temp.assert(n = 1, 'invitations: admin can read an invitation');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.invitations set revoked_at = now() where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'invitations: an ordinary member cannot revoke an invitation');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  update public.invitations set revoked_at = now() where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'invitations: admin can revoke an invitation');

  delete from public.invitations where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'invitations: admin can delete an invitation');
end;
$$;

-- ── ingredient_requests ──────────────────────────────────────────────────
-- Own-row read/insert for members (plus admin read-all), owner can only
-- delete while still 'pending', and only admin can update (resolve) a
-- request at all - two separate real-world behaviors worth both covering:
-- the pending-delete window closing once resolved, and admin-only resolve.

create temporary table rls_request_ids (pending_id uuid, resolved_id uuid) on commit drop;
insert into rls_request_ids (pending_id, resolved_id) values (null, null);
grant all on rls_request_ids to authenticated, anon;

do $$
declare f record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.ingredient_requests (requested_by, name)
  values (f.member_owner_id, 'RLS_TEST resolved-request ingredient')
  returning id into v_id;
  update rls_request_ids set resolved_id = v_id;
  perform pg_temp.assert(true, 'ingredient_requests: a member can insert their own request');

  begin
    insert into public.ingredient_requests (requested_by, name)
    values (f.member_other_id, 'RLS_TEST forged request');
    perform pg_temp.assert(false, 'ingredient_requests: a member inserting with someone else''s requested_by should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'ingredient_requests: a member cannot insert a request credited to someone else');
  end;

  select count(*) into n from public.ingredient_requests where id = v_id;
  perform pg_temp.assert(n = 1, 'ingredient_requests: the requester can read their own request');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.ingredient_requests where id = v_id;
  perform pg_temp.assert(n = 0, 'ingredient_requests: a different member cannot read someone else''s request');

  update public.ingredient_requests set status = 'fulfilled' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_requests: an ordinary member cannot resolve a request (admin-only)');

  delete from public.ingredient_requests where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_requests: a different member cannot delete someone else''s request');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  select count(*) into n from public.ingredient_requests where id = v_id;
  perform pg_temp.assert(n = 1, 'ingredient_requests: admin can read any request');

  update public.ingredient_requests set status = 'fulfilled' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_requests: admin can resolve a request');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  delete from public.ingredient_requests where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'ingredient_requests: the owner cannot delete their own request once it''s no longer pending (regression case)');
end;
$$;

do $$
declare f record; v_id uuid; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.ingredient_requests (requested_by, name)
  values (f.member_owner_id, 'RLS_TEST pending-request ingredient')
  returning id into v_id;
  update rls_request_ids set pending_id = v_id;

  delete from public.ingredient_requests where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'ingredient_requests: the owner can delete their own request while it''s still pending');
end;
$$;

-- ── user_inventory ───────────────────────────────────────────────────────
-- Strictly private per the table's own comment - no admin-read override,
-- unlike profiles/memberships. Worth asserting explicitly, not just trusting
-- the comment, since this is exactly the class of thing this suite exists
-- to catch drift on (see liquid_colors in the last chunk).

do $$
declare f record; v_type_id uuid; v_id uuid; n int; affected int; v_pinned boolean;
begin
  select * into f from rls_fixture_ids;

  -- Still the real connecting (superuser) role here, before set_identity -
  -- pick a type member_owner doesn't already own in their real My Bar data,
  -- since type_a_id/type_b_id are just "the first two types that exist" and
  -- may already be in a real account's inventory (unique per user+type).
  select id into v_type_id from public.ingredient_types
    where id not in (
      select ingredient_type_id from public.user_inventory
      where user_id in (f.member_owner_id, f.member_other_id) and ingredient_type_id is not null
    )
    limit 1;
  perform pg_temp.assert(v_type_id is not null, 'fixture: an ingredient type not already in either member''s inventory exists');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.user_inventory (user_id, ingredient_type_id)
  values (f.member_owner_id, v_type_id)
  returning id into v_id;
  perform pg_temp.assert(true, 'user_inventory: a member can insert their own inventory row');

  begin
    insert into public.user_inventory (user_id, ingredient_type_id)
    values (f.member_other_id, v_type_id);
    perform pg_temp.assert(false, 'user_inventory: a member inserting with someone else''s user_id should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'user_inventory: a member cannot insert an inventory row for someone else');
  end;

  select count(*) into n from public.user_inventory where id = v_id;
  perform pg_temp.assert(n = 1, 'user_inventory: the owner can read their own inventory row');

  -- Speed Rack `pinned` column (Stage 3): a narrow "update own" policy plus
  -- an UPDATE grant scoped to just `pinned` (20260906130000). The owner can
  -- flip pinned; the grant does not reach any other column; a different
  -- member / anon cannot touch it at all.
  update public.user_inventory set pinned = true where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'user_inventory: the owner can set pinned on their own row');
  select pinned into v_pinned from public.user_inventory where id = v_id;
  perform pg_temp.assert(v_pinned is true, 'user_inventory: the pinned flag actually took');
  begin
    update public.user_inventory set ingredient_type_id = ingredient_type_id where id = v_id;
    perform pg_temp.assert(false, 'user_inventory: updating a non-pinned column should be denied by the column grant');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'user_inventory: the UPDATE grant is column-scoped to pinned - ownership columns stay unwritable');
  end;
  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.user_inventory set pinned = false where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'user_inventory: a different member cannot change pinned on someone else''s row');
  perform pg_temp.set_identity('anon', null);
  begin
    update public.user_inventory set pinned = false where id = v_id;
    get diagnostics affected = row_count;
    perform pg_temp.assert(affected = 0, 'user_inventory: an anon pinned update affects nothing');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'user_inventory: anon has no UPDATE grant on user_inventory at all');
  end;

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.user_inventory where id = v_id;
  perform pg_temp.assert(n = 0, 'user_inventory: a different member cannot read someone else''s inventory row');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  select count(*) into n from public.user_inventory where id = v_id;
  perform pg_temp.assert(n = 0, 'user_inventory: strictly private - even admin cannot read someone else''s inventory row');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  delete from public.user_inventory where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'user_inventory: a different member cannot delete someone else''s inventory row');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  delete from public.user_inventory where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'user_inventory: the owner can delete their own inventory row');
end;
$$;

-- ── recipe_components / recipe_component_alternatives ───────────────────
-- Neither table has its own owner column - both gate entirely through
-- recipe_is_editable(recipe_id)/recipe_is_visible(recipe_id), which read
-- the parent recipe's own owner_id/visibility. Reuses the private_id/
-- shared_id fixtures the recipes section already created above (still live
-- in this transaction - nothing here has been committed yet).

create temporary table rls_component_ids (comp_id uuid, alt_id uuid) on commit drop;
insert into rls_component_ids (comp_id, alt_id) values (null, null);
grant all on rls_component_ids to authenticated, anon;

do $$
declare f record; r record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  insert into public.recipe_components (recipe_id, ingredient_type_id, amount, unit_label, role)
  values (r.private_id, f.type_a_id, 30, 'ml', 'required')
  returning id into v_id;
  update rls_component_ids set comp_id = v_id;
  perform pg_temp.assert(true, 'recipe_components: the recipe owner can insert a component');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  begin
    insert into public.recipe_components (recipe_id, ingredient_type_id, amount, unit_label, role)
    values (r.private_id, f.type_b_id, 15, 'ml', 'required');
    perform pg_temp.assert(false, 'recipe_components: a non-owner member inserting into someone else''s private recipe should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'recipe_components: a non-owner member cannot insert into a private recipe they don''t own');
  end;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.recipe_components where id = v_id;
  perform pg_temp.assert(n = 1, 'recipe_components: the owner can read their own private recipe''s components');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.recipe_components where id = v_id;
  perform pg_temp.assert(n = 0, 'recipe_components: a non-owner member cannot read a private recipe''s components');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.recipe_components where id = v_id;
  perform pg_temp.assert(n = 0, 'recipe_components: anon cannot read a private recipe''s components');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.recipe_components set amount = 999 where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipe_components: a non-owner member cannot update a component on a private recipe');

  delete from public.recipe_components where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipe_components: a non-owner member cannot delete a component on a private recipe');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  update public.recipe_components set amount = 45 where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'recipe_components: the owner can update a component on their own recipe');
end;
$$;

do $$
declare f record; r record; c record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;
  select * into c from rls_component_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  insert into public.recipe_component_alternatives (recipe_id, recipe_component_id, ingredient_type_id)
  values (r.private_id, c.comp_id, f.type_b_id)
  returning id into v_id;
  update rls_component_ids set alt_id = v_id;
  perform pg_temp.assert(true, 'recipe_component_alternatives: the recipe owner can insert a substitution alternative');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.recipe_component_alternatives where id = v_id;
  perform pg_temp.assert(n = 0, 'recipe_component_alternatives: a non-owner member cannot read alternatives on a private recipe');

  delete from public.recipe_component_alternatives where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipe_component_alternatives: a non-owner member cannot delete an alternative on a private recipe');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.recipe_component_alternatives where id = v_id;
  perform pg_temp.assert(n = 1, 'recipe_component_alternatives: the owner can read their own recipe''s alternatives');

  delete from public.recipe_component_alternatives where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'recipe_component_alternatives: the owner can delete an alternative on their own recipe');

  delete from public.recipe_components where id = c.comp_id;
end;
$$;

-- ── recipe_taste_tags ─────────────────────────────────────────────────────
-- Same shape as recipe_components/recipe_component_alternatives above: no
-- owner column of its own, gates entirely through
-- recipe_is_editable(recipe_id)/recipe_is_visible(recipe_id) against the
-- parent recipe. There's no update policy - it's a pure link table, callers
-- delete+insert to change the tag set - so this only covers read/insert/
-- delete, matching what the migration actually grants.

do $$
declare f record; r record; v_tag_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;
  select id into v_tag_id from public.taste_tags limit 1;
  perform pg_temp.assert(v_tag_id is not null, 'fixture: a real taste_tag exists');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  insert into public.recipe_taste_tags (recipe_id, taste_tag_id) values (r.private_id, v_tag_id);
  perform pg_temp.assert(true, 'recipe_taste_tags: the recipe owner can insert a tag');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  begin
    insert into public.recipe_taste_tags (recipe_id, taste_tag_id)
    select r.private_id, id from public.taste_tags offset 1 limit 1;
    perform pg_temp.assert(false, 'recipe_taste_tags: a non-owner member inserting into someone else''s private recipe should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'recipe_taste_tags: a non-owner member cannot insert into a private recipe they don''t own');
  end;

  select count(*) into n from public.recipe_taste_tags where recipe_id = r.private_id and taste_tag_id = v_tag_id;
  perform pg_temp.assert(n = 0, 'recipe_taste_tags: a non-owner member cannot read a private recipe''s tags');

  perform pg_temp.set_identity('anon', null);
  select count(*) into n from public.recipe_taste_tags where recipe_id = r.private_id and taste_tag_id = v_tag_id;
  perform pg_temp.assert(n = 0, 'recipe_taste_tags: anon cannot read a private recipe''s tags');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  select count(*) into n from public.recipe_taste_tags where recipe_id = r.private_id and taste_tag_id = v_tag_id;
  perform pg_temp.assert(n = 1, 'recipe_taste_tags: the owner can read their own recipe''s tags');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  delete from public.recipe_taste_tags where recipe_id = r.private_id and taste_tag_id = v_tag_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'recipe_taste_tags: a non-owner member cannot delete a tag on a private recipe');

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  delete from public.recipe_taste_tags where recipe_id = r.private_id and taste_tag_id = v_tag_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'recipe_taste_tags: the owner can delete a tag on their own recipe');
end;
$$;

-- ── user_favorites / user_want_to_make ───────────────────────────────────
-- Both share the identical "strictly private, select/insert/delete own row
-- only, no update, no admin override" shape - one generic helper instead of
-- two near-duplicate blocks, same reasoning as the lookup-table helper
-- above. Uses the shared_id recipe fixture from the recipes section (any
-- live recipe id works as the FK target; favorites/want-to-make don't
-- re-check recipe visibility themselves).
create function pg_temp.test_private_user_recipe_table(p_table text, p_recipe_id uuid) returns void
language plpgsql as $$
declare
  f record;
  n int;
  affected int;
begin
  select * into f from rls_fixture_ids;

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  execute format('insert into public.%I (user_id, recipe_id) values ($1, $2)', p_table)
    using f.member_owner_id, p_recipe_id;
  perform pg_temp.assert(true, format('%s: a member can insert their own row', p_table));

  begin
    execute format('insert into public.%I (user_id, recipe_id) values ($1, $2)', p_table)
      using f.member_other_id, p_recipe_id;
    perform pg_temp.assert(false, format('%s: a member inserting with someone else''s user_id should be denied', p_table));
  exception when insufficient_privilege then
    perform pg_temp.assert(true, format('%s: a member cannot insert a row for someone else', p_table));
  end;

  execute format('select count(*) from public.%I where user_id = $1 and recipe_id = $2', p_table)
    into n using f.member_owner_id, p_recipe_id;
  perform pg_temp.assert(n = 1, format('%s: the owner can read their own row', p_table));

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  execute format('select count(*) from public.%I where user_id = $1 and recipe_id = $2', p_table)
    into n using f.member_owner_id, p_recipe_id;
  perform pg_temp.assert(n = 0, format('%s: a different member cannot read someone else''s row', p_table));

  perform pg_temp.set_identity('authenticated', f.admin_id);
  execute format('select count(*) from public.%I where user_id = $1 and recipe_id = $2', p_table)
    into n using f.member_owner_id, p_recipe_id;
  perform pg_temp.assert(n = 0, format('%s: strictly private - even admin cannot read someone else''s row', p_table));

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  execute format('delete from public.%I where user_id = $1 and recipe_id = $2', p_table)
    using f.member_owner_id, p_recipe_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, format('%s: a different member cannot delete someone else''s row', p_table));

  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  execute format('delete from public.%I where user_id = $1 and recipe_id = $2', p_table)
    using f.member_owner_id, p_recipe_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, format('%s: the owner can delete their own row', p_table));
end;
$$;

do $$
declare r record;
begin
  select * into r from rls_recipe_ids;
  perform pg_temp.test_private_user_recipe_table('user_favorites', r.shared_id);
end $$;
do $$
declare r record;
begin
  select * into r from rls_recipe_ids;
  perform pg_temp.test_private_user_recipe_table('user_want_to_make', r.shared_id);
end $$;

-- ── moderator role ───────────────────────────────────────────────────────
-- Exercises the confirmed scope: full catalog-authoring power (the 7
-- "member read, admin write" lookup tables + ingredient_requests) and
-- exactly promote/demote/unpublish on recipes - nothing more. Deliberately
-- placed last and reuses member_other_id rather than a fresh third
-- identity: every earlier block that needed member_other_id as an
-- "ordinary member" fixture has already run by this point, so temporarily
-- promoting its role here is exactly as safe as any other RLS_TEST-prefixed
-- mutation in this file - the whole script rolls back at the end
-- regardless. (Only 2 real non-revoked member accounts exist in this
-- project as of writing - reusing one avoids needing a 3rd just for this.)

do $$
declare f record;
begin
  -- The previous block (user_want_to_make) left the role GUC switched to
  -- `authenticated` impersonating member_owner_id - set_identity()'s
  -- LOCAL scope holds for the rest of the transaction, not just one
  -- statement, so this needs the same explicit reset back to the real
  -- connecting superuser role that set_identity() itself does internally.
  perform set_config('role', (select name from rls_original_role), true);
  select * into f from rls_fixture_ids;
  update public.profiles set role = 'moderator' where id = f.member_other_id;
end;
$$;

do $$
declare f record; n int; affected int; v_id uuid;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_other_id);

  -- Moderator is layered on top of an ordinary membership, not a
  -- replacement for one - still passes the plain "member can read" check.
  select count(*) into n from public.glasses;
  perform pg_temp.assert(n > 0, 'moderator: still an ordinary member for read access - can read a lookup table');

  -- Full write power on all 7 lookup tables - same shape/literals the
  -- admin-write assertions above already use.
  insert into public.glasses (name, shape) values ('RLS_TEST mod glass', 'martini') returning id into v_id;
  update public.glasses set name = 'RLS_TEST mod glass renamed' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can update a glass');
  delete from public.glasses where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can delete a glass');

  insert into public.taste_tags (name) values ('RLS_TEST mod tag') returning id into v_id;
  update public.taste_tags set name = 'RLS_TEST mod tag renamed' where id = v_id;
  delete from public.taste_tags where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete a taste tag');

  insert into public.cocktail_families (name, shape) values ('RLS_TEST mod family', 'highball') returning id into v_id;
  update public.cocktail_families set name = 'RLS_TEST mod family renamed' where id = v_id;
  delete from public.cocktail_families where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete a cocktail family');

  insert into public.liquid_colors (name, hex) values ('RLS_TEST mod color', '#123456') returning id into v_id;
  update public.liquid_colors set name = 'RLS_TEST mod color renamed' where id = v_id;
  delete from public.liquid_colors where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete a liquid color');

  insert into public.ingredient_categories (name, sort_order) values ('RLS_TEST mod category', 999) returning id into v_id;
  update public.ingredient_categories set name = 'RLS_TEST mod category renamed' where id = v_id;
  delete from public.ingredient_categories where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete an ingredient category');

  insert into public.ingredient_aliases (ingredient_type_id, alias) values (f.type_a_id, 'RLS_TEST mod alias') returning id into v_id;
  update public.ingredient_aliases set alias = 'RLS_TEST mod alias renamed' where id = v_id;
  delete from public.ingredient_aliases where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete an ingredient alias');

  insert into public.ingredient_types (category_id, name, bar_priority, recommend_by_default)
  values (f.category_id, 'RLS_TEST mod type', 'essential', false)
  returning id into v_id;
  update public.ingredient_types set name = 'RLS_TEST mod type renamed' where id = v_id;
  delete from public.ingredient_types where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete an ingredient type');

  -- ingredient_form_conversions: the write policy was widened from admin-only
  -- to is_admin_or_moderator() (20260910160000) when "Can provide"
  -- management moved into the Ingredient Type editor, which moderators use.
  -- Read stays members-only; ordinary-member writes are still denied (that
  -- assertion lives in the dedicated ingredient_form_conversions block
  -- above). Pick a raw/prepared pair that isn't already wired up so the
  -- unique + inverse-trigger constraints don't get in the way.
  declare
    v_fc_raw uuid;
    v_fc_prep uuid;
  begin
    select id into v_fc_raw from public.ingredient_types
      where id not in (
        select raw_type_id from public.ingredient_form_conversions
        union select prepared_type_id from public.ingredient_form_conversions)
      order by name limit 1;
    select id into v_fc_prep from public.ingredient_types
      where id <> v_fc_raw
        and id not in (
          select raw_type_id from public.ingredient_form_conversions
          union select prepared_type_id from public.ingredient_form_conversions)
      order by name limit 1;
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
      values (v_fc_raw, v_fc_prep, 'RLS_TEST mod conversion')
      returning id into v_id;
    update public.ingredient_form_conversions
      set guidance = 'RLS_TEST mod conversion edited' where id = v_id;
    delete from public.ingredient_form_conversions where id = v_id;
    get diagnostics affected = row_count;
    perform pg_temp.assert(affected = 1, 'moderator: can insert/update/delete an ingredient form conversion (Can provide)');
  end;
end;
$$;

-- ingredient_requests: moderator can read every pending request (not just
-- their own) and resolve one, same as admin.
do $$
declare f record; v_id uuid; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  insert into public.ingredient_requests (requested_by, name)
  values (f.member_owner_id, 'RLS_TEST mod-resolved request')
  returning id into v_id;

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.ingredient_requests where id = v_id;
  perform pg_temp.assert(n = 1, 'moderator: can read another member''s pending request');

  update public.ingredient_requests set status = 'fulfilled' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 1, 'moderator: can resolve a request');
end;
$$;

-- Recipe moderation trio, as one continuous story reusing the still-live
-- shared_id fixture (source_type='user', visibility='shared',
-- moderation_status='active' - exactly the precondition
-- admin_promote_recipe_to_classic() requires, unmodified by anything since
-- the recipes section set it up).
do $$
declare f record; r record; v_recipe public.recipes;
begin
  select * into f from rls_fixture_ids;
  select * into r from rls_recipe_ids;
  perform pg_temp.set_identity('authenticated', f.member_other_id);

  select * into v_recipe from public.admin_promote_recipe_to_classic(r.shared_id);
  perform pg_temp.assert(v_recipe.source_type = 'classic' and v_recipe.owner_id is null, 'moderator: can promote a community recipe to classic');

  select * into v_recipe from public.admin_demote_recipe_to_community(r.shared_id);
  perform pg_temp.assert(v_recipe.source_type = 'user' and v_recipe.owner_id = f.member_owner_id, 'moderator: can demote a classic back to community');

  perform public.unpublish_recipe(r.shared_id);
  select * into v_recipe from public.recipes where id = r.shared_id;
  perform pg_temp.assert(v_recipe.visibility = 'private' and v_recipe.moderation_status = 'unpublished_by_admin', 'moderator: can unpublish a community recipe');
end;
$$;

-- Negative/boundary assertions - prove the scope fence, not just that the
-- granted actions work.
do $$
declare f record; n int; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.member_other_id);

  begin
    perform public.admin_set_user_role(f.member_owner_id, 'admin');
    perform pg_temp.assert(false, 'moderator: calling admin_set_user_role() should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'moderator: cannot call admin_set_user_role() - staff creation stays admin-only');
  end;

  begin
    perform public.admin_set_membership_revoked(f.member_owner_id, true);
    perform pg_temp.assert(false, 'moderator: calling admin_set_membership_revoked() should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'moderator: cannot call admin_set_membership_revoked() - block/unblock stays admin-only');
  end;

  begin
    insert into public.recipes (name, source_type, owner_id, visibility, moderation_status, glass_id)
    values ('RLS_TEST mod-authored classic', 'classic', null, 'shared', 'active', f.glass_id);
    perform pg_temp.assert(false, 'moderator: authoring a new classic recipe directly should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'moderator: cannot author a new classic recipe directly - no batch-import-recipes power');
  end;

  select count(*) into n from public.invitations;
  perform pg_temp.assert(n = 0, 'moderator: cannot read any invitation');

  begin
    insert into public.invitations (code, created_by, expires_at)
    values ('RLS_TEST_MOD_INVITE', f.member_other_id, now() + interval '1 day');
    perform pg_temp.assert(false, 'moderator: inserting an invitation should be denied');
  exception when insufficient_privilege then
    perform pg_temp.assert(true, 'moderator: cannot insert an invitation');
  end;
end;
$$;

do $$
declare f record; v_id uuid; affected int;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  insert into public.products (ingredient_type_id, name)
  values (f.type_a_id, 'RLS_TEST mod-target product')
  returning id into v_id;

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  update public.products set name = 'RLS_TEST mod-hijacked product' where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'moderator: cannot update a product - products stay admin-only, not "ingredients"');

  delete from public.products where id = v_id;
  get diagnostics affected = row_count;
  perform pg_temp.assert(affected = 0, 'moderator: cannot delete a product');

  perform pg_temp.set_identity('authenticated', f.admin_id);
  delete from public.products where id = v_id;
end;
$$;

-- ── admin_merge_ingredient_type() ────────────────────────────────────────
-- Deliberately admin-only, not is_admin_or_moderator() - a merge silently
-- rewrites/deletes rows across 6 tables (bulk, effectively irreversible),
-- unlike moderator's existing ordinary catalog-authoring scope. Placed
-- last, reusing member_other_id while it's still sitting at role =
-- 'moderator' from the section above (never demoted back in-transaction) to
-- get the negative moderator-rejection assertion for free, no extra
-- promotion needed.
--
-- Fixture types created fresh (not type_a_id/type_b_id - those are reused
-- throughout the rest of the file and merging away one of them here would
-- break every later block that still expects it to exist). Exercises real
-- reassignment across all 6 referencing tables, not just "the function ran
-- without error": a child type's parent_type_id, a direct
-- recipe_components reference, a recipe_component_alternatives collision
-- (redundant loser row dropped instead of reassigned), a product, and an
-- alias, plus p_add_alias preserving the loser's own name as a new alias of
-- the survivor. user_inventory gets both of its own two shapes:
-- member_owner_id owns only the loser (plain reassignment), member_other_id
-- owns both loser and survivor already (the redundant loser row is dropped,
-- not reassigned - would collide with unique(user_id, ingredient_type_id)).

create temporary table rls_merge_ids (loser_id uuid, survivor_id uuid, child_id uuid, anchor_comp_id uuid) on commit drop;
insert into rls_merge_ids (loser_id, survivor_id, child_id, anchor_comp_id) values (null, null, null, null);
grant all on rls_merge_ids to authenticated, anon;

do $$
declare f record; v_loser uuid; v_survivor uuid; v_child uuid;
begin
  select * into f from rls_fixture_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  insert into public.ingredient_types (category_id, name, bar_priority, recommend_by_default)
  values (f.category_id, 'RLS_TEST merge loser', 'essential', false) returning id into v_loser;
  insert into public.ingredient_types (category_id, name, bar_priority, recommend_by_default)
  values (f.category_id, 'RLS_TEST merge survivor', 'essential', false) returning id into v_survivor;
  insert into public.ingredient_types (category_id, parent_type_id, name, bar_priority, recommend_by_default)
  values (f.category_id, v_loser, 'RLS_TEST merge child', 'essential', false) returning id into v_child;
  update rls_merge_ids set loser_id = v_loser, survivor_id = v_survivor, child_id = v_child;
end;
$$;

do $$
declare f record; m record; v_id uuid;
begin
  select * into f from rls_fixture_ids;
  select * into m from rls_merge_ids;

  -- member_owner_id is a genuine ordinary member throughout this file -
  -- reused here for the negative non-staff case.
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  begin
    perform public.admin_merge_ingredient_type(m.loser_id, m.survivor_id, true);
    perform pg_temp.assert(false, 'admin_merge_ingredient_type: an ordinary member calling it should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_merge_ingredient_type: an ordinary member cannot merge ingredient types');
  end;

  -- member_other_id is still sitting at role = 'moderator' from the section
  -- above - the exact boundary this function is deliberately scoped
  -- against (a moderator gets full ordinary catalog-authoring power, but
  -- not this bulk/irreversible one).
  perform pg_temp.set_identity('authenticated', f.member_other_id);
  begin
    perform public.admin_merge_ingredient_type(m.loser_id, m.survivor_id, true);
    perform pg_temp.assert(false, 'admin_merge_ingredient_type: a moderator calling it should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_merge_ingredient_type: a moderator cannot merge ingredient types - stays admin-only');
  end;

  -- Set up one row per referencing table before the real merge below.
  -- recipe_components/recipe_component_alternatives gate through
  -- recipe_is_editable(), which for a private recipe only admits its real
  -- owner - not admin (20260815231800 scoped admin edit rights to the
  -- ownerless classic catalog only) - so these two need member_owner_id's
  -- identity, not admin's, even though the merge call itself will be admin.
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  -- Direct reference case: a component whose own ingredient IS the loser.
  insert into public.recipe_components (recipe_id, ingredient_type_id, amount, unit_label, role)
  values ((select private_id from rls_recipe_ids), m.loser_id, 30, 'ml', 'required');

  -- Collision case: a second, unrelated component (type_a_id, the recipe's
  -- own "main" ingredient) that already lists both the loser and the
  -- survivor as substitution alternatives - exactly the scenario the
  -- migration's own header comment describes, where reassigning the
  -- loser's alternative row would collide with the survivor's and the
  -- redundant loser row must be dropped instead.
  insert into public.recipe_components (recipe_id, ingredient_type_id, amount, unit_label, role)
  values ((select private_id from rls_recipe_ids), f.type_a_id, 30, 'ml', 'required')
  returning id into v_id;
  update rls_merge_ids set anchor_comp_id = v_id;

  insert into public.recipe_component_alternatives (recipe_id, recipe_component_id, ingredient_type_id)
  values ((select private_id from rls_recipe_ids), v_id, m.loser_id);
  insert into public.recipe_component_alternatives (recipe_id, recipe_component_id, ingredient_type_id)
  values ((select private_id from rls_recipe_ids), v_id, m.survivor_id);

  perform pg_temp.set_identity('authenticated', f.admin_id);
  insert into public.products (ingredient_type_id, name)
  values (m.loser_id, 'RLS_TEST merge product');

  insert into public.ingredient_aliases (ingredient_type_id, alias)
  values (m.loser_id, 'RLS_TEST merge alias');

  -- user_inventory has no admin-insert override ("insert own" only, same as
  -- its "strictly private, no admin-read override" shape tested earlier in
  -- this file) - each row has to be inserted as its own owner.
  perform pg_temp.set_identity('authenticated', f.member_owner_id);
  -- member_owner_id owns only the loser - plain reassignment.
  insert into public.user_inventory (user_id, ingredient_type_id)
  values (f.member_owner_id, m.loser_id);

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  -- member_other_id owns both - the redundant loser row must be dropped,
  -- not reassigned (unique(user_id, ingredient_type_id) would collide).
  insert into public.user_inventory (user_id, ingredient_type_id)
  values (f.member_other_id, m.loser_id);
  insert into public.user_inventory (user_id, ingredient_type_id)
  values (f.member_other_id, m.survivor_id);
end;
$$;

do $$
declare f record; m record; n int;
begin
  select * into f from rls_fixture_ids;
  select * into m from rls_merge_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  perform public.admin_merge_ingredient_type(m.loser_id, m.survivor_id, true);
  perform pg_temp.assert(true, 'admin_merge_ingredient_type: an admin can merge two ingredient types');

  -- ingredient_types/products/ingredient_aliases are all "member read"
  -- (is_member() or is_admin()) - safe to check under the admin identity
  -- still active from the call above.
  select count(*) into n from public.ingredient_types where id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: the loser type is deleted');

  select count(*) into n from public.ingredient_types where id = m.child_id and parent_type_id = m.survivor_id;
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: a child type is re-pointed at the survivor');

  select count(*) into n from public.products where ingredient_type_id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: no product still references the loser');
  select count(*) into n from public.products where ingredient_type_id = m.survivor_id and name = 'RLS_TEST merge product';
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: the product was reassigned to the survivor');

  select count(*) into n from public.ingredient_aliases where ingredient_type_id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: no alias still references the loser');
  select count(*) into n from public.ingredient_aliases where ingredient_type_id = m.survivor_id and alias = 'RLS_TEST merge alias';
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: the pre-existing alias was reassigned to the survivor');
  select count(*) into n from public.ingredient_aliases where ingredient_type_id = m.survivor_id and alias = 'RLS_TEST merge loser';
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: p_add_alias preserved the loser''s own name as a new alias of the survivor');

  -- recipe_components/recipe_component_alternatives gate through
  -- recipe_is_visible()/recipe_is_editable(), which for a private recipe
  -- only admit its real owner - no admin-read override (confirmed by
  -- 20260823110000_tighten_recipe_read_scope.sql), same reason the setup
  -- block above had to insert these as member_owner_id in the first place.
  -- Reading them as admin here would silently return 0 rows regardless of
  -- what actually happened - not a real pass.
  perform pg_temp.set_identity('authenticated', f.member_owner_id);

  select count(*) into n from public.recipe_components
  where recipe_id = (select private_id from rls_recipe_ids) and ingredient_type_id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: no recipe_components row still references the loser');
  select count(*) into n from public.recipe_components
  where recipe_id = (select private_id from rls_recipe_ids) and ingredient_type_id = m.survivor_id;
  perform pg_temp.assert(n >= 1, 'admin_merge_ingredient_type: the recipe_components row was reassigned to the survivor');

  select count(*) into n from public.recipe_component_alternatives where ingredient_type_id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: no recipe_component_alternatives row still references the loser');
  select count(*) into n from public.recipe_component_alternatives
  where recipe_component_id = m.anchor_comp_id and ingredient_type_id = m.survivor_id;
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: the colliding alternative was dropped, not duplicated - exactly one survivor row remains on the anchor component');

  -- user_inventory is strictly private, no admin-read override either -
  -- each member can only verify their own rows.
  select count(*) into n from public.user_inventory where user_id = f.member_owner_id and ingredient_type_id = m.loser_id;
  perform pg_temp.assert(n = 0, 'admin_merge_ingredient_type: member_owner''s inventory row no longer references the loser');
  select count(*) into n from public.user_inventory where user_id = f.member_owner_id and ingredient_type_id = m.survivor_id;
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: member_owner''s inventory row was reassigned to the survivor (plain reassignment case)');

  perform pg_temp.set_identity('authenticated', f.member_other_id);
  select count(*) into n from public.user_inventory where user_id = f.member_other_id and ingredient_type_id = m.survivor_id;
  perform pg_temp.assert(n = 1, 'admin_merge_ingredient_type: member_other''s pre-existing survivor row still exists exactly once - the redundant loser row was dropped, not duplicated (collision case)');
end;
$$;

do $$
declare f record; m record;
begin
  select * into f from rls_fixture_ids;
  select * into m from rls_merge_ids;
  perform pg_temp.set_identity('authenticated', f.admin_id);

  begin
    perform public.admin_merge_ingredient_type(m.survivor_id, m.survivor_id, true);
    perform pg_temp.assert(false, 'admin_merge_ingredient_type: merging a type into itself should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_merge_ingredient_type: cannot merge a type into itself');
  end;

  begin
    perform public.admin_merge_ingredient_type(m.survivor_id, m.child_id, true);
    perform pg_temp.assert(false, 'admin_merge_ingredient_type: merging a type into its own child should be denied');
  exception when raise_exception then
    perform pg_temp.assert(true, 'admin_merge_ingredient_type: cannot merge a type into one of its own descendants');
  end;

  -- No manual cleanup here, deliberately: by this point recipe_components/
  -- products rows reference the survivor (RESTRICT FKs), so deleting it
  -- directly would fail with a real foreign_key_violation instead of the
  -- controlled FAIL/PASS this suite is built around. The enclosing
  -- transaction's rollback at the very end is the actual cleanup mechanism
  -- for this whole file (see header comment) - nothing here needs its own.
end;
$$;

rollback;
