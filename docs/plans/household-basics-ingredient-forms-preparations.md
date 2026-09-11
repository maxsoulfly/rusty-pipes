# Household Basics, Ingredient Forms, and Homemade Preparations

**Status (2026-09-11): Household Basics COMPLETE. Ingredient Forms (Concept 2)
management + Suggested Substitutes shipped via `docs/plans/
substitutes-and-variations.md` (Stages A/B). Homemade Preparations
(Concept 3) SUPERSEDED by a smaller design in that same doc ("Stage D") —
planning only, not yet implemented either way.**

Household Basics — Stages 1–3 all done, committed, pushed, mobile-verified;
Stage 3 closed out 2026-09-10 (`21193fa`). See the Stage 3 close-out note
below for its two non-blocking limits.

Ingredient Forms — engine + data shipped; the one-direction rule, table, and
`computeAvail` tier are settled and confirmed working (Whiskey Sour /
Caipirinha). **All forward work on Ingredient Forms, Suggested Substitutes,
adapted availability, minimal Homemade Preparations, and Linked Variations now
lives in `docs/plans/substitutes-and-variations.md`** — read that doc, it is
the current source of truth for all four. Concept 3 below is kept only as
the historical record of the original (larger) Homemade Preparations
proposal; see its own section for the pointer to what actually supersedes
it.

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

**Stage 2 — Engine wiring, Ice only. — DONE 2026-09-09, committed (`c1629b9`) + pushed + mobile-verified by the user.**
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
- *Mobile check — PASSED (user, 2026-09-09):* a recipe needing only Ice
  (+ already-owned items) reads "Perfect," not "Almost"; its Ice row shows
  "Household basic" with the real quantity/prep and a green dot; it's absent
  from Buy Next; My Bar still shows Ice unowned (no checkmark, no inventory
  row); Library availability groups/counts agree; un-flag/re-flag revert
  cycle works.
- *Safe stop:* ships with exactly one basic live.

**Stage 3 — REVISED 2026-09-09: admin-editable onboarding config. COMPLETE + CLOSED OUT 2026-09-10.** 3a + 3b + 3c (+ safeupdate fix, retest PASSED) + 3d shortcuts + drag-to-reorder (drag FAILED first retest — `data-onboarding-row` was on `<Card>`, which drops unknown DOM props, so drop detection always got null; refixed on a `<div>` wrapper + window-listener-driven drag in `21193fa`; **drag retest PASSED by the user 2026-09-10**). See the close-out note directly below for the full verified scope and its two non-blocking limits.

### Stage 3 close-out — 2026-09-10

**User-confirmed on the real app (2026-09-10):**
- Drag-to-reorder works (mouse and touch).
- Save → reload preserves the new order.
- On iPhone, swiping outside the drag handle scrolls normally.
- The ⋯ menu shows "Onboarding ingredients".
- (Earlier, 3c retest) save/reload, ingredient replacement, group/order/Initial changes all work.
- Regular (non-staff) users cannot access Admin.

**Code-verified this close-out (not manually exercised):**
- All three shortcuts navigate to `/admin?tab=onboarding`:
  - Home "Build your bar" → **"Edit list"** — `BuildYourBar.jsx`, rendered only when `isAdmin` (from `HomeScreen` Outlet context → `App.jsx` `profile?.role === "admin"`).
  - My Bar ⋯ and Add ingredients ⋯ → **"Onboarding ingredients"** — one `AdminMenu.jsx` backs both (`SearchFilterHeader.jsx`, `AddIngredientsScreen.jsx`); `if (!isAdmin) return null`.
- Destination resolves: `/admin` is behind `RequireStaff` (`App.jsx`); `AdminScreen` `TABS` has `{ id: "onboarding", label: "Onboarding ingredients", adminOnly: true }`; the `?tab=onboarding` deep link initialises `tab` state to `"onboarding"` only when it is in `visibleTabs` (admin-only tabs filtered out for moderators), otherwise falls back to Overview — so a moderator hitting the URL via the side nav lands on Overview, not a broken tab; render guard `{tab === "onboarding" && isAdmin && <OnboardingTab />}`.

