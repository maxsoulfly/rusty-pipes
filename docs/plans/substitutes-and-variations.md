# Suggested Substitutes & Linked Cocktail Variations

**Planning document — 2026-09-10. Not started. Review before implementation.**

Covers three related pieces of "what else can satisfy or stand in for a
recipe":

1. **Ingredient forms ("Can provide")** — already shipped as Concept 2 in
   `docs/plans/household-basics-ingredient-forms-preparations.md`; this doc
   revises *where it is managed* and fixes one bug. The table, engine, and
   one-direction rule are unchanged.
2. **Suggested substitutes** — new.
3. **Linked cocktail variations** — new.

**Homemade Preparations (Concept 3) stays in the other plan doc, separate and
unstarted.** This doc only notes where it touches the same UI slot so it can
slot in later without rework.

---

## Confirmed by the user (2026-09-10)

- Lemon → Lemon Juice works, with preparation guidance shown on the recipe.
- Owning Lime Juice does **not** satisfy a whole-Lime requirement (Caipirinha).
- The revised Ingredient Forms admin layout is more comfortable to use.
- Editing a conversion's guidance saves and persists after reload.
- **Bug:** the "add conversion" guidance box autofills "Squeeze fresh juice
  from &lt;raw&gt;", which is nonsense for e.g. White Sugar. **Approved fix:**
  new guidance starts **blank** with an example **placeholder**; existing
  saved guidance is left exactly as it is.

---

## What already exists (audit of live schema + code)

### Ingredient forms — "Can provide" (Concept 2, shipped)

- Table `ingredient_form_conversions (id, raw_type_id, prepared_type_id,
  guidance)` — `20260910140000`. Directional; a BEFORE trigger refuses the
  inverse pair; `check (raw_type_id <> prepared_type_id)`, `unique (raw,
  prepared)`, guidance non-blank ≤200. RLS: `is_member()` read /
  **`is_admin()`** write. Seed: Lemon→Lemon Juice, Lime→Lime Juice.
- `computeAvail()` (`src/domain/availability.js`) takes a 5th arg
  `formConversions` and resolves each component: **(1)** exact availability
  (owned / household basic) → **(2)** a form conversion whose raw side is
  available → **(3)** an authored `recipe_component_alternatives` entry.
  First match wins. Returns a `formConversions` map ({ rawId, rawName,
  guidance }) parallel to `substitutions` and `householdBasics`.
- Managed today in a **standalone "Ingredient forms" admin tab**
  (`src/components/admin/IngredientFormsTab.jsx`, `adminOnly`). Reworked
  2026-09-10 to compact rows + reveal-on-demand add form + collapsed inline
  searchable pickers.
- `IngredientsSection.jsx` renders the guidance in the same one sub-label
  slot as "Substituting: …" and "Household basic" (mutually exclusive).

### Substitutions

- Table `recipe_component_alternatives (id, recipe_id, recipe_component_id,
  ingredient_type_id, unique(recipe_component_id, ingredient_type_id))` —
  `20260815222739`. **Per recipe component only.** No note / guidance
  column. RLS: read via `recipe_is_visible(recipe_id)`, insert/delete via
  `recipe_is_editable(recipe_id)` — **no UPDATE** (edit = delete + re-insert).
- `mapRecipe()` (`src/services/recipes.js`) flattens these into
  `component.alternativeIds`. `computeAvail()` treats one owned alternative
  as satisfying the slot — **it affects availability** — and reports it in
  the `substitutions` map, rendered as **"Substituting: X"** with no flavor
  note.
- Edited only in the **recipe editor** (`EditorScreen.jsx` →
  `IngredientRowsEditor` per-component "alternative" chips, resolved by exact
  name/alias, committed as a chip only once it resolves to a real type).
  There is **no ingredient-level or admin-level** substitution management,
  and no general "spiced rum can stand in for white rum" concept anywhere.
- The spec's `substitution_groups` (§8.2 data model) was deliberately folded
  into `recipe_component_alternatives` — "recipe_components already IS the
  slot" (migration header comment). Spec §10.1(4): "one allowed item from
  its substitution group" satisfies a component.

### Linked variations / related recipes

- **Nothing is built.** `20260815214307_recipes_schema.sql` header:
  *"Deliberately NOT in this migration: substitution_groups and
  recipe_relationships (variations) — schema for those lands when something
  actually consumes them."* Spec lists it repeatedly (§7.3, §7.5 "link it as
  a variation of another recipe", §8.2 data model `recipe_relationships`, §5
  admin "Manage cocktail families and recipe relationships").
