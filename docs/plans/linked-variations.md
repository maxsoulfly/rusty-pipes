# Linked Variations

**Planning document — 2026-09-13. Planning only, nothing implemented.**
Written after Ingredient Detail v1 (I.1–I.4, `docs/plans/
ingredient-detail-page.md`) shipped and was manually verified. This is
Stage C of `docs/plans/substitutes-and-variations.md`, which sketched an
early version of this model in its "Part 3 — Linked cocktail variations"
section (2026-09-10) before Stage D existed. That sketch is a useful
starting point but predates several decisions below; where this doc
differs, this doc is authoritative and the reason for the difference is
called out explicitly. `docs/plans/substitutes-and-variations.md` itself
is updated with a pointer to this doc rather than duplicating the design
in two places (see its own "Part 3"/Stage C section).

---

## Current problem

Rusty Pipes treats every cocktail as a fully independent recipe. Several
already exist in the live catalogue that are deliberately *not*
independent in the way a member thinks about them — one is a practical/
home-friendly take on another, and today nothing in the app says so. A
member has to recognize the relationship from the name alone ("Bloody
Mary" vs. "Bloody Mary (Practical Version)"), which is exactly the kind of
implicit, name-based connection the rest of this app has deliberately
avoided (AGENTS.md: "No fuzzy/name-similarity matching anywhere in
availability or import logic — always resolve through explicit IDs").

---

## Product semantics (the one decision everything else follows from)

**A linked variation is a relationship between two otherwise-complete,
independent recipes — never a way to derive one recipe's content from
another.** Concretely:

- Recipe B "is a variation of" recipe A is a stored *fact*, not a
  *transformation rule*. B keeps its own `recipe_components`, `steps`,
  `glass_id`, colors, taste tags, source/visibility, everything.
- Nothing about B's ingredients, instructions, or availability is ever
  computed *from* A, at save time or at render time. Editing A never
  changes what B shows. Deleting A never breaks B's own recipe record
  (only the *link* disappears — see Deletion below).
- This is deliberately **not** the same mechanism as ingredient
  substitution (`ingredient_substitutions`, `recipe_component_alternatives`)
  or homemade preparations (`ingredient_preparations`). Those describe
  *"can this one ingredient slot be filled a different way,"* still inside
  one recipe's own `computeAvail()`. A linked variation describes
  *"here is a different, complete recipe you might want instead,"* and
  never enters the other recipe's availability computation at all. Keeping
  these two ideas structurally separate (different tables, different
  code paths, zero shared logic) is what lets each stay honest under
  Stage D's own rule: *"anything catalogue-wide and automatic is a
  suggestion; anything that changes availability was explicitly attached
  to that specific recipe."* A variation link changes no one's
  availability — it only changes what's *discoverable* from a recipe page.

This matches the user's own stated preference exactly, and the existing
architecture already supports it cleanly — see the Audit below for why no
part of `computeMakeability()`, `recommendations.js`, or the availability
engine needs to change at all.

---

## Audit (existing code + live catalogue, not assumptions)

**Nothing is built yet — confirmed unchanged since the last audit.**
`20260815214307_recipes_schema.sql`'s own header comment: *"Deliberately
NOT in this migration: substitution_groups and recipe_relationships
(variations) — schema for those lands when something actually consumes
them."* `DetailScreen.jsx` has no "Variations"/"Related recipes" section.
The only existing adjacent mechanism is **Clone** (`EditorScreen.jsx`
reads `?clone=<id>`, prefills a new private recipe named `"<name> (My
Version)"`) — a pure copy with **no stored link back to the source**.
Confirmed live: two of the catalogue's `(My Version)`-named recipes
(`Margarita (My Version)`, `Pineapple Dark Rum Daiquiri (My Version)`) are
exactly this — private, member-owned clones, not curated variations.

**Recipes table.** `recipes.update`'s grant is column-restricted:
`(name, description, glass_id, family_id, liquid_color, liquid_color_2,
steps)` (`20260815214307` + `20260825150000`). Adding a
`variation_of_id` column directly on `recipes` would mean widening that
grant list — a **separate relationship table avoids touching it
entirely**, exactly the reasoning the Stage C sketch already used. This
still holds and is the strongest architectural reason to keep the
relationship in its own table rather than a column.

**RLS helpers already exist and are reusable as-is:**
`recipe_is_visible(recipe_id)` / `recipe_is_editable(recipe_id)`
(`SECURITY DEFINER`, both already `revoke ... grant to authenticated`).
Visibility: shared+active, or the caller owns it, or the caller is admin.
Editable: caller owns it, or caller is admin (classics have no owner).
**No new SECURITY DEFINER function is needed** — the relationship table's
RLS can compose these two directly.

**`computeMakeability()`/`computeAvail()` (Stage D.1) take a cocktail's own
`ings`, `owned`, household basics, form conversions, general substitutes,
and preparations — nothing about a *different recipe*. `recommendations.js`
(Buy Next) reads `computed[].avail`/`missingRequiredIds` per recipe,
independently, with no cross-recipe reference at all. Adding a
relationship table that nothing in this list reads changes **none** of
this code — confirmed by inspection, not assumption: there is no code path
in either file that iterates recipes-of-other-recipes today, so there is
none to accidentally couple.**

**Recipe editor (`EditorScreen.jsx`) / services (`recipes.js`).**
`createRecipe()`/`updateRecipe()` are **not** wrapped in a single DB
transaction today — confirmed by `updateRecipe()`'s own comment: *"No
client-side multi-statement transaction is available, so a failure
partway through leaves a partial update rather than rolling back — same
constraint `createRecipe()` already lives with."* This matters for the
editor UX section below: a "Variation of" field saved as one more
sequential Supabase call matches the **existing, accepted** save model
exactly — it is not a new atomicity gap, just one more step with the same
honest limitation the recipe editor already has everywhere else. (This is
a different, stricter pattern than `IngredientTypeEditor.jsx`'s
`save_ingredient_type()` RPC, which *is* atomic — that rigor was built for
a form editing three related tables at once; it is not the recipe editor's
existing standard, and inventing one just for this one field would be
over-engineering relative to what "matches the existing editor" actually
means today.)

**Batch import (`src/schemas/recipeImport.js`).** Validates against
`types`/`glasses`/`families`/`tasteTags` only — no existing concept of
referencing another recipe. A batch-imported row has no real id yet at
validation time (ids are DB-generated on insert), and recipe **names**
are the only human-readable handle available in import JSON — which
AGENTS.md explicitly forbids relying on ("no fuzzy/name-similarity
matching anywhere in ... import logic — always resolve through explicit
IDs"). This directly answers the import question below: there is no
clean, reliable identity to link against during import, so it's not
attempted in v1 — see Import below.

**Public share (`get_shared_recipe()` RPC, `SharedRecipeScreen.jsx`).** An
unauthenticated, standalone JSON projection (name/steps/ings/taste/author
only) — no session, no membership check, reachable by anyone with the
link. It does not (and should not) gain relationship data in v1: an
anonymous viewer has no session for `recipe_is_visible` to evaluate
consistently against, the share page already omits every other
member-only feature (Favorites, lists, My Bar), and there's no product
ask for it. Deferred, not a regression.

**Recipe cards (`CocktailCard.jsx`, `SmallCard.jsx`).** No existing
"badge" slot for anything like this; `AVAIL_CFG`/`AvailBadge` are the only
per-card decoration today.

### Catalogue audit — real candidate pairs (read-only query, no data changed)

Two already-existing, already-published pairs are directly usable as the
first real link, with **no catalogue changes needed to create them as
recipes** — only the relationship row itself, in a later stage:

1. **Bloody Mary** ↔ **Bloody Mary (Practical Version)** — both classic/
   shared, same family (Highball). The exact pair named in the request.
2. **Zombie** ↔ **Zombie (Home Bar Spiced & Dark Spec)** — both classic/
   shared, same family (Tiki).

One near-miss, **not** currently usable: **Dark 'N' Stormy (Dark Rum
Version)** exists as a classic recipe, but there is no plain "Dark 'N'
Stormy" base recipe in the catalogue to link it to — creating one would be
a catalogue change, out of scope for planning.

---

## Relationship model

**One base ← many variations. No general many-to-many table.** A
variation has **at most one** base (`related_recipe_id`); a base can have
any number of variations pointing at it. This is deliberately the
smallest model that handles every real case above and the user's own
stated preference — nothing in the catalogue (or in the product idea of
"a practical version of X") needs a recipe to have *multiple* bases, or
an undirected "these two are somehow related" edge distinct from
"variation of."

**Directional storage, bidirectional navigation.** The FK direction is
"the variation points at its base" (matches who is expected to declare
the relationship — see Editor UX below); the UI reads it both ways:

- A base recipe's detail page shows **all variations that point at it**
  (a reverse lookup, not a second stored edge).
- A variation's detail page shows **the one base it points at**.

**No `relationship_type` column.** The Stage C sketch included one
(`text check (... in ('variation_of'))`) "to leave room for a future
`related_to`" without another migration. Per the explicit instruction to
avoid over-engineering for hypothetical future relationship types, this
plan **drops it** — v1 only ever means "variation of," so the column adds
a check constraint and a value every reader must ignore, for a hypothetical
that isn't asked for. If a genuinely different relationship type is ever
needed, that's a new, deliberate migration then, not a speculative column
now.

**Depth/chains: allowed to exist, never walked past one hop.** Nothing
stops a variation from itself becoming the base of another variation (B is
a variation of A; C is a variation of B) — preventing that would need a
recursive check with no real benefit, since nothing in this design ever
computes anything *from* the chain. The **display** rule is the actual
guard: a recipe's own page only ever shows **its own direct base** (one
hop up) and **its own direct variations** (one hop down) — never walks
further. This makes the "how deep can chains go" question moot for the
UI (always exactly one hop, however deep the underlying graph gets) and
means no cycle-detection algorithm is needed either: a theoretical cycle
(A → B → C → A, each an ordinary one-hop edge) is inert under a
never-walk-past-one-hop display rule — each recipe still only ever shows
its own direct neighbors correctly, regardless of what the wider graph
looks like elsewhere. This is called out explicitly as a deliberate
simplification, not an oversight: preventing cycles at the DB level would
need a recursive CTE constraint (real complexity) to guard against a
scenario the display model already can't be confused by. If real misuse
ever created a genuinely misleading chain, that's a moderation matter
(matches D4's own precedent: "misleading links stay a moderation matter,"
not something the schema polices) — revisit only if it actually happens.

**Self-link and duplicate prevention** (both trivial, both at the DB
level): `check (recipe_id <> related_recipe_id)`; `unique (recipe_id)`
(a variation has *one* base — a second insert for the same `recipe_id`
fails, so "change the base" is delete-then-insert, or a single UPSERT
keyed on `recipe_id`, matching how the recipe editor already treats
`recipe_component_alternatives` — delete + re-insert, no UPDATE policy).

**Deletion/archive.** `on delete cascade` on both FKs — deleting either
side's recipe removes the link, no orphaned row, no special handling
needed (matches every other child table in this schema). Unpublishing
(moderation) doesn't touch the relationship row at all: it just stops
being visible to non-owners the moment `recipe_is_visible` says so on
either side, via the same RLS-composed read policy below.

### Proposed schema

```sql
create table public.recipe_relationships (
  id                 uuid primary key default gen_random_uuid(),
  recipe_id          uuid not null references public.recipes(id) on delete cascade,  -- the variation
  related_recipe_id  uuid not null references public.recipes(id) on delete cascade,  -- its base
  note               text check (char_length(btrim(note)) between 1 and 280),        -- "how it differs" (optional)
  created_at         timestamptz not null default now(),
  constraint recipe_relationships_not_self check (recipe_id <> related_recipe_id),
  constraint recipe_relationships_one_base_per_variation unique (recipe_id)
);

create index recipe_relationships_related_recipe_id_idx
  on public.recipe_relationships (related_recipe_id);
-- recipe_id already has an implicit index via the unique constraint above;
-- related_recipe_id needs its own for the reverse "variations of me" lookup.

alter table public.recipe_relationships enable row level security;

-- read: only if the viewer can see BOTH sides
create policy "recipe_relationships: read" on public.recipe_relationships
  for select to authenticated
  using (public.recipe_is_visible(recipe_id) and public.recipe_is_visible(related_recipe_id));

-- write: only from the variation side, by whoever can edit it
create policy "recipe_relationships: insert" on public.recipe_relationships
  for insert to authenticated with check (public.recipe_is_editable(recipe_id));
create policy "recipe_relationships: delete" on public.recipe_relationships
  for delete to authenticated using (public.recipe_is_editable(recipe_id));
-- no update policy - changing the base or the note is delete + re-insert,
-- matching recipe_component_alternatives' own precedent exactly.
```

No new SECURITY DEFINER function, no new GRANT beyond the table's own
policies (this table carries no column-restricted grant — every column is
either system-managed or covered by insert/delete, there's no "member can
update some columns" case here at all).

**Who can link, confirmed from Stage C's D4 (re-affirmed, not silently
inherited):** the variation's own editor sets its own base — `recipe_
is_editable(recipe_id)` gates the write, meaning whoever can edit the
*variation* controls the link. **The base's owner is never asked and
cannot block a link pointing at their recipe** (you can't stop someone
from noting their own recipe is inspired by yours) — misleading or bad
links remain a moderation matter, same as D4 originally decided. This
directly answers "should editing the base manage its children": **no** —
the base's own editor gets no relationship UI at all in v1; assigning
from the variation's side is sufficient (see Editor UX below).

---

## Member-facing UX

**On a base recipe's detail page — "Variations":**

```
Variations
• Bloody Mary (Practical Version)     [its own AvailBadge]
• (any other recipe pointing at this one)
```

**On a variation's detail page — "Variation of":**

```
Variation of
• Bloody Mary     [its own AvailBadge]
```

A variation's page does **not** also show its own siblings ("other
variations of the same base") in v1 — the request's own phrasing flags
this as a "potentially" nice-to-have, and it adds a second lookup +
another list to keep compact for a feature explicitly meant to be "useful
context, not a family-tree UI." Deferred, easy to add later (same lookup,
just keyed by `related_recipe_id` again, excluding the current recipe).

**Placement:** a compact block near the bottom of `DetailScreen.jsx`,
after `StepsSection` — the same "supplementary, not primary" position
"cocktails using this ingredient" already occupies on Ingredient Detail.
Each row is a real cocktail card/row using the **existing** navigation
pattern (`onClick={() => navigate(\`/library/${id}\`)}`), not a new
component — the same tap-to-open-a-recipe behavior every other list in
this app already has. No new interaction pattern to learn.

**Sort, when there's more than one variation:** makeable first
(`display.tier`, reusing `groupByDisplayTier`'s own tier order — no new
ranking logic), then by name — matches D5 exactly, and reuses code that
already exists rather than inventing a per-feature sort.

**Card badge (Library/Home grid): recommended against for v1.** The
request explicitly asks to "consider... only if it genuinely improves
discovery." A small badge on every variation's card is a permanent visual
tax paid by every grid view, for a fact that's only actionable from the
recipe's own detail page anyway (you can't *do* anything with "this is a
variation" from the grid — there's no action to take there). Recommend
skipping it for v1; revisit only if real usage shows people can't find
variations from context and need the hint one level earlier.

---

## Availability / makeability — the explicit non-negotiable

**Each recipe keeps its own, completely independent `computeMakeability()`
result — `strict`, `adapted`, `display`, substitutions, preparations,
exclusions, Buy Next ranking, everything.** A linked variation changes
**zero** inputs to any of these for either side. This isn't a design
choice this plan is proposing — it's already true today, since the
availability engine has no concept of "another recipe" anywhere in its
signature (confirmed in the Audit above), and this plan adds no new
parameter to `computeMakeability()`, `computeAvail()`, or
`recommendations.js`. The relationship table is read **only** by the new
UI section, never by the engine.

**"Can't make the original? You can make this variation" framing — yes,
as presentation only, reusing what already exists:** each variation shown
in the "Variations" block already carries its own `display.tier` (via the
same `computed` array every screen reads) — sorting makeable ones first
(above) already produces exactly this effect with zero new computation. A
short static line above the block ("Can't make the original? A linked
variation might work.") is copy, not logic, shown only when the *current*
recipe's own `display.tier` isn't `perfect`/`good` and at least one linked
variation *is* — a simple boolean check on already-available data, not a
new ranking algorithm. This is the "ranking linked variations by current
makeability" case the request distinguishes from "merely showing linked
recipes" — this plan does the former, cheaply, by reusing the sort above;
it does **not** need a separate, dedicated domain module beyond that sort.

**Never fake the base's own availability.** A makeable variation is never
reported as making the *base* recipe "possible" — the base's own
`display.tier` is completely untouched by any variation's makeability,
in both the domain layer (nothing feeds back) and the UI copy (the
framing above is always phrased as "make this [variation] instead," never
"[base] is now available").

---

## Discovery (Library / Home / search / Ingredient Detail / favorites / lists)

**Variations remain ordinary, first-class recipes everywhere they already
appear — no change to any existing list/filter/search.** This matches the
user's own stated preference and requires **zero code changes** to
`LibraryScreen.jsx`, `HomeScreen.jsx`, favorites/want-to-make, or
`findRecipesUsingIngredient()` (Ingredient Detail's "cocktails using this")
— all of them already iterate `computed` (every visible recipe) with no
awareness of relationships, and none of them need to gain any. The only
new thing discoverable *because of* this feature is the "Variations"/
"Variation of" block on the detail page itself — nothing is added to, or
removed from, any grid, filter, or search result. If the catalogue later
grows enough near-duplicate variations that grids feel redundant, that's
a genuinely separate, later decision (collapsing/grouping) — explicitly
deferred, matching the request's own framing.

---

## Admin/editor UX

**One optional field in `EditorScreen.jsx`: "Variation of."** A collapsed,
searchable recipe picker (new small component, `RecipeComboBox` — same
interaction pattern as `TypeComboBox.jsx`: collapsed trigger → inline
search + a bounded, scrollable result list → collapses on pick, no
overlay, so the keyboard never covers Save/Cancel) + an optional one-line
"how it differs" note (matches `recipe_relationships.note`, ≤280 chars,
mirroring `recipe_component_alternatives`' own note field's UX).

- **Searchable over visible recipes only** (`computed`, already loaded —
  no new fetch), **excluding the recipe being edited itself** (self-link
  is impossible to pick, not just DB-rejected).
- **Cannot select itself** — enforced by exclusion from the picker's own
  list (client-side) *and* the `check` constraint (server-side) — UI
  convenience, DB is the real gate, same "convenience vs. authority" split
  I.4 already established for the admin edit shortcut.
- **Cyclic relationships:** per the model above, a cycle is inert under
  the one-hop display rule, so **no client-side cycle check is added** —
  consistent with "prevent invalid/cyclic relationships according to the
  chosen model," where the chosen model's own answer is "a cycle isn't
  invalid here, it's just not displayed past one hop." The only actually
  *invalid* relationship is a self-link, which the picker already can't
  produce.
- **Save/Cancel:** one more sequential Supabase call inside the existing
  (non-atomic) save flow — see the Audit's own note on `updateRecipe()`'s
  documented, accepted lack of cross-table atomicity. Changing or removing
  the field never touches `recipe_components`/`steps`/anything else on
  either recipe — it is its own row in its own table, written
  independently. **Cancel** discards the local field change with zero
  writes, same as every other field in this editor today.
- **The base's own editor gets no new UI** — per the model above,
  assigning from the variation is sufficient for v1; a base recipe's
  owner/admin never sees or manages its incoming variations from the
  editor (only from the detail page's read-only "Variations" block).
- **Clone (`?clone=`) interaction:** the request flags this as worth
  considering. Recommendation: an **opt-in checkbox** on the clone form
  ("This is a variation of the original"), unchecked by default — cloning
  already means "make my own copy," which is not automatically the same
  intent as "link this back as a variation of the original" (a private
  practice-run clone usually isn't meant to be discoverable as a public
  variation of anything). Pre-fills the picker with the clone source when
  checked; otherwise the field starts empty. Small, additive, no new
  concept — reuses the same field and picker.

---

## Import

**Admin-editor-only for v1. Batch import does not gain a variation
reference.** Per the Audit: recipe names are the only import-time handle,
are explicitly disallowed as a matching mechanism by AGENTS.md's own
standing rule, and a batch-imported recipe has no real id until after
insert (so referencing a *sibling row in the same batch* by any id is
also not straightforwardly available without inventing a temporary
in-batch reference scheme, which is speculative complexity for a feature
with exactly zero current import demand). If a real need appears later
(e.g. importing a whole family of variations at once with a clean,
already-known target id), that's a deliberate, scoped follow-up — not
attempted here per the explicit instruction not to complicate import
without a clean, reliable identity mechanism.

---

## Interaction with existing systems — explicit verification

| System | Regression risk | Why not |
|---|---|---|
| Strict availability (`computeAvail`) | None | No new parameter; engine has no recipe-to-recipe concept to add one to. |
| `computeMakeability()` / adaptations | None | Same - reads one recipe's own components only. |
| Buy Next (`recommendations.js`) | None | Reads `computed[].avail`/`missingRequiredIds` per recipe; no cross-recipe read exists to add. |
| Ingredient Detail's "cocktails using this" | None | `findRecipesUsingIngredient()` matches a recipe's own components against a viewed ingredient; unaware of, and unaffected by, relationships. |
| Favorites / lists | None | Keyed by recipe id only; a variation is favorited/listed exactly like any other recipe. |
| Serving scaling | None | Per-recipe, reads that recipe's own `ings`; no cross-recipe amount ever referenced. |
| Recipe editor | Additive only | One new optional field + one new small picker component; every existing field/save path unchanged. |
| Recipe import/export | Unaffected | Batch import gains nothing (see Import); plain-text share (`recipeShareText.js`) already only serializes name/ingredients/steps, nothing to add or lose. |
| Public/shared recipe pages | Unaffected (deliberately) | `get_shared_recipe()` untouched - see Audit. |

---

## Staged implementation plan

**V.1 — Schema + domain relationship resolution.**
- Migration: `recipe_relationships` table + indexes + RLS (as above) +
  `supabase/tests/rls_suite.sql` block (owner links their variation;
  self-link rejected; duplicate base rejected — second insert for the same
  `recipe_id` fails unique; a non-editor can't link from someone else's
  recipe; the link is invisible to a viewer who can't see the private
  side; deleting either recipe cascades the link; anon denied).
- Fetch: `recipe_relationships` as its own small flat table, fetched once
  alongside recipes (mirrors how `catalog.formConversions`/
  `ingredientSubstitutions` are already flat-fetched-then-joined
  client-side, rather than embedding a doubly-self-referencing PostgREST
  select into `RECIPE_SELECT` — simpler, lower-risk, and consistent with
  this app's own established pattern for relationship data; refetched via
  the same `refetchRecipes()` every recipe mutation already triggers).
- New pure `src/domain/recipeRelationships.js`: given `recipeId` + the
  flat relationship rows, resolve `{ baseRecipeId, note } | null` (one
  hop up) and `[{ recipeId, note }]` (one hop down, direct variations
  only) — the "one-hop, never walk further" rule lives here, in one
  small, fully unit-tested place, not repeated per screen.
- *Acceptance:* given a small fixture graph (including a deliberately
  self-referencing chain, A←B←C), resolving B's base returns exactly A
  (not walking to see what A's own base is, if any); resolving A's
  variations returns exactly B (not C); a recipe with no relationships
  resolves to `null`/`[]` cleanly. No UI yet.

**V.2 — Recipe editor assignment.**
- `EditorScreen.jsx` gains the "Variation of" field + note; new
  `RecipeComboBox` component (visible recipes, self excluded); wired
  through `createRecipe()`/`updateRecipe()` as one more sequential,
  non-atomic step (matches the existing save model); clone-flow opt-in
  checkbox.
- *Acceptance:* linking, changing, and removing a variation's base never
  alters that recipe's own ingredients/steps/anything else (verified by
  diffing the recipe's own fields before/after); Cancel makes no writes.

**V.3 — Cocktail Detail relationship UI + navigation.**
- `DetailScreen.jsx` "Variations" / "Variation of" blocks (read-only,
  reusing `CocktailCard`/existing navigate-to-recipe pattern), sourced
  from V.1's domain resolver + the already-loaded `computed` array for
  each linked recipe's name/badge/availability.
- *Acceptance:* Bloody Mary shows "Variations: Bloody Mary (Practical
  Version)"; the practical version shows "Variation of: Bloody Mary";
  tapping either navigates to the other's own detail page; each shows its
  own real availability badge, independent of the other.

**V.4 — Makeability-aware presentation + first real catalogue links.**
- The "makeable variations first" sort + the conditional "can't make the
  original?" line (both presentation-only, per Availability above).
- **First real catalogue links** (the only stage that touches live data,
  and only by request/approval at that point, not automatically as part
  of "planning"): Bloody Mary ↔ Bloody Mary (Practical Version); Zombie ↔
  Zombie (Home Bar Spiced & Dark Spec).
- *Acceptance:* both pairs show correctly in the running app; sort order
  matches makeability; the framing line appears only when appropriate.

Each stage: `corepack pnpm@10.34.3` test + build, isolated-LF
`oxfmt --check`, RLS suite re-run after V.1's migration, `db advisors
--type security` after V.1, commit + push, then a short manual check —
independently shippable, same discipline as every prior staged feature
this session.

**Explicitly deferred (not v1, recorded so a later session doesn't
re-derive why):** a variation's own page showing sibling variations;
walking/displaying multi-hop chains; cycle prevention at the DB level;
a Library/Home card "Variation" badge; batch-import variation references;
relationship data on the public share page; collapsing/grouping
near-duplicate variations in discovery; any `relationship_type` beyond
"variation of."

---

## Testing plan

**Automated (domain, `src/domain/recipeRelationships.js`):**
- Cannot link a recipe to itself (constraint-level, plus a pure-function
  test asserting the resolver never returns self as its own base/variation
  even if fed a malformed row).
- Relationship direction resolves correctly: base → variations lookup
  finds exactly its direct children; variation → base lookup finds
  exactly its one direct parent — never confusing the two directions.
- A chain (A←B←C) never walks past one hop in either direction.
- Unlinking (removing a relationship row) doesn't alter either recipe's
  own fields — asserted by a fixture diff, not just "no crash."
- Linked recipes keep fully independent makeability — a fixture pair
  with different `display.tier`s resolves each one unaffected by the
  other's.
- A relationship pointing at an archived/invisible recipe (simulated by
  a fixture where the "related" recipe simply isn't in the visible set)
  resolves to nothing shown, not a broken reference.

**RLS suite (`supabase/tests/rls_suite.sql`, new block):**
- Owner of a private recipe can insert its own `recipe_relationships` row
  pointing at a visible base; a non-editor cannot insert one on someone
  else's recipe; a duplicate base for the same `recipe_id` is rejected
  (unique violation); a self-link is rejected (check violation); the link
  is invisible to a member who can't see the private side; deleting
  either recipe cascades the relationship row; anon denied on all
  operations.

**Editor (structural, matching this project's own honest testing limits —
no jsdom/component rendering available):** Cancel-makes-no-writes is
structural (Cancel never calls a save function); the picker's self-
exclusion is verified the same way `TypeComboBox`'s own exclusion logic
would be — a plain filter, testable as a pure function if it's factored
out that way (recommended, mirroring `TypeComboBox`'s own precedent of
taking a pre-filtered list from its caller).

**Manual verification (short, using real recipes):**
- Open Bloody Mary → confirm "Variations: Bloody Mary (Practical
  Version)" (once V.4 links it) → tap it → lands on the practical
  version's own page, own badge, own ingredients.
- Open the practical version → confirm "Variation of: Bloody Mary" → tap
  it → back to the original, unaffected.
- Remove My Bar ownership of an ingredient the original needs but the
  variation doesn't (or vice versa) → confirm each recipe's own
  availability badge updates independently, never the other one.
- Confirm neither recipe's ingredient list, steps, or badge changed
  merely from linking/unlinking them.

---

## Open, non-blocking notes (recommended defaults, not decisions the user must make now)

- Sibling-variations-on-a-variation's-own-page and a card-level
  "Variation" badge: both reasonable, both deferred — revisit only if
  real use asks for them.
- The clone-flow "this is a variation" checkbox default (unchecked): a
  small UX call, easy to flip later if members expect the opposite.
- If a genuinely different relationship type is ever needed (not just
  "variation of"), it's a new migration/column then — the schema above
  deliberately doesn't pre-build a seam for it.