**Verification limits (non-blocking, carried forward):**
1. **Home "Edit list" link — visual/interaction check UNVERIFIED.** The link only renders inside the Build Your Bar widget, which `HomeScreen` shows only when the bar was empty at first inventory load this visit. The user's admin account owns ingredients and there is no empty-bar admin account; per the user's instruction, inventory was not cleared and no account/role was created for this check. Wiring is code-verified (above); the on-screen click was not exercised. Menu visibility alone is not treated as confirmation of the destination.
2. **Offline-save handling — UNVERIFIED.** `saveOnboardingConfig` failure keeps the draft and surfaces `err.message`; the offline/failed-RPC path has not been manually exercised.

**Fresh verification run (2026-09-10):** `corepack pnpm@10.34.3 test` 232/232, `pnpm build` clean. No code change in this close-out — docs only.

**2026-09-10 addition to 3d:** drag-to-reorder in the editor — a per-row grip
handle (Pointer Events; `touch-none` on the handle only so the rest of the row
still scrolls; not in the tab order), dragging within a group via the pure
`reorderOnboardingDraft` in `domain/buildYourBar.js` (+5 tests). The ↑/↓
buttons stay for keyboard/AT. Reorders use the same draft → Save/Discard →
atomic `set_onboarding_config` path. No migration.

**2026-09-10 design change for 3c (user override):** the admin editor holds a
**local draft** and saves the **whole config atomically in one call** —
additions, removals, group changes, initial flags and order together — rather
than the per-action write helpers described below. The 3a reorder-only
`set_onboarding_order` does not cover a full save, so a new
`set_onboarding_config(p_rows jsonb)` function (SECURITY INVOKER, one-txn
delete+insert, `search_path=''`, revoke/grant, RLS-gated) was added in
migration `20260910120000`. `set_onboarding_order` is kept (shipped, RLS-suite-
covered) but the app no longer calls it. `services/onboarding.js` exposes
`saveOnboardingConfig(rows)` only (position derived from array order); the
`add/remove/setInitial/setGroup/reorder` helpers below were **not** built.

The original Stage 3 (below, struck) hard-coded the onboarding lists in
`src/data/buildYourBarEssentials.js` and swapped Ice→Coke by editing that
file. The user instead wants the "Build your bar" lists to be **admin-managed
data**, so future curation needs no code / AI / redeploy. Revised design:

*User revisions to the approved design (2026-09-09):*
1. **Keep the Spirits / Mixers / Kitchen basics headings** in the expanded
   view — via a `group_label text` column (fixed 3-value check), not a
   custom group-management feature.
2. Admin picks a row's group from a **simple dropdown**, defaulting from the
   ingredient's catalogue category where possible (app logic, 3c).
3. **Ordering is preserved within each group** (`position`, filtered per
   group); the initial tiles use the **overall** `position` order.
4. **At most six** rows may be `is_initial = true` — enforced in the service
   + admin UI (the resolver also caps at 6 defensively). The admin tab shows
   the count and explains empty slots are backfilled.
5. **Reorder is atomic** — a `set_onboarding_order(uuid[])` function does the
   whole-list `position` reassignment in one statement, so a ↑/↓ can never
   persist half a swap.
6. **Seed names must resolve uniquely.** The migration asserts all 14 names
   map to exactly one `ingredient_types` row and **aborts** otherwise
   (missing or ambiguous, especially an initial-six name) rather than
   seeding a partial list.
7. **Permission tests** — extend `supabase/tests/rls_suite.sql`: member can
   read, only admin can write; anon denied.
8. The **read service** (`fetchOnboardingIngredients`) moves to **3b**, when
   Build Your Bar is wired — 3a is DB-only.

*Flag decisions confirmed by the user 2026-09-09:* keep Ice, Salt, Water,
White Sugar, **and Black Pepper** flagged `assumed_available`; **un-flag
Simple Syrup**; "Hot Water" has no catalogue row — skipped, not created.

### New table (ID-referenced, one ordered list + a group label + an initial flag)

