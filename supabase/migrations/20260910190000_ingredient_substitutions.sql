-- Stage B (Suggested Substitutes): a catalogue-wide, directional,
-- SUGGESTION-ONLY layer. "When a recipe needs X, Y is a reasonable stand-in
-- - <flavor change>." Curated by admins and moderators in the Ingredient
-- Type editor, alongside "Can provide".
--
-- Deliberately NOT symmetric and NOT inverse-guarded (unlike
-- ingredient_form_conversions): "White Rum -> Spiced Rum: sweeter, warm
-- spice" and "Spiced Rum -> White Rum: cleaner, drier" are both legitimate
-- and say different things. There is no automatic reverse rule and no
-- chaining - each row stands alone.
--
-- NEVER read by src/domain/availability.js. It changes nothing about a
-- recipe's Perfect/Almost/Unavailable state, its makeable count, or Buy
-- Next. It is surfaced only as a muted hint on a recipe's MISSING
-- ingredient rows (owned stand-ins listed first). A recipe editor who wants
-- one to actually count adopts it explicitly onto that recipe's component
-- as a recipe_component_alternatives row (carrying the note) - that is the
-- only path by which a substitution affects availability.

create table public.ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  from_type_id uuid not null
    references public.ingredient_types(id) on delete cascade,
  to_type_id uuid not null
    references public.ingredient_types(id) on delete cascade,
  flavor_note text not null
    check (char_length(btrim(flavor_note)) between 1 and 200),
  constraint ingredient_substitutions_distinct_types
    check (from_type_id <> to_type_id),
  constraint ingredient_substitutions_unique_pair
    unique (from_type_id, to_type_id)
);

comment on table public.ingredient_substitutions is
  'Admin/moderator-curated directional "when a recipe needs from_type_id, to_type_id can stand in - <flavor_note>". SUGGESTION ONLY: never read by the availability engine. Directional, not symmetric, no inverse guard, no chaining. Adopting one onto a specific recipe = a recipe_component_alternatives row. Stage B / docs/plans/substitutes-and-variations.md.';

alter table public.ingredient_substitutions enable row level security;

-- member read / admin+moderator write - same shape as
-- ingredient_form_conversions after 20260910160000. Policies scoped
-- `to authenticated` from the start (a bare-PUBLIC "members read" policy
-- 401s an anon REST call on is_member's EXECUTE - fixed twice already as a
-- follow-up; not repeating that here).
create policy "ingredient_substitutions: members read"
  on public.ingredient_substitutions
  for select to authenticated using (public.is_member());

create policy "ingredient_substitutions: staff write"
  on public.ingredient_substitutions
  for all to authenticated
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

-- ── save_ingredient_type() v2 ──────────────────────────────────────────
-- The Ingredient Type editor's atomic save now also reconciles this type's
-- "Suggested substitutes" set (rows where from_type_id = the type). Adding
-- a parameter is a new signature, so drop the 4-arg version and recreate
-- with p_substitutions (defaulted so any 4-arg caller still resolves).
-- Everything else is unchanged from 20260910170000: SECURITY INVOKER, one
-- transaction, RLS on each table is the real gate, every DELETE keeps a
-- real WHERE (pg-safeupdate safe).

drop function public.save_ingredient_type(uuid, jsonb, jsonb, jsonb);

create function public.save_ingredient_type(
  p_type_id uuid,
  p_fields jsonb,
  p_aliases jsonb,
  p_conversions jsonb,
  p_substitutions jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_touched int;
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'save_ingredient_type: p_fields must be a jsonb object';
  end if;
  if p_aliases is not null and jsonb_typeof(p_aliases) <> 'array' then
    raise exception 'save_ingredient_type: p_aliases must be a jsonb array';
  end if;
  if p_conversions is not null and jsonb_typeof(p_conversions) <> 'array' then
    raise exception 'save_ingredient_type: p_conversions must be a jsonb array';
  end if;
  if p_substitutions is not null and jsonb_typeof(p_substitutions) <> 'array' then
    raise exception 'save_ingredient_type: p_substitutions must be a jsonb array';
  end if;

  update public.ingredient_types set
    name              = p_fields ->> 'name',
    category_id       = (p_fields ->> 'category_id')::uuid,
    parent_type_id    = nullif(p_fields ->> 'parent_type_id', '')::uuid,
    bar_priority      = p_fields ->> 'bar_priority',
    assumed_available = coalesce((p_fields ->> 'assumed_available')::boolean, false),
    color             = nullif(p_fields ->> 'color', ''),
    description        = nullif(p_fields ->> 'description', ''),
    shape             = p_fields ->> 'shape'
  where id = p_type_id;

  get diagnostics v_touched = row_count;
  if v_touched = 0 then
    raise exception 'save_ingredient_type: ingredient type % not found or not writable', p_type_id
      using errcode = 'insufficient_privilege';
  end if;

  -- aliases: replace this type's whole set
  delete from public.ingredient_aliases where ingredient_type_id = p_type_id;
  if p_aliases is not null then
    insert into public.ingredient_aliases (ingredient_type_id, alias)
    select p_type_id, btrim(a)
    from jsonb_array_elements_text(p_aliases) a
    where btrim(a) <> '';
  end if;

  -- "Can provide" conversions (raw side = this type): replace the whole set
  delete from public.ingredient_form_conversions where raw_type_id = p_type_id;
  if p_conversions is not null then
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    select
      p_type_id,
      (e ->> 'prepared_type_id')::uuid,
      btrim(e ->> 'guidance')
    from jsonb_array_elements(p_conversions) e;
  end if;

  -- "Suggested substitutes" (from side = this type): replace the whole set.
  -- ingredient_substitutions is suggestion-only - nothing here touches the
  -- availability engine.
  delete from public.ingredient_substitutions where from_type_id = p_type_id;
  if p_substitutions is not null then
    insert into public.ingredient_substitutions (from_type_id, to_type_id, flavor_note)
    select
      p_type_id,
      (e ->> 'to_type_id')::uuid,
      btrim(e ->> 'flavor_note')
    from jsonb_array_elements(p_substitutions) e;
  end if;
end;
$$;

revoke execute on function
  public.save_ingredient_type(uuid, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function
  public.save_ingredient_type(uuid, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
