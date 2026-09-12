# Ingredient Detail Page

**Planning document — 2026-09-12.** Written after Stage D (Adapted
Availability & Homemade Preparations, `docs/plans/
substitutes-and-variations.md`) shipped and was manually verified. This
feature reuses Stage D's shared `computeMakeability()` result rather than
introducing a second one.

**Status: v1 COMPLETE - Stages I.1 through I.4 all DONE + pushed,
2026-09-12/13** (tappable ingredient links, shared-tier grouping, basic
identity display, the My Bar Add/Remove action, the relationships/
homemade-preparation sections, and the admin/moderator "Edit ingredient"
shortcut - see the Staged implementation plan section below for exactly
what shipped). **I.1-I.3 manually verified by the user; I.4 has only
automated verification (tests + build) so far, not yet a manual/browser
check** - see `current-context.md`'s chunk history for the exact owed
check. Linked Variations (Stage C, `docs/plans/
substitutes-and-variations.md`) and any broader Ingredient Detail visual/
design redesign remain explicitly NOT started, each on a separate
go-ahead.

---

## Current problem

Browsing a recipe and finding a missing ingredient forces a detour: leave
the recipe, go to My Bar → Add ingredients → search → add, then navigate
back. Concretely - on the Bloody Mary page, Tomato Juice shows as missing;
realizing you actually own it means abandoning the page entirely to fix
that, then returning.

Ingredient names should be first-class, navigable objects: tap Tomato
Juice, see (and fix) your ownership right there, understand what else it's
useful for, and come back to a recipe that's already recalculated - because
it reads the same shared inventory state everything else does.

---

## Audit (existing code, not assumptions)

**An ingredient/bottle detail screen already exists and is already routed
and linked.** This feature is an *enrichment* of it, not a new page:

- Routes already exist in `src/App.jsx`: `/bar/type/:id` →
  `<IngredientDetailScreen kind="type" />`, `/bar/product/:id` → the same
  component with `kind="product"`.
- `src/screens/IngredientDetailScreen.jsx` already renders: a `TopBar` with
  a Speed Rack pin toggle (owned items only); "cocktails using this
  ingredient" grouped into perfect/good/almost/unavail buckets (capped at
  10, with a "View all" link into `/library?ingredient=<id>`); a "not
  found" fallback for a stale link.
- **Already wired from My Bar**: `src/screens/MyBarScreen.jsx` already
  navigates here on tap (`onCardClick={() => navigate(\`/bar/type/${type
  .id}\`)}`, and the same for a product's own name). `TypeCard.jsx` already
  keeps card-body-tap (navigate) and the dedicated 44px ownership checkmark
  (`onToggleOwned`, `e.stopPropagation()`) as two deliberately separate
  handlers - "exploring an ingredient must never risk silently changing
  what's owned" (that file's own comment, from the prior My Bar redesign).
  **This exact split is the template this plan reuses** for the cocktail
  detail page's ingredient rows (see Navigation below) - it does not need
  to be invented.
- **Not currently wired anywhere else.** `DetailScreen.jsx`'s ingredient
  list (`IngredientsSection.jsx`) renders each ingredient name as plain
  text, not a link. Neither does `AddIngredientsScreen.jsx`/
  `ExpandedProducts.jsx` (deliberately - those rows already have their own
  tap-to-own meaning, discussed under Scope below).
- **The ingredient/bottle detail page's own matching is deliberately
  "viewing ≠ owning"** (`src/domain/ingredientRecipeMatches.js`,
  `findRecipesUsingIngredient()`) - it treats the viewed type as
  hypothetically satisfied *only* to decide which recipes reference it (a
  component matching it directly, or as a configured general-substitute
  alternative), while every recipe's own `avail`/`display` is passed through
  from real inventory, completely unaffected by what's being viewed. This
  is correct and unrelated to the "own it" question - kept exactly as-is.