```sql
create table public.onboarding_ingredients (
  ingredient_type_id uuid primary key
    references public.ingredient_types(id) on delete cascade,
  position integer not null,
  is_initial boolean not null default false,
  group_label text not null
    check (group_label in ('Spirits', 'Mixers', 'Kitchen basics'))
);
alter table public.onboarding_ingredients enable row level security;
create policy "onboarding_ingredients: members read"
  on public.onboarding_ingredients for select using (public.is_member());
create policy "onboarding_ingredients: admin writes"
  on public.onboarding_ingredients for all
  using (public.is_admin()) with check (public.is_admin());

-- Atomic whole-list reorder (revision 5). One statement, SECURITY INVOKER -
-- the admin-write policy still gates it; a non-admin call updates 0 rows.
create function public.set_onboarding_order(p_type_ids uuid[])
returns void language sql as $$
  update public.onboarding_ingredients o set position = v.ord
  from (select id, ordinality::int as ord
        from unnest(p_type_ids) with ordinality as t(id, ordinality)) v
  where o.ingredient_type_id = v.id;
$$;
revoke execute on function public.set_onboarding_order(uuid[]) from public, anon;
grant execute on function public.set_onboarding_order(uuid[]) to authenticated;
```

- **Expanded view** = every row grouped by `group_label` (3 fixed headings,
  fixed order Spirits → Mixers → Kitchen basics), within each group ordered
  by `position`. **Initial tiles** = the `is_initial` rows in overall
  `position` order, **backfilled** from the remaining rows (overall
  `position` order) up to six; ≤ 6 rows may be `is_initial`.
- `on delete cascade` + ID references → renaming an ingredient never breaks
  the list; deleting one auto-removes its row.
- `position`: plain integers, gaps allowed. Reorder goes through
  `set_onboarding_order()` (atomic). Order by `position`, then
  `ingredient_types.name` as a stable tiebreak.
- **RLS:** members read (BuildYourBar renders for everyone), `is_admin()`
  writes — matches `liquid_colors`/`glasses`. Moderators excluded for now.
  Covered by a new `onboarding_ingredients` block in
  `supabase/tests/rls_suite.sql`.
- **Seed in the same migration, name-resolved with a hard assertion:** the
  current 14 essentials with **Coke instead of Ice**, `is_initial = true`
  for Gin / Vodka / Soda Water / Coke / Lemon Juice / Lime Juice. A
  `do $$ … $$` block resolves all 14 names case-insensitively and
  `raise exception` if the resolved count ≠ 14 (a missing or ambiguous name)
  — a partial list is never written. After seed, every change is UI-only.
- **Never read by `recommendations.js`** — stays fully separate from
  `bar_priority` / Buy Next.

### Resolver — `resolveOnboardingSelection(rows, types)` (pure, `domain/buildYourBar.js`, built in 3b)

Returns `{ six: type[], groups: [label, type[]][] }`:
1. Resolve each `ingredient_type_id` to its type; drop rows whose type is
   missing.
2. **Exclude any type with `assumed_available === true`** from both outputs,
   every render.
3. `groups` = survivors bucketed by `group_label` into the 3 fixed headings
   in fixed order, each bucket sorted by `position` (then name).
4. `six` = `is_initial` survivors in **overall** `position` order, then
   backfilled from the remaining survivors (overall `position` order) until
   length 6; dedupe by id; fewer than 6 eligible → return what exists (no
   gap, no crash); more than 6 `is_initial` → first 6 by position.
5. Invariant: every item in `six` also appears in some `groups` bucket.

`resolveEssentialsList` (name-based) and `src/data/buildYourBarEssentials.js`
are **removed** in 3b — nothing else imports them (verified).

### Admin UI — "Onboarding ingredients" tab

- `AdminScreen.jsx` `TABS`: `{ id: "onboarding", label: "Onboarding
  ingredients", adminOnly: true }`, in the catalog-curation group.
