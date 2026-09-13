# catalog.js service split

**Status: executed and committed, 2026-09-14.** Sixth round of the component/module-size cleanup, following the AdminScreen/EditorScreen/MyBarScreen screen-modularization rounds earlier the same day. Re-audited the repo fresh per the maintenance brief; `catalog.js` (507 lines) is confirmed as the strongest remaining candidate — it bundles data access for 9 catalogue sub-entities in one file, conflicting with `AGENTS.md`'s "one service module per entity" convention (`src/services/`). Ends as 3 modules (`ingredientTypes.js` 205, `catalogLookupTables.js` 242, `products.js` 74 lines) — sizes now in line with every other file in `src/services/`.

## Fresh audit of other previously-flagged candidates (not touched this round)

- `src/components/primitives.jsx` (699 lines) — 14 small, independent, already-separately-exported UI primitives (Btn, Input, Select, BottomSheet, ConfirmPanel, ...). Cohesive design-system file by convention; splitting would be a line-count-driven split with no real boundary win. **Leave alone.**
- `src/components/admin/OnboardingTab.jsx` (516 lines) — one admin tab, one feature (household-basics onboarding config, drag-reorder + save/discard). Already correctly scoped as a single tab file. **Leave alone**, also explicitly out of this round's scope.
- `src/App.jsx` (495 lines) — routing + top-level auth/membership gating for ~20 routes, exactly the role `AGENTS.md` assigns it. **Leave alone.**
- `src/services/recipes.js` (472 lines) — one service module for one (genuinely complex: components, taste tags, variations, publishing, promotion/demotion) entity. Matches the "one module per entity" convention already. **Leave alone.**
- `src/components/GlassSvg.jsx` (427 lines) — one component; its length is ~20 literal inline-SVG shape branches, not mixed responsibilities. **Leave alone.**
- `src/components/admin/NamedRowManager.jsx` (425 lines) — a single, deliberately generic, already-shared component reused across 5 admin lookup tables (see the split below - it's the UI counterpart to the "catalog lookup tables" service group). **Leave alone.**

## catalog.js: caller-driven split

Grepped every `@/services/catalog` import site first, rather than guessing a split from the file's own contents alone:

- `useCatalog.js` (the one hook that loads the whole catalog) needs fetches from every sub-entity - expected, unaffected either way.
- `CatalogTab.jsx` imports create/update/delete for exactly 5 tables: `ingredient_categories`, `glasses`(+aliases), `taste_tags`, `cocktail_families`, `liquid_colors` - all sharing the identical "member read, admin write" RLS shape and the file's own internal `createNamedRow`/`updateNamedRow`/`deleteNamedRow` helpers. One real caller, one cohesive group.
- `TypesTab.jsx`, `IngredientTypeEditor.jsx`, `AdminScreen.jsx`, `useRecipeBatchImport.js` each need only Ingredient Types functions (`deleteIngredientType`/`mergeIngredientType`/`saveIngredientType`/`createIngredientTypes`) - the richest, most-touched entity (atomic `save_ingredient_type()` RPC, merge tool).
- `ExpandedProducts.jsx`, `AddProductScreen.jsx`, `useProductBatchImport.js` each need only Products functions.

Split into 3 modules (not 9 - the lookup-table group is one real, caller-justified unit, not five separate files):

- `src/services/ingredientTypes.js` — `fetchIngredientTypes`, `createIngredientTypes`, `updateIngredientType`, `saveIngredientType`, `deleteIngredientType`, `mergeIngredientType`, plus `fetchIngredientAliases`/`createIngredientAlias`/`updateIngredientAlias`/`deleteIngredientAlias` (aliases are a sub-concept of a type, not their own caller-justified module).
- `src/services/products.js` — `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `createProducts`.
- `src/services/catalogLookupTables.js` — `ingredient_categories`/`glasses`(+aliases)/`taste_tags`/`cocktail_families`/`liquid_colors` fetch/create/update/delete, plus the shared internal `createNamedRow`/`updateNamedRow`/`deleteNamedRow` helpers.

`catalog.js` itself is deleted once every export has moved and every caller's import is repointed - no re-export barrel, per this repo's own "no backwards-compatibility shims" convention.

## Existing finding (not fixed here)

`createIngredientAlias`/`updateIngredientAlias`/`deleteIngredientAlias` have **zero callers anywhere in the codebase** (confirmed by grep) - the Ingredient Type editor manages aliases entirely through the atomic `saveIngredientType()`/`save_ingredient_type()` RPC instead. These three functions (added during the RLS-hardening pass, per their own header comment) appear to be dead code. Moved as-is into `ingredientTypes.js` rather than removed - dead-code removal wasn't in this round's scope; flagged here for a future cleanup pass to confirm and remove if still unused.

## Non-goals

- No behavior change to any function body - pure relocation.
- No schema/RLS/migration change.
- `primitives.jsx`, `OnboardingTab.jsx`, `App.jsx`, `recipes.js`, `GlassSvg.jsx`, `NamedRowManager.jsx` untouched (see audit above).
- Not removing the three dead alias-CRUD functions (see finding above).

## Verification

- [x] `corepack pnpm@10.34.3 test` (435/435) and `corepack pnpm@10.34.3 build` green.
- [x] Every caller's import statement updated to the correct new module (`useCatalog.js`, `CatalogTab.jsx`, `TypesTab.jsx`, `IngredientTypeEditor.jsx`, `ExpandedProducts.jsx`, `useProductBatchImport.js`, `useRecipeBatchImport.js`, `AddProductScreen.jsx`, `AdminScreen.jsx`); confirmed by grep that no `@/services/catalog` import remains anywhere.
- [x] `oxlint` clean on every touched file.
- [ ] No manual UI verification claimed - this is a pure service-layer relocation with no UI-visible change, but the user's own manual pass over affected admin flows remains the safety net.
