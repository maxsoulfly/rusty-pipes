# Suggested Substitutes & Linked Cocktail Variations

**Planning document — 2026-09-10/11. Decisions D1–D6 approved 2026-09-10.
Stage A DONE + pushed 2026-09-10, plus a Stage A follow-up (editor UI rework
+ atomic local-draft save via `save_ingredient_type()`) DONE + pushed
2026-09-10. Stage B (Suggested Substitutes) DONE + pushed 2026-09-10. Stage C
(Linked Variations) NOT started.**

> **D1 is SUPERSEDED, 2026-09-11 — planning only, not yet implemented.** The
> user has decided general catalogue substitutes should be able to affect
> **discoverable makeability**, not stay suggestion-only forever. This does
> **not** mean Stage B shipped a bug — the "Try: Spiced Rum (in your bar)"
> hint on a still-"missing" White Rum row is exactly what D1 specified, and
> the screenshot confirming it is a confirmation, not a defect report. What
> changes is the product decision going forward: see **"Stage D — Adapted
> Availability & Minimal Homemade Preparations"** below for the full revised
> proposal, which layers a new, clearly-separate "adapted" result on top of
> Stage B's mechanism rather than changing what Stage B already built.
> Stage B's own remaining manual-verification checklist (editor layout on a
> real phone, the recipe-editor adopt flow, etc.) is **not marked passed** —
> it stays outstanding, and is largely superseded in relevance by Stage D's
> UI changes to the same surfaces, so re-verify against Stage D once that
> ships rather than against Stage B in isolation.

Covers four related pieces of "what else can satisfy or stand in for a
recipe":

1. **Ingredient forms ("Can provide")** — shipped as Concept 2 in
   `docs/plans/household-basics-ingredient-forms-preparations.md`; this doc
   revised *where it is managed* (**Stage A, done**) and fixed one bug. The
   table, engine, and one-direction rule are unchanged.
2. **Suggested substitutes** — shipped, suggestion-only (Stage B, done). Now
   being extended by **Stage D** below.
3. **Adapted availability + minimal homemade preparations** — new, planning
   only (**Stage D**). Supersedes D1's "never affects availability" clause;
   folds in a deliberately small re-scoped version of Concept 3.
4. **Linked cocktail variations** — new. Not started (Stage C).

**The full Homemade Preparations proposal in the household-basics plan doc is
now superseded by Stage D's smaller design** — see that doc's Concept 3
section for the pointer. Stage D's preparations are a bounded, standalone
mechanism (their own small tables, not a reuse of `recipes`), so the original
Concept 3's "re-audit every recipe consumer" burden no longer applies.

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

## Part 1 — Ingredient forms: "Can provide" moves into the ingredient type editor — DONE (see "Stage A — DONE" below for what actually shipped)

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

- `ingredient_substitutions`: `is_member()` read; **write =
  `is_admin_or_moderator()`** (D3, approved) — in the table's first
  migration, not a follow-up. Policies scoped `to authenticated` from the
  start (the `to public` slip cost us a follow-up migration twice already).
  Ordinary-member access is not broadened.
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

## Decisions — approved 2026-09-10

- **D1 — General catalogue substitutes are suggestions only.**
  **SUPERSEDED 2026-09-11 — see "Stage D" below.** As originally approved: a
  catalogue-level "X can stand in for Y" never changes a recipe's
  Perfect/Almost/Unavailable state; recipe-specific alternatives
  (`recipe_component_alternatives`) do affect availability; on a missing
  row, show owned/available suggestions first. **Still true and unchanged**
  for the canonical `avail` shown everywhere today (Buy Next, Library/Home
  tier counts, Build Your Bar's primary makeable count) — Stage D adds a
  second, clearly-separate "adapted" result rather than changing what `avail`
  means.
- **D2 — APPROVED.** Recipe-scoped substitutions reuse
  `recipe_component_alternatives` with a new optional `note` column — no
  second parallel availability path.
- **D3 — Admins AND moderators** manage "Can provide" and general
  substitutes. **Enforce in the database as well as the UI** — the RLS write
  policy is the real gate, the tab/section visibility is secondary. Do not
  broaden ordinary-member access. (Stage A already did this for
  `ingredient_form_conversions` via `20260910160000`; Stage B's
  `ingredient_substitutions` table ships with the same `is_admin_or_moderator()`
  write policy from its first migration.)
- **D4 — The original's owner does not control other members' variations.** A
  variation one-way-links itself; the original just displays every linked
  variation the viewer is permitted to see, with clear attribution.
  **Misleading links stay a moderation matter** (a moderator can act on a
  bad link/recipe), not something the original owner curates.
- **D5 — Show all linked variations the viewer may see**, makeable ones
  first, then by name; keep clear per-variation attribution and each
  variation's own availability badge. (Collapsing the long tail is a UI
  detail, not a gate.)
