-- Stage D.3: the Ingredient Type editor's atomic save now also reconciles
-- this type's Homemade Preparation - the PRODUCED side (unlike "Can
-- provide"/"Can be replaced by", which key off this type as the RAW/FROM
-- side). Adding a parameter is a new signature, so drop the 5-arg version
-- and recreate with p_preparation (defaulted so any 5-arg caller still
-- resolves). Everything else is unchanged from 20260910190000: SECURITY
-- INVOKER, one transaction, RLS on each table is the real gate, every
-- DELETE keeps a real WHERE (pg-safeupdate safe).
--
-- p_preparation: null (no preparation for this type) or
--   { name: text, instructions: text[], inputs: [{ ingredient_type_id, amount, unit_label }] }.
-- Reconciled the same delete-then-insert-if-present way as aliases/
-- conversions/substitutions: delete this type's existing preparation (its
-- inputs cascade away with it), then insert the new one if the draft has
-- one. The depth-1 guard triggers (enforce_preparation_input_depth /
-- enforce_preparation_produces_depth, 20260911120000) still fire on these
-- inserts exactly as they would on a direct client insert - a violation
-- rolls the WHOLE save back, same as a bad substitution self-pair already
-- does for p_substitutions.

drop function public.save_ingredient_type(uuid, jsonb, jsonb, jsonb, jsonb);

create function public.save_ingredient_type(
  p_type_id uuid,
  p_fields jsonb,
  p_aliases jsonb,
  p_conversions jsonb,
  p_substitutions jsonb default '[]'::jsonb,
  p_preparation jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_touched int;
  v_preparation_id uuid;
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
  if p_preparation is not null then
    if jsonb_typeof(p_preparation) <> 'object' then
      raise exception 'save_ingredient_type: p_preparation must be a jsonb object or null';
    end if;
    if jsonb_typeof(coalesce(p_preparation -> 'instructions', '[]'::jsonb)) <> 'array' then
      raise exception 'save_ingredient_type: p_preparation.instructions must be a jsonb array';
    end if;
    if jsonb_typeof(coalesce(p_preparation -> 'inputs', '[]'::jsonb)) <> 'array' then
      raise exception 'save_ingredient_type: p_preparation.inputs must be a jsonb array';
    end if;
    -- A preparation with zero inputs would be vacuously "always
    -- satisfiable" - meaningless as a homemade preparation and almost
    -- certainly a mistake in the editor draft, so this is rejected here
    -- rather than left to silently produce a false "preparable" result.
    if coalesce(jsonb_array_length(p_preparation -> 'inputs'), 0) = 0 then
      raise exception 'save_ingredient_type: a preparation must have at least one input';
    end if;
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

  -- Homemade preparation (produced side = this type): replace the whole
  -- thing. Deleting the preparation row cascades its inputs away
  -- (ingredient_preparation_inputs.preparation_id on delete cascade).
  delete from public.ingredient_preparations where produces_type_id = p_type_id;
  if p_preparation is not null then
    insert into public.ingredient_preparations (produces_type_id, name, instructions)
    values (
      p_type_id,
      btrim(p_preparation ->> 'name'),
      coalesce(
        (
          select array_agg(btrim(s))
          from jsonb_array_elements_text(coalesce(p_preparation -> 'instructions', '[]'::jsonb)) s
          where btrim(s) <> ''
        ),
        '{}'
      )
    )
    returning id into v_preparation_id;

    insert into public.ingredient_preparation_inputs (
      preparation_id, ingredient_type_id, amount, unit_label
    )
    select
      v_preparation_id,
      (e ->> 'ingredient_type_id')::uuid,
      coalesce((e ->> 'amount')::numeric, 0),
      coalesce(nullif(e ->> 'unit_label', ''), 'ml')
    from jsonb_array_elements(p_preparation -> 'inputs') e;
  end if;
end;
$$;

revoke execute on function
  public.save_ingredient_type(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function
  public.save_ingredient_type(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
