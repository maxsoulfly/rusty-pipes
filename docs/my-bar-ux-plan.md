# My Bar UX Plan — Owned-First Default + Add Ingredients Split

Saved 2026-09-06. **Stages 1 and 2 done, committed, and mobile-verified (2026-09-07). Stage 3 (Speed Rack) built and committed 2026-09-07 - mobile verification pending.** With Stage 3 verified, this plan is feature-complete. Engineering detail for each stage is in `current-context.md`.

## Direction

Rusty Pipes is mobile-first. My Bar should prioritize what the member owns, with a separate way to find and add ingredients. This document is the staged plan for that split, audited against the actual current implementation before any design was proposed.

## Audit summary (what's reused vs. new)

Already correctly built, reused as-is:

- `TypeCard.jsx` - separate `onCardClick` (view) vs. `onToggleOwned` (dedicated 44x44px checkmark, `stopPropagation`-safe). Ownership stays separate from viewing, exactly as this plan needs.
- `FamilyCluster.jsx` - groups a parent type with its children (e.g. Whiskey -> Bourbon/Rye/Scotch) into one cluster. Grouping logic reused; visual box treatment is what the shelf reskin (Stage 2) softens.
- `ExpandedProducts.jsx` - per-type product list; product-name tap opens `/bar/product/:id`; admin edit/delete inline; `OwnedToggle` per product. "Expand specific products under their type" is already built.
- `IngredientDetailScreen.jsx` - tap destination showing matching cocktails grouped by availability, with "View all" into Library. This already is "tap a bottle/name to open its matching cocktails."
- `isOwned(typeId)` in `MyBarScreen.jsx` - `ownedTypeIds.has(id) || productsByType.has(id)`, direct ownership only. **This already avoids the inferred-parent bug**: `resolveOwnedIngredientTypes()` (`src/domain/availability.js`) walks ownership *up* the hierarchy, but only for recipe-availability matching (an owned Dark Rum satisfies a recipe needing Rum) - never for My Bar's own "is this owned" display. A parent only shows as owned if directly owned; `coveringChildren` already surfaces "via Dark Rum" as a note on the unowned parent's card, not as false ownership. This plan preserves that distinction exactly, it does not need to be rebuilt.

Not yet built:

- No category-first "browse to add" flow. Today, adding a generic ingredient just is using the unified screen with "Owned only" switched off.
- `AddProductScreen.jsx` (`/bar/add`) is a *different, narrower* flow - registers one specific branded/homemade product under an already-known type, no category browsing. Stays as a sub-flow, not replaced.
- No shelf visual - today's grid is bordered `Card` tiles (`grid-cols-[repeat(auto-fill,minmax(104px,1fr))]`).
- No Speed Rack persistence anywhere - `user_inventory` is presence-only, no ordering/pin column. `ingredient_types`/`ingredient_categories` already have `shape`/`color`/`sort_order`, so the icon system this plan leans on already exists.
- Admin's inline pencil in `TypeCard` duplicates capability that already fully exists in `AdminScreen.jsx`'s "Ingredient Types" tab (`TypesTab.jsx` - search, edit, delete, merge, same `IngredientTypeEditor`). Removing it from the main browsing grid loses no admin capability.

## Approved decisions

