-- Linked Variations Stage V.2 (docs/plans/linked-variations.md): a single
-- atomic RPC for "set (or remove) this recipe's one relationship row",
-- so the recipe editor never has to do a bare DELETE followed by a
-- separate INSERT as two independent client round-trips - the exact gap
-- V.1's own design already called out ("no UPDATE policy - changing the
-- base is delete + insert"). Without this function, a client-side
-- delete-then-insert could succeed at deleting the old row and then fail
-- to insert the new one (e.g. the new base would create a cycle,
-- rejected by V.1's trigger) - leaving the recipe with NO base at all,
-- neither the old one nor the intended new one. Wrapping both statements
-- in one plpgsql function body makes them one implicit transaction: an
-- uncaught exception from the INSERT (or its cycle-check trigger) rolls
-- back the DELETE that already ran earlier in the same function call,
-- exactly as if neither had been attempted.
--
-- SECURITY INVOKER, not DEFINER: the existing "recipe_relationships:
-- insert"/"delete" RLS policies (recipe_is_editable(p_recipe_id)) already
-- correctly gate exactly this operation - running as the calling user's
-- own role means those policies apply completely unchanged, with zero
-- authorization logic duplicated inside this function. This is the
-- smaller, safer choice here specifically because RLS is already correct
-- and sufficient; DEFINER would need this function to re-implement that
-- same check itself for no benefit.
create function public.set_recipe_variation_of(
  p_recipe_id uuid,
  p_base_recipe_id uuid,
  p_note text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.recipe_relationships where recipe_id = p_recipe_id;
  if p_base_recipe_id is not null then
    insert into public.recipe_relationships (recipe_id, related_recipe_id, note)
    values (p_recipe_id, p_base_recipe_id, nullif(btrim(p_note), ''));
  end if;
end;
$$;

comment on function public.set_recipe_variation_of(uuid, uuid, text) is 'Linked Variations Stage V.2 - atomically replaces recipe_id''s one relationship row (delete any existing, then insert the new one if p_base_recipe_id is not null). SECURITY INVOKER - the existing recipe_relationships RLS policies (recipe_is_editable) are the real gate, unchanged. A cycle rejected by the recipe_relationships_forbid_cycle trigger rolls back the DELETE in the same call, so a rejected reassignment never leaves the recipe with no base at all.';

-- Same discipline as every other function in this codebase regardless of
-- security mode: Postgres grants EXECUTE to PUBLIC by default on
-- creation, so this narrows it explicitly even though SECURITY INVOKER
-- means RLS - not this grant - is the actual authorization boundary.
revoke execute on function public.set_recipe_variation_of(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_recipe_variation_of(uuid, uuid, text) to authenticated;
