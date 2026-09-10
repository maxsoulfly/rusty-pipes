-- Concept 2, Ingredient Forms: owning a raw ingredient satisfies a recipe
-- that asks for its prepared form - own Lemon and a "Lemon Juice"
-- requirement is met, shown inline with preparation guidance ("Squeeze
-- fresh juice from Lemon"). Strictly ONE-DIRECTIONAL: owning the prepared
-- form never satisfies a raw requirement (a recipe that needs a whole lemon
-- wedge for garnish still reads as genuinely missing). Directionality is
-- enforced three ways: the column names, the availability engine only ever
-- looking this up by a component's own (prepared) id, and the inverse-pair
-- trigger below.
--
-- Admin-managed data, not code: future conversion pairs need no migration.
-- "member read, admin write" like onboarding_ingredients and the lookup
-- tables. Never read by src/domain/recommendations.js (Buy Next) directly -
-- Buy Next only ever sees the knock-on effect through computeAvail()'s
-- `avail` / `missingRequiredIds`, exactly like household basics.

create table public.ingredient_form_conversions (
  id uuid primary key default gen_random_uuid(),
  raw_type_id uuid not null
    references public.ingredient_types(id) on delete cascade,
  prepared_type_id uuid not null
    references public.ingredient_types(id) on delete cascade,
  guidance text not null
    check (char_length(btrim(guidance)) between 1 and 200),
  constraint ingredient_form_conversions_distinct_types
    check (raw_type_id <> prepared_type_id),
  constraint ingredient_form_conversions_unique_pair
    unique (raw_type_id, prepared_type_id)
);

comment on table public.ingredient_form_conversions is
  'Admin-managed raw -> prepared ingredient form conversions (Concept 2, Ingredient Forms). Owning raw_type_id satisfies a recipe component that requires prepared_type_id, shown with `guidance` text inline. One-directional by construction - never consulted in reverse (see forbid_inverse_form_conversion). member read / admin write. Separate from ingredient_types.bar_priority / Buy Next ranking.';

alter table public.ingredient_form_conversions enable row level security;

create policy "ingredient_form_conversions: members read"
  on public.ingredient_form_conversions
  for select using (public.is_member());

create policy "ingredient_form_conversions: admin writes"
  on public.ingredient_form_conversions
  for all using (public.is_admin()) with check (public.is_admin());

-- Belt-and-braces on the one-direction rule: refuse a row whose
-- (raw, prepared) pair is the inverse of one that already exists, so an
-- admin cannot accidentally register both Lemon -> Lemon Juice and
-- Lemon Juice -> Lemon and thereby let owning the juice satisfy a
-- whole-fruit requirement. SECURITY INVOKER (default) - it only reads the
-- same table the caller can already read; the admin-write policy still
-- governs the write itself. `set search_path = ''` + fully-qualified names
-- keeps `supabase db advisors --type security` clean.
create function public.forbid_inverse_form_conversion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.ingredient_form_conversions c
    where c.raw_type_id = new.prepared_type_id
      and c.prepared_type_id = new.raw_type_id
  ) then
    raise exception
      'ingredient_form_conversions is one-directional: the inverse pair for (% -> %) already exists',
      new.raw_type_id, new.prepared_type_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.forbid_inverse_form_conversion() from public, anon;
grant execute on function public.forbid_inverse_form_conversion() to authenticated;

create trigger ingredient_form_conversions_no_inverse
  before insert or update on public.ingredient_form_conversions
  for each row execute function public.forbid_inverse_form_conversion();

-- Seed the two v1 pairs (dev-spec Concept 2 scope is Lemon and Lime only).
-- `into strict` aborts the migration if any name resolves to zero or more
-- than one ingredient_types row, rather than seeding a partial/ambiguous
-- set.
do $$
declare
  v_lemon uuid;
  v_lemon_juice uuid;
  v_lime uuid;
  v_lime_juice uuid;
begin
  select id into strict v_lemon
    from public.ingredient_types where lower(name) = 'lemon';
  select id into strict v_lemon_juice
    from public.ingredient_types where lower(name) = 'lemon juice';
  select id into strict v_lime
    from public.ingredient_types where lower(name) = 'lime';
  select id into strict v_lime_juice
    from public.ingredient_types where lower(name) = 'lime juice';

  insert into public.ingredient_form_conversions
    (raw_type_id, prepared_type_id, guidance)
  values
    (v_lemon, v_lemon_juice, 'Squeeze fresh juice from Lemon'),
    (v_lime, v_lime_juice, 'Squeeze fresh juice from Lime');
end $$;
