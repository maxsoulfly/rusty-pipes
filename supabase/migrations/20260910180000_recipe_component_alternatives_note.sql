-- Stage B (Suggested Substitutes): a recipe-scoped substitution alternative
-- can now carry a short flavor-change note ("spicier, drier"), shown inline
-- on the recipe next to "Substituting: <name>". Nullable - every existing
-- row stays exactly as it renders today (no note -> no extra text). The
-- column is governed by the table's existing RLS
-- (recipe_is_editable/recipe_is_visible via recipe_id); no policy change.
--
-- Editing a note is delete + re-insert of the row, same as every other
-- field on recipe_component_alternatives - the recipe editor already
-- rebuilds a component's whole alternatives set on Save.

alter table public.recipe_component_alternatives
  add column note text
    check (note is null or char_length(btrim(note)) between 1 and 200);

comment on column public.recipe_component_alternatives.note is
  'Optional short flavor-change note for this recipe-scoped substitution ("drier, less sweet"). Shown inline on the recipe. Null = no note (unchanged rendering). Stage B / docs/plans/substitutes-and-variations.md.';
