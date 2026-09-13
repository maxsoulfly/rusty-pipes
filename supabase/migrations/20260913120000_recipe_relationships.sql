-- Linked Variations Stage V.1 (docs/plans/linked-variations.md): one
-- recipe declaring "I am a variation of that recipe" - pure metadata and
-- navigation, never ingredient/instruction inheritance and never read by
-- computeAvail()/computeMakeability()/recommendations.js. A separate table,
-- not a column on `recipes` - recipes.update's grant is already
-- column-restricted (name/description/glass_id/family_id/liquid_color/
-- liquid_color_2/steps, see 20260815214307 + 20260825150000); a new column
-- there would mean re-issuing that grant, which this design avoids
-- entirely by keeping the relationship in its own table.
--
-- `recipe_id` is the variation, `related_recipe_id` is its base - matches
-- who is expected to set the link (the variation's own editor, see below).
-- `unique(recipe_id)`: one base per variation (a plain tree, not a general
-- graph) - "change the base" is delete + re-insert, matching how
-- recipe_component_alternatives is already edited (no UPDATE policy).
create table public.recipe_relationships (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  related_recipe_id uuid not null references public.recipes (id) on delete cascade,
  note text check (char_length(btrim(note)) between 1 and 280),
  created_at timestamptz not null default now(),
  constraint recipe_relationships_not_self check (recipe_id <> related_recipe_id),
  constraint recipe_relationships_one_base_per_variation unique (recipe_id)
);

comment on table public.recipe_relationships is 'Linked Variations (docs/plans/linked-variations.md) - directional "recipe_id is a variation of related_recipe_id". Pure navigation metadata: never read by the availability engine. recipe_id is unique (one base per variation); cycles are rejected at write time by the trigger below, not just left undisplayed.';

-- recipe_id already has an implicit unique index from the constraint above;
-- related_recipe_id needs its own for the reverse "variations of this
-- base" lookup (every base recipe's detail page runs this direction).
create index recipe_relationships_related_recipe_id_idx
  on public.recipe_relationships (related_recipe_id);

-- ── Cycle prevention ─────────────────────────────────────────────────────
-- Linked Variations are semantic parent/base relationships - a cycle
-- (A -> B -> A, or a longer A -> B -> C -> A) is invalid catalogue data,
-- not just something the member-facing one-hop UI happens not to display.
-- Because `unique(recipe_id)` already limits every node to at most one
-- outgoing edge (one base), the graph is always a forest of trees absent a
-- cycle - so checking a proposed new edge only ever means walking a single
-- linked list upward from the proposed base until either it runs out (no
-- cycle) or it reaches back to the row being inserted/updated (a cycle).
-- This is the simplest reliable check for this shape of data - a bounded
-- iterative walk, not a general graph library or a recursive CTE baked
-- into a constraint.
--
-- SECURITY DEFINER: the walk must see every existing relationship row
-- regardless of the calling member's own read visibility (the table's own
-- "read" policy below only shows rows where BOTH sides are visible to the
-- viewer - irrelevant to whether a cycle would exist structurally). Same
-- discipline as every other SECURITY DEFINER function in this codebase -
-- explicit revoke/grant even though a trigger function is never called
-- directly as an RPC (matches sync_recipe_favorite_count()'s own precedent,
-- 20260826110000).
create function public.forbid_recipe_relationship_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  walker uuid := new.related_recipe_id;
  steps int := 0;
begin
  loop
    if walker = new.recipe_id then
      raise exception 'recipe_relationships: assigning this base would create a cycle';
    end if;
    select related_recipe_id into walker
      from public.recipe_relationships
      where recipe_id = walker;
    exit when walker is null;
    steps := steps + 1;
    -- Defensive only: with unique(recipe_id) enforced and this same trigger
    -- guarding every prior insert, the existing data can never actually
    -- contain a cycle for this walk to loop forever on. A generous, fixed
    -- cap turns any unforeseen corruption into a clear error instead of a
    -- hang, without needing a visited-set (not a graph framework).
    if steps > 10000 then
      raise exception 'recipe_relationships: relationship chain too deep to verify (possible data corruption)';
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.forbid_recipe_relationship_cycle() from public, anon, authenticated;

create trigger recipe_relationships_forbid_cycle
  before insert or update on public.recipe_relationships
  for each row execute function public.forbid_recipe_relationship_cycle();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Reuses the existing recipe_is_visible()/recipe_is_editable() SECURITY
-- DEFINER helpers (20260815214307) as-is - no new function needed for
-- authorization, only for the cycle check above.
alter table public.recipe_relationships enable row level security;

-- Read: only if the viewer can see BOTH recipes involved - a link to/from
-- a recipe you can't otherwise see is invisible, not just its target.
create policy "recipe_relationships: read" on public.recipe_relationships
  for select to authenticated
  using (
    public.recipe_is_visible(recipe_id)
    and public.recipe_is_visible(related_recipe_id)
  );

-- Write: only from the variation's own side, by whoever can edit it -
-- matches the approved decision that a base recipe's owner does not
-- control other members' variations (misleading links stay a moderation
-- matter, not a schema-level gate).
create policy "recipe_relationships: insert" on public.recipe_relationships
  for insert to authenticated
  with check (public.recipe_is_editable(recipe_id));

create policy "recipe_relationships: delete" on public.recipe_relationships
  for delete to authenticated
  using (public.recipe_is_editable(recipe_id));

-- No update policy: changing the base or the note is delete + re-insert,
-- exactly matching recipe_component_alternatives' own precedent.
