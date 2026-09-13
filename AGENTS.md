# AGENTS.md — Cocktail Library

Shared conventions for Codex, Claude Code, and other coding agents working in this repo. Read this file, then `current-context.md`, before starting or resuming work. `docs/Cocktail_Library_Development_Spec.md` is the authoritative product spec — read it before changing product behavior.

## What this project is

Cocktail Library: an invite-only, mobile-first cocktail/home-bar web app. Each user has a private ingredient inventory matched against shared and private recipes to produce perfect/good-enough/almost/unavailable results and purchase recommendations. React + Vite frontend, Supabase (Postgres, Auth, Data API, RLS, Edge Functions) backend.

This repo runs inside a **Figma Make** sandbox: the dev server is already running on `$PORT` (default 8443) — don't start a second one. `vite.config.ts` wires in Figma Make's own plugins (`site.json`, error-overlay replay, deploy-preview support) and is platform tooling, not application code.

## Document authority order

1. `docs/Cocktail_Library_Development_Spec.md` — authoritative. Don't silently expand, remove, or reinterpret scope.
2. `docs/Cocktail_Library_Mindmaps.md` — flow/process reference, illustrates the spec.
3. `docs/archive/initial-design/Cocktail_Library_Figma_Prompt.md` — the original UI-generation brief. Historical — the app was converted from the Figma Make TypeScript scaffold to plain JavaScript (`src/App.jsx`) on day one, so no build output from it remains in `src/`. Useful as a visual/UX reference, not authoritative where it conflicts with the dev spec.
4. `docs/archive/initial-design/Cocktail_Library_Build_Agent_Prompt.md` — the meta-prompt that set up this working process (continuity files, phase breakdown, testing requirements, maintenance protocol). Historical — describes how the process was bootstrapped, not a live operating doc.

## Language: JavaScript only

No TypeScript in application source (`src/**`). Use `.jsx` for components, `.js` for modules. `vite.config.ts` is the one exception (Figma Make platform tooling) — don't let that precedent leak into `src/`.

## Repository structure & ownership