- **D6 — 3** catalogue suggestion chips on a missing row before "+N more".

---

## Stage A — DONE 2026-09-10 (committed + pushed)

- **Guidance autofill removed.** The add-conversion guidance field starts
  **blank** with `placeholder="e.g. Squeeze fresh juice from Lemon"`. No
  more "Squeeze fresh juice from &lt;anything&gt;" auto-text. Existing saved
  guidance is untouched (the edit path seeds from the stored value).
- **"Can provide" moved into `IngredientTypeEditor`**, scoped to the
  ingredient being edited (always the *raw* side). View / add / edit
  guidance / remove, all writing immediately through the existing
  `src/services/ingredientForms.js` — same pattern as inline alias
  management on that form, independent of the type's own Save button.
  Save/Cancel are explicit per action; entered text is kept on failure with
  the error shown inline. The picker excludes the type itself, already-linked
  prepared types, and any type that already provides this one (the inverse
  the DB trigger would reject).
- **`TypeComboBox` extracted** to `src/components/admin/TypeComboBox.jsx`
  (was inline in the old tab) — collapsed trigger → inline search + bounded
  scrollable list → collapse on pick; 44px targets; `label` now optional.
- **Standalone "Ingredient forms" admin tab retired.**
  `src/components/admin/IngredientFormsTab.jsx` deleted; the `AdminScreen`
  `TABS` entry `{ id: "forms", … }`, its import, and its render guard
  removed. No other navigation referenced it (no deep link ever existed).
- **Migration `20260910160000_ingredient_form_conversions_moderator_writes.sql`**
  — the write policy predicate widened from `is_admin()` to
  `public.is_admin_or_moderator()` (per D3); members-read policy untouched;
  no GRANT change (table already carries the blanket `authenticated`
  privileges every table has — RLS is the gate); no new function. Policy
  name kept, comment updated.
- **Engine, directionality, one-direction trigger, inventory, and all
  existing conversion rows are unchanged.**
- **Verified:** `corepack pnpm@10.34.3 test` 242/242 (no domain change);
  `pnpm build` clean (168 modules); isolated-LF `oxfmt --check` clean on the
  4 changed/new JS files. RLS suite extended (moderator can
  insert/update/delete a form conversion; the dedicated block's
  member-write-denied assertions still hold) — **full suite passes**.
  `supabase db advisors --type security` — no new finding.
- **Not verified here** (no browser tooling in this sandbox): the on-screen
  editor layout on desktop / a narrow phone, and the add/edit/remove flow in
  the running app. Reused confirmed checks only: Lemon supplies Lemon Juice;
  juice does not supply whole Lime; the compact layout is more comfortable;
  guidance edits persist after reload.

### Stage A follow-up — editor UI + atomic draft save — DONE 2026-09-10 (committed + pushed)

The user reviewed Stage A and asked for a focused editor rework before
Stage B. Delivered:

- **Layout.** The editor card is capped `max-w-2xl` (mobile stays
  full-width, `min-w-0`/`break-words` everywhere so nothing overflows
  sideways). Color + Icon now sit in a `sm:grid-cols-2` pair; Parent type
  and Priority got visible labels (they were bare `<Select>`s) and share
  their own `sm:grid-cols-2` pair. Explanatory copy shortened (Household
  basic and "Can provide" are one line each).
