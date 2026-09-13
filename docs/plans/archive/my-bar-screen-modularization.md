# MyBarScreen modularization

**Status: executed and committed, 2026-09-14.** Fifth round of the component-size cleanup, after the AdminScreen/EditorScreen rounds earlier the same day and the 2026-08-24 original refactor. `MyBarScreen.jsx` was 301 lines right after that pass and grew to 462 since (My Bar owned-first redesign, Speed Rack, Household Basics-era changes, the Beer duplicate-heading fix). Re-inspected fresh rather than trusting the earlier audit's line count. Ends at 303 lines - back near its post-2026-08-24 size, with the removed ~160 lines now living in a unit-tested domain module and a focused hook. **Manually verified by the user, 2026-09-14** — category/family grouping, the Beer heading fix, Speed Rack pin/unpin, search/category filter, ingredient-detail navigation with scroll/expanded-state restoration, and independent generic/product ownership toggles all confirmed working.

## Responsibilities found

- **Browsing-state persistence** (sessionStorage-backed `query`/`cat`/`expandedTypeIds`, scroll-offset capture/restore across the round trip to an ingredient detail page and back) — genuinely its own subsystem with real complexity (3 effects, DOM scroller lookup), but it's mutable UI state + side effects, not derived view-model data. Per this plan's scope (the audit's own "Preferred extraction direction" targets the derived-data cluster specifically), this stays in the shell.
- **Derived view-model data** — a cluster of `useMemo` lookup maps, plain derivations, and grouping transforms, all computed from `catalog`/`inventory` plus the browsing-state above: `productsByType`, `allProductsByType`, `isOwned`, `categoryNameById`, `categoryShapeByName`, `cats`, `effectiveCat`, `childrenByParentId`, `aliasesByTypeId`, `hasAnyOwned`, `filtered`, `grouped` (category → family clusters), `speedRackItems`. **Extracted.**
- **Family-cluster grouping + priority sort** (`buildRows`/`buildClusters`, `PRIORITY_RANK`/`byPriorityThenName`) — pure, framework-free logic with real structural behavior (singles rendered before clusters, orphan children handled, priority-then-name ordering) buried inside the view-model derivation. **Extracted to `src/domain/myBarGrouping.js`, unit tested.**
- **Rendering** (`renderCard`/`renderExpanded` closures, the main JSX return) — screen orchestration, stays.
- **Mutations** (`toggleType`/`toggleProduct`/`toggleExpanded`, navigation) — stays.

## Extraction boundaries

- `src/domain/myBarGrouping.js` — `byPriorityThenName` (moved out of `MyBarScreen.jsx`'s own copy only; a byte-identical copy still exists in `AddIngredientsScreen.jsx` - see "Existing inconsistency" below, not touched) and `buildFamilyClusters(items, childrenByParentId)` (the former `buildRows`+`buildClusters` pair, combined into one exported function with the same two-step internal shape). Pure, no React, no Supabase.
- `src/hooks/useMyBarViewModel.js` — every derived-data item listed above, taking `catalog`'s four relevant fields + `inventory`'s four relevant fields + the current `query`/`cat` browsing state as input, returning the same field names `MyBarScreen.jsx` already used - so the screen's JSX and `renderCard`/`renderExpanded` needed zero changes beyond the hook call itself.
- `MyBarScreen.jsx` keeps: browsing-state persistence (sessionStorage + scroll), the hook call, `renderCard`/`renderExpanded`, and all JSX.

## Non-goals / explicitly not touched

- Browsing-state persistence (sessionStorage/scroll-restore) subsystem - stays in the shell, not part of this round's scope.
- No presentational extraction beyond what already exists (`SearchFilterHeader`, `SpeedRack`, `ShelfItem`, `ExpandedProducts`, `FamilyCluster`, `EmptyState` are all already separate files) - the remaining category-loop JSX is thin, already-commented glue, not a mixed-concern block worth its own file.
- Ownership semantics, household-basics behavior, "Can provide" directionality, Speed Rack behavior, the Beer duplicate-heading fix (`FamilyCluster.jsx`'s own `isRedundantHeading` call, unaffected - `categoryName` still flows through `grouped`'s keys exactly as before), search/filter behavior, navigation - unchanged, verified by keeping every derived value's computation byte-for-byte identical, just relocated.
- `catalog.js`, `OnboardingTab.jsx`, `AddIngredientsScreen.jsx` - out of scope for this round.
- No schema/RLS/catalogue-data changes.

## Existing inconsistency found (not fixed here)

`PRIORITY_RANK`/`byPriorityThenName` is duplicated byte-for-byte in `src/screens/AddIngredientsScreen.jsx` (its own separate module-level copy, unrelated to this file). Moving `MyBarScreen.jsx`'s copy into `src/domain/myBarGrouping.js` doesn't touch that second copy - reported here rather than silently unified, since AddIngredientsScreen.jsx is outside this round's scope.

## Verification

- [x] `src/domain/myBarGrouping.test.js` (new, 7 tests) covers: `byPriorityThenName` ordering (essential/common/specialized/niche, alphabetical tiebreak, unknown-priority-sorts-last) and `buildFamilyClusters` (singles-only, a parent with filtered/sorted children, an orphan child whose parent didn't pass the filter, cluster order preservation).
- [x] `corepack pnpm@10.34.3 test` (427/427) and `corepack pnpm@10.34.3 build` green.
- [x] Diff read carefully - the hook's returned field names match what the JSX/render functions already referenced exactly, so this was a pure relocation with zero JSX changes (`categoryNameById`/`aliasesByTypeId` dropped from `MyBarScreen.jsx`'s own destructuring since nothing there reads them directly anymore - both are still computed and returned by the hook).
- [x] Manually verified by the user, 2026-09-14 — category/family grouping, Beer heading fix, Speed Rack, search/filter, ingredient-detail navigation + scroll/expanded-state restoration, and independent ownership toggles all confirmed working.
