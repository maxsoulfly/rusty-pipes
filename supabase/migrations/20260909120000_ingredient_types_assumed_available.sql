-- Household Basics (Concept 1), Stage 1 - schema + admin toggle only.
--
-- A catalogue-wide "just assume every user has this" flag for staples like
-- Ice, Salt, plain Sugar, Water, Hot Water. Nothing reads this column yet:
-- Stage 1 ships it inert, the availability engine only starts consuming it
-- in Stage 2. Flipping the toggle has zero user-facing effect until then.
--
-- NO PROPAGATION through the parent/child hierarchy. When the engine does
-- read this (Stage 2), assumed-available ids are unioned into the owned set
-- *after* the existing ancestor walk, so a flagged type satisfies only its
-- own exact ingredient_type_id - never a parent, never a child. Water and
-- Hot Water must each be flagged explicitly if both should count.
--
-- No new RLS policy or grant: ingredient_types already has a blanket
-- table-level UPDATE grant gated by the "ingredient_types: admin update"
-- policy (admin + moderator since 20260825100100_moderator_catalog_policies),
-- and there are no column-scoped grants on this table, so the new column is
-- covered by the same write path every other field uses.

alter table public.ingredient_types
  add column assumed_available boolean not null default false;

comment on column public.ingredient_types.assumed_available is
  'Household basic: assume every member owns this regardless of My Bar. Satisfies only this exact type id - no parent/child propagation. Read by the availability engine from Stage 2 onward; inert until then.';
