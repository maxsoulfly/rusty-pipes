-- Stage D.4 (docs/plans/substitutes-and-variations.md -> "Stage D"):
-- per-component, per-substitute exclusion. Narrower than a whole-component
-- "disable all general substitutes" switch - excludes exactly one
-- configured `ingredient_substitutions` target type from tier 4
-- (computeMakeability()'s owned-general-substitute check) for exactly one
-- recipe component, so rejecting "Spiced Rum doesn't belong in my Daiquiri"
-- never silences a different, still-valid substitute (e.g. Gold Rum) on the
-- same component.
--
-- Default '{}' - every configured general substitute stays eligible,
-- unchanged from today's behavior for every existing recipe.
--
-- Never affects tier 5 (preparations) - excluding a substitute never
-- disables a preparation route for the same component. Never affects tier
-- 3 (recipe_component_alternatives) - an adopted alternative is a stronger,
-- separate mechanism.
--
-- No RLS/GRANT change: recipe_components has never been column-restricted
-- (only `recipes` itself is, via the explicit revoke+grant in
-- 20260815214307) - its insert/update/delete policies already gate every
-- column via recipe_is_editable(recipe_id), and this column is written the
-- same way every other recipe_components column already is (full delete +
-- re-insert on save, see src/services/recipes.js).

alter table public.recipe_components
  add column excluded_substitute_type_ids uuid[] not null default '{}';

comment on column public.recipe_components.excluded_substitute_type_ids is
  'Ingredient type ids excluded from tier 4 (owned general substitute) for this component only - every other configured ingredient_substitutions row for the same ingredient stays eligible. Never affects tier 5 (preparations) or tier 3 (recipe_component_alternatives). Stage D.4.';