- `src/main.jsx` — entrypoint, mounts `src/App.jsx` inside `BrowserRouter`.
- `src/App.jsx` — routing and top-level auth/membership gating (session → membership → route tree). `AppShell` here wraps every authenticated route with nav + shared app state via router `Outlet` context. Should not contain screen bodies.
- `src/screens/` — one file per screen (Home, Library, Detail, MyBar, AddProduct, Editor, Lists, Settings, Admin, Welcome, SignIn, Join).
- `src/components/` — reusable presentational components (cards, badges, nav, inputs, glass SVGs, icons). A component only ever imported by one screen still belongs here, not in `src/screens/` - but group screen-scoped pieces under a per-screen subdirectory (`src/components/admin/`, `src/components/editor/`, `src/components/myBar/`, `src/components/detail/`, `src/components/ingredientDetail/`, ...) rather than flattening everything into one directory, so genuinely cross-screen primitives (`primitives.jsx`, `icons.jsx`, `GlassSvg.jsx`, `Nav.jsx`) stay visually distinct from single-screen fragments. Added 2026-08-24 during the AdminScreen/EditorScreen/MyBarScreen/DetailScreen component-size refactor (see `current-context.md`); `ingredientDetail/` added 2026-09-14 during a follow-up round covering `IngredientTypeEditor.jsx`/`IngredientDetailScreen.jsx` (see `docs/plans/archive/component-modularization-round-2.md`).
- `src/services/` — Supabase data-access layer, one module per entity (`auth.js`, `membership.js`, more as features land). Components call these; never call `supabase-js` directly from a component.
- `src/hooks/` — React `useState`/`useEffect` plumbing extracted out of a screen because it's a genuinely self-contained subsystem, not because a screen got long. Most wrap a `src/services/` call into live component state (`useSupabaseSession`, `useMembership`, `useCatalog`, `useInventory`, `useRecipes` — services are the plain async functions, hooks are the state glue on top); a smaller number wrap other browser-side state a single screen's form owns (`useRecipeDraftAutosave`/`useRecipePasteImport`, both `EditorScreen.jsx`-only, added 2026-09-14 — see `docs/plans/archive/editor-screen-modularization.md`); `useRecipeBatchImport`/`useProductBatchImport` (added 2026-09-14 — see `docs/plans/archive/admin-screen-modularization.md`) are called *inside* `components/admin/ImportRecipes.jsx`/`ImportProducts.jsx` themselves, not in `AdminScreen.jsx` — a hook doesn't have to be called from a screen file, only from wherever the state it owns is actually consumed. `useMyBarViewModel` (added 2026-09-14 — see `docs/plans/archive/my-bar-screen-modularization.md`) is the odd one out: it owns only *derived* data (lookup maps, grouping, Speed Rack items) with zero mutations/persistence/effects of its own — `MyBarScreen.jsx` still owns its browsing-state persistence (sessionStorage + scroll restore) and every mutation directly, deliberately not folded into the hook. **Call `useCatalog`/`useInventory`/`useRecipes` exactly once, in `AppShell`, and share the result via Outlet context** — screens must not call them independently. Each call creates its own React state; two independent copies of the same data go stale relative to each other (an optimistic update in one copy is invisible to the other until a full remount). Found and fixed this exact bug in step 6 — My Bar toggles updated instantly but didn't affect the availability badges until a page refresh, because `MyBarScreen` and `AppShell` each held a separate `useInventory` instance.
- `src/lib/` — shared infrastructure singletons/framework-free-but-not-pure helpers (`supabaseClient.js`; `recipeDrafts.js` — localStorage-backed recipe-draft persistence, added 2026-09-14, uses the browser's `localStorage` so it doesn't fit `src/domain/`'s "no browser APIs" rule below).
- `src/domain/` — pure, framework-free logic: availability engine, ml/oz conversion, recommendation ranking, import validation. Must be unit-testable without React or Supabase.
- `src/schemas/` — runtime validation schemas (batch import payloads, recipe forms).
- `supabase/migrations/` — versioned SQL migrations; schema source of truth, no undocumented dashboard-only changes.
- `supabase/seed.sql` — minimal, clearly-labeled dev fixtures only. Never a fabricated large catalog — the real catalog enters through batch import. Hosted projects don't auto-apply this on `db push` — reseed with `supabase db query --linked --file supabase/seed.sql`.
- `supabase/functions/` — Edge Functions for anything requiring elevated privilege (invitation generation/redemption, moderation actions).
- `docs/` — product specs. Inputs, not something to edit as part of feature work. `docs/plans/` is the one exception - saved plan-mode documents for active/in-flight features (durable record of what's planned/executed and why, since the live plan file outside the repo doesn't survive past a session), not specs. Once every stage of a plan has shipped and been verified (or the user confirms no further verification is coming), move it to `docs/plans/archive/` and fold a short summary into `docs/project.md`'s "Done" - `docs/plans/` itself should only ever hold currently active work, and can be empty (aside from `archive/`) when nothing is in flight. `docs/archive/initial-design/` holds the original Figma Make UI-generation brief and build-agent meta-prompt - historical reference, not authoritative or part of the document authority order above.

If a subdirectory later needs its own `AGENTS.md`, document its scope here and keep instructions consistent with this file.

## Coding conventions

- Double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings — an unescaped apostrophe breaks the build.
- Balanced JSX tags and braces.
- Default-export components.
- Format with `oxfmt` (`pnpm format`) before considering a chunk done - **except in this Windows sandbox**, where `oxfmt` has a real CRLF-related bug; don't run the repo-wide formatter here, and reflow only the specific files you touched by hand or via an isolated-LF check instead.
- No fuzzy/name-similarity matching anywhere in availability or import logic — always resolve through explicit IDs, ancestry, or substitution-group relationships.
- **Mobile-first is a primary acceptance criterion, not a nice-to-have, for every UI change** (2026-09-06). Design for narrow screens first: comfortable touch targets (44×44px minimum for anything tappable — steppers, toggles, links doubling as buttons, not just the specific controls that have needed it before), readable text without zooming, easy scrolling, primary actions reachable without hunting. Never rely on hover-only affordances or on a keyboard opening automatically on tap — a focused input on mobile does not imply the keyboard appears (confirmed live, iOS Safari, 2026-09-06), so don't build UI that assumes it does. Desktop behavior is real but supplementary — verify phone usability specifically, don't infer it from a desktop pass.

## Database & Row Level Security

- Every exposed table ships with a migration and RLS policies in the same chunk as the feature that needs it.
- Test RLS with at least: administrator, member/non-owner, and anonymous identities.
- Never put the service-role key in browser code; elevated operations go through Edge Functions or protected database functions.
- A product must map to an existing ingredient type; members can add products, never new ingredient types.
- Every `SECURITY DEFINER` function needs an explicit `revoke execute ... from public, anon, authenticated` followed by a narrow `grant ... to <role>` for whatever's actually needed. `create function` grants EXECUTE to `PUBLIC` by default (plain Postgres behavior, separate from Supabase's own per-role default grants) — revoking only named roles leaves the PUBLIC grant in place, since every role inherits from PUBLIC. Verify with `npx supabase db advisors --linked --type security` after every migration that adds a function.

