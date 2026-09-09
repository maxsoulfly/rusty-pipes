# Household Basics, Ingredient Forms, and Homemade Preparations

**Status (2026-09-09): Household Basics Stage 1 + Stage 2 committed + pushed.**
Stage 1 (schema + admin toggle) is phone-verified. Stage 2 (engine wiring,
Ice only) is code-complete, live, and unit-tested; **Stage 2 mobile
verification is pending the user.** Ice is the only flagged type live
(confirmed against the DB: id `d949c9b0-ba2b-4389-995c-55c6e29b101e`, category
`Other`, no parent/children, `assumed_available = true`). **Stage 3 (remaining
basics + onboarding cleanup) is next**, starting with the live name check for
Sugar/Salt/Water/Hot Water/Cola. Ingredient Forms and Homemade Preparations
are unchanged: direction only, subject to the pre-stage re-audits each section
calls out.

## Goal

Recognize what someone can actually prepare from what they own, without
requiring every ingredient *form* to be marked separately. Three genuinely
separate mechanisms, kept from blurring into each other:

1. **Household basics** — a catalogue-wide "just assume this" flag (Ice, Salt,
   plain Sugar, Water, Hot Water).
2. **Ingredient forms** — owning a raw ingredient can satisfy a recipe that
   asks for its prepared form (owning Lemon satisfies a Lemon Juice
   requirement), never the reverse.
3. **Homemade preparations** — some things (Simple Syrup) need an actual
   preparation step even once every input is available; surfaced honestly,
   not silently assumed.

---

## Corrections to the original audit (apply these, don't repeat the old claims)

- **My Bar's inline admin edit pencils were removed.** `IngredientTypeEditor`
  is no longer referenced anywhere in `MyBarScreen.jsx` or `src/components/myBar/`
  (confirmed by grep — zero matches). Ingredient-type editing today happens
  only through **Admin → Ingredient Types**, reached from My Bar via the ⋯
  `AdminMenu` ("Edit ingredients" → `/admin?tab=types`). That menu's own
  *visibility* is gated on `isAdmin` specifically (not `isStaff`), but the
  underlying Admin tab and `IngredientTypeEditor` itself are not — a
  moderator reaches the same screen directly via the side nav, and the RLS
  write policies already admit `is_admin_or_moderator()`. So: admins and
  moderators can both manage the new "Household basic" toggle once it ships,
  same as every other field on that form; the My Bar shortcut itself just
  happens to only surface for admins today, which is a pre-existing,
  unrelated shortcut-visibility detail, not a permission boundary.
- **Do not claim "no recipe references the Garnish-category ingredient
  types."** That line came from a historical `current-context.md` note and
  has since been contradicted by verified screenshots showing recipes using
  garnish ingredients. Historical notes describe a point in time, not current
  catalogue usage — Ingredient Forms' pre-stage audit (below) must check real
  `recipe_components` usage fresh, not rely on that old note either way.

---

## Concept 1 — Household Basics (approved, ready to start)

### What's reused
- `resolveOwnedIngredientTypes()` in `src/domain/availability.js` — the one
  function that builds the "owned" set every screen reads from a single
  shared `App.jsx` memo (`resolvedOwned` → router Outlet context → Home,
  Library, Detail, Lists, Buy Next all consume it). One insertion point, no
  per-screen changes.
- `ingredient_types` already has admin/moderator write RLS
  (`is_admin_or_moderator()`); the new column needs no new policy.