- `src/components/admin/OnboardingTab.jsx`: rows grouped under the 3 fixed
  headings. Each row — ingredient name, a **group dropdown** (Spirits /
  Mixers / Kitchen basics), an **"Initial"** `OwnedToggle`, **↑ / ↓**
  (44×44), **remove**. The toggle is disabled once 6 rows are `is_initial`
  (and the block is explained: "6 selected — extra tiles are backfilled
  automatically"). A row whose type is `assumed_available` renders dimmed
  with a "Hidden — household basic" note. Below: a **"+ Add ingredient"**
  searchable type picker (reuse `TypesTab`'s search pattern), excluding
  types already listed; new rows default their group from the ingredient's
  catalogue category (Spirit→Spirits, Mixer→Mixers, else Kitchen basics).
- `services/onboarding.js` (**write side in 3c**):
  `addOnboardingIngredient(typeId, group)` (position = max+1),
  `removeOnboardingIngredient(typeId)`, `setOnboardingInitial(typeId, bool)`
  (rejects a 7th), `setOnboardingGroup(typeId, group)`,
  `reorderOnboarding(orderedTypeIds)` → `supabase.rpc('set_onboarding_order', …)`
  (atomic). Each action = write + `catalog.refetch()`, matching
  `NamedRowManager`. The **read** fn `fetchOnboardingIngredients` is added in
  **3b** (moved earlier per revision 8) so Build Your Bar can fetch its
  config when wired.
- `useCatalog` gains `onboardingIngredients` in its existing `Promise.all`
  (in **3b**), shared via Outlet context (honours "call the catalog hook
  once in AppShell").

### Shortcuts

- **Page-level:** an admin-only "Edit list" link by the "Build your bar"
  heading → `/admin?tab=onboarding`. `HomeScreen` adds `isAdmin` to its
  context destructure and passes it to `BuildYourBar`.
- **Reachable when the bar is non-empty (widget hidden):** a second item
  **"Onboarding ingredients"** in the My Bar / Add-ingredients **⋯
  `AdminMenu`** (`src/components/myBar/AdminMenu.jsx`) → `/admin?tab=onboarding`.
  That menu sits on always-reachable headers. (The Admin side-nav entry is
  also always available to staff.)

### Edge cases (explicit answers)

- **Configured ingredient deleted:** `on delete cascade` drops its row. It
  vanishes from both lists; backfill fills the six from the next eligible
  `expanded` entry. No dangling ref, no error. (Strictly better than the old
  name list, where a delete produced a dropped tile + a console error.)
- **Configured ingredient later flagged `assumed_available`:** the row
  **stays** in the table (independent systems), but the resolver excludes it
  from both rendered lists every render; if it was `is_initial`, backfill
  fills the slot. Un-flagging later makes it reappear in its configured
  position. The admin tab shows it dimmed ("Hidden — household basic") so the
  exclusion is visible and the admin can remove or park it. (This is exactly
  what happens to Ice today.)
- **Fewer than six eligible:** the grid shows however many exist — no
  placeholder, no crash. "Show all essentials" toggle still renders.
- **Empty config:** heading, copy, CTAs and the makeable-count line render;
  no tiles. Seed prevents this in practice; it's the safe floor.

### Preserved

Per-visit visibility snapshot (`HomeScreen`, reads `inventory` not the
config), tap-to-own selection, the live "N cocktails" count, "Show my
cocktails" / "Find more ingredients" nav — all untouched.

### Sub-stages

- **3a — flag reconciliation + schema + seed. DONE 2026-09-09 (committed + pushed).**
  Simple Syrup un-flagged (live `UPDATE`, not a migration); flagged set now
  Black Pepper / Ice / Salt / Water / White Sugar. Migrations
  `20260909130000_onboarding_ingredients` (table + `group_label` check + RLS +
  `set_onboarding_order()` INVOKER fn + asserting name-resolved 14-row seed,
  Coke for Ice, 6 `is_initial`), `20260909140000_..._policy_role_scope`
  (`alter policy ... to authenticated` — RLS suite caught the `to public`
  slip), `20260909150000_set_onboarding_order_search_path` (`db advisors`
  finding cleared). `rls_suite.sql` extended with an `onboarding_ingredients`
  block — full suite passes. `db advisors` no new finding. `pnpm test`
  216/216, `pnpm build` clean. Inert — nothing reads the table yet.
- **3b — read service + resolver + BuildYourBar wiring. DONE 2026-09-10
  (committed + pushed; mobile verification held for the user).**
  `src/services/onboarding.js` `fetchOnboardingIngredients` (read only;
  write fns deferred to 3c); `useCatalog` fetches it into
  `catalog.onboardingIngredients` via the existing `Promise.all`;
  `resolveOnboardingSelection(rows, types)` in `domain/buildYourBar.js`
  (`resolveEssentialsList` removed) + 13 tests (assumed_available excluded
  from both outputs; flagged initial pulls the next backfill candidate up;
  dedupe; < 6 eligible → fewer, no crash; > 6 is_initial → first 6 by
  position; deleted-id row dropped, doesn't consume a slot; `six` ⊆ groups;
  empty config; null-safe). `BuildYourBar.jsx` reads it (3 fixed headings,
  empty groups hidden, "Show all essentials" toggle only when the expanded
  view holds more than the six). `buildYourBarEssentials.js` + its
  name-based tests deleted. `pnpm test` 223/223, `pnpm build` clean,
  isolated-LF `oxfmt --check` clean.
- **3c — admin editor. DONE 2026-09-10 (committed + pushed); retest PASSED.**
  First real Save raised `DELETE requires a WHERE clause` — the
  `authenticator` role preloads `pg-safeupdate` and rejected
  `set_onboarding_config`'s bare whole-list DELETE (the RLS suite missed it:
  `db query --linked` doesn't preload safeupdate). Fixed in migration
  `20260910130000` (`delete ... where true`, pg-safeupdate's recommended
  form; SECURITY INVOKER / RLS / atomicity unchanged). RLS suite got a
  source-level regression guard. **User retest on the real app (2026-09-10):
  saving works, reload persists, replacing ingredients works, order/group/
  Initial changes save; non-staff can't reach Admin. Offline-save handling
  not manually verified.** `src/components/admin/OnboardingTab.jsx`
  + `AdminScreen` `TABS` entry `{ id: "onboarding", label: "Onboarding
  ingredients", adminOnly: true }` + render guard. **Atomic whole-config
  save** (user override — see the 2026-09-10 note above): migration
  `20260910120000_set_onboarding_config.sql` (SECURITY INVOKER plpgsql,
  validate array / ≤6 initial / no dup id, then delete-all + insert-all in
  one txn; `search_path=''`; `revoke ... from public, anon` +
  `grant ... to authenticated`; advisors clean), `services/onboarding.js`
  `saveOnboardingConfig(rows)`. Editor: flat grouped-invariant draft, dirty
  diff vs. last-saved snapshot, `Save changes` / `Discard`, `N/6 initial`
  counter + backfill explainer at the cap, group `Select`, `★ Initial` toggle
  (disabled OFF→ON at 6), 44×44 ↑/↓ (swap within group) + remove, searchable
  "Add ingredient" picker (name+alias, excludes listed, capped 20, group
  defaulted via `defaultOnboardingGroup`), household-basic rows dimmed +
  struck + "Hidden — household basic". Save failure keeps the draft + shows
  `err.message`; success → `catalog.refetch()`. `rls_suite.sql` extended
  (admin replace; >6 rejected + config intact; member denied + config intact;
  anon no EXECUTE) — full suite passes. `pnpm test` 227/227, build clean,
  isolated-LF `oxfmt --check` clean.
- **3d — shortcuts + drag-to-reorder. DONE 2026-09-10 (committed + pushed);
  drag retest PASSED, Stage 3 closed out.** BuildYourBar admin "Edit list"
  link (`isAdmin` threaded `HomeScreen` → `BuildYourBar`); `AdminMenu` gains
  an "Onboarding ingredients" item next to the kept "Edit ingredients" (backs
  both the My Bar and Add ingredients ⋯ menus); all → `/admin?tab=onboarding`.
  Plus drag-to-reorder in the editor: per-row grip handle, Pointer Events,
  `touch-none` on the handle only, `reorderOnboardingDraft` (pure, +5 tests),
  ↑/↓ retained for keyboard/AT, same draft → atomic save. No migration.
  **Drag reorder was broken on first retest (mouse + touch): the
  `data-onboarding-row` drop marker was on `<Card>`, which doesn't forward
  unknown DOM props, so `elementFromPoint().closest("[data-onboarding-row]")`
  always returned null. Refixed in `21193fa` — marker on a `<div>` wrapper;
  drag now driven by `window` `pointermove`/`pointerup`/`pointercancel`
  listeners (survive the handle re-rendering mid-reorder);
  `pointer-events:none` on the dragged row; 4px threshold. User retest on the
  real app 2026-09-10: drag works (mouse + touch), save → reload preserves
  order, off-handle swipe still scrolls on iPhone, ⋯ menu shows "Onboarding
  ingredients", non-staff can't reach Admin.** Two non-blocking limits carried
  forward — Home "Edit list" visual check (no empty-bar admin account; wiring
  code-verified) and offline-save handling (see the Stage 3 close-out note
  above). `pnpm test` 232/232, build clean, isolated-LF `oxfmt --check` clean.
- Each: `corepack pnpm@10.34.3` test/build, `oxfmt --check` on isolated LF
  copies, commit + push. Mobile verification of 3b–3d held for the user
  (3b done; 3c done; 3d shortcuts + drag pending — drag FAILED once, fix
  pushed for retest).

### Permissions summary
- Read: `is_member()`. Write: `is_admin()`. Shortcut visibility gates on
  `isAdmin`; `/admin` stays behind `RequireStaff`; the table's RLS is the
  real boundary.

---

**Original Stage 3 (superseded by the revision above, kept for context):**
- ~~Flag the remaining confirmed names (data entry only, no code).~~
- ~~Replace Ice with Cola/Coke in `BUILD_YOUR_BAR_INITIAL_SIX`.~~
- ~~`resolveEssentialsList`/`BuildYourBar.jsx`: filter out `assumed_available`
  types from both the initial six and the expanded groups dynamically; top-up
  backfill from the expanded groups' existing order.~~
- ~~Tests: flagging a six member pulls the next candidate up; flagging an
  expanded-only type just removes it; flagging everything degrades cleanly.~~
- ~~Mobile check: six tiles no gap; Cola/Coke taps like any tile; expanded
  view lists no flagged basic.~~

---

## Concept 2 — Ingredient Forms — engine/data DONE; management UI + next steps moved to `docs/plans/substitutes-and-variations.md` (2026-09-10)

> The sections below record what shipped. The **forward plan** — retiring the
> standalone "Ingredient forms" tab in favour of a "Can provide" section in
> the Ingredient Type editor, the blank-guidance fix, plus the new
> **Suggested substitutes** and **Linked cocktail variations** designs —
> lives in `docs/plans/substitutes-and-variations.md`. Homemade Preparations
> (Concept 3) is unaffected and stays here, unstarted.

### Re-audit (live, 2026-09-10) — done

- **Type ids confirmed unambiguous:** Lemon `4af23ef0-d46b-48c2-a0f3-aa6140413d57`
  (category Garnish), Lemon Juice `f4058e53-5dfc-4c35-a7fb-322067debe67` (Juice),
  Lime `cc5fe68f-d5d6-4a8d-b0d2-46873142ca55` (Garnish), Lime Juice
  `f59e498f-cc7f-4199-aada-211fd855dc69` (Juice). None flagged
  `assumed_available`; no parent/child links; no products mapped to any of
  them.
- **The old "no recipe references Garnish types" note is wrong** — corrected.
  Live: Lemon (the whole-fruit Garnish type) is a `required` component of
  Whiskey Sour, `optional` in Boulevardier, and a garnish in ~10 more; Lime
  is `required` in Caipirinha. Lemon Juice is used by 18 recipes, Lime Juice
  by 7. So the one-direction rule genuinely matters: owning Lemon Juice must
  not satisfy a recipe that needs a whole lemon.
- **No existing `recipe_component_alternatives` links a fruit to its juice**
  (only an unrelated Lemon/Cherry garnish alternative on Whiskey Sour).

### Implemented

- **Engine — `src/domain/availability.js` `computeAvail()`** gains an optional
  5th arg `formConversions` (`{ rawTypeId, preparedTypeId, guidance }[]`).
  A new `matchInfoFor(component)` resolves each component in the dev-spec's
  exact precedence: **(1)** exact availability (owned or household basic),
  **(2)** a registered raw→prepared conversion whose raw side is available,
  **(3)** an authored `alternativeIds` substitution. First match wins;
  labels never stack. New return field `formConversions` — a map keyed by the
  component's own (prepared) id → `{ rawId, rawName, guidance }`, mutually
  exclusive with `substitutions` and `householdBasics`. `resolveOwnedIngredientTypes()`
  is **unchanged** — conversions are not unioned into the owned set, so
  `findRecipesUsingIngredient` (ingredient detail page) is structurally
  unaffected, same boundary as household basics.
- **One-directional by construction:** the map is only ever keyed by, and
  looked up on, a component's own (prepared) id. Owning the prepared form is
  never consulted to satisfy a raw requirement.
- **Buy Next / Home / Library stay consistent for free** — they read
  `computed[].avail` / `missing*Ids`, which now already account for
  conversions. `recommendations.js` is untouched; a regression test drives it
  end-to-end through `computeAvail`.
- **DB — migration `20260910140000_ingredient_form_conversions.sql`:**
  `ingredient_form_conversions (id, raw_type_id, prepared_type_id, guidance)`,
  both type FKs `on delete cascade`, `check (raw_type_id <> prepared_type_id)`,
  `unique (raw_type_id, prepared_type_id)`, `guidance` non-blank ≤200 chars.
  RLS: `is_member()` read, `is_admin()` write (moderators excluded, same as
  onboarding). **`forbid_inverse_form_conversion()` BEFORE INSERT/UPDATE
  trigger** (SECURITY INVOKER, `search_path=''`) rejects registering the
  inverse of an existing pair — belt-and-braces on the one-direction rule at
  the data layer. Seed: Lemon→Lemon Juice, Lime→Lime Juice, name-resolved
  with `select … into strict` so a rename/missing row aborts the migration.
  Follow-up migration `20260910150000_..._policy_role_scope.sql` scoped both
  policies `to authenticated` (same `to public` slip + fix as onboarding's
  `20260909140000` — an anon REST read was 401ing on `is_member` EXECUTE).
- **Service — `src/services/ingredientForms.js`:**
  `fetchIngredientFormConversions` / `create…` / `updateIngredientFormConversionGuidance`
  (guidance is the only editable field — retargeting a pair is delete + re-add)
  / `delete…`. `useCatalog` fetches it into `catalog.formConversions` via the
  existing `Promise.all`.
- **Admin UI — `src/components/admin/IngredientFormsTab.jsx`** + `AdminScreen`
  `TABS` entry `{ id: "forms", label: "Ingredient forms", adminOnly: true }`
  (after Onboarding) + render guard `{tab === "forms" && isAdmin && …}`. No
  shortcut/deep-link — pure admin catalogue config. DB errors (self-pair,
  duplicate, inverse) surface as-is; a save failure keeps the draft and shows
  the error beside the form. **UX reworked 2026-09-10** (see the "Ingredient
  Forms admin UX rework" chunk in `current-context.md`): capped `max-w-2xl`;
  compact conversion rows (pair heading, guidance beneath, 44×44 edit/delete
  alongside); a `+ Add conversion` button that reveals the form only when
  needed, with Cancel; the two ingredient pickers are a collapsed
  single-line `TypeComboBox` (reuses `Input`/`Btn`/`Card`) that opens inline
  on tap to a search box + a bounded `max-h-56 overflow-y-auto` result list
  (capped at 8 + a "N more" hint) and collapses on selection, with the pick
  shown in the trigger and re-openable; pickers side by side from `sm:`,
  stacked below; delete confirm via the shared `ConfirmPanel` (`layout="stack"`).
  Helper copy: "Whole ingredients can satisfy their prepared forms.
  Conversions work one way." Kept inline (no portal/overlay) so results and
  Save/Cancel stay reachable with a mobile keyboard open.
- **Recipe display — `IngredientsSection.jsx`** renders
  `formConversions?.[ri.ingId].guidance` in the same single sub-label slot as
  "Substituting: …" / "Household basic" (mutually exclusive), with the green
  satisfied dot. `DetailScreen` passes `c.formConversions` through.

### Verification

- `corepack pnpm@10.34.3 test` **242/242** (+10: 9 in `availability.test.js`
  covering directionality, all three precedence orderings, category-share
  isolation, arg-omitted parity, multi-raw; 1 in `recommendations.test.js`
  end-to-end). Unchanged by the UX rework (no domain/service change).
- `pnpm build` clean; isolated-LF `oxfmt --check` clean on every changed file
  (engine round + UX-rework round).
- **RLS suite** — new `ingredient_form_conversions` block (member read / anon
  no read / member write denied / admin insert+update+delete / self-pair
  rejected / blank guidance rejected / duplicate pair rejected / inverse-pair
  trigger rejects / cascade delete). Full suite passes.
- `supabase db advisors --type security` — no new finding (trigger fn is
  SECURITY INVOKER with a fixed `search_path`).
- Live REST check: anon GET on the table returns `200 []` (matches every
  other member-read table); seed rows present and correct.
- **No browser tooling in this sandbox** (no Playwright/Puppeteer/Chromium,
  `$PORT` unset) — the reworked tab's desktop and narrow-mobile layouts are
  NOT visually verified here.

### Confirmed by the user (2026-09-10)

- Lemon → Lemon Juice satisfies the Lemon Juice component in **Whiskey Sour**
  — green indicator + guidance line; **Simple Syrup still reads as missing**.
- Owning **Lime Juice** does **not** satisfy the whole-**Lime** requirement in
  **Caipirinha** (one-direction rule holds).
- Both seeded pairs (Lemon → Lemon Juice, Lime → Lime Juice) appear in the
  Ingredient Forms tab.

### Still unverified (non-blocking)

- Admin editing / saving in the Ingredient Forms tab (add a pair, cancel,
  edit guidance, save, delete) — and the reworked layout on desktop and on a
  narrow phone viewport.
- The remaining items from the original mobile checklist (precedence display
  when a substitution is also owned; Buy Next suppression).

### Deliberately out of scope (unchanged boundaries)

- Ingredient detail page's "recipes using this ingredient" list stays
  ownership-blind (no conversions fed to `findRecipesUsingIngredient`).
- Orange → Orange Juice and any other pair: still deferred until Lemon/Lime
  ships and is reviewed (open decision #2 below).

---

## Concept 2 — Ingredient Forms (original plan, kept for context)

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

## Concept 3 — Homemade Preparations — SUPERSEDED 2026-09-11 by a smaller design in `docs/plans/substitutes-and-variations.md` ("Stage D — Adapted Availability & Minimal Homemade Preparations")

**The `recipes.kind`/`produces_ingredient_type_id` proposal below, and its
full "re-audit every recipe consumer" requirement, are superseded — planning
only, nothing implemented yet either way.** The revised design does not
reuse the `recipes` table at all: two small new tables
(`ingredient_preparations`, `ingredient_preparation_inputs`) keyed by the
*produced* ingredient type, edited as a single optional block on that
type's own Ingredient Type editor, folded into the existing atomic
`save_ingredient_type()` save. Because a preparation is never a `recipes`
row, sharing/import-export/Lists/Search/RLS-on-`recipes` are never touched,
and the re-audit list below is moot. The depth-1 dependency guard, the
"manual ownership marking only" v1 boundary, and the "guidance must stay
visually distinct from owned" rule all carry forward unchanged into the new
design. Read the other doc's Stage D section for the actual plan to
implement; the material below is kept only as the historical record of the
original (larger) proposal and why it was replaced.

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

**Household Basics is COMPLETE (Stages 1–3, closed out 2026-09-10).**

**Everything else in this document (Ingredient Forms management, Suggested
Substitutes, Homemade Preparations, Linked Variations) is superseded by
`docs/plans/substitutes-and-variations.md` — go there for the current
status and the exact next action** (as of 2026-09-11: review the Stage D
proposal — Adapted Availability & Minimal Homemade Preparations —
planning only, not yet implemented). Do not start implementation from this
document.
