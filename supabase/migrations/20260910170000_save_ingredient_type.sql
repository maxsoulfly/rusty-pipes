-- Atomic save for the Ingredient Type editor (src/components/IngredientTypeEditor.jsx).
--
-- Before this, the editor wrote in three independent client calls: an
-- ingredient_types UPDATE, per-alias insert/delete, and per-conversion
-- insert/update/delete. A failure partway (e.g. the inverse-pair trigger on
-- ingredient_form_conversions) left the type and aliases already committed
-- while the conversions didn't land. The editor is being moved to a
-- local-draft model - nothing writes until "Save changes" - and this
-- function is the single write it makes, so the whole draft lands or none
-- of it does (a plpgsql function body runs atomically in the caller's
-- transaction; any raise rolls back every statement in the call).
--
-- SECURITY INVOKER, exactly like set_onboarding_config: the existing
-- "ingredient_types: admin update", "ingredient_aliases: admin insert/
-- delete" and "ingredient_form_conversions: admin writes" RLS policies -
-- all is_admin_or_moderator() - still gate every statement. A member's call
-- updates zero ingredient_types rows (RLS `using` is false), so the guard
-- below raises insufficient_privilege and the whole call rolls back before
-- anything else runs. Permissions are unchanged; ordinary-member access is
-- not broadened.
--
-- Aliases and conversions are reconciled by "delete this type's set, insert
-- the desired set" rather than a diff - simpler, and correct because every
-- constraint (the global case-insensitive alias unique index, the
-- conversion CHECK/UNIQUE, forbid_inverse_form_conversion) still fires on
-- the re-insert. Both DELETEs carry a real WHERE (raw filter on the type
-- id), so pg-safeupdate on the authenticator role is satisfied without a
-- `where true` crutch.
--
-- p_fields:      jsonb object { name, category_id, parent_type_id,
--                bar_priority, assumed_available, color, description, shape }.
--                Empty-string / null parent_type_id, color, description all
--                store as SQL NULL.
-- p_aliases:     jsonb array of strings - the full desired alias set.
-- p_conversions: jsonb array of { prepared_type_id, guidance } - the full
--                desired "Can provide" set whose raw side is this type.
-- The client still runs validateIngredientImport() (duplicate name / parent
-- hierarchy) before calling; this function does the writes, not the
-- catalog-shape validation.

create function public.save_ingredient_type(
  p_type_id uuid,
  p_fields jsonb,
  p_aliases jsonb,
  p_conversions jsonb
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

  -- 1. the ingredient type itself. RLS: "ingredient_types: admin update"
  --    (is_admin_or_moderator). Zero rows -> not writable by this caller.
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

  -- 2. aliases: replace this type's whole set. RLS: "ingredient_aliases:
  --    admin insert/delete" (is_admin_or_moderator). A clash with another
  --    type's alias trips the global lower(alias) unique index -> rollback.
  delete from public.ingredient_aliases where ingredient_type_id = p_type_id;
  if p_aliases is not null then
    insert into public.ingredient_aliases (ingredient_type_id, alias)
    select p_type_id, btrim(a)
    from jsonb_array_elements_text(p_aliases) a
    where btrim(a) <> '';
  end if;

  -- 3. "Can provide" conversions whose raw side is this type: replace the
  --    whole set. RLS: "ingredient_form_conversions: admin writes"
  --    (is_admin_or_moderator). CHECK (raw <> prepared), UNIQUE (raw,
  --    prepared) and forbid_inverse_form_conversion() all still fire on
  --    insert -> a bad row rolls the entire save back.
  delete from public.ingredient_form_conversions where raw_type_id = p_type_id;
  if p_conversions is not null then
    insert into public.ingredient_form_conversions (raw_type_id, prepared_type_id, guidance)
    select
      p_type_id,
      (e ->> 'prepared_type_id')::uuid,
      btrim(e ->> 'guidance')
    from jsonb_array_elements(p_conversions) e;
  end if;
end;
$$;

revoke execute on function public.save_ingredient_type(uuid, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_ingredient_type(uuid, jsonb, jsonb, jsonb)
  to authenticated;