## Testing & verification

- The availability engine, unit conversion, recommendation ranking, and import validation are pure `src/domain/` functions — write unit tests for the states/rules in the dev spec's "Testing requirements" section before calling that logic done. `pnpm test` runs Vitest (config: `vitest.config.js`, separate from `vite.config.ts` since that file carries Figma Make dev-server plugins irrelevant to a test run); tests live next to the module they cover (`foo.js` / `foo.test.js`).
- Run the production build (`pnpm build`) and any test suite (`pnpm test`) before reporting a chunk complete.
- `pnpm test` coverage is unit-level only (pure functions, no Supabase/RLS). RLS itself is covered separately by `supabase/tests/rls_suite.sql` — run with `npx supabase db query --linked --file supabase/tests/rls_suite.sql`. No Docker/Podman is available in this sandbox, so a local instance (which `supabase test db`'s pgTAP support needs) isn't an option; the suite instead runs plain SQL directly against the hosted linked project, simulating each identity by switching the `role` GUC + `request.jwt.claims`, wrapped in one transaction rolled back at the end so no fixture data is ever left behind. A failing check raises a specific `FAIL: <message>` naming exactly which one broke. Coverage now spans every RLS-protected table introduced through the features shipped so far (recipes, ingredient types, memberships, catalog tables, substitutions/preparations, recipe relationships, and more) - extend it table-by-table alongside each new table, following the same pattern; don't start a second suite file.
- PostgREST resource-embedding selects (`.select("a, b:table(col), c(nested(col))")`) can't be validated through `supabase db query` — that runs raw SQL directly, bypassing PostgREST's embed resolution entirely. Sanity-check the actual query string with a real REST call instead: `curl -s -G "$VITE_SUPABASE_URL/rest/v1/<table>" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" --data-urlencode "select=<the select string>" --data-urlencode "limit=1"`. A 400 means the embed is ambiguous/wrong; a 200 (even with `[]`, since RLS denies anon by default) confirms the query shape itself is valid.

## Preserving unrelated work

This repo may contain work from other sessions or tools. Don't delete, rewrite, or reformat files outside the current chunk's scope without checking first.

## Scope & architecture changes

Don't materially expand product scope, change the required stack, or introduce a custom backend server without stopping to ask — see the dev spec's "Required stack" and this file's language rule. Ordinary implementation details (file layout inside an owned directory, naming a helper, choosing a small library within the agreed stack) are fine to decide unilaterally — record the decision and reason in `current-context.md`.

## Session pacing

When the product decision and desired behavior are already established, the next steps are technically clear, the work stays inside the agreed scope, and it's reversible through Git, keep going through multiple related implementation steps in one session rather than stopping after every small stage (inspect → implement → focused tests → continue related steps → full tests/build → relevant DB/RLS checks → update docs → commit/push → stop for manual verification). Still stop when a product/UX decision is needed, requirements are ambiguous, the next action would expand scope, a destructive/risky action needs approval, or manual UI verification is required before the next implementation decision. Don't start unrelated work just because the user is away.

## Commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...). This repo has an established git history on `main` - commit and push a completed, tested stage before handing it to the user for manual verification, without needing to ask each time once that pattern is set for a session. Still ask before an unusually disruptive git operation (force-push, history rewrite, re-running `git init`, etc.). On this Windows/Git-Bash sandbox, author a multi-line or backtick-containing commit message via a heredoc file (`cat > /tmp/msg.txt <<'EOF' ... EOF` then `git commit -F /tmp/msg.txt`) rather than a plain `-m` string - a real shell-quoting bug here mangles backtick-quoted code identifiers otherwise.

## `current-context.md` protocol

- Read it at the start of every session/chunk, but verify against actual repo state first — it can drift out of date.
- **It is a compact reference doc, not a changelog** (reorganized 2026-09-13 - it had grown into a multi-thousand-line chunk-by-chunk log that duplicated git history and the plan docs under `docs/plans/archive/`). Keep it to: architecture/stack pointers, the domain model's standing invariants, ownership/RLS assumptions, current schema/migration state, testing/tooling constraints, the active-plan pointer, and a short "known outstanding items" list.
- Update it only when one of those durable facts actually changes (a new invariant, a resolved tooling gotcha, a plan moving from active to archived, a genuinely new outstanding item) - not after every small chunk. Detailed stage-by-stage history belongs in the relevant `docs/plans/*` doc (active) or `docs/plans/archive/*` doc (shipped), plus git history/commit messages - not appended here.
- Update `CLAUDE.md` or this file only when a durable command, convention, or architectural fact has genuinely changed — remove or correct stale instructions rather than appending contradictions. Don't use either file as a progress diary.

## `docs/project.md` — the user's planning space

`docs/project.md` is the user's own short, hand-written planning doc (Vision, Current Focus, Next, Backlog, Done, Scenarios, brief product Decisions). Keep it scannable and in the user's voice.

- **All engineering progress goes in `current-context.md`**, not here — stage histories, test/build results, commit hashes, resolved-bug writeups, and implementation rationale. Don't duplicate them into `project.md`.
- **Don't auto-append to `project.md` after a stage.** Change it on explicit request, or for small planning updates only: mark an item "— done", move a finished item out of Current Focus, or adjust priorities the user has agreed to. Keep each item a short line in the user's wording; no histories, test results, details, or long decision explanations.
- Only record a Decision here if it's a brief, user-approved *product* decision useful for future planning. Everything else belongs in `current-context.md` or the relevant `docs/plans/*` / spec.

## Toolchain notes for this sandbox

- Node 22, pnpm pinned via `.mise.toml` (10.34.3) — bare `pnpm` is not on PATH. Use `corepack pnpm@10.34.3 ...` and pin that version explicitly. **Do not run bare `npx pnpm ...`**: with no `packageManager` field in `package.json`, npx/corepack fetch the latest pnpm (v12), which on this machine tries to wipe `node_modules`, fails with "Access is denied", and leaves a broken install — recover with `corepack pnpm@10.34.3 install --frozen-lockfile`.
- Supabase CLI is not globally installed — use `npx supabase ...` (confirmed reachable, v2.114.0).
- Git is available and this repo has an established history on `main` (see `git log`) — see the "Commits" section above for the actual workflow.
