-- Speed Rack (My Bar redesign Stage 3): a member can pin a few of their
-- owned bottles for quick access in a small strip at the top of My
-- ingredients. A pin is just a flag on the existing user_inventory row, so
-- it applies to whichever row kind that is - a generic ingredient_type_id
-- row or a specific product_id row - and never blurs the
-- generic-vs-product ownership boundary. Un-owning an item deletes its row
-- and the pin goes with it. No ordering column: the strip renders
-- name-sorted and there is no reorder UI in this stage.

alter table public.user_inventory
  add column pinned boolean not null default false;

-- user_inventory has only read/insert/delete policies today - ownership is
-- add-or-remove, a row is never updated in place. Add a narrow "update
-- own" policy so a member can flip their own pins.
create policy "user_inventory: update own" on public.user_inventory
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Scope the UPDATE grant to the `pinned` column only - the same
-- column-grant pattern recipes uses (20260815214307 / 20260825150000).
-- Supabase's default grants hand authenticated a blanket table UPDATE;
-- without this revoke, the new policy above would also let a member
-- rewrite user_id / ingredient_type_id / product_id on their own rows.
revoke update on public.user_inventory from anon, authenticated;
grant update (pinned) on public.user_inventory to authenticated;