1. **My ingredients is the owned-first default** at `/bar` (the mobile "My Bar" tab) - owned items only, grouped by category, empty categories hidden.
2. **A visible "+ Add ingredients" affordance** (always present in My ingredients' header, not a mode toggle) opens category-first catalogue browsing with search that works globally regardless of which category is selected.
3. **Build Your Bar's "Find more ingredients" opens `/bar/add-ingredients?focus=1`** (repointed from today's `/bar?focus=1`) - since My ingredients is now owned-first and would be empty for a first-time member, the onboarding intent ("help a new member start adding") now maps onto the new Add ingredients screen.
4. **`/bar/add` (`AddProductScreen.jsx`) is kept unchanged** for tracking a specific bottle/brand/homemade product under an already-known type, reachable from within the new Add ingredients screen via a "Track a specific bottle instead" link, same as today.
5. **Admin editing moves off individual tiles.** The inline pencil is removed from `TypeCard`'s main-grid control row entirely; routine editing stays fully available via Admin -> Ingredient Types, unaffected.
   - *(Stage 1 as-built)* A lightweight admin-only "Edit type" action was added to `IngredientDetailScreen.jsx`, reusing `IngredientTypeEditor` inline.
   - **(Revised, approved 2026-09-07, built in Stage 2 - supersedes the inline detail-page editor above.)** A single admin-only ⋯ menu sits in the **My Bar** and **Add ingredients** page headers. Its one item, **"Edit ingredients"**, opens the existing **Admin -> Ingredient Types** management view directly (via `/admin?tab=types`). No admin menus or pencils on individual tiles. The menu is hidden for non-admins (`isAdmin`); it changes no permission logic - `/admin` stays gated by `RequireStaff` and every underlying write keeps its own RLS/role check.
6. **Shelf appearance**: bottle icons (existing per-type `shape`/`color`, already rendered by `IngredientIcon`) sit on a subtle shelf-line per category row, with readable names underneath. Short wrapping rows on mobile - no horizontal scrolling. Family clusters are kept for grouping logic but visually softened (less like a separate bordered card, more like part of the shelf).
7. **Speed Rack is deferred to its own later stage**, not built now. Its persistence design (a new isolated `user_speed_rack` table vs. a `pinned` column added directly to `user_inventory`) is chosen when that stage actually starts, and only after the `db push` migration-history mismatch is resolved (or the direct-`db query` workaround is deliberately re-approved for that specific migration) - not decided speculatively now.

## Two explicit requirements (apply to every stage below)

