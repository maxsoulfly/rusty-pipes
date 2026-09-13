# EditorScreen modularization

**Status: in progress, started 2026-09-14.** Third round of the component-size cleanup, after `docs/plans/archive/component-size-refactor.md` (2026-08-24) and `docs/plans/archive/component-modularization-round-2.md` (2026-09-14, `IngredientTypeEditor`/`IngredientDetailScreen`). `EditorScreen.jsx` was 799 lines right after the 2026-08-24 pass and grew to 948 since — driven mainly by the localStorage draft-autosave subsystem and the paste-import mode, both of which already have their UI extracted (`DraftRestoreBanner`, `OtherDraftsPicker`, `PasteRecipeMode`) but whose *state and effects* still live entirely in the shell.

Pure extraction, behavior-preserving. The draft subsystem carries real bug history (see "Behavior invariants" below) - this round does not touch any of that behavior, only relocates it.

## Current responsibilities (before this round)

- Core recipe form state and handlers: `name`/`desc`/`glassName`/`familyId`/`liquidColor(2)`/`ings`/`steps`/`tasteTagIds`, ingredient-row and taste-tag handlers, `canSave`/`handleSave`.
- Prefill-from-source effect (editing an existing recipe, or cloning one).
- Linked Variations fields (`variationOfRecipeId`/`variationNote`) and `variationCandidates`.
- **Draft autosave subsystem**: localStorage key helpers, an index of up to `MAX_DRAFTS` drafts per user, two effects (mount-time restore-check, ongoing autosave), and 4 handlers (restore/discard/continue-other/discard-other).
- **Paste-import subsystem**: entry-mode toggle, pasted-JSON state, `parseRecipePaste()` wiring, prompt copy-to-clipboard.
- Final save orchestration (`handleSave`), calling `createRecipe`/`updateRecipe`.

## Extraction boundaries

- `src/lib/recipeDrafts.js` — pure localStorage helpers, no React: `MAX_DRAFTS`, `readDraftIndex`, `upsertDraftIndexEntry`, `removeDraftIndexEntry`, `hasDraftContent`, `readDraftContent`, `writeDraftContent`, plus two small extracted decision predicates (`isSelfAssignedDraft`, `shouldAutosaveDraft`) that back the two bug-historied guards below. Same key formats (`recipe-drafts:<userId>`, `recipe-draft:<userId>:<draftId>`) and content shape, unchanged.
- `src/hooks/useRecipeDraftAutosave.js` — `draftBanner`/`otherDrafts` state, the self-assigned-draft-id ref, both effects (identical dependency arrays and guard order), and `restoreDraft`/`discardDraft`/`continueOtherDraft`/`discardOtherDraft`/`clearDraftOnSave`. Takes `searchParams`/`setSearchParams` from the shell rather than calling `useSearchParams()` itself, so the URL-param read/write path is unchanged (one call site, as today). Takes the 9 draft-relevant form values as one object (memoized in the shell with the exact same 9-value dependency list `useMemo` would need, so the effect's re-run timing is identical to depending on the 9 primitives directly) and an `onApplyDraft(draft)` callback the shell defines to actually restore those 9 fields into its own state.
- `src/hooks/useRecipePasteImport.js` — `entryMode`/`pasteJson`/`pasteError`/`promptCopied` state, `pastePrompt`, `copyPastePrompt`, `handleFillFromPaste`. Takes catalog data + an `onFill(result)` callback the shell defines to apply a parsed recipe into its own form state.
- `EditorScreen.jsx` keeps: all core form state/handlers, the prefill-from-source effect, Linked Variations fields, `handleSave` (now also calling the autosave hook's `clearDraftOnSave()` after a successful save instead of importing `removeDraftIndexEntry` directly), and all JSX/rendering.

## Behavior invariants (do not change, only relocate)

1. **Autosave must not run while a restore banner is pending** (`shouldAutosaveDraft` returns `false` whenever `draftBanner` is truthy) — otherwise the still-unrestored draft in localStorage gets silently overwritten by the blank/different live form before the user ever sees the banner.
2. **A draft id this session just self-assigned must never be mistaken for "an existing draft to offer restoring"** (`isSelfAssignedDraft`) — without this, the mount-check effect's own `draftId` dependency re-fires the instant autosave assigns a fresh id (first keystroke on a blank New Recipe), pops a restore banner for content the user is actively typing, and that banner then permanently freezes autosave for the rest of the session (invariant 1 above), since nothing else ever clears it.
3. `hasDraftContent()` is the single shared rule (non-blank name, or a filled ingredient name, or a filled step) used by both the autosave-worthiness check and the restore-worthiness check — the two must never diverge again (see the file's own historical comment on why they once did).
4. A draft is deleted only on an explicit user action (discard, discard-other) or a successful save (`clearDraftOnSave`) — never inferred from the form "looking empty" on a given render.
5. Effect 1 (mount-check) depends only on `[isDraftable, userId, draftId]` — deliberately not on the draft content or `draftBanner` itself; it runs once per distinct `draftId`, not on every keystroke.
6. Restoring a draft never touches localStorage directly - it loads `draftBanner` into live form state and clears the banner; the next autosave tick (now unblocked per invariant 1) re-persists it under the same id.

## Verification checklist

- [ ] `src/lib/recipeDrafts.test.js` (new) covers: draft index read/write + `MAX_DRAFTS` eviction, `hasDraftContent` true/false cases, `readDraftContent`/`writeDraftContent`, `removeDraftIndexEntry` removes only the targeted draft, `shouldAutosaveDraft` (including the draftBanner-blocks-autosave case), `isSelfAssignedDraft`.
- [ ] `corepack pnpm@10.34.3 test` and `corepack pnpm@10.34.3 build` green after each stage.
- [ ] Diff read carefully for dependency-array/timing drift, not just moved code.
- [ ] No claim of manual UI verification here - handed to the user as a short checklist.
