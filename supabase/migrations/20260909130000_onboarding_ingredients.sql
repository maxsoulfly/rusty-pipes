-- Household Basics Stage 3a: admin-editable "Build your bar" onboarding
-- config. Replaces the hard-coded lists in src/data/buildYourBarEssentials.js
-- (BUILD_YOUR_BAR_INITIAL_SIX / BUILD_YOUR_BAR_GROUPS) with a real table so
-- future curation needs no code edit or redeploy.
--
-- Shape: one ordered list. The expanded "Show all essentials" view is every
-- row bucketed by group_label into the 3 fixed headings (Spirits / Mixers /
-- Kitchen basics), each bucket sorted by position. The initial home-screen
-- tiles are the is_initial rows in overall position order, backfilled from
-- the remaining rows up to six (the resolver, Stage 3b, does the backfill and
-- also excludes any ingredient_type flagged assumed_available). At most six
-- rows should carry is_initial - enforced by the service + admin UI (Stage
-- 3c); the resolver caps at six defensively.
--
-- Deliberately separate from ingredient_types.bar_priority, which drives ONLY
-- Buy Next's purchase-recommendation ranking. Nothing in this migration or
-- table is ever read by src/domain/recommendations.js.
--
-- Nothing reads this table yet (Stage 3a is DB-only). Stage 3b wires
-- BuildYourBar.jsx to it.

create table public.onboarding_ingredients (
  ingredient_type_id uuid primary key
    references public.ingredient_types(id) on delete cascade,
  position integer not null,
  is_initial boolean not null default false,
  group_label text not null
    check (group_label in ('Spirits', 'Mixers', 'Kitchen basics'))
);

comment on table public.onboarding_ingredients is
  'Admin-curated "Build your bar" onboarding lists (src/components/home/BuildYourBar.jsx). Expanded view = rows grouped by group_label (3 fixed headings) then ordered by position; initial tiles = is_initial rows in overall position order, backfilled from the rest up to six. Rows whose ingredient_type is assumed_available are excluded from both rendered lists by the resolver. References ingredient_types by id (rename-safe) with on delete cascade. Separate from ingredient_types.bar_priority / Buy Next ranking.';

-- Every member reads it (BuildYourBar renders for everyone); only admins
-- change it. Same shape as glasses / taste_tags / liquid_colors.
alter table public.onboarding_ingredients enable row level security;

create policy "onboarding_ingredients: members read"
  on public.onboarding_ingredients
  for select using (public.is_member());

create policy "onboarding_ingredients: admin writes"
  on public.onboarding_ingredients
  for all using (public.is_admin()) with check (public.is_admin());

-- Atomic whole-list reorder: reassigns every row's position from the given
-- ordered id array in a single UPDATE, so an admin up/down move can never
-- persist half a position swap. SECURITY INVOKER (the default) - the
-- "admin writes" policy above still gates it; a non-admin's call matches
-- zero rows and changes nothing. create function grants EXECUTE to PUBLIC by
-- default (plain Postgres), so revoke that and grant only authenticated.
create function public.set_onboarding_order(p_type_ids uuid[])
returns void
language sql
as $$
  update public.onboarding_ingredients o
     set position = v.ord
    from (
      select id, ordinality::int as ord
      from unnest(p_type_ids) with ordinality as t(id, ordinality)
    ) v
   where o.ingredient_type_id = v.id;
$$;

revoke execute on function public.set_onboarding_order(uuid[]) from public, anon;
grant execute on function public.set_onboarding_order(uuid[]) to authenticated;

-- Seed: the current 14 curated essentials, with Coke in place of Ice (a
-- household basic, so it would never render anyway). Names are resolved
-- case-insensitively against the live catalog; the block ABORTS if any name
-- fails to resolve to exactly one row (missing or ambiguous) rather than
-- writing a partial list - the initial-six names especially must be present.
do $$
declare
  expected constant int := 14;
  resolved int;
begin
  create temp table _ob_seed (name text, grp text, pos int, is_initial bool)
    on commit drop;
  insert into _ob_seed (name, grp, pos, is_initial) values
    ('Gin',               'Spirits',        1,  true),
    ('Vodka',             'Spirits',        2,  true),
    ('Bourbon',           'Spirits',        3,  false),
    ('Dark Rum',          'Spirits',        4,  false),
    ('Irish Whiskey',     'Spirits',        5,  false),
    ('Rye Whiskey',       'Spirits',        6,  false),
    ('Scotch Whiskey',    'Spirits',        7,  false),
    ('Soda Water',        'Mixers',         8,  true),
    ('Coke',              'Mixers',         9,  true),
    ('Tonic Water',       'Mixers',        10,  false),
    ('Lemon Juice',       'Kitchen basics', 11, true),
    ('Lime Juice',        'Kitchen basics', 12, true),
    ('Simple Syrup',      'Kitchen basics', 13, false),
    ('Angostura Bitters', 'Kitchen basics', 14, false);

  select count(*) into resolved
  from _ob_seed s
  join public.ingredient_types t on lower(t.name) = lower(s.name);

  if resolved <> expected then
    raise exception
      'onboarding seed aborted: % of % names resolved uniquely against ingredient_types (a name is missing or ambiguous)',
      resolved, expected;
  end if;

  insert into public.onboarding_ingredients
    (ingredient_type_id, position, is_initial, group_label)
  select t.id, s.pos, s.is_initial, s.grp
  from _ob_seed s
  join public.ingredient_types t on lower(t.name) = lower(s.name);
end $$;