- **"Can provide" rows.** Compact: prepared-ingredient name, guidance
  directly beneath ("No guidance" placeholder when empty), and a **⋯ menu**
  (`BottomSheet`, the app's existing kebab pattern) with **Edit guidance** /
  **Remove**. A compact **+ Add** sits beside the "Can provide" heading (no
  more full-width secondary button). New-conversion guidance stays blank
  with the example placeholder.
- **Actions.** **"Save changes"** is the only filled/prominent button;
  every other control (Cancel, alias Add/Remove, the add-conversion
  Add/Cancel, the inline guidance Done/Cancel) is a quiet outline button at
  `min-h-11` (44px). An "Unsaved changes" hint shows when the draft differs
  from what was loaded.
- **Local-draft save model.** Name / category / parent / priority /
  household-basic / color / icon **and** the full alias list **and** the
  full "Can provide" list are all local state now. Nothing writes until
  **Save changes**. **Cancel discards the whole draft with zero DB writes**
  (it just unmounts the editor). The per-row immediate writes are gone.
- **Atomic save.** New migration
  `20260910170000_save_ingredient_type.sql` — `save_ingredient_type(p_type_id
  uuid, p_fields jsonb, p_aliases jsonb, p_conversions jsonb)`, SECURITY
  INVOKER plpgsql, `search_path=''`, `revoke … from public, anon` +
  `grant … to authenticated`. Body: one `UPDATE ingredient_types` (raises
  `insufficient_privilege` if it touches 0 rows — a member's call), then
  replace this type's whole `ingredient_aliases` set, then replace its whole
  `ingredient_form_conversions` set (raw side = the type). All in one
  transaction — a failure anywhere (name clash, alias colliding with another
  type, a conversion tripping `forbid_inverse_form_conversion`) rolls the
  **entire** save back; the client keeps the draft and shows `err.message`.
  Both DELETEs carry a real `WHERE` on the type id, so pg-safeupdate on the
  `authenticator` role is satisfied without a `where true` crutch. No new
  function beyond this one; no GRANT changes to the tables; RLS on all three
  tables (`is_admin_or_moderator()`) is unchanged and is the real gate.
  `src/services/catalog.js` gains `saveIngredientType()`; `updateIngredientType`
  is kept for any other caller but the editor no longer uses it, nor the
  per-row alias / form-conversion service calls.
- **Consumers.** `IngredientTypeEditor` has exactly one — `TypesTab` (the
  stale "My Bar edit pencil" is long gone). `TypesTab` drops the now-unused
  `onAliasesChanged` / `onConversionsChanged` props; `onSaved` (refetch +
  close) and `onCancel` unchanged.
- **Preserved:** admin/moderator write access, member read-only, the
  conversion engine, one-direction rule, existing saved data, and inventory
  behaviour — all untouched.
- **Verified:** `corepack pnpm@10.34.3 test` 242/242 (no domain change);
  `pnpm build` clean (168 modules); isolated-LF `oxfmt --check` clean on the
  3 changed JS files (2 reflows hand-applied). **RLS suite** extended with a
  `save_ingredient_type()` block — admin full save writes type + aliases +
  conversions; **a save whose conversion list contains the inverse of an
  existing pair fails whole (name / aliases / conversions / assumed_available
  all verified unchanged afterwards)**; a member's call raises
  `insufficient_privilege` and changes nothing; anon has no EXECUTE; plus a
  moderator positive check in the moderator section. Full suite passes.
  `supabase db advisors --type security` — no new finding (SECURITY INVOKER,
  fixed `search_path`). Live: function registered with the expected
  signature, `security_definer=false`, EXECUTE = authenticated only.
- **Not verified here** (no browser tooling): the reworked layout on desktop
  / a narrow phone, and the Cancel-then-reload / Save-then-reload flow in the
  running app.
- **Test-coverage limits (honest):** "Cancel makes no writes" and
  "successful persistence" are **not** covered by an automated *component*
  test — vitest runs in the node env with no jsdom/testing-library, so the
  React editor can't be mounted in a test. Cancel-no-writes is structural
  (Cancel calls `onCancel()` only; `saveIngredientType()` is the sole write
  path) and the RLS-suite atomicity/rollback + persistence checks exercise
  the real DB transaction. A browser check is still needed for the UI-level
  guarantees.

---

## Stage B — DONE 2026-09-10 (committed + pushed; mobile/browser check pending)

**Two layers, kept separate exactly as designed:**

**Recipe-scoped (affects availability).** `recipe_component_alternatives`
gains a nullable `note text` column (migration `20260910180000`, ≤200,
no policy change — the row's existing `recipe_is_editable`/`recipe_is_visible`
gate covers it). `RECIPE_SELECT` embeds `recipe_component_alternatives(
ingredient_type_id, note)`; `mapRecipe` produces `component.alternativeNotes`
(`{ altId: note }`, only for alternatives that carry one). `computeAvail`'s
`substitutions[ingId]` gains `note` — **passive metadata only**: the match
decision, the four `avail` tiers, and the precedence *exact → Can provide →
recipe-scoped substitution* are all unchanged (an existing note-less row
renders exactly as before). `IngredientsSection` appends it:
"Substituting: Rye — spicier, drier". The recipe editor's alternatives are
now `[{ name, note }]`; each chip has a one-line flavor-note field, and each
catalogue suggestion for that component shows as a one-tap **+ &lt;name&gt;**
button that adopts it (name + note) into the component. Adopted rows are the
**only** substitutions that change availability, saved through the editor's
existing save flow (`insertComponentsWithAlternatives` writes `note`).

**General / catalogue (suggestion only, never availability).** New table
`ingredient_substitutions (id, from_type_id, to_type_id, flavor_note)` —
migration `20260910190000`. Directional, **not symmetric, no inverse guard,
no chaining**: "White Rum → Spiced Rum" and "Spiced Rum → White Rum" are
separate legitimate rows; nothing auto-derives one from the other. RLS
scoped `to authenticated` from the first migration — `is_member()` read,
`is_admin_or_moderator()` write (D3). Written **only** through
`save_ingredient_type()` — dropped + recreated as a 5-arg function (added
`p_substitutions jsonb default '[]'`), reconciling this type's `from`-side
set inside the same atomic transaction as fields/aliases/conversions. It is
**never handed to `computeAvail`** — no path from this table changes a
recipe's Perfect/Almost/Unavailable state, its makeable count, or Buy Next.
`buildSubstituteSuggester` (pure, `src/domain/substituteSuggestions.js`)
turns the rows into a `(missingTypeId) => [{ toId, toName, note, owned }]`
lookup, **owned stand-ins first** then alphabetical, capped at 3 (D6);
`DetailScreen` builds it from `catalog.ingredientSubstitutions` + the
resolved `owned` set and passes it to `IngredientsSection`, which renders a
muted "Try: &lt;name&gt; (in your bar) — &lt;note&gt; · …" line **only on
genuinely missing rows** (no green dot, not in the "Substituting:" slot).

**Editor.** `IngredientTypeEditor` gains a **"Can be replaced by"** section
mirroring "Can provide": compact rows (`{type.name} → {stand-in}` + note
beneath), a `⋯` `BottomSheet` menu (Edit note / Remove), a collapsed
`TypeComboBox` + note field behind a compact **+ Add**, all in the same
local draft committed by the one atomic **Save changes**. The picker has
**no inverse filter** (both directions are valid rows). `TypesTab` passes
`ingredientSubstitutions`; `useCatalog` fetches it.

**Recipe path audit (flavor notes not silently lost):**
- **Save** (`insertComponentsWithAlternatives`) — writes `note`; accepts the
  editor's `alternatives: [{ ingredientTypeId, note }]`, still tolerates a
  bare `alternativeIds` array (note-less) defensively.
- **Load** (`RECIPE_SELECT` / `mapRecipe`) — carries `note` →
  `alternativeNotes`.
- **Clone / Edit prefill** — maps `alternativeIds` + `alternativeNotes` →
  `alternatives: [{ name, note }]`, so notes survive a clone or a re-save.
- **localStorage draft restore** — migrates an old `alternativeNames: []`
  draft to `alternatives: [{ name, note: "" }]` on restore.
- **Batch recipe import** (`recipeImport.js` / `createClassicRecipes`) —
  never sets alternatives at all; nothing to lose (unchanged).
- **Plain-text share** (`recipeShareText.js`) — ingredient name + amount
  only, never listed substitutes; nothing to lose (unchanged).
- **Public share** (`get_shared_recipe` RPC) — its `ings` projection is
  name/amount/unit/role only, no alternatives; nothing to lose (unchanged).

**Preserved:** inventory, existing alternatives (note defaults null →
identical rendering), household basics, ingredient forms, recipe
visibility/edit permissions, the `recipes` column-update grant (relationships
untouched).

**Verified:** `corepack pnpm@10.34.3 test` **251/251** (+9: 3 in
`availability.test.js` for the note — carried for the matched alternative,
null when the matched one has none, never changes `avail`; 6 in
`substituteSuggestions.test.js` — directional, no reverse leak, owned-first
+ alphabetical + cap, custom limit, empty/null-safe, note pass-through).
`pnpm build` clean (170 modules). Isolated-LF `oxfmt --check` clean on all
14 changed/new JS files (3 reflows hand-applied). Migrations pushed via
`supabase db push --linked` (clean). **RLS suite** extended — an
`ingredient_substitutions` block (member read / anon denied / member direct
write denied / admin write / self-pair rejected / blank note rejected /
**inverse pair allowed** / duplicate rejected; `save_ingredient_type`'s
`p_substitutions` reconcile only touches the edited type's `from` side; **a
substitution self-pair in the payload rolls the whole save back** — name and
prior set both verified unchanged; a 5-arg member call raises
`insufficient_privilege`) plus a `note` round-trip on the
`recipe_component_alternatives` block. Full suite passes.
`supabase db advisors --type security` — no new finding. Live REST checks:
the `RECIPE_SELECT` embed with `note` → HTTP 200; anon read of
`ingredient_substitutions` → `200 []` (RLS `to authenticated`, matches every
other member-read table).

**Not verified here (no browser tooling in this sandbox):** the editor's
"Can be replaced by" section on desktop / a narrow phone; the muted "Try:"
hint on a real recipe's missing rows; the recipe editor's one-tap adopt +
flavor-note field and that an adopted row then flips availability while a
mere catalogue suggestion does not; clone/edit note round-trip in the
running app. **These checks are not superseded by anything below and remain
outstanding** — Stage D changes the same screens further, so re-verify once
Stage D ships rather than checking Stage B twice.

---

## Stage D — Adapted Availability & Minimal Homemade Preparations (planning only, 2026-09-11 — not yet implemented)

Rusty Pipes' central question is *"what can I make with what I have?"* A
curated, owned substitute that the app already knows about but still reports
as "Unavailable" fails that question. This stage makes curated substitutes —
and a small, bounded homemade-preparations mechanism — count toward a
recipe's **discoverable makeability**, without touching what `avail` means
today, without persisting a new recipe per combination, and without letting
one badge slot turn into a wall of chips.

### Audit that grounds this (live catalogue + code, 2026-09-11)

- **Daiquiri** exists live (classic, shared): `White Rum` required 60 ml,
  `Lime Juice` required 30 ml, `Simple Syrup` required 15 ml.
- **A `White Rum → Spiced Rum` general substitute already exists live**
  (flavor note "Adds sweetness and spice.") — Stage B's mechanism, working
  exactly as specified: it shows as a "Try:" hint and does **not** change
  Daiquiri's `avail` (still `unavail`, 3 missing required). This is correct
  Stage-B behavior, not a bug — see the superseded-D1 note above.
- No `Lime Juice → Lemon Juice` substitute and no Simple Syrup preparation
  exist yet — both need curating once Stage D ships, to actually reproduce
  the acceptance scenario below.
- `Water` and `White Sugar` are both `assumed_available` (household basics),
  confirmed live.
- Code audit confirmed (unchanged since Stage B, re-checked for this
  proposal): `computeAvail()` precedence is exactly exact → Can-provide →
  recipe-scoped substitution, with `ingredient_substitutions` never consulted
  — the exact tier list D1 described. `recommendations.js` (Buy Next) only
  reads `computed[].avail` / `missingRequiredIds`, so Daiquiri (3 missing
  required today) doesn't even qualify as a Buy Next candidate yet (needs
  exactly 1 missing) — confirms the ranking algorithm needs no change, only
  an explanatory annotation once adaptation exists (see below).
- Concept 3's original proposal (`recipes.kind`, `produces_ingredient_type_id`,
  relaxing `glass_id`, and re-auditing every `recipes` consumer — sharing,
  import/export, Lists, Search/Library, RLS) is a much bigger lift than this
  scenario needs. **Superseded by the smaller design below**, which never
  touches the `recipes` table at all.