- **Its grouping is currently the one place in the app still grouping by
  strict `avail`, not the shared `display.tier`.** Library, Home, and Lists
  all moved to `display.tier`-based grouping in Stage D.2; this screen
  didn't, because Stage D wasn't finished yet when it shipped (pre-dates
  Stage D entirely) and was explicitly noted as "stays ownership-blind, out
  of scope" in Stage D's own surfacing table. Now that Stage D is complete
  and verified, this is a loose end worth closing as part of this feature -
  today, a cocktail resolvable only through adaptation would show under
  "Unavailable" on an ingredient's own detail page even though Library/Home
  correctly show it as makeable. **Not a regression to fix urgently on its
  own** (nobody asked for it standalone), but directly relevant here since
  this feature's whole point is "what can I do with this ingredient," and
  it's a small, mechanical reuse of an already-shared function once this
  page is being touched anyway.
- **History worth knowing before adding an admin action here:** an earlier
  My Bar redesign stage *did* put an inline, admin-only `IngredientTypeEditor`
  directly on this exact screen - and a later stage deliberately **replaced**
  it with a single admin-only "Edit ingredients" shortcut (a header ⋯ menu
  on My Bar/Add ingredients) that lands on Admin → Ingredient Types in
  general, not deep-linked to the specific type (`current-context.md`,
  the My Bar redesign chunk history: *"Stage 1 put a lightweight admin-only
  inline IngredientTypeEditor on IngredientDetailScreen. That is replaced
  by: one admin-only ⋯ menu ... whose single item 'Edit ingredients' opens
  Admin → Ingredient Types directly."*). This plan's own admin affordance
  (below) deliberately follows that same lesson - a plain link out, not a
  reintroduced inline editor or a new deep-link mechanism.
- **Every data source this feature needs is already loaded and shared** via
  `AppShell`'s outlet context (`src/App.jsx`) - no new fetch, no new
  Supabase query:
  - `catalog.types` already includes `description` (`services/catalog.js`'s
    `fetchIngredientTypes()` select already lists it) and
    `assumed_available` - **an ingredient description field already exists
    in the schema**, just not rendered to a member anywhere yet.
  - `catalog.categories`, `catalog.products`, `catalog.formConversions`
    ("Can provide"), `catalog.ingredientSubstitutions` ("Can be replaced
    by"), `catalog.ingredientPreparations` +
    `catalog.ingredientPreparationInputs` (homemade preparation) - all
    already fetched once in `useCatalog()` and shared.
  - `inventory.ownedTypeIds`/`ownedProductIds` + `inventory.toggleType()`/
    `toggleProduct()` - the exact same optimistic mutation functions every
    other My Bar surface already calls, from the same single shared
    `useInventory()` instance (`AppShell`).
  - `computed` (each recipe already carrying `strict`/`adapted`/`display`
    from `computeMakeability()`, Stage D.1) and `owned` (the resolved
    ownership Set) are both already in outlet context.
  - The one thing **not** already exposed via context is the household-
    basic id Set (`householdBasicTypeIds` is a local variable inside
    `AppShell`, not passed through) - recomputing it locally from
    `catalog.types.filter(t => t.assumed_available)` (the same one-line
    derivation `App.jsx` already does) is simpler than widening the shared
    context for one screen.

**No schema changes are required for any part of this feature**, including
the optional description (see Data model impact below).

---

## Proposed UX

One enriched page (not six separate ones), read top to bottom:

1. **Identity.** Name (already the `TopBar` title). Category name (resolve
   `resolvedType.category_id` against `catalog.categories`, small/muted -
   only if it adds information beyond the name). Description - only
   rendered when `resolvedType.description` is non-blank; this is already
   in the schema, just not surfaced to a member before now.

2. **My Bar action.** For a `kind="type"` page: a prominent primary button,
   "Add to My Bar" / "Remove from My Bar" depending on
   `inventory.ownedTypeIds.has(id)`, calling `inventory.toggleType(id)` -
   the exact function every other screen already calls, so navigating back
   to the cocktail that sent you here sees the same recalculated
   `computed` with zero special-case code (see Reuse below for exactly
   why). For `kind="product"`: the same shape, `toggleProduct(id)`.
   **Household basics never show this control** - `assumed_available`
   types show an explanatory line instead ("Always available - assumed to
   be in every bar", matching the exact wording `IngredientTypeEditor.jsx`
   already uses for its own household-basic toggle), since there's no real
   per-user row to add or remove for a catalogue-level flag.

3. **Relationships**, each rendered only when data exists for this type,
   phrased as plain directional facts (never "≈"/equivalence language):
   - **Can provide** - rows where `formConversions.raw_type_id === id`
     ("Owning this can satisfy a recipe that needs <prepared>," with its
     guidance text).
   - **Can be replaced by** - rows where `ingredientSubstitutions
     .from_type_id === id` ("Owning <target> can stand in here," with its
     flavor note).
   - **Deliberately excluded:** `recipe_component_alternatives` (Stage B's
     adopted, recipe-scoped alternatives) - those are true only for one
     specific recipe, not a fact about the ingredient, and showing them
     here would misrepresent them as general.
   - **Deliberately not shown (v1):** the reverse-informational direction
     (e.g. Lemon Juice's own page noting "Lemon can be prepared into
     this"). Genuinely useful, but adds a second lookup direction and a
     wording pass to keep it from reading as equivalence; left as a later,
     optional polish rather than blocking v1.

4. **Homemade preparation** - shown only when `ingredientPreparations` has
   a row with `produces_type_id === id`: its name, ordered instructions,
   and every input with its amount/unit (reusing `formatAmount()`'s
   ml/oz-aware rendering the same way `IngredientsSection.jsx`'s own
   expandable preparation panel already does). Each input additionally
   shows whether it's currently satisfied (reusing `isPreparationSatisfiable()`
   per-input, not a new check) - useful signal ("you have 1 of 2") without
   claiming the produced ingredient itself is owned. Never marks the page's
   own ingredient as owned just because its preparation is satisfiable -
   that's exactly the `computeMakeability()` "adapted," not "owned,"
   distinction Stage D already drew, and this page must not blur it.

5. **Cocktails using this ingredient** - the page's existing section,
   kept, but regrouped: `findRecipesUsingIngredient()` is unchanged (still
   viewing-blind, still ownership-real for `avail`/`display`), but the
   grouping switches from raw `avail` to the shared `display.tier`
   (`domain/availabilityGroups.js`'s `groupByDisplayTier()`/
   `DISPLAY_TIER_ORDER` - the exact function Library already uses),
   picking up the "Make With Adaptations" category and its correct rank
   position for free. "Organized by usefulness" is exactly this tier order
   (makeable-now tiers first) - **not** a new per-ingredient "would this
   specific purchase unlock/restore" computation (that's Buy Next's own,
   separate, already-built mechanism; re-deriving a variant of it here
   would be inventing a new recommendation system, which this feature
   explicitly should not do). If real usage later asks for that finer
   distinction on this page, it's a small follow-up, not part of v1.

6. **Admin affordance** - for `isAdmin || isModerator` only, a small "Edit
   ingredient" action in the `TopBar` (alongside the existing Speed Rack
   pin button) - **not** an inline editor on this page (tried once already
   in an earlier My Bar redesign stage and deliberately replaced with
   exactly this kind of plain shortcut - see Audit above). **Superseded,
   2026-09-13:** the text below originally said this would navigate to the
   general `/admin?tab=types` and explicitly deferred a deep-link to the
   specific type as a future enhancement - the user's own I.4 request
   explicitly asked for direct navigation into the ingredient's own
   editor instead, so I.4 shipped with `/admin?tab=types&type=<id>` (see
   the Staged plan's I.4 entry for exactly what that required). Kept
   below, unedited, as the historical record of the original v1 decision.

   ~~that navigates to `/admin?tab=types` and **not** a new
   deep-link-to-this-type mechanism (a real but small enhancement;
   explicitly deferred, see Staged plan).~~

---

## Route / navigation model

**No new routes.** `/bar/type/:id` and `/bar/product/:id` already exist,
already resolve to `IngredientDetailScreen`, and are already linked from
My Bar. This plan enriches that one screen/component.

**New tappable entry point: the cocktail detail page's ingredient list**
(`src/components/detail/IngredientsSection.jsx`), the concrete friction
point in the request. Each row currently renders its ingredient name as a
plain `<span>`; it becomes a link to `/bar/type/${ri.ingId}` (a component's
`ingId` is always an ingredient TYPE id, never a product id - always the
`type` route). Reuses the exact interaction split `TypeCard.jsx` already
established: **only the name itself becomes tappable, not the whole row**
- the row already contains its own separate control (the "How to make it"
preparation-expand button added in Stage D.3), and per the project's own
mobile-first rule, a link doubling as a button still needs a real ≥44px
touch target, not just colored text - achieved with padding rather than by
enlarging the whole row's visual height (a padding + matching negative
margin, so the row's layout doesn't shift). The substitute/adapted-match
name inside a row's sub-label (e.g. "Substituting: Spiced Rum") is **not**
linked in v1 - a reasonable later enhancement (all its data - `matchedId` -
already exists), deliberately out of scope for a first pass to keep the
row simple.

