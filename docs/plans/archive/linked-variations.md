# Linked Variations

**Planning document — 2026-09-13, revised 2026-09-13 (cycle rule
correction) and now Stages V.1, V.2, V.3, and V.4 DONE + pushed,
2026-09-13 (V.2 itself revised the same day - see its own atomicity
correction below). V.2 and V.3 are now manually verified by the user
(2026-09-13) - see the Staged implementation plan's own V.2/V.3 entries,
updated below to record it, and the real Bloody Mary/Zombie catalogue
links V.4 adds now that the UI itself was confirmed working. That same
manual verification found a real V.3/V.4 presentation bug - the
relationship note was rendered as if it described the BASE recipe's card
on a variation's own page, when it actually always describes the
variation relative to its base. Fixed same-day as Stage V.5; a follow-up
round of manual screenshots then found the fixed note block itself was
full container width (fine for a short note, but a long one spanned
almost the whole page) - fixed same-day as a layout width polish, still
within V.5. A further round of manual testing then found the "How this
version differs" heading itself still read as ambiguous - easy to
mistake for describing the base card above it - fixed same-day by naming
the current recipe explicitly in the heading, also within V.5. Mobile
testing after that found the relationship card + note landing in a narrow
~half-width grid cell on a phone - fixed same-day with a mobile-first
single-column layout for the relationship grid, still within V.5. See its
own entry below.** Written after
Ingredient Detail v1 (I.1–I.4, `docs/plans/ingredient-detail-page.md`)
shipped and was manually verified. This is Stage C of `docs/plans/
substitutes-and-variations.md`, which sketched an early version of this
model in its "Part 3 — Linked cocktail variations" section (2026-09-10)
before Stage D existed. That sketch is a useful starting point but
predates several decisions below; where this doc differs, this doc is
authoritative and the reason for the difference is called out explicitly.
`docs/plans/substitutes-and-variations.md` itself is updated with a
pointer to this doc rather than duplicating the design in two places
(see its own "Part 3"/Stage C section).

**Correction applied before/during V.1 (2026-09-13):** the original plan
below treated a relationship cycle as "inert, so not worth preventing at
the DB level" (see the struck-through reasoning still visible in the
Relationship model section, kept as historical record). The user
corrected this: Linked Variations are semantic parent/base facts, so a
cycle is invalid catalogue data even though the member-facing UI only
ever resolves one hop - "the UI doesn't show it" is not the same claim as
"it's fine for it to exist." **V.1 ships with cycle prevention at write
time** (a database trigger - see Relationship model and Staged
implementation plan below for what actually shipped). Self-links remain
rejected too, now caught by the same mechanism as a degenerate
zero-length cycle, with the original `check` constraint kept as a
structural backstop.

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

**Depth/chains: allowed to exist as a chain; a CYCLE is rejected at write
time. Member-facing resolution stays one hop only, regardless.** Nothing
stops a variation from itself becoming the base of another variation (B is
a variation of A; C is a variation of B) — that's an ordinary, valid chain,
and preventing chains themselves would need a recursive check with no real
benefit, since nothing in this design ever computes anything *from* the
chain. The **display** rule stays exactly as originally designed: a
recipe's own page only ever shows **its own direct base** (one hop up) and
**its own direct variations** (one hop down) — never walks further,
however deep the underlying chain actually is.

~~**Superseded correction, 2026-09-13 (kept as historical record of the
original reasoning, not acted on):** the original text here argued a
cycle (A → B → C → A) is "inert" under the one-hop display rule and
therefore not worth preventing at the DB level, leaving cycle prevention
as an explicitly deferred item. The user corrected this: a linked
variation is a semantic parent/base *fact*, and a cycle is invalid
catalogue data regardless of whether the member UI happens to only
resolve one hop - "the display can't be confused by it" is not the same
claim as "it's fine for it to exist as stored data." Self-links must be
rejected; assigning a base must be rejected if it would create a cycle;
chains may otherwise exist; member-facing resolution stays one hop only.
See below for what actually shipped in V.1.~~