### Acceptance scenario (the concrete target)

> Own: Spiced Rum, Lemon Juice. Household basics: White Sugar, Water.
> Daiquiri requires White Rum, Lime Juice, Simple Syrup.
> Curated once: `White Rum → Spiced Rum` (exists), `Lime Juice → Lemon Juice`
> (to be added), and a Simple Syrup preparation from White Sugar + Water (to
> be added). Result: Daiquiri's card/detail shows **"Make with substitutions
> · Prepare syrup first"**, distinct from — and without altering — its
> honest canonical state (still literally missing White Rum, Lime Juice, and
> a made batch of Simple Syrup). Tapping in explains each replacement with
> its flavor note and links to Simple Syrup's own ingredients/steps.

### The model: one new derived result, not a new `avail` tier

**`avail` (canonical) is completely unchanged** — still exact → Can-provide →
recipe-scoped substitution, still what Buy Next, the existing Library/Home
tier counts, and Build Your Bar's primary makeable count read. This is how
requirement 5 ("keep badges, sorting/filtering/counts, recommendations,
Build Your Bar counts and Buy Next consistent") is met: by construction,
because nothing that already reads `avail` changes what it's reading.

A new pure function computes a **second, optional result** per recipe,
consulted only when `avail` is not already `perfect`/`good`:

```
computeAdaptedAvail(cocktail, strictResult, owned, resolveIngredientName, {
  generalSubstitutes,      // catalog.ingredientSubstitutions
  preparationsByProducedType,  // Map<producedTypeId, { id, name, inputs: [...] }>
}) -> null | {
  tier: "perfect" | "good",   // mirrors strict semantics for the REQUIRED set only
  label: string,               // "Make with substitutions" / "Prepare syrup first" / both joined with " · "
  resolvedRequired: [
    { ingId, via: "substitute", matchedId, matchedName, note },
    { ingId, via: "preparation", preparationId, producedTypeId, producedName },
  ],
}
```

**Full precedence, per required component, now five tiers in one ordered
list** (the first three are `computeAvail()`, unchanged; the last two only
run inside `computeAdaptedAvail()` and only for components `computeAvail()`
left missing):

1. Exact availability (owned / product-mapped / compatible child / household
   basic)
2. Can provide (form conversion)
3. Recipe-specific alternative (adopted `recipe_component_alternatives`,
   with its note)
   — **strict/`avail` stops here; 1–3 is exactly what "genuinely missing"
   means.**
4. **General substitute** (`ingredient_substitutions`) — only an **owned**
   stand-in counts (a suggestion you don't own never flips makeability);
   directional, no chaining, no reverse.
5. **Preparable** — a configured preparation whose *own* inputs are all
   satisfied through tiers **1–3 only** (never 4–5 — no chaining, and this is
   exactly why "Sugar alone" can never imply "Simple Syrup": both White Sugar
   *and* Water must independently pass tiers 1–3, one input alone is not the
   whole preparation).

`computeAdaptedAvail()` returns non-null only when **every** required
component still missing after tier 3 resolves via tier 4 or 5 (mirrors
`avail`'s own "good enough" bar — all-or-nothing for requireds, exactly like
today, no partial-credit state to add to the badge vocabulary). Optional/
garnish gaps are left exactly as `computeAvail()` already reports them —
**adaptation is scoped to required components only in v1** (explicitly out
of scope: upgrading a "good" recipe to "perfect" via a garnish substitute —
revisit only if real usage asks for it).

**One badge, composed text — not four.** When `resolvedRequired` contains
only substitutions → `"Make with substitutions"`. Only preparations →
`"Prepare <name> first"` (join up to 2 preparation names with commas +
"and"). Both → joined with `" · "`, exactly the acceptance scenario's text.
This is the one new visual element this stage adds — everywhere it's shown,
it's the same shape, so it never becomes "a confusing collection of badges."

### Recipe-specific override (requirement 2)

New nullable-default column `recipe_components.allow_general_substitutes
boolean not null default true`. When `false`, `computeAdaptedAvail()` skips
tier 4 (general substitutes) for that component only — tier 5 (preparation)
still applies. A **simple** boolean, not a per-substitute exclusion list: a
recipe owner/admin who thinks "Spiced Rum" is wrong for *this* specific
cocktail flips it off; if they instead *want* a specific substitute to count
here, they already have the stronger tool — adopt it as a real
`recipe_component_alternatives` row (Stage B), which resolves at tier 3 and
makes the override question moot for that component. Edited in
`IngredientRowsEditor` next to each component (a small checkbox, default
checked, off = "don't suggest general substitutes here"); saved through the
existing recipe save path, no new RPC.

### Minimal Homemade Preparations (requirement 4 — re-audit + smallest design)

**Does not reuse `recipes` at all.** Two small new tables, keyed by the
*produced* ingredient type, not a recipe:

```sql
create table public.ingredient_preparations (
  id uuid primary key default gen_random_uuid(),
  produces_type_id uuid not null unique
    references public.ingredient_types(id) on delete cascade,
  name text not null,                       -- usually the produced type's own name
  instructions text[] not null default '{}' -- short steps, same shape as recipes.steps
);

create table public.ingredient_preparation_inputs (
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null
    references public.ingredient_preparations(id) on delete cascade,
  ingredient_type_id uuid not null references public.ingredient_types(id),
  amount numeric not null default 0,
  unit_label text not null default 'ml',
  unique (preparation_id, ingredient_type_id)
);
```

- `produces_type_id unique` → at most one preparation per produced type (v1
  boundary, matches "smallest bounded implementation").
- **Depth-1 guard, enforced by a trigger on `ingredient_preparation_inputs`**
  (a CHECK can't reference another table): an input's `ingredient_type_id`
  must not equal its own preparation's `produces_type_id` (self-reference),
  and must not already be a `produces_type_id` of *any* preparation
  (including a different one) — i.e. a preparation's inputs are always raw,
  literal, tier-1–3 ingredients, never another preparation's output. Same
  two-flat-queries approach the original Concept 3 proposal already
  specified — this part of that proposal carries over unchanged, just scoped
  to the smaller tables.
- **No `recipes` schema change, no `glass_id` relaxation, no re-audit of
  sharing/import/export/Lists/Search** — none of those consumers ever see
  this table, because it was never a recipe. This is what makes the design
  "smallest bounded": the entire original Concept 3 re-audit list becomes
  moot.
- **RLS:** `is_member()` read, `is_admin_or_moderator()` write, `to
  authenticated` from the first migration (the established pattern).
- **Editor:** folded into `IngredientTypeEditor` — but keyed the other way
  from "Can provide"/"Can be replaced by" (this type is the *produced* side,
  not the *raw*/*from* side), so it's a **single optional block** ("Homemade
  preparation"), not a list: "+ Add preparation" reveals inputs (a small
  repeatable ingredient+amount picker, reusing `TypeComboBox`) + a short
  instructions list, in the same local draft, part of the one atomic **Save
  changes**. `save_ingredient_type()` gains a 6th param `p_preparation jsonb`
  (`null` = no preparation; otherwise `{ name, instructions, inputs }`),
  reconciled the same delete-then-insert-if-present way as the other three
  relationships, still one transaction.
- **Satisfiability check** (pure): `isPreparationSatisfiable(inputs,
  isAvailableStrict)` — true only when *every* input passes tiers 1–3. This
  is the exact function that guarantees "Sugar alone must not imply owned
  Simple Syrup."

### Where "adapted" is surfaced (requirement 5, one surface at a time)

| Surface | Change |
|---|---|
| `computeAvail()` / `avail` | **None.** Still exact → Can-provide → recipe-scoped substitution. |
| `IngredientsSection` (detail page) | A component resolved at tier 4/5 renders with a **new, distinct accent** (not the green "owned" dot, not the muted "Try:" hint) — e.g. violet, reusing the existing note-line slot: "Adapted: Spiced Rum — sweeter, warm spice" / "Adapted: needs preparation — [link to Simple Syrup's ingredients/steps]". Explains each replacement's flavor note and links to the preparation, per the acceptance scenario. |
| Recipe card / `HeroCard` | One additional line when `adaptedAvail` is non-null: the composed label ("Make with substitutions · Prepare syrup first"), styled distinctly, **shown alongside** (never replacing) the honest canonical badge/"needs X" line. |
| **Library** (grouped view) | One new group, **"Make With Substitutions"**, positioned after "Good Enough" and before "Almost There". A recipe with a non-null `adaptedAvail` is shown there instead of its canonical Almost/Unavailable group (no duplication); its own detail page still shows the real canonical state plus the adaptation explanation. Existing 4 tier counts are computed exactly as before (unchanged definition) — the new group's count is additive/redistributive, not a change to what "Almost"/"Unavailable" mean. Name-sort flat view: unaffected except cards may show the new line. |
| **Home** | New "Make With Substitutions" section, same position as in Library. `almostRanked` excludes recipes with a non-null `adaptedAvail` (so nothing appears twice) — this also means previously Home-invisible `unavail` recipes can newly appear here, which *is* the intended discoverability win. |
| **Build Your Bar makeable count** | Primary count **stays literal** (unchanged formula) — recommended default, see the one open question below. A secondary, clearly-labeled line: "+N more with substitutions". |
| **Buy Next (`recommendations.js`)** | **Ranking algorithm unchanged** (still reads only `avail`/`missingRequiredIds` — confirmed by the audit above that Daiquiri doesn't even qualify as a candidate today). Rendering layer only: when a Buy Next card's recipe already has a non-null `adaptedAvail`, add a small note — "already makeable via substitution" — so buying White Rum is understood as "get the original, and it unlocks other White-Rum recipes too," not "this is the only way to make it." |
| Ingredient/bottle detail (`findRecipesUsingIngredient`) | **Unchanged, deliberately out of scope** — stays ownership-blind like household basics and Can-provide already are; revisit only if real usage asks for it. |

### Linked Variations boundary (requirement 6)

Nothing here creates a `recipes` row or a `recipe_relationships` row.
`computeAdaptedAvail()` is a pure, ephemeral, per-render computation — the
"Daiquiri, adapted" never becomes a saved entity, and no combination of
substitutes/preparations is ever enumerated or persisted. A member who wants
to publish a genuinely distinct, named, authored recipe ("Daiquiri with
Spiced Rum") still does that through Stage C's (not-yet-built) Linked
Variations, entirely independently.

### Schema / migration order

| # | Migration | Contents |
|---|---|---|
| D.1 | `..._recipe_components_allow_general_substitutes.sql` | `alter table recipe_components add column allow_general_substitutes boolean not null default true` — no RLS change (existing `recipe_is_editable` gate covers it; confirm at implementation time whether `recipe_components` carries a column-restricted UPDATE grant that needs widening, or whether the existing insert-driven full-replace save path makes that moot). |
| D.2 | `..._ingredient_preparations.sql` | Both new tables + RLS (`to authenticated` from this migration) + the depth-1 trigger. |
| D.3 | `..._save_ingredient_type_preparation.sql` | Drop + recreate `save_ingredient_type()` with the 6th `p_preparation` param (same pattern as Stage B's `p_substitutions` addition). |

No changes to `ingredient_form_conversions`, `ingredient_substitutions`,
`ingredient_types`, or `recipes` schema.

### Staged implementation plan

**Stage D.1 — Adapted availability from curated substitutes only (no
preparations yet).** `computeAdaptedAvail()` handling tier 4 only. Wire into
`IngredientsSection`/card/detail. *Acceptance:* a recipe missing exactly one
required ingredient that has a configured, **owned** general substitute
shows "Make with substitutions"; the same recipe with the substitute
un-owned shows nothing new (still just the existing "Try:" hint); `avail`
and Buy Next are provably unchanged (existing tests still pass unmodified).

**Stage D.2 — Minimal homemade preparations.** Migrations D.2 + D.3, the
"Homemade preparation" editor section, `isPreparationSatisfiable()`. Depth-1
guard tests (self-reference; new preparation whose input is already
produced; editing an existing one into either violation). *Acceptance:*
configuring Simple Syrup from White Sugar + Water (both household basics)
makes it "preparable"; a recipe missing only Simple Syrup shows "Prepare
Simple Syrup first" with zero general substitutes involved; a recipe missing
only White Sugar (not the full preparation) shows nothing (Sugar alone does
not imply Simple Syrup).

**Stage D.3 — Combine, and the full Daiquiri scenario.** `computeAdaptedAvail()`
consults tiers 4 and 5 together per component; label composition ("·" join);
curate the two missing catalogue rows for the acceptance scenario (Lime
Juice → Lemon Juice substitute, Simple Syrup preparation) as a **live-data
verification step, not a seed** (Concept 1/2's own rule — no speculative
data). *Acceptance:* the exact scenario reproduces "Make with substitutions
· Prepare syrup first"; Library/Home/Build Your Bar all show it consistently
per the table above; the detail page explains each replacement's flavor note
and links to Simple Syrup's ingredients/steps.

**Stage D.4 — Recipe-specific override + Buy Next annotation.** Migration
D.1, the `IngredientRowsEditor` checkbox, and the Buy Next rendering note.
*Acceptance:* toggling the checkbox off on one component removes only that
component's general-substitute eligibility (preparations still apply); a
Buy Next candidate whose recipe is already adaptable shows the explanatory
note; ranking order is provably unchanged (existing `recommendations.test.js`
still passes unmodified).

Each stage: `corepack pnpm@10.34.3` test + build, isolated-LF `oxfmt --check`,
RLS suite for D.2/D.4's schema changes, `db advisors --type security` after
any migration, commit + push, then a mobile checklist. Meaningful domain
tests per stage (not just "it builds"): tier-4/5 precedence order, owned-only
gating on general substitutes, the depth-1 guard, "Sugar alone" non-implication,
label composition for all three combinations (substitute-only / prep-only /
both), and that `avail`/Buy Next/existing counts are byte-for-byte unchanged
before vs. after (a regression suite, not just new-feature tests).

### Recommended defaults (not blocking) & the one open question

- **Section name "Make With Substitutions"** — matches the acceptance
  scenario's own wording; easy to rename later, not blocking.
- **Adaptation scoped to required components only, all-or-nothing (mirrors
  "good")** — no partial-credit tier, keeps the badge vocabulary to exactly
  one new element.
- **Override is a boolean per component**, not a per-substitute exclusion
  list — simplest tool that satisfies requirement 2; a real exclusion is
  always still reachable via an explicit recipe-specific alternative.
- **Ingredient/bottle detail pages and `findRecipesUsingIngredient` stay
  out of scope** — same boundary household basics and Can-provide already
  respect.
- **Open question (genuinely a product-feel call, not a technical one):**
  should Build Your Bar's/Home's *primary* makeable-count number stay
  strictly literal (recommended — "N you can make right now" never
  overclaims, adapted ones get their own "+N more with substitutions" line),
  or would you rather the primary number include adapted recipes with a
  footnote instead? Both are implementable; this is the one place the app's
  tone (strictly literal vs. more generous/optimistic) is genuinely up to
  you rather than something I should just pick.

---

## Exact next action

**Review the Stage D proposal above** (planning only — nothing in it is
implemented yet). Answer the one open question (Build Your Bar/Home's
primary makeable-count treatment); everything else has a stated default.
Stage B's own outstanding manual checks stay unverified/outstanding, not
passed — re-check them against Stage D's UI once that ships. On approval,
implementation starts at **Stage D.1**, then D.2, D.3, D.4, in that order
(each independently shippable and revertible).

**Stage C (Linked Variations) remains NOT started** and independent of Stage
D — on a separate go-ahead: migration `..._recipe_relationships.sql`
(`recipe_relationships`, RLS via `recipe_is_visible`/`recipe_is_editable`,
RLS-suite block), recipe editor "Variation of" field, `DetailScreen`
"Variations" block.
