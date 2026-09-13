# AdminScreen modularization

**Status: executed and committed, 2026-09-14.** Fourth round of the component-size cleanup, after `docs/plans/archive/component-size-refactor.md` (2026-08-24), `docs/plans/archive/component-modularization-round-2.md`, and `docs/plans/archive/editor-screen-modularization.md` (both 2026-09-14). The 2026-08-24 refactor split `AdminScreen.jsx` from 3,769 to 793 lines; it grew to 838 since (mostly the Onboarding tab, added cleanly as its own file). Re-inspected fresh rather than trusting the earlier audit's numbers. **Manually verified by the user, 2026-09-14** — recipe/product batch import, the Requests → "Add to catalog" deep link, and Promote/Demote all confirmed working.

## Responsibilities found (verified by reading the current file, not assumed)

- **Tab routing + deep-links** (`tab`/`visibleTabs`, `?tab=`/`?type=` query params) — shell-only, stays.
- **Scroll-to-top affordance** — trivial, single-purpose, stays.
- **Ingredients import** (single-add form + batch AI import, `importEntity`/`importMode`/`importSuccessMessage` switcher) — genuinely cross-tab: `startSingleAddFromRequest` is called from both `RequestsTab` and `TypesTab` and writes several of these same fields from outside the Import tab entirely; single-add and batch-ingredient-import also share one `importSuccessMessage` slot. Stays in the shell.
- **Recipe batch import** (`recipeBatchPhase`/`recipeImportJson`/`recipeImportResult`/`recipeImporting`/`recipePromptCopied`/`recipeImportSuccessMessage`, plus the inline "add missing ingredient" sub-flow `addIngredientDraft`/...) — verified via direct read that nothing outside `ImportRecipes.jsx` touches any of it. **Extracted.**
- **Product batch import** (`productBatchPhase`/`productImportJson`/`productImportResult`/`productImporting`/`productPromptCopied`/`productImportSuccessMessage`) — same verification, zero cross-tab coupling. **Extracted.**
- **Community recipes + promote** — genuinely cross-tab (Moderation ↔ Classic Recipes both need the result of a promote/demote). Stays.
- **Classic recipes derivation** — feeds both the Classic Recipes tab and Overview's count. Stays.
- **Users / Invitations / Requests** — each single-tab-consumed in the strict sense, but Requests/Invitations counts feed Overview and Requests/Types deep-link into the shared Import state above; left alone per this plan's own scope (membership/moderation admin state, not the identified seam).

## Extraction boundaries

- `src/hooks/useRecipeBatchImport.js` — all recipe-batch-import state, the prompt, validate/commit, and the inline add-missing-ingredient sub-flow. Called *inside* `ImportRecipes.jsx` itself (not in `AdminScreen.jsx`), which now takes just `catalog`/`computed`/`refetchRecipes` as props instead of ~19 individually-threaded fields.
- `src/hooks/useProductBatchImport.js` — same shape for products. Called inside `ImportProducts.jsx`, which now takes just `catalog`.
- `ImportTab.jsx` shrinks to a plain entity/mode switcher passing through `catalog`/`computed`/`refetchRecipes` (for recipes) - it no longer threads any recipe/product-specific state.
- `AdminScreen.jsx`: 838 → 575 lines. Ingredients import, tab routing, and every genuinely cross-tab piece (community recipes/promote/demote, users, invites, requests) are unchanged.

## Non-goals / explicitly not touched

- Ingredients import (single or batch) - real cross-tab coupling, stays in the shell.
- Users, Invitations, Requests, promote/demote - left alone per this plan's scope.
- Tab routing/deep-links, scroll-to-top - shell-owned, trivial.
- No admin/moderator permission, RLS, or schema change of any kind.
- No new generic "admin state" hook - each extraction is one feature's own state, not a grab-bag.
- `MyBarScreen.jsx`, `catalog.js` - out of scope for this round.

## Verification

- [x] `corepack pnpm@10.34.3 test` — 420/420 passing (no new tests added: this is pure relocation of already-tested validation/service wiring, no new pure decision logic - matches the project's own "don't test trivial React plumbing" guidance).
- [x] `corepack pnpm@10.34.3 build` — clean.
- [x] `oxlint` (default + `-D no-undef`) on every touched file — zero real findings; the only `no-undef` hits are the same known browser-global false positives (`window`/`navigator`/`setTimeout`) documented in the 2026-08-24 refactor.
- [x] Diff read carefully: confirmed recipe/product batch-import fields were never read/written outside their own tab before extraction, and that the shared `importSuccessMessage`/`startSingleAddFromRequest` cross-tab coupling for ingredients was correctly left untouched.
- [x] Manually verified by the user, 2026-09-14 — recipe/product batch import, Requests → "Add to catalog" deep link, and Promote/Demote all confirmed working.

No existing bug was found during this pass.
