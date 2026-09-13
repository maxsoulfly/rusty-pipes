# Add a "moderator" role

**Archived 2026-09-14.** Originally written and executed 2026-08-25 as a
Claude Code plan kept outside this repo; recovered and copied in here
verbatim (only this header and the two bracketed notes below are new) after
a readiness audit found the shipped feature had no corresponding doc under
`docs/plans/archive/`. Verified against the actual repository before
archiving: all four migrations below exist on disk with the timestamps
named here, `src/App.jsx` has `isModerator`/`isStaff`/`RequireStaff` exactly
as described, `AdminScreen.jsx`/`UsersTab.jsx`/`ImportTab.jsx` have the
`adminOnly`/`ROLE_OPTIONS` plumbing described, and `supabase/tests/
rls_suite.sql` has a "moderator role" assertion section matching the plan
below. Treat everything past this header as the original plan document.

**[Addendum, not in the original plan]** A fifth migration,
`20260825100400_moderator_function_grant_fix.sql`, shipped the same day as
a follow-up: `db advisors` flagged `is_moderator()`/`is_admin_or_moderator()`
as callable by `anon`, because `create function` grants `EXECUTE` to
`PUBLIC` by default and the original migration's `revoke` only named
`anon`/`authenticated` — the general version of this gotcha is now
documented in `AGENTS.md`'s RLS section. Also, a later migration,
`20260910160000_ingredient_form_conversions_moderator_writes.sql`, extended
`is_admin_or_moderator()` write access to ingredient form conversions when
"Can provide" management moved into the Ingredient Type editor (see
`docs/plans/archive/household-basics-ingredient-forms-preparations.md` /
`docs/plans/archive/substitutes-and-variations.md`) — mentioned here only
so a future reader isn't surprised to find moderator-related grants in a
migration dated weeks after this plan.

---

## Context

The app currently has two roles (`admin`, `member`) per `docs/Cocktail_Library_Development_Spec.md` §4 and `profiles.role`'s check constraint. The user wants a third tier, **moderator**, that can:
- Fully author the ingredient catalog (ingredient types, categories, aliases, glasses, taste tags, cocktail families, liquid colors) and resolve pending ingredient requests — the same power admin has in the Catalog/Ingredient Types/Requests tabs today.
- Promote a community recipe to classic, demote a classic back to community, and unpublish/remove a recipe from community — exactly those three actions, not full classic-recipe editing/authoring rights.
- See a scoped-down Admin dashboard showing only the tabs/actions they actually have power over (no Users, no Invitations, no classic-recipe Edit/Delete, no recipe batch-import).

This is a deliberate, confirmed departure from the spec's two-role model — flagged to the user up front since `AGENTS.md`/`CLAUDE.md` require stopping before expanding scope past the documented spec. Scope, and every downstream judgment call, was pinned down via explicit multiple-choice questions before any code was touched (see "Resolved decisions" below).

## Resolved decisions

- **Ingredients**: full authoring power (Catalog tab's 7 lookup tables) + resolving ingredient_requests.
- **Recipes**: exactly Promote / Demote / Unpublish. No classic-recipe edit/delete, no authoring new classics via batch import.
- **Dashboard**: scoped down — Users and Invitations tabs stay admin-only and invisible to moderator; classic-recipe Edit/Delete and the Batch Import "Recipes" sub-tab stay admin-only within tabs moderator can otherwise reach.
- **`DetailScreen.jsx`'s Unpublish button** (on the recipe detail page itself, not just the Moderation tab list) also becomes available to moderator — same underlying action as Moderation tab's Unpublish, so it should behave consistently everywhere it appears.
- **Users tab role control**: replacing the current hardcoded binary toggle ("Make Admin ⇄ Demote to Member") with a role `<select>` (Member / Moderator / Admin) + a "Confirm change" button that's disabled until the selection differs from the row's current role — this is the user's own explicit design call, chosen specifically because it scales cleanly to a future 4th level without new button combinatorics. This single mechanism also serves as the confirmation step (deliberate select + explicit click), so no separate popup/confirm-panel is layered on top of it.
- **Not changing**: `OverviewTab.jsx`'s "Active Invitations" stat card will be hidden for moderator (dead-ended `onGoToTab("invites")` otherwise, since Invitations isn't in their tab list) — low-risk cosmetic default, not asked about explicitly. `MoreScreen.jsx`/`SideNav`'s "Admin"/"Admin Dashboard" labels stay verbatim for moderator too (the reduced tab set once inside already communicates the smaller surface; not worth a second label variant) — same reasoning, low-risk default.

## Migration plan (4 new files, sequenced after `20260823160000_liquid_colors_policy_role_scope.sql`)

