-- Stage D.3 (Minimal Homemade Preparations - docs/plans/substitutes-and-
-- variations.md -> "Stage D"): a small, bounded mechanism for "this missing
-- ingredient can be made from other ingredients you have." Deliberately NOT
-- a reuse of `recipes` - a preparation is keyed by the ingredient TYPE it
-- produces, not a cocktail. Two tables:
--
--   ingredient_preparations       - one row per producible type (unique),
--                                    name + ordered instruction steps.
--   ingredient_preparation_inputs - one row per required input, its own
--                                    amount + unit, FK to the preparation.
--
-- Never read by src/domain/availability.js / computeAvail() - exactly like
-- ingredient_substitutions, this only ever feeds the separate `adapted`/
-- `display` result in src/domain/makeability.js (computeMakeability()).
-- Availability's own perfect/good/almost/unavail tiers are unaffected.

create table public.ingredient_preparations (
  id uuid primary key default gen_random_uuid(),
  produces_type_id uuid not null unique
    references public.ingredient_types(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  instructions text[] not null default '{}'
);

comment on table public.ingredient_preparations is
  'Admin/moderator-curated "how to make this ingredient at home" - keyed by the produced ingredient type (unique, at most one preparation per type - v1 boundary). Never read by computeAvail(); feeds computeMakeability()''s adapted/display result only (Stage D.3).';

create table public.ingredient_preparation_inputs (
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null
    references public.ingredient_preparations(id) on delete cascade,
  ingredient_type_id uuid not null
    references public.ingredient_types(id) on delete cascade,
  amount numeric not null default 0,
  unit_label text not null default 'ml',
  unique (preparation_id, ingredient_type_id)
);

comment on table public.ingredient_preparation_inputs is
  'One row per ingredient a preparation requires, with its own amount + unit. Depth-1 guarded (see the two triggers below): an input can never itself be another preparation''s produced type, in either direction.';

alter table public.ingredient_preparations enable row level security;
alter table public.ingredient_preparation_inputs enable row level security;

-- member read / admin+moderator write - same shape as
-- ingredient_form_conversions / ingredient_substitutions. Policies scoped
-- `to authenticated` from the start (a bare-PUBLIC "members read" policy
-- 401s an anon REST call on is_member()'s EXECUTE grant - fixed twice
-- already as a follow-up; not repeating that here).
create policy "ingredient_preparations: members read"
  on public.ingredient_preparations
  for select to authenticated using (public.is_member());

create policy "ingredient_preparations: staff write"
  on public.ingredient_preparations
  for all to authenticated
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

create policy "ingredient_preparation_inputs: members read"
  on public.ingredient_preparation_inputs
  for select to authenticated using (public.is_member());

create policy "ingredient_preparation_inputs: staff write"
  on public.ingredient_preparation_inputs
  for all to authenticated
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

-- ── Depth-1 guard, both directions ──────────────────────────────────────
-- A preparation's inputs must always be raw, literal, tier-1-3 ingredients
-- - never another preparation's output (no recursive preparation chains).
-- The household-basics plan doc's fuller depth-1 description (kept as the
-- historical record of the original, larger Concept 3 proposal) is
-- explicit that this must be "a whole-graph check on every write, not a
-- check of only the row currently being saved," in both directions - a
-- single trigger on ingredient_preparation_inputs alone only catches "this
-- input is already someone's produced type"; without the second trigger, a
-- preparation could later be created FOR a type that's already in active
-- use as some other preparation's raw input, silently turning that other
-- preparation's "raw" input into a derived one. Two flat queries (not a
-- recursive walk), same "deliberately kept small" approach the plan
-- specifies - depth stays capped at exactly one level either way.

create function public.enforce_preparation_input_depth()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Covers self-reference too: by the time an input row is inserted, its
  -- own preparation's row (with its own produces_type_id) already exists
  -- in the same transaction (FK requires the parent first) - so this one
  -- query catches "this input is this preparation's own produced type" and
  -- "this input is some OTHER preparation's produced type" alike.
  if exists (
    select 1 from public.ingredient_preparations
    where produces_type_id = new.ingredient_type_id
  ) then
    raise exception
      'ingredient_preparation_inputs: ingredient % is itself produced by a preparation - a preparation''s inputs must be raw ingredients, never another preparation''s output',
      new.ingredient_type_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_preparation_input_depth()
  from public, anon;
grant execute on function public.enforce_preparation_input_depth()
  to authenticated;

create trigger enforce_preparation_input_depth_trg
  before insert or update of ingredient_type_id
  on public.ingredient_preparation_inputs
  for each row execute function public.enforce_preparation_input_depth();

create function public.enforce_preparation_produces_depth()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.ingredient_preparation_inputs
    where ingredient_type_id = new.produces_type_id
  ) then
    raise exception
      'ingredient_preparations: ingredient % is already used as an input by another preparation - it cannot also become a produced (derived) ingredient',
      new.produces_type_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_preparation_produces_depth()
  from public, anon;
grant execute on function public.enforce_preparation_produces_depth()
  to authenticated;

create trigger enforce_preparation_produces_depth_trg
  before insert or update of produces_type_id
  on public.ingredient_preparations
  for each row execute function public.enforce_preparation_produces_depth();