**Second tappable entry point, added as a same-day I.1 follow-up:
`HeroCard.jsx`'s "Missing: X" panel** (the recipe's own detail page's
prominent missing-ingredient callout, e.g. "Missing: Tomato Juice" on the
Bloody Mary - the exact example that motivated this feature). Each name in
`c.missingRequired` links via `c.missingRequiredIds[i]` (the same-order id
array `domain/availability.js` builds `missingRequired` from). The shared
interactive treatment (route, ≥44px tap target, no-underline hover/focus)
was extracted into `src/components/detail/IngredientLink.jsx` once a
second component needed it identically - typography and any
host-specific horizontal bleed stay per-caller.

**Deliberately not wired** (per explicit scope, and because each of these
already has its own tap meaning, or is nested inside an element with its
own conflicting navigation):
- `AddIngredientsScreen.jsx` / `ExpandedProducts.jsx` - tapping there
  already means "own/select this," the exact tension `TypeCard.jsx`'s own
  comment already documents avoiding; changing that is an unrelated My Bar
  redesign, explicitly out of scope.
- The recipe editor's ingredient rows (`IngredientRowsEditor.jsx`) - the
  "name" there is a live, editable text input mid-draft, not a static
  label; navigating away would risk the draft. Does not fit naturally.
- Admin screens - out of scope; admin already has its own ingredient
  management surface.