- Closest existing behavior: **Clone** — `EditorScreen` reads `?clone=<id>`,
  prefills a fresh private recipe named `"<name> (My Version)"`. It is a
  pure copy: **no stored link** back to the source.
- `recipes.original_owner_id` + `admin_promote_recipe_to_classic()` /
  `admin_demote_recipe_to_community()` exist, but only carry authorship
  through a classic promotion — not a variation link.
- `DetailScreen.jsx` has **no** "Variations" / "Related recipes" section.
- `recipes` UPDATE is column-restricted: `grant update (name, description,
  glass_id, family_id, liquid_color, liquid_color_2, steps)`. Adding a
  `variation_of_id` column would mean re-issuing that grant — a separate
  relationship table avoids touching it.

### The ingredient type editor (`src/components/IngredientTypeEditor.jsx`)

- Reached from **Admin → Ingredient Types → (tap a type) → Edit**. Fields:
  name, category, parent type, bar priority, **Household basic** toggle,
  color, icon, and **aliases managed inline** (add/remove chips). Save →
  `updateIngredientType()`.
- Aliases were put here on purpose, per an earlier user request: *"managing
  'Sec → Triple Sec' reads more naturally next to Triple Sec's own name than
  in a global table."* **This is the precedent for moving "Can provide" and
  ingredient-level substitutes here.**
- Mobile-first card form using `Select` / `CategoryPicker` /
  `ColorSwatchPicker` / `ShapePicker` primitives.
- Writable by **admin *and* moderator** (via `ingredient_types` RLS's
  `is_admin_or_moderator()` — the tab itself has no separate role gate).
  Note the mismatch: the Household-basic toggle here is moderator-writable,
  but `ingredient_form_conversions` is admin-only. See open decision D3.

### The recipe editor (`src/screens/EditorScreen.jsx`)

- Members create/edit **private** recipes; owners + admin edit any of their
  own; classic catalog is admin-only. Per-component alternative chips are
  the only substitution UI. No "variation of" field despite the spec.

---

## The model — how forms, substitutes, and variations interact

Two distinct levels:

- **Component level** — "can this one slot in the recipe be filled?" Forms
  and recipe-scoped substitutions live here and **change the recipe's
  availability state**.
- **Recipe level** — "is there a *different recipe* I could make instead?"
  Variations live here. They **never touch `computeAvail`**; each variation
  has its own availability from its own ingredients.

### `computeAvail` precedence (per component — unchanged four tiers)

1. **Exact availability** — owned, product-mapped, compatible child type, or
   a household basic. No label (or "Household basic").
2. **Form conversion ("Can provide")** — a registered raw→prepared pair
   whose raw side is available. Label: the guidance text.
3. **Recipe-scoped substitution** — an entry in
   `recipe_component_alternatives` for *this* component is available. Label:
   "Substituting: X" (+ the new optional flavor note).

First match wins; labels never stack. The `avail` tiers (Perfect / Good /
Almost / Unavailable) are unchanged.

### What affects availability vs. what is only a suggestion

| Mechanism | Level | Scope | Affects `avail`? | Where shown |
|---|---|---|---|---|
| Form conversion ("Can provide") | component | ingredient-wide | **Yes** (tier 2) | inline on the component row — guidance text + green dot |
| `recipe_component_alternatives` (existing) | component | one recipe | **Yes** (tier 3) | inline — "Substituting: X" + green dot |
| **Recipe-scoped substitution rule** (new) | component | one recipe (opt-in) | **Yes** (tier 3, same as above) | inline — "Substituting: X — *drier, less sweet*" |
| **General ingredient substitution** (new) | ingredient | catalogue-wide | **No** — suggestion only | on a **missing** component row — a muted "Try: Spiced Rum — *sweeter, warm spice*" hint, no green dot |
| **Linked variation** (new) | recipe | one linked recipe | **No** — variation has its own `avail` | a "Variations" block below the ingredient list |

The single rule that keeps this honest: **anything catalogue-wide and
automatic is a suggestion; anything that changes a Perfect/Almost result was
explicitly attached to that specific recipe by someone who can edit it.**
That is exactly the user's rum example — spiced rum can be *suggested*
anywhere white rum is missing, but it only *counts* in the specific
cocktails where a curator said so.

