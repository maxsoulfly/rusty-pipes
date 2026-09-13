# Component modularization, round 2

**Status: executed and committed, 2026-09-14.** Follow-up to `docs/plans/archive/component-size-refactor.md` (2026-08-24), which split `AdminScreen`/`EditorScreen`/`MyBarScreen`/`DetailScreen` but predates `IngredientTypeEditor.jsx` and `IngredientDetailScreen.jsx` entirely — both grew large without ever going through that pass. Scope and target structure came from a read-only maintainability audit earlier this session (largest-files inventory + responsibility analysis), approved by the user for these two files only. All three stages (IngredientTypeEditor split, IngredientDetailScreen split, `mockData.js` removal) landed with `pnpm test`/`pnpm build` green throughout and zero `oxlint -D no-undef` hits (beyond the same expected `crypto` browser-global false positive the 2026-08-24 refactor already documented). Manual browser click-through is still owed — see the handoff checklist in the commit(s) covering this work.

## Scope

1. `src/components/IngredientTypeEditor.jsx` (1073 lines) — extract the two near-identical draft-list editors ("Can provide" / "Can be replaced by") into one shared component, and the homemade-preparation block into its own.
2. `src/screens/IngredientDetailScreen.jsx` (583 lines) — extract presentational sections; screen keeps route/data resolution, the ownership handler, and derived data.
3. `src/data/mockData.js` — delete if a fresh check confirms it's still unimported dead code (leftover from the pre-JS-conversion Figma Make scaffold).

## Non-goals

- No behavior, styling, data-flow, validation, payload-shape, or dirty-check changes anywhere.
- `EditorScreen.jsx`, `AdminScreen.jsx`, `MyBarScreen.jsx`, `catalog.js` are untouched — out of scope for this round.
- No new generic abstraction beyond the two existing shapes ("Can provide" / "Can be replaced by") — no reverse relationships, no third consumer invented.
- No persistence (Supabase calls) moves into any extracted child component — `handleSave`, the dirty-check snapshot, and all draft state ownership stay in `IngredientTypeEditor.jsx`.
- Aliases editing extracted only if it clearly improves cohesion once the other two extractions are done — not a line-count-driven split.
- No repo-wide `pnpm format` (Windows/oxfmt CRLF bug) — only touched files reflowed by hand if needed.
- No unrelated cleanup.

## Target structure

```
src/components/IngredientTypeEditor.jsx      (shell: basic fields, draft state, dirty-check, handleSave)
├── src/components/admin/LinkedTypeListEditor.jsx   ("Can provide" + "Can be replaced by", parameterized)
└── src/components/admin/PreparationEditor.jsx      (homemade preparation: inputs + steps)

src/screens/IngredientDetailScreen.jsx        (shell: route/data resolution, ownership handler, derived data)
├── src/components/ingredientDetail/OwnershipAction.jsx
├── src/components/ingredientDetail/RelationshipsSection.jsx   (Can provide / Can be replaced by / Homemade preparation, read-only display)
└── src/components/ingredientDetail/RelatedCocktailsGrid.jsx
```

## Verification checklist

- [x] `pnpm test` — full suite green (392/392), including `IngredientTypeEditor.test.js` (covers `normPreparation`'s null-safety, unaffected by this move) and every `src/domain/*` test.
- [x] `pnpm build` — clean after each stage and combined.
- [x] Diff read carefully for accidental behavior drift (payload shapes, disabled conditions, aria-labels, key stability, empty-state fallback text) — including the one deliberate divergence preserved as-is: "Can provide" shows an italic "No guidance" fallback for a blank note, "Can be replaced by" does not (pre-existing inconsistency, not introduced or fixed here).
- [x] `mockData.js`: fresh repo-wide grep confirmed no import/reference anywhere (only this plan doc and `availability.js`'s own comment named it); `availability.js`'s comment updated to drop the stale reference.
- [ ] No UI verification claimed here — a short manual click-through list is handed to the user separately.

## Commits

One commit per stage (IngredientTypeEditor split, IngredientDetailScreen split, mockData.js removal), or combined if the reviewed diff stays easy to read — decided at commit time based on how it actually turns out.