- `CocktailCard.jsx`/`SmallCard.jsx`'s grid-card "missing" badges, and
  `HomeScreen.jsx`'s "Almost There" list row - all three name a missing
  ingredient too, but sit *inside* a card/row whose entire container
  already has its own `onClick` navigating to that cocktail's own page.
  Nesting an ingredient link inside would conflict with that existing
  navigation (not just a style question) - left alone.
- `IngredientsSection.jsx`'s `missingOptional` footer line ("Optional/
  garnish: X not in your bar") - a plain-text summary of non-required
  items, not a per-ingredient "missing requirement" callout, and doesn't
  currently have ids threaded through to that component at all.

---

## Data model impact

**None required.** Every section above reuses an already-fetched column or
table. The one column this feature newly *surfaces* to members -
`ingredient_types.description` - already exists (added for batch import,
currently write-only from that path, read but never rendered anywhere).

**Optional, separately callable out, not required for v1:** letting an
admin/moderator edit `description` directly from `IngredientTypeEditor.jsx`
(today it's `"Not editable in this form - carried through the save
unchanged (it comes from batch import)"`). Worth doing eventually so a
description can be added/fixed without a batch re-import, but this plan's
v1 only needs to *display* it - editing it is a small, separate,
optional follow-up.

---

## Reuse summary (the actual point of this section)

| Need | Reused from | New code |
|---|---|---|
| Ownership read + mutation | `useInventory()` (`ownedTypeIds`/`ownedProductIds`, `toggleType`/`toggleProduct`) - the one shared `AppShell` instance | None - just call it |
| "Does my ownership change reach the originating cocktail automatically?" | Yes, for free - `computed` is derived from the same shared `inventory`/`owned` state every screen reads (`App.jsx`'s `useMemo` over `computeMakeability()`). Navigating back re-renders `DetailScreen` off the same context, already recalculated. | None |
| Makeability / adapted status | `computeMakeability()`'s `display` (Stage D.1), already on every `computed` recipe | None |
| "Cocktails using this ingredient" | `findRecipesUsingIngredient()` (unchanged) | None |
| Tier grouping/ordering | `groupByDisplayTier()`/`DISPLAY_TIER_ORDER` (`domain/availabilityGroups.js`, Stage D.2) | None - this screen currently has its own local, stale (`avail`-based) copy; switch it to the shared one |
| Category label wording (e.g. "Make With Adaptations") | `ADAPTED_CATEGORY_LABEL` / the tier-heading dict already used by Library | Small: extract Library's currently-local `AVAIL_GROUP_LABEL` into `src/data/constants.js` so this screen can share it too, rather than a third private copy (see Staged plan, I.1) |
| "Can provide" / "Can be replaced by" data | `catalog.formConversions` / `catalog.ingredientSubstitutions`, filtered by this type's id - the exact same filter `IngredientTypeEditor.jsx`'s own editor already does | None |
| Preparation data + satisfiability | `catalog.ingredientPreparations`/`ingredientPreparationInputs`, filtered by `produces_type_id`; `isPreparationSatisfiable()` (`domain/makeability.js`, already exported) | None |
| Household-basic id set | Not in outlet context today | One local `useMemo` in this screen, same one-liner `App.jsx` already has |
| Admin link | Existing `/admin?tab=types` route/query param (already how the My Bar ⋯ menu gets there) | None |

No new domain module, no new pure function, no new recommendation
algorithm - the entire feature is presentation + navigation wiring over
data and logic that already exists.

---

## Staged implementation plan

The user's suggested stages assumed a page being built from scratch;
since it already exists and everything it needs is already loaded, the
actual work reorders cleanly around **"ship the friction fix first, then
layer in richer content, then admin polish"**:

**I.1 - Tappable ingredient links + correct (shared) tier grouping. DONE,
2026-09-12.**
- `IngredientsSection.jsx`: ingredient names become links to
  `/bar/type/:ingId` (name only, ≥44px target via padding + a canceling
  negative margin, no change to the row's own preparation-expand button).
- `IngredientDetailScreen.jsx`: replaced its local `GROUP_ORDER`/`byTier`
  construction with `groupByDisplayTier()` (Stage D.2's shared function)
  plus a new shared `capGroupsByTotal()` (added to `domain/
  availabilityGroups.js`, unit-tested) for the existing "cap at 10 total"
  rule; extracted Library's `AVAIL_GROUP_LABEL` into `src/data/
  constants.js` so both screens import the same heading dict (no third
  copy). Also added basic identity for this stage (category name +
  `description`, both already-loaded fields, no schema change) - the
  request for I.1 was expanded slightly beyond this doc's original
  staging to include identity display; relationships/substitutions/
  preparation content remain I.3, unchanged.
- *Acceptance:* tapping an ingredient name on any recipe's detail page
  opens that ingredient's page; a cocktail resolvable only via adaptation
  now correctly appears under "Make With Adaptations" here too, not
  "Unavailable"; existing Speed-Rack/"View all"/not-found behavior is
  unchanged. **User-confirmed passed** (functional flow: navigate + Back).
- **Polish pass (same day):** the ingredient-name link's permanent
  underline read as a conventional hyperlink and was visually noisy in a
  dense ingredient list. Restyled: no underline, typography back to plain
  pre-I.1 text; interactivity communicated via a subtle neutral hover/
  active tint + a visible focus ring (matching `Card`'s existing
  convention) instead; the link's invisible hit area bleeds left by the
  status dot's width so the dot is effectively part of the same tap
  target without moving it into the link's own DOM. Styling-only, one
  file (`IngredientsSection.jsx`) - no route/logic change.

**I.2 - My Bar action (Add/Remove). DONE, 2026-09-12.**
- The prominent ownership button described above, `type` and `product`
  variants, household-basic explanatory line instead of a button.
  Decision logic (household-basic check, combined-ownership read for
  `kind="type"`, and the type-vs-product mutation dispatch) extracted
  into a new pure `src/domain/ingredientOwnership.js` (10 unit tests) so
  it's testable without rendering; the screen calls it and adds only
  local pending/error UI state around the existing `toggleType`/
  `toggleProduct` calls.
- *Acceptance:* adding/removing ownership here updates My Bar and Buy Next
  immediately (same shared `inventory` instance); navigating back to the
  cocktail that linked here shows it recalculated with no special-case
  code; a household-basic ingredient never shows an Add/Remove control.
  **User verification of the actual flow (Bloody Mary → Tomato Juice →
  Add → Back → recalculated; a household basic shows the explanatory
  line) is still owed** - not browser-verified in this sandbox.

**I.3 - Identity, relationships, and preparation display. DONE, 2026-09-13.**
- Category name + description (already-loaded data, new rendering only) -
  actually shipped as part of I.1's own expanded scope, not repeated here.
- "Can provide" / "Can be replaced by" read-only sections - each row's
  related-ingredient name is a tappable `IngredientLink` (reused as-is);
  a small green dot is a secondary "you already have this" signal, reading
  the app-wide resolved ownership Set (already household-basic-aware).
  Decision/shaping logic extracted into a new pure
  `src/domain/ingredientRelationships.js` (9 unit tests covering
  directionality, no-reverse-fabrication, and that a recipe-specific
  alternative has no path into this general list).
- Preparation section: inputs + quantities/units (via the existing
  `formatAmount()`) + ordered steps + per-input satisfiability (reusing
  `isPreparationSatisfiable()`, called per-input with a 1-element array -
  not a new check). The produced ingredient is never marked owned just
  because its inputs are satisfiable.
- *Acceptance:* Lemon's page shows "Can provide: Lemon Juice"; Simple
  Syrup's page shows its two inputs, their amounts, and its steps, with
  each input's own owned/missing state shown honestly; a type with none of
  this configured shows none of these sections (no empty headings). **Not
  yet browser-verified** - see `current-context.md`'s chunk entry for the
  manual checks still owed (Lemon, White Rum, Simple Syrup).

**I.4 - Admin affordance. DONE, 2026-09-13.**
- Admin/moderator-only "Edit ingredient" icon button in the `TopBar`
  (same size as the existing Speed Rack pin button, visually secondary to
  the page's primary Add/Remove My Bar action). Gated on `isStaff`
  (`isAdmin || isModerator`, already computed in `App.jsx` - no new
  permission model); this is UI visibility only, the real authorization
  boundary (`save_ingredient_type()`'s RLS/role check) is unchanged.
- **Scope note - this deep-links, unlike this doc's original text below:**
  the user's own I.4 request explicitly asked for direct navigation into
  the specific ingredient's editor, not just landing on the general tab -
  this supersedes the "not a new deep-link-to-this-type mechanism...
  explicitly deferred" line further down (kept below as historical
  record of the original plan, not rewritten). Implemented via
  `/admin?tab=types&type=<id>` - `AdminScreen.jsx` gained a second query
  param read (`?type=`, alongside the existing `?tab=`) and `TypesTab.jsx`
  gained one new prop (`initialEditingTypeId`, the initial value for the
  row-level edit state it already had) - both small and additive, no new
  editor, `IngredientTypeEditor.jsx` itself untouched. Always targets the
  resolved ingredient TYPE's own id on both `/bar/type/:id` and
  `/bar/product/:id` (a product always maps to exactly one type; there is
  no separate product-level editor to link to instead). Decision logic
  extracted into a new pure `src/domain/ingredientEditTarget.js` (6 unit
  tests).
- *Acceptance:* a non-admin never sees the action; an admin/moderator does,
  and it lands directly on that ingredient's editor, already expanded, in
  Admin → Ingredient Types. **Not yet browser-verified** - see
  `current-context.md`'s chunk entry for the exact manual check still
  owed.

**Explicitly deferred, not v1** (per the request's own scope boundaries,
recorded here so a later session doesn't have to re-derive why):
deep-linking the admin action straight into this specific type's editor;
linking a substitute/adapted-match's own name inside a row's sub-label;
the reverse "provided by" relationship direction; a Buy-Next-style
per-ingredient unlock/restore annotation on the "cocktails using this"
section; Linked Variations; preparation chains; inventory quantities/ml
tracking; AI-generated descriptions; new automatic catalogue
substitutions; any unrelated My Bar redesign.

Each stage: `corepack pnpm@10.34.3` test + build, isolated-LF
`oxfmt --check`, commit + push, then a mobile checklist - no migration in
any stage, so no RLS suite / `db advisors` run is expected unless I.3's
description-editing follow-up is picked up later (it would touch
`save_ingredient_type()`, not schema).

---

## Testing

This feature is almost entirely presentation/navigation wiring over
already-tested pure functions (`groupByDisplayTier`, `computeMakeability`,
`findRecipesUsingIngredient`, `isPreparationSatisfiable` all already have
their own domain test coverage from prior stages) - **no new domain module
is introduced**, so there's little new pure logic to unit-test. Honest
expectation, matching this project's own established limits (no
jsdom/component-testing in this vitest setup):

- If Library's `AVAIL_GROUP_LABEL` is extracted into `src/data/constants.js`
  (I.1), that's a plain data move - no behavior to test beyond "the app
  still builds and existing tests still pass unmodified."
- If any new small pure helper emerges during implementation (e.g. a
  "combined ownership including product-mapped" check, mirroring
  `MyBarScreen.jsx`'s existing `isOwned = ownedTypeIds.has(typeId) ||
  productsByType.has(typeId)`), it should get a focused domain test the
  same way every other pure helper in this codebase does.
- The actual UI (tappable links, the My Bar button, section rendering) is
  a React rendering concern this project's test setup cannot exercise -
  each stage's manual mobile checklist is what actually verifies it, not a
  claimed automated test.

---

## Manual verification plan (per stage, kept short)

- **I.1:** Open any recipe with a missing ingredient → tap its name →
  land on that ingredient's page. Confirm a recipe that's adapted (e.g.
  Daiquiri, from Stage D's own verification) shows "Make With Adaptations"
  here, not "Unavailable."
- **I.2:** From a recipe's missing-ingredient link, add it to My Bar on
  its detail page → back button → confirm the recipe re-renders as
  makeable with no refresh needed. Confirm a household basic (e.g. Water)
  shows the explanatory line, not a button.
- **I.3:** Open Lemon → confirm "Can provide: Lemon Juice." Open Simple
  Syrup → confirm its two inputs, amounts, and steps render, each input
  showing correctly whether you currently have it.
- **I.4:** As a non-admin, confirm no edit action appears. As
  admin/moderator, tap it and confirm it lands on Admin → Ingredient Types.

---

## Open, non-blocking notes (recommended defaults, not decisions the user must make now)

- Section 3's reverse "provided by" direction, and linking a
  substitute/adapted-match's own name: both reasonable, both deferred (see
  Staged plan) - revisit only if real use asks for them.
- `description` editing in `IngredientTypeEditor.jsx`: recommended as a
  natural follow-up once this page makes the field visible to members, but
  not required to ship I.1-I.4.
- The "owned via a product, not a direct generic row" edge case on a
  `kind="type"` page's Add/Remove button: recommend mirroring
  `MyBarScreen.jsx`'s existing combined-ownership *read* (shows as owned)
  while the toggle itself still only ever writes the generic row (matching
  `TypeCard.jsx`'s already-established rule) - a small implementation
  detail, not a product decision.