### Keeping the original recipe and any flavor change clear

- A variation is always its **own named recipe** with its own source badge
  (Classic / Community / Private) and author line — nothing about linking
  changes attribution or visibility.
- On recipe **A**, a linked variation **B** is shown as: *"Variation:
  **&lt;B's name&gt;** — &lt;short "how it differs" note&gt;"* with B's own
  availability badge. Tapping it opens B's own detail page.
- The note is a plain sentence the linker writes ("Uses Galliano instead of
  Campari — sweeter, more herbal, less bitter"). No auto-generated
  equivalence claim.
- Substitution flavor notes are similarly plain and always phrased as a
  change, never "the same as": "*drier, less sweet*", "*sweeter, warm
  spice*".

---

## Part 1 — Ingredient forms: "Can provide" moves into the ingredient type editor

**No schema change. No engine change.** `ingredient_form_conversions`, the
trigger, RLS, and `computeAvail`'s tier 2 all stay as they are.

### 1a. Guidance autofill fix (do this first, standalone-safe)

- Remove the `suggestedGuidance` / `effectiveGuidance` logic. The add-form
  guidance field starts as `""`; the `<Input>` gets
  `placeholder="e.g. Squeeze fresh juice from Lemon"`.
- Existing rows: the **edit** path already seeds from `row.guidance` — leave
  it untouched. No data migration.
- Applies wherever "add a conversion" lives — the interim standalone tab now,
  and the editor section below by design.

### 1b. "Can provide" section in `IngredientTypeEditor`

- New collapsible section on the editor card, below Aliases (both are
  "relationships from this ingredient to others"): **"Can provide"**.
- For the type being edited (always the **raw** side): a compact list of the
  prepared types it provides — "→ Lemon Juice · *Squeeze fresh juice from
  Lemon*" — each with an inline **edit guidance** and **remove**. A
  **"+ Add"** row opens a collapsed searchable type picker (same
  `TypeComboBox` pattern as the reworked tab) + a guidance text field
  (blank, placeholder). 44px targets, no horizontal overflow.
- Backed by the existing `src/services/ingredientForms.js`
  (`fetch/create/updateGuidance/delete`), filtered to
  `raw_type_id === type.id`. Writes go through the same RLS. After a write,
  `catalog.refetch()` (the editor already receives `catalog`/`onSaved`-style
  props) so every recipe re-resolves.
- The DB still refuses a self-pair, a duplicate, and the inverse; those
  errors surface inline exactly as they do now.

### 1c. Retire the standalone tab

- Once 1b is in and verified, delete `IngredientFormsTab.jsx`, its
  `AdminScreen` `TABS` entry `{ id: "forms", … }`, and the render guard.
- The `ingredient_form_conversions` RLS suite block stays (the table is
  unchanged). Its unit tests are unaffected.
- If any doc/onboarding text points at the tab, repoint it at "the Can
  provide section of an ingredient's editor".

---

## Part 2 — Suggested substitutes

### 2a. Reuse first — `recipe_component_alternatives`

It already does recipe-scoped, availability-affecting substitution. Keep it
as the mechanism for **recipe-scoped rules**. Two small additions:

- **`note text` column** (nullable, ≤200 chars) — the flavor-change line.
  `mapRecipe()` carries it onto each `alternativeIds` entry (shape becomes
  `{ id, note }` or a parallel `alternativeNotes` map — implementation
  detail). `computeAvail()`'s `substitutions` map gains `note`.
  `IngredientsSection` appends it: "Substituting: Rye — *spicier, drier*".
- The recipe editor's per-component alternative chip gains an optional
  one-line note field.

No new availability path, no behavior change for existing rows (note is
null → renders exactly as today).

### 2b. New — ingredient-level curated substitutions (suggestion-only)

A catalogue-wide, directional, **non-availability** layer, managed in the
ingredient type editor next to "Can provide".

```
ingredient_substitutions (
  id                uuid primary key default gen_random_uuid(),
  from_type_id      uuid not null references ingredient_types(id) on delete cascade,
  to_type_id        uuid not null references ingredient_types(id) on delete cascade,
  flavor_note       text not null check (char_length(btrim(flavor_note)) between 1 and 200),
  constraint different check (from_type_id <> to_type_id),
  unique (from_type_id, to_type_id)
)
```

- **Directional, not symmetric, no inverse guard.** "White Rum → Spiced Rum:
  *sweeter, warm baking spice*" and "Spiced Rum → White Rum: *cleaner, drier*"
  are both legitimate and say different things. (This is the deliberate
  difference from `ingredient_form_conversions`, which *is* one-way-only and
  guards the inverse.)
- **Never read by `computeAvail`.** It is surfaced only as UI:
  - On a recipe's **missing** required component for `from_type_id`, show up
    to N (2–3) muted suggestion chips: "Try **Spiced Rum** — *sweeter, warm
    spice*". Visually distinct from a satisfied row — no green dot, muted
    color, not in the "Substituting:" slot.
  - Optionally on the ingredient/bottle **detail page** ("commonly stands in
    for: …") — nice-to-have, not required for v1.
- **Editor UI:** "Suggested substitutes" section on `IngredientTypeEditor`,
  showing rows where `from_type_id === type.id` — "→ Spiced Rum · *sweeter…*"
  with edit-note / remove, and a "+ Add" (collapsed searchable picker + note
  field). Same component pattern as "Can provide".
- **Promote to a recipe rule:** on a recipe's missing row, an editor of that
  recipe sees a "Use in this recipe" affordance on a suggestion chip → it
  inserts a `recipe_component_alternatives` row for that component (carrying
  the `flavor_note` as the new `note`), which *does* then affect that
  recipe's availability. This is the bridge from "general idea" to
  "counts here", always an explicit per-recipe opt-in.

### 2c. RLS

- `ingredient_substitutions`: `is_member()` read; **write =** see open
  decision D3 (admin-only, to match `ingredient_form_conversions`, or
  admin+moderator, to match the editor's home). Policies scoped
  `to authenticated` from the start (the `to public` slip cost us a
  follow-up migration twice already).
- `recipe_component_alternatives.note`: no policy change — the existing
  `recipe_is_editable` insert/delete already governs the row. (Editing a
  note = delete + re-insert, like every other field on that table.)

---

## Part 3 — Linked cocktail variations

### 3a. Model

```
recipe_relationships (
  id                 uuid primary key default gen_random_uuid(),
  recipe_id          uuid not null references recipes(id) on delete cascade,  -- the variation
  related_recipe_id  uuid not null references recipes(id) on delete cascade,  -- the original
  relationship_type  text not null default 'variation_of' check (relationship_type in ('variation_of')),
  note               text check (char_length(btrim(note)) between 1 and 280), -- "how it differs"
  created_at         timestamptz not null default now(),
  constraint different check (recipe_id <> related_recipe_id),
  unique (recipe_id, related_recipe_id, relationship_type)
)
```

- **One-way link, owned by the variation.** "Recipe B is a variation of
  recipe A." B's editor sets it; A's owner is not asked (open decision D4).
- `relationship_type` is an enum-style check with one value now — leaves room
  for `related_to` later without another schema change, but v1 ships only
  `variation_of`.
- Cascade on both sides: deleting either recipe drops the link.
- **No `kind`/`produces` columns, no `glass_id` relaxation** — a variation is
  a perfectly ordinary recipe. This is what keeps it clear of Homemade
  Preparations (Concept 3), which *does* need those.

### 3b. Availability — the Negroni / Galliano example

- `computeAvail` is **untouched**. Missing Campari ⇒ Negroni stays
  `almost`/`unavail` exactly as now.
- On the Negroni detail page, a **"Variations"** block lists linked recipes
  the viewer can see, each with **its own** availability badge computed from
  **its own** components. A user who owns Galliano (and the rest) sees their
  linked "Negroni with Galliano" as `Perfect` there, offered as *"you could
  make this instead"* — never presented as "Negroni is now available".
- Sort: makeable variations (`perfect`/`good`) first, then by name. Consider
  only showing the block when the current recipe is *not* `perfect` (so it
  reads as a fallback, not clutter) — open decision D5.

### 3c. Attribution / visibility / private-recipe access

- A variation renders with its **own** source badge and author line —
  unchanged.
- **The link is shown only when the linked recipe is visible to the
  viewer** under the existing rules (`recipe_is_visible`): your own private
  variation shows only to you; a published community variation shows to
  everyone who can already see community recipes; nothing new is exposed.
- So a Classic recipe like Negroni can accumulate links from many members,
  but each viewer sees only the subset they'd be allowed to open anyway.
  No new social surface, no new visibility state. (Matches the spec's "not a
  social network".)
- Deleting/unpublishing a recipe: cascade removes its links; an unpublished
  variation simply stops appearing for non-owners (its rows still exist,
  gated by `recipe_is_visible`).

### 3d. RLS

```
alter table recipe_relationships enable row level security;

-- read: you can see the link if you can see BOTH recipes
create policy "recipe_relationships: read" on recipe_relationships
  for select to authenticated
  using (recipe_is_visible(recipe_id) and recipe_is_visible(related_recipe_id));

-- write: you can link/unlink FROM a recipe you can edit
create policy "recipe_relationships: insert" on recipe_relationships
  for insert to authenticated with check (recipe_is_editable(recipe_id));
create policy "recipe_relationships: delete" on recipe_relationships
  for delete to authenticated using (recipe_is_editable(recipe_id));
-- no update (edit the note = delete + re-insert, matching recipe_component_alternatives)
```

- `recipe_is_visible` / `recipe_is_editable` are the existing SECURITY
  DEFINER helpers — no new function, no new grant.
- **Add a `recipe_relationships` block to `supabase/tests/rls_suite.sql`**:
  owner links their variation; a non-owner can't link from someone's recipe;
  the link is invisible to a member who can't see the private side; deleting
  a recipe cascades the link; anon denied.

### 3e. Recipe editor + detail display

- **Editor:** one optional field — "Variation of" — a searchable recipe
  picker (visible recipes only) + a short "how it differs" note. Saving the
  recipe upserts/removes the single `recipe_relationships` row. Cloning
  (`?clone=`) can pre-fill "Variation of" = the clone source (opt-in
  checkbox, not automatic).
- **Detail:** a "Variations" section under the ingredient list, each item =
  name + its `AvailBadge` + the note, linking to that recipe.

---

## Mobile-first flows

- **Curate "Can provide" / "Suggested substitutes":** Admin → Ingredient
  Types → search → tap type → **Edit** → scroll to the section → "+ Add" →
  collapsed searchable picker opens inline (bounded, scrollable, collapses on
  pick) → short text field → Save. All controls ≥44px; the picker stays
  inline (no overlay) so the keyboard doesn't cover the field or the Save
  button; nothing scrolls sideways.
- **Curate a recipe-scoped substitution / flavor note:** in the recipe
  editor, on the component's existing alternative chip — add the chip as
  today, then an optional one-line note beneath it.
- **Link a variation:** recipe editor → "Variation of" field → search →
  pick → note → Save.
- **Browsing (`DetailScreen`):**
  - A satisfied-by-substitution row: "Substituting: Rye — *spicier*" (green
    dot, existing slot).
  - A missing row with catalogue suggestions: a muted line "Try: Spiced Rum
    — *sweeter, warm spice* · Gold Rum — *rounder*" — clearly not satisfied,
    tappable to the suggested ingredient, and (for recipe editors) a small
    "use here" action.
  - Below the ingredient list: "**Variations**" — cards with their own
    availability badges.

---

## Schema / RLS summary & migration order

| # | Migration | Contents | Depends on |
|---|---|---|---|
| — | *(none)* | Part 1a guidance fix + 1b editor section + 1c tab retirement — **client + service only** | ships first |
| M1 | `..._recipe_component_alternatives_note.sql` | `alter table recipe_component_alternatives add column note text check (…≤200)` | — |
| M2 | `..._ingredient_substitutions.sql` | new table + RLS (`to authenticated` from the start) + optional small seed | — |
| M3 | `..._recipe_relationships.sql` | new table + RLS + RLS-suite block | M1/M2 independent |

- Each new-table migration follows the `ingredient_form_conversions`
  precedent: RLS scoped `to authenticated` in the **same** migration (avoid
  the third "policy role scope" follow-up), and `supabase db advisors
  --type security` run after each. No new SECURITY DEFINER functions are
  needed (reusing `recipe_is_visible`/`recipe_is_editable`).
- No changes to the `recipes` column-update grant (relationships live in
  their own table).

---

## Staged implementation plan

**Stage A — Ingredient forms tidy-up (no migration).**
1a guidance fix → 1b "Can provide" section in `IngredientTypeEditor` (reuses
`ingredientForms.js`) → 1c retire the standalone tab + `TABS` entry. Verify:
`pnpm test` (unchanged), build, isolated-LF `oxfmt --check`; manual — add a
conversion from the editor, edit its guidance, delete it, and confirm a
recipe re-resolves. RLS suite unchanged. Small, self-contained, shippable
alone.

**Stage B — Substitutes.**
M1 (`note` on `recipe_component_alternatives`) + M2 (`ingredient_substitutions`).
`mapRecipe`/`computeAvail`/`IngredientsSection` carry the note.
`IngredientTypeEditor` gets the "Suggested substitutes" section.
`DetailScreen` shows catalogue suggestions on missing rows + the recipe
editor's "use here" bridge. New domain tests: a general substitution never
changes `avail`; a promoted recipe row does; note rendering; precedence
(exact > form > recipe substitution) still holds with a note present. RLS
suite: `ingredient_substitutions` block. Advisors clean.

**Stage C — Variations.**
M3 (`recipe_relationships`) + RLS-suite block. Recipe editor "Variation of"
field; `fetchRecipe`/`fetchRecipes` gain the linked-recipe ids (a light
join, not a full nested fetch — resolve names/availability from the already
-loaded `computed` set in `AppShell`). `DetailScreen` "Variations" block.
Domain test: a variation's availability is independent of its original.
Manual: Negroni + a personal Galliano variation — Negroni stays unavailable
without Campari; the variation shows its own badge and opens its own page;
attribution/visibility intact for a private variation vs. a published one.

Each stage: `corepack pnpm@10.34.3` test + build, isolated-LF `oxfmt --check`,
RLS suite where a table changed, `db advisors --type security` after any
migration, commit + push, then a short mobile checklist for the user. Stages
are independent enough to ship one at a time.

---

## Dependencies & the Homemade Preparations boundary

- **Shared UI slot.** The component sub-label slot in `IngredientsSection`
  now carries: *Substituting* / *Can provide* / *Household basic*. Homemade
  Preparations (Concept 3) will want a *fourth* state ("You can make this —
  see instructions") in or near the same slot, and it must **not** look
  satisfied. Keep the precedence list in `computeAvail` and the slot's
  render order documented so Concept 3 is an addition, not a rewrite.
- **Do not build toward preparations here.** No `recipes.kind`, no
  `produces_ingredient_type_id`, no `glass_id` relaxation. A "variation" is
  an ordinary cocktail recipe; a "preparation" is a different kind of record
  with its own inputs and a depth-1 dependency guard — that stays in the
  other plan doc, unstarted.
- **`recipe_relationships` naming.** The spec's data model already reserves
  this exact name for "Variation/related-recipe connections", so M3 uses it
  and leaves `relationship_type` extensible rather than inventing a
  variation-only table.

---

## Open decisions — need your answer before implementation

- **D1 — General substitutions are suggestion-only.** Confirm: a
  catalogue-level "X can stand in for Y" never changes a recipe's
  Perfect/Almost/Unavailable state. It only *counts* toward availability
  when a recipe editor explicitly attaches it to a specific component of a
  specific recipe. (This is the reading of your rum example; it's the
  pivotal design fork.)
- **D2 — Recipe-scoped substitutions reuse `recipe_component_alternatives`**
  (with a new optional `note`), rather than a second parallel table. OK?
- **D3 — Who curates catalogue-level "Can provide" and "Suggested
  substitutes"?** Admin only (matches `ingredient_form_conversions` today),
  or admin **+ moderator** (matches the ingredient type editor they live in,
  and the Household-basic toggle already there)? Recommend admin + moderator
  for consistency with the editor's home.
- **D4 — Variation linking needs no approval from the original's owner.** A
  variation one-way-links itself; the original just displays it (only to
  viewers already allowed to see the variation). OK, or should the
  original's owner be able to hide/curate links on their recipe?
- **D5 — When to show the "Variations" block.** Always, or only when the
  current recipe isn't already `Perfect` for the viewer (so it reads as a
  fallback)? Recommend: show whenever ≥1 visible variation exists, but sort
  makeable ones first and collapse the rest.
- **D6 — Suggestion count.** How many catalogue suggestion chips on a
  missing row before "+N more"? Recommend 3.

---

## Exact next action

**Review this proposal.** Answer D1–D6 (D1, D4, D5 are the ones that change
scope; the rest have a recommended default). On approval, implementation
starts at **Stage A** (the no-migration Ingredient Forms tidy-up), then B,
then C. Homemade Preparations stays untouched.
