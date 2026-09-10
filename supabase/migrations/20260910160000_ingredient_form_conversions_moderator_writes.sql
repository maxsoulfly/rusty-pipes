-- "Can provide" management (Concept 2 / ingredient_form_conversions) moves
-- into the Ingredient Type editor (Stage A of
-- docs/plans/substitutes-and-variations.md). That editor is reached and used
-- by admins AND moderators - ingredient_types writes already admit
-- public.is_admin_or_moderator(), and the Household-basic toggle on the same
-- form is moderator-writable. Widen the form-conversions write policy to
-- match so a moderator curating an ingredient can add/edit/remove its
-- "Can provide" entries.
--
-- Narrow change: only the write (ALL) policy's predicate. The members-read
-- policy is untouched, so ordinary members stay read-only. No table-level
-- GRANT change (authenticated already holds the blanket
-- SELECT/INSERT/UPDATE/DELETE that every table in this project has - the RLS
-- policy is the real gate). No new function (is_admin_or_moderator() has
-- existed since 20260825100000).

alter policy "ingredient_form_conversions: admin writes"
  on public.ingredient_form_conversions
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

comment on policy "ingredient_form_conversions: admin writes"
  on public.ingredient_form_conversions is
  'Admin or moderator may insert/update/delete (widened from admin-only in 20260910160000). Ordinary members are read-only via the separate members-read policy.';