Two new `SECURITY DEFINER` SQL helper functions, matching the existing `is_admin()`/`is_member()` style (`language sql stable security definer set search_path = public`):
- `public.is_moderator()` — `select exists (select 1 from public.profiles where id = auth.uid() and role = 'moderator')`.
- `public.is_admin_or_moderator()` — `select public.is_admin() or public.is_moderator()`. This is what every widened policy/function actually references, centralizing "what can staff collectively do" in one place instead of repeating the OR ~25 times.

**1. `20260825100000_moderator_role.sql`** — confirm the actual constraint name first (`select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c'`), then `drop constraint` / `add constraint check (role in ('admin', 'moderator', 'member'))`. Create `is_moderator()`/`is_admin_or_moderator()`. `create or replace function public.admin_set_user_role(...)` with `if new_role not in ('admin', 'moderator', 'member')` — the `if not public.is_admin()` caller guard stays untouched (only a real admin may call this at all, so a moderator can never self-serve further privilege). Re-issue the existing `revoke`/`grant execute` lines.

**2. `20260825100100_moderator_catalog_policies.sql`** — widen all 7 lookup tables' write policies via `ALTER POLICY` (in-place clause swap, same technique `20260823160000_liquid_colors_policy_role_scope.sql` already used for a one-qualifier change). For the six tables split by `20260815201731_optimize_rls_policies.sql` into separate insert/update/delete policies (`ingredient_categories`, `ingredient_types`, `ingredient_aliases`, `glasses`, `taste_tags`, `cocktail_families`): `alter policy "<table>: admin insert" ... with check (public.is_admin_or_moderator())`, `alter policy "<table>: admin update" ... using (...) with check (...)`, `alter policy "<table>: admin delete" ... using (...)` — 18 statements. `liquid_colors` still has one combined `"liquid_colors: admin writes"` `for all` policy (never got split) — widen it in place, no need to restructure to match the others. Leave every `"<table>: read"` policy untouched (already `is_member() or is_admin()` — moderator needs a live membership row independently, same as anyone; comment this explicitly: moderator is layered on top of membership, not a replacement).

**3. `20260825100200_moderator_ingredient_requests_policies.sql`** — widen **both** `ingredient_requests` policies that currently gate on `is_admin()`: `"ingredient_requests: read own or admin"` (select) and `"ingredient_requests: admin resolves"` (update). Both are required — `fetchPendingIngredientRequests()` does a blanket `status = 'pending'` read with no owner filter, so widening only the update policy would leave the Requests tab rendering with a usable button but zero visible rows. `"insert own"`/`"owner deletes while pending"` are untouched (no admin branch in either).

**4. `20260825100300_moderator_recipe_moderation_functions.sql`** — `create or replace function` for exactly three functions, each swapping one `is_admin()` reference for `is_admin_or_moderator()` (function bodies aren't partially alterable, so full bodies get restated, matching this repo's existing pattern for function changes):
- `admin_promote_recipe_to_classic(p_recipe_id uuid)` (`20260823130000_classic_promotion.sql:38`)
- `admin_demote_recipe_to_community(p_recipe_id uuid)` (same file, `:77`)
- `unpublish_recipe(p_recipe_id uuid)` (`20260815230002_recipe_publishing.sql:70`) — leave the `case when v_is_owner then 'active' else 'unpublished_by_admin' end` status literal exactly as-is; it's not surfaced anywhere as an admin-specific label, no need for a third enum value.

Re-issue `revoke`/`grant execute` for all three. Header comment lists everything **deliberately left admin-only**, since this is the one place someone would check "did we forget something": `publish_recipe()`'s admin branch (`20260815230002_recipe_publishing.sql:36`, publish-on-behalf-of, not one of the three granted actions), `admin_set_membership_revoked()`, `recipe_is_visible()`/`recipe_is_editable()` (and everything keyed off them: `recipes: update`/`delete`, `recipe_components`/`recipe_component_alternatives`/`recipe_taste_tags` policies) — widening any of these would silently grant classic-recipe-editing power the scope explicitly excludes — `"recipes: insert"`'s admin branch (blocks Batch Import → Recipes at the RLS layer too, defense in depth under the UI hide), `products` admin-update/delete, `"invitations: admin manages"`. `"profiles: read own or admin"` needs no change — display names are already member-readable per `20260823120000_public_display_names.sql`.

## JS app: `isModerator`/`isStaff` plumbing

**`src/App.jsx`** (`AppShell`, ~line 178): add `const isModerator = profile?.role === "moderator"` and `const isStaff = isAdmin || isModerator` alongside the existing `isAdmin`. Add both to `outletContext`. Rename `RequireAdmin` → `RequireStaff`, reading `isStaff` (so `/admin` becomes reachable by moderator; finer-grained actions inside stay gated by `isAdmin` specifically where noted below).