- `IngredientTypeEditor.jsx` — the shared admin form (Admin → Ingredient
  Types tab; My Bar's edit pencils are gone, see correction above) — is
  where the new toggle goes, next to `bar_priority`.
- The existing "Substituting: X" inline-label pattern in
  `IngredientsSection.jsx` — reused verbatim in shape for the new
  **"Household basic"** label (wording approved, do not re-ask).

### Design
- New column: `ingredient_types.assumed_available boolean not null default false`.
- **No propagation through parent/child.** Assumed-available ids are unioned
  into the availability set *after* the existing ancestor-walk runs — they
  satisfy only their own exact `ingredient_type_id`, never a parent, never a
  child. This removes the Water/Hot-Water hierarchy ambiguity entirely: each
  must be flagged explicitly if both should count.
- `computeAvail()` gains a `householdBasics` output map (same shape as the
  existing `substitutions` map) so the UI can render "Household basic"
  instead of leaving the label blank, without touching the four existing
  `avail` tiers.
- `ingredientRecipeMatches.js`'s reverse "which recipes use this ingredient"
  lookup deliberately does **not** receive the assumed-available set — it's
  explicitly documented as ownership-blind (viewing ≠ owning), and must stay
  that way. Add a one-line comment there so a later edit doesn't "fix" it.

### User-facing behavior
A flagged ingredient (e.g. Ice) shows in a recipe's ingredient list with its
real quantity and prep text, a satisfied (green) indicator, and the label
**"Household basic"**. It never appears as missing, never drives a Buy Next
suggestion, never shows as owned or checked in My Bar, and is never eligible
for Speed Rack — none of that reads from the availability set, only from
real `user_inventory` rows, which this feature never touches.

### Catalogue entries — still needs a live check
Every one of these names needs confirming in the live Admin UI before
flagging (the app's anon key is correctly RLS-blocked from reading
`ingredient_types`, and the git history shows the real catalogue was
populated by admin batch import, not by any committed migration or seed
file — so nothing here can be confirmed from the repo alone):

| Name | Note |
|---|---|
| Ice | One prior "verified live" comment exists (`buildYourBarEssentials.js`, 2026-09-06) — still worth re-confirming since the catalogue could have changed since. |
| Sugar | A migration-inserted row named **"White Sugar"** (category Sweetener) is the only concrete lead from git history — confirm whether that's the real target, or whether a separate plain "Sugar" also exists. |
| Salt | No lead in git history at all — confirm the exact live name, and that no "Flavored Salt"/"Smoked Salt" would be mistaken for it. |
| Water | No lead in git history. Real ambiguity risk — the catalogue has "Soda Water," "Tonic Water" as distinct real types; confirm a plain generic "Water" row exists at all before assuming there's something to flag. |
| Hot Water | No lead in git history. Confirm it exists as its own row; because propagation is now explicit-only (see above), its relationship to "Water" no longer matters for correctness — flag both by name if both should count. |
| Cola/Coke (onboarding replacement, see below) | No lead in git history — confirm the exact live name before wiring it into `BUILD_YOUR_BAR_INITIAL_SIX`. |

**Flag unresolved names rather than guessing** — if a name can't be found or
is ambiguous, list it as still-open in `current-context.md` rather than
picking a best guess.

### Stages

**Stage 1 — Schema + admin toggle (inert, no behavior change). — DONE 2026-09-09, committed + pushed.**
- Migration `20260909120000_ingredient_types_assumed_available.sql`: adds
  `assumed_available boolean not null default false` + column comment stating
  the no-propagation rule. Applied to the live DB (ledger 47/47,
  `local == remote`). No new RLS policy/grant — blanket table UPDATE grant +
  `ingredient_types: admin update` policy (admin + moderator) already cover
  it; no column-scoped grants on the table. Not a `SECURITY DEFINER`
  function, so no `db advisors` re-run.
- `fetchIngredientTypes()` selects `assumed_available`;
  `updateIngredientType()` threads `assumedAvailable` → `assumed_available`.
- `IngredientTypeEditor.jsx`: "Household basic" `OwnedToggle` row after the
  bar-priority `Select`, `assumedAvailable` state + `handleSave` passthrough.
- *Tests:* none added (plain passthrough field). `pnpm test` 201/201,
  `pnpm build` clean. Formatting verified via `oxfmt --check` on isolated LF
  copies — `pnpm format` was **not** run (oxfmt 0.2.0 CRLF bug; see
  `current-context.md`'s Stage 1 chunk).
- *Live verification:* column is `boolean NOT NULL DEFAULT false` with the
  comment; 111 rows, 0 flagged; the exact `fetchIngredientTypes` select
  string returns HTTP 200 (was 400 before the push).
- *Verified:* phone check passed (user, 2026-09-09) — toggle taps cleanly,
  ON and OFF both persist after Save + reopen.
- *Safe stop:* fully inert; ships and sits with zero effect until Stage 2.

**Stage 2 — Engine wiring, Ice only. — DONE 2026-09-09, committed + pushed. Mobile verification pending.**
- `resolveOwnedIngredientTypes()` takes optional `assumedAvailableTypeIds`,
  unioned in **after** the ancestor walk and never itself walked → exact id
  only, no propagation up or down. Kept a separate arg, not folded into
  `ownedTypeIds`.
- `computeAvail()` takes optional 4th arg `householdBasicIds`; matching uses
  `owned.has(id) || basics.has(id)`; returns a `householdBasics` map (same
  shape as `substitutions`). A basic reached only via an explicit
  `alternativeIds` entry stays in `substitutions` instead.
- `App.jsx` derives `householdBasicTypeIds` from `catalog.types` and feeds it
  to both functions. `IngredientsSection.jsx` renders a green dot + a
  "Household basic" sub-label (same slot as "Substituting: X", never both).
- `ingredientRecipeMatches.js` deliberately does **not** receive the assumed
  set (comment added) — ingredient/bottle discovery stays ownership-blind.
- **Ice is the only flagged type live** — id
  `d949c9b0-ba2b-4389-995c-55c6e29b101e`, category `Other`, no parent/children.
  No migration/seed (the flag is admin-UI data). Downstream surfaces
  (badges, Library groups/counts/filters, Home "Almost There", Buy Next, My
  Bar/Speed Rack, Copy Recipe) verified consistent with no code change — they
  read `computed[].avail`/`missing*Ids` or raw `inventory.*`.
- *Tests:* `corepack pnpm@10.34.3 test` 216/216 (+15). `availability.test.js`
  covers: assumed basic alone satisfies its exact component; no up/down
  propagation; no cross-branch leak; real ancestor walk still applies with
  assumed ids present; omitting the arg == unchanged output; `householdBasics`
  map contents; a basic used as an authored `alternativeIds` entry reads as a
  substitution (not a basic); normal ownership unchanged.
  `recommendations.test.js` — a recipe missing only flagged Ice yields no Buy
  Next candidate (end-to-end through `computeAvail`).
  `ingredientRecipeMatches.test.js` — viewing an unrelated ingredient never
  surfaces an Ice-using recipe. `pnpm build` clean. Formatting via
  `oxfmt --check` on isolated LF copies (`pnpm format` not run — CRLF bug).
- *Mobile check (pending user):* a recipe needing only Ice (+ already-owned
  items) reads "Perfect," not "Almost"; its Ice row shows "Household basic"
  with the real quantity/prep and a green dot; it's absent from Buy Next; My
  Bar still shows Ice unowned (no checkmark, no inventory row); Library
  availability groups/counts agree. Un-flagging Ice reverts all of it.
- *Safe stop:* ships with exactly one basic live.

**Stage 3 — Remaining entries + onboarding cleanup.**
- Flag the remaining confirmed names (data entry only, no code, instantly
  reversible per item).
- Replace Ice with **Cola/Coke** in `BUILD_YOUR_BAR_INITIAL_SIX` (Soda Water
  already occupies its own slot in the six and is untouched).
- `resolveEssentialsList`/`BuildYourBar.jsx`: filter out any type with
  `assumed_available = true` from **both** the initial six and the expanded
  groups, dynamically — not a hand-maintained list. Add a simple top-up
  fallback: if filtering drops the initial six below six, backfill from the
  next unused name in the expanded groups' existing order, so a future flag
  change can only ever shrink gracefully — never duplicate a tile, never
  leave a gap.
- *Tests:* extend the essentials-resolution test — flagging a type
  currently in the six pulls the next candidate up (not a shrink to five);
  flagging a type that's only in the expanded groups just removes it there;
  flagging everything degrades to whatever's left, not a crash.
- *Mobile check:* Build Your Bar widget still shows six tiles with no gap;
  Cola/Coke behaves like any other tap target; the expanded "all essentials"
  view no longer lists any flagged basic.

---

## Concept 2 — Ingredient Forms (agreed direction; details subject to review before Stage 4 starts)

### Audit findings
- The catalogue already separates raw and prepared forms structurally: a
  **"Garnish"** category holds whole-fruit types (Orange, Lemon, Lime,
  Cherry, Berries — `20260816012630_garnish_category.sql`), fully distinct
  from the **"Juice"** category (Lemon Juice, Lime Juice, and — confirmed via
  a later fix, `current-context.md` — a real standalone "Orange Juice" type
  too). No parent/child link exists between a fruit and its juice today.
- `recipe_component_alternatives` is **per-recipe-component**, not a global
  type-to-type rule — it can't express "Lemon always covers Lemon Juice
  everywhere" without an admin manually adding that alternative to every
  recipe that uses Lemon Juice. A global, directional mechanism is genuinely
  new, not a reuse of that table.
- **Correction applied:** don't assume current `recipe_components` usage of
  Garnish types from the old historical note — re-check it fresh as part of
  the Stage 4 pre-work (see re-audit list below).

### Approved scope for v1
**Lemon → Lemon Juice and Lime → Lime Juice only**, and only after a live
check confirms both pairs still resolve to exactly the catalogue rows this
audit found. No other raw/prepared pairs (e.g. Orange → Orange Juice) are in
scope until this pair is shipped and reviewed.

### Approved matching priority (applies per recipe component)
When a component could be satisfied more than one way, check in this order
and show **only the winning explanation** — never stack labels:

1. **Exact available ingredient** — real ownership or a household basic
   satisfies the component's own type id directly. No extra label needed
   (or "Household basic," per Concept 1).
2. **Preparation of the requested ingredient from owned fruit** — a
   registered raw→prepared conversion is satisfied (e.g. own Lemon, recipe
   wants Lemon Juice). Label: guidance text like "Squeeze fresh juice from
   Lemon" — never phrased as "Substituting."
3. **An explicitly allowed substitution** — a real
   `recipe_component_alternatives` row for that component is satisfied.
   Label: the existing "Can replace X" / "Substituting: X" phrasing,
   unchanged.

This is a real change from my first pass, which had checked substitution
before form-conversion — the approved order is the reverse, and `computeAvail()`'s
`matchedIdFor` must check in exactly this sequence, stopping at the first
match.

### Proposed mechanism (subject to review)
A new admin-managed table, directional only — the reverse lookup (does
owning Lemon Juice satisfy a Lemon requirement) is never performed anywhere
in the engine, by construction, not by a runtime check:

```
ingredient_form_conversions (raw_type_id, prepared_type_id, guidance text)
```

### Re-audit required before this stage begins
- Confirm, live, whether any current `recipe_components` row already
  references a Garnish-category type (Lemon/Lime especially) — do not trust
  the old "no recipe uses these" note either way.
- Confirm the exact live names/ids for Lemon, Lemon Juice, Lime, Lime Juice.

### User-facing behavior
Owning Lemon satisfies a Lemon Juice requirement, shown with "Squeeze fresh
juice from Lemon" inline. Owning Lemon Juice never satisfies a Lemon
requirement — a recipe needing a lemon wedge/peel/whole lemon for garnish
still reads as genuinely missing if no whole lemon is owned.

### Tests (once implementation starts)
- Directional-only satisfaction: raw satisfies prepared; prepared never
  satisfies raw.
- Priority order: a component satisfiable by both a form-conversion and a
  substitution shows the form-conversion explanation, not the substitution
  one (and vice versa is never true — form-conversion always wins per the
  approved order when both apply, since it's checked first, right after
  exact availability).
- A form-conversion is never applied to an unrelated component just because
  both ingredient types happen to share a category.

---

## Concept 3 — Homemade Preparations (agreed direction; details subject to review before Stages 5–6 start)

### Audit findings
- `recipes.glass_id` is `not null` today — a real blocker to reusing the
  table as-is for a non-cocktail preparation. `family_id` is already
  nullable, and the JS mapping layer (`mapRecipe`) already tolerates a
  missing glass join defensively — a low-risk sign that relaxing this
  constraint is safe, but this must be re-confirmed against every recipe
  consumer (see re-audit list below), not assumed from one code path.
- `recipe_components`/`recipe_taste_tags`/the existing RLS helper functions
  (`recipe_is_visible`/`recipe_is_editable`) are generic enough to reuse
  as-is.
- `fetchRecipes()` fetches every visible recipe unconditionally — reusing
  `recipes` for preparations means every consumer of that table or of
  `fetchRecipes()`/`fetchRecipe()` needs to be re-checked, not just the
  Library/Home screens I originally looked at.

### Approved v1 boundary
**Manual ownership marking is acceptable for v1.** Finishing a preparation's
instructions does not automatically create a `user_inventory` row — the user
marks it owned themselves afterward via the existing My Bar toggle, exactly
like owning any other product. No new ownership-mutation code in v1.

**"Make Simple Syrup" guidance must stay visually and textually distinct
from already having syrup.** The preparable-suggestion annotation (see
below) is never allowed to look like, or sit in the same slot as, a
satisfied/owned indicator — it's a link to instructions, not a claim of
availability. `avail` itself stays honest: a cocktail needing un-made Simple
Syrup keeps reading "Almost"/shows it as missing until the user has actually
marked it owned.

### Proposed mechanism (subject to review)
```
recipes.kind text not null default 'cocktail' check (kind in ('cocktail','preparation'))
recipes.produces_ingredient_type_id uuid references ingredient_types(id)
-- glass_id relaxed to nullable, with a check tying the requirement to kind = 'cocktail'
-- a preparation must declare what it produces; a cocktail must not
```
`fetchRecipes()` filtered to `kind = 'cocktail'` by default; a separate small
fetch serves preparation detail views. A new pure function annotates a
missing ingredient with a "you can make this" suggestion only when a
preparation exists for it *and* that preparation's own inputs are all
currently satisfied (owned, household basic, or form-converted).

### Dependency guard — corrected scope
**Depth capped at exactly one level: a preparation's own inputs may never
include a type that is itself produced by another preparation.** This must
be enforced as a **whole-graph check on every write**, not a check of only
the row currently being saved:
- **Self-reference:** a preparation's own `produces_ingredient_type_id` must
  not appear among its own inputs.
- **New preparation vs. existing ones:** does this preparation's inputs
  include a type any *existing* preparation already produces?
- **Existing preparation edited later:** changing an existing preparation's
  `produces_ingredient_type_id` or its inputs must re-run the same check
  against every other preparation, not just validate the edited row in
  isolation — a later edit could just as easily introduce a violation that
  didn't exist at creation time.

Because depth is capped at exactly one, this is two flat queries against all
preparations at write time, not a recursive graph walk — deliberately kept
small, per instruction. Deeper preparation-of-preparation chains remain
explicitly out of scope for v1.

### Re-audit required before this stage begins (explicit instruction — filtering one fetch is not sufficient evidence of isolation)
Before adding any preparation records, re-check **every** recipe consumer,
not just `fetchRecipes()`:
- Public recipe sharing (`services/sharedRecipe.js`, the
  `20260826120000_public_recipe_share.sql` migration, and the public share
  route) — must a preparation be excluded there too, or is it moot since
  preparations are never `visibility = 'shared'`-published the same way?
- Import/export (`ImportRecipes.jsx`, batch import, any export path).
- Lists (`useLists.js`, Favorites/Want to Make) — can a preparation be
  favorited/added to Want to Make today, and should it be able to?
- Search and Library filtering — every place that queries `recipes`
  directly or joins through it.
- RLS/permissions — confirm `recipe_is_visible`/`recipe_is_editable` and the
  recipes RLS policies behave correctly for `kind = 'preparation'` rows
  (they should, since those policies don't reference `kind`, but this needs
  confirming, not assuming).

### Tests (once implementation starts)
- The depth-1 guard rejects self-reference.
- The depth-1 guard rejects a new preparation whose inputs include an
  already-produced type.
- The depth-1 guard rejects editing an existing preparation into a
  violation (both directions: changing its inputs, and changing what it
  produces).
- `fetchRecipes()` excludes preparations; every re-audited consumer above
  gets its own explicit test or a documented reason none is needed.
- A preparable suggestion appears only when the preparation's own inputs are
  fully satisfiable, and disappears once the produced type is genuinely
  owned.
- The suggestion never changes `avail`, and is rendered distinctly from a
  satisfied/owned indicator (a UI-level check, not just a data-level one).

---

## Remaining open decisions (only what's left after this round)

1. The live catalogue-name checks listed under Concept 1 (Sugar/Salt/Water/
   Hot Water/Cola-Coke) — next session's first action.
2. Concept 2: whether Orange → Orange Juice (now confirmed to exist as a
   real catalogue pair) should be added once Lemon/Lime ship and are
   reviewed — not decided now, deliberately deferred.
3. Concept 3: whether "mark as made" should later auto-create a
   `user_inventory` row — explicitly not built in v1, revisit after it ships.

---

## Exact next-session starting action

1. Wait for the user's phone confirmation of Stage 2 (see Stage 2's *Mobile
   check* line). Do not mark Stage 2 fully done without it.
2. Then **Household Basics Stage 3 (remaining basics + onboarding cleanup)**.
   First action: verify the live catalogue entries for Sugar, Salt, Water,
   Hot Water, and Cola/Coke using authorized (logged-in) access to Admin →
   Ingredient Types. Record exact names/ids, flag anything missing or
   ambiguous rather than guessing. Then flag the confirmed ones (data entry,
   no code) and do the onboarding-list filter + top-up fallback per the
   Stage 3 spec below.
3. Ingredient Forms and Homemade Preparations stay in "agreed direction, not
   started" until Household Basics is done — their pre-stage re-audits
   (above) happen when their stages actually begin, not before.