1. **Distinguish generic ownership from ownership through specific products, everywhere.** A type-level control (the shelf tile's checkmark, or any future type-level action) must never silently remove a member's owned products, and must never silently create generic type ownership as a side effect of some other action. The two `user_inventory` row kinds (`ingredient_type_id` rows vs. `product_id` rows) stay independently addressable exactly as `useInventory.js`'s `toggleType`/`toggleProduct`/`ownProduct` already keep them - no new code path may collapse "own the type" and "own a product of that type" into one write.
2. **Scroll position and expanded-state restoration must be verified, not assumed.** `navigate(-1)` (used by `IngredientDetailScreen.jsx`'s back button) returns to the previous history entry, but does not by itself guarantee that My ingredients' scroll offset or which type-tiles were expanded survive the round trip - React Router does not restore either automatically just because the URL matches. Each stage that touches navigation must include an explicit manual check of both, and the plan must not claim this "already works" without that check having actually been run.

## Proposed layout & tap behavior

**My ingredients** (`/bar`, default):
- Owned items only, grouped by category (categories with zero owned items hidden entirely - same "hide empty" pattern Library's grouping already established).
- Each item: bottle icon on a shelf-line row, name underneath, wrapping in short rows.
- Tap the bottle/name -> `IngredientDetailScreen` (matching cocktails). Tap the dedicated checkmark -> un-own (generic ownership only, per Requirement 1). Chevron (if multiple products) -> expand product list; tap a product's name -> its own detail page, with its own separate un-own control (product ownership only, per Requirement 1).
- No admin pencil in this view (see Decision 5).
- Visible "+ Add ingredients" in the header.

**Add ingredients** (new route, `/bar/add-ingredients`):
- Search box up top, works globally regardless of category selection (reuses the same substring+alias matching `MyBarScreen.jsx` already does).
- Lands on category tiles first, not the full catalogue; tapping a category reveals its types.
- Tapping a type toggles generic ownership immediately with visible feedback, without navigating away, so several can be added in one visit - matches how the unified screen behaves today, re-scoped to its own screen.
- "Track a specific bottle instead" links into the existing `/bar/add` (`AddProductScreen.jsx`), unchanged.

**Search, category navigation, empty states, back-navigation:**
- My ingredients: search filters within owned items only ("Search your bar..."); category picker jumps within owned items; a fully-empty bar shows one empty state pointing at "+ Add ingredients" (replacing today's generic `EmptyState`).
- Add ingredients: search is catalogue-wide; category tiles are the default landing state.
- Back-navigation: verify per Requirement 2 above, every stage that touches it.

## Staged plan

| Stage | Scope | Acceptance criteria | Safe stopping point? |
|---|---|---|---|
| **1** ✅ done, committed `9afc57c`, mobile-verified 2026-09-07 | Route split: `/bar` becomes owned-only My ingredients (existing card grid, unchanged visually); new `/bar/add-ingredients` route with category-first browsing; admin pencil removed from the main grid; Build Your Bar's "Find more ingredients" repointed | My ingredients shows exactly the owned set, no inferred parents (Requirement 1 holds); Add ingredients lets you find and toggle any type; admin edit still reachable; scroll/expanded-state preserved per Requirement 2; `test`/`build`/`format` clean | Yes - pure restructuring, no visual risk |
| **2** ✅ done, committed `bda465a` (+ visibility fix `a1a9d84`), mobile-verified 2026-09-07 | Shelf visual reskin of My ingredients only (bottles on subtle shelf lines, softened family grouping); the admin ⋯ header menu from the revised Decision 5. Add ingredients stays a plain browse/search grid - no decorative shelves. | ✅ Verified: short wrapping rows, no horizontal scroll, readable names, touch targets intact, scroll/expanded-state holds; bottle/name view vs. checkmark-own vs. product-expand all distinct; generic vs. product ownership independent; admin ⋯ -> Ingredient Types works desktop + mobile; Add ingredients + Build Your Bar unchanged | Yes |
| **3** ✅ built, committed 2026-09-07, mobile verification pending | Speed Rack: `pinned boolean` column on `user_inventory` (chosen over a separate table at stage start); pin star on `IngredientDetailScreen` (owned items only); `SpeedRack` wrapping-pill strip at the top of `/bar`, name-sorted, tap opens the recipe page. No reorder (not in scope). Migration `20260906130000` pushed the normal way (ledger now 47/47). | RLS suite extended for the `pinned` column (owner-only update, column-scoped grant, member/anon denied) - clean. Pin persists; shows in the top strip; un-owning drops the pin. Mobile check pending. | N/A |

Stage 1 and 2 are deliberately separated so a shelf-visual iteration never risks the underlying data/routing logic, and vice versa.

## Database dependencies

- **Stages 1-2: none.** No schema change - pure client-side reshaping of existing `user_inventory`/`ingredient_types`/`products` data.
- **Speed Rack (Stage 3): yes**, a new migration is needed - no existing column represents "pinned." Two candidate designs (decided when Stage 3 actually starts, per Decision 7): a new isolated `user_speed_rack` table (`user_id`, `inventory_id` FK on delete cascade into `user_inventory`, `position`), mirroring `user_inventory`'s own RLS shape; or a `pinned boolean not null default false` column added directly to `user_inventory`. Either way, blocked on the unresolved `db push` migration-history mismatch (`supabase migration list --linked` shows 14+ real migrations untracked in the remote ledger) until that's resolved or the direct-`db query` workaround is deliberately re-approved for this specific migration.

## Relationship to the Stage 1-5 Cocktail Library/My Bar UX effort

This plan is new, separate work - it does not replace, complete, or supersede the existing 5-stage Cocktail Library + My Bar UX effort. That effort's Stages 1-4 are done and committed; Stage 5 (final integration review/regression/docs close-out) has not started, and several mobile checks from Stages 2-4 plus the out-of-sequence Sort-control addition are still unreported. See `current-context.md`'s "Exact next action" for the precise order the next session should follow - clearing those outstanding checks and closing Stage 5 comes before Stage 1 of this document.
