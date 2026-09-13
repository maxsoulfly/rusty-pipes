-- Linked Variations V.2 atomicity fix. The prior fix
-- (set_recipe_variation_of(), 20260913130000) made the relationship's own
-- delete-then-insert atomic, and calling it FIRST in updateRecipe()
-- correctly stopped a cyclic rejection from letting the recipe's OTHER
-- fields/components/tags still save. It did NOT make the whole editor Save
-- atomic: if the relationship write succeeded and a LATER step (the
-- recipes UPDATE, or a component/tag write) then failed, the relationship
-- had already committed - exactly the "half-updated relative to the rest
-- of the recipe" state this whole feature is supposed to prevent. There is
-- no way to fix that from the client: separate Supabase calls are separate
-- statements/transactions, and "delete the relationship again on a later
-- failure" would be exactly the compensating-write-in-the-client pattern
-- this fix is required not to use.
--
-- The real fix: one new atomic RPC, save_recipe(), owning the recipe's own
-- fields, its full component (+ alternative) set, its full taste-tag set,
-- AND its one relationship row, all in a single plpgsql function body -
-- one transaction. A failure anywhere (a bad ingredient reference, the
-- recipes UPDATE matching zero rows because the caller doesn't own it, or
-- the relationship's own cycle-prevention trigger) rolls back everything
-- this function already did in the same call. This directly mirrors
-- save_ingredient_type()'s own already-established pattern (SECURITY
-- INVOKER - RLS on every touched table is the real gate, unchanged;
-- search_path='' with every reference fully qualified; JSONB in, replace-
-- the-whole-child-set-by-delete-then-insert for each child table).
--
-- Handles BOTH create (p_recipe_id null - inserts a new private recipe
-- owned by the caller, matching createRecipe()'s existing always-private
-- behavior exactly) and update (p_recipe_id set), so the SAME transactional
-- guarantee applies to creation too, per the explicit instruction to apply
-- the same principle there "where practical" - this is a small, uniform
-- extension of the same function, not a separate redesign of the create
-- path. createClassicRecipes() (batch import, admin-only, no relationship
-- support at all per the plan's own Import decision) is deliberately left
-- exactly as it is - a different, already-per-row-isolated flow, out of
-- scope for this fix.
--
-- set_recipe_variation_of() (20260913130000) is dropped - its one job is
-- now entirely subsumed by this function, and nothing calls it anymore.
-- Keeping an unused, now-redundant "narrower" RPC around alongside this
-- one would just be a second way to do the same thing.

drop function public.set_recipe_variation_of(uuid, uuid, text);

create function public.save_recipe(
  p_recipe_id uuid,
  p_fields jsonb,
  p_components jsonb,
  p_taste_tag_ids jsonb,
  p_variation_of jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid;
  v_touched int;
  v_component record;
  v_component_id uuid;
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'save_recipe: p_fields must be a jsonb object';
  end if;
  if p_components is null or jsonb_typeof(p_components) <> 'array' then
    raise exception 'save_recipe: p_components must be a jsonb array';
  end if;
  if p_taste_tag_ids is not null and jsonb_typeof(p_taste_tag_ids) <> 'array' then
    raise exception 'save_recipe: p_taste_tag_ids must be a jsonb array';
  end if;
  if p_variation_of is not null and jsonb_typeof(p_variation_of) <> 'object' then
    raise exception 'save_recipe: p_variation_of must be a jsonb object or null';
  end if;

  if p_recipe_id is null then
    -- Create: always an ordinary private user recipe, matching
    -- createRecipe()'s own existing, unchanged behavior - publishing is
    -- still a separate later action (publish_recipe()). owner_id =
    -- auth.uid() (the caller, via SECURITY INVOKER) is exactly what the
    -- "recipes: insert" RLS policy already requires for a member's own
    -- insert, so this grants nothing beyond what that policy already
    -- allows.
    insert into public.recipes (
      name, description, source_type, owner_id, visibility, glass_id, family_id,
      liquid_color, liquid_color_2, steps
    ) values (
      p_fields ->> 'name',
      nullif(p_fields ->> 'description', ''),
      'user',
      auth.uid(),
      'private',
      (p_fields ->> 'glass_id')::uuid,
      nullif(p_fields ->> 'family_id', '')::uuid,
      nullif(p_fields ->> 'liquid_color', ''),
      nullif(p_fields ->> 'liquid_color_2', ''),
      coalesce(
        (select array_agg(s) from jsonb_array_elements_text(coalesce(p_fields -> 'steps', '[]'::jsonb)) s),
        '{}'
      )
    )
    returning id into v_recipe_id;
  else
    -- Update: only the column set recipes' own column-restricted grant
    -- already allows a member to write (name/description/glass_id/
    -- family_id/liquid_color/liquid_color_2/steps - 20260815214307 +
    -- 20260825150000) - this function grants nothing beyond that.
    update public.recipes set
      name = p_fields ->> 'name',
      description = nullif(p_fields ->> 'description', ''),
      glass_id = (p_fields ->> 'glass_id')::uuid,
      family_id = nullif(p_fields ->> 'family_id', '')::uuid,
      liquid_color = nullif(p_fields ->> 'liquid_color', ''),
      liquid_color_2 = nullif(p_fields ->> 'liquid_color_2', ''),
      steps = coalesce(
        (select array_agg(s) from jsonb_array_elements_text(coalesce(p_fields -> 'steps', '[]'::jsonb)) s),
        '{}'
      )
    where id = p_recipe_id;

    get diagnostics v_touched = row_count;
    if v_touched = 0 then
      raise exception 'save_recipe: recipe % not found or not writable', p_recipe_id
        using errcode = 'insufficient_privilege';
    end if;
    v_recipe_id := p_recipe_id;
  end if;

  -- Components (+ their alternatives): replace the whole set.
  -- recipe_component_alternatives.recipe_component_id is on delete
  -- cascade, so deleting the old components already cleans up their
  -- alternatives - no separate delete needed (matches updateRecipe()'s
  -- own prior comment on this exact point).
  delete from public.recipe_components where recipe_id = v_recipe_id;

  for v_component in
    select
      idx - 1 as sort_order,
      (elem ->> 'ingredient_type_id')::uuid as ingredient_type_id,
      coalesce((elem ->> 'amount')::numeric, 0) as amount,
      coalesce(nullif(elem ->> 'unit_label', ''), 'ml') as unit_label,
      elem ->> 'role' as role,
      coalesce(
        (select array_agg((e)::uuid) from jsonb_array_elements_text(coalesce(elem -> 'excluded_substitute_type_ids', '[]'::jsonb)) e),
        '{}'
      ) as excluded_substitute_type_ids,
      elem -> 'alternatives' as alternatives
    from jsonb_array_elements(p_components) with ordinality as t(elem, idx)
  loop
    insert into public.recipe_components (
      recipe_id, ingredient_type_id, amount, unit_label, role, sort_order,
      excluded_substitute_type_ids
    ) values (
      v_recipe_id, v_component.ingredient_type_id, v_component.amount,
      v_component.unit_label, v_component.role, v_component.sort_order,
      v_component.excluded_substitute_type_ids
    )
    returning id into v_component_id;

    if v_component.alternatives is not null and jsonb_array_length(v_component.alternatives) > 0 then
      insert into public.recipe_component_alternatives (
        recipe_id, recipe_component_id, ingredient_type_id, note
      )
      select
        v_recipe_id,
        v_component_id,
        (alt ->> 'ingredient_type_id')::uuid,
        nullif(alt ->> 'note', '')
      from jsonb_array_elements(v_component.alternatives) alt;
    end if;
  end loop;

  -- Taste tags: replace the whole set.
  delete from public.recipe_taste_tags where recipe_id = v_recipe_id;
  if p_taste_tag_ids is not null then
    insert into public.recipe_taste_tags (recipe_id, taste_tag_id)
    select v_recipe_id, (e)::uuid
    from jsonb_array_elements_text(p_taste_tag_ids) e;
  end if;

  -- Linked Variations (Stage V.2) - the one relationship row. The V.1
  -- cycle-prevention trigger on recipe_relationships still fires on this
  -- INSERT exactly as it would on a direct client call - a rejected
  -- cyclic base now rolls back this WHOLE function (the recipe's own
  -- fields/components/tags above included), not just this one row's own
  -- delete+insert.
  delete from public.recipe_relationships where recipe_id = v_recipe_id;
  if p_variation_of is not null and (p_variation_of ->> 'base_recipe_id') is not null then
    insert into public.recipe_relationships (recipe_id, related_recipe_id, note)
    values (
      v_recipe_id,
      (p_variation_of ->> 'base_recipe_id')::uuid,
      nullif(btrim(p_variation_of ->> 'note'), '')
    );
  end if;

  return v_recipe_id;
end;
$$;

comment on function public.save_recipe(uuid, jsonb, jsonb, jsonb, jsonb) is 'Atomic recipe save (Linked Variations V.2 atomicity fix) - the recipe''s own fields, its full component/alternative set, its full taste-tag set, and its one recipe_relationships row all in one transaction. p_recipe_id null creates a new private recipe (owner_id = auth.uid()); otherwise updates the existing one. SECURITY INVOKER - RLS on every touched table remains the real authorization boundary, unchanged.';

revoke execute on function public.save_recipe(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_recipe(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
