# Component-size refactor: AdminScreen, EditorScreen, MyBarScreen, DetailScreen

> Status: **executed and committed** (2026-08-24, commits `9c41ef8`..`eedf5d3` on `main`). Saved here for the record — this was a working plan-mode document, not a spec. Still needed: a full manual browser click-through (no browser automation was available when this was built) — see `current-context.md` for the exact walkthrough order.

## Context

The app now covers every planned feature through Phase 5, and backlog #6 (the RLS test harness) just wrapped up — the codebase had reached the point where its file layout started working against maintainability rather than for it. `AdminScreen.jsx` was 3,769 lines (9 tabs' worth of state, handlers, and JSX all in one function); `EditorScreen.jsx`, `MyBarScreen.jsx`, and `DetailScreen.jsx` were 1,425/852/657 lines respectively. The user flagged this directly while `AdminScreen.jsx` was open in their editor.

Goal: no file over ~300-400 lines, split along genuine seams (one component per tab/form/list-row), not artificial splits or one-caller "reusable" wrappers — and promote real shared components where duplication already exists (found: a `ConfirmPanel` pattern duplicated 3+ times). This is a **pure refactor — zero intended behavior change**. It was the agreed prerequisite to Phase 6 QA (the user chose "refactor first, then QA" specifically so the QA pass tests the final file layout, not code that's about to move).

Full structural findings (line ranges, coupling, prop signatures) came from direct reading of all four files plus two parallel Explore-agent passes and one Plan-agent design pass; the DetailScreen `ConfirmPanel` claim was independently re-verified by directly reading lines 528-653.

## Directory strategy

New per-screen subdirectories under `src/components/`: `src/components/admin/`, `src/components/editor/`, `src/components/myBar/`, `src/components/detail/`. Screens stay flat in `src/screens/` — AGENTS.md's "one file per screen" is about route-level screens, which doesn't change. This effort produced ~35-40 new files; dumping them flat into `src/components/` (7 files at the time, all genuinely cross-screen-reusable) would have erased the signal that directory carries. AGENTS.md already anticipated subdirectory growth ("if a subdirectory later needs its own AGENTS.md, document its scope here") — a bullet documenting this convention was added to its "Repository structure & ownership" section as the first step.

## New shared component: `ConfirmPanel`

Added to `src/components/primitives.jsx` (alongside its other 13 small components). Three near-identical confirm-panel implementations existed — DetailScreen's 3 panels (`Card`-wrapped, vertical, separate error paragraph), MyBarScreen's product-delete-confirm (no `Card`, single horizontal row, no error display), AdminScreen's `NamedRowManager` delete-confirm (no `Card`, vertical stack, error concatenated into the message paragraph). Genuine duplication, not a forced merge.

```
ConfirmPanel({ message, error, confirmLabel, confirmVariant /* "primary"|"danger" */,
  onConfirm, onCancel, busy, layout /* "card"|"row"|"stack", default "card" */,
  borderTone /* "cyan"|"neutral"|"coral", default "neutral" */ })
```

Verified directly (DetailScreen.jsx:528-653): border color does **not** derive from `confirmVariant` — Unpublish is `danger`-styled but neutral-bordered; only Delete is danger+coral. `borderTone` stays an independent prop. Exact mapping: Share → `borderTone="cyan"`, `confirmVariant="primary"`; Unpublish → `borderTone="neutral"`, `confirmVariant="danger"`; Delete → `borderTone="coral"`, `confirmVariant="danger"`, no `error` prop (that panel never showed one). MyBarScreen's site uses `layout="row"`, no `error`. AdminScreen's `NamedRowManager` site uses `layout="stack"`, passes its already-concatenated string as `message` and omits `error` — preserves the original single-paragraph output exactly.

A *fourth* visually distinct confirm-box style was found while extracting `ClassicRecipesTab`/`UsersTab`/`ModerationTab`/`TypesTab` (colored-background wrapper divs unique to those admin-tab rows) — deliberately **not** folded into `ConfirmPanel`; doing so would have visibly changed the rendered output, exactly the forced-reuse the user said to avoid.

## Per-file plan (as executed)

### AdminScreen.jsx (3,769 → 793 lines)

3 zero-risk pre-isolated helpers moved first (already pure-props, zero dependency on AdminScreen's own state): `src/components/admin/HexColorField.jsx`, `ShapePicker.jsx`, `NamedRowManager.jsx` (carries `SHAPE_KIND_DEFAULTS`/`DEFAULT_NEW_COLOR_HEX`, wired to `ConfirmPanel({ layout: "stack" })`).

Then the 8 "normal" tabs, each becoming its own file in `src/components/admin/`: `OverviewTab`, `ClassicRecipesTab`, `UsersTab`, `InvitesTab`, `ModerationTab`, `RequestsTab`, `CatalogTab`, `TypesTab`. Real cross-tab coupling preserved unchanged: `startSingleAddFromRequest(name, requestId)` (called from both `TypesTab` and `RequestsTab`, sets `tab="import"` plus several Import-tab state vars) and `handlePromote`/`handleDemote` (cross-touch both Moderation's and Classic Recipes' data) all stay defined in the `AdminScreen` shell, passed down as props — closure→prop boundary only, no logic change.

Import tab (the biggest single chunk, ~1,228 lines) done last: `ImportTab.jsx` (entity/mode switcher shell) dispatching to `ImportIngredientsSingle.jsx`, `ImportIngredientsBatch.jsx`, `ImportRecipes.jsx`, `ImportProducts.jsx`. All of Import's state (`importEntity`, `importMode`, `singleName`, etc.) stayed lifted in the shell rather than moved into `ImportTab` itself — the zero-risk option, since `startSingleAddFromRequest` writes into the same fields from outside the tab entirely.

### EditorScreen.jsx (1,425 → 799 lines)

New dir `src/components/editor/`: `DraftRestoreBanner`, `OtherDraftsPicker`, `EntryModeSwitcher`, `PasteRecipeMode`, `GlassPicker`, `FamilyPicker`, `IngredientRowsEditor`, `StepsEditor`, `TasteTagChips`. Liquid-color picker deliberately **not** extracted — a label plus the already-shared `ColorSwatchPicker`, ~20 lines, one caller. `AdminScreen`'s `ShapePicker` and this screen's `GlassPicker`/`FamilyPicker` look similar but operate on different domain concepts (icon-shape-key selection vs. catalog-row selection) — kept separate rather than forcing a shared adapter. Shell keeps all core form state including `ings` (the single most cross-cut piece of state — read/written by row handlers, alt handlers, validation, `handleSave`, and all three effects), the full draft-autosave subsystem, and all handlers.

### MyBarScreen.jsx (852 → 301 lines)

New dir `src/components/myBar/`: `SearchFilterHeader`, `EmptyState`, `ExpandedProducts` (product-edit/delete state made fully local here — verified it was only ever read via closure inside this one render function, so localizing was a pure move), `TypeCard` (closure-based render-function converted to explicit props — the highest-risk mechanical step in this file), `FamilyCluster`. Shell keeps `expandedTypeIds`/`editingTypeId` (read by multiple cards, must stay lifted) and the derived catalog maps.

### DetailScreen.jsx (657 → 247 lines)

New dir `src/components/detail/`: `HeroCard`, `IngredientsSection`, `StepsSection`, `ActionButtons`. The 3 confirm panels stayed inline in the shell (each ~15 lines once wired to `ConfirmPanel`, below the threshold where a wrapper file earns its keep). Shell keeps confirm-panel state, derived flags, `handlePublish`/`handleUnpublish`.

## Order of operations (as executed)

Lowest-risk first: 3 AdminScreen helpers → `ConfirmPanel` added to primitives.jsx (inert until wired) → DetailScreen (wired its 3 existing confirm blocks to `ConfirmPanel` *in place* first, then extracted) → MyBarScreen → EditorScreen → AdminScreen's 8 normal tabs → AdminScreen's Import tab (biggest, only real cross-tab coupling, done last).

**`pnpm build` + `pnpm test` after every new file; `pnpm format` before considering a file done.** No browser automation was available this session — user explicitly agreed to continue through all phases with build+test as the safety net, one comprehensive click-through at the end, rather than pausing after each file.

## One real bug found post-hoc

`AdminScreen.jsx`'s new `OverviewTab` wiring called `deriveInvitationStatus()` without importing it. `pnpm build` and `pnpm test` both stayed green — a bare undefined-identifier reference is invisible to a bundler (it only resolves `import` statements) and there's no test coverage rendering `AdminScreen`. Caught by running `oxlint` ad-hoc via `npx --yes` (not installed as a project dependency — this repo has no lint command per AGENTS.md) with `-D no-undef` explicitly enabled (off by default in oxlint's rule set) across every new/changed file. Re-ran after the fix, extracted the unique set of "not defined" symbol names across all ~30 files: only 6 hits, all standard browser globals (`document`, `navigator`, `setTimeout`, `crypto`, `localStorage`, `URLSearchParams`) — confirmed no other instance of this bug class survived anywhere in the refactor.

## Verification

`pnpm build` clean, `pnpm test` 106/106 (unaffected — UI-only, no domain logic touched), `pnpm format` clean (89 files, zero changes on the final pass). **Still needed**: the full manual browser click-through — see `current-context.md`'s "Exact next recommended action" for the exact walkthrough order (DetailScreen → MyBarScreen → EditorScreen → AdminScreen tab-by-tab → Batch Import last, re-verifying the Request/Types cross-tab deep link specifically).

## Commits

Split into 6 buildable, bisectable commits on `main`: docs (AGENTS.md convention) → `ConfirmPanel` → DetailScreen split → MyBarScreen split → EditorScreen split → AdminScreen split, followed by a `current-context.md` docs commit. Each commit builds and passes tests in isolation.