| File | Symbol | Decision |
|---|---|---|
| `App.jsx` route gate | `RequireAdmin`→`RequireStaff` | `isAdmin` → `isStaff` |
| `App.jsx` `<SideNav isAdmin={isAdmin} />` | sidebar Admin link | pass `isStaff` (rename prop to `isStaff` in `Nav.jsx`'s `SideNav({ isAdmin })` for honesty) |
| `MoreScreen.jsx` Admin Dashboard row | entry point | `isAdmin` → `isStaff`, copy unchanged |
| `DetailScreen.jsx` `canEdit` | classic-recipe Edit button | **unchanged, admin-only** |
| `DetailScreen.jsx` `canManage` | community-recipe Unpublish button | `isOwner \|\| isAdmin` → `isOwner \|\| isStaff` (per resolved decision above) |
| `EditorScreen.jsx` classic-edit gate | | **unchanged, admin-only** |
| `MyBarScreen.jsx` → `TypeCard.jsx`'s `isAdmin` prop | ingredient **type** edit (in scope) | pass `isStaff` |
| `MyBarScreen.jsx` → `ExpandedProducts.jsx`'s `isAdmin` prop | **product** edit/delete (out of scope) | **unchanged, admin-only** — two different props from the same screen, deliberately |
| `AdminScreen.jsx` | tab visibility (new) | destructure both `isAdmin`/`isStaff` from `useOutletContext()` |

No changes needed inside `RequestsTab.jsx`, `CatalogTab.jsx`, `TypesTab.jsx`, `ImportIngredientsSingle/Batch.jsx`, `ImportProducts.jsx`, `ModerationTab.jsx` — none read `isAdmin` today; their exposure is controlled entirely by whether `AdminScreen` renders their tab.

## `src/components/admin/UsersTab.jsx` rework (required — otherwise there's no UI path to ever grant moderator)

Replace `handleToggleRole`'s hardcoded binary toggle and the "Make Admin"/"Demote to Member" button pair with:
- A small shared `ROLE_OPTIONS = [{ value: "member", label: "Member" }, { value: "moderator", label: "Moderator" }, { value: "admin", label: "Admin" }]` constant (extensible for a future level, per the user's own reasoning).
- Per non-self row: a `<select>` defaulting to `u.role`, plus a "Confirm change" `Btn` that's `disabled` while the selected value equals `u.role`, calling `setUserRole(u.id, selectedRole)` (existing service function, already accepts any string with no client-side enum check — zero service-layer changes needed) on click. The deliberate select-then-click is the confirmation step itself; no separate popup panel.
- Block/Unblock stays exactly as today (separate boolean control, untouched).
- Self-row exclusion (`isSelf`) stays as today — no role control rendered for your own row.

## `AdminScreen.jsx` tab visibility + two partial-tab cases

Extend the existing `TABS` array (~line 49) with a capability flag:
```js
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "recipes", label: "Classic Recipes" },
  { id: "moderation", label: "Moderation" },
  { id: "catalog", label: "Catalog" },
  { id: "types", label: "Ingredient Types" },
  { id: "import", label: "Batch Import" },
  { id: "requests", label: "Requests" },
  { id: "users", label: "Users", adminOnly: true },
  { id: "invites", label: "Invitations", adminOnly: true },
]
```
`visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)` drives the tab-button bar. **Also gate the content blocks themselves** (`{tab === "users" && isAdmin && <UsersTab .../>}`, same for `"invites"`) — not just the button — since `OverviewTab.jsx`'s stat cards call `onGoToTab("invites")` directly via `setTab`, bypassing the button bar entirely. Hide the "Active Invitations" stat card itself for moderator in `OverviewTab.jsx` too (resolved decision above).

**`ClassicRecipesTab.jsx`**: `AdminScreen.jsx` passes a new `isAdmin` prop (not passed today). Wrap the Edit button, Delete button, and both their confirm blocks in `{isAdmin && (...)}`. The Demote button/confirm needs no additional check — the tab is only reachable once `isStaff` is true, and Demote is fully in scope for any staff member who gets there.

**`ImportTab.jsx`**: `AdminScreen.jsx` passes `isAdmin` (not passed today). Change `ENTITIES` the same way as `TABS`:
```js
const ENTITIES = [
  { id: "ingredients", label: "Ingredients" },
  { id: "recipes", label: "Recipes", adminOnly: true },
  { id: "products", label: "Products" },
]
```
filter by `isAdmin` before rendering the switcher buttons, and gate `{importEntity === "recipes" && isAdmin && <ImportRecipes .../>}` for the same defense-in-depth reasoning as Users/Invites. `ModerationTab.jsx`/`RequestsTab.jsx` need no internal changes — everything they expose is fully in scope.

## `supabase/tests/rls_suite.sql` extension

- Add `moderator_id` to `rls_fixture_ids`, sourced the same way as `member_owner_id`/`member_other_id` but a **third**, distinct real non-revoked member account (`order by m.granted_at asc offset 2 limit 1`) + an assert it's non-null and distinct from the other two. **Prerequisite**: the linked hosted project needs a 3rd real non-revoked member account for this to pass — flag this to the user before running, since only 2 are currently assumed to exist.
- Promote that fixture in-transaction: `update public.profiles set role = 'moderator' where id = moderator_id;` (safe exactly like every other `RLS_TEST`-prefixed mutation in the file — the whole script rolls back at the end). Place this near the end of the file, after every block that already uses `member_owner_id`/`member_other_id` as "ordinary member" fixtures, matching the file's existing top-to-bottom narrative order.
- New `-- ── moderator role ──` section:
  - A narrower helper (or inline calls) confirming moderator can insert/update/delete each of the 7 lookup tables (reusing the same literal insert/update values the existing admin calls already use).
  - `ingredient_requests`: moderator can read all pending requests and resolve one (mirrors the existing admin assertions).
  - Recipe moderation trio as one continuous story reusing the still-live `rls_recipe_ids.shared_id` fixture: promote (assert `source_type = 'classic'`), demote back (assert reverted), unpublish (assert `visibility = 'private'`, `moderation_status = 'unpublished_by_admin'`) — all as `moderator_id`.
  - Negative/boundary assertions proving the scope fence, not just that grants work: `admin_set_user_role()`/`admin_set_membership_revoked()` both raise for moderator (reuses the existing `exception when raise_exception` pattern); a direct classic-recipe insert (`source_type='classic', owner_id=null, visibility='shared'`) is denied with `insufficient_privilege`; moderator can't update/delete a `products` row; moderator gets zero `invitations` rows and a denied insert.
  - Sanity check: moderator still passes the ordinary "member can read" lookup-table assertion (proves moderator is additive on membership, not a replacement).
- Update the file's header coverage comment to mention the moderator role and its assertions, matching how earlier coverage expansions documented themselves.

## Verification

1. Run each new migration against the hosted linked project (`npx supabase db query --linked --file <migration>`), then `npx supabase db advisors --linked --type security` — expect no new findings beyond the long-familiar accepted baseline (SECURITY DEFINER-callable-by-authenticated WARNs for the two new/changed functions, leaked-password-protection).
2. Run the extended `supabase/tests/rls_suite.sql`, first confirming (or creating) a 3rd real non-revoked member fixture account. Verify the failure path still works via a deliberately-sabotaged copy before trusting a clean pass (same discipline as every earlier RLS suite chunk this session), then confirm zero `RLS_TEST%`/leftover state after the real run.
3. `pnpm build`, `pnpm test`, `pnpm format`, `npx --yes oxlint -D no-undef` on every changed JS file.
4. Manual browser click-through once an admin promotes a real test account to moderator via the new Users tab control: confirm the moderator sees exactly Overview/Classic Recipes(Demote only)/Moderation/Catalog/Ingredient Types/Batch Import(no Recipes sub-tab)/Requests, confirm Users/Invitations are unreachable (both by nav and by directly hitting `/admin` with `?tab=users`-style state if such exists), confirm Detail page Unpublish now shows for moderator on a community recipe, confirm a plain member still sees no admin entry point at all.

## Critical files

- `supabase/migrations/20260825100000_moderator_role.sql`, `20260825100100_moderator_catalog_policies.sql`, `20260825100200_moderator_ingredient_requests_policies.sql`, `20260825100300_moderator_recipe_moderation_functions.sql` (all new)
- `src/App.jsx` (isStaff/isModerator, `RequireAdmin`→`RequireStaff`, outletContext, canManage widening)
- `src/screens/AdminScreen.jsx` (tab visibility filter + content-block gating, prop threading)
- `src/components/admin/ClassicRecipesTab.jsx`, `src/components/admin/ImportTab.jsx` (partial-tab splits)
- `src/components/admin/UsersTab.jsx`, `src/services/membership.js` (role-select rework — `setUserRole` itself needs no change)
- `src/components/admin/OverviewTab.jsx` (hide Invitations stat card for moderator)
- `src/components/myBar/TypeCard.jsx`/`ExpandedProducts.jsx`, `src/screens/MyBarScreen.jsx`, `src/components/Nav.jsx`, `src/screens/MoreScreen.jsx` (prop renames/threading)
- `supabase/tests/rls_suite.sql` (moderator fixture + new assertion section)