**What V.1 actually ships:** a self-link is rejected, and assigning a base
is rejected outright if it would create a cycle of any length - both
enforced in the database, not left to the one-hop display model to paper
over. This is cheap to do correctly here specifically because
`unique(recipe_id)` (below) already limits every recipe to **at most one**
outgoing base edge - the whole relationship graph is always a *forest of
trees*, never a general graph, so checking whether a proposed new edge
would close a loop only ever means walking a **single linked list**
upward from the proposed base, checking whether it ever leads back to the
recipe being assigned. A `BEFORE INSERT OR UPDATE` trigger
(`forbid_recipe_relationship_cycle()`, `SECURITY DEFINER` so it sees every
row regardless of the calling member's own read visibility) does exactly
that walk, with a generous fixed depth cap as a defensive guard against
corrupted data rather than a real expectation of ever being hit - this is
a bounded iterative walk over a linked list, not a recursive CTE or a
general graph library, matching the explicit instruction to use the
simplest reliable implementation for this specific shape of data. A
self-link is caught by the same trigger as a degenerate zero-length cycle
(`related_recipe_id` already equals `recipe_id` on the very first check) -
the original `check (recipe_id <> related_recipe_id)` constraint stays in
place too, as a structural backstop that holds even if triggers were ever
disabled for some bulk operation.

If real misuse ever created a genuinely misleading (but non-cyclic) chain
- e.g. a technically-valid but confusing multi-hop lineage - that stays a
moderation matter (matches D4's own precedent: "misleading links stay a
moderation matter," not something the schema polices). Only an actual
cycle is treated as invalid data; a long but honest chain is not.

**Self-link, duplicate, and cycle prevention** (all at the DB level):
`check (recipe_id <> related_recipe_id)` (structural backstop; in
practice the cycle trigger below catches a self-link first, as a
zero-length cycle); `unique (recipe_id)` (a variation has *one* base — a
second insert for the same `recipe_id` fails, so "change the base" is
delete-then-insert, matching how the recipe editor already treats
`recipe_component_alternatives` — delete + re-insert, no UPDATE policy);
a `BEFORE INSERT OR UPDATE` trigger that rejects any cycle (see above).

**Deletion/archive.** `on delete cascade` on both FKs — deleting either
side's recipe removes the link, no orphaned row, no special handling
needed (matches every other child table in this schema). Unpublishing
(moderation) doesn't touch the relationship row at all: it just stops
being visible to non-owners the moment `recipe_is_visible` says so on
either side, via the same RLS-composed read policy below.

### Schema — DONE, shipped as V.1, `20260913120000_recipe_relationships.sql`

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

-- Cycle prevention (the corrected rule - see above): unique(recipe_id)
-- above already guarantees the graph is a forest of trees (at most one
-- outgoing edge per node), so checking a proposed new edge is a single
-- linked-list walk upward from the proposed base, not a general graph
-- traversal.
create function public.forbid_recipe_relationship_cycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare walker uuid := new.related_recipe_id; steps int := 0;
begin
  loop
    if walker = new.recipe_id then
      raise exception 'recipe_relationships: assigning this base would create a cycle';
    end if;
    select related_recipe_id into walker from public.recipe_relationships where recipe_id = walker;
    exit when walker is null;
    steps := steps + 1;
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

No new authorization SECURITY DEFINER function (the cycle trigger is a
new SECURITY DEFINER function, but for data-integrity, not authorization -
`recipe_is_visible`/`recipe_is_editable` are reused as-is for the RLS
policies themselves). No new GRANT beyond the table's own policies (this
table carries no column-restricted grant — every column is either
system-managed or covered by insert/delete, there's no "member can update
some columns" case here at all).

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
Each card is the **existing** `CocktailCard`, using the same existing
navigation pattern (`onClick={() => navigate(\`/library/${id}\`)}`) - the
same tap-to-open-a-recipe behavior every other list in this app already
has, no new interaction pattern to learn. **Shipped as one new thin
section component** (`VariationsSection.jsx`, V.3) that only lays out
existing `CocktailCard`s in the existing grid - not a new card/row kind,
matching `HeroCard.jsx`/`StepsSection.jsx`/etc.'s own established
one-file-per-detail-section convention rather than inlining this much
markup directly into `DetailScreen.jsx`.

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
- **Cyclic relationships:** rejected in the database by V.1's cycle
  trigger (see Relationship model above) - no client-side cycle check is
  *required* for correctness, since the DB is the real gate. A future V.2
  polish item (not required for V.1, not blocking): catch the trigger's
  error message and show it inline as a friendly "That would create a
  cycle" instead of a raw Postgres error string, the same convenience-
  layer treatment every other server-enforced rule in this editor already
  gets (e.g. a duplicate name). Self-links are excluded from the picker's
  own list as before, so the picker itself can't produce one to begin
  with.
- **Save/Cancel — upgraded twice during V.2, see the Staged implementation
  plan's V.2 entry for the final, actually-shipped design:** the text
  originally here said this would be "one more sequential Supabase call
  inside the existing non-atomic save flow." The user's own V.2 request
  asked for more: the relationship write itself must be genuinely atomic,
  and a cyclic rejection must not leave other recipe changes saved
  either. A first pass added a narrow `set_recipe_variation_of()` RPC
  (atomic relationship replace) called first in the save sequence - which
  correctly stopped a cyclic *rejection* from letting later writes
  proceed, but did **not** stop an already-*succeeded* relationship write
  from staying committed if a *later* step then failed (the recipe's
  fields/components/tags were still separate, non-transactional calls).
  The user caught this before approving V.2 and asked for a real fix. The
  final design: one `save_recipe()` RPC owns the recipe's fields,
  components, taste tags, AND the relationship together, in one
  transaction - see below. Changing or removing the field still never
  touches `recipe_components`/`steps`/anything else on either recipe
  *when the save succeeds* — it is its own row in its own table; **the
  actual guarantee now is that a Save either changes everything it asked
  to change, or nothing at all.** **Cancel** discards the local field
  change with zero writes, same as every other field in this editor
  today.
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

**V.1 — Schema + domain relationship resolution. DONE, 2026-09-13.**
- Migration `20260913120000_recipe_relationships.sql`: `recipe_relationships`
  table + index + RLS + the cycle-prevention trigger (all per the
  corrected model above), pushed via `supabase db push --linked`.
  `supabase/tests/rls_suite.sql` gained a new block: the variation's own
  editor can link it to a visible base (note round-trips); a self-link is
  rejected (caught by the cycle trigger as a zero-length cycle); a second
  base for an already-linked variation is rejected (unique violation); a
  valid 3-node chain (A←B←C) is allowed; a direct cycle (A→B→A) is
  rejected; a longer 3-hop cycle (A→C→B→A) is rejected; one base can have
  multiple direct variations; a non-editor cannot link someone else's
  recipe; the link is invisible to a viewer who can't see both sides;
  anon is denied on read/insert; unlinking (delete) leaves both recipes'
  own rows completely untouched; deleting the base recipe cascades and
  removes the relationship. Full suite passes; `db advisors --type
  security` shows no new finding (the cycle-check function is revoked
  from public/anon/authenticated, same discipline as every other
  SECURITY DEFINER function in this codebase).
- New pure `src/domain/recipeRelationships.js` (not yet wired to any
  fetch/service - that's V.2/V.3's job): `resolveBaseRelationship()`,
  `resolveDirectVariations()`, and a screen-ready
  `resolveRecipeVariationContext()` that additionally looks each side up
  in a caller-supplied `recipesById` map and drops (never crashes on) a
  missing/stale target. 16 new unit tests covering exactly the "one-hop,
  never walk further" rule, multi-variation bases, null-safety, and that
  unlinking (an empty relationships array) never touches the recipe
  objects themselves.
- *Acceptance:* given a small fixture chain (A←B←C), resolving B's base
  returns exactly A (not walking to see what A's own base is, if any);
  resolving A's direct variations returns exactly B (not C); a recipe with
  no relationships resolves to `null`/`[]` cleanly; a missing/invisible
  related recipe is dropped, not thrown on. No UI yet - `pnpm test`
  357/357 (+16), `pnpm build` clean (178 modules - the new files aren't
  imported by app code yet, only by their own tests).

**V.2 — Recipe editor assignment. DONE, 2026-09-13.**
- `EditorScreen.jsx` gains the "Variation of" field (a new
  `RecipeComboBox`, visible recipes minus self) + an optional one-line
  "how it differs" note, both draft-only until Save, matching every other
  field in this editor - `variationOfRecipeId: null` means "no base."
  Prefilled on edit from the existing relationship (via V.1's
  `resolveBaseRelationship()`); a plain "Remove - not a variation" button
  clears the draft back to null. Field is visible to whoever can already
  edit the recipe (owner or admin, `recipe_is_editable`'s own rule,
  matching the D4 model this plan already re-affirmed) - not additionally
  gated to staff, since the DB already correctly allows any recipe owner
  to declare their own recipe a variation.
- **Atomicity - first pass, then corrected the same day.** The first V.2
  pass added `set_recipe_variation_of()` (migration `20260913130000`,
  `SECURITY INVOKER`) making the relationship's own delete-then-insert
  atomic, called **first** in `updateRecipe()` so a cyclic rejection
  stopped the save before any other write. **This was still incomplete:**
  it only protected against a rejection happening *before* other writes -
  if the relationship write **succeeded** and a *later* step (the
  `recipes` field update, or a component/tag write) then failed, the
  relationship had already committed, half-updated relative to the rest
  of the recipe. The user caught this before approving V.2 and asked for
  a real fix, explicitly ruling out compensating client-side writes as an
  answer.
- **Final design: one new atomic RPC owns the whole editor Save.**
  `set_recipe_variation_of()` is dropped; a new function, `save_recipe(
  p_recipe_id, p_fields, p_components, p_taste_tag_ids, p_variation_of)`
  (migration `20260913140000`, `SECURITY INVOKER` - RLS on every touched
  table is still the real gate, unchanged) now owns the recipe's own
  fields, its full component/alternative set, its full taste-tag set,
  **and** its one relationship row, all in a single plpgsql function body
  - one transaction. A failure anywhere (a bad ingredient reference, the
  caller not owning the recipe, or the relationship's own cycle-check
  trigger) rolls back everything the function already did in that same
  call. Directly mirrors `save_ingredient_type()`'s own already-established
  pattern (JSONB in, replace-the-whole-child-set-by-delete-then-insert per
  child table, `search_path=''` with fully-qualified names).
  `p_recipe_id: null` **creates** a new private recipe (`owner_id =
  auth.uid()`, matching `createRecipe()`'s existing always-private
  behavior exactly) instead of updating one - so the SAME transactional
  guarantee now covers creation too ("apply the same principle to
  creation where practical" - this extends the one function rather than
  redesigning the create path). `createRecipe()`/`updateRecipe()`
  (`src/services/recipes.js`) both now call this one RPC instead of a
  sequence of separate Supabase calls. `createClassicRecipes()` (batch
  import) is **unchanged** - a different, already-per-row-isolated flow
  with no relationship support at all, out of scope for this fix.
- New `fetchRecipeRelationships()` (flat table fetch, mirrors
  `catalog.formConversions`'s own pattern) wired into `useRecipes.js`
  (fetched alongside recipes, refetched by the same `refetchRecipes()`)
  and exposed via outlet context as `recipeRelationships` - the piece V.1
  explicitly deferred ("not yet wired to any fetch/service - that's
  V.2/V.3's job"). Unaffected by the atomicity correction.
- New pure `resolveVariationCandidates()` (`src/domain/
  recipeRelationships.js`) - self-exclusion only, no client-side cycle
  filtering (per the plan's own instruction: the DB trigger stays the only
  cycle authority; even the single most obvious one-hop-reverse case is
  left to it, not re-derived client-side).
- **Deferred from this doc's original text, not built:** the clone-flow
  ("this is a variation of the clone source") opt-in checkbox - the user's
  own V.2 instructions this turn scoped the stage to the picker + note +
  atomic save/cancel + cycle-error surfacing specifically, without
  mentioning clone integration; kept as an easy, small follow-up, not
  silently dropped.
- *Acceptance:* linking, changing, and removing a variation's base never
  alters that recipe's own ingredients/steps/anything else; Cancel
  (navigating away without saving) makes no writes - structural, since no
  save function is ever called; **the actual regression this correction
  exists for** - a `save_recipe()` call that renames a recipe AND
  reassigns it to a base that would create a cycle is rejected wholesale,
  and afterward the recipe's name is unchanged AND its original
  relationship (base + note) is unchanged, not half-applied either way
  (RLS-suite verified - see the Testing plan). **Manually verified by the
  user, 2026-09-13:** "Variation of" assignment saves correctly, and the
  "How it differs" note round-trips as expected.

**V.3 — Cocktail Detail relationship UI + navigation. DONE, 2026-09-13.**
- New `src/components/detail/VariationsSection.jsx` - "Variation of" (the
  one base, if any) and/or "Variations" (direct children, if any), both
  can show together for a recipe in the middle of a chain. Reuses
  `CocktailCard` in the exact same grid Ingredient Detail's own "cocktails
  using this" section already established
  (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5`, a small muted
  caption under each card for its `note`) - one consistent "related
  recipes" visual language app-wide, not a new row component. Renders
  `null` (no section at all) when there's neither a base nor variations -
  no empty heading. Placed in `DetailScreen.jsx` right after
  `StepsSection`, before `ActionButtons` - the same "supplementary, not
  primary" position originally planned.
- **Zero new data loading** - `recipeRelationships` (the flat table) has
  been fetched once alongside recipes since V.2; `DetailScreen.jsx` only
  builds a local `recipesById` map from the already-loaded `computed`
  array (a plain `useMemo`, no request) and calls V.1's own
  `resolveRecipeVariationContext()` - no per-card/N+1 fetch, no new
  Supabase call of any kind for this whole stage.
- **Deterministic ordering added to `resolveRecipeVariationContext()`**
  (`src/domain/recipeRelationships.js`) - `variations` is now sorted by
  name before returning, since the flat fetch has no `ORDER BY` and
  Postgres never promises row order without one; plain alphabetical
  sorting, not makeability-aware ranking (that's V.4).
- *Acceptance:* a recipe with a base shows "Variation of" with that
  recipe's own card + the saved note (verbatim, never a generated "uses X
  instead" description - the relationship carries no ingredient-delta
  data to generate one from); a recipe with direct variations shows
  "Variations" with all of them; a recipe in the middle of a chain (A←B←C)
  shows both on B, never C's own grandparent/sibling; tapping any card
  navigates to `/library/:id`, its own independent detail page with its
  own real availability badge; a missing/hidden related recipe is dropped
  silently, never a broken card or a crash; neither block ever appears
  when there's nothing to show. **Manually verified by the user,
  2026-09-13:** variation detail correctly shows the base recipe, base
  detail correctly shows its variation, navigation works both ways, and
  the reused `CocktailCard` (own live availability/makeability badge per
  card) reads well in this section - explicitly confirmed to be preserved
  as-is going into V.4, not redesigned.

**V.4 — Makeability-aware presentation + first real catalogue links.
DONE, 2026-09-13.**
- **Presentation preserved exactly as manually verified** - no redesign of
  the "Variation of" / "Variations" blocks, still the full `CocktailCard`
  + optional note caption, still the same grid. V.4 only adds ordering and
  one conditional line of copy on top of what already shipped.
- **Makeability-aware ordering:** `resolveRecipeVariationContext()`
  (`src/domain/recipeRelationships.js`) now sorts `variations` by the
  shared `DISPLAY_TIER_ORDER` (`src/domain/availabilityGroups.js` - the
  same perfect > good > adapted > almost > unavail order Library's grouped
  view and Ingredient Detail's own "cocktails using this" already use)
  first, with V.3's alphabetical order as the tie-break inside a tier - no
  new ranking system, no new sort logic invented for this feature.
- **"Can't make the original?" framing** - new
  `shouldShowMakeableVariationFraming(recipe, variations)`
  (`src/domain/recipeRelationships.js`), reusing a new exported
  `isPossibleTier(tier)` helper (`src/domain/makeabilityCounts.js`, the
  same "perfect/good/adapted count, almost/unavail don't" rule
  `summarizeMakeability()` already uses internally - extracted so this
  feature reads the one existing definition instead of inventing a second
  one). True only when the CURRENT recipe's own tier is not already
  possible AND at least one of its direct variations' tier IS possible -
  false when the base is already makeable (strict or adapted - both
  already count as "possible" under this app's existing semantics, so
  neither is a reason to show the line), and false when no variation is
  makeable either. Rendered as one compact `text-cyan` line inside the
  "Variations" block only (`VariationsSection.jsx`), never inside
  "Variation of" - the framing belongs on the base -> variations side only,
  per the plan; a variation's own page never editorializes about its
  base's makeability. `DetailScreen.jsx` computes the boolean once (via
  this same recipe's own already-computed `display.tier` and each
  variation's own already-computed tier - no new availability computation
  anywhere) and passes it down as a plain prop.
- **Editor wording polish** (small, isolated, included as V.4 per the
  user's own explicit allowance): the "Variation of" label/helper text in
  `EditorScreen.jsx` was ambiguous about direction (which recipe is "the
  variation" - this one, or the one being picked?). Now reads **"Based on
  / variation of (optional)"** with helper text *"If this recipe is a
  variation of another cocktail, select the original/base recipe..."* -
  label/copy only, no field/behavior/data-shape change. **"How it differs
  (optional)"** is left exactly as it was - manual testing confirmed that
  wording already works well.
- **First real catalogue links, written via the app's own normal path:**
  - **Bloody Mary (Practical Version) → Bloody Mary** - already existed
    (created by the user during V.2/V.3 manual verification, through the
    real editor). Reviewed, not duplicated: note reads "Uses Soy sauce
    instead of Worcestershire Sauce and regular salt instead of Celery
    Salt. More common at home" - accurate, kept as-is.
  - **Zombie (Home Bar Spiced & Dark Spec) → Zombie** - inspected both
    recipes' actual ingredients/amounts/prep before linking (no lore, no
    assumptions): the variation uses Dark Rum + Spiced Rum (2 rums)
    instead of Dark + Gold + Demerara Rum (3 rums); Simple Syrup instead
    of Falernum + Cinnamon Syrup; omits Pernod entirely; is shaken over
    ice cubes and strained over crushed ice instead of blended (no
    blender step at all) - genuine, meaningful differences, not a
    cosmetic rename, and both recipes are classic/shared/same family
    exactly as the V.1 catalogue audit found. Linked with the note "Uses
    Dark Rum and Spiced Rum instead of Dark, Gold, and Demerara Rum, and
    Simple Syrup instead of Falernum, Cinnamon Syrup, and Pernod. Shaken
    and strained over ice instead of blended - easier with common
    home-bar ingredients and no blender needed." Written by calling
    `save_recipe()` - the same atomic RPC `EditorScreen.jsx`'s own Save
    button calls - with the variation's existing fields/components/taste
    tags rebuilt directly from its own current rows (a like-for-like
    re-save, verified byte-for-byte unchanged afterward) plus the new
    `p_variation_of`, under a simulated real authenticated admin identity
    (the same identity-switching technique `supabase/tests/rls_suite.sql`
    already uses) so RLS's actual `recipe_is_editable` rule is what
    authorized the write - not a raw `insert` bypassing it.
- *Acceptance:* both pairs show correctly (verified by direct DB query -
  see `current-context.md`'s chunk entry for the exact verification
  queries); sort order matches makeability tier, alphabetical inside a
  tier; the framing line is presentation-only and appears/disappears
  exactly per the rule above (13 new domain tests cover every combination);
  neither recipe's own fields, components, or taste tags changed from
  writing the new relationship.
- **Recorded, not built this stage (see "Manual-test findings" below):**
  a sticky recipe-name header in the editor while scrolling - a separate,
  small UX follow-up, out of scope for V.4's own explicit instructions.

**V.5 — Bugfix: directional note placement + layout width polish + final
wording clarity + mobile responsive layout (manual-verification
findings). DONE, 2026-09-13.**
- **The bug.** The stored relationship `note` is directional - it always
  means "how the variation differs from its base," never the reverse.
  V.3/V.4's rendering on a variation's own page ("Variation of") showed
  the note as a small caption directly under the BASE recipe's card -
  the exact same treatment a variation's own note gets under ITS card on
  a base's page. That treatment is correct in the base→variations
  direction (the note there really does describe the card it sits under)
  but wrong in the variation→base direction: the note describes the
  CURRENT recipe (the variation), not the base card shown above it.
  Concretely, opening **Bloody Mary (Practical Version)** showed "Uses
  Soy sauce instead of Worcestershire Sauce..." directly under the
  **Bloody Mary** card, visually implying the note was about Bloody Mary
  itself - it isn't; Bloody Mary uses Worcestershire and Celery Salt, the
  practical version is the one using Soy sauce and regular salt. Same
  problem for the Zombie pair.
- **The fix (presentation only - `src/components/detail/
  VariationsSection.jsx`):** on a variation's own page, the base's
  `CocktailCard` now renders alone in its grid, with `base.note` pulled
  out into its own explicitly-labeled block below the grid - **"How this
  version differs"** - so it can no longer be mistaken for a caption on
  the base's card. On a base's own page, each variation's own note is
  completely unchanged - still a small caption directly under that
  variation's own card, which already reads correctly in that direction
  (per the plan's own original design) and needed no new heading.
  Deliberately does **not** attempt to rewrite, invert, or regenerate the
  note text for either direction - the stored note may not be
  mechanically invertible, so both sides always render the exact same
  stored string, only the LAYOUT differs by direction.
- **Not touched, confirmed by inspection:** the relationship schema, the
  stored note itself, the relationship's direction/FK, `computeAvail()`/
  `computeMakeability()`, the V.4 makeability-tier ordering, the V.4
  "Can't make the original?" framing, `CocktailCard`, and the live Bloody
  Mary/Zombie catalogue rows - all unchanged; the diff touches exactly one
  component (layout) and its own tests.
- **Layout width polish (second manual-verification finding, same day).**
  The "How this version differs" block above was initially placed BELOW
  the whole grid, at the grid's own full container width - fine for a
  short note (Bloody Mary), but the longer Zombie note stretched into one
  very long line spanning almost the entire Cocktail Detail width,
  visually disconnected from the base card above it. Fixed by moving the
  note INSIDE the same grid cell as the base's own card (a `flex
  flex-col` wrapper) - exactly the structure the "Variations" side
  already uses for each variation's own caption, reused rather than a new
  hardcoded width. The note now wraps naturally within one grid column's
  own width at every breakpoint (`grid-cols-2 md:grid-cols-3
  lg:grid-cols-4`, unchanged), directly under the card it belongs to - no
  manual line breaks, no change to the card's own size, mobile-first
  responsive by construction since it's governed by the same grid
  breakpoints as everything else in this section. The "Variations" side
  was reviewed against the same concern and needed no change - each
  variation's own note already lives inside its own per-card column
  wrapper, so it was never at risk of stretching full-width in the first
  place. Pure CSS/JSX-structure change - no domain logic, no new tests
  needed beyond confirming the existing suite still passes unchanged.
- **Final wording clarity (third manual-verification finding, same day -
  the user found this ambiguous themselves while testing).** Even with
  the base card and the note visually separated (the fixes above), the
  generic heading **"How this version differs"** was still easy to
  misread as being about the BASE card shown directly above it, rather
  than about the CURRENT recipe (the variation whose page it is). Fixed
  by naming the current recipe explicitly in the heading: **"How Bloody
  Mary (Practical Version) differs"**, **"How Zombie (Home Bar Spiced &
  Dark Spec) differs"** - since the note always describes the variation
  relative to its base, naming the variation removes the ambiguity
  entirely. New pure `formatVariationDifferenceHeading(currentRecipeName)`
  (`src/domain/recipeRelationships.js`) builds the string; `DetailScreen
  .jsx` passes its own `c.name` (the current recipe's own name, already on
  hand - no new lookup) into `VariationsSection.jsx`'s new
  `currentRecipeName` prop. Deliberately does not truncate the name - an
  exceptionally long one is allowed to wrap onto a second line (ordinary
  page content, unlike the sticky editor header's fixed-height chrome),
  and still sits inside the same single grid-column width the layout-width
  polish above already established, so it wraps safely rather than
  overflowing. The base→variations direction was reviewed and needed no
  change - that note is already directly associated with the variation's
  own card it describes, with no comparable ambiguity.
- **Mobile responsive layout (fourth manual-verification finding, mobile
  testing).** Both relationship grids used `grid-cols-2 md:grid-cols-3
  lg:grid-cols-4` - the same sequence Library's/Ingredient Detail's own
  multi-card grids use, deliberately left unchanged there since this fix
  is scoped to this one component. That 2-column mobile tier is right for
  a grid usually browsing MANY cards at once, but "Variation of" always
  shows exactly ONE card - on a narrow phone, a 2-column grid gave that
  one card (and its note, sharing the same column per the earlier layout-
  width polish) only about half the usable width: the card looked
  unnecessarily skinny, the dynamic "How <name> differs" heading wrapped
  excessively, and the note squeezed into a narrow vertical strip. Fixed
  by changing both grids to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3
  lg:grid-cols-4` - one card per row on the narrowest phones (full
  relationship-section width, never full-bleed past the page's own
  content padding), a new `sm:grid-cols-2` step reusing a breakpoint this
  app already uses elsewhere (`IngredientTypeEditor.jsx`'s own form-field
  grid), with the existing `md`/`lg` tiers kept exactly as they were. On a
  base's page with multiple variations, mobile now shows them one
  full-width row at a time too, each with its own note at full readable
  width - the same fix applies to both directions. `CocktailCard` itself
  is untouched - it lays out per the viewport breakpoint, not its own
  container width, so a wider grid cell on mobile simply gives it more
  room, not a different code path. Pure CSS/JSX-structure change (two
  class-string edits) - no domain logic touched, so no new tests needed
  beyond confirming the existing suite still passes.
- *Acceptance:* opening a variation shows its base's card alone, with the
  saved note in its own "How <this recipe's own name> differs" block,
  constrained to the same width as the card's own grid column and wrapping
  naturally at every breakpoint - never a full-page-width line, never a
  caption on the base card, and never nameable as the base's own note;
  opening a base still shows each variation's own note as a caption
  directly under that variation's own card, unchanged from V.3; the exact
  same stored note string renders unchanged from either direction (2 new
  domain tests for the note itself: same note through both
  `resolveRecipeVariationContext()` perspectives; a note-less relationship
  resolves to `note: null` cleanly on both sides - plus 3 new domain tests
  for the heading itself: it names the current variation, never a base;
  it does not truncate an exceptionally long name); on a narrow phone
  (~360-390px) the relationship card and its note now use the full
  available content width instead of half of it, the heading and note
  wrap into normal paragraph-sized lines, and the denser 2/3/4-column
  grid still applies at tablet/desktop widths; the existing V.4
  makeability-tier ordering and framing tests all still pass unchanged,
  since no domain logic used by any of V.5's four fixes touched them.

Each stage: `corepack pnpm@10.34.3` test + build, isolated-LF
`oxfmt --check`, RLS suite re-run after V.1's migration, `db advisors
--type security` after V.1, commit + push, then a short manual check —
independently shippable, same discipline as every prior staged feature
this session.

**Explicitly deferred (not v1, recorded so a later session doesn't
re-derive why):** a variation's own page showing sibling variations;
walking/displaying multi-hop chains; a friendly client-side "that would
create a cycle" message in the editor (V.1 only has the DB-level
rejection - see Admin/editor UX); a Library/Home card "Variation" badge;
batch-import variation references; relationship data on the public share
page; collapsing/grouping near-duplicate variations in discovery; any
`relationship_type` beyond "variation of." **V.4 adds no new deferrals to
this list** - no recursive family tree, no siblings/grandparents, no
recipe inheritance, no import support, no variation badges, no
availability propagation, no special variation availability tier, no new
relationship type - all confirmed still true by inspection of the actual
V.4 diff (presentation + two catalogue rows only).

---

## Manual-test findings (Stage V.2/V.3 verification, 2026-09-13) - recorded, not both built in V.4

**Editor: keep the recipe name visible while scrolling.** Discovered
during manual testing - when scrolled deep into a long Edit Recipe form,
the sticky top bar/header no longer shows which recipe is being edited.
**Not built in V.4** - out of scope per the explicit V.4 instruction not
to restructure the editor. **Built as a separate, general Recipe Editor
UX chunk, 2026-09-13** (not a Linked Variations stage - this doc records
it only because Linked Variations manual testing is what found it): the
existing (already-sticky) `TopBar` gained an optional `subtitle` slot;
`EditorScreen.jsx` now shows the recipe's own persisted name as the
title, with "Edit Recipe" demoted to that subtitle - see
`current-context.md`'s own chunk entry for the full detail (shared
component, persisted-vs-draft handling, tests).

**Editor: "Variation of" direction wording - built in V.4** (small and
isolated enough to include, per the user's own explicit allowance - see
the Staged implementation plan's V.4 entry above for exactly what
changed). "How it differs (optional)" needed no change - manual testing
confirmed that wording already works well.

---

## Testing plan

**Status: V.1, V.2, V.3, V.4, and V.5's share of this plan are all DONE -
see the exact tests/results recorded in the Staged implementation plan's
V.1/V.2/V.3/V.4/V.5 entries above.** The sub-sections below are the
original testing plan, kept as the checklist each stage was measured
against (all satisfied).

**V.5's specific additions:** 2 domain tests for the note-direction bugfix
in `recipeRelationships.test.js` - the same stored note string resolves
unchanged from both directions (`resolveRecipeVariationContext()` called
once from the variation's own perspective, once from the base's); a
note-less relationship resolves to `note: null` cleanly on both sides.
The layout-width polish added no tests (pure CSS/JSX structure, no domain
logic). The final wording-clarity fix adds 3 more: new
`formatVariationDifferenceHeading()` names the current variation
recipe (never a base - the function structurally has no "base name"
parameter to substitute in by mistake, confirmed by asserting its arity);
it does not truncate an exceptionally long recipe name. The mobile
responsive-layout fix (two grid class strings changed from `grid-cols-2
md:grid-cols-3 lg:grid-cols-4` to `grid-cols-1 sm:grid-cols-2
md:grid-cols-3 lg:grid-cols-4`) added no tests either, same reasoning as
the layout-width polish. Every actual LAYOUT/placement change across all
four V.5 fixes (note moved off the base card, note constrained to column
width, heading text now dynamic, mobile single-column grid) is
component-level and structural - matching this project's own honest,
established testing limits (no jsdom/component rendering available,
confirmed again here) - verified by reading the code rather than an
automated render test; manual verification is what actually confirms the
visual placement. No V.4 test needed to change across any of V.5's four
fixes - the makeability-tier ordering and framing logic were never
touched, and the full existing suite (V.1-V.4) passes unchanged throughout,
confirming that directly.

**V.4's specific additions:** 13 new domain tests total -
`recipeRelationships.test.js` gains: variations ordered by display tier
regardless of input row order; alphabetical tie-break inside a shared
tier; `shouldShowMakeableVariationFraming()` shown when the base is not
possible and a variation is (including the "adapted counts as possible"
case, not just perfect/good); hidden when the base is already possible
(strict OR adapted); hidden when no variation is possible; hidden with no
variations at all; null-safe for a missing recipe; falls back to the bare
`avail` string when `display` is absent, matching every other consumer of
this rule. `makeabilityCounts.test.js` gains 4 tests for the newly
extracted `isPossibleTier()` helper itself. No RLS-suite change (V.4 adds
no new migration/function - the two catalogue relationship writes went
through the existing `save_recipe()` RPC, already covered by the RLS
suite's own `save_recipe()` block from the V.2 atomicity fix).

**V.3's specific additions:** 2 new domain tests for
`resolveRecipeVariationContext()` - a recipe in the middle of a chain
resolves BOTH its base and its direct variations at once (proving a
recipe can legitimately show both blocks); a base with multiple direct
variations returns all of them sorted deterministically by name
regardless of the input rows' own order. No RLS-suite change (V.3 reads
already-fetched, already-RLS-filtered data - no new query, no new
migration). The new `VariationsSection.jsx` component's own rendering/
navigation behavior (clicking a card, the section disappearing when
there's nothing to show) is untested by an automated component test,
matching this project's own honest, established testing limits (no
jsdom/component rendering) - `if (!base && variations.length === 0)
return null` and each card's `onClick={() => navigate(...)}` are both
one-line, directly-readable guarantees, not something a test framework
is needed to prove; manual verification is what actually confirms the UI.

**V.2's specific additions (beyond what V.1 already covered):** 3 new
domain tests for `resolveVariationCandidates()` (self-exclusion; a
not-in-list or brand-new-recipe id excludes nothing; null-safety).

**V.2's atomicity correction (same day) replaced the RLS-suite block
above** - `set_recipe_variation_of()` is dropped, so its own tests are
gone with it; a new block exercises `save_recipe()` directly instead:
creates a relationship together with a recipe field change, in one call;
a valid chain through the RPC; **the actual regression test** - a call
that renames a recipe AND reassigns it to a base that would create a
cycle is rejected wholesale, and afterward BOTH the recipe's name AND its
original relationship (base + note) are asserted unchanged (proving the
whole function's atomicity, not just the relationship's own delete-then-
insert); a successful call changes the recipe's fields AND its
relationship together; passing a null base removes the relationship
without touching the recipe's own row; the create path (`p_recipe_id:
null`) returns a new recipe owned by the caller; a non-editor is denied
(the explicit "0 rows touched" check, matching `save_ingredient_type()`'s
own precedent) and changes nothing; anon has no EXECUTE grant at all. The
editor's own UI behavior (Cancel-makes-no-writes, error-without-losing-
the-draft) is structural, matching this project's own honest testing
limits (no jsdom/component rendering) - verified by reading the code
path, not an automated component test: `handleSave`'s catch block only
calls `setError()`, never resets any other field.

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
  (unique violation); a self-link is rejected (caught by the cycle
  trigger as a degenerate zero-length cycle - not a plain check violation,
  since the BEFORE trigger fires first); a direct cycle (A→B→A) is
  rejected; a longer cycle (A→C→B→A) is rejected; a valid non-cyclic chain
  (A←B←C) is allowed; the link is invisible to a member who can't see the
  private side; deleting either recipe cascades the relationship row;
  anon denied on all operations.

**Editor (structural, matching this project's own honest testing limits —
no jsdom/component rendering available):** Cancel-makes-no-writes is
structural (Cancel never calls a save function); the picker's self-
exclusion is verified the same way `TypeComboBox`'s own exclusion logic
would be — a plain filter, testable as a pure function if it's factored
out that way (recommended, mirroring `TypeComboBox`'s own precedent of
taking a pre-filtered list from its caller).

**Manual verification (V.2/V.3, using a test/fixture relationship) - DONE
by the user, 2026-09-13.** The checklist below was written for V.3 (before
any live catalogue link existed, per the explicit instruction not to
create one yet) and was worked through with a test/fixture relationship,
confirming: "Variation of" assignment saves correctly; the "How it
differs" note round-trips; variation detail correctly shows the base
recipe; base detail correctly shows its variation; navigation works both
ways; the reused `CocktailCard` (own live availability/makeability status
per card) reads well in this section.

**Manual verification of V.4 (real Bloody Mary/Zombie data) - done by the
user, 2026-09-13, and it found the V.5 bug above.** Opening Bloody Mary
(Practical Version) and Zombie (Home Bar Spiced & Dark Spec) confirmed the
relationships, cards, and navigation all work - but also surfaced that the
note rendered directly under the BASE card visually read as a description
of the base, not of the variation being viewed. Fixed in V.5.

**Manual verification of the first V.5 fix (directional note placement) -
done by the user, 2026-09-13, via screenshots, and it found the layout
width bug above.** The note correctly moved off the base's card and into
its own "How this version differs" block - direction/semantics confirmed
right - but that block was still full container width, and the longer
Zombie note stretched into one very long line, visually disconnected from
the card. Fixed by the layout width polish above (same day).

**Manual verification of the layout width polish - done by the user,
2026-09-13, during final manual testing, and it found the wording
ambiguity above.** The note now correctly stayed within the base card's
own column width and wrapped naturally - no layout complaint this round -
but even separated and width-constrained, the generic "How this version
differs" heading was still easy to misread as being about the base card
shown directly above it. Fixed by the final wording-clarity polish above
(same day).

**Manual verification of the final wording-clarity fix - done by the
user, 2026-09-13, during mobile testing, and it found the responsive-
layout bug above.** The heading correctly named the current recipe - no
wording complaint this round - but on a phone-width viewport the whole
relationship block (card + note) was landing in a narrow ~half-width grid
cell, making the card look skinny, the new dynamic heading wrap
excessively, and the note read as an unnecessarily narrow vertical
column. Fixed by the mobile responsive-layout polish above (same day).

**Manual verification still owed for the mobile responsive-layout fix
(not yet browser-checked this stage):**
- At a narrow phone width (~360-390px), open **Bloody Mary (Practical
  Version)** → confirm the Bloody Mary card now spans the full
  relationship-section width (one card per row, not a skinny half-width
  tile), and the "How Bloody Mary (Practical Version) differs" heading +
  note wrap into normal paragraph-sized lines at that width.
- At the same width, open **Zombie (Home Bar Spiced & Dark Spec)** →
  confirm the same for its (longer) note.
- Open **Bloody Mary** and **Zombie** (the base pages) at the same narrow
  width → confirm each variation's own card + note also now takes a full
  row, still directly associated with its own card, unchanged in every
  other respect from V.3.
- Widen to tablet, then desktop width → confirm the denser multi-column
  grid returns (2 columns at `sm`, 3 at `md`, 4 at `lg`), matching the
  app's existing card-grid convention at those wider sizes.
- Confirm the sticky top bar/header and bottom navigation are unaffected
  by this change (this fix only touches the relationship grid's own
  column count).
- Confirm the V.4 "Can't make the original?" framing still appears/
  disappears correctly and both pairs' own ingredient lists/steps/badges
  remain completely unaffected.

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
