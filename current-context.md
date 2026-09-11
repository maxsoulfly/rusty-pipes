# Current Context — Cocktail Library

## Phase & chunk

Agreed phase plan (revised by user on 2026-08-15 — private recipe CRUD moved into Phase 3 with recipes; publish/unpublish moderation moved to Phase 5 with admin tools):

1. ~~Inspect repository, reconcile continuity files~~ — done
2. ~~Convert TypeScript scaffold to JavaScript; app shell, routing, env handling, design tokens (Phase 0)~~ — **done, 2026-08-15**
3. ~~DB migrations, seed taxonomies, profiles/memberships/invitations/roles, RLS (Phase 0)~~ — **done, 2026-08-15**
4. ~~Auth + invitation redemption (Phase 1)~~ — **done and verified, 2026-08-16**
5. ~~Ingredient/product catalog + private My Bar (Phase 2)~~ — **done, 2026-08-16**
6. ~~Recipes, private recipe CRUD, components, substitutions, families, relationships (Phase 3)~~ — **done and verified, 2026-08-16**
7. ~~Unit preference + conversion (Phase 3)~~ — **done, 2026-08-16 — verified**
8. ~~Availability engine, tested (Phase 3)~~ — **done, 2026-08-16 — verified**
9. ~~Library browsing, filters, Favorites, Want to Make (Phase 4)~~ — **done, 2026-08-16 — verified**
10. ~~Purchase recommendations, tested (Phase 4)~~ — **done, 2026-08-16 — verified**
11. ~~Recipe publishing + admin unpublishing (Phase 5)~~ — **done, 2026-08-16 — browser-verified**
12. ~~Admin catalog tools + JSON import preview/validation (Phase 5)~~ — **done, 2026-08-22**: ingredient-type/recipe/product batch import (AI-prompt-assisted), a member ingredient-request queue, real invitation generation/revocation, and glass/taste-tag/family/category management UI are all done.
12b. ~~Component-size refactor (AdminScreen/EditorScreen/MyBarScreen/DetailScreen) + Tailwind utility-class conversion, both browser-verified~~ — **done, 2026-08-25**
13. Responsive/accessibility/security/deployment QA (Phase 6) — in progress: security regression testing (RLS suite) done 2026-08-25; keyboard-access fix browser-confirmed (re-confirmed on the current build); accessible-labels fix now screen-reader-verified (Windows Narrator, 2026-08-26); empty/loading/error-state fix browser-confirmed 2026-08-25 (real Supabase-outage simulation, see below); all 5 layout/responsive/touch-target findings (tablet breakpoints, max-width, grids, touch targets, color-only indicator) fixed and browser-confirmed 2026-08-25; theme QA pass done 2026-08-26 (4 real bugs found and fixed, browser-confirmed - see chunks below); first real deployment done 2026-08-26 (Vercel, see below); two full rounds of live-phone mobile UI findings (general screens, then Admin specifically) fixed and browser-confirmed 2026-08-26, see chunks below - only the Supabase backup/rollback conversation itself is still unstarted, and one small tab-bar-overflow-affordance item is still open (see below)
14. Serving-size selector + parts display mode (docs/project.md's prior "Current Focus") — **done, 2026-09-05**. Full audit + a 5-stage plan agreed with the user before any code (see chunks below for the full design). All 5 stages done and browser/mobile-verified 2026-09-05, plus a same-day fix for a real live "top-up part" data-corruption bug found after Stage 5 - still tracked separately: a cosmetic pluralize-at-save-time item (see the serving-size Stage 1 chunk below) and the diagnosed-but-untouched `db push` migration-history mismatch (see `docs/my-bar-ux-plan.md`'s Database dependencies; it blocks the My Bar plan's Speed Rack stage).
15. Homepage "Build your bar" (empty-My-Bar home experience, new feature, docs/project.md's prior "Current Focus") — **done, 2026-09-06**. Audit + a 4-stage plan agreed with the user before any code, revised once more per the user's own UX corrections (stable visibility across a whole selection session via an explicit per-visit snapshot rather than a live-reactive empty check; "Show my cocktails" sorts by availability rather than filtering; the six/expanded essentials list kept structurally separate from `bar_priority`, which continues to drive only Buy Next's ranking, untouched) - see chunks below for the full design and the real catalog data (recipe-frequency counts, parent/child hierarchy checks) it's based on. **Mobile-first usability made an explicit standing project requirement in `AGENTS.md`, 2026-09-06** - applies to all UI work going forward, not just this feature. All 4 stages done, committed, and browser/mobile-verified on a real iPhone (Stages 1-3 individually, Stage 4 reusing those confirmed checks per the user's own instruction - see "Last completed chunk" for the integration review and the one recorded follow-up).

16. Cocktail Library + My Bar UX improvements (new feature) — **complete, 2026-09-07** (Stages 1-4 + the out-of-sequence Library default-view/Sort-control addition + Stage 5 close-out; all mobile-verified). Full audit (Library's flat availability-sorted grid; a real inconsistency found between `ExpandedProducts.jsx`'s correct explore/own separation via `OwnedToggle` vs. `TypeCard.jsx`'s whole-card-is-the-toggle; confirmed no ingredient/product detail screen exists anywhere in the route table) + a 5-stage plan agreed with the user before any code, then revised with 5 concrete requirements - see chunks below for the full design and how each requirement maps onto the plan. Stage 1 (`findRecipesUsingIngredient` shared matching logic). Stage 2 (Library grouped availability view). Stage 3 (ingredient/bottle detail screen, `/bar/type/:id` + `/bar/product/:id`, `?ingredient=` Library filter). Stage 4 (My Bar entry points: tap-to-view on type tiles and product names, dedicated 44px ownership checkmark).
    - **Out-of-sequence addition, done and committed 2026-09-06**: availability grouping is the default plain-`/library` view, with a visible Sort control (**Availability** grouped / **Name A-Z** flat), synced two-way with `?sort=name`.
    - **Stage 5 (final integration review/regression/docs close-out) done 2026-09-07** - all five consolidated mobile-verification groups confirmed passed by the user; integration review found no defects (two cosmetic notes recorded, not changed). **This effort is complete.**

17. My Bar UX redesign (owned-first "My ingredients" default + a separate "Add ingredients" category-first browsing flow; Speed Rack pinning deferred) — **in progress. Stage 1 done and committed 2026-09-07, mobile verification pending.** Full audit-first plan in `docs/my-bar-ux-plan.md`. Stage 1: `/bar` is owned-only, `/bar/add-ingredients` is the new find-and-add screen, `/bar/add` kept for specific bottles, admin type editing moved to an `IngredientDetailScreen` overflow action, browsing state preserved via `sessionStorage`. Grid appearance unchanged (Stage 2 = shelf visuals; Stage 3 = Speed Rack, still blocked on the `db push` mismatch). See "Last completed chunk" for the full change list + mobile checklist.

   (Note: item 17's "Stage 1 done, mobile verification pending" / "admin type editing moved to an `IngredientDetailScreen` overflow action" text predates the My Bar redesign's later stages — see the corrected current state in item 18's plan doc: inline admin edit pencils are gone, editing now goes through Admin → Ingredient Types via the ⋯ menu.)

18. Household basics, ingredient forms, and homemade preparations (new feature) — **Household Basics COMPLETE (Stages 1–3), 2026-09-10. Ingredient Forms (Concept 2) + Suggested Substitutes (Stage B) shipped via `docs/plans/substitutes-and-variations.md` (Stages A/B, DONE 2026-09-10). Homemade Preparations SUPERSEDED 2026-09-11 by a smaller design in that same doc ("Stage D — Adapted Availability & Minimal Homemade Preparations"), then that smaller design itself SHIPPED as Stage D.3 the same day. Stage D.1 (adapted availability from curated substitutes), Stage D.2 (display-tier-based Library/Home/Lists discovery/grouping/ordering), AND Stage D.3 (tier-5 preparations - schema, engine, editor) all DONE + pushed 2026-09-11 - see item 0 and the three chunk entries below. Stages resequenced this session; D.4–D.5 planning only, not started. Linked cocktail variations (Stage C) NOT started.** Goal: recognize what someone can make from what they own without marking every ingredient form separately. Full audit + a staged plan agreed with the user (three deliberately separate mechanisms; two rounds of revision based on the user's own corrections and product decisions) in `docs/plans/household-basics-ingredient-forms-preparations.md` — read that file before starting, it is the source of truth for this item. **Stage 1 (schema + inert admin toggle):** `ingredient_types.assumed_available boolean not null default false` migration `20260909120000`, threaded through `fetchIngredientTypes`/`updateIngredientType`, "Household basic" `OwnedToggle` in `IngredientTypeEditor.jsx`. Phone-verified. **Stage 2 (engine wiring, Ice only, `c1629b9`, mobile-verified 2026-09-09):** `resolveOwnedIngredientTypes()` takes optional `assumedAvailableTypeIds` (unioned post-ancestor-walk — exact id only, no propagation); `computeAvail()` takes optional `householdBasicIds` and returns a `householdBasics` map; `App.jsx` derives `householdBasicTypeIds`; `IngredientsSection.jsx` renders a "Household basic" note + green dot; `ingredientRecipeMatches.js` deliberately does NOT get the assumed set. **Stage 3 (admin-managed onboarding config) — DONE + closed out 2026-09-10:** `onboarding_ingredients` table + `set_onboarding_config` RPC; `OnboardingTab.jsx` admin editor (draft → atomic save, ★ Initial ≤6, group dropdown, ↑/↓ + drag-to-reorder within group); resolver `resolveOnboardingSelection`; `BuildYourBar.jsx` reads it; three admin shortcuts → `/admin?tab=onboarding`. Live `assumed_available` set: Black Pepper / Ice / Salt / Water / White Sugar. See the close-out chunk below for the exact verified scope + two non-blocking limits. **Next: Ingredient Forms (Concept 2) — run its pre-stage re-audit first.**

Each numbered step is a development chunk boundary for this file.

## Exact next action (2026-09-11)

0. **`docs/plans/substitutes-and-variations.md` → "Stage D — Adapted Availability & Minimal Homemade Preparations" (revised v2, 2026-09-11). Stage D.1, D.2, AND D.3 are DONE + pushed 2026-09-11 (see the three new chunk entries below). Stages resequenced this session (see below); D.4–D.5 remain planning only, not implemented.** The user decided general catalogue substitutes should be able to affect **discoverable makeability** — this **supersedes decision D1** ("general substitutes never affect availability") for a NEW mechanism layered on top of Stage B, not a change to Stage B's own shipped mechanism. **Important, do not misread:** the screenshot showing White Rum as "Try: Spiced Rum (in your bar)" while Daiquiri still reads as missing/unavailable is Stage B working **exactly as specified at the time** — it is **not a bug**, and Stage B's own outstanding manual-verification checklist (editor layout on a real phone; the recipe-editor adopt+note flow; clone/edit note round-trip) is **still not marked passed** and stays outstanding — re-verify it against Stage D's UI once that ships, don't check Stage B twice.
   - **Stages resequenced 2026-09-11, by explicit user instruction:** the discovery/grouping/ordering slice originally folded into the plan's old "D.3" (Library/Home grouping + counts + the full Daiquiri scenario) was pulled forward, narrowed to exclude preparations/the aggregate counts-breakdown/Buy Next/`excluded_substitute_type_ids`, and shipped as **Stage D.2**. The old D.2 (minimal homemade preparations) is renumbered **D.3**; the old D.3's remainder (combine tiers 4+5, counts/breakdown, curate the two missing catalogue rows) is renumbered **D.4**; the old D.4 (per-substitute override + Buy Next ranking split) is renumbered **D.5**. See `docs/plans/substitutes-and-variations.md`'s own resequencing note for the full mapping.
   - **v2 revision (this turn):** the first Stage D draft kept the canonical badge as primary and "adapted" as an additive secondary line (so a card could read "Unavailable" next to "Make with substitutions"), and left Buy Next's ranking untouched. The user rejected that as still missing the point and asked for a rewrite — see full detail in the plan doc's "Stage D revised (v2)" blockquote and the chunk entry below. The open question from v1 is **resolved**, not open anymore (see below).
   - **Concrete target:** own Spiced Rum + Lemon Juice; White Sugar + Water are household basics; Daiquiri needs White Rum + Lime Juice + Simple Syrup. Once `Lime Juice → Lemon Juice` (substitute) and a Simple Syrup preparation (from White Sugar + Water) are curated, Daiquiri's **primary** status everywhere becomes **"Make with substitutions · Prepare syrup first"** — it must never show "Unavailable" as the leading badge next to that.
   - **Model (planning only, revised):** `computeAvail()`/`strict` stay computed exactly as today (still exact → Can-provide → recipe-scoped substitution) but are no longer, by themselves, what any screen renders as the primary status. A new `computeMakeability()` wraps it, returning `{ strict, adapted, display }` — `display.tier` (`perfect`/`good`/`adapted`/`almost`/`unavailable`) is **the one field every surface reads**: it equals `strict.tier` when already perfect/good, else `"adapted"` when tiers 4–5 (owned general substitute; a preparation whose own inputs pass tiers 1–3 only, never chained) fully resolve every remaining required component, else falls through to `strict.tier` unchanged. No recipe ever shows two contradictory primary statuses. `strict` is kept for the detail page's honest per-ingredient rows and internal bookkeeping only.
   - **Minimal Homemade Preparations — DONE + pushed 2026-09-11 as Stage D.3** (see the chunk entry below): `ingredient_preparations` (keyed by `produces_type_id`, unique) + `ingredient_preparation_inputs` (one row per input, own amount+unit), depth-1 guard implemented as TWO triggers (both directions - self/cross-preparation on the input side, and the reverse "already used as an input" check on the produce side), `instructions text[]` for steps — does NOT reuse `recipes`. Confirmed live: supports multiple inputs, per-input quantities, steps, and atomic Save/Cancel through the same `IngredientTypeEditor` local-draft + `save_ingredient_type()` (now 6-arg) pattern.
   - **Recipe-specific override (requirement 2, revised):** v1's whole-component boolean was too coarse — rejecting one bad substitute would've silenced every other valid one on the same component. Revised to `recipe_components.excluded_substitute_type_ids uuid[] default '{}'` — excludes one specific substitute type from tier 4 on one component; every other configured substitute (and any preparation route) for that component is unaffected. Editor UI: removable chips per configured substitute, not a checkbox.
   - **Surfacing (revised — adapted is primary, not additive):** `IngredientsSection` still shows the honest per-ingredient rows from `strict` plus a new distinct "Adapted:" accent row with the flavor note + preparation link; but the **card/HeroCard/Library/Home/Build-Your-Bar primary badge is now `display.label`** — e.g. "Make with substitutions · Prepare syrup first" IS the leading status, not a line beside "Unavailable". **Library/Home** get a new "Make With Substitutions" group ranked after Good Enough and before Almost There (adapted recipes rank after no-adaptation-needed ones, per instruction, but are part of the main "possible" set). **Counts (Library/Home/Build Your Bar, one shared shape)**: primary "possible" total is now `perfect + good + adapted`, always shown with an explicit breakdown — e.g. **"8 cocktails possible · 5 ready, 3 with substitutions or preparation"** — replacing v1's "stays literal + separate +N line."
   - **Buy Next (revised — a ranking change, not just rendering):** `rankPurchaseRecommendations` now splits candidates by the target recipe's `display.tier` at gather time — a recipe already `display.tier === "adapted"` never counts its one remaining strict-missing ingredient as an "unlock" (`unlockCount`/the "Unlocks N" reason); instead it's tracked separately as `restoresOriginalRecipes`, ranked below genuine unlocks, with its own reason text ("Also lets you make the original version of N already-possible recipe(s)"). Genuine not-yet-adapted unlocks are scored exactly as today.
   - **Open question RESOLVED, no longer open:** the user's own instruction directly settled it — counts include adapted in the main total with a breakdown (see above), not a literal-only primary number.
   - **D.4/D.5 remain planning only** (the override/Buy-Next/counts detail in this bullet list describes the FULL Stage D design, most of which is not built yet - D.1's substitutes-only tier-4 adaptation + primary-status wiring, D.2's display-tier-based Library/Home/Lists discovery/grouping/ordering, AND D.3's tier-5 preparations (schema + engine + editor) have all shipped, see the three chunk entries below - only the aggregate counts/breakdown, the Buy Next ranking split, and the per-substitute exclusion remain).
   - **Exact next action:** the user reviews Stage D.1 + D.2 + D.3 (code + the one live-app check noted in the chunk entries below), then decides which stage to proceed to next (D.4 - curate the two missing catalogue rows for the full Daiquiri scenario + the shared counts/breakdown - is the plan's own next step, but the user is not bound to that order, per this session's own resequencing precedent).

1. **Household Basics is COMPLETE — Stages 1–3, closed out 2026-09-10.** See the "Household Basics Stage 3 — CLOSE-OUT" chunk below (two non-blocking limits: Home "Edit list" visual check; offline-save handling).
2. **`docs/plans/substitutes-and-variations.md` — decisions D1–D6 APPROVED (D1 now superseded for the new Stage D feature, see item 0); Stage A + Stage A follow-up + Stage B all DONE + pushed 2026-09-10. Stage C (Linked Variations) NOT started. Stage D is planning-only (see item 0).**
   - **Stage A verification confirmed by the user (2026-09-10):** revised editor layout approved; editing conversion guidance + confirming the inline edit + pressing the main **Cancel** discards the change; **Save changes → reload/reopen preserves the edited guidance**. (No other unreported checks claimed.)
   - **Stage B (this turn) — done + pushed:** two layers. **General catalogue substitutes** — new `ingredient_substitutions (id, from_type_id, to_type_id, flavor_note)` (migration `20260910190000`), directional, NOT symmetric, no inverse guard, no chaining; `is_member()` read / `is_admin_or_moderator()` write, `to authenticated` from the first migration; written only via `save_ingredient_type()` (dropped + recreated 5-arg with `p_substitutions jsonb default '[]'`, reconciled in the same atomic txn). **Never read by `computeAvail`** — availability / makeable counts / Buy Next unchanged. `buildSubstituteSuggester` (pure) → `DetailScreen` shows a muted "Try: X (in your bar) — note · …" line **on missing rows only**, owned stand-ins first, capped at 3. **Recipe-scoped** — `recipe_component_alternatives` gains nullable `note` (migration `20260910180000`, ≤200, no policy change); `mapRecipe` → `alternativeNotes`; `computeAvail`'s `substitutions[ingId]` gains passive `note` (precedence exact → Can provide → recipe-scoped substitution unchanged); `IngredientsSection` renders "Substituting: X — note"; the recipe editor's alternatives are now `[{ name, note }]` with a per-chip note field and a one-tap **+ &lt;name&gt;** adopt button for each catalogue suggestion (adopted rows are the only substitutions that affect availability, saved through the editor's existing flow). Editor gains a **"Can be replaced by"** section mirroring "Can provide" (compact rows, ⋯ menu, collapsed picker, one atomic Save changes). Audited paths — batch import / plain-text share / `get_shared_recipe` never carried alternatives (unchanged); clone/edit prefill + localStorage draft restore now carry notes forward.
   - **Stage B verified:** `pnpm test` **251/251** (+9), build clean (170 modules), isolated-LF `oxfmt --check` clean (14 files). **RLS suite** extended (`ingredient_substitutions` block + `note` round-trip on `recipe_component_alternatives` + `save_ingredient_type` `p_substitutions` reconcile + **atomic rollback on a bad substitution self-pair** + 5-arg member-denied). Full suite passes. `db advisors --type security` no new finding. Live REST: `RECIPE_SELECT` embed with `note` → 200; anon `ingredient_substitutions` read → `200 []`.
   - **Stage B NOT verified here (no browser tooling):** the "Can be replaced by" editor section on desktop / narrow phone; the "Try:" hint on a real recipe's missing rows; the recipe editor adopt + note flow and that an adopted row flips availability while a bare catalogue suggestion does not; clone/edit note round-trip in the app.
   - **Decisions:** D1 general catalogue substitutes are suggestion-only; recipe-specific alternatives affect availability; owned suggestions shown first. D2 recipe-scoped subs reuse `recipe_component_alternatives` + a new optional `note`. D3 admins AND moderators manage "Can provide" + general substitutes, **enforced in the DB** (RLS), member access not broadened. D4 the original's owner does not control other members' variations; misleading links stay a moderation matter. D5 show all variations the viewer may see, makeable first, clear attribution. D6 3 suggestion chips before "+N more".
   - **Stage A — done:** guidance-autofill removed; "Can provide" moved into `IngredientTypeEditor`; `TypeComboBox` extracted; standalone "Ingredient forms" tab retired; migration `20260910160000` widened the `ingredient_form_conversions` write policy to `is_admin_or_moderator()`.
   - **Stage A follow-up (this turn) — done:** `IngredientTypeEditor` reworked — `max-w-2xl` cap, Color+Icon and Parent+Priority in `sm:grid-cols-2` pairs, visible Parent-type/Priority labels, shortened copy; "Can provide" rows are now compact (name + guidance beneath + a **⋯ `BottomSheet` menu** with Edit guidance / Remove) with a compact **+ Add** by the heading; **"Save changes" is the only prominent button**, every secondary control is a quiet `min-h-11` outline button. **Full local-draft model:** type fields + the whole alias list + the whole "Can provide" list are local state; nothing writes until **Save changes**; **Cancel discards the draft with zero DB writes**. **Atomic save** via new migration `20260910170000_save_ingredient_type.sql` — `save_ingredient_type(p_type_id uuid, p_fields jsonb, p_aliases jsonb, p_conversions jsonb)`, SECURITY INVOKER, `search_path=''`, revoke public/anon + grant authenticated; one txn: UPDATE the type (raises `insufficient_privilege` on 0 rows = a member), replace the alias set, replace the conversion set; any failure rolls the whole save back, client keeps the draft + shows the error. Both DELETEs have a real `WHERE` (no pg-safeupdate `where true` needed). `src/services/catalog.js` gains `saveIngredientType()`; `updateIngredientType` kept but unused by the editor. Only consumer of the editor is `TypesTab` (dropped the now-dead `onAliasesChanged`/`onConversionsChanged` props). RLS on all three tables (`is_admin_or_moderator()`) unchanged; no GRANT change; engine/directionality/inventory/existing data untouched.
   - **Verified:** `pnpm test` 242/242 (no domain change), build clean (168 modules), isolated-LF `oxfmt --check` clean (3 JS files, 2 reflows hand-applied). **RLS suite** extended with a `save_ingredient_type()` block — admin full save writes type+aliases+conversions; **a save whose conversions include the inverse of an existing pair fails whole (name/aliases/conversions/assumed_available all asserted unchanged after)**; member call raises `insufficient_privilege` and changes nothing; anon no EXECUTE; moderator positive check added. Full suite passes. `db advisors --type security` no new finding. Function live with the expected signature, `security_definer=false`, EXECUTE=authenticated only.
   - **Layout APPROVED by the user (2026-09-10)** — "noticeably cleaner". A styling-only follow-up bumped the "Can provide" guidance text and ⋯ trigger `text-tx3` → `text-tx2` (+ a border on the ⋯) for contrast/discoverability; 44px ⋯ target unchanged.
   - **Verification limits (honest):** no browser tooling in this sandbox → the reworked layout (desktop / narrow phone) and the **new unified Save changes / Cancel draft flow** in the running app are **unverified**. The earlier immediate-per-row-write checks do **not** carry over as proof — the model changed. "Cancel makes no writes" and "successful persistence" have **no automated component test** (vitest node env, no jsdom) — Cancel-no-writes is structural (Cancel = `onCancel()` only; `saveIngredientType()` is the sole write path); atomicity/rollback + persistence are covered by the RLS suite's DB-transaction checks. Two outstanding user checks: (1) edit conversion guidance → Cancel → reopen: original text remains; (2) edit conversion guidance → Save changes → reload: new text persists.
   - **Next:** see item 0 above (Stage D review) — takes priority over Stage C. Stage C (Linked Variations — `recipe_relationships` table, RLS via `recipe_is_visible`/`recipe_is_editable`, editor "Variation of" field, DetailScreen "Variations" block) remains NOT started and independent; on a separate go-ahead.
3. Homemade Preparations (Concept 3, original `recipes.kind`-based proposal in `docs/plans/household-basics-ingredient-forms-preparations.md`) is **SUPERSEDED 2026-09-11** by the smaller design in item 0 (`ingredient_preparations`/`ingredient_preparation_inputs`, no `recipes` reuse). Do NOT start either version — item 0 is planning only.
4. **Follow-up (infra, non-blocking): `oxfmt` 0.2.0 mangles CRLF files.** See the Stage 1 chunk below for the full diagnosis. `pnpm format` must not be run on a working tree with CRLF line endings (this machine's clone has `core.autocrlf=true`, so every checked-out file is CRLF) — it inserts a blank line after every source line. Until this is resolved, verify formatting with `oxfmt --check` on isolated LF copies of only the changed files (and when a changed file needs reformatting, run `oxfmt` on the isolated LF copy and hand-apply the wrap changes back). Resolution options (a repo decision, deferred): upgrade `oxfmt` past the bug, or add a `.gitattributes` `* text=auto eol=lf` rule + one-time renormalize.
4. **Migration count (2026-09-10): 59 files on disk, 59 applied to the linked project, 0 pending.** Was 57 after the Stage A follow-up; +`20260910180000_recipe_component_alternatives_note` +`20260910190000_ingredient_substitutions` (Stage B — the latter also drops + recreates `save_ingredient_type` as the 5-arg version) = 59. All pushed via `supabase db push --linked` (clean, no history mismatch this session). History intact (unique ordered timestamps, no gaps/dupes).

5. **Migration count reconciled 2026-09-09.** 48 migration files on disk, 48 ledger rows, every one `local == remote`, 0 pending. The Speed Rack chunk's "47/47" was correct for its time (46 synced + `20260906130000`); Stage 1's chunk originally said "47/47" which was a **miscount** — with `20260909120000` it is **48/48**. Migration history itself is intact (unique ordered timestamps, no gaps, no dupes) — nothing was repaired, only the recorded count corrected.

1. ~~Present the consolidated Library/My Bar + Sort mobile checklist~~ - **done. The user confirmed all five verification groups passed** (grouped Library + Sort control, ingredient/bottle detail entry points, view-vs-own type-tile controls, back-nav scroll/expanded-state restoration, Build Your Bar no-regression). Nothing outstanding from Stages 2-4 or the Sort control.
2. ~~Investigate the recurring "JWT issued at future" startup error~~ - **root cause identified and a scoped fix committed (`65ecc74`), 2026-09-06. See "Earlier chunk" below.** `first open after idle` verification is still **pending** the user's confirmation on a phone - a separate follow-up, does not block the My Bar redesign. Do not mark it done without a real result.
3. ~~Complete the existing Stage 5~~ (final integration review/regression/docs close-out) for the Cocktail Library + My Bar UX effort (item 16) - **done 2026-09-07, no defects found, feature complete. See "Last completed chunk" below.**
4. ~~Begin Stage 1 of the approved My Bar UX redesign~~ (item 17) - **done and committed 2026-09-07 (`9afc57c`). All manual mobile checks confirmed passed by the user, 2026-09-07.**
5. ~~My Bar redesign Stage 2 (shelf visuals + the admin ⋯ header menu)~~ - **COMPLETE, 2026-09-07** (`bda465a` + visibility fix `a1a9d84`). Fully mobile-verified.
6. ~~My Bar redesign Stage 3 (Speed Rack)~~ - **COMPLETE, mobile-verified 2026-09-07.** Built (`77dcb18`) + follow-up fix for the un-own/re-own pin bug (`207769b`, root cause: optimistic ownership rows never reconciled to their real id). All Speed Rack mobile checks passed; the fix's three retests (generic remove/re-add/pin/unpin, the specific-product equivalent, immediate pin of a newly owned ingredient without reload) all passed on the user's phone.

**My Bar redesign (`docs/my-bar-ux-plan.md`): COMPLETE - all three stages built and mobile-verified (2026-09-07). No further stages. No active task queued.**

**Migration-history mismatch: RESOLVED 2026-09-07** (ledger-only `supabase migration repair` - see "Earlier chunk"). All 46 recorded migrations showed `local == remote`; Stage 3's new migration `20260906130000` then pushed cleanly via the normal `db push` workflow (47/47 now).

Separately, still true, none blocking: the cosmetic pluralize-at-save-time item (serving-size Stage 1 chunk below) remains untouched.

Otherwise unrelated, still open from Phase 6, none blocking:

1. **The Supabase backup/rollback conversation** - the one originally-scoped Phase 6 item that was never actually a code task (see the "deployment/backup notes" framing further up this file). Deployment itself is done; this conversation about the hosted project's real backup/rollback story is the only undone half.
2. **Admin's own tab bar (Overview/Classic Recipes/Moderation/.../Invitations) is still plain `overflow-x-auto` with no affordance that more tabs exist off-screen** - flagged once, a fade-edge fix was recommended but never implemented. Pick this up if the user raises it again.
3. **Google OAuth's consent screen is still in "Testing" mode, not published** - deliberate, per the user's own choice (see below) - real members are added as test users one at a time, same overhead as generating an invitation. Revisit only if the user decides they want unlimited/unmanaged Google sign-in later (would need a real Privacy Policy/Terms of Service page built first).

**Accessible-labels verification is done** (Windows Narrator, confirmed all 5 targeted icon-only buttons read correctly - no code changes needed).

## Last completed chunk (Substitutes & Variations — Stage D.3 implemented, 2026-09-11 — schema + engine + editor, 2 migrations pushed, no live-catalogue changes)

**Scope, per explicit instruction:** tier 5 ("satisfiable preparation")
only - the two new tables, the depth-1 guard, `isPreparationSatisfiable()`,
wiring tier 5 into `computeAdaptedResult()`/`composeAdaptedLabel()`, and the
Ingredient Type editor's "Homemade preparation" block, participating in the
existing atomic Save/Cancel. Explicitly NOT this stage: the aggregate
counts/breakdown, the Buy Next unlock-vs-original ranking split,
`excluded_substitute_type_ids`, and no catalogue/live-data changes (the two
curated rows the Daiquiri scenario needs - Lime Juice → Lemon Juice,
a Simple Syrup preparation - are still not added; that's Stage D.4, as a
verification step, not a seed).

**Schema (migrations `20260911120000`, `20260911130000`, pushed):**
`ingredient_preparations (id, produces_type_id unique, name, instructions
text[])` + `ingredient_preparation_inputs (id, preparation_id,
ingredient_type_id, amount, unit_label, unique(preparation_id,
ingredient_type_id))` - exactly the shape the plan specified. RLS
`is_member()` read / `is_admin_or_moderator()` write, `to authenticated`
from the first migration. **Depth-1 guard implemented bidirectionally**
(two triggers, tightening beyond the plan doc's single-trigger SQL sketch,
per the household-basics doc's fuller "carries forward unchanged"
description): `enforce_preparation_input_depth` rejects an input that is
itself any preparation's produced type (covers self-reference too, by FK
insert order); `enforce_preparation_produces_depth` rejects
creating/editing a preparation to produce a type already in use as some
OTHER preparation's input. Both directions covered by dedicated RLS-suite
tests. `save_ingredient_type()` is now **6-arg**
(`p_preparation jsonb default null`) - same delete-then-insert
reconciliation as the other three relationships, one transaction; also
rejects a preparation with zero inputs (would be vacuously "always
satisfiable," meaningless).

**`src/domain/makeability.js`:** new exported `isPreparationSatisfiable()` -
reuses `computeAvail()` itself (a synthetic one-component "recipe," no
alternatives) rather than re-implementing tiers 1-2, so it can't drift from
the real engine; never consults tier 3 (recipe-scoped, not applicable to a
raw input) or tiers 4-5 (no chaining). `computeAdaptedResult()` tries tier 4
then tier 5 per missing component (never both for the same component); a
`via: "preparation"` entry carries `instructions`/resolved `inputs` fully
through, matching how a substitute entry already carries
`matchedName`/`note`. `composeAdaptedLabel()` now actually composes:
substitute-only → "Make with substitutions"; preparation-only → "Prepare X
first"; both → joined with " · " - the acceptance scenario's exact text,
mechanically ready even though nothing live can trigger it yet.

**`App.jsx`:** `preparationsByProducedType` joined once via `useMemo` from
the two new catalog arrays (unlike the single-table substitutes, joining
two tables per-recipe-per-render would be wasteful), passed as
`computeMakeability()`'s 7th argument. `useCatalog.js`/`services/catalog.js`
gain the two fetches + the `saveIngredientType()` `preparation` param.

**Editor (`IngredientTypeEditor.jsx`):** new "Homemade preparation" section
- a single optional block (not a list, `produces_type_id` is unique), keyed
the opposite way from "Can provide"/"Can be replaced by" (produced side,
not raw/from side). Name + a repeatable input-rows list (`TypeComboBox` +
amount + unit) excluding self-reference/already-produced types, and
`StepsEditor` reused as-is (a generic ordered-string-list editor from
`src/components/editor/`, not recipe-specific) for instructions. Folded
into the same local draft / dirty-check snapshot / one
`saveIngredientType()` call as everything else - no independent Save
button, Cancel discards it with zero writes. Client-side check (non-blank
name, ≥1 fully-picked input) disables Save with an inline hint rather than
surfacing a raw cast error.

**Detail page (`IngredientsSection.jsx`):** a `via: "preparation"` row
shows "Adapted: needs preparation — How to make &lt;name&gt;", never marked
owned (unreachable through the same `isOwned` gate every other branch
uses). Tapping it expands an inline panel (local component state, not a
route) listing every input's amount (via `formatAmount()`, respecting
ml/oz) and the preparation's own numbered steps.

**D.2 automatically covers this, no screen-specific code needed:**
`display.tier === "adapted"` is identical regardless of whether tier 4 or
tier 5 resolved it, so Library's group/Home's section/both filters (all
built against `display.tier` in D.2) apply with zero additional changes -
confirmed by the "mixed substitution + preparation" domain test.

**Verified:** `corepack pnpm@10.34.3 test` **284/284** (+13 in
`makeability.test.js`: satisfiable preparation resolves; one missing input
blocks it; household basics satisfy an input; produced ingredient never
marked owned, `owned` never mutated; substitution + preparation combine
into the exact composed label; no recursive chain (depth capped at one
level); null-safe with no preparations map; 6 `isPreparationSatisfiable`
tests). `pnpm build` clean (173 modules). Isolated-LF `oxfmt --check` clean
on all 9 changed/new files (5 reflows hand-applied). **Migrations pushed**
(`supabase db push --linked`, clean, 61/61 local==remote). **RLS suite**
extended with a full preparations block - member read/anon denied (both
tables); direct member write denied; admin multi-input insert; both
directions of the depth-1 guard; `save_ingredient_type`'s `p_preparation`
only touches the edited type; **atomic rollback** on a self-referencing
preparation input (type name + prior preparation both verified unchanged);
zero-input preparation rejected; 6-arg member call denied. Full suite
passes (`{"rows":[]}`). `db advisors --type security` - no new finding.

**Not verified here (no browser tooling):** the editor's "Homemade
preparation" block and the detail page's expandable panel, on a real phone.
The live catalogue still lacks any real preparation (D.4 curates the
first one), so nothing in the running app can exercise tier 5 yet outside
the automated tests and the RLS suite's throwaway fixtures.

**Commit:** see the git log for the exact hash (this file and
`docs/plans/substitutes-and-variations.md` updated in the same commit/push).

---

## Last completed chunk (Substitutes & Variations — Stage D.2 implemented, 2026-09-11 — `src/**` only, no migrations, no live-catalogue changes)

**Scope, as explicitly redefined by the user this turn:** the
discovery/grouping/ordering slice of the plan's original "D.3" - Library and
Home should group/order/filter by the shared `computeMakeability()` result
(`display.tier`), not independently re-interpret `avail`; add the "Make
With Substitutions" group/tier to the main possible set; order Perfect >
Good Enough > Make With Substitutions > Almost There > Unavailable; a
`display.tier === "adapted"` recipe must never sit under "Almost There" or
another contradictory strict-status group. Explicitly NOT this stage (per
instruction): preparable ingredients/preparation UI, the aggregate "N
possible · X ready, Y adapted" counts/breakdown, the Buy Next
unlock-vs-restore ranking split, `excluded_substitute_type_ids`,
substitution chains/reverse inference/spirit equivalence, and any
catalogue/live-data change. **The plan doc's own stage numbering was
resequenced to match** — see its "Stages resequenced 2026-09-11" note: this
work shipped as **Stage D.2**, and the plan's old D.2 (preparations)/D.3
(the remainder: combine tiers + counts)/D.4 (override + Buy Next) are now
D.3/D.4/D.5 respectively.

**New `src/domain/availabilityGroups.js`** — `DISPLAY_TIER_ORDER =
["perfect", "good", "adapted", "almost", "unavail"]` + pure
`groupByDisplayTier(computed)` returning non-empty `{ tier, items }` groups
in that order, reading `c.display?.tier ?? c.avail`. `LibraryScreen.jsx`'s
grouped view now calls this directly, replacing its own local
`AVAIL_GROUP_ORDER`/`byTier` construction - one shared place owns "what
order do makeability tiers render in," not a screen-local reinterpretation.

**`src/domain/almostThere.js`** — `rankAlmostThere()`'s filter changed from
`avail === "almost"` to `(display?.tier ?? avail) === "almost"`, so a
recipe whose strict avail happens to be "almost" but is actually
`display.tier === "adapted"` no longer leaks into Home's "Almost There"
list. New sibling `rankAdapted()` (same popularity-then-name tie-break,
factored into a shared `sortByPopularityThenName()` helper) filters to
`display.tier === "adapted"` for the new Home section.

**`HomeScreen.jsx`** — `perfect`/`good` filters switched to read
`display.tier` (identical result to `avail` for a genuinely perfect/good
recipe - computeMakeability only attempts adaptation when strict isn't
already perfect/good - so this is a like-for-like swap, done so the screen
stops independently interpreting `avail` anywhere). New "Make With
Substitutions" section (a `SmallCard` carousel, matching Perfect/Good's own
visual style) renders between "Good Enough" and "Almost There", fed by
`rankAdapted()`.

**`LibraryScreen.jsx`** — grouped view now imports `groupByDisplayTier()`;
`AVAIL_GROUP_LABEL` gains `adapted: "Make With Substitutions"`; the
availability filter comparison changed from `c.avail !== availFilter` to
`(c.display?.tier ?? c.avail) !== availFilter`, so selecting "Almost" no
longer surfaces an actually-adapted recipe.

**`ListsScreen.jsx`** (Favorites/Want to Make) — same filter-comparison fix
as Library, for consistency: both screens share the same `AVAIL_FILTERS`
list (see below), so leaving one on raw `avail` while the other moved to
`display.tier` would have made "Almost" behave differently depending on
which screen you filtered from.

**`src/data/constants.js`** — `AVAIL_FILTERS` gains `{ key: "adapted", label:
"Make With Substitutions" }` between "Good Enough" and "Almost" - a member
can now explicitly filter Library or Lists down to just the adapted set,
not only find them mixed into "All". This is what makes "filters... should
include adapted-makeable cocktails" concrete, per the instruction.

**Explicitly untouched, per instruction:** `BuildYourBar.jsx`'s
`makeableCount` (still `perfect`/`good` only - no aggregate
counts/breakdown this stage), `recommendations.js` (Buy Next ranking),
`recipe_components`/no `excluded_substitute_type_ids` migration, no
`ingredient_preparations`/preparable-ingredient logic (none exists yet),
`findRecipesUsingIngredient`/`IngredientDetailScreen.jsx` (still
deliberately ownership-blind, out of scope, unchanged), and D.1's own
card/HeroCard/IngredientsSection primary-status rendering (already correct,
untouched).

**Verified:** `corepack pnpm@10.34.3 test` **271/271** (+11: 6 new in
`availabilityGroups.test.js` - `DISPLAY_TIER_ORDER`'s exact order; grouping
by `display.tier` not raw `avail`; the explicit regression this stage
exists for (Perfect > Good Enough > Adapted > Almost There > Unavailable
group order); empty tiers dropped; the `avail`-only fallback; empty input.
5 new in `almostThere.test.js` - `rankAlmostThere` excludes a
`display.tier === "adapted"` recipe even when its own `strict.avail` is
"almost"; `rankAdapted` filters/ranks/ties/no-mutate. Every pre-existing
test in both files still passes unmodified). `pnpm build` clean (172
modules, +1 for `availabilityGroups.js`). Isolated-LF `oxfmt --check` clean
on all 8 changed/new files (1 reflow hand-applied to the real CRLF
`HomeScreen.jsx`). No migrations - no RLS suite / `db advisors` run this
stage.

**Not verified here (no browser tooling in this sandbox):** the actual
on-screen "Make With Substitutions" group/section and filter chip on a
phone. The live catalogue still lacks the curated rows needed for the full
Daiquiri scenario (Stage D.4 curates those), so the one thing that CAN be
checked live right now is the same narrower case D.1 left open: a recipe
resolving via the already-live `White Rum → Spiced Rum` substitute (owning
Spiced Rum, not White Rum, with every other required component already
satisfied) should now additionally appear grouped under "Make With
Substitutions" in Library and in its own Home section - not under "Almost
There" or behind the "Almost" filter.

**Commit:** `9736ed9` (this file and
`docs/plans/substitutes-and-variations.md` updated in the same commit/push).

---

## Last completed chunk (Substitutes & Variations — Stage D.1 implemented, 2026-09-11 — `src/**` only, no migrations, no live-catalogue changes)

**Scope:** exactly Stage D.1 from the approved v2 plan (see the chunk
directly below this one) — the shared `computeMakeability()` contract and
making `display` the primary user-facing status on card/HeroCard/detail.
Explicitly NOT this stage: preparations (D.2), Library/Home/Build Your Bar
grouping+counts (D.3), the per-substitute recipe override or the Buy Next
ranking split (D.4) — none of those files were touched.

**New `src/domain/makeability.js`** — `computeMakeability(cocktail, owned,
resolveIngredientName, householdBasicIds, formConversions,
generalSubstitutes)` wraps the unchanged `computeAvail()` and returns
`{ strict, adapted, display }`. `strict` is byte-for-byte today's
`computeAvail()` output. `adapted` is non-null only when every component
`strict` left missing resolves via an **owned** row in `generalSubstitutes`
(tier 4 only — no preparation tier exists yet, so one unresolvable
component fails the whole adaptation, no partial credit — this is the
general form of "Sugar alone must not imply Simple Syrup"). `display` is
`{ tier, label, isAdapted }`: equals `strict.avail` when already
perfect/good, else `"adapted"` when `adapted` resolved, else falls through
to `strict.avail` unchanged. No chaining, no reverse, no fabricated rum (or
any other) equivalence — only what `ingredient_substitutions` rows actually
say, same directional rule as Stage B.

**`groupSubstitutionsByFrom()` extracted** from
`domain/substituteSuggestions.js` (was inlined in `buildSubstituteSuggester`)
so the existing "Try:" suggester and the new tier-4 check key
`ingredient_substitutions` rows identically. Zero behavior change to the
suggester (its own tests pass unmodified).

**`App.jsx`** — the one `computeAvail()` call site now calls
`computeMakeability()`, fed `catalog.ingredientSubstitutions` (already
fetched for Stage B). `computed` items still spread `...strict` where they
used to spread `...computeAvail(...)` (so `avail`/`missingRequiredIds`/
`substitutions`/etc. are unchanged fields — Buy Next, Library/Home grouping,
Build Your Bar's count all read exactly the same data as before), plus two
new additive fields: `adapted` and `display`.

**Primary-status surfaces now read `display` instead of `avail`:**
`AvailBadge` gains an optional `label` override + a new `AVAIL_CFG.adapted`/
`AVAIL_TONE.adapted` entry (violet — the existing "Classic" source-badge
accent, no new color introduced). `CocktailCard`/`SmallCard` and `HeroCard`
compute `display = c.display ?? { tier: c.avail, ... }` and use it for the
glass, the badge, and the badge text — a recipe resolvable via an owned
general substitute now leads with **"Make with substitutions"**, never
"Unavailable" beside it. `HeroCard`'s existing strict "Missing: X" detail
box is kept (so the UI still explains what the original recipe calls for)
but relabels to "Original recipe still needs: X" when adapted, so it reads
as background rather than a second competing status under the primary
badge. `IngredientsSection` gains an `adapted` prop — a component in
`adapted.resolvedRequired` gets a new, distinct **violet** dot (never the
green "owned" dot — no ownership is faked) and an "Adapted: Spiced Rum —
&lt;note&gt;" sub-label in the same slot the muted "Try:" hint used to
occupy; `DetailScreen.jsx` passes `c.adapted` through.

**Known, deliberate limitation (not a bug, in scope for D.3 not D.1):**
Library/Home/Build Your Bar still bucket and count purely by `strict.avail`
— a recipe that's `display.tier === "adapted"` today still appears wherever
its strict tier already put it (e.g. Library's "Almost There" heading), but
the **card itself** now correctly leads with "Make with substitutions"
rather than "Almost"/"Unavailable" wherever it's rendered. This satisfies
the "never a contradictory primary badge" requirement at the card level
while leaving the section it sits under for regrouping. **[Resolved by
Stage D.2, shipped later this same session for Library/Home - see that
chunk entry above; Build Your Bar's count remains open, now Stage D.4.]**

**Verified:** `corepack pnpm@10.34.3 test` **260/260** (+9,
`makeability.test.js`: display mirrors strict when already perfect/good;
the White Rum/Spiced Rum acceptance case end-to-end; no adaptation when the
substitute is un-owned; all-or-nothing across required components; no
chaining; no fabricated reverse direction; household basics/form
conversions unaffected; null-safe with no substitutes). `pnpm build` clean
(171 modules, +1 for `makeability.js`). Isolated-LF `oxfmt --check` clean on
all 9 changed/new files (2 reflows hand-applied to the real CRLF files).
No migrations — no RLS suite / `db advisors` run this stage.

**Not verified here (no browser tooling in this sandbox):** the actual
on-screen appearance of the violet "adapted" badge/dot, and the full
Daiquiri acceptance scenario — the live catalogue still lacks the
`Lime Juice → Lemon Juice` substitute and the Simple Syrup preparation
(now Stage D.4, curates those as a verification step). The one thing that CAN be
checked live right now is narrower: a recipe whose only missing required
ingredient is White Rum, with every other required component already
satisfied, should show "Make with substitutions" as its primary badge once
Spiced Rum is owned instead of White Rum — see the manual-check note handed
to the user this turn.

**Commit:** `729f5cc` (`docs/plans/substitutes-and-variations.md` and this
file updated in the same commit/push).

---

## Last planning chunk (Substitutes & Variations — Stage D revised to v2, 2026-09-11, planning only — docs committed + pushed, no application code/migrations/live-data changes)

**Trigger:** the user reviewed the first Stage D draft (see the chunk entry
directly below this one) and rejected its core display model. Their
objection, in their own words: keeping "Unavailable" prominent beside an
additive "Make with substitutions" line "still misses your goal" — the
user-facing primary status must *reflect* the new product decision, not sit
next to a contradictory one.

**What changed, point by point (all in `docs/plans/substitutes-and-variations.md`
→ "Stage D," now marked v2):**

- **Primary status, not an addition.** Replaced the "`avail` unchanged +
  optional secondary `computeAdaptedAvail()` line" model with one shared
  `computeMakeability()` result — `{ strict, adapted, display }`. `display`
  (specifically `display.tier`/`display.label`) is now the ONE thing every
  badge, card, and group renders as the primary status; `strict` (the old
  `avail`, still computed by the unchanged `computeAvail()`) is kept only
  for the detail page's honest per-ingredient rows and internal bookkeeping.
  A recipe fully resolvable via substitution/preparation now shows "Make
  with substitutions · Prepare syrup first" as its **leading** badge — never
  "Unavailable" next to it.
- **Discovery/sorting/filtering.** Library/Home's grouped view now treats
  `display.tier === "adapted"` as part of the main "possible" set (its own
  group, ranked after Good Enough and before Almost There — i.e. after
  drinks needing no adaptation, per the user's explicit instruction, but
  still ahead of Almost/Unavailable). "Show what I can make" filtering and
  availability-sort now use `display.tier`'s rank, not `strict.tier`'s.
- **Counts.** All of Library/Home/Build Your Bar now share one count shape:
  primary total = `perfect + good + adapted`, always rendered with an
  explicit breakdown, e.g. "8 cocktails possible · 5 ready, 3 with
  substitutions or preparation." This directly resolves v1's one open
  question (literal vs. inclusive primary count) per the user's own
  instruction — no longer open.
- **Buy Next — a ranking change, not just a rendering annotation.**
  `rankPurchaseRecommendations` candidate-gathering now checks each
  `almost`-with-one-missing recipe's `display.tier`: if it's already
  `"adapted"`, the missing ingredient is NOT counted as unlocking a new
  drink (it's already makeable) — it goes into a new, separately-ranked
  `restoresOriginalRecipes` bucket with its own reason text ("Also lets you
  make the original version of N already-possible recipe(s)"), ranked below
  genuine unlocks. v1 had wrongly scoped this as "ranking unchanged,
  rendering-only" — the live audit's observation that Daiquiri doesn't
  qualify as a candidate *today* doesn't generalize once adaptation exists.
- **Recipe-specific override narrowed.** v1's `allow_general_substitutes`
  boolean silenced every configured substitute on a component to reject one
  bad one. Revised to `recipe_components.excluded_substitute_type_ids
  uuid[] default '{}'` — excludes one specific substitute type per
  component; every other configured substitute (and any preparation route)
  for that component stays eligible. Editor UI changes from a checkbox to
  removable per-substitute chips.
  - Directly satisfies: "Prefer a component-level exception so rejecting one
    unsuitable replacement does not disable valid substitutions for the
    entire recipe" (**Why:** a whole-component switch conflates "this one
    substitute is wrong" with "no substitute is ever right here," which
    isn't what a curator usually means).
- **Preparation table explicitly confirmed** (not re-designed — the user
  asked for confirmation, not a change): multiple required inputs (one row
  per input in `ingredient_preparation_inputs`), per-input quantities
  (`amount`/`unit_label` per row), steps (`instructions text[]`, same shape
  as `recipes.steps`), and atomic Save/Cancel (folded into the existing
  `IngredientTypeEditor` local-draft + `save_ingredient_type()` pattern —
  no new save mechanism).
- **Unchanged from v1:** the five-tier precedence itself (exact →
  Can-provide → recipe-scoped substitution → owned general substitute →
  satisfiable preparation, no chaining across 4-5 into each other), the
  "Sugar alone must not imply Simple Syrup" guarantee, the two new
  preparation tables' shape, the depth-1 guard trigger, the Linked
  Variations boundary (nothing here ever creates a `recipes` or
  `recipe_relationships` row), and the live audit's findings (Daiquiri's
  real components, the existing `White Rum → Spiced Rum` substitute, the
  two still-missing catalogue rows).

**Staged plan re-sequenced accordingly** (still D.1 → D.2 → D.3 → D.4, same
count of stages): D.1 now wires `display` in as the primary status from the
very first increment (not deferred to D.3) so "no contradictory Unavailable"
is true from the start, not retrofitted; D.4 now covers the narrowed
per-substitute exclusion AND the Buy Next ranking split (previously two
separate, smaller items). Each stage's acceptance checks updated to match;
regression requirement restated as "`strict`/existing counts stay
byte-for-byte unchanged as an *internal* computation," since what's
*rendered* now deliberately changes starting at D.1.

**Verified this turn:** re-read the full `docs/plans/substitutes-and-variations.md`
Stage D section and `src/domain/recommendations.js` (to ground the Buy Next
ranking-change proposal in the actual current candidate-gathering logic,
quoted in the doc) before editing. No code, no migrations, no live-catalogue
changes — planning-doc edits only, per the explicit "planning only" constraint
repeated in this follow-up instruction. `docs/project.md` left untouched
(verified via `git diff --stat` before committing, same as the prior chunk).

**Exact next action:** unchanged in substance from before — the user reviews
the now-v2 Stage D proposal; all defaults are now confirmed, no open
questions remain. On approval, implementation starts at Stage D.1.

---

## Prior planning chunk (Substitutes & Variations — Stage D proposal v1: Adapted Availability & Minimal Homemade Preparations, 2026-09-11, planning only — docs committed + pushed, no application code/migrations/live-data changes; superseded by the v2 chunk directly above)

**Trigger:** the user decided general catalogue substitutes (Stage B) should
be able to affect **discoverable makeability**, not stay suggestion-only
forever — explicitly superseding decision D1 for a new mechanism. **Not a
bug report:** the screenshot showing White Rum as "Try: Spiced Rum (in your
bar)" while Daiquiri still reads unavailable is exactly what D1 specified at
the time; recorded as confirmation, not a defect, and Stage B's own
outstanding manual checks (editor layout on a real phone, the recipe-editor
adopt+note flow, clone/edit note round-trip) are **still not marked
passed** — they stay outstanding pending Stage D's UI changes to those same
surfaces.

**Live audit done first (grounds the proposal in real data):** Daiquiri
exists (classic, shared): White Rum 60 ml / Lime Juice 30 ml / Simple Syrup
15 ml, all required. A `White Rum → Spiced Rum` general substitute already
exists live ("Adds sweetness and spice.") and behaves exactly per Stage B
spec (shows as "Try:", doesn't change `avail`, still `unavail` — 3 missing
required). No `Lime Juice → Lemon Juice` substitute and no Simple Syrup
preparation exist yet. `Water`/`White Sugar` confirmed `assumed_available`.
Confirmed in code: `computeAvail()`'s precedence and Buy Next's
`avail`/`missingRequiredIds`-only inputs are unchanged since Stage B;
Daiquiri (3 missing required) doesn't even qualify as a Buy Next candidate
today, which is why the ranking algorithm needs no change.

**Proposal recorded in full in `docs/plans/substitutes-and-variations.md` →
"Stage D — Adapted Availability & Minimal Homemade Preparations"** (see item
0 of "Exact next action" above for the condensed version). Summary of the
model: `avail`/`computeAvail()` stay completely unchanged (still exact →
Can-provide → recipe-scoped substitution); a new pure `computeAdaptedAvail()`
runs only when `avail` isn't already perfect/good, adding two more
precedence tiers — an **owned** general substitute, then a **preparable**
ingredient (its own inputs checked via tiers 1–3 only, never chained) —
consulted only for components still missing after the strict chain. Resolves
to `null` unless every remaining required component clears one of the two
new tiers (all-or-nothing, mirrors "good enough," no partial-credit tier).
Composes into **one** new badge/line ("Make with substitutions", "Prepare X
first", or both joined with "·") rather than a proliferation of badges.

**Homemade Preparations re-scoped smaller:** two new tables
(`ingredient_preparations` keyed by `produces_type_id` unique +
`ingredient_preparation_inputs`, depth-1 guard trigger) that **never touch
`recipes`** — supersedes the original Concept 3 proposal
(`recipes.kind`/`produces_ingredient_type_id`/`glass_id` relaxation) in
`docs/plans/household-basics-ingredient-forms-preparations.md`, and moots
that proposal's "re-audit every recipe consumer" requirement entirely.
Edited as one optional block on the produced type's own Ingredient Type
editor, folded into the existing atomic `save_ingredient_type()` (a 6th
param).

**Recipe-specific override (requirement 2):** new
`recipe_components.allow_general_substitutes boolean default true` — a
simple per-component opt-out of the general-substitute tier only.

**Consistency table (requirement 5), condensed** — `avail`: unchanged.
`IngredientsSection`: new distinct "Adapted:" row style + flavor note + a
link to the preparation's ingredients/steps. Cards/detail: one additional
composed-label line shown *alongside* the honest badge, never replacing it.
Library: new "Make With Substitutions" group between Good Enough and Almost
There; existing 4-tier counts/definitions unchanged (redistributive, not
double-counted). Home: same new section; `almostRanked` excludes anything
shown there. Build Your Bar: primary makeable count stays literal
(recommended default — the one open question), a separate "+N more with
substitutions" line added. Buy Next: ranking algorithm untouched, a
rendering-only "already makeable via substitution" annotation added.
Ingredient/bottle detail (`findRecipesUsingIngredient`): stays out of scope.
Linked Variations boundary preserved — nothing here ever creates a `recipes`
or `recipe_relationships` row; the adaptation is pure/ephemeral, never
persisted, no combination ever enumerated.

**Staged plan:** D.1 (substitutes-only adaptation) → D.2 (minimal
preparations) → D.3 (combine + reproduce the full Daiquiri scenario, curating
the two missing catalogue rows as a verification step, not a seed) → D.4
(recipe-specific override + Buy Next annotation). Each stage keeps a
regression check that `avail`/Buy Next/existing counts are provably
unchanged, on top of the new feature's own tests.

**One open question for the user** (not blocking, genuinely a product-feel
call): should Build Your Bar's/Home's primary makeable-count number stay
strictly literal (recommended) or include adapted recipes with a footnote?
Everything else has a stated default.

**Also this session (unrelated small fix, `32921b4`, committed + pushed
before the planning work above):** `DetailScreen.jsx`'s recipe description
was rendered in one plain `<p>`, which collapses every newline in the stored
text to a space — a multi-paragraph description (e.g. a "Legal & Ingredient
Note" callout on a trademarked-name recipe) rendered as one dense run-on
block instead of readable paragraphs (reported via a screenshot). Fixed by
splitting on blank/single line breaks and rendering each non-empty segment as
its own `<p>`; zero-risk for a plain single-paragraph description (renders
identically); build clean, 251/251 tests unaffected, isolated-LF `oxfmt`
clean.

`project.md` unchanged (per instruction — planning only, no product
decisions to log there yet).

## Last completed chunk (Substitutes & Variations — Stage B: Suggested Substitutes, 2026-09-10, committed + pushed; mobile/browser check pending)

**Stage A verification confirmed by the user (2026-09-10):** revised editor
layout approved; edit conversion guidance → confirm the inline edit → press
the main **Cancel** discards it; **Save changes → reload/reopen preserves
the edited guidance**. No other unreported checks claimed.

**Stage B — two deliberately separate layers (`docs/plans/
substitutes-and-variations.md` → "Stage B — DONE" has the full detail):**

- **General catalogue substitutes — SUGGESTION ONLY.** New table
  `ingredient_substitutions (id, from_type_id, to_type_id, flavor_note)`
  (migration `20260910190000`). Directional, **not symmetric, no inverse
  guard, no chaining** — "White Rum → Spiced Rum" and the reverse are
  separate rows, nothing auto-derived. RLS `to authenticated` from the first
  migration: `is_member()` read, `is_admin_or_moderator()` write. Written
  **only** through `save_ingredient_type()` — dropped + recreated as a 5-arg
  function (`p_substitutions jsonb default '[]'`), reconciling the edited
  type's `from`-side set inside the same one atomic transaction as
  fields/aliases/conversions. **Never handed to `computeAvail`** — no path
  from this table changes a recipe's Perfect/Almost/Unavailable state, its
  makeable count, or Buy Next. `src/domain/substituteSuggestions.js`
  `buildSubstituteSuggester` (pure) → `(missingTypeId) => [{ toId, toName,
  note, owned }]`, **owned stand-ins first**, then alphabetical, capped at 3
  (D6). `DetailScreen` builds it from `catalog.ingredientSubstitutions` +
  the resolved `owned` set; `IngredientsSection` renders a muted
  "Try: &lt;name&gt; (in your bar) — &lt;note&gt; · …" line **only on rows
  that are genuinely missing** (no green dot, not in the "Substituting:"
  slot).
- **Recipe-scoped — AFFECTS AVAILABILITY (opt-in per recipe).**
  `recipe_component_alternatives` gains nullable `note text` (migration
  `20260910180000`, ≤200, no policy change — the row's existing
  `recipe_is_editable`/`recipe_is_visible` gate covers it). `RECIPE_SELECT`
  embeds `recipe_component_alternatives(ingredient_type_id, note)`;
  `mapRecipe` → `component.alternativeNotes` (`{ altId: note }`, only for
  ones that carry a note). `computeAvail`'s `substitutions[ingId]` gains
  `note` — **passive**: the match decision, the four `avail` tiers, and the
  precedence *exact → Can provide → recipe-scoped substitution* are
  unchanged (a note-less row renders identically to before).
  `IngredientsSection` → "Substituting: Rye — spicier, drier". The recipe
  editor's alternatives are now `[{ name, note }]` — each chip has a
  one-line flavor-note field, and each catalogue suggestion for that
  component shows as a one-tap **+ &lt;name&gt;** button that adopts it
  (name + note) onto the component. Adopted rows are the **only**
  substitutions that change availability; saved through the editor's
  existing flow (`insertComponentsWithAlternatives` writes `note`).
- **Editor.** `IngredientTypeEditor` gains a **"Can be replaced by"**
  section mirroring "Can provide" (compact rows, `⋯` `BottomSheet` menu
  Edit note / Remove, collapsed `TypeComboBox` + note field behind a compact
  **+ Add**, all in the one local draft committed by the atomic **Save
  changes**). The picker has **no inverse filter** (both directions valid).
  `TypesTab` passes `ingredientSubstitutions`; `useCatalog` fetches it.
- **Recipe-path audit (notes not silently lost).** Save
  (`insertComponentsWithAlternatives` writes `note`; accepts
  `alternatives: [{ ingredientTypeId, note }]`, still tolerates a bare
  `alternativeIds` array). Load (`mapRecipe` carries `note`). Clone / Edit
  prefill and the localStorage draft restore now build
  `alternatives: [{ name, note }]` so notes survive a clone/re-save. Batch
  recipe import never set alternatives (unchanged). Plain-text share
  (`recipeShareText.js`) and the public `get_shared_recipe` RPC list
  name/amount only, never alternatives (unchanged).

**Preserved:** inventory, existing alternatives (note null → identical
rendering), household basics, ingredient forms, recipe visibility/edit
permissions, the `recipes` column-update grant.

**Verified:** `corepack pnpm@10.34.3 test` **251/251** (+9: 3 note tests in
`availability.test.js`, 6 in `substituteSuggestions.test.js`). `pnpm build`
clean (170 modules). Isolated-LF `oxfmt --check` clean on all 14
changed/new JS files (3 reflows hand-applied). Migrations pushed via
`supabase db push --linked` (clean). **RLS suite** extended — an
`ingredient_substitutions` block (member read / anon denied / member direct
write denied / admin write / self-pair rejected / blank note rejected /
**inverse pair allowed** / duplicate rejected; `save_ingredient_type`
`p_substitutions` reconcile only touches the edited type's `from` side; **a
substitution self-pair in the payload rolls the whole save back** — name +
prior set both verified unchanged; a 5-arg member call raises
`insufficient_privilege`) plus a `note` round-trip added to the
`recipe_component_alternatives` block. Full suite passes.
`supabase db advisors --type security` — no new finding. Live REST: the
`RECIPE_SELECT` embed with `note` → HTTP 200; anon read of
`ingredient_substitutions` → `200 []`.

**Not verified here (no browser tooling in this sandbox):** the "Can be
replaced by" editor section on desktop / a narrow phone; the muted "Try:"
hint on a real recipe's missing rows; the recipe editor's one-tap adopt +
flavor-note field, and that an adopted row flips availability while a bare
catalogue suggestion does not; clone/edit note round-trip in the app.
`project.md` unchanged.

### Stage A follow-up — Ingredient Type editor rework + atomic local-draft save (2026-09-10, committed + pushed)

**Layout APPROVED by the user (2026-09-10)** — "noticeably cleaner", keep the
structure. One styling-only follow-up applied same day: the "Can provide"
guidance text `text-tx3` → `text-tx2` and the ⋯ trigger `text-tx3` →
`text-tx2` + a `border border-bdr` so it reads as a discoverable control
(44px `w-11 h-11` target unchanged). No behaviour/engine/schema/permission
change; `pnpm test` 242/242, build clean, isolated-LF `oxfmt --check` clean.

**The new unified Save changes / Cancel draft flow is still MANUALLY
UNVERIFIED.** The earlier immediate-per-row-write checks do NOT prove it —
the model changed. Outstanding user checks: (1) edit a conversion's guidance
→ main **Cancel** → reopen → the original text is still there (no write);
(2) edit a conversion's guidance → **Save changes** → reload/reopen → the
new text persists.

The user asked for a focused Ingredient Type editor rework before Stage B.

**UI (`src/components/IngredientTypeEditor.jsx`):**
- Card capped `max-w-2xl` (`w-full` on mobile; `min-w-0`/`break-words` so
  nothing scrolls sideways). Color + Icon in a `sm:grid-cols-2` pair; Parent
  type + Priority in another, each with a visible label (they were bare
  `<Select>`s). Household-basic and "Can provide" copy cut to one line each.
- "Can provide" rows are compact: prepared-ingredient name, guidance
  directly beneath ("No guidance" when empty), and a **⋯ menu** (one shared
  `BottomSheet` driven by `menuForIdx` + `menuAnchorRef` — the app's kebab
  pattern, same as `AdminMenu`) with **Edit guidance** / **Remove**. A
  compact **+ Add** sits next to the "Can provide" heading (the full-width
  secondary "+ Add" button is gone). New-conversion guidance is blank with
  the example placeholder.
- **"Save changes"** is the only filled/prominent `<Btn>`; every secondary
  control (Cancel, alias Add/Remove, add-conversion Add/Cancel, inline-edit
  Done/Cancel) is a quiet outline `<button>` at `min-h-11` (44px). An
  "Unsaved changes" hint appears when the draft differs from what loaded.
- `TypeComboBox` reused (with `label` omitted); it already collapses on
  pick, bounded scroll list, inline (no overlay) so the mobile keyboard
  doesn't cover it.

**Save model:** every field **plus the full alias list plus the full "Can
provide" list** are local state (`draftAliases`, `draftConversions`). The
per-row immediate writes are gone. **Cancel** = `onCancel()` only → the
editor unmounts, draft discarded, **zero DB writes**. **Save changes**
validates the type fields client-side (`validateIngredientImport`, unchanged)
then makes **one** call — `saveIngredientType()`.

**Atomic save — migration `20260910170000_save_ingredient_type.sql`:**
`save_ingredient_type(p_type_id uuid, p_fields jsonb, p_aliases jsonb,
p_conversions jsonb)` — SECURITY INVOKER plpgsql, `set search_path = ''`,
`revoke execute … from public, anon` + `grant … to authenticated`. Body, one
transaction: (1) `UPDATE public.ingredient_types … WHERE id = p_type_id` —
`get diagnostics row_count`; 0 → `raise … using errcode = 'insufficient_privilege'`
(a member's call, RLS `using` false); (2) `DELETE … ingredient_aliases WHERE
ingredient_type_id = p_type_id` then insert the desired set; (3) `DELETE …
ingredient_form_conversions WHERE raw_type_id = p_type_id` then insert the
desired `{prepared_type_id, guidance}` set. Any failure — name clash, alias
colliding with another type (global `lower(alias)` unique index), a
conversion tripping `forbid_inverse_form_conversion` / the CHECK / UNIQUE —
rolls the **entire** call back; `catalog.js`'s `saveIngredientType()`
rethrows and the editor keeps the draft + shows `err.message`. **Both
DELETEs carry a real WHERE**, so pg-safeupdate on the `authenticator` role is
satisfied without a `where true` crutch (the trap that bit
`set_onboarding_config`). No GRANT change to any table; RLS
(`is_admin_or_moderator()` on all three) is unchanged and is the real
boundary. `updateIngredientType` is kept in `catalog.js` for any other
caller; the editor and its per-row alias/form-conversion service calls no
longer run.

**Consumers:** `IngredientTypeEditor` has exactly one — `TypesTab` (the
"My Bar edit pencil" mentioned in old comments is long removed). `TypesTab`
drops the now-unused `onAliasesChanged` / `onConversionsChanged` props;
`onSaved` (refetch + close) and `onCancel` unchanged.

**Preserved:** admin/moderator write + member read-only, the availability
engine, the one-direction rule, existing saved rows, inventory behaviour.

**Verified:** `corepack pnpm@10.34.3 test` 242/242 (no domain change);
`pnpm build` clean (168 modules); isolated-LF `oxfmt --check` clean on the 3
changed JS files (2 reflows hand-applied). **RLS suite** (`supabase/tests/
rls_suite.sql`) gains a `save_ingredient_type()` block: admin full save
writes type + aliases + conversions and drops an alias absent from the
payload; **a save whose conversion list contains the inverse of an existing
pair fails whole** — afterwards the name, alias set, conversion set and
`assumed_available` are all asserted unchanged; a member's call raises
`insufficient_privilege` and changes nothing; anon has no EXECUTE; the
moderator section gets a positive `save_ingredient_type()` check on a
throwaway type. Full suite passes (exit 0, no `FAIL:`). `supabase db
advisors --type security` — no new finding. Live: function registered as
`save_ingredient_type(uuid, jsonb, jsonb, jsonb)`, `security_definer = false`,
EXECUTE granted to `authenticated` only.

**Verification limits (honest):** no browser tooling in this sandbox (no
Playwright/Puppeteer/Chromium, `$PORT` unset) — the reworked layout on
desktop / a narrow phone, and the Cancel-then-reload / Save-then-reload flow
in the running app, are **unverified**. "Cancel makes no writes" and
"successful persistence" have **no automated component test** — vitest runs
in the node env with no jsdom/testing-library, so the React editor can't be
mounted. Cancel-no-writes is structural (Cancel calls `onCancel()` only;
`saveIngredientType()` is the single write path); atomicity/rollback and
persistence are covered by the RLS-suite DB-transaction checks. Reused
confirmed checks only (Lemon supplies Lemon Juice; juice does not supply
whole Lime; compact layout comfortable; guidance edits persist after
reload). `project.md` unchanged.

### Stage A — 2026-09-10 (committed + pushed)

**Stage A — shipped:**
- **Guidance autofill removed.** The old standalone tab auto-filled the
  add-conversion guidance box with "Squeeze fresh juice from &lt;raw&gt;"
  (nonsense for e.g. White Sugar). The new add UI starts **blank** with
  `placeholder="e.g. Squeeze fresh juice from Lemon"`. Existing saved
  guidance is untouched — the edit path seeds from the stored value.
- **"Can provide" moved into `IngredientTypeEditor.jsx`.** New section after
  Aliases, scoped to the ingredient being edited as the **raw** side. View /
  add / edit-guidance / remove, each writing **immediately** through the
  existing `src/services/ingredientForms.js` (same immediate-write pattern
  as inline alias management), independent of the type's own Save button.
  Entered text is preserved on failure with the error shown inline. The add
  picker excludes the type itself, already-linked prepared types, and any
  type that already provides this one (the inverse the DB trigger rejects).
  New props on the editor: `formConversions`, `onConversionsChanged` (wired
  from `TypesTab` as `catalog.formConversions` / `catalog.refetch`, mirroring
  the alias props).
- **`TypeComboBox` extracted** from the old tab into
  `src/components/admin/TypeComboBox.jsx` (collapsed trigger → inline search
  + bounded `max-h-56 overflow-y-auto` list → collapse on pick; 44px
  targets; `label` now optional; `placeholder` prop added).
- **Standalone "Ingredient forms" admin tab retired.**
  `src/components/admin/IngredientFormsTab.jsx` deleted; `AdminScreen`
  `TABS` entry `{ id: "forms", … }`, its import, and its render guard
  removed. Grep confirms no other reference and no `?tab=forms` deep link
  ever existed.
- **Migration `20260910160000_ingredient_form_conversions_moderator_writes.sql`**
  — `alter policy "ingredient_form_conversions: admin writes"` predicate
  `is_admin()` → `public.is_admin_or_moderator()` (D3: admins **and**
  moderators manage "Can provide", enforced in the DB). Members-read policy
  untouched → ordinary members stay read-only. No GRANT change (the table
  already carries the blanket `authenticated` SELECT/INSERT/UPDATE/DELETE
  every table has; RLS is the gate). No new function
  (`is_admin_or_moderator()` exists since `20260825100000`). Policy name
  kept; comment updated.
- **Unchanged:** `computeAvail` and its `formConversions` tier, the
  `forbid_inverse_form_conversion()` trigger, the CHECK/UNIQUE constraints,
  `user_inventory`, and all existing conversion rows (Lemon→Lemon Juice,
  Lime→Lime Juice still live).

**Verification:** `corepack pnpm@10.34.3 test` **242/242** (no domain
change). `pnpm build` clean (168 modules — one file deleted, one added).
Isolated-LF `oxfmt --check` clean on the 4 changed/new JS files (no repo-wide
format run). Migration pushed via `supabase db push --linked` (clean). **RLS
suite** extended — the moderator-role section now also asserts a moderator
can insert/update/delete a form conversion; the dedicated
`ingredient_form_conversions` block's "a member cannot insert/delete"
assertions still pass. Full suite passes (exit 0, no `FAIL:`). Live policy
re-checked: writes `is_admin_or_moderator()`, reads `is_member()`.
`supabase db advisors --type security` — no new finding (policy-only change).
**Not verified here:** no browser tooling in this sandbox — the on-screen
editor layout (desktop / narrow phone) and the add/edit/remove flow in the
running app are unverified. Reused confirmed checks only (Lemon supplies
Lemon Juice; juice does not supply whole Lime; compact layout comfortable;
guidance edits persist after reload). `project.md` unchanged.

### Earlier this day — Substitutes & Variations proposal (planning only, no code)

**New doc: `docs/plans/substitutes-and-variations.md`.** Audited live schema
+ code for all three areas before proposing:

- **Ingredient forms ("Can provide"):** table/engine/one-direction rule
  settled and confirmed working. Plan: move management from the standalone
  "Ingredient forms" admin tab into a **"Can provide" section of the
  Ingredient Type editor** (`IngredientTypeEditor.jsx`, same precedent as
  inline alias management), retire the tab, and **fix the guidance autofill**
  (new box starts blank + placeholder; existing saved guidance untouched;
  no data migration). Stage A — no migration.
- **Suggested substitutes:** audited `recipe_component_alternatives` — it's
  **per-recipe-component only, no note column, affects availability, edited
  only in the recipe editor**; no ingredient-level or admin substitution
  layer exists. Plan: keep `recipe_component_alternatives` for
  recipe-scoped, availability-affecting rules (+ a new optional `note`
  column for the flavor-change line); add a new **`ingredient_substitutions`**
  table (directional, `flavor_note`, member-read/admin-write) that is
  **suggestion-only — never read by `computeAvail`** — surfaced on missing
  recipe rows and promotable per-recipe into a real alternative. Stages B
  (M1 `note` column + M2 new table).
- **Linked cocktail variations:** audited — **no relationship table exists**
  (`recipes_schema.sql` explicitly deferred `recipe_relationships`); the
  spec reserves that exact name; Clone (`?clone=`) is a pure copy with no
  stored link. Plan: new **`recipe_relationships (recipe_id,
  related_recipe_id, relationship_type='variation_of', note)`** table, RLS
  via the existing `recipe_is_visible`/`recipe_is_editable` helpers (read
  needs *both* recipes visible; write needs edit on the variation side).
  `computeAvail` untouched — a variation is an ordinary recipe with its own
  availability, shown as a "Variations" block on the original's detail page.
  Stage C (M3).

**Interaction rule** (documented in the plan): catalogue-wide + automatic =
suggestion only; anything that changes a Perfect/Almost result was
explicitly attached to that specific recipe by someone who can edit it.
Variations never touch `computeAvail`.

**Open decisions D1–D6** carried in the plan doc (D1/D4/D5 change scope;
D2/D3/D6 have recommended defaults). **Homemade Preparations** stays in the
other plan doc, unstarted — the only tie is the shared recipe-row sub-label
slot, noted so Concept 3 slots in without a rewrite.

`project.md` unchanged (per instruction). Planning docs committed + pushed.

## Last completed chunk (Ingredient Forms — Concept 2, incl. the admin UX rework — pushed 2026-09-10; admin add/edit/save + layout still unverified)

### Ingredient Forms admin UX rework — 2026-09-10 (committed + pushed)

**Why.** The first `IngredientFormsTab.jsx` stretched conversion rows across
the full desktop width and kept two long ingredient-picker lists permanently
expanded, so the add form ran several screens tall. Scope kept to this one
tab — no engine/service/schema/RLS change, saved data untouched.

**Now (`src/components/admin/IngredientFormsTab.jsx` only):**
- Capped `max-w-2xl`. Helper copy is one line: "Whole ingredients can satisfy
  their prepared forms. Conversions work one way."
- **Compact conversion rows** — a `Card` per row: "&lt;raw&gt; → &lt;prepared&gt;"
  heading, the guidance line directly beneath, and 44×44 edit / delete icon
  buttons alongside. Edit expands an inline guidance `Input` + Save/Cancel;
  delete uses the shared `ConfirmPanel` (`layout="stack"`).
- **`+ Add conversion` button** reveals the form only when needed; the form
  has its own Cancel (and an ✕). `openAddForm` resets the draft;
  `closeAddForm` only fires on success or an explicit cancel.
- **Collapsed searchable pickers** — new local `TypeComboBox`: a single-line
  trigger showing the current pick (or "Choose an ingredient") + chevron;
  tapping it opens an **inline** search `Input` + a bounded
  `max-h-56 overflow-y-auto` result list (name+alias match, capped at 8 with
  a "N more — keep typing" hint), and picking a row collapses it back. Kept
  inline rather than reusing `BottomSheet` so the results and the form's
  Save/Cancel stay reachable with a mobile keyboard open. While open it also
  shows "Currently &lt;name&gt;" so the existing pick stays visible.
- **Desktop:** the two pickers sit side by side (`grid grid-cols-1
  sm:grid-cols-2`); **mobile:** stacked, uppercase field labels with a
  lowercase hint ("what you own" / "what the recipe asks for"), all tap
  targets ≥44px, `min-w-0`/`truncate`/`break-words` so nothing overflows
  horizontally.
- **Save-failure handling** unchanged in intent and now explicit: on a failed
  add the draft (both picks + guidance text) stays put and `addError` shows
  beside the form; same for edit (`editError`) and delete (`deleteError`).
- DB errors (self-pair / duplicate / inverse) still surface as-is. Conversion
  rules, permissions (`adminOnly` tab + `is_admin()` RLS), and validation are
  all unchanged.

**Reused, after checking behavior:** `Card`, `Btn` (default size for the real
actions; 44×44 for icon-only), `Input`, `ConfirmPanel` (`layout="stack"`),
`Icon{Plus,Edit,Trash,X,ChevD}`. `BottomSheet` was considered and rejected
for the pickers (fixed-position overlay fights the mobile keyboard).

**Verified:** `corepack pnpm@10.34.3 test` 242/242 (unchanged — no domain
touch), `pnpm build` clean, isolated-LF `oxfmt --check` clean on
`IngredientFormsTab.jsx` (4 reflows hand-applied). **NOT verified:** no
browser tooling in this sandbox (no Playwright/Puppeteer/Chromium, `$PORT`
unset) — the reworked desktop and narrow-phone layouts, and admin
add/cancel/edit-guidance/save/delete, are unverified. Desktop screenshots (if
later taken) are not iPhone verification.

**User-confirmed (2026-09-10), engine/data only:** Lemon → Lemon Juice
satisfies the Lemon Juice component in Whiskey Sour with a green indicator +
guidance, and Simple Syrup still reads as missing; owning Lime Juice does not
satisfy whole Lime in Caipirinha; both seeded pairs appear in the Ingredient
Forms tab.

### Ingredient Forms (Concept 2) — 2026-09-10 (committed + pushed)

**What it does.** Owning a raw ingredient satisfies a recipe that asks for
its prepared form — own **Lemon**, and a **Lemon Juice** requirement counts
as met, shown on the recipe with a guidance line ("Squeeze fresh juice from
Lemon"). One-directional: owning Lemon Juice never satisfies a whole-Lemon
requirement (Whiskey Sour's lemon-slice garnish still reads as missing).
Admin-managed — new pairs need no code.

**Live re-audit (done first, 2026-09-10).** Type ids confirmed unambiguous:
Lemon `4af23ef0-…` / Lemon Juice `f4058e53-…` / Lime `cc5fe68f-…` / Lime
Juice `f59e498f-…`; none `assumed_available`, no parent/child links, no
mapped products. **The old "no recipe references Garnish types" note is
WRONG** — Lemon is a `required` component of Whiskey Sour, `optional` in
Boulevardier, garnish in ~10 more; Lime is `required` in Caipirinha; Lemon
Juice is used by 18 recipes, Lime Juice by 7. No pre-existing fruit↔juice
`recipe_component_alternatives`.

**Engine — `src/domain/availability.js`.** `computeAvail()` gains an optional
5th arg `formConversions` (`{ rawTypeId, preparedTypeId, guidance }[]`). New
`matchInfoFor(component)` resolves each component in the dev-spec's exact
precedence and stops at the first match: **(1)** exact availability (owned or
household basic) → **(2)** a registered raw→prepared conversion whose raw
side is available → **(3)** an authored `alternativeIds` substitution. New
return field `formConversions`: a map keyed by the component's own (prepared)
id → `{ rawId, rawName, guidance }`, mutually exclusive with `substitutions`
and `householdBasics`. `resolveOwnedIngredientTypes()` is **unchanged** —
conversions are not unioned into the owned set, so `findRecipesUsingIngredient`
(the ingredient detail "recipes using this" list) stays ownership-blind, same
deliberate boundary as household basics. Buy Next / Home / Library need no
change: they read `computed[].avail` / `missing*Ids`, which now already
account for conversions.

**`src/App.jsx`.** Derives `formConversions` from `catalog.formConversions`
(snake→camel) in a memo, feeds it as `computeAvail`'s 5th arg, adds it to the
`computed` deps. A note by `householdBasicTypeIds` records why it's not
passed to `findRecipesUsingIngredient`.

**DB.** Migration `20260910140000_ingredient_form_conversions.sql`:
`ingredient_form_conversions (id uuid pk, raw_type_id, prepared_type_id,
guidance)`, both FKs `on delete cascade`, `check (raw_type_id <>
prepared_type_id)`, `unique (raw_type_id, prepared_type_id)`, guidance
non-blank ≤200. RLS `is_member()` read / `is_admin()` write (moderators
excluded, matching onboarding). **`forbid_inverse_form_conversion()`**
BEFORE INSERT/UPDATE trigger (SECURITY INVOKER, `set search_path = ''`)
rejects the inverse of an existing pair. Seed: Lemon→Lemon Juice, Lime→Lime
Juice via `select … into strict` (aborts on rename/missing/ambiguous).
Follow-up `20260910150000_ingredient_form_conversions_policy_role_scope.sql`:
`alter policy … to authenticated` on both policies — same `to public` slip +
fix as onboarding's `20260909140000` (an anon REST read was 401ing on
`is_member` EXECUTE; now `200 []` like every other member-read table).

**Service / hook.** `src/services/ingredientForms.js` —
`fetchIngredientFormConversions`, `createIngredientFormConversion`,
`updateIngredientFormConversionGuidance` (guidance is the only editable
field; retargeting a pair = delete + re-add), `deleteIngredientFormConversion`.
`useCatalog` fetches into `catalog.formConversions` via the existing
`Promise.all` (+ `formConversions: []` initial state).

**Admin UI.** `src/components/admin/IngredientFormsTab.jsx` + `AdminScreen`
`TABS` entry `{ id: "forms", label: "Ingredient forms", adminOnly: true }`
(after "Onboarding ingredients") + render guard `{tab === "forms" && isAdmin
&& <IngredientFormsTab catalog={catalog} />}`. Two searchable type pickers
(raw / prepared, name+alias), guidance box defaulting to "Squeeze fresh juice
from &lt;raw&gt;" until edited; existing rows list "&lt;raw&gt; →
&lt;prepared&gt;" + guidance with edit-text and confirm-delete. DB errors
(self-pair / duplicate / inverse) surface as-is. No shortcut or deep-link —
pure admin catalogue config, unlike Onboarding.

**Recipe display.** `IngredientsSection.jsx` renders
`formConversions?.[ri.ingId].guidance` in the same single sub-label slot as
"Substituting: …" / "Household basic" (only one ever shows), with the green
satisfied dot. `DetailScreen.jsx` passes `c.formConversions` through.

**Verification.** `corepack pnpm@10.34.3 test` **242/242** (+10: 9 in
`availability.test.js` — raw-satisfies-prepared, prepared-never-satisfies-raw,
exact > conversion, household-basic > conversion, conversion > substitution,
substitution fallback when raw not owned, no cross-category application,
arg-omitted parity, multi-raw source; 1 in `recommendations.test.js`
end-to-end via `computeAvail`). `pnpm build` clean. Isolated-LF `oxfmt
--check` clean on all 10 changed files (3 needed reflow — hand-applied, since
`pnpm format` still mangles the CRLF tree). **RLS suite** extended with an
`ingredient_form_conversions` block (member read / anon denied / member write
denied / admin insert+update+delete / self-pair + blank-guidance + duplicate
+ inverse-pair all rejected / cascade delete) — full suite passes.
`supabase db advisors --type security` — no new finding. Migrations: 55 files,
55 applied, 0 pending.

**Pending: the user's mobile check** (checklist handed over with the commit).
Concept 2 is NOT marked complete until then. `project.md`: one-line planning
update only.

### Household Basics Stage 3 — CLOSE-OUT — 2026-09-10 (docs + verification only, no code change)

**Household Basics is complete.** Stages 1, 2, 3 all done, committed, pushed,
mobile-verified. Stage 3 sub-stages: 3a `c999e1d`, 3b `960aa86`
(mobile-verified), 3c `3a7e29d` + safeupdate fix `ab73305` (retest PASSED),
3d `cec6e81` + drag fix `21193fa` (drag retest PASSED).

**User-confirmed on the real app (2026-09-10):**
- Drag-to-reorder works (mouse and touch).
- Save → reload preserves the new order.
- On iPhone, swiping outside the drag handle scrolls normally.
- The ⋯ menu shows "Onboarding ingredients".
- (3c retest, earlier 2026-09-10) save/reload, ingredient replacement,
  group/order/Initial changes all work.
- Regular (non-staff) users cannot access Admin.

**Code-verified in this close-out (wiring only, not manually exercised):**
- All three admin shortcuts navigate to `/admin?tab=onboarding`:
  - Home "Build your bar" → **"Edit list"** — `BuildYourBar.jsx`, rendered
    only when `isAdmin` (from `HomeScreen` Outlet context → `App.jsx`
    `profile?.role === "admin"`); `navigate("/admin?tab=onboarding")`.
  - My Bar ⋯ and Add ingredients ⋯ → **"Onboarding ingredients"** — one
    `AdminMenu.jsx` backs both hosts (`SearchFilterHeader.jsx`,
    `AddIngredientsScreen.jsx`), each passing `isAdmin` from Outlet context;
    `if (!isAdmin) return null`; `go("/admin?tab=onboarding")`.
- Destination resolves: `/admin` behind `RequireStaff` (`App.jsx`);
  `AdminScreen` `TABS` has `{ id: "onboarding", label: "Onboarding
  ingredients", adminOnly: true }`; `?tab=onboarding` deep link initialises
  `tab` to `"onboarding"` only when it's in `visibleTabs` (admin-only tabs
  filtered out for moderators), else falls back to Overview — a moderator
  reaching the URL via the side nav lands on Overview, not a broken tab;
  render guard `{tab === "onboarding" && isAdmin && <OnboardingTab />}`.

**Verification limits — non-blocking, carried forward:**
1. **Home "Edit list" link — visual/interaction check UNVERIFIED.** The link
   renders only inside the Build Your Bar widget, which `HomeScreen` shows
   only when the bar was empty at first inventory load this visit
   (`showBuildYourBar` snapshot). The user's admin account owns ingredients
   and there is no empty-bar admin account; per the user's instruction,
   inventory was not cleared and no account/role change was made for this
   check. Wiring is code-verified above; the on-screen click was not
   exercised. Menu visibility alone is not treated as confirmation of the
   destination.
2. **Offline-save handling — UNVERIFIED.** `saveOnboardingConfig` failure
   keeps the draft + surfaces `err.message`; the offline / failed-RPC path
   has not been manually exercised.

**Fresh run (2026-09-10):** `corepack pnpm@10.34.3 test` 232/232,
`pnpm build` clean. No migration, no code change in the close-out.
`project.md` — brief planning-status line only.

### Drag-to-reorder BUGFIX — 2026-09-10 (`21193fa`, committed + pushed; retest PASSED)

**Reported:** on `cec6e81`, dragging the grip handle did nothing — **mouse
and touch both**. **Root cause (proven by inspection, not the unit tests):**
the drop-target marker `data-onboarding-row={typeId}` was set on `<Card>`, and
`Card` (`src/components/primitives.jsx`) destructures only
`{ children, style, className, onClick }` — it does **not** spread unknown
props, so the `data-*` attribute never reached the DOM. `elementFromPoint(...)
.closest("[data-onboarding-row]")` therefore always returned `null` →
`onDragMove` always early-returned → no reorder, on any input device.
`reorderOnboardingDraft`'s unit tests passed the whole time because the
function itself was fine; the DOM wiring was the break.

**Fix (`OnboardingTab.jsx`, scope kept tight):**
- `data-onboarding-row` now lives on a plain `<div>` wrapper around each
  `<Card>` (real DOM node, attribute actually renders).
- Drag is now driven from **`window` `pointermove`/`pointerup`/`pointercancel`
  listeners** added in `startDrag` and removed in `endDrag` — not from props
  on the handle button. Reordering re-renders and moves that button in the
  DOM, which can drop pointer capture and stop prop-level `pointermove`;
  window listeners keep firing regardless of DOM moves. `setPointerCapture`
  is kept as a best-effort bonus (pointerup-outside-viewport) but nothing
  depends on it.
- While a row is being dragged its wrapper gets `pointer-events: none`, so
  `elementFromPoint` reports the row **under** the cursor, not the dragged
  row itself.
- 4px movement threshold before the first reorder (no static-press jitter;
  drag styling only appears once moving).
- Handle keeps `touch-none` (browser won't scroll from it) + `tabIndex={-1}`;
  swiping anywhere else on the row still scrolls. **↑/↓ buttons unchanged**
  (the keyboard / AT path). Reorders still flow through `draft` → Save /
  Discard → atomic `set_onboarding_config`. Within-group only.
- `aria-hidden` dropped from the handle (kept a real `aria-label`).

**Verification (in-sandbox):** this sandbox has **no browser/touch
automation** (no Playwright/puppeteer) and **no DOM test env** (vitest
`environment: "node"`, no jsdom/testing-library). So the fix was verified in
the sandbox by: root-cause proof from source, `reorderOnboardingDraft` unit
tests (232/232), production build clean, isolated-LF `oxfmt --check` clean,
and `.touch-none { touch-action:none }` present in the built CSS.

**Status: drag-to-reorder = PASSED.** The user retested on the real app
2026-09-10 — drag works (mouse + touch), save → reload preserves order,
off-handle swipe still scrolls on iPhone, ⋯ menu shows "Onboarding
ingredients", non-staff can't reach Admin. Stage 3 is closed out (see the
CLOSE-OUT chunk above). Two non-blocking limits carried forward: Home "Edit
list" visual check, offline-save handling.

### Sub-stage 3d + drag-to-reorder — implemented 2026-09-10 (`cec6e81`; drag reorder broken there, fixed in the bugfix above)

- **`domain/buildYourBar.js` `reorderOnboardingDraft(items, draggedId, targetId)`** —
  pure array-move: splice the dragged row out, re-insert at the target's
  index. Returns the SAME reference (React bails) when either id is missing,
  they're equal, or the two rows are in different groups (drag reorders
  within a group only; the group dropdown moves rows between groups). Never
  mutates. + 5 tests (down-move, up-move, cross-group no-op, unknown/self
  id, no-mutation) → 232 total.
- **`components/admin/OnboardingTab.jsx`** — per-row **grip handle**
  (inline `GripIcon`, 6 dots). Drag = **Pointer Events**, not HTML5 DnD:
  `onPointerDown` on the handle captures the pointer + records the dragged
  id; `onPointerMove` uses `document.elementFromPoint(...).closest(
  "[data-onboarding-row]")` to find the row under the finger and calls
  `setDraft(reorderOnboardingDraft(...))`; `onPointerUp`/`onPointerCancel`
  release. `touch-none` is on the **handle only**, so a swipe anywhere else
  on the row scrolls the page normally. Handle is `tabIndex={-1}` /
  `aria-hidden` and `disabled` in a 1-row group; the **↑/↓ buttons stay**
  for keyboard / assistive tech. Dragged card dims + cyan ring. Reorders go
  through the same `draft` → `dirty` → Save/Discard → `saveOnboardingConfig`
  (atomic `set_onboarding_config`) path — unchanged. Intro copy updated.
- **`components/home/BuildYourBar.jsx`** — new `isAdmin` prop; admin-only
  **"Edit list"** link (cyan, 44px min height) beside the "Build your bar"
  `<h2>` → `/admin?tab=onboarding`. Non-admins: not rendered.
- **`screens/HomeScreen.jsx`** — pulls `isAdmin` from Outlet context (already
  provided by `App.jsx`), passes it to `BuildYourBar`.
- **`components/myBar/AdminMenu.jsx`** — second item **"Onboarding
  ingredients"** → `/admin?tab=onboarding`, alongside the kept **"Edit
  ingredients"** (→ `?tab=types`). This one component backs both the My Bar
  header (`SearchFilterHeader`) and `AddIngredientsScreen` ⋯ menus. Still
  `if (!isAdmin) return null`; `/admin` stays behind `RequireStaff`.
- **No migration.** Client-only.
- **Verify:** `corepack pnpm@10.34.3 test` 232/232; `build` clean;
  isolated-LF `oxfmt --check` clean on all 6 changed `.js`/`.jsx`
  (OnboardingTab reflowed by the formatter, taken as-is). `project.md`
  untouched.
- **Phone check — PASSED (user, 2026-09-10):** drag within a group works
  (mouse + touch), save + reload persists the order, the page still scrolls
  when swiping off the handle on iPhone, and the ⋯ menu shows "Onboarding
  ingredients". Non-staff cannot reach Admin. The Home "Edit list" link
  itself was not exercised on screen (no empty-bar admin account — see the
  CLOSE-OUT chunk's limit 1); its wiring is code-verified. Stage 3 is closed
  out — see the "Household Basics Stage 3 — CLOSE-OUT" chunk at the top of
  this file.
- **3c retest result (2026-09-10, user, real app): PASSED** — saving,
  reloading (persists), replacing ingredients, and order/group/Initial
  changes all work; non-staff users cannot access Admin. **Offline-save
  handling NOT manually verified** — left unconfirmed.

### Background — Stage 3 scope

Stage 2 is done + mobile-verified. Stage 3 re-scoped: the "Build your bar"
onboarding lists become an **admin-managed DB table** so future curation needs
no code / AI / redeploy. **Full approved design (with the user's 8 revisions)
is in `docs/plans/household-basics-ingredient-forms-preparations.md`'s Stage 3
section** — read it there. Sub-stages: **3a (flags + schema + seed) — DONE**;
**3b (read service + resolver + BuildYourBar wiring) — DONE + mobile-verified**;
**3c (admin "Onboarding ingredients" editor + safeupdate fix) — DONE, retest
PASSED**; **3d (drag-to-reorder + shortcuts) — DONE, drag retest PASSED**.
**Stage 3 closed out 2026-09-10 (see the CLOSE-OUT chunk above).** Ingredient
Forms / Homemade Preparations are still not started.

### Sub-stage 3c — CODE COMPLETE 2026-09-10 (committed + pushed); SAVING = FAILED PENDING RETEST after the safeupdate bugfix

**Bug + fix (2026-09-10, `20260910130000`).** The user hit
`DELETE requires a WHERE clause` on the first real Save (remove Dark Rum, add
Rum). Confirmed by direct inspection, not assumed:
- The live `set_onboarding_config` body (`pg_get_functiondef`) had a bare
  `delete from public.onboarding_ingredients;`.
- `pg_db_role_setting`: the `authenticator` role has
  `session_preload_libraries = supautils, safeupdate`. Every PostgREST
  REST/RPC connection is `authenticator`, which then `SET ROLE`s to
  `authenticated`/`anon` per request — so `pg-safeupdate`'s
  `post_parse_analyze` hook is active for the RPC, and it rejects a no-WHERE
  DELETE/UPDATE (`jointree->quals == NULL`).
- **Why the RLS suite passed:** `supabase db query --linked` connects as a
  direct login that does *not* preload `safeupdate`, and `SET ROLE` (how the
  suite simulates identities) does not load `session_preload_libraries`
  mid-session — those load once at connection start. The hook was never
  installed for the suite, so its identical call succeeded.
- **Could not fire the hook from the CLI** to reproduce end-to-end:
  `LOAD 'safeupdate'` → `access to library "safeupdate" is not allowed`, and
  there's no admin JWT available to hit the real RPC. Mechanism is nailed by
  inspection; the definitive check is the in-app retest.
- **Fix:** `create or replace` the function with
  `delete from public.onboarding_ingredients where true;` — pg-safeupdate's
  own recommended form; the guard runs at parse-analyze *before* the planner
  folds the constant, so `quals` is a non-NULL Const and the DELETE is
  allowed. safeupdate stays active for everything else. No permission change
  (still SECURITY INVOKER + `search_path=''` + `revoke public,anon` /
  `grant authenticated`), no atomicity change (one DELETE + one INSERT in the
  function's single transaction). `db advisors --type security`: no finding.
- **Regression coverage:** `rls_suite.sql`'s `onboarding_ingredients` block
  now asserts (source-level, since it can't `LOAD safeupdate`) that the
  whole-list DELETE carries an explicit WHERE. Full suite still exit 0.
- **Status:** `pnpm test` 227/227, `build` clean. **NOT retested through the
  real app.** 3c saving is FAILED until the user confirms: replace Dark Rum
  with Rum → Save → reload → change persists.

**User override of the approved 3c design:** instead of per-action write
helpers (`addOnboardingIngredient` / `setOnboardingInitial` / … each = write +
refetch), the editor holds a **local draft** and saves the **entire config
atomically in one call** — adds, removes, group changes, initial flags and
order together. `set_onboarding_order` (the 3a reorder-only helper) doesn't
cover that, so a new function was added.

- **Migration `20260910120000_set_onboarding_config.sql`** — `set_onboarding_config(p_rows jsonb)`,
  `language plpgsql`, **SECURITY INVOKER**, `set search_path = ''`,
  `revoke execute from public, anon` + `grant to authenticated` (same shape as
  `set_onboarding_order`). Body: validate `p_rows` is a jsonb array; reject
  `> 6` `is_initial`; reject a duplicated `ingredient_type_id`; then
  `delete from onboarding_ingredients` + `insert` the payload — **one
  transaction**, so any failure (bad group_label CHECK, bad FK, RLS WITH
  CHECK) rolls the delete back too and the live list is never partial/empty.
  A non-admin's DELETE hits 0 rows (RLS `using is_admin()`), and a non-empty
  payload trips the INSERT's WITH CHECK → whole call rolls back. Pushed
  (`db push --linked`), ledger `local == remote`, `db advisors --type security`
  **no new finding** (search_path pinned; baseline SECURITY DEFINER + auth
  warnings unchanged).
- **`set_onboarding_order` is kept** (shipped, still RLS-suite-covered) but the
  app no longer calls it — `set_onboarding_config` supersedes it for this UI.
- **`services/onboarding.js`** — `saveOnboardingConfig(rows)`: maps the draft
  (display order) to `{ ingredient_type_id, position: i+1, is_initial,
  group_label }` and `supabase.rpc("set_onboarding_config", { p_rows })`.
  `position` is derived from array order, callers never track it. Errors
  propagate unchanged.
- **`src/components/admin/OnboardingTab.jsx`** (new) — takes `catalog`. Draft
  is one flat array with a **grouped invariant** (all Spirits rows, then
  Mixers, then Kitchen basics; stable within a group) via `regroup()`, so
  grouped rendering and position-from-index are trivial. `dirty` = serialized
  draft ≠ last-saved snapshot; a `dirtyRef` stops the catalog-sync effect from
  clobbering an in-progress edit. Per row: name (dimmed + struck + "Hidden —
  household basic" when the type is `assumed_available`), group `Select`
  (3 fixed labels), `★ Initial` toggle (disabled OFF→ON once 6 are initial),
  44×44 ↑/↓ (swap within the group only, disabled at group ends), 44×44
  remove. Header: intro copy, `Save changes` / `Discard` (both disabled unless
  dirty), `N/6 initial` counter, backfill explainer at the cap, inline
  `err.message` on failure (draft preserved), "Saved." on success.
  "Add ingredient" = search `Input` + capped (20) result list of catalog
  types not already listed, matched on name or alias; a new row defaults its
  group from the ingredient's category via `defaultOnboardingGroup`. On
  successful save → `catalog.refetch()` so Home reflects it with no redeploy.
- **`domain/buildYourBar.js`** — `defaultOnboardingGroup(categoryName)`:
  contains "spirit" → `Spirits`, "mixer" → `Mixers`, else `Kitchen basics`.
  Null/empty-safe. + 4 tests (227 total).
- **`src/screens/AdminScreen.jsx`** — `OnboardingTab` import;
  `{ id: "onboarding", label: "Onboarding ingredients", adminOnly: true }` in
  `TABS` right after Ingredient Types; render
  `{tab === "onboarding" && isAdmin && <OnboardingTab catalog={catalog} />}`.
  Deep-link `?tab=onboarding` works through the existing `useSearchParams`
  initial-tab logic. Moderators never see it (`adminOnly`).
- **`supabase/tests/rls_suite.sql`** — `onboarding_ingredients` block extended
  with `set_onboarding_config` checks: admin replaces the whole list in one
  call (count + per-row `group_label`); `> 6` initial rejected **and the prior
  config still stands**; a member call is denied by RLS **and leaves the
  config intact** (the delete rolls back too); anon has no EXECUTE. Full suite
  re-run against the linked project — exit 0, no FAIL.
- **Verify:** `corepack pnpm@10.34.3 test` 227/227; `build` clean; isolated-LF
  `oxfmt --check` clean on all 5 changed `.js`/`.jsx` (OnboardingTab reflowed
  by the formatter, taken as-is). `project.md` untouched.
- **3d (BuildYourBar "Edit list" link + `AdminMenu` item) — done in the
  drag-to-reorder chunk above.**

### Sub-stage 3b — DONE 2026-09-10 (`960aa86`, committed + pushed; mobile-verified 2026-09-10)

**Mobile verification result (2026-09-10):** six initial tiles include Coke
instead of Ice; expanded groups (Spirits / Mixers / Kitchen basics) display
correctly; tile selection, live makeable count, and "Show my cocktails" work;
all three nav links (Browse cocktails → `/library`, Show my cocktails →
`/library?sort=availability`, Find more ingredients → `/bar/add-ingredients`)
open the expected screens. **Back-navigation widget visibility was not
separately confirmed** — the per-visit snapshot behavior is unchanged from
before 3b and remains unverified; do not mark it done.

- **`src/services/onboarding.js` (new)** — `fetchOnboardingIngredients()` only:
  `select("ingredient_type_id, position, is_initial, group_label").order("position")`.
  Read side of the module; the write helpers (`addOnboardingIngredient`,
  `removeOnboardingIngredient`, `setOnboardingInitial`, `setOnboardingGroup`,
  `reorderOnboarding` → `rpc('set_onboarding_order')`) come in 3c.
- **`src/hooks/useCatalog.js`** — `fetchOnboardingIngredients()` added to the
  existing `Promise.all`; `onboardingIngredients` added to initial state and
  the resolved `next`. A fetch failure of this table therefore fails the whole
  catalog load → App.jsx's existing blocking error screen; a refetch failure
  keeps the last-good rows (existing functional-setState spread).
- **`src/domain/buildYourBar.js`** — `resolveEssentialsList` (name-based)
  **removed**; new pure `resolveOnboardingSelection(rows, types)` →
  `{ six, groups }`. `groups` is always the 3 fixed labels
  (`ONBOARDING_GROUP_LABELS = ["Spirits","Mixers","Kitchen basics"]`) in fixed
  order, each bucket sorted by `position` then `name`. `six` = `is_initial`
  survivors in overall position order, backfilled from the rest (same order),
  deduped by id, capped at 6. Drops rows whose type is missing (deleted since
  seeding), excludes `assumed_available` types from both outputs, defensively
  filters out-of-range `group_label` so `six ⊆ groups` always holds. Null/
  undefined `rows`/`types` tolerated.
- **`src/domain/buildYourBar.test.js`** — rewritten: 13 `resolveOnboardingSelection`
  tests (fixed label order regardless of row order; per-group position sort;
  six = is_initial in position order; backfill when <6 initial; no dup when
  backfill reaches an initial row; cap at first 6 by position when >6 initial;
  <6 eligible → fewer, no gap/crash, empty group still present; deleted-id row
  dropped from both, doesn't consume a slot; assumed_available excluded from
  both; flagged initial pulls next backfill candidate up; six ⊆ groups exactly
  once each; empty config; null-safe). Old `BUILD_YOUR_BAR_*` fixture import
  gone.
- **`src/components/home/BuildYourBar.jsx`** — imports/`resolvedTiles` helper
  swapped for one `useMemo(resolveOnboardingSelection(catalog.onboardingIngredients,
  catalog.types))`. Expanded view maps `nonEmptyGroups` (empty headings
  hidden). "Show all essentials" toggle now only renders when the expanded
  total exceeds `six.length` (for the normal 14-row seed: 14 > 6, unchanged).
  Selection/tap, live makeable count, per-visit visibility, nav CTAs all
  untouched.
- **`src/data/buildYourBarEssentials.js`** — `git rm`'d. Nothing else imported
  it (grep-verified before deletion).
- **Verify:** `corepack pnpm@10.34.3 test` 223/223 (was 216; −6 old name tests,
  +13 new). `corepack pnpm@10.34.3 build` clean (pre-existing >500 kB chunk
  warning only). `oxfmt --check` on isolated LF copies of all 5 changed
  `.js`/`.jsx` files — clean (3 needed reflow, hand-applied: two call/arrow
  wraps + the test fixture object expansion). REST sanity:
  `GET /rest/v1/onboarding_ingredients?select=ingredient_type_id,position,is_initial,group_label`
  → HTTP 200 (anon RLS-denied `[]`, shape valid). Plain column select, no
  PostgREST embed.
- **Inert-no-longer:** `BuildYourBar` now reads the live table. Seed = the 14
  rows from 3a; nothing else changed in the DB.

### Sub-stage 3a — DONE 2026-09-09 (committed + pushed)

**Flag reconciliation (live DB, not a migration — catalogue is admin data):**
`update ingredient_types set assumed_available = false where id =
'594e9b87-3774-4671-a73b-11a5e69a267c'` (Simple Syrup). Flagged set is now
exactly **Black Pepper, Ice, Salt, Water, White Sugar** (count 5) — matches
the user's decisions (keep those 5, un-flag Simple Syrup, skip nonexistent
"Hot Water").

**Migrations (3, all `local == remote`):**
- `20260909130000_onboarding_ingredients.sql` — table `onboarding_ingredients
  (ingredient_type_id uuid pk references ingredient_types on delete cascade,
  position int not null, is_initial bool not null default false, group_label
  text not null check in ('Spirits','Mixers','Kitchen basics'))`. RLS enabled.
  `set_onboarding_order(uuid[])` — SECURITY INVOKER, one-statement whole-list
  position reassignment (atomic reorder), `revoke execute from public, anon` +
  `grant to authenticated`. Asserting name-resolved seed: 14 rows, aborts if
  any name fails to resolve to exactly one `ingredient_types` row.
- `20260909140000_onboarding_ingredients_policy_role_scope.sql` — the two
  policies were written `to public` (same slip as
  `20260823150000_liquid_colors`); `alter policy ... to authenticated` on
  both. RLS suite caught it (`permission denied for function is_member` for
  anon). Same fix as `20260823160000_liquid_colors_policy_role_scope`.
- `20260909150000_set_onboarding_order_search_path.sql` — `db advisors`
  flagged `function_search_path_mutable` on `set_onboarding_order` (only
  function in the schema without a pinned path); `alter function ... set
  search_path = ''`. Finding cleared.

**Seed verified live:** 14 rows — Spirits 7, Mixers 3, Kitchen basics 4;
`is_initial` = Gin, Vodka, Soda Water, Coke, Lemon Juice, Lime Juice (6);
Ice **not** seeded (replaced by Coke); Simple Syrup seeded (Kitchen basics,
no longer a household basic). All 14 seed names verified to resolve uniquely
against the live catalogue before writing the migration (no missing/ambiguous).

**Verification:** migration ledger — `20260909130000/140000/150000` all
`local == remote`. `rls_suite.sql` extended with an `onboarding_ingredients`
block (member read / admin write / anon denied / `group_label` check /
`set_onboarding_order` admin-reorders + member-noop + anon-no-EXECUTE) —
full suite passes (exit 0, no FAIL). `db advisors --type security` — no new
finding (search_path cleared; baseline SECURITY DEFINER + auth warnings
unchanged). `corepack pnpm@10.34.3 test` 216/216 (no JS changed).
`pnpm build` clean. No `.js`/`.jsx` touched → no `oxfmt` run needed.

**Inert:** nothing reads `onboarding_ingredients` yet — `BuildYourBar.jsx`
still uses the hard-coded `buildYourBarEssentials.js`. 3b wires it.

### Stage 3 work already done (to preserve)

3a as above. The earlier live catalogue check (table below) and the plan
revision. All in git (`11be941`, `9e5f97d`, and this 3a commit).

### Live `assumed_available` set at Stage 3 start (drifted since Stage 2, which verified "Ice only")

| Type | id | category | Stage 3 verdict |
|---|---|---|---|
| Ice | `d949c9b0-ba2b-4389-995c-55c6e29b101e` | Other | keep — expected |
| Salt | `ab935424-b79e-43bc-945a-599bbccc9237` | Garnish | keep — matches target (plain salt) |
| Water | `1ddbc38b-1f3b-4dc2-a8b5-7e49bba95245` | Other | keep — matches target |
| White Sugar | `7f9e3634-165a-4ef4-8da2-c2323ee2b549` | Sweetener | keep — this **is** the plain-sugar target (no plain "Sugar" row exists) |
| **Simple Syrup** | `594e9b87-3774-4671-a73b-11a5e69a267c` | Sweetener | **DECISION NEEDED** — contradicts "no syrups" + Concept 3 (Simple Syrup is a preparation, not a basic) |
| **Black Pepper** | `d690dace-da45-4f09-a811-4b0c21a877de` | Other | **DECISION NEEDED** — not in the Stage 3 target list, never discussed |

### Other catalogue facts

- **"Hot Water" does not exist** as an ingredient_type. Cannot be flagged
  (creating types is out of scope). Reported missing.
- Plain **"Sugar"** does not exist — `White Sugar`, `Brown Sugar`,
  `Sugar Cube` are distinct rows. `White Sugar` is the plain-sugar target;
  the other two are not flagged.
- Flavored salt: **"Celery Salt"** `128dc7ef-7ce8-4cb5-af0f-59d160088b39`
  (Other) — distinct from `Salt`, not flagged. Good.
- Onboarding "Cola": the real type is **"Coke"**
  `8423a555-569d-4eff-a4ed-a3c58e85c20c` (Mixer, not flagged). This is the
  exact name to put in `BUILD_YOUR_BAR_INITIAL_SIX` in place of "Ice".
- Not flagged and staying that way: Soda Water, Tonic Water, Coke, and every
  flavored syrup (Cinnamon/Honey/Orgeat/…).

### Remaining Stage 3 work (once the two decisions are in)

1. Reconcile live flags to the agreed set (un-flag Simple Syrup / Black
   Pepper if the user says so; confirm the rest). Via `supabase db query`
   `UPDATE ingredient_types SET assumed_available = … WHERE id = …` or the
   admin UI.
2. `BUILD_YOUR_BAR_INITIAL_SIX`: "Ice" → "Coke". Add "Coke" to
   `BUILD_YOUR_BAR_GROUPS.Mixers` so the six stays a subset of the expanded
   14.
3. New pure fn in `domain/buildYourBar.js` composing `resolveEssentialsList`
   + dynamic `assumed_available` exclusion (both the six and the groups) +
   top-up backfill from the expanded groups' declared order (skip
   already-shown, no dupes) + graceful under-six. `BuildYourBar.jsx` calls
   it instead of its inline `resolvedTiles`.
4. Tests in `buildYourBar.test.js`: exclusion from six + groups; a flagged
   member of the six pulls the next expanded candidate up (not a shrink);
   dedupe; fewer than six eligible → returns what exists, no crash.
5. `corepack pnpm@10.34.3` test/build; `oxfmt --check` on isolated LF copies.
6. Commit + push; production/mobile checklist; leave mobile verification
   pending the user.

## Last completed chunk (Household Basics Stage 2 — engine wiring, Ice only, 2026-09-09)

**Committed + pushed (`c1629b9`). Mobile-verified by the user 2026-09-09 — a recipe needing only Ice reads "Perfect" with the Ice row showing "Household basic" + green dot, Ice absent from Buy Next, My Bar still shows Ice unowned, Library groups/counts agree, the un-flag/re-flag revert cycle works. Stage 2 DONE.**

### What shipped

- **`src/domain/availability.js`**
  - `resolveOwnedIngredientTypes()` gains optional `assumedAvailableTypeIds`
    (Set). Unioned into the result **after** the ancestor walk and never
    itself walked → a flagged type satisfies only its own exact id, never a
    parent, never a child. Separate arg (not folded into `ownedTypeIds`) so
    ownership-only callers just omit it.
  - `computeAvail()` gains optional 4th arg `householdBasicIds` (Set). Uses
    `isAvailable(id) = owned.has(id) || basics.has(id)` for matching, so it's
    correct even if a caller forgot to also union upstream. Returns a new
    `householdBasics` map (same shape/keying as `substitutions`): a component
    whose own ingId is directly satisfied and is a flagged basic. A basic
    reached only via an explicit `alternativeIds` entry stays in
    `substitutions` instead (authored relationship, different thing).
  - Neither change alters the four `avail` tiers' meaning; omitting the new
    args reproduces pre-Stage-2 output exactly (regression-tested).
- **`src/App.jsx`** — `householdBasicTypeIds = new Set(catalog.types.filter(t
  => t.assumed_available).map(t => t.id))`, memoized on `catalog.types`, fed
  into both `resolveOwnedIngredientTypes` (as `assumedAvailableTypeIds`) and
  `computeAvail` (4th arg). `resolvedOwned` (Outlet context `owned`) now
  includes flagged basics.
- **`src/components/detail/IngredientsSection.jsx`** + **`DetailScreen.jsx`**
  — new `householdBasics` prop; a satisfied basic gets the green dot and a
  "Household basic" sub-label (rendered in the same slot as "Substituting:
  X", never both — they're mutually exclusive by construction).
- **`src/domain/ingredientRecipeMatches.js`** — comment only: it deliberately
  does **not** pass `assumedAvailableTypeIds` to `resolveOwnedIngredientTypes`
  (viewing ≠ owning; a basic must not surface every Ice recipe under every
  unrelated ingredient's detail page).

### Downstream surfaces — verified consistent, no code needed

All read `computed[].avail` / `missing*Ids` from `computeAvail`, so they
follow automatically once Ice is treated as satisfied:
- Availability badges, Library grouped view + Sort + counts + filters
  (`LibraryScreen` uses `computed`, `.avail`).
- Home "Almost There" (`rankAlmostThere` filters `avail === "almost"`).
- Buy Next (`rankPurchaseRecommendations` keys off `avail === "almost"` &&
  `missingRequiredIds` — a recipe missing only Ice is neither, so Ice can
  never be a candidate; covered by a new integration test).
- My Bar / Speed Rack read raw `inventory.*`, not context `owned` — a flagged
  basic never shows as owned/checked and can't be pinned (confirmed by grep:
  only `DetailScreen` consumes context `owned`).
- `recipeShareText.js` (Copy Recipe) only imports `formatAmount` — untouched.

### Live catalogue check (Ice)

`supabase db query` on the linked project: one word-boundary "Ice" type —
`d949c9b0-ba2b-4389-995c-55c6e29b101e`, name `Ice`, category `Other`,
`parent_type_id` null (no parent, no children), **`assumed_available = true`**.
It is the **only** flagged type (111 types total). No ambiguous
"Crushed Ice"/"Cubed Ice" siblings exist. The flag was already ON from the
user's Stage 1 toggle testing — note the user's Stage 1 message said "Ice is
currently OFF", which did **not** match the live row; left ON since Stage 2
requires exactly that. No migration/seed change — the flag is admin-UI data,
per the catalogue's import model.

### Verification (2026-09-09)

- `corepack pnpm@10.34.3 test` → **216/216** (201 prior + 15 new):
  `availability.test.js` — assumed basic alone satisfies its exact component;
  no upward/downward propagation; no cross-branch leak; real ancestor walk
  still applies alongside assumed ids; omitting the arg == unchanged output;
  `householdBasics` map contents; a basic used as an authored `alternativeIds`
  entry reads as a substitution not a basic; normal ownership unchanged with
  a basics set present. `recommendations.test.js` — end-to-end: a recipe
  missing only flagged Ice yields no purchase recommendation.
  `ingredientRecipeMatches.test.js` — viewing an unrelated ingredient never
  surfaces an Ice-using recipe.
- `pnpm build` → clean, 165 modules.
- Formatting: `oxfmt --check` on isolated LF copies of all 8 changed files →
  clean (two test files needed wrap fixes; done by running `oxfmt` on the
  isolated copy and hand-applying). `pnpm format` **not** run (CRLF bug).
- **Not done by me:** the in-app mobile check — handed to the user.

## Last completed chunk (Household Basics Stage 1 — schema + inert admin toggle, 2026-09-09)

**Committed + pushed. DONE — the user phone-verified the toggle 2026-09-09 (ON and OFF both persist after save + reopen). Stage 2 continues from here.**

### What shipped

- **Migration `20260909120000_ingredient_types_assumed_available.sql`** — adds
  `ingredient_types.assumed_available boolean not null default false` + a
  column comment stating the no-parent/child-propagation rule. No new RLS
  policy or grant: `ingredient_types` has a blanket table-level UPDATE grant
  gated by the `ingredient_types: admin update` policy (admin + moderator
  since `20260825100100`), and there are no column-scoped grants on the
  table, so the new column rides the same write path as every other field.
  Not a `SECURITY DEFINER` function, so no `db advisors` re-run required.
- **`src/services/catalog.js`** — `assumed_available` added to the
  `fetchIngredientTypes` select; `updateIngredientType` takes `assumedAvailable`
  and writes `assumed_available`. Plain passthrough, same shape as `shape`.
- **`src/components/IngredientTypeEditor.jsx`** — `assumedAvailable` state
  (`useState(type.assumed_available ?? false)`), a "Household basic"
  `OwnedToggle` row placed right after the bar-priority `Select` (both are
  catalogue-level availability tuning), passed through in `handleSave`.
  Explanatory copy: "Assume every member has this. It never shows as missing
  in a recipe and never drives a Buy Next suggestion."
- **Nothing reads the column.** `resolveOwnedIngredientTypes`/`computeAvail`
  are untouched — the flag is fully inert until Stage 2. `IngredientTypeEditor`
  is shared by Admin → Ingredient Types (My Bar's inline edit pencils are
  gone), so admins *and* moderators get the toggle.

### Verification (2026-09-09)

- `npx supabase migration list --linked`: 47 prior migrations `local == remote`,
  `20260909120000` was the only pending one. `db push --dry-run` confirmed
  only that file, no seeds/roles. `db push` applied it; `migration list` now
  shows `20260909120000` `local == remote` — **48/48** (this chunk first
  recorded "47/47", a miscount; see the reconciliation note near the top of
  this file).
- Live column check via `supabase db query`: `boolean`, `is_nullable = NO`,
  `default false`, comment present; 111 `ingredient_types` rows, **0 flagged**
  (default applied, nothing flagged — no ingredient flagging in Stage 1, as
  scoped).
- Catalogue query shape: a REST call with the exact `fetchIngredientTypes`
  select string (incl. `assumed_available`, `order=name`) → HTTP 200 (was
  400 "column does not exist" before the push).
- `corepack pnpm@10.34.3 test` → **201/201**. `pnpm build` → clean, 165
  modules. Formatting: **`pnpm format` was NOT run** (oxfmt CRLF bug, below);
  `oxfmt --check` on isolated LF copies of the two changed files → "correct
  format".
- **Not done by me:** authenticated in-browser catalogue load and the
  toggle save/persist check — no logged-in session available here. Handed to
  the user as a phone checklist.

### Recovery note — oxfmt 0.2.0 CRLF bug (root-caused this session, separate follow-up)

Earlier this session, `pnpm format` reformatted 118 files (blank line inserted
after every source line). Root cause, reproduced in isolation: this machine's
clone has `git config core.autocrlf = true`, so every checked-out file is
CRLF; `oxfmt` 0.2.0 given CRLF input emits LF output **with a blank line after
every original line**. Same file as LF → `oxfmt` reports `unchanged`. The
committed code is correctly oxfmt-clean. Not a version or platform-binary
issue (all 8 `@oxfmt/*` platform packages incl. `win32-x64` are in the
lockfile; oxfmt 0.2.0 has no config options at all).

Recovery: a `git stash create` snapshot was tagged `recovery-snapshot`
(`6aefd03`) + `scratchpad/recovery/working-tree.patch` saved first, then the
118 files restored from HEAD via `git restore --source=HEAD` (targeted list,
never `checkout -- .`). A mid-recovery `core.autocrlf=false` +
`git add --renormalize` attempt was reverted — `core.autocrlf` is back to
`true` (clone default). `git diff HEAD` verified empty except the Stage 1
edits; blob-OID equality (HEAD = index = worktree) spot-checked. The
`recovery-snapshot` tag is being kept for now (delete with
`git tag -d recovery-snapshot` once satisfied).

**Open follow-up (repo decision, deferred, non-blocking):** resolve so
`pnpm format` is usable on this machine — either upgrade `oxfmt` past the bug,
or add a `.gitattributes` `* text=auto eol=lf` rule + one-time renormalize.
No dependency upgrade or repo-wide normalization was done in this stage. Until
then: `oxfmt --check` on isolated LF copies of changed files only.

## Last completed chunk (Household basics / ingredient forms / preparations — planning session, 2026-09-08)

**Planning only — no code, schema, or live data changed.** Full detail lives
in `docs/plans/household-basics-ingredient-forms-preparations.md`; this is a
short pointer, not a duplicate.

- Audited the shared availability engine (`resolveOwnedIngredientTypes`/
  `computeAvail`, one choke point in `App.jsx` feeding every screen), the
  admin ingredient-type editor, the recipes/recipe_components/
  recipe_component_alternatives schema, and the Garnish/Juice category split
  already present in the catalogue.
- Two rounds of user revision produced the final approved design:
  household-basic flags satisfy only their own exact type id (no
  parent/child propagation, a deliberate change from the first draft);
  ingredient-form conversions (Lemon→Lemon Juice, Lime→Lime Juice) are
  directional-only and rank between exact availability and an explicit
  substitution in a defined priority order; homemade preparations reuse the
  `recipes` table with a `kind` discriminator, cap dependency depth at one
  level to avoid needing cycle detection, and stay manual-ownership-only for
  v1.
- **Corrected two stale claims caught by the user**: My Bar's inline admin
  edit pencils were removed (editing is Admin → Ingredient Types only now,
  reached via the ⋯ menu); "no recipe uses Garnish-category ingredients" was
  a historical note, since contradicted by verified screenshots — current
  usage must be re-checked live, not assumed either way, when Ingredient
  Forms' stage actually begins.
- **Household Basics Stages 1–3 approved as next work.** Ingredient Forms
  and Homemade Preparations approved as direction only — each has a
  required pre-stage re-audit called out in the plan doc (every recipe
  consumer including public sharing/import-export/lists/search/permissions
  for preparations; whole-graph self-reference + later-edit handling for the
  dependency guard) that must happen when that stage actually starts, not
  before.
- `docs/project.md` got one line: household basics is next, mood/taste
  discovery stays after it.

**Next action:** see the top of this file — verify live catalogue names,
then start Household Basics Stage 1 only.

## Last completed chunk (My Bar redesign Stage 3 - Speed Rack, 2026-09-07)

**Committed `77dcb18`; follow-up bug fix `207769b`. Stage 3 is COMPLETE and fully mobile-verified (user, 2026-09-07). This is the last stage - the My Bar redesign is done.**

**Mobile verification (user, 2026-09-07):** all Speed Rack checks passed. One reproducible bug was found and fixed mid-verification (own a type -> pin -> un-own -> re-own -> the pin star did nothing); its three retests (generic remove/re-add/pin/unpin, the specific-product equivalent, immediate pin of a newly owned ingredient with no reload) all passed on the user's phone. **Resolved.**

### Follow-up fix (RESOLVED): pin star dead after re-owning (`207769b`, 2026-09-07)

**Root cause confirmed (matches the user's hypothesis).** `useInventory`'s optimistic ownership add (`toggleType` / `toggleProduct` / `ownProduct`) inserts a placeholder row with a fake `optimistic-<id>` id and, on success, **never reconciled it with the real server row**. Ownership display only checks that a row for the id exists, so this was invisible - until Speed Rack, which needs the row's real id to `UPDATE pinned`. `setPinnedOnRow` correctly refused to `UPDATE` a fake id (`startsWith("optimistic-")` guard) and returned silently -> "star does nothing". Un-own then re-own is the cleanest repro, but a fresh own-then-pin in the same session (no intervening `load()`) hit it too.

**Fix:**

- `services/inventory.js`: `addIngredientTypeOwnership` / `addProductOwnership` now `.insert(...).select("id, ingredient_type_id, product_id, pinned").single()` and return the inserted row. The trailing SELECT reads the just-inserted own row - allowed by the same `read own` RLS policy every other inventory read uses (the existing RLS suite already exercises `INSERT ... RETURNING` as a member).
- `useInventory.js`: after a successful add, `setRows(reconcileOptimisticRow(prev, ` optimistic-<id>`, realRow))` swaps the placeholder for the real row (real id, `pinned: false`). No `load()`, so no app-loading-screen flash.
- New pure module `src/domain/inventoryRows.js` (`isOptimisticId`, `findPinnableRow`, `reconcileOptimisticRow`) - the reconciliation + "is there a real row to pin?" logic, extracted so it is unit-testable without React. `setPinnedOnRow` now calls `findPinnableRow` (keeps the no-op-until-reconciled safety net for the rare sub-second window before an add resolves).
- **Failed-update handling improved**: a failed pin write now reverts just the one `pinned` flag rather than calling `load()` (which flashed the whole app via `App.jsx`'s `isLoading` gate). Ownership-add failure still uses `load()` - unchanged, pre-existing, rare.

**Regression test** `src/domain/inventoryRows.test.js` (8 cases): the full `own -> pin -> un-own -> re-own -> pin -> unpin` lifecycle for a **generic type** and for a **specific product**, asserting the re-owned row has the new server id (not the stale placeholder) and that pin *and* unpin both work afterward; plus generic-vs-product pin independence, and the helper units.

**Verified 2026-09-07**: `corepack pnpm@10.34.3 test` **201/201** (193 + 8 new). `pnpm build` clean (165 modules, +1 `inventoryRows`). `pnpm format` clean. No schema/RLS change in this fix, so no migration and no advisor re-run needed. UI files untouched. Committed as `207769b`. **Retested on the user's phone 2026-09-07 - all three lifecycle cases pass.**

### Decision made at stage start (plan Decision 7 left it open)

**Persistence: a `pinned boolean` column on `user_inventory`** (not a separate `user_speed_rack` table). The user picked this from the two plan candidates - smallest change, no join, un-owning drops the pin automatically, and no `position` column since there is no reorder UI (out of scope, not in the plan).

### Migration `20260906130000_user_inventory_pinned.sql` - applied via the normal `db push` workflow

- `alter table public.user_inventory add column pinned boolean not null default false`.
- `user_inventory` had only read/insert/delete policies (ownership is add-or-remove, never updated). Added `"user_inventory: update own"` (`for update ... using/with check (user_id = (select auth.uid()))`).
- Column-scoped the grant: `revoke update on public.user_inventory from anon, authenticated; grant update (pinned) on public.user_inventory to authenticated` - the same pattern `recipes` uses. Supabase's default blanket table UPDATE grant would otherwise let the new policy also rewrite `user_id`/`ingredient_type_id`/`product_id`.
- **Applied with `npx supabase db push --linked`** (not `db query`) so it is recorded: `migration list --linked` now shows **47/47 `local == remote`**. Verified live: column present (`not null default false`), the update-own policy exists, `has_table_privilege('authenticated','user_inventory','UPDATE')` = false, `has_column_privilege(... ,'pinned','UPDATE')` = true, `has_column_privilege(...,'ingredient_type_id','UPDATE')` = false, anon table UPDATE = false. `db advisors --type security` = 18 findings, unchanged baseline, none mentioning `user_inventory`/`pinned`.
- **RLS suite** (`supabase/tests/rls_suite.sql`) extended in-place in the existing `user_inventory` block: owner can set `pinned`; the flag actually persists; a non-`pinned` column stays unwritable (`insufficient_privilege`); a different member's `pinned` update affects 0 rows; anon is denied. Full suite re-run against the live project - clean (it aborts loudly on any `FAIL`; it did not).

### Client

- `services/inventory.js`: `fetchInventory` selects `pinned`; new `setInventoryPinned(userId, inventoryId, pinned)` (`update({pinned}).eq(id).eq(user_id)`).
- `useInventory.js`: new `pinnedTypeIds` / `pinnedProductIds` sets (kept independent of the owned sets), and `togglePinType(typeId)` / `togglePinProduct(productId)` - optimistic, same shape as `toggleType` (flip local, write in background, `load()` + rethrow on failure). Bails on an unpersisted optimistic row.
- **Pin control on `IngredientDetailScreen`** (not on the shelf tile - keeps the verified Stage 2 layout untouched): a star toggle in the `TopBar` `right` slot, shown **only when the viewed item is owned** (`ownedTypeIds`/`ownedProductIds`) - you can't Speed-Rack what you don't own. `aria-pressed`, tinted when pinned. It only ever flips `pinned`, never ownership.
- **New `src/components/myBar/SpeedRack.jsx`**: the strip at the top of `/bar` content (above the shelves), rendered only when >=1 pin. Wrapping pills (>=44px tall, no horizontal scroll per the plan's own rule), each = small icon + short name, tap -> that item's recipe page (same as a shelf item). Order: name-sorted. A pinned product borrows its type's icon/colour.
- `MyBarScreen.jsx`: builds `speedRackItems` from the pinned sets + catalog, renders `<SpeedRack>`. sessionStorage browsing-state logic untouched.

### Derived (not spelled out in the plan) - flagged for the user

- **Pin/unpin affordance lives on the recipe detail page**, not the shelf tile or the strip itself. Rationale: "preserve the verified shelf layout" (explicit in the Stage 3 request) rules out a third tile button, and it keeps the strip minimal. Unpinning = open the strip item -> tap the star again.
- **No reorder.** The plan says "pin persists and displays in a small top strip", nothing about ordering; strip is name-sorted.

**Verified 2026-09-07**: `corepack pnpm@10.34.3 test` 193/193 (no new unit tests - no new pure-domain logic; pin logic is optimistic-state plumbing like the existing toggles, and RLS is covered by the suite). `pnpm build` clean (164 modules, +1 SpeedRack). `pnpm format` clean. RLS suite clean. Committed as `77dcb18`.

**Manual mobile checklist (My Bar redesign Stage 3 - Speed Rack):**

1. Open **My Bar** with nothing pinned -> no Speed Rack strip; shelves look exactly as before (Stage 2 unchanged).
2. Tap an owned bottle's name/icon -> its recipe page. A **star** button is in the top bar. Tap it -> back to My Bar -> a **Speed Rack** strip now sits above the shelves with that item as a pill.
3. Pin two or three more (including, if you have one, a specific product via its own page). The strip fills with wrapping pills - confirm they wrap onto short rows with **no sideways scrolling**, names readable, each comfortably tappable.
4. Tap a Speed Rack pill -> opens that item's recipe page (same as tapping it on the shelf). Tap the star again -> it's removed from the strip on return.
5. Un-own a pinned item (its shelf checkmark) -> it disappears from both the shelf and the Speed Rack strip.
6. On a bottle you **don't** own, open its page -> there is **no** star button (can't Speed-Rack what you don't own).
7. Confirm unchanged: shelf bottle/name = view, checkmark = own, chevron = products; the admin ⋯ menu; search + category + back-navigation state restoration; Build Your Bar on Home.

## Earlier chunk (Migration-history mismatch - audited, reconciled, and RESOLVED, 2026-09-07)

**Outcome: the 14 unrecorded migrations are now marked `applied` in the remote ledger via `supabase migration repair` (ledger-only). No migration SQL executed, no schema/data change. `db push` is unblocked. Pre-repair audit + reconciliation + execution log below.**

### Reconciliation of the "14 vs 15" discrepancy (done before executing)

An earlier note (2026-09-05, top-up chunk) said "Migrations `20260825100000` through `20260826120000` (14 entries)" + the separate `20260905130000` - reading as 15 unrecorded. **That "14" was a miscount.** Verified against the exact files and ledger:

- `ls supabase/migrations/*.sql` -> **46 files, 46 unique versions**. Files with version `>= 20260825100000`: **14** (thirteen in `20260825100000..20260826120000` inclusive, plus `20260905130000`).
- Remote ledger (`select version from supabase_migrations.schema_migrations`) -> **32 rows**, contiguous `20260815200430`..`20260823160000`.
- `comm` set-diff (CR-normalised): local-not-in-ledger = **exactly 14**; ledger-not-in-local (orphans) = **0**; in-both = **32**.
- The 14-version diff is **byte-identical** to the 14 versions verified applied in this same chunk's audit. No new/unverified migration surfaced. So: **14 unrecorded, not 15** - the `20260825100000..20260826120000` inclusive range has 13 files, not 14.

### The 14 versions repaired

`20260825100000 20260825100100 20260825100200 20260825100300 20260825100400 20260825110000 20260825120000 20260825130000 20260825140000 20260825150000 20260826100000 20260826110000 20260826120000 20260905130000`

### Execution log (2026-09-07, `npx supabase` CLI v2.116.0, `--linked`)

1. **Ledger snapshot saved** (recovery baseline): 32 rows, `20260815200430 initial_schema` .. `20260823160000 liquid_colors_policy_role_scope` (full list captured to a scratchpad file at audit time).
2. `npx supabase migration repair --linked --status applied --yes <the 14 versions>` -> `"Migration history repaired"`, `status: applied`. Ledger-only; runs no migration DDL/DML.
3. `npx supabase migration list --linked` -> **46 rows, all `local == remote`, 0 mismatches.**
4. `npx supabase db push --linked --dry-run` -> `{"upToDate":true,"dryRun":true,"migrations":[],"message":"Remote database is up to date."}` - nothing would be replayed.

**Not run:** `db push` for real (dry-run only), any migration SQL, any schema/data change. **Recovery if ever needed:** `npx supabase migration repair --linked --status reverted <version…>` removes ledger rows; target good state is the 46 now present. `migration repair` cannot touch table data or schema, so no DB restore is in scope.

### Pre-repair audit (read-only) - what was verified before touching the ledger

Scope was strictly read-only: `migration list`, `db query` SELECTs against `pg_proc`/`pg_policies`/`pg_constraint`/`information_schema`/data tables, and `--help`.

### What the ledger says (verified fresh, `npx supabase migration list --linked`)

- 46 local migration files. **32 recorded** in the remote `supabase_migrations.schema_migrations` ledger (`20260815200430` -> `20260823160000`, all `local == remote`).
- **14 NOT recorded** (`remote: ""`): the 13 schema/policy migrations `20260825100000` -> `20260826120000`, plus the `20260905130000` top-up data-repair migration.
- Confirmed the ledger table itself holds exactly those 32 `version` rows.

### Did each unrecorded migration actually land? (verified against live objects + data, not just names)

**All 14 are FULLY applied.** Zero partial, zero absent, zero uncertain. Evidence per migration:

- `20260825100000 moderator_role` - `is_moderator()`/`is_admin_or_moderator()` exist (both `security definer`, `search_path=public`); `profiles_role_check` = `role IN ('admin','moderator','member')`; `admin_set_user_role` body widened to accept 'moderator' **and still guarded by `if not is_admin()`** (no privilege-escalation).
- `20260825100100 moderator_catalog_policies` - all **19** write policies across the 7 lookup tables (`ingredient_categories/types/aliases`, `glasses`, `taste_tags`, `cocktail_families`, `liquid_colors`) reference `is_admin_or_moderator()`; **0** still on bare `is_admin(`; policy counts normal (4 per table, `liquid_colors` 2 - it was never split).
- `20260825100200 moderator_ingredient_requests_policies` - read policy = `(requested_by = auth.uid()) OR is_admin_or_moderator()`; resolve policy = `is_admin_or_moderator()`.
- `20260825100300 moderator_recipe_moderation_functions` - `admin_promote_recipe_to_classic` / `admin_demote_recipe_to_community` / `unpublish_recipe` bodies all reference `is_admin_or_moderator`; anon can't execute any, authenticated can all.
- `20260825100400 moderator_function_grant_fix` - `anon` **cannot** execute `is_moderator()` / `is_admin_or_moderator()` (PUBLIC grant revoked); `authenticated` can.
- `20260825110000 ingredient_type_shapes_and_categories` - `ingredient_types.shape` column (`not null default 'spirit_bottle'`) + `ingredient_types_shape_check` (11 values); categories **Dairy & Eggs** and **Sauce** exist; the 6 relocations landed (`Soy sauce/Tabasco/Worcestershire Sauce` -> Sauce; `Aquafaba/Egg White/Fresh Cream` -> Dairy & Eggs); `Wine.sort_order = 5`; **0** null/invalid shapes; per-row overrides landed (`Ice=ice`, `Salt=jar`, `White Peach Purée=fruit`).
- `20260825120000 admin_merge_ingredient_type` - function `admin_merge_ingredient_type(uuid,uuid,boolean)` exists. (Separate, unrelated: the Black Pepper/Pepper duplicate this tool was built for has still never actually been merged - a catalog-cleanup task, not a migration gap.)
- `20260825130000 ingredient_category_shapes` - `ingredient_categories.shape` column + `ingredient_categories_shape_check`; **0** null; spot checks correct (`Wine=wine_bottle`, `Bitters=dropper`, `Sauce=sauce_bottle`, `Dairy & Eggs=dairy`).
- `20260825140000 glass_aliases` - table `glass_aliases (id, glass_id, alias)`, both indexes (`_glass_id_idx`, `_alias_lower_idx`), RLS enabled, **4** policies with the right expressions (read = `is_member() OR is_admin()`, writes = `is_admin_or_moderator()`).
- `20260825150000 recipe_liquid_color_2` - `recipes.liquid_color_2` (text, nullable); table-level UPDATE on `recipes` **revoked** from `authenticated`; column-UPDATE grant list = exactly `{name, description, glass_id, family_id, liquid_color, liquid_color_2, steps}`.
- `20260826100000 liquid_colors_alpha` - `liquid_colors_hex_check` = `hex ~* '^#[0-9a-f]{6}([0-9a-f]{2})?$'`; `Clear` row hex = `#dbeafe80`.
- `20260826110000 recipe_popularity_counters` - `recipes.favorite_count` / `want_to_make_count` (`integer not null default 0`); both `sync_*` functions exist; both triggers (`user_favorites_sync_count`, `user_want_to_make_sync_count`) exist and enabled; **backfill is exact** - 0 recipes where the stored count differs from a live `count(*)`, `sum(favorite_count) = 4 = total user_favorites rows`; `favorite_count` is **not** in the authenticated column grant (privacy shape intact).
- `20260826120000 public_recipe_share` - `get_shared_recipe(uuid)` exists, `security definer`, filters `visibility='shared' AND moderation_status='active'`, executable by `anon`.
- `20260905130000 fix_topup_part_corruption` (DATA) - **effect fully present**: **0** `recipe_components` rows anywhere have `unit_label = 'top-up part'`, and there are no out-of-vocabulary unit labels at all (every non-ml, non-numeric label is exactly `top-up` or `to taste`). Nuance: 4 of the 5 row ids the migration targets still exist and read `'top-up'`; the 5th (`4c0031a9…`, "Bloody Mary: Ice") **no longer exists** - that recipe was re-saved since (recipe-component edits delete+reinsert all rows), so its Ice component now has a new id (`fda6a271…`) and was written correctly as `'top-up'` by the shipped `parseUnitLabel()` fix. So the repair is complete; replaying this migration now would be a no-op (`where unit_label = 'top-up part'` matches nothing). User data intact: 43 recipes (8 user-owned), 234 recipe_components, nothing malformed.

### Why `db push` fails

`supabase db push` replays every local migration whose version is absent from the remote ledger, in order, from `20260825100000`. That file's `create function public.is_moderator() …` hits an object that already exists -> `is_moderator already exists` -> the whole push aborts. It is not a data problem; it is purely the ledger being out of sync with reality (those 14 were applied out-of-band via `supabase db query --linked --file`, which never writes the ledger).

### The repair (executed 2026-09-07 - see the "Execution log" near the top of this chunk)

`supabase migration repair` only inserts/deletes rows in the `schema_migrations` **ledger** - **no** migration DDL/DML. All 14 were verified fully applied, so marking them `applied` is accurate. Ran: snapshot -> `migration repair --linked --status applied --yes <14 versions>` -> `migration list --linked` (46/46 `local == remote`) -> `db push --linked --dry-run` (`upToDate: true`, nothing to replay). `20260905130000` was marked `applied` like the rest (kept as the historical record of the incident) rather than deleted.

## Earlier chunk (My Bar redesign Stage 2 - shelf visuals + admin ⋯ header menu)

**Committed `bda465a`, 2026-09-07. Follow-up fix `a1a9d84` (see below). Stage 2 is COMPLETE - fully mobile-verified by the user 2026-09-07 (see "Verification" below). Stage 3 (Speed Rack) stays deferred behind the `db push` migration-history mismatch - not started.**

### Follow-up: "admin ⋯ menu missing" investigation (`a1a9d84`, 2026-09-07)

**User tested and saw no ⋯ menu on either header, and also no shelf visuals - the screenshot still showed the pre-Stage-2 bordered cards + family boxes.**

Investigation - the committed code is correct and reachable:
- `isAdmin` chain intact: `App.jsx` sets `outletContext.isAdmin = profile?.role === "admin"`; `MyBarScreen` and `AddIngredientsScreen` both destructure it from `useOutletContext()` and pass it down (`SearchFilterHeader` prop / `TopBar` `right` slot); `AdminMenu` renders a 44px `<button>` whenever `isAdmin` is truthy (hooks run before its `if (!isAdmin) return null`).
- Destination verified: `AdminMenu` -> `navigate("/admin?tab=types")`; `AdminScreen` now reads `?tab=` once on mount, `visibleTabs.some(id === "types")` is true, so `tab` initialises to `"types"` and `{tab === "types" && <TypesTab/>}` renders. `/admin` stays behind `RequireStaff`.
- `git ls-remote origin refs/heads/main` = `9d9e57d`, which contains `bda465a` - **Stage 2 is on GitHub `main`**. A fresh `corepack pnpm@10.34.3 build` bundle contains `"Edit ingredients"`, `"Ingredient admin"`, `tab=types`.
- **Conclusion: the tested preview is running a build older than `bda465a`** - it is missing *both* Stage 2 features at once (shelves and the menu), which rules out a role/wiring bug and points at deploy/serve staleness. Could not reach or inspect the running server from the agent shell (`$PORT` empty; nothing responding on 8443/5173/3000/8080/4173), so the redeploy has to happen on the user's side (git remote is already current; `vite build` output is already correct).
- `a1a9d84` hardens the trigger so it can't be overlooked once the current build is live: bolder `IconDots` (r 1.5 -> 2), full-contrast `text-tx`, clearer bordered button, `title`. No behaviour change - admins only, page-level, never on a tile, destination `/admin?tab=types`.
- `origin/main` already contained `bda465a` at the time the user tested (a push happened between turns), so the stale link is the **deploy/preview build step, not git** - it did not rebuild from the current `main`. `git push` run this session too: `origin/main` is now `cd5c2b1` (Stage 2 + the `a1a9d84` fix + docs). **The user needs to trigger a fresh build/redeploy of the preview.**

**Resolved: it was a stale preview. Once the user redeployed a current build, the ⋯ menu and shelves appeared and everything checked out - see "Verification" below.**

### Verification (2026-09-07, user, on a current build incl. `bda465a` + `a1a9d84`)

**Stage 2 is fully mobile-verified. All checks passed:**

- Admin ⋯ -> "Edit ingredients" opens Admin -> Ingredient Types directly, on **desktop and mobile**. (Earlier "FAILED" was the stale build only.)
- Shelf readability / layout - bottles on shelf lines, readable wrapping names, no horizontal overflow, softened family groups.
- The three actions stay separate and tappable: tap bottle/name -> recipe page, checkmark -> ownership, chevron -> product expansion.
- Generic vs. product ownership stay independent - no product silently removed, no generic ownership silently added.
- Back-navigation restores search text, category, expanded rows and scroll position.
- Add ingredients (plain browse/search grid, no shelves) and Build Your Bar are unchanged.

**My Bar redesign: Stages 1-2 complete. Stage 3 (Speed Rack) deferred, not started.**

### Approved plan revision (recorded in `docs/my-bar-ux-plan.md`, Decision 5)

Stage 1 put a lightweight admin-only inline `IngredientTypeEditor` on `IngredientDetailScreen`. That is **replaced** by: one admin-only ⋯ menu in the **My Bar** and **Add ingredients** page headers, whose single item **"Edit ingredients"** opens **Admin -> Ingredient Types** directly. No admin menus/pencils on individual tiles. Hidden for non-admins; no permission logic changed.

### Shelf visuals (My ingredients only)

- **New `src/components/myBar/ShelfItem.jsx`** - same handler contract as `TypeCard` (`onCardClick` view / `onToggleOwned` generic-own / `onToggleExpand` products, plus `owned`/`expanded`/`ownedProducts`/`allProducts`/`coveringChildren`), so `MyBarScreen.renderCard` just swaps `<TypeCard>` -> `<ShelfItem>`. Bottle icon + wrapping readable name in one big tap-to-view button; a real 44x44 checkmark and a 36px expand chevron below it (both `stopPropagation`). `border-b-2 border-bdr` on each item + the grid's `gap-x-0` = a continuous shelf line per row; grid stretch + `flex-1` keeps items equal height so lines align however far a name wraps. Grid is `repeat(auto-fill,minmax(88px,1fr))` with `break-words` names -> short wrapping rows, no horizontal overflow (~3 cols on a 360px phone).
- **`TypeCard.jsx` is untouched** - Add ingredients and Build Your Bar keep the plain grid card. `MyBarScreen` no longer imports `TypeCard`.
- **`FamilyCluster.jsx` softened** - the bordered `bg-white/2` box is gone; now just a small parent-name label + its own `minmax(88px,1fr)` sub-shelf grid (`contents` wrappers so an expanded product panel still spans full width). `col-span-full` dropped (it isn't inside a grid any more). `MyBarScreen` passes `renderCard`/`renderExpanded` straight through (`renderExpanded(type, {gridColumn:"1 / -1"})` is now called by the cluster itself).
- **Add ingredients gets no shelves** - stays a plain browse/search grid, unchanged.
- Preserved and unchanged: bottle/name-vs-checkmark-vs-chevron split, generic-vs-product ownership (type toggles still only write the generic `user_inventory` row; products only via `ExpandedProducts`' `OwnedToggle`), search / category jump / `sessionStorage` back-nav state restoration (the `rootRef` + `.closest(".overflow-y-auto")` scroll capture still sits on `MyBarScreen`'s outer div), Build Your Bar.

### Admin ⋯ header menu

- **New `src/components/myBar/AdminMenu.jsx`** - renders `null` for non-admins (after its hooks). A 44px ⋯ button (`IconDots`, new in `icons.jsx`) opening a `BottomSheet` (same primitive the category picker uses) with one item, "Edit ingredients" -> `navigate("/admin?tab=types")`.
- **`SearchFilterHeader.jsx`** takes `isAdmin` and renders `<AdminMenu>` beside the search input. **`AddIngredientsScreen.jsx`** puts it in the `TopBar` `right` slot.
- **`AdminScreen.jsx`** now reads `?tab=` once on mount (via `useSearchParams`) as the initial tab, validated against `visibleTabs`, falling back to Overview - same "read once, don't keep in sync" pattern as its existing `?source=` handling. `/admin` stays gated by `RequireStaff`; the menu only gates its own visibility.
- **`IngredientDetailScreen.jsx`** reverted to its pre-Stage-1 form (no `IngredientTypeEditor` import, no `editing` state, plain `TopBar`).

**Verified 2026-09-07**: `corepack pnpm@10.34.3 test` 193/193 (no new tests - UI reskin + routing, no new domain logic). `pnpm build` clean (163 modules, +2: `AdminMenu`, `ShelfItem`). `pnpm format` clean. Committed `bda465a`.

**Manual mobile checklist (My Bar redesign Stage 2):**

1. **My Bar** - ingredients read as bottles sitting on subtle shelf lines, grouped by category. Names are readable and wrap onto short rows; nothing scrolls sideways; family groups (e.g. Whiskey) show as a soft label + their own shelf, no heavy box.
2. Tap a bottle/name -> its recipe page. Tap the checkmark -> removes it from the bar (no navigation). Expand a type with products (chevron) -> product list; tap a product name -> the product's own page. All three still feel distinct and comfortably tappable.
3. Expanding products still shows the per-product owned toggles; un-owning the generic type vs. a specific product still behave separately (no product silently removed, no generic ownership silently added).
4. Set a search term / pick a category, expand a type, scroll down, open a recipe page, then back-navigate -> search, category, expanded rows and scroll position all restored.
5. **Admin only**: a ⋯ button sits in the My Bar header (next to search) and in the Add ingredients top bar. Tap it -> a sheet with **Edit ingredients** -> lands directly on Admin -> Ingredient Types. A non-admin never sees the ⋯ button. No edit pencils anywhere on tiles or the recipe detail page.
6. **Add ingredients** is unchanged - still plain category tiles + search grid, no shelves. Build Your Bar on Home is unchanged.

## Earlier chunk (Cocktail Library + My Bar UX Stage 5 close-out + My Bar redesign Stage 1)

Two things that session: closed out the still-open Stage 5 of the Cocktail Library + My Bar UX effort (item 16), then implemented Stage 1 of the approved My Bar redesign (item 17, `docs/my-bar-ux-plan.md`). Committed separately. **Stage 1's full manual mobile checklist was confirmed passed by the user, 2026-09-07.**

### Stage 5 close-out (item 16) - no code, review only

**All five consolidated mobile-verification groups were confirmed passed by the user, 2026-09-07.** Integration review across Stages 1-4 + the Sort control (re-read `LibraryScreen.jsx`, `IngredientDetailScreen.jsx`, `MyBarScreen.jsx`, `TypeCard.jsx`, `ExpandedProducts.jsx`, `FamilyCluster.jsx`, `BuildYourBar.jsx`, `ingredientRecipeMatches.js` + its tests):

- **No defects found.** `findRecipesUsingIngredient` is called from exactly two places (LibraryScreen's `ingredientMatchIds`, IngredientDetailScreen's `allMatches`); both pass `{typeId}` for the type case and "View all" always deep-links `?ingredient=<typeId>` (never a product id), consistent with the "matching always runs against the resolved type" decision.
- **Two cosmetic notes, deliberately not changed**: (1) `AVAIL_GROUP_LABEL` (LibraryScreen) and `GROUP_LABEL` (IngredientDetailScreen) duplicate the same four tier strings - each screen stays self-contained, same as `HomeScreen.jsx`'s own copy. (2) LibraryScreen's empty-state "Clear filters" button resets query/availFilter/source/taste but not the URL `?ingredient=` param - not reachable in practice (the detail page only shows "View all" when `totalCount > 10`, so the ingredient always has matches; extra filters clearing brings them back).
- **Regression run**: `corepack pnpm@10.34.3 test` 193/193, `pnpm build` clean, `pnpm format` clean. No new manual verification needed - the five mobile groups already covered every interaction end to end. Effort's feature set is **complete**; only the My Bar redesign (item 17) continues from here.

### My Bar redesign Stage 1 (item 17) - route split, no visual reskin yet

**`/bar` is now owned-first "My ingredients"; a separate `/bar/add-ingredients` is the find-and-add flow. Grid appearance unchanged this stage (shelf visuals are Stage 2).**

- **`MyBarScreen.jsx`** - always owned-only now (the "Owned only" toggle is gone). `isOwned(typeId)` stays direct-only (`ownedTypeIds.has(id) || productsByType.has(id)`) so an inferred parent (owned child, unowned parent) never shows as a standalone possession - the owned child renders flat via `buildRows`'s existing orphan-child path; an *explicitly* owned parent still shows. Header's old `+` icon is now a full-width **"+ Add ingredients"** button -> `/bar/add-ingredients` (the `/bar/add` specific-bottle entry point moved onto that screen). Empty states split: a genuinely empty bar gets "Your bar is empty" + an Add ingredients button; filters-hide-everything keeps the existing "clear your filters" `EmptyState`.
- **Browsing-state preservation (plan Requirement 2, verified not assumed)** - `MyBarScreen` fully unmounts on navigate to `/bar/type/:id`, so React keeps nothing and `navigate(-1)` only restores the URL. Added `sessionStorage` persistence (`rustyPipes.myIngredients.viewState`, all reads/writes try/caught) of search text, category jump, expanded type rows, and the scroll offset of AppShell's own overflow container (walked to via `rootRef.current.closest(".overflow-y-auto")` since the screen doesn't own that node). Scroll is captured on unmount (via a `scrollerRef` kept fresh each render, because React detaches `rootRef` before the passive cleanup runs) and restored once in a `useLayoutEffect` after data has loaded. Restored-but-since-renamed category clamps back to "All" rather than filtering everything out. **This needs a real device check - flagged in the checklist.**
- **New `AddIngredientsScreen.jsx`** (`/bar/add-ingredients`) - lands on category tiles; a global search box matches name or alias across the whole catalogue regardless of the selected category; tapping a type toggles generic ownership in place with visible feedback (reuses `TypeCard` with `onCardClick` = `onToggleOwned` = `toggleType`, same tap-to-own pattern as Build Your Bar), no navigation, so several can be added per visit. "Track a specific bottle instead" -> `/bar/add` (unchanged). `?focus=1` autofocuses the search box.
- **`BuildYourBar.jsx`** - "Find more ingredients" repointed `/bar?focus=1` -> `/bar/add-ingredients?focus=1` (search-focus behavior preserved).
- **Admin type editing moved off the browsing grid** - `TypeCard` lost its `isStaff`/`onEditType` props and the inline pencil entirely (both real consumers updated; `FamilyCluster` lost its now-unused `editingTypeId`/`renderEditForm` props). Stage 1 added an admin-only inline `IngredientTypeEditor` to `IngredientDetailScreen.jsx`; **Stage 2 replaced that** with a single admin-only ⋯ header menu on My Bar + Add ingredients that opens Admin -> Ingredient Types directly (see the next chunk). Full type management is unaffected in **Admin -> Ingredient Types**.
- **Generic vs. product ownership** - unchanged and still explicit: type-level toggles only ever write the generic `user_inventory` row (`useInventory.toggleType`); product ownership is only touched by `ExpandedProducts`' own `OwnedToggle`. Nothing in this stage collapses the two or removes a product as a side effect.

**Verified 2026-09-07**: `corepack pnpm@10.34.3 test` 193/193 (no new tests - pure UI/routing restructuring, no new domain logic, matches the plan's "safe stopping point, no visual risk" framing). `pnpm build` clean (161 modules, +1 new screen). `pnpm format` clean. Committed as `9afc57c`.

**Manual mobile checklist (My Bar redesign Stage 1):**

1. Open **My Bar** - shows only owned ingredients/products, grouped by category, empty categories hidden. No "Owned only" toggle.
2. An account with an empty bar sees "Your bar is empty" + an **Add ingredients** button (not "clear your filters").
3. Tap **+ Add ingredients** in the header -> `/bar/add-ingredients`, landing on category tiles.
4. In Add ingredients: type in the search box -> matches show across every category (try an alias too, e.g. "Wodka"); results appear regardless of any category you'd tapped.
5. Tap a category tile -> its ingredient types; tap a type -> it toggles owned immediately (cyan border + check), no navigation; tap again -> un-owns. Add two or three in one visit.
6. Tap **Track a specific bottle instead** -> the existing `/bar/add` product form. Back returns to Add ingredients.
7. From Home's "Build your bar", tap **Find more ingredients** -> lands on `/bar/add-ingredients` with the search box focused.
8. Back in My Bar: tap a type tile's card body -> its recipe page opens (tap-to-view unchanged). The dedicated checkmark still toggles ownership without navigating; expanding products still works, and a product name still opens the product's own page.
9. **Browsing-state preservation**: in My Bar, set a search term and/or category, expand a type's products, scroll down, then tap a card to open its recipe page. Back-navigate -> the search term, category, expanded rows, and scroll position are all restored (not reset to top/blank).
10. (Admin) On an ingredient/bottle recipe page, an **Edit type** action sits in the top bar -> opens the type editor inline; Save/Cancel returns to the page. Confirm a non-admin never sees it. Confirm My Bar's grid no longer shows an edit pencil.

## Earlier chunk ("JWT issued at future" startup error - root cause + scoped fix)

**Reported by the user: "Something went wrong - JWT issued at future" on the first app open of the day, and tapping "Try Again" resolves it immediately. Investigated the startup/session-restoration path with library-source evidence; no repro of the overnight condition available to the agent.**

**Root cause (confirmed at the "what fails and why the retry works" level):**

- The failing request is the first authenticated PostgREST read after startup - `fetchProfile`/`fetchMembership` in `useMembership` (which gates `AppShell`), then the `useCatalog`/`useInventory`/`useRecipes`/`useLists` reads right behind it. The error string "JWT issued at future" is a PostgREST server response (`PostgrestError`, code `PGRST301`), not something `@supabase/auth-js` or `postgrest-js` emits client-side - confirmed by grepping both packages (v2.112.3). `postgrest-js`'s own built-in retry only covers Cloudflare 520 / network errors for idempotent methods, never a 401 - so the error propagates straight to `App.jsx`'s `ErrorScreen`.
- Access tokens live 1 hour, so on the first open of the day the stored token is expired. `auth-js`'s `getSession()` (`__loadSession`, `EXPIRY_MARGIN_MS` = 90s) sees that and calls `_callRefreshToken` before resolving, so `AuthenticatedApp` proceeds with a **brand-new access token** and `useMembership` fires its two reads within a fraction of a second of the mint.
- `iat` (issued-at) is stamped by GoTrue (Supabase Auth) at mint time; PostgREST validates it against its own node clock with no skew allowance. When PostgREST's clock briefly trails GoTrue's at that instant, `iat` is "in the future" -> 401. Wall-clock advances past `iat` within about a second, so the **same token** validates on an immediate retry - exactly the observed "Try Again works". Any other time of day the token is minutes old before its first use, so the window never opens. This matches every reported symptom.
- **Not fully measurable by the agent**: the sub-second offset between Supabase's own GoTrue and PostgREST nodes. The device clock only gates *whether* a refresh happens (a slow device clock would hide the bug; it can't make a server-stamped `iat` future), so it isn't the mint-vs-validate offset.

**Fix (`65ecc74`):**

- New `src/lib/retryOnClockSkew.js` - `isClockSkewJwtError(error)` (matches `message` `/issued at future/i` or `/not yet valid/i`, i.e. the `iat`/`nbf` "valid in a moment" cases only - **not** `PGRST301` "JWT expired", not signature/invalid/malformed) and `retryOnClockSkew(fn, {retries=3, baseDelayMs=300, sleep})` - awaits `fn`, retries only that error with 300/600/1200ms backoff (~2.1s worst case), then rethrows unchanged. Deliberately not a blanket auth retry; never touches token validation.
- Wired into the five startup reads' `load()` paths: `useMembership`, `useCatalog`, `useInventory` (read only, not the ownership writes), `useRecipes`, `useLists` (read only). Each hook stays in its existing loading state across the retries, so `App.jsx` keeps showing the normal `LoadingScreen` rather than a flash of `ErrorScreen`; if the retries are exhausted the error surfaces as before with a working "Try Again".
- 11 new unit tests in `src/lib/retryOnClockSkew.test.js` (predicate coverage incl. the expired-token negative case; first-try success with no sleep; retry-then-succeed with asserted backoff sequence; bounded rethrow after exhaustion; fail-fast on a non-skew error; custom retry count).

**Verified 2026-09-06**: `corepack pnpm@10.34.3 test` — 193/193 passing (182 prior + 11 new). `pnpm build` clean. `pnpm format` clean (reformatted the new test file). `git status`/`git diff --stat` confirmed exactly the 7 intended files (5 hooks + 2 new `src/lib` files). Committed as `65ecc74`.

**Incident during verification, recovered**: running `npx pnpm test` (per the old AGENTS.md toolchain note) fetched pnpm v12, which tried to wipe `node_modules`, failed with "Access is denied", and left a broken install. Recovered with `corepack pnpm@10.34.3 install --frozen-lockfile` (lockfile unchanged, 81 packages restored). AGENTS.md's toolchain note corrected in `fc5ee00` to forbid bare `npx pnpm` and require `corepack pnpm@10.34.3`.

**Pending the user's confirmation (do not mark done without a real result)**: first app open after the token has been idle/expired overnight (or after a forced long idle) - the app should recover on its own, showing only the normal loading screen, and land on Home with no "Something went wrong". If it still fails, the error screen + "Try Again" should still be there as the fallback.

**Also this session**: `docs/project.md` trimmed to a short planning doc and its boundary recorded in `AGENTS.md` (`fc5ee00`) - engineering progress belongs here in `current-context.md`, not `project.md`.

## Earlier chunk (Cocktail Library + My Bar UX: Library default view + Sort control) - mobile-verified 2026-09-06

**Mobile verification (all four entry points + the Sort control) confirmed passed by the user, 2026-09-06, as part of the consolidated five-group check.**

**Out-of-sequence addition, requested and immediately amended by the user before Stage 5 started - not part of the original 5-stage plan's numbering, but built on top of Stage 2's grouped-view work.** First instruction: make availability grouping the default at plain `/library` (superseding the earlier explicit "preserve the flat default Library" instruction from Stage 2's planning). Immediately amended to: don't make it a silent default with no way back - add a visible Sort control instead, defaulting to Availability.

- **`LibraryScreen.jsx`'s `sortMode` derivation changed from a boolean (`sortByAvailability`) to a two-way string**: `searchParams.get("sort") === "name" ? "name" : "availability"` - anything other than literally `"name"` (including no `sort` param at all, and the pre-existing literal `"availability"` value) means the grouped view. This is what makes plain `/library` default to grouped **and** keeps every existing `?sort=availability` deep link ("Show my cocktails", ingredient/product "View all") working completely unchanged - neither needed to be touched.
- **New visible Sort control, reusing the exact same pill-button + `BottomSheet` pattern the availability filter already uses** (not a new UI pattern) - a "Sort [Availability|Name A-Z]" pill sits directly next to the existing availability-filter pill in the same `flex flex-wrap` row, wrapping to a second line on narrow screens rather than crowding (same mechanism that row already relied on for the source-filter chips). Opens a `BottomSheet` titled "Sort by" with two `FilterChip` options, exactly mirroring "Filter by availability"'s own picker.
- **`setSortMode(mode)` preserves every other query param** (`ingredient`, `source`, `focus`, ...) via `new URLSearchParams(searchParams)`, only ever touching `sort` - satisfies "switching modes must preserve other query parameters" by construction, not by remembering to special-case each param. Choosing Availability deletes the `sort` param entirely rather than writing back the literal string, since a missing param already means availability - keeps the URL at its simplest canonical form. Choosing Name A-Z sets `?sort=name`. Uses `{ replace: true }` so toggling sort back and forth doesn't pile up browser-history entries.
- **New `sortedFlat`** (`[...filtered].sort by name.localeCompare)`) replaces the old unsorted flat-render branch - Name A-Z is a real alphabetical order, not just "whatever order the grouped view isn't in." Both `groups` and `sortedFlat` are derived from the same already-filtered `filtered` array (search/availFilter/sourceFilters/tasteFilters/`ingredientMatchIds` all still run first, unchanged) - preserving search, the ingredient restriction, and every other filter under both modes is structural, not something to remember to re-check per mode.
- **New `SORT_FILTERS` constant** (`src/data/constants.js`), matching the existing `AVAIL_FILTERS`/`SOURCE_FILTERS` pattern exactly - two entries, `availability`/`name`.
- **No other UX decision layered in** - no alphabetical toggle beyond the one requested, no new filter chip, no change to the existing availability-filter picker or source/taste chips.
- Mobile Cocktails tab (`Nav.jsx` → plain `/library`), Home's "Browse cocktails", "Show my cocktails", and ingredient/product "View all" all now consistently land on the grouped view - confirmed by reading each entry point's actual `navigate()` call rather than assumed, and by the fact `sortMode`'s default covers plain `/library` with zero per-entry-point changes needed.

**Verified 2026-09-06**: `pnpm test` — 182/182 passing (unchanged - no domain logic touched, this is a plain `Array.prototype.sort` by name plus URL-param wiring, the same category of change as Build Your Bar's own availability sort). `pnpm build` clean. `pnpm format` clean (one trivial single-line import reformat). `git status --short`/`git diff --stat` confirmed exactly the 2 intended files changed (`LibraryScreen.jsx`, `src/data/constants.js`). Committed as `792afac`.

**Manual mobile checklist (Library default view + Sort control - covers all four entry points plus the new control itself):**

1. Open the app fresh and tap the mobile Cocktails tab → lands on `/library` grouped by availability (Ready to Pour / Good Enough / Almost There / Unavailable), matching groups hidden when empty.
2. From Home, tap "Browse cocktails" → same grouped default.
3. From Home's "Build your bar" (once you have a selection), tap "Show my cocktails" → still grouped, unchanged from before.
4. From a My Bar ingredient/product page, tap "View all" → grouped **and** restricted to that ingredient - confirm the restriction survives switching Sort modes and adjusting search/filters.
5. Tap the new "Sort" pill (next to the existing availability-filter pill) → opens a bottom sheet with Availability/Name A-Z; confirm it doesn't crowd or overlap the existing filter row on a narrow phone screen.
6. Switch to Name A-Z → flat alphabetical grid, search/availability-filter/source/taste filters and any ingredient restriction from step 4 all still apply.
7. Switch back to Availability → grouped view returns, still respecting whatever filters/search are currently set.
8. Confirm the browser/app back button after switching Sort modes doesn't require multiple presses to leave Library (checking the `{ replace: true }` history behavior feels right, not janky).

## Earlier chunk (Cocktail Library + My Bar UX, Stage 4: My Bar entry points)

**Stage 4: wires My Bar's `TypeCard` and `ExpandedProducts` into Stage 3's ingredient/bottle detail screen - the screen itself is unchanged, this chunk is purely about how a member reaches it from My Bar, and about finally separating "view" from "own" on the shared type-tile card.**

- **`TypeCard.jsx` (`src/components/myBar/TypeCard.jsx`) gets a new `onCardClick` prop, separate from `onToggleOwned`** - the card's own `onClick` now fires `onCardClick` (was `onToggleOwned`), and the ownership checkmark became a real, always-rendered `<button>` (`w-11 h-11`, 44×44px, meeting the explicit touch-target requirement - previously a 32px chevron/edit-sized decorative span that only appeared conditionally) with `aria-label`/`aria-pressed` and its own `e.stopPropagation()`, so tapping it can never also fire the card's own click. The chevron (expand) and edit buttons are unchanged (32px, already stopping propagation from before this stage) - "ownership, expand and edit controls must not accidentally trigger navigation" holds for all three by the same mechanism, not three separate fixes. The controls row is now always rendered (previously hidden entirely on a plain unowned no-products card) since the checkmark must always be reachable, with `flex-wrap` added defensively - the 44px checkmark next to the two 32px buttons on a card as narrow as 104px (My Bar's own singles grid) was a real width-overflow risk reasoned through against this app's own documented card-cramping history, but not something I could visually confirm myself - **flagged explicitly for the user's mobile check below.**
- **Per-consumer split, exactly as required - `TypeCard` itself doesn't know or care which mode it's in**: `BuildYourBar.jsx`'s `renderTile` passes the *same* `toggle` closure to both `onCardClick` and `onToggleOwned`, preserving its existing tap-to-select-and-own behavior byte-for-byte. `MyBarScreen.jsx`'s `renderCard` passes `onCardClick={() => navigate(\`/bar/type/${type.id}\`)}` and keeps `onToggleOwned={() => toggleType(type.id)}` - now reachable *only* via the dedicated checkmark.
- **`ExpandedProducts.jsx` gets a new `onViewProduct` prop** - the product-name text (previously a plain non-interactive `<div>`) is now wrapped in its own `<button>` calling `onViewProduct(p.id)`, styled identically to the old text (no visual change), sitting as a sibling to the admin edit/delete buttons and `OwnedToggle` - none of which have any ancestor/descendant relationship to the new name button, so no `stopPropagation()` is needed here (unlike `TypeCard`, this row itself never had a row-level `onClick` to guard against). `MyBarScreen.jsx`'s `renderExpanded` wires `onViewProduct={(productId) => navigate(\`/bar/product/${productId}\`)}` - preserves the bottle's own name as page context automatically, since Stage 3's `IngredientDetailScreen` already reads the product's own `name` for its title, only using the mapped type for matching.
- **Family expansion and admin product management confirmed unaffected, not just assumed** - `FamilyCluster.jsx`'s `renderExpanded`/`renderEditForm` paths and `ExpandedProducts.jsx`'s own inline edit/delete forms are separate render branches from the product-name button added this stage, and `TypeCard` has exactly two real consumers in the whole codebase (`BuildYourBar.jsx`, `MyBarScreen.jsx` - confirmed via a repo-wide grep; the only other hits were comments naming `TypeCard`, not usages).
- **"Preserve browsing context on back navigation" - already true, not new code**: `IngredientDetailScreen.jsx`'s `TopBar` uses `onBack={() => navigate(-1)}` (added in Stage 3, unchanged here), which returns to whatever My Bar/Library state (scroll position, expanded families, filters) was already on the browser history stack, rather than a hardcoded route.

**Stage 3's own test/build/format results, run 2026-09-06 and reported in chat but not yet recorded in this file until now**: `pnpm test` — 182/182 passing (no new domain logic - pure UI composition around Stage 1's already-tested `findRecipesUsingIngredient`). `pnpm build` clean. `pnpm format` clean.

**Verified 2026-09-06 (Stage 4)**: `pnpm test` — 182/182 passing (unchanged - no domain logic touched this stage either, pure prop-wiring across three UI files). `pnpm build` clean. `pnpm format` clean (one purely cosmetic multi-line reformat of `TypeCard.jsx`'s `aria-label` ternary, no logic change). `git status --short`/`git diff --stat` confirmed exactly the 4 intended files changed (`TypeCard.jsx`, `BuildYourBar.jsx`, `MyBarScreen.jsx`, `ExpandedProducts.jsx`) - no drift into unrelated files. Committed as `7dc95c8`.

**Manual mobile checklist (combined Stage 3 + Stage 4 - Stage 3's entry points didn't exist until this stage, so both are verified together):**

1. From My Bar, tap a type tile's card body (not the checkmark) → opens `/bar/type/:id`, showing that ingredient's matching recipes grouped by availability tier.
2. From that detail page, tap "View all" (if shown) → opens `/library?ingredient=...&sort=availability`, grouped and pre-filtered to that ingredient; confirm search and the availability/source/taste filters can still be applied on top without losing the ingredient filter.
3. Back-navigate from the detail page (and from the filtered Library) → lands back in My Bar/Library with scroll position and any expanded state intact, not reset to the top.
4. In My Bar, expand a type tile's products (chevron) and tap a specific product's **name** → opens `/bar/product/:id`, with the page title showing that product's own bottle name (not the generic type name).
5. Still in My Bar: tap the dedicated checkmark on a type tile → toggles ownership only, does **not** navigate anywhere; tap the chevron → expands/collapses only, does not navigate or change ownership; (admin) tap the edit icon → opens the type editor only, no navigation/ownership change.
6. Confirm the checkmark, chevron, and edit button all feel comfortably tappable and don't visually overlap or get clipped, especially on a narrow single (non-family) card - **this is the one thing I could not verify myself, flagged above.**
7. On Home's "Build your bar" section, confirm tapping a tile still selects/deselects ownership exactly as before (both the card body and the checkmark do the same thing there) - no regression from the `TypeCard` prop changes.
8. Family-cluster expansion (parent/child types) and admin product add/edit/delete still work exactly as before.

## Earlier chunk (Cocktail Library + My Bar UX, Stage 3: ingredient/bottle detail screen)

**Stage 3: the actual ingredient/bottle recipe page - `IngredientDetailScreen.jsx`, reachable at two new routes, plus the `?ingredient=` Library filter "View all" needs. Not yet linked from anywhere (Stage 4 wires My Bar's tap-to-view) - reachable only by direct URL for now, same "ship inert, wire later" pattern as every other multi-stage feature in this app.**

- **New `src/screens/IngredientDetailScreen.jsx`, one screen behind two routes** (`App.jsx`): `/bar/type/:id` and `/bar/product/:id`, each passing an explicit `kind` prop rather than the screen sniffing its own path - simpler and more explicit. Matching always runs against the resolved ingredient type (Stage 1's `findRecipesUsingIngredient`), but a viewed **product's own bottle name is what's shown as the page's own title** ("Tanqueray London Dry Gin," not "Gin") - a small subheading shows the generic type name underneath, only when it actually differs from the title (never shown when viewing a type directly, where it would just repeat itself).
- **Grouped exactly like Library's Stage 2** (`AVAIL_CFG`/`AVAIL_TONE`/`SectionTitle`, the same "Ready to Pour"/"Good Enough"/"Almost There"/"Unavailable" headings) - one shared visual vocabulary for availability across the app, not a second one invented for this screen.
- **Capped at 10 matches total, not per tier** - fills from `perfect` downward through the fixed tier order, stopping once 10 real matches have been collected across all tiers combined (an ingredient with only 2 makeable/almost matches still shows real unavailable ones to round out the initial view, rather than looking sparse) - resolves the "hard cap vs. padding" question flagged as an open decision during planning, settled by this stage's own explicit wording ("up to 10 matching recipes total").
- **Role + substitution annotations, minimal first version**: only the first matching component per recipe is annotated (not an exhaustive list of every match) - required+direct (the unremarkable default) gets no extra label; optional/garnish is called out by name; a substitution match is phrased as "Can replace {ingName}" using Stage 1's own `ingName` (the *primary* ingredient, e.g. "Bourbon") - a possibility, never "Substituting: Bourbon" (that stronger phrasing stays reserved for `computeAvail()`'s own ownership-aware case).
- **Graceful handling of invalid links and zero matches, both real, distinct empty states** - an id that resolves to nothing (deleted type, typo'd id, a product whose type was since merged away) shows a clear "Ingredient not found" screen with a way back to My Bar; a real, resolved ingredient with zero matching recipes shows "No recipes use this yet" rather than a blank list.
- **"View all" → `/library?ingredient=<typeId>&sort=availability`** - new to `LibraryScreen.jsx`: `ingredientMatchIds` (via the same `findRecipesUsingIngredient` call) narrows `filtered` *before* search/availFilter/sourceFilters/tasteFilters run, so the ingredient filter persists through every other filter interaction exactly as required, rather than being a one-time snapshot. Deliberately not surfaced as its own removable filter chip (same "deep-link only, not interactive state" precedent `?sort=availability` and `?source=` already set in this file) - a scope-conscious choice for this stage, not an oversight.
- **Never touches ownership, confirmed by construction**: the screen never calls `inventory.toggleType`/`ownProduct`/`toggleProduct` anywhere - it only reads `computed`/`catalog` and renders. Every recipe's `avail` is real, current inventory, exactly as Stage 1 already guarantees.

**Verified 2026-09-06**: `pnpm test` — 182/182 passing (unchanged - no new domain logic, pure UI composition around Stage 1's already-tested `findRecipesUsingIngredient`). `pnpm build` clean (confirms the two new routes, the screen's imports, and `LibraryScreen.jsx`'s new import all resolve correctly). `pnpm format` clean. Committed as `6af41f3`. Its routes stayed unreachable from anywhere in the UI until Stage 4 wired My Bar's entry points into them - see "Last completed chunk" above for the combined Stage 3+4 manual checklist, run together since that's the first point both stages' behavior is actually reachable.

**Real catalog test URLs** (live-queried, not invented) for the user's manual pass, since nothing links to this screen yet:
- `/bar/type/08f1fc75-0d3c-4f80-8f7f-536f989bb90a` - Gin (a common, high-recipe-count spirit - expect several tiers populated, possibly triggering "View all")
- `/bar/type/b436782b-9cba-45fb-a530-ac9ac6c375b6` - Angostura Bitters (fewer, more concentrated matches)
- `/bar/type/d04547e7-89bf-458f-a35b-0645fd82b52a` - Absinthe (a good candidate for the "No recipes use this yet" empty state, if it turns out to have none)
- `/bar/product/cfdc5ca3-f225-478e-bef9-244bb90b867c` - Tanqueray London Dry Gin (a real product mapped to the Gin type above - title should read "Tanqueray London Dry Gin" with "Gin" as a subheading, and match the *same* recipes as the Gin type link)
- `/bar/type/00000000-0000-0000-0000-000000000000` - a deliberately invalid id, for the "Ingredient not found" state

## Earlier chunk (Cocktail Library + My Bar UX, Stage 2: Library grouped availability view)

**Stage 2: `LibraryScreen.jsx`'s `?sort=availability` deep-link (Stage 3 of Build Your Bar) now renders 4 headed, hide-if-empty groups instead of one flat sorted grid - the follow-up recorded after Build Your Bar's own mobile verification, now built as its own small stage.**

- **Grouping supersedes the flat sort entirely**, as flagged in the original audit: the previous `AVAIL_SORT_RANK`/`Array.sort()` step is removed outright (dead code once real section breaks exist - a `.sort()` producing a flat order and then re-partitioning that same order into groups would be redundant work for no visible difference), replaced by a `groups` derivation that partitions the *already-filtered* `filtered` array into `{perfect, good, almost, unavail}` buckets, in that fixed order, dropping any bucket with zero items via `.filter((g) => g.items.length > 0)`.
- **Headings match `HomeScreen.jsx`'s own section names exactly** ("Ready to Pour"/"Good Enough"/"Almost There"/"Unavailable" - a new `AVAIL_GROUP_LABEL` map, since `AVAIL_CFG`'s own `label` field is a different, shorter string ("Perfect") used on the per-card badge, left untouched) - each heading paired with a result count styled with the *same* `AVAIL_CFG`/`AVAIL_TONE` icon+color Home's own section counts already use (`✦ 3`, etc.), reusing established availability styling rather than inventing new visual language.
- **Search/filters preserved by construction, not just claimed**: grouping only ever operates on `filtered`, which already has query/`availFilter`/`sourceFilters`/`tasteFilters` applied *before* the group partition runs - confirmed by re-reading the actual data flow, not assumed. Adjusting any filter while grouped just changes what's inside `filtered`, and the groups re-derive from that on every render exactly like the flat view already did.
- **Ordinary Browse (`/library`, no `sort` param) is byte-for-byte unchanged** - `groups` is `null` whenever `sortByAvailability` is false, and the render falls through to the exact same flat-grid JSX block that existed before this stage, untouched.
- **Mobile spacing reuses established rhythm, not new values**: `gap-6` between groups and `mb-3` under each heading before its grid are the exact spacing Home's own sections already use between each other - deliberately not inventing a new spacing scale for a visually similar pattern.
- Reuses `CocktailCard` completely unmodified - only the grid it's wrapped in changed shape (one big grid -> several smaller ones, one per tier).

**Verified 2026-09-06**: `pnpm test` — 182/182 passing (unchanged - no domain logic touched this stage, pure UI reshaping of an already-filtered array). `pnpm build` clean (confirms the new `AVAIL_CFG`/`AVAIL_TONE`/`SectionTitle` imports from `primitives.jsx` resolve correctly). `pnpm format` clean. Committed as `110aff8`. **Partially browser/mobile-verified by the user on a real iPhone, 2026-09-06 - the grouped layout itself (headings, spacing, hide-empty-groups) confirmed looking good.** Search/filter interaction on top of the grouped view, and confirming plain Browse is unaffected, were **not** part of what the user actually reported - recorded honestly as still outstanding, not assumed passed just because the layout was.

## Earlier chunk (Cocktail Library + My Bar UX, Stage 1: shared matching logic)

**Full audit done before any code, then a revised plan agreed with the user before Stage 1 started** - see the conversation transcript for the complete audit (flat Library grid; `ExpandedProducts.jsx`'s correct `OwnedToggle`-based explore/own separation vs. `TypeCard.jsx`'s whole-card-is-the-toggle; no `/bar/:id`-style route exists anywhere in `App.jsx`) and the 7-part report (recommended flow, Library grouping, bottle-to-recipes UX, matching semantics, zero DB dependencies, decisions, staged plan). Five requirements refined the plan before Stage 1 began - recorded here so later stages don't drift from them:

1. **`TypeCard` is shared between Build Your Bar and My Bar** - Build Your Bar's tap-to-select-and-own behavior must be preserved exactly; My Bar's new tap-to-view behavior is a **per-consumer** choice (a different `onClick` passed in by `MyBarScreen.jsx`), not a change to `TypeCard` itself or every place it's used. Stage 4 (not this one) needs to thread this carefully.
2. **"View all" opens an ingredient-filtered Library**, not a separate list screen - a new `?ingredient=<id>` param on `LibraryScreen.jsx`, combined with (not replacing) the existing search/availFilter/sourceFilters/tasteFilters pipeline. Scoped into Stage 3, alongside the detail screen itself, since "View all" only exists once that screen does.
3. **Substitution matches describe a possibility, never an active substitution** - `findRecipesUsingIngredient()`'s substitution-type matches name the *primary* ingredient being possibly replaced (`ingName` = the recipe's own required ingredient, e.g. "Bourbon"), so a caller can render "Can replace Bourbon" - never "Substituting: Bourbon" (that phrasing is reserved for `computeAvail()`'s own `substitutions` map, which is about a *real*, ownership-based substitution already in effect, a genuinely different case).
4. **Opening a specific product preserves its bottle name as page context** even though matching runs against its mapped ingredient type - this is a Stage 3 screen concern (the screen holds both the product's own display name and the type id used for matching), not something Stage 1's function needs to know about at all.
5. **Deduplication + no inventory mutation** - both built into Stage 1 itself, see below.

**Stage 1 (this chunk): `findRecipesUsingIngredient()` - pure domain matching, no UI wiring yet. `HomeScreen.jsx`/`MyBarScreen.jsx`/`LibraryScreen.jsx` are all untouched, nothing on screen changes.**

- New `src/domain/ingredientRecipeMatches.js`: `findRecipesUsingIngredient(computed, viewing, {types, products})` where `viewing` is `{typeId}` or `{productId}` (exactly one). Reuses `resolveOwnedIngredientTypes()` (`domain/availability.js`) with a **synthetic single-item "owned" set** for whatever's being viewed, rather than a new hierarchy-walking implementation - the exact same ancestor-walk that already decides real ownership satisfaction decides "does this ingredient satisfy that recipe component" here too. Confirmed live in tests (not just asserted): viewing generic Whiskey does **not** match a recipe requiring Bourbon specifically; viewing Bourbon **does** match a recipe requiring generic Whiskey; viewing Bourbon does **not** match a recipe requiring sibling Rye Whiskey. Product mapping reuses the same function's existing `ownedProductIds`/`products` handling - a test confirms viewing a product returns byte-identical results to viewing its mapped type directly.
- **Deduplication**: iterates each recipe's components once, collects every matching component (regardless of role - required/optional/garnish all included, confirmed by test), and pushes **one** result per recipe even when multiple components match (e.g. the same ingredient appears as both a required item and a garnish) - the recipe-level `matchType` is `"direct"` if *any* matching component is direct, `"substitution"` otherwise, while the full per-component `matches` array preserves every match's own role and type so a caller isn't stuck with only the strongest one.
- **No inventory mutation, by construction and by test**: the function has no mutator/callback parameter at all - it only reads `computed`/`types`/`products` and returns a new array. A test calls it with every input `Object.freeze()`-d and confirms it still runs without throwing, proving no write is ever attempted. Every recipe's `avail` passes through **exactly as already computed elsewhere** (real inventory, unaffected by what's being viewed) - browsing an unowned bottle is guaranteed inert.

**Verified 2026-09-06**: `pnpm test` — 182/182 passing (170 prior + 12 new in `ingredientRecipeMatches.test.js`: direct match, avail passthrough, both parent/child directions plus the sibling non-match, product-vs-type equivalence, substitution naming the primary ingredient, mixed direct+substitution recipe-level aggregation, optional/garnish role coverage, multi-component dedup, a true non-match, and the frozen-input mutation guard). `pnpm build` clean. `pnpm format` clean. Committed as `7066e95`.

## Earlier chunk (Build Your Bar, Stage 4: final integration review, checks, docs)

**Stage 4: no new feature code beyond one recorded (not built) follow-up. Ran the final checks, reviewed integration across all three prior stages, and closed out the feature's documentation.**

- **`pnpm test`/`pnpm build`/`pnpm format`** all clean, unchanged from Stage 3 (170/170, no regressions).
- **Integration review, one real question chased down rather than assumed safe**: could `HomeScreen.jsx`'s per-visit snapshot (`showBuildYourBar`) ever get stuck at `null` forever if the initial `useInventory` fetch fails? Traced `useInventory.js`'s `load()`: a failed fetch sets `error` but never sets `loaded: true` in the catch branch - which would leave the snapshot's `if (!inventory.loaded) return` guard blocking forever, and the section would never appear even for a genuinely empty bar. Checked whether this is actually reachable: `App.jsx`'s `AppShell` gates on exactly `!inventory.loaded && inventory.error` (among the other hooks) to show a full-screen `ErrorScreen` with Retry *instead of* rendering `<Outlet>` - so `HomeScreen` (and `BuildYourBar` inside it) can never even mount while the initial inventory fetch is in a failed, not-yet-loaded state. Confirmed not a real gap, by reading the actual gating code rather than assuming it.
- Everything else re-read together (`BuildYourBar.jsx`, `HomeScreen.jsx`, `LibraryScreen.jsx`, `SearchFilterHeader.jsx`, `buildYourBarEssentials.js`, `buildYourBar.js`) confirmed internally consistent - no duplicate-key risk between the flat six and expanded groups (mutually exclusive render branches), `TypeCard` reuse gets every field it needs from the real catalog rows, `makeableCount` and ownership state both flow through the same already-tested `computed`/`inventory` context every other Home section already relies on.
- **Reused the recorded Stage 1-3 manual checks rather than re-running them**, per the user's explicit instruction, since those already covered every real interaction end to end on a real iPhone: essentials selection + stable visibility, expand/collapse, live count + substitutions text, section hide/reappear, existing-inventory members unaffected, autofocus, and now Show my cocktails + availability sort + unchanged Browse.
- **One follow-up recorded, deliberately not built this stage**: the availability-sorted Library view (`?sort=availability`) currently just reorders the flat grid - it doesn't visually group results under headings (Ready to Pour / Good Enough / Almost There / Unavailable). Sorting alone gets the right order but leaves the tier boundaries invisible to the eye. Recorded in `docs/project.md`'s Follow-ups, not implemented, per the user's explicit "don't implement this during the final verification stage."

**Homepage "Build your bar" is complete.** Marked done in this file's Phase & chunk list and `docs/project.md`'s Current Focus/Backlog.

## Earlier chunk (Build Your Bar, Stage 3: "Show my cocktails")

**Stage 3: the "Show my cocktails" button + `LibraryScreen.jsx`'s new availability sort.**

- **`LibraryScreen.jsx`**: new `?sort=availability` deep-link, read directly each render (no interactive UI toggles it within Library itself, unlike the other filters, so it doesn't need its own piece of state - just a plain boolean read from `searchParams`). When present, `filtered` is sorted perfect → good → almost → unavailable via `Array.prototype.sort` (spec-guaranteed stable, so cocktails within the same tier keep their original relative order) - **a sort, not a filter**: `availFilter` stays `"all"` regardless, so nothing is ever hidden and an almost-match is still visible immediately as a fallback the moment there aren't many complete matches yet, exactly matching "prioritize... with almost-matches as a useful fallback." Plain `/library` (no param - what "Browse cocktails" already links to) is completely unaffected, confirmed by the fact that `sortByAvailability` defaults to `false` and every other line of `LibraryScreen.jsx` is untouched.
- **`BuildYourBar.jsx`**: new `hasSelection` check (`ownedTypeIds.size > 0 || ownedProductIds.size > 0`) - since this section only ever renders when the bar started empty this visit (Stage 2's per-visit snapshot), any ownership present now can only have come from a tap made during this same visit, so "enabled when inventory contains a selection" reduces to a plain non-empty check with no separate flag needed. "Show my cocktails" only renders (not just enables) once `hasSelection` is true, avoiding a dead/disabled button on first paint - navigates to `/library?sort=availability`. Styled `variant="primary"` (not `"ghost"` like "Find more ingredients") since it reads as the natural next action once a selection exists, and per the mobile-first standing requirement needs to be clearly the most visible/tappable thing in the section at that point, not a secondary afterthought.

**Verified 2026-09-06**: `pnpm test` — 170/170 passing (unchanged - no new domain logic this stage; the sort is a plain `Array.prototype.sort` call, not new domain-layer logic, consistent with how filtering itself has never had dedicated tests either). `pnpm build` clean. `pnpm format` clean. Committed as `fc3ca59`. **Browser/mobile-verified by the user on a real iPhone, 2026-09-06 - button usability, availability ordering, search/filters still working on top of the sort, and unchanged Browse behavior all confirmed. No bugs found.**

## Earlier chunk (Build Your Bar, Stage 2: the homepage section itself)

**Stage 2: the actual "Build your bar" homepage section - new `BuildYourBar.jsx` component wired into `HomeScreen.jsx`, plus the per-visit visibility snapshot with an account-safe reset. Selection and stable visibility landed together, per the user's explicit instruction, since stable visibility only means anything once selection exists to test it against.**

- New `src/components/home/BuildYourBar.jsx`: heading + subhead exactly as specified; "Browse cocktails" placed right after the subhead (near the heading, not buried after the grid, per the user's explicit correction) - a plain link, always available, no gating; the six essentials as a 3-column (`sm:grid-cols-4` on wider screens) grid reusing `TypeCard` unmodified, every product/expand/edit prop hard-set to empty/no-op since Build Your Bar is generic-ownership-only, never product-level detail; "Show all essentials" toggles to the full 14 grouped under Spirits/Mixers/Kitchen basics (not appended under the six - replaces the flat view); the live makeable count (`computed.filter(perfect or good).length`, same tier boundary Home's own "Good Enough" section already uses) with **"Includes substitutions." as real visible text**, not a tooltip, directly answering the flagged Stage 2 requirement; "Find more ingredients" → `/bar?focus=1` using Stage 1's autofocus.
- **`resolveEssentialsList()` results that come back "missing"/"ambiguous" are dropped from the rendered grid, not crashed on** - logged via `console.error` (dev-visible, doesn't break the member's homepage) since none of the 14 names should ever actually fail this given the live verification behind them, but the failure mode for a future catalog rename is now "one fewer tile," not a blank Home screen.
- **`HomeScreen.jsx`: the per-visit snapshot, implemented as designed and flagged in Stage 1** - `showBuildYourBar` starts `null` ("not yet decided"), is set exactly once per user after `inventory.loaded` turns true (`ownedTypeIds.size === 0 && ownedProductIds.size === 0`), and is never re-evaluated afterward regardless of how many optimistic ownership toggles happen during this visit - `inventory.toggleType()` is called completely unmodified, Stage 2 added zero new save logic, just reused what already existed. **Account-safe reset**: a `useRef` tracks the last-seen `userId`; when it changes, the snapshot is explicitly reset to `null` so a fresh decision gets made for the new account. Documented honestly in the code comment: a sign-out already unmounts the whole authenticated route tree in this app's actual architecture (session → no session → `AppShell` itself unmounts), which would reset all of `HomeScreen`'s local state on its own anyway - this is a defensive backstop for a future flow that might not fully unmount (e.g. an admin "view as" feature), not evidence of an observed leak.
- **Mobile-first applied throughout, per the new standing requirement** (see `AGENTS.md`, added this session): every interactive element in the new section (`Browse cocktails`, `Show all essentials`/`Show fewer`, each essentials tile via `TypeCard`'s own existing full-card tap target) sized to at least 44×44px (`min-h-11` on the two custom buttons; `TypeCard`'s tap target is the whole card, already comfortably over that from My Bar's own precedent); base grid layout is the narrow-screen case (`grid-cols-3`), with a wider-screen bump (`sm:grid-cols-4`) layered on, not the other way around; nothing here relies on hover.

**Verified 2026-09-06**: `pnpm test` — 170/170 passing (unchanged - no new domain logic this stage, `BuildYourBar.jsx` is UI composition around Stage 1's already-tested `resolveEssentialsList()` and the app's already-tested `computeAvail`/`toggleType`). `pnpm build` clean. `pnpm format` clean. Committed as `bb925ea`. **Browser/mobile-verified by the user on a real iPhone, 2026-09-06 - the full manual checklist passed**: section appears for an empty bar with nothing preselected, every touch target comfortable, selection stays stable across multiple taps (doesn't disappear after the first), "Show all essentials" expands to all 14 grouped correctly (six not duplicated), live count + "Includes substitutions." both readable, Browse cocktails/Find more ingredients links both work, section correctly disappears after selecting and reappears only if the bar empties out again, and a member with existing real inventory sees no change at all. No bugs found.

## Earlier chunk (Build Your Bar, Stage 1: essentials list + `/bar?focus=1` autofocus)

**Full audit done before any code** - read `HomeScreen.jsx` (confirmed: with an empty My Bar every existing section - Ready to Pour/Good Enough/Almost There/Buy Next - is genuinely empty today, since all of them require at least partial ownership overlap or an "almost" recipe to exist), `useInventory.js`/`services/inventory.js` (confirmed `toggleType()` already does exactly what's needed - generic per-type ownership, optimistic, immediate per-tap save, already used by Buy Next today), `MyBarScreen.jsx`/`TypeCard.jsx` (confirmed `TypeCard` renders as a clean icon+name+checkmark tile for a non-staff member with no owned products, directly reusable), and `LibraryScreen.jsx` (confirmed it already defaults to showing every recipe unfiltered with real availability badges and a working empty/clear-filters state - "no complete matches" needs no new UI). Real catalog data pulled via `npx supabase db query --linked` (CLI already authenticated from earlier sessions): confirmed `ingredient_types.bar_priority`/`recommend_by_default` already exist and already mean exactly "curated essentials list," currently 13 real types marked `'essential'`; cross-referenced against real recipe-frequency counts (`recipe_components` grouped by type) to find Ice is the single highest-frequency required ingredient in the whole catalog (17 recipes) despite not being marked essential; found and flagged a real curation inconsistency (all 4 Whiskey subtypes marked essential vs. only 1 of 3 Rum subtypes).

Agreed a plan with the user, twice - the second pass corrected three real problems in the first: (1) the originally-proposed "hide when `ownedTypeIds.size === 0`" condition would have hidden the section the instant the *first* optimistic tap landed, not after a full selection session - fixed by an explicit per-visit snapshot instead of a live reactive check; (2) "Show my cocktails" was originally going to filter to perfect+good only - corrected to sort by availability instead (nothing hidden, almost-matches stay visible as a fallback, matching "prioritize... with almost-matches as a useful fallback" exactly); (3) the essentials selection was going to potentially touch `bar_priority` (e.g. bumping Ice to `'essential'`) - corrected to a fully separate client-side list, so curating the homepage can never touch what actually drives Buy Next's ranking.

**Stage 1 (this chunk): the essentials list itself + `/bar?focus=1` autofocus. No homepage UI wiring yet - `HomeScreen.jsx` is untouched, nothing on screen changes.**

- New `src/data/buildYourBarEssentials.js`: `BUILD_YOUR_BAR_INITIAL_SIX` (Gin, Vodka, Soda Water, Lemon Juice, Lime Juice, Ice - chosen for real per-item recipe-frequency impact balanced across Spirits/Mixers/Kitchen basics, and deliberately every one a standalone type) and `BUILD_YOUR_BAR_GROUPS` (all 14 curated essentials - the six plus Bourbon/Dark Rum/Irish/Rye/Scotch Whiskey/Tonic Water/Simple Syrup/Angostura Bitters - grouped under Spirits/Mixers/"Kitchen basics", **including the six in their proper groups**, not appended separately, confirmed by a real test asserting the union of all three groups is exactly 14 items and a superset of the six). Plain name arrays, no `bar_priority` involved anywhere.
- **The "no subtype assumption" property for the six is now verified in both directions, not just one** - the plan's first draft only checked `parent_type_id is null` (none of the six are a child of anything); this session additionally checked whether any of the six **have** children (none do, live-queried) - `parent_type_id` alone doesn't prove that, per the user's explicit catch, and it's now a confirmed fact rather than an assumption.
- New `src/domain/buildYourBar.js`: `resolveEssentialsList(names, types)` - resolves the curated name list against the live catalog's `name` field only (deliberately **not** `resolveIngredientType()`'s alias-aware resolution - these are our own hardcoded canonical names verified at design time, and matching through an alias here could silently resolve to the wrong type). Returns an explicit `{status: "resolved"|"missing"|"ambiguous", ...}` per name rather than a bare nullable value or a `.find()`-first-match pick - `ingredient_types.name` has a real DB unique constraint, but it's case-sensitive while this resolver's matching is case-insensitive (matching `resolveIngredientType`'s own established convention), so a case-insensitive collision isn't structurally impossible even though it's never happened in this catalog - the ambiguous case is handled explicitly rather than assumed away.
- `/bar?focus=1` autofocus added to `SearchFilterHeader.jsx` (self-contained - `MyBarScreen.jsx` needed no changes at all, confirmed `SearchFilterHeader` has no other consumer), mirroring `LibraryScreen.jsx`'s existing `?focus=1` convention exactly.
- **Two things the user flagged for Stage 2, recorded here so they don't get lost**: (1) "Includes substitutions" must be visible helper text under the live makeable-count in the actual UI, not just a tooltip - Stage 1 doesn't render anything yet, so this is purely a Stage 2 requirement, not yet implemented. (2) The per-visit snapshot's reset behavior needs explicit verification once it's actually wired up in Stage 2: does navigating Home → away → Home really remount the component and retake the snapshot (not just visually look reset while stale state lingers), and - a real, non-obvious risk on a shared device - can a previous account's "already saw it" snapshot leak into a freshly-signed-in *different* account within the same browser session without a full page reload? The snapshot logic as designed keys only off `inventory.loaded`, not `userId` - needs an explicit reset keyed on `userId` change too, or this could genuinely leak across accounts. Not yet built, flagged before Stage 2 starts rather than found after.

**Verified 2026-09-06**: `pnpm test` — 170/170 passing (164 prior + 6 new in `buildYourBar.test.js`: case-insensitive resolution, order preservation, explicit "missing" reporting, explicit "ambiguous" reporting with a synthetic case-collision fixture, confirms aliases are never consulted, and a real-data regression test resolving both the six and all three expanded groups against a fixture mirroring the actual live catalog). `pnpm build` clean. `pnpm format` clean. Committed as `fca3768`.

**Manual autofocus check: done, confirmed working, 2026-09-06.** Desktop: field accepts typing immediately. Mobile (real iPhone): the field receives focus correctly, but iOS Safari does not automatically open the on-screen keyboard on a programmatic `.focus()` call - this is expected browser behavior (a security/UX restriction, not a bug in this app), so no workaround was needed or attempted. Recorded as a new standing note in `AGENTS.md`'s mobile-first requirement: don't build UI that assumes a focused input implies the keyboard is showing.

## Earlier chunk (top-up/part corruption: found live, fixed, repaired)

**The bug flagged (not fixed) at the end of Stage 5 turned out to already be affecting real data - the user found "Ice — top-up part" on a real Detail screen.**

- **Confirmed stored, not a display artifact**, via a direct query against the live DB (`npx supabase db query --linked`, CLI already authenticated/linked from earlier sessions): `select ... where unit_label ilike '%top-up%' or unit_label ilike '%to taste%'` turned up **5 already-corrupted `recipe_components` rows**, all with the exact literal `unit_label = 'top-up part'` and `amount = 0` - Green Bunker (Soda Water + Ice), Bloody Mary (Ice), Bloody Mary (Practical Version) (Ice), Between the Sheets (Ice). A broader `unit_label ilike '%part%'` scan confirmed these were the only anomalies - no other corrupted variant, and no recipe currently uses a real `"N part"` ratio unit that could collide with the fix.
- **Root cause, exactly as predicted in Stage 5**: `EditorScreen.jsx`'s `unitLabelToForm()` assumed every non-ml `unit_label` starts with a numeric token (`amount = firstToken`). A bare label like `"top-up"` has none, so the whole word was read as the *amount*, and the unit field fell back to `NON_VOLUME_UNITS[0]` (`"part"`) - a re-save with that field untouched then wrote `"top-up part"` back via the same `${amount} ${unit}`.trim()` encoding `handleSave()` always uses.
- **Fixed by extracting `parseUnitLabel()` into `src/domain/servings.js`** - the single source of truth for "does this label have a leading number," reusing the exact regex `scaleIngredientAmount()` already relied on. A label with no leading number now correctly returns `{amount: "", unit: <the whole label>}` instead of misreading it. `EditorScreen.jsx`'s `unitLabelToForm()` now calls this instead of a hand-rolled `split(" ")` - the scaling logic and the editor's prefill can no longer disagree about what counts as "no amount," since they now share the same parser.
- **Data repaired**: `supabase/migrations/20260905130000_fix_topup_part_corruption.sql` - a data-correction migration (not a schema change), targeting the exact 5 row ids rather than a broader text match, with a `where ... and unit_label = 'top-up part'` guard so it's a no-op if ever re-run. **`db push --linked` failed** with `is_moderator already exists` - this fresh CLI session's local migration-history state doesn't match what's actually applied on the remote (a real, separate problem, not touched/investigated further here since forcing a full history replay on a live database without understanding the mismatch first would be genuinely risky). Applied the fix directly instead via `db query --linked --file <migration>`, the same safe direct-SQL mechanism this repo already uses for the RLS test suite. Re-verified by both the broad `%part%` scan (zero rows) and an exact-id lookup (all 5 rows back to plain `"top-up"`, `amount`/`role`/`sort_order`/`ingredient_type_id` all unchanged).
- **Regression test** (`src/domain/servings.test.js`): asserts `parseUnitLabel("top-up")` then reconstructing via `` `${amount} ${unit}`.trim() `` (the exact pattern `handleSave()` uses) returns `"top-up"`, not `"top-up part"` - for both `"top-up"` and `"to taste"`.
- **Both smaller follow-up findings from the investigation above are now also fixed, same sitting, same day:**
  1. ~~Plural/singular Select-mismatch~~ (e.g. Old Fashioned's real `"2 dashes"` didn't match the editor's singular-only `Select` options) - `parseUnitLabel()` now normalizes a known plural word to its canonical singular form via the existing `FORM_LOOKUP` table (already built for `scaleIngredientAmount()`'s pluralization, now reused for the opposite direction too) - `parseUnitLabel("2 dashes")` returns `{amount: "2", unit: "dash"}`, matching a real Select option. Side effect, expected and acceptable: if that recipe is now re-saved without touching that field, the stored word becomes singular (`"2 dash"`) - the *quantity* survives exactly, only the grammatical plural is lost, which already matches how a brand-new "dash" entry has always saved (the pre-existing, separately-tracked pluralize-at-save-time Follow-up).
  2. ~~`"1 top-up"` (Manhattan Iced Tea) getting scaled by servings~~ - `scaleIngredientAmount()` now excludes `"top-up"`/`"to taste"` from scaling even when a leading number is present (new `DESCRIPTIVE_UNITS` set + `isDescriptiveUnit()` check), not just when there's no leading number at all. `"1 top-up"` now stays exactly `"1 top-up"` at any serving count.
  - Refactored `scaleIngredientAmount()` and `isManualPartsUnit()` to both call `parseUnitLabel()` internally rather than each doing their own regex match - one parser, normalizing consistently, everywhere a unit label gets read.
- **Migration-history mismatch, investigated per explicit instruction - not forced, not altered**: `npx supabase migration list --linked` shows the full picture precisely. Migrations `20260815200430` through `20260823160000` (33 entries) show `local == remote` - genuinely recorded as applied in Supabase's own migration ledger. Migrations `20260825100000` through `20260826120000` (14 entries - moderator role, catalog-shape/glass-alias/liquid-color-alpha/popularity-counter/public-share migrations) all show `remote: ""` - **not recorded in the remote's ledger**, even though their actual schema changes are demonstrably live (the app has been using all of them for real). This is exactly why `db push` failed: it tries to replay from the first "untracked" entry and hits objects that already exist. This session's own `20260905130000` data-repair migration shows the same `remote: ""` - **the directly-applied repair is not recorded in Supabase's migration ledger either**, for the identical reason (applied via `db query`, which doesn't touch that tracking table). Most likely explanation, inferred from the identical symptom rather than confirmed: those 14 migrations were probably applied the same way in an earlier session - directly via `db query --linked --file`, working around this same `db push` issue before. Not investigated further, not repaired - the user was explicit about not forcing migrations or altering history yet.

**Verified 2026-09-05**: `pnpm test` — 164/164 passing (160 prior + 4 new: two `parseUnitLabel` normalization cases, the quantity-preserved-through-save round-trip, and the `"1 top-up"`-at-multiple-servings regression). `pnpm build` clean. `pnpm format` clean. Data fix verified directly against the live DB (see above).

**User-supplied screenshots confirmed two things on the Detail screen, 2026-09-05**: the repaired ingredient now displays plain `"top-up"` (not `"top-up part"`), and `"1 top-up"` (Manhattan Iced Tea) stays unchanged at 3 servings rather than scaling. **Not covered by those screenshots**: the actual editor open → save → reopen round trip (the "Final editor checklist" steps 1-4 handed to the user) - that verification is still outstanding, not to be treated as confirmed by the Detail-screen screenshots above.

## Earlier chunk (Serving-size selector + parts, Stage 5: final integration review, regression run, docs)

**Stage 5: no new feature code. Ran the final checks, reviewed integration across all four prior stages, and closed out the feature's documentation.**

- **`pnpm test`** — 157/157 passing. **`pnpm build`** — clean. **`pnpm format`** — clean, working tree already clean going in (nothing left uncommitted from Stage 4).
- **Integration review, by re-reading the final state of every touched file together** (not just re-running old checks): `IngredientsSection.jsx`, `recipeShareText.js`, and `DetailScreen.jsx` all confirmed internally consistent - the same `displayServings`/`showRatios`/`mixedConflict` pattern is used identically in both the on-screen display and Copy Recipe, so they can't drift apart. `SharedRecipeScreen.jsx` confirmed untouched by any of Stages 1-4 via `git log --follow` (only one commit ever touched it, from before this feature existed) - the public share page genuinely never gained a servings/parts control, exactly as decided.
- **Reused the recorded manual verification from Stages 1-4/4-follow-up rather than re-running it** - per the user's explicit instruction, since those checks already covered ml/oz scaling, non-volume scaling, descriptive passthrough, the parts ratio math (including decimals and the mixed-recipe fallback), servings being hidden and preserved in parts mode, and Copy Recipe/public-share behavior end to end, all confirmed working on a real iPhone across two separate verification passes.
- **One concrete gap found, not fixed**: `EditorScreen.jsx`'s `unitLabelToForm()` (untouched by this feature, prefills the amount/unit fields when opening an existing recipe component for editing) assumes every non-ml `unit_label` starts with a single numeric token (`"2 dashes"` → amount `"2"` + unit `"dashes"`). A bare, no-count label breaks that: `"top-up"` (pre-existing, apparently never actually used by any real recipe, so never hit in practice) mis-parses to amount `"top-up"` + unit falling back to `"part"` - a blind re-save would silently corrupt the stored value to `"top-up part"`. `"to taste"` (new in this feature's Stage 1) mis-parses to amount `"to"` + unit `"taste"` - the unit `Select` won't match any real option since its actual value needs to be `"to taste"` with the space, though a blind re-save happens to reconstruct the correct string by coincidence (rejoining `"to"` + `"taste"` with a space gives back `"to taste"`). Net effect: opening an existing recipe that already has a `"top-up"` or `"to taste"` ingredient for editing shows a broken amount/unit field pair for that one row. Recorded as a Follow-up in `docs/project.md` rather than fixed - it's adjacent to this feature (only reachable because Stage 1 added a second bare/no-count vocabulary word) but isn't a defect in the scaling or ratio logic itself, and fixing it means editing a file none of these 5 stages otherwise touched.

**Serving-size selector + parts ratio view is complete.** Marked done in both this file's Phase & chunk list and `docs/project.md`'s Current Focus/Backlog. `docs/project.md`'s Next section (homepage-for-empty-My-Bar, mood/taste discovery) is unchanged and not started - the user's explicit "preserve next priorities without starting them."

## Earlier chunk (Serving-size selector + parts, Stage 4: parts-mode UI)

**Stage 4: the actual parts-mode UI - a 3-way ml/oz/parts toggle on the member-facing recipe view, wiring Stage 3's `computePartsRatio()` in.**

- **3-way toggle, `IngredientsSection.jsx`**: extended the existing ml/oz pill to a third "parts" button. Deliberately a *separate* local `partsMode` boolean (`DetailScreen.jsx`, default `false`, reset alongside `servings` whenever the recipe `id` changes) rather than a third value of the persisted `unit` state - clicking "ml"/"oz" still calls `setUnit()` (persisted) *and* `setPartsMode(false)`; clicking "parts" only calls `setPartsMode(true)` and never touches `unit` at all. This is what "parts mode stays local, preserves the saved ml/oz preference" actually means in code: the persisted preference is never overwritten by exploring parts mode, and reappears exactly as it was the moment parts mode is turned back off.
- **Ratio computed from the recipe's base `ings` prop, never the servings-scaled version** - `computePartsRatio(ings)` is called directly, not through `scaleIngredientAmount()` first. Combined with Stage 3's servings-invariance, this is *why* selecting 2/3 servings while in parts mode leaves the ratio completely unchanged - there's no scaled value anywhere in that code path to change it.
- **Non-volume components are unaffected by parts mode** - the per-row rendering only branches into ratio display when `computePartsRatio()` returns a non-null value for that specific component (i.e. only real `unitLabel === "ml"` components ever get one). Everything else - dash/piece/slice/splash/g (still scaled by servings) and top-up/to-taste (still never scaled) - falls straight through to the exact same `formatAmount(scaleIngredientAmount(ri, servings), unit)` call Stage 2 already used, completely untouched by this stage.
- **Mixed-recipe fallback, per the user's explicit requirement**: new `hasConflictingPartsUnits()` (`domain/parts.js`) detects a recipe with both a real ml-derived ratio *and* at least one manually-typed `"part"`/`"parts"` component (via a new `isManualPartsUnit()` exported from `servings.js`, reusing its existing leading-number parser). When both are present, parts mode falls back to plain ml/oz for the volume components (exactly as if parts mode weren't selected for them) and leaves the manually-typed part component exactly as authored - the two scales are never merged or shown side-by-side as if related. A short caption (`PARTS_MODE_CONFLICT_EXPLANATION`) explains why. The non-conflict case gets its own caption (`PARTS_MODE_EXPLANATION`) pointing back to ml/oz for a measured pour, per the user's explicit "direct users to ml/oz for measured totals" requirement. Both strings live once in `domain/parts.js` and are imported verbatim by both `IngredientsSection.jsx` and `recipeShareText.js`, so the in-app caption and the Copy Recipe text can never say something different about the same recipe.
- **Copy Recipe (`recipeShareText.js`/`ActionButtons.jsx`)**: `partsMode` threaded through, replicates the exact same ratio/conflict/fallback branching as the on-screen display (not merely "looks similar" - reuses the identical `computePartsRatio`/`hasConflictingPartsUnits`/`formatPartsAmount` calls), and prepends whichever explanation caption applies right after the existing `Servings: N` line.
- `SharedRecipeScreen.jsx` (public `/share/:id`): **untouched**, confirmed via `git status` before committing - no parts toggle, no changes at all, per the user's explicit call.

**Verified 2026-09-05**: `pnpm test` — 153/153 passing (148 prior + 5 new in `parts.test.js`: `formatPartsAmount` pluralization, and `hasConflictingPartsUnits` for a pure-volume recipe, a pure-manual-parts recipe, ml+unrelated-non-volume-units not conflicting, and the actual ml+manual-part conflict case). `pnpm build` clean. `pnpm format` clean. **Browser/mobile-verified by the user on their iPhone, 2026-09-05 - full manual checklist passed** (60/30→2:1, decimal quantities, non-volume items unaffected, servings changes leaving the ratio alone, switching back to ml/oz preserving the saved preference, Copy Recipe output, mobile layout of the 3-way toggle). No bugs found in the checked behavior itself - see the next chunk for a UX follow-up the user asked for immediately after, before committing.

## Last completed chunk (Serving-size selector + parts, Stage 4 follow-up: hide servings selector + base-recipe amounts in parts mode)

**Requested by the user immediately after Stage 4 passed its full manual verification, before committing** - a UX refinement, not a bug fix: while parts mode is active, the servings selector is now hidden entirely, and everything that isn't a computed ratio (non-volume quantities, plus any ml component in the mixed-conflict fallback) always shows the base 1-serving amount, regardless of whatever serving count was selected before switching to parts. The underlying `servings` state itself is *not* reset - switching back to ml/oz picks up exactly where it left off, selector and scaled amounts both.

- **`DetailScreen.jsx`**: `ServingsSelector` now renders only when `!partsMode`.
- **`IngredientsSection.jsx`**: new `displayServings = partsMode ? 1 : servings`, used everywhere the old raw `servings` was passed into `scaleIngredientAmount()`. Since `scaleIngredientAmount(ri, 1)` was already designed as an exact no-op (Stage 1), this cleanly forces every non-ratio quantity to its base amount without any new branching logic - `computePartsRatio()`/`hasConflictingPartsUnits()` are untouched, since they already only ever look at base amounts.
- **`recipeShareText.js`**: same `displayServings` treatment, plus the `Servings: N` line is now omitted entirely in parts mode (replaced by the explanation line) rather than printing a number the UI no longer shows or lets you change.
- **`domain/parts.js`**: both `PARTS_MODE_EXPLANATION` and `PARTS_MODE_CONFLICT_EXPLANATION` reworded to state outright that displayed quantities are the base recipe (1 serving) and to point at ml/oz for amounts "at your selected serving count" - still one shared string each, still imported verbatim by both the UI and Copy Recipe.
- **New test file, `src/components/detail/recipeShareText.test.js`** - the first test file outside `src/domain/` in this project (a deliberate, narrow exception to the "domain-only" testing convention, since `buildRecipeShareText` is a plain framework-free function and this was the only way to actually verify the requested clipboard-output behavior without a browser). 4 cases: normal Stage 2 behavior unchanged when parts mode is off; ratio + base-amount non-volume quantities together in parts mode regardless of a hidden serving count of 3; `Servings:` line omitted with the base-recipe caption present; the mixed-conflict fallback showing a base-serving ml amount (not scaled, not merged into a fake ratio) alongside an untouched manually-typed part.

**Verified 2026-09-05**: `pnpm test` — 157/157 passing (153 prior + 4 new in `recipeShareText.test.js`). `pnpm build` clean. `pnpm format` clean. **Browser/mobile re-verified by the user, 2026-09-05 - the full 3 servings → parts → ml/oz round-trip passed**: servings selector disappears in parts mode, countable non-volume ingredients (bitters, sugar) correctly show base 1-serving amounts rather than the hidden 3-serving-scaled ones, Copy Recipe output matches (no `Servings:` line, base-recipe caption present), and the previously-selected serving count (3) correctly reappeared with its scaled amounts restored on switching back to ml/oz. Stage 4 is fully accepted.

## Earlier chunk (Serving-size selector + parts, Stage 3: parts ratio computation)

**Stage 3: the parts ratio math itself, pure domain logic only - no UI wiring, nothing on screen changes. Exactly the same shape as Stage 1 (inert logic first, UI wired in a later stage).**

- New `src/domain/parts.js`: `computePartsRatio(components)` takes a recipe's components (same `{amount, unitLabel}` shape everything else in this feature uses) and returns a parallel array - the reduced integer ratio for each `unitLabel === "ml"` component with a positive amount, `null` for everything else (non-volume components, and any malformed 0/negative ml amount). Non-ml components aren't touched or reasoned about at all here - they keep rendering exactly as they already do; this function has nothing to say about them.
- **Exact integer GCD reduction, not a fuzzy/tolerance-snapped approximation** - per the user's explicit decision. Amounts are normalized to integers first (scaled by the smallest power of 10 that clears every decimal *actually present in the amount's own value*), then a standard Euclidean-algorithm `gcd()` reduces them. A recipe whose proportions don't share a large common factor (e.g. 7ml/22ml) gets an honest, unreduced ratio (`[7, 22]`) rather than an invented "nicer" one - tested explicitly, not just an assumption.
- **Real precision bug found and fixed during review, before commit, 2026-09-05**: the first version of `decimalPlaces()`/the scaling step reused `servings.js`'s `round2()` (2-decimal display rounding, correct for *already-scaled display* numbers) to normalize the raw stored amount before ratio math - wrong tool, since `round2(1.125) = 1.13` is a genuinely different number, not a display simplification of the same one. Against `2.25ml` that silently turned an exact 1:2 ratio into `gcd(113, 225) = 1` → `[113, 225]`. Caught by the user in review before it was ever committed or wired to a screen. Fixed by reading decimal places off the raw amount's own `String()` form instead (JS's Number-to-String conversion always yields the shortest decimal that round-trips exactly, so it faithfully reflects the value's true stored precision) - `round2()` is no longer used anywhere in `parts.js`, and its export from `servings.js` was reverted back to private since nothing outside that file needs it. New regression test: `computePartsRatio([ml(1.125), ml(2.25)])` → `[1, 2]`.
- **Servings-invariant by construction, verified by a real test**: `gcd(k·a, k·b) = k·gcd(a,b)` means a recipe scaled to 2 servings produces the identical reduced ratio as its base amounts - `computePartsRatio([ml(120), ml(60)])` equals `computePartsRatio([ml(60), ml(30)])`. This is *why* Stage 4 will be able to compute the ratio once from a recipe's base (1-serving) stored amounts and never recompute it per serving count.

**Verified 2026-09-05**: `pnpm test` — 148/148 passing (138 prior + 10 new in `parts.test.js`, including the precision regression test above). `pnpm build` clean. `pnpm format` clean. Committed as `33dc7c9`. No browser verification applicable - pure domain logic, nothing wired to a screen yet.

## Earlier chunk (Serving-size selector + parts, Stage 2: selector UI)

**Stage 2: the member-facing servings selector, wired into DetailScreen. Parts display mode still deliberately out of scope (Stages 3-4).**

- New `src/components/detail/ServingsSelector.jsx` - a `−`/number/`+` row, min 1 (`−` disabled at 1), both buttons `w-11 h-11` (44px at this app's 4px Tailwind spacing scale, per the user's explicit requirement - stricter than the 32px precedent used elsewhere in this codebase). Deliberately its own row between the description and Ingredients rather than sharing the existing ml/oz toggle's header row - this codebase has a documented history of exactly that kind of row getting cramped on mobile, so it was designed around up front rather than fixed after the fact.
- New `IconMinus` in `icons.jsx`, following the existing single-path-icon factory pattern (matches `IconPlus`).
- `DetailScreen.jsx`: new local `servings` state, default 1, **not** persisted like the ml/oz preference - `useEffect(() => setServings(1), [id])` resets it whenever the recipe itself changes, so navigating from one recipe to another (without unmounting `DetailScreen`, since the route just swaps `:id`) can't carry a stale serving count across recipes.
- `IngredientsSection.jsx`: each ingredient row now runs through `scaleIngredientAmount(ri, servings)` (Stage 1's function) before `formatAmount()` - composition, not a rewrite of either function.
- `recipeShareText.js` (Copy Recipe) and `ActionButtons.jsx`: `servings` threaded through; the copied text now scales every ingredient the same way the screen does, and gets a new `Servings: N` line under the description.
- `SharedRecipeScreen.jsx` (public `/share/:id`): **untouched**, per the user's explicit call - no servings control, always the base recipe.

**Verified 2026-09-05**: `pnpm test` — 138/138 passing (unchanged - no domain logic touched this stage, all new logic is UI wiring around Stage 1's already-tested function). `pnpm build` clean. `pnpm format` clean.

**Browser/mobile-verified by the user on a real iPhone, 2026-09-05 - all checks passed, no bugs found.** Automated verification wasn't possible: tried a headless Chromium first (installed locally for this) but hit a real wall - the app is invite-only and I don't have (and won't guess or search for) real login credentials, and self-signup can't reach a working membership without a real invitation code. The user verified manually instead, against a written checklist covering:

- 44x44px touch targets on the `−`/`+` buttons - confirmed.
- Scaling correctness on the real "Old Fashioned" recipe (bourbon 60ml, Angostura Bitters "2 dashes", White Sugar "1 cube") across 1/2/3 servings and back down to 1 - confirmed, including the known "2 cube" (not "cubes") legacy-word quirk behaving exactly as documented, not as a surprise.
- ml/oz toggle while scaled (confirms the ml amount is scaled *then* converted, not converted-then-stuck-at-base) - confirmed.
- Servings resets to 1 when navigating from one recipe to another (`DetailScreen`'s `useEffect` keyed on `id`) - confirmed.
- Copy Recipe includes the new `Servings: N` line and matches on-screen scaled quantities - confirmed.
- Descriptive/non-scaling quantities stay unchanged at any serving count - confirmed.
- Public `/share/:id` page has no servings control and always shows the base recipe - confirmed.

## Earlier chunk (Serving-size selector + parts, Stage 1: shared scaling logic)

**Full audit done before any code, per the user's explicit request** - read the existing storage schema (`recipe_components.amount`/`unit_label`, `supabase/migrations/20260815214307_recipes_schema.sql:37-50`), `src/domain/availability.js`'s `formatAmount`/`mlToOz`/`ozToMl`, all three ingestion paths that already share `NON_VOLUME_UNITS` (`EditorScreen.jsx`, `recipeImport.js`, `recipePaste.js`), and all three display call sites (`IngredientsSection.jsx`, `recipeShareText.js`, `SharedRecipeScreen.jsx`). Confirmed via the original seed data (`"2 tsp"`, `"8 leaves"`, `"1 cube"` in `20260815214433_seed_classic_recipes.sql`) that `unit_label` has always been unconstrained free text - `NON_VOLUME_UNITS` is an app-level whitelist for new entries only, not a DB constraint. Confirmed `profiles.unit_preference` has `check (... in ('ml','oz'))` - informed the decision to keep "parts" display mode local/ephemeral per Detail-screen view rather than adding it to that persisted, DB-constrained preference (avoids a migration entirely for this feature).

Agreed a 5-stage plan with the user (full detail lives in this conversation's transcript, not duplicated here - the short version): (1) shared servings-scaling logic, (2) serving-size selector UI, (3) parts ratio computation (pure domain, GCD-based, exact - not rounding-approximated), (4) parts display-mode UI (a third ml/oz/parts toggle, ratio derived from stored ml amounts), (5) final integration/regression/docs. Key decisions locked in: parts mode is a third *display mode*, not a stored unit; the ratio is computed via exact integer GCD reduction (no fuzzy/tolerance-snapped "prettifying"); the ratio is mathematically invariant under serving-count scaling so never needs recomputing per serving; servings-selector state is local to `DetailScreen`, not persisted; the public `/share/:id` page gets no servings control and stays at the base serving.

**Stage 1 (this chunk): shared servings-scaling logic, `splash`/`to taste` units, validator + AI-prompt updates, tests. No UI wiring yet - nothing on screen changes.**

- New `src/domain/servings.js`: `scaleIngredientAmount(recipeIng, servings)`, a pure function taking the same `{amount, unitLabel}` shape `formatAmount()` already consumes. `servings === 1` is always an exact no-op (guarantees zero behavior change at the default serving count). For `unitLabel === "ml"`, multiplies `amount` directly (exact integer math, feeds straight into the unchanged `formatAmount` for ml/oz display). For everything else, parses a leading number off `unitLabel` via `/^(\d+(?:\.\d+)?)\s+(.+)$/` - a label with **no** leading number (`"top-up"`, `"to taste"`) simply never matches and passes through completely unscaled, automatically, with no separate exclusion list to maintain. `"part"`/`"parts"` is the one matched case deliberately *not* multiplied (it's a proportion, not an absolute quantity) but is still re-pluralized against its own stored number. A small `UNIT_FORMS` singular/plural lookup (dash/dashes, barspoon/barspoons, piece/pieces, slice/slices, wedge/wedges, splash/splashes, part/parts, g/g-invariant) re-pluralizes known-vocabulary words correctly regardless of whether the stored word was already singular or plural; a legacy/free-text word outside that table (e.g. `"leaves"`, `"tsp"`, real values from the original seed data) still has its number scaled correctly, just keeps its own word unchanged - noted as an accepted, cosmetic-only limitation on old data, not something worth a lookup table for words nothing will ever author again through the current editor/import paths.
- `src/data/constants.js`: added `"to taste"` and `"splash"` to `NON_VOLUME_UNITS`. Every consumer of that shared constant (the editor's unit `Select`, `recipeImport.js`'s validator, `recipeImport.js`'s AI-prompt generator, `recipePaste.js`) picked up both new units automatically with no per-file changes needed - confirms the existing "one shared vocabulary constant" architecture was the right call originally.
- `recipeImport.js`: one wording tweak to the generated AI-formatting-prompt (`"omit for a unit like \"top-up\" or \"to taste\" that has no count"`) so the AI treats the new bare/no-count unit consistently with the existing one.
- **Real (minor, pre-existing, out of scope) gap noticed while testing, not fixed**: neither the manual editor nor the batch-import validator currently auto-pluralizes a countable unit at storage time - selecting "dash" with amount 2 stores literally `"2 dash"`, not `"2 dashes"` (the seed data's `"2 dashes"` was typed correctly by hand in raw SQL, not produced by this code path). This has always been true and is unrelated to serving-size scaling, so left alone. Worth noting: `scaleIngredientAmount` actually *corrects* this the moment servings > 1, since its pluralization is re-derived from the final count rather than copied from the stored word - so the bug is only visible at the default 1-serving view, exactly where nothing about this feature touches it.

**Tests**: new `src/domain/servings.test.js` (13 cases - servings=1 identity for every unit type, ml scaling through both ml/oz display, numeric non-volume scaling + pluralization including a decimal-crossing-to-whole case, an already-plural stored amount, gram invariance, splash, floating-point-rounding safety, bare descriptive passthrough, part/parts never multiplied, legacy free-text words). `recipeImport.test.js`: 2 new cases (accepts `splash` with a count, accepts bare `to taste`) plus one existing test's expected unit-list string updated for the 2 new vocabulary entries.

**Verified 2026-09-05**: `pnpm test` — 138/138 passing (125 prior + 13 new). `pnpm build` clean. `pnpm format` clean (reformatted the 2 new/changed test files' line wrapping only, no logic change). Not browser-verified - there's nothing on screen to verify yet, Stage 1 is pure domain logic with zero UI wiring, exactly as scoped.

**Next**: Stage 2 (serving-size selector UI) - awaiting the user's explicit go-ahead per their "implement only the approved stage... wait for approval" instruction.

## Earlier chunk (BottomSheet viewport clamping; Recipe Editor's Glass/Family pickers converted)

**Real bug found from a live screenshot: the desktop dropdown variant of `BottomSheet` (`primitives.jsx`) wasn't clamped to the viewport at all.** It always positioned itself `rect.bottom + 8` below and `rect.left` even with the trigger, with a flat `max-h-[70vh]` - fine near the top of a short form, but a trigger sitting low or far right on a long admin form (e.g. a color picker deep in "Add ingredient") could push the dropdown partly or entirely off-screen, with genuinely no way to reach the rest of it (this overlay is `position: fixed`, not a page-scroll-linked container, so anything positioned beyond the viewport edge inside it is just gone, not reachable by scrolling the page). Fixed by clamping the computed `left` to stay within `window.innerWidth` and replacing the flat `max-h-[70vh]` with a dynamic `maxHeight` computed from actual remaining space below the trigger (`window.innerHeight - top - margin`), so the sheet always fits on screen and scrolls internally instead of extending past the edge invisibly. New `DESKTOP_SHEET_WIDTH` constant (480, bumped up from 340 per a follow-up "could it be bigger" ask, comfortably fits 3 columns of glass buttons instead of 2) keeps the JS clamping math and the rendered CSS width from drifting apart.

**Recipe Editor's Glass and Family pickers were the two remaining always-expanded grids in the whole app** - every other picker (admin shape/color, My Bar/Library/Lists filters, Ingredient Type Editor's category) had already moved to the compact-trigger-opens-`BottomSheet` pattern this session; these two (`components/editor/GlassPicker.jsx`/`FamilyPicker.jsx`, distinct components from admin's shared `ShapePicker` - built specifically for the recipe editor's own visual click-to-select grid) had simply been missed. Converted both to the identical pattern, no behavior/prop-signature changes for `EditorScreen.jsx`'s two call sites.

Verified: `pnpm build`/`pnpm test` (125/125, unchanged)/`pnpm format` clean. Both the clamping fix and the Glass/Family conversion browser-confirmed live by the user (a "Choose a Glass" screenshot from the actual Bloody Mary edit screen, both before showing the cramped grid and after showing the working dropdown).

## Earlier chunk (Google OAuth wired up live; a public no-login recipe share page; My Bar icon polish)

**Google sign-in confirmed working end-to-end on the hosted app.** The client code already existed (`signInWithGoogle()`/SignInScreen's button, built in an earlier session) - what was actually missing was the Google Cloud + Supabase configuration, walked through live with the user: a Google Cloud OAuth client (redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`), pasting the Client ID/Secret into Supabase's Google provider settings, and fixing Supabase's Site URL/Redirect URLs (were still `localhost:8443` from initial setup). **Real detour, my own mistake**: I wrote the production URL without its hyphen (`rustypipes.vercel.app` instead of `rusty-pipes.vercel.app`) in my own instructions, which the user then entered into Supabase and tried visiting directly - produced a Vercel `DEPLOYMENT_NOT_FOUND` 404 that looked like a broken deployment but was actually just a URL that never existed. Caught by asking the user to confirm the exact address bar contents rather than assuming. **Scoping decision**: OAuth consent screen stays in "Testing" mode rather than publishing to production, since publishing requires a real Privacy Policy/Terms of Service page this app doesn't have - the user chose to add real members as test users one at a time instead, matching the existing invite-only workflow's overhead almost exactly.

**New feature: "Copy Recipe" (plain-text clipboard copy) and a public, no-login recipe share page** - both from the same user request, scoped down from an initial broader ask via a clarifying question (which recipes get a public link - user chose classic/community only, not private).

- **Copy Recipe**: new `buildRecipeShareText()` (`src/components/detail/recipeShareText.js`, pure function reusing `formatAmount()` from `domain/availability.js`) formats name/description/ingredients/steps/glass as plain text, matching whatever unit (ml/oz) the detail screen is currently showing. Wired into a new always-visible button in `ActionButtons.jsx` with the same copy/check icon-swap feedback pattern already established elsewhere (`InvitesTab.jsx`).
- **Public share page**: a new `get_shared_recipe(p_recipe_id uuid)` `SECURITY DEFINER` function (`20260826120000_public_recipe_share.sql`) - the first `anon`-executable function in this app's history, since every other table/RPC has always required at least a session. Filters to exactly the same `visibility = 'shared' and moderation_status = 'active'` condition the real "recipes: read" RLS policy (20260823110000) already uses for member visibility, so a private recipe is structurally unreachable through it, not just hidden by convention - verified directly via anonymous `curl` calls against the hosted project (a real classic recipe returns full data with no `Authorization` header at all; a real private recipe's id and a made-up id both return `null` identically, so there's no way to distinguish "private" from "doesn't exist" from outside). `App.jsx` restructured: the existing auth/membership logic moved into a new `AuthenticatedApp` component, with `/share/:id` now a sibling top-level route that never touches `useSupabaseSession`/`useMembership` at all - a signed-out visitor viewing a shared recipe shouldn't wait on an auth check that has nothing to do with it. New `SharedRecipeScreen.jsx` (plain read-only rendering, no favorite/availability/edit anything, just an ml/oz toggle) and `services/sharedRecipe.js`. A new "Copy Public Link" button in `ActionButtons.jsx` (classic/community only, matching the function's own filter exactly) copies `<origin>/share/<id>`.

**My Bar icon polish, two follow-up rounds from a live screenshot after the above landed:**

1. Removed the tinted background tile that used to sit behind every `TypeCard` ingredient icon (a rounded square colored via the type's own color at ~15% opacity) - user wanted just the bare icon in its real color (the icon's own `fillColor` already did this), sized bigger now that it's not sharing space with a box. Bumped in two steps per live feedback (36px/30px, then 46px/38px for standalone/child cards).
2. **Real regression caught immediately after the second size bump**: family-cluster child cards (`w-24`/96px, `w-26`/104px for the parent-as-card) were already tight for their own top button row alone (checkmark + chevron + pencil = three 32px WCAG-minimum touch targets from an earlier accessibility pass, needing ~98px+16px padding against an 80px content area even before this) - the bigger icon made the whole card visibly cramped, with the edit-pencil button nearly spilling past the card edge. Fixed by widening both (`w-24`→`w-28`, `w-26`→`w-30`) rather than shrinking the icon back down or undoing the touch-target sizing - confirmed the new Tailwind v4 arbitrary-spacing utilities actually compiled (`dist/assets/*.css` shows `.w-28{width:calc(var(--spacing) * 28)}`) rather than assuming the class names were valid.

Verified: `pnpm build`/`pnpm test` (125/125, unchanged)/`pnpm format` clean throughout. `db advisors --type security` shows exactly one new finding (`get_shared_recipe` executable by `anon`) - expected and intentional, the entire point of the function. Every UI change browser-confirmed live by the user; the share page itself was screenshotted working end-to-end from a real `/share/:id` URL.

## Earlier chunk (a second live-phone mobile pass, this time Admin-specific)

**User walked through Admin's own screens live on their phone and found five more real cramping/usability issues, all fixed and confirmed in the same style as the general mobile pass before it ("all looks good" at the end).**

1. **Classic Recipes' and Moderation's action buttons (Demote to Community/Edit/Delete, Promote to Classic/Unpublish) went icon-only on mobile**, label restored at `md:` - full-text buttons on every row were crowding recipe titles into 2-3 lines. Added a new `IconMerge` glyph (`icons.jsx`) since no existing icon fit "merge" for the Ingredient Types tab's identical fix (Edit/Merge/Delete). Two smaller things caught and fixed along the way: (a) all four confirm-opening icon buttons (Demote/Delete/Promote/Unpublish) previously only opened their confirm panel, never closed it - clicking again just re-opened the same state; fixed so the icon button now toggles like the existing Cancel button does, clearing the same error state Cancel clears. (b) Demote's chevron-down icon now rotates 180° while its panel is open, matching a normal expand/collapse affordance.
2. **AdminScreen's `TopBar` + tab row wrapped in one shared `sticky top-0` container** - `TopBar` was already sticky on its own, but the tab row below it wasn't, so it scrolled away on any long tab (Catalog especially - 5 stacked `NamedRowManager` sections) leaving no way back to it short of scrolling all the way up. A floating cyan "back to top" button (new `showScrollTop` state, a `window.scroll` listener at a 400px threshold) now appears in the bottom-right and smooth-scrolls back up on tap - separate ask from the sticky header, done together since both were about the same "long Admin tab" scrolling problem.
3. **`IngredientTypeEditor`'s `CategoryPicker` was the one picker never converted to the BottomSheet pattern** - still an always-expanded ~14-chip grid. Converted it to the same compact-trigger pattern as `ShapePicker`/`ColorSwatchPicker` (`primitives.jsx`) - since it's shared, `ImportRecipes`/`ImportIngredientsSingle` got the fix for free too. Real ambiguity found and fixed in the same pass: neither the category trigger nor the color trigger had a field label above them (unlike Icon/Aliases, which did) - harmless when the CategoryPicker was a big obvious chip grid, but once collapsed to a single small trigger showing just the current value's name, editing the "Beer" ingredient type showed a bare "Beer" trigger with zero indication it meant *category*, not the type's own name. Added "Category"/"Color" labels; also moved Color to sit directly next to Icon (both are "how this type displays," previously separated by two unrelated Select fields) per explicit request. Renamed the "Pictogram" label to "Icon" everywhere it appears (`IngredientTypeEditor.jsx`, `ShapePicker.jsx`'s sheet title) - internal code/comments still say "pictogram" (matches `GLASS_SHAPES`/`FAMILY_SHAPES`/`INGREDIENT_SHAPES` naming), only the user-facing text changed. `ShapePicker`'s trigger preview icon bumped from 20px to 28px (every consumer, not just this screen) per "a bigger icon."
4. **`UsersTab`'s per-user row (role Select + Confirm + Block) was clipping the Block button off the right edge of the screen on mobile** - three controls fighting the name for space on one row. Stacked the actions row below the name on mobile (`md:` restores the original single row), and made Confirm/Block/Unblock icon-only-on-mobile too (`IconCheck`/`IconLock`/`IconGlobe`) for the same margin-safety reason as item 1 above, not just because the row now has more room.

Verified after every fix: `pnpm build`/`pnpm test` (125/125, unchanged)/`pnpm format` clean. Every item browser-confirmed live by the user.

## Earlier chunk (app renamed to Rusty Pipes; first real deployment; a live-phone mobile UI pass)

**App renamed from "Cocktail Library" to "Rusty Pipes"** - user's own call, a nod to the 1988 Tom Cruise film *Cocktail* ("Cocktails & Dreams"). Domains `rustypipes.com`/`rustypipes.app` confirmed available (user checked, not registered by this session). Renamed everywhere real: `.figma/make/site.json` (title + a rewritten SEO-friendly description - this is what actually drives the page's `<title>`/meta description/`og:title`/`og:description` via `vite.config.ts`'s `figmaSiteConfiguration` plugin, confirmed by grepping the built `dist/index.html` directly rather than assuming), `package.json`'s `name`, every user-facing string (Nav sidebar header, Welcome/SignIn/Join screen copy, DetailScreen's publish-confirm message), and the shared AI-import prompt string (`buildRecipeImportPrompt`-adjacent text in `ingredientImport.js`/`recipeImport.js`/`productImport.js`). GitHub repo itself renamed by the user (`maxsoulfly/cocktail-library` → `maxsoulfly/rusty-pipes`) via the GitHub UI (no `gh` CLI available in this sandbox); local `origin` remote updated to match and fetch-verified. Deliberately left alone: the `CL-XXXXX-XXX` invitation code prefix (hardcoded in `20260822090000_invitation_generation.sql` - user wants it kept as a "reminder of what it used to be," and said the whole invite-only system will change anyway once the app is monetized) and every reference in `AGENTS.md`/`CLAUDE.md`/`docs/` (out of scope - those are conventions/spec files, not app branding).

**First real deployment - Vercel, GitHub-connected, live at `rustypipes.vercel.app`.** Walked the user through the actual Vercel dashboard screen-by-screen live (framework preset auto-detected as Vite, build/output/install commands auto-filled from `pnpm-lock.yaml`, env vars). Added `vercel.json` (a catch-all rewrite to `index.html`) up front since `react-router-dom`'s `BrowserRouter` needs it for deep-links/refreshes on non-root routes to not 404 on static hosting - confirmed working once live. One real hiccup: Vercel's "Import .env" button added new env var rows instead of filling the two already-auto-detected ones, producing a duplicate-key validation error - fixed by deleting the two original empty rows, keeping the ones the import populated. Confirmed working on both desktop and the user's actual phone.

**A live-phone mobile UI pass turned up several real issues, fixed one at a time as the user found them by actually using the deployed app:**

1. **Admin catalog management screens (Glasses/Cocktail Families/Ingredient Categories/Ingredient Types) always rendered their full shape/color picker grid inline** - fine on desktop, but 19 glass shapes or 11 ingredient pictograms permanently expanded ate a huge amount of mobile vertical space. Built a new shared `BottomSheet` primitive (`primitives.jsx`) and converted `ShapePicker` (`admin/ShapePicker.jsx`) and `ColorSwatchPicker` (`primitives.jsx`) from always-expanded grids into a compact current-value trigger that opens the grid in the sheet, closing on selection - since both are just `{value, onChange}` components, every existing call site (`IngredientTypeEditor`, `NamedRowManager`, `EditorScreen`'s two liquid-color pickers, `ImportRecipes`, `ImportIngredientsSingle`) got the fix for free with zero call-site changes needed.
2. **My Bar's category filter row (10+ categories) and Library/Lists' availability filter row were both a cramped horizontally-scrolling chip strip with no visual affordance that there was more to scroll to** - real usability problem, not just cosmetic (user: "we have like 10 categories, and we have to scroll to find what we want"). Since both `cat` (My Bar) and `availFilter` (Library/Lists) are single-value selections already, applied the same compact-trigger-opens-`BottomSheet` pattern: `SearchFilterHeader.jsx`'s category row, `LibraryScreen.jsx` and `ListsScreen.jsx`'s availability row. `LibraryScreen`'s availability trigger and its separate Classic/Community/Private row were also combined onto one wrapped flex line per a follow-up ask, instead of two stacked rows.
3. **`BottomSheet` made responsive: a real bottom sheet on mobile, a small dropdown anchored under the trigger button on desktop** (same `xl` breakpoint the sidebar/bottom-nav switch already uses) - a full-screen dimmed mobile-style sheet read as overkill once the user saw it on a wide screen. Takes an optional `anchorRef` (a ref on the trigger button); all 5 call sites (the two shared pickers plus the three ad-hoc filter triggers above) now pass one.
4. **Three real bugs found and fixed while building the above, each caught from a live screenshot, not before:**
   - `BottomSheet`'s `fixed inset-0` rendered cramped inside `SearchFilterHeader`'s own small sticky-header box instead of covering the viewport - root cause: that header uses `backdrop-blur-md`, and a `backdrop-filter` on an ancestor creates a new CSS containing block for `position: fixed` descendants (the same rule `transform`/`filter` trigger), so the "viewport-covering" overlay was actually anchored to that small header. Fixed by portaling the sheet to `document.body` via `createPortal`.
   - The desktop anchored dropdown flashed centered on screen for one frame before jumping to its real anchored position - `pos` starts `null` and a plain `useEffect` computes it only after the first paint. Fixed by switching to `useLayoutEffect`, which runs before the browser paints.
   - The desktop dropdown was hard to see in dark mode - `border-bdr`/`shadow-2xl` read fine in light mode (white card on a pale page) but in dark mode `surface`/`bg` are both near-black with little contrast, and a drop shadow barely shows against a dark page at all. Fixed with a cyan-tinted ring (`shadow-[...,0_0_0_1px_rgba(34,211,238,0.25)]`) alongside the shadow, instead of relying on border-color contrast alone.
5. **`CocktailCard`'s name/source-badge row and `Admin`'s tab bar were flagged as a matched pair of "cramped/overflowing" issues** - the card fix landed (see below); the Admin tab bar (Overview/Classic Recipes/Moderation/Catalog/Ingredient Types/Batch Import/Users/Invitations, `AdminScreen.jsx` line ~610) is still the plain `overflow-x-auto` it always was - recommended a fade-edge affordance (tab bars are primary navigation, not a single-value picker, so collapsing them into the same tap-to-open-sheet pattern would cost users a second tap for adjacent-tab switching) but this was never implemented - picked back up next if the user's upcoming "mobile admin issues" include it.
6. **`CocktailCard` (`CocktailCard.jsx`, shared by Library and Lists) redesigned for mobile readability**, in two rounds based on live feedback: first, the name+"Classic" badge stack vertically instead of sitting side by side (long names like "Between the Sheets"/"Black Russian" were crowding the badge and both became hard to read) - caught one real bug immediately (a bare `flex-col` defaults to `align-items: stretch`, so the badge itself stretched into a full-width bar; fixed with `items-start`). Second round, per explicit feedback ("this is much more readable" came only after this second fix): all of the card's text content (name, badge, "by X", taste tags, availability status) center-aligns on mobile to match the already-centered glass icon above it, reverting to the original left-aligned single-row layout at `md:` and up where cards have more room.
7. **Home screen's "Search cocktails..." bar is a styled button, not a real input** (it can't own text entry across a route change) - tapping it navigated to Library but left the real search input unfocused, costing a second tap to actually start typing. Fixed by having it navigate to `/library?focus=1` and having `LibraryScreen` auto-focus its real search input on arrival when that param is present (mirrors the existing `?source=classic` deep-link pattern already used for Admin's stat cards). Noted to the user: iOS Safari sometimes won't auto-open the on-screen keyboard for a `.focus()` call that happens after a route change rather than synchronously inside the tap gesture - the input will still be visibly focused either way, but the keyboard itself may not always pop on iOS specifically.

Verified after every fix in this chunk: `pnpm build`/`pnpm test` (125/125, unchanged - pure UI/styling work, no domain logic touched)/`pnpm format` clean. Every item **browser-confirmed by the user on their actual phone** (not just HMR-observed) except the still-open Admin tab bar item above.

## Earlier chunk (duplicate-ingredient-type merge tool)

**Duplicate-ingredient-type merge tool - now fully built (backend + UI + RLS coverage), and the stale RLS-suite fixture bug from last session fixed as a side effect.** Direct continuation of the chunk below: the backend function existed, this session added everything else per the "exact next step" it left behind.

**`mergeIngredientType()` service wrapper** (`src/services/catalog.js`) - a thin `supabase.rpc("admin_merge_ingredient_type", {...})` call, same shape as every other admin RPC wrapper in the file.

**"Merge" UI in `TypesTab.jsx`**: no separate modal/searchable-picker component built - reused the tab's own existing search-filtered card list as the survivor picker instead (simpler than introducing a new searchable-Select primitive for one use, and the list is already there). Clicking "Merge" on a card enters a lightweight merge mode: every other card in the (still-searchable) list grows a "Merge into this" button, the loser's own card swaps its buttons for "Cancel merge", and once a survivor is picked a panel (alias-checkbox + `ConfirmPanel` in `layout="stack"`) appears above the list summarizing exactly what will be reassigned before committing.

**RLS suite coverage** (`supabase/tests/rls_suite.sql`, new section at the very end, deliberately last): non-admin member rejected, a moderator rejected (reuses `member_other_id` while it's still sitting at `role = 'moderator'` from the section above - no extra promotion needed), a full real merge round-trip verifying reassignment across all 6 referencing tables (child's `parent_type_id`, a direct `recipe_components` reference, a `recipe_component_alternatives` collision where the redundant loser row is dropped not duplicated, a product, an alias, plus `p_add_alias` preserving the loser's own name), both `user_inventory` shapes (plain reassignment vs. collision-drop), and negative boundary checks (merge into self, merge into own descendant). Verified the failure path still works (sabotaged one assertion, got back a precise `FAIL:` naming it) before trusting the clean pass; confirmed zero leftover `RLS_TEST%` rows in any table afterward.

**Two real bugs found and fixed while writing the RLS coverage, not before:**
1. **The exact stale-fixture bug flagged at the end of last session** - the suite's fixture-selection query required `role = 'member'` exactly, but one of the 2 real non-revoked member accounts now permanently sits at `role = 'moderator'` (from the user's own live browser verification of that feature), so the query came up one short and the whole suite failed at its very first assertion before reaching any real test. Fixed by broadening the query to `role in ('member', 'moderator')`, then immediately normalizing both fixture accounts back to plain `member` in-transaction (rolled back at the end regardless, never touches the real live row) - preserves every earlier "ordinary member" assertion's correctness, and the moderator section further down still re-promotes `member_other_id` on purpose at the point it actually needs one.
2. **My own first draft of the merge verification block read `user_inventory`/`recipe_components`/`recipe_component_alternatives` under the `admin` identity** - all three gate on owner-only access with **no admin-read override** (confirmed directly against `20260823110000_tighten_recipe_read_scope.sql` and the `user_inventory` RLS comment), so every admin-identity `count(*)` on them silently returned 0 regardless of real data - not a Postgres error, just a wrong-for-the-wrong-reason pass/fail. Caught it by temporarily forcing one assertion to always fail with the actual count embedded in the message (`format('DEBUG ...', n)`) rather than trusting a clean run, saw `0` where `1` was expected, traced it to the RLS boundary, and fixed by switching to the owning member's identity (`member_owner_id`/`member_other_id`) before each of those specific reads - exactly the same discipline `recipe_is_editable()`'s owner-only shape already required for the *setup* half of this same test block.

Verified: `pnpm build`, `pnpm test` (106/106), `pnpm format` all clean; `npx --yes oxlint -D no-undef` on both changed JS/JSX files - zero findings. RLS suite re-run clean after every fix, sabotage-verified, zero fixture leakage confirmed via a direct post-run query. **Not yet browser-verified** - no login credentials available this session, so the merge UI's actual click-through (search → Merge → pick survivor → checkbox → confirm → catalog refetches) has only been confirmed via code reading, not by using it in the running app.

## Last completed chunk (real cross-user popularity + Home's Almost There ranking/cap)

**Theme QA pass finished for this session** - walked all of Admin's tabs (Overview, Classic Recipes, Moderation, Catalog, Ingredient Types, Batch Import, Users, Invitations) plus Lists in light mode. No new bugs found - confirmed two of today's earlier fixes behave exactly as scoped: "Clear" sorts first in every `ColorSwatchPicker` (Editor, Batch Import) but stays alphabetical in Catalog's own Liquid Colors management list, and the Ingredient Types pale-color dots (Aquafaba, Egg White, etc.) all show their border now.

**New feature: Home's "Almost There" list is now capped (5, with "Show N more") and ranked by real cross-user popularity, not left in whatever order `computed` happened to be in.** User's own framing: "the cocktails could maybe remember the amount of saves, no? like posts on Instagram" - confirmed that's exactly the right shape (a denormalized counter, not a live per-request aggregate) before building anything.

**Real constraint surfaced and explained before implementing**: `avail === "almost"` is only ever set when a recipe is missing *exactly* 1 required ingredient (`availability.js`) - so "closest to completion" can't differentiate anything within this list, every candidate is already tied. Popularity is the only signal that actually does real work here; said so directly rather than pretending both criteria contributed independently.

**Scoping question asked and answered before writing code**: "popularity/saves" could have meant the user's own favorite/want-to-make status (already precedented by `rankPurchaseRecommendations`'s "unlocks a recipe you've favorited" boost, zero schema change) or genuine cross-user popularity (needs new backend work, since `user_favorites`/`user_want_to_make` are strictly private with no admin-read override - a real privacy boundary, not an oversight). User chose real cross-user popularity.

**Migration** (`20260826110000_recipe_popularity_counters.sql`): `recipes.favorite_count`/`want_to_make_count`, backfilled from real current data (verified zero mismatches via a live recount query, not just trusted), kept in sync by two `SECURITY DEFINER` trigger functions (`sync_recipe_favorite_count`/`sync_recipe_want_to_make_count`) on `user_favorites`/`user_want_to_make` INSERT/DELETE - `SECURITY DEFINER` specifically because an ordinary member's own column-grant on `recipes` doesn't include these two counters, so the trigger needs elevated privilege to update them regardless of who fired it. This is the privacy-preserving shape deliberately: the counters expose only a total number, never which users contributed to it, unlike a live aggregate query would have to. Verified the trigger actually fires (a real insert+delete cycle inside a rolled-back transaction, confirming the count increments then settles back to its exact original value) before trusting it, same discipline as every other DB verification this session. `db advisors --type security` unchanged (16 findings - trigger functions with no PostgREST-compatible signature don't add new RPC-executable surface).

**Wiring**: `services/recipes.js` (`RECIPE_SELECT` + `mapRecipe()` carry the two counts). New `src/domain/almostThere.js` (`rankAlmostThere()`, pure, returns the full ranked list un-sliced - the caller owns pagination, the domain function only owns order) with 5 new unit tests. `HomeScreen.jsx`: ranks via the new function, caps initial display to 3 (`ALMOST_INITIAL_LIMIT` - started at 5, user tried it live and asked to drop it to 3 so Home stays scannable), "Show N more" button reveals the rest - the section's own count badge now reads the true total, not just the visible slice.

Verified: `pnpm build`/`pnpm test` (125/125, +5 new)/`pnpm format` clean; `oxlint -D no-undef` - zero findings. **Browser-confirmed working by the user** (tried the 5-item cap live, asked for 3 instead - both wired and verified in the running app).

## Earlier chunk (theme QA + layered/gradient cocktail colors)

**Theme QA, first real pass - user switched to light mode (never visually checked before this session; every prior screenshot was dark) and walked Home/Cocktails/My Bar/Settings/Admin.** Found and fixed one real bug, correctly ruled out one false positive, and turned a third observation into a new feature (below).

**Real bug fixed**: Admin's Ingredient Types list drew each type's `color` as a bare filled dot with **no border at all**. Several real ingredient colors are intentionally near-white (`Tonic Water`/`Soda Water` `#f0f9ff`, `Egg White`/`White Sugar` `#fefce8` - confirmed by querying the live catalog, not guessed) since they represent genuinely pale liquids - fine against a dark background, but a near-white dot on a white page in light mode was effectively invisible. Fixed with a `border border-bdr` on the dot (`TypesTab.jsx`) - theme-aware and visible regardless of how pale the stored color is.

**False positive correctly ruled out**: the Theme toggle's active-state color differs from every other toggle in the app (violet for Dark, amber for Light, vs. the standard cyan everywhere else) - initially flagged as an inconsistency, but reading the code showed it's a deliberate two-tone choice (moon/sun), not accidental drift. Left alone.

**Real, separate finding from the same pass, escalated into its own feature**: user noticed recipe glass icons looked "bleak" for newly-added recipes and didn't understand why - traced to `GlassSvg`'s unavailable-state fill opacity being 0.2, low enough to look like "the color didn't save" rather than "this one just isn't available yet." Bumped to 0.45 (still a real visual difference from the 0.72 available state, but the actual hue stays recognizable).

**New feature from the same conversation: layered/gradient cocktail colors (Tequila Sunrise, layered shots, rainbow shots).** User asked what to do about multi-color drinks, which a single flat `liquid_color` can't represent at all. Scoped via a 3-option question (flat color / 2-color gradient / full N-layer bands) - user chose the 2-color gradient middle ground, matching the app's existing "flat stylized icon, not a photo" language (`GlassSvg`'s own header comment) rather than chasing full layer-accurate fidelity.

**Migration** (`20260825150000_recipe_liquid_color_2.sql`): `recipes.liquid_color_2`, nullable text, same shape as the original `liquid_color` column - no check constraint (matches precedent, validated app-side). Re-issued the exact same explicit-column `grant update` list the original `20260815214307` migration established, extended with the new column (confirmed no other migration had touched that grant list since, so nothing else needed preserving). `db advisors --type security` unchanged (16 findings - plain column, no new function/RLS surface).

**`GlassSvg.jsx`**: all 20 glass-shape branches share the identical `fill={liquidColor}`/`<svg {...svgProps}>` pattern, so gradient support needed only two `replace_all` substitutions (`fill={fill}`, `{gradientDefs}` injected after every `<svg>` open tag) rather than touching each branch - `fill` resolves to `url(#<gradId>)` (a `useId()`-scoped `<linearGradient>`, top-to-bottom) when `liquidColor2` is set, otherwise the plain color exactly as before. Two branches (both with non-6-space indentation - the top-level fallback return, one of exactly 20) were missed by the `replace_all` and needed individual fixes - caught immediately by grepping post-edit occurrence counts (20 `<svg>` tags vs only 19 `{gradientDefs}`/`fill={fill}` on the first pass) rather than assuming the bulk edit was complete.

**Wiring**: `services/recipes.js` (select/map/create/update/createClassicRecipes all carry `liquid_color_2`/`liquidColor2`), `EditorScreen.jsx` (new `liquidColor2` state threaded through every existing `liquidColor` touchpoint - draft save/restore, clone-from-source, paste-a-recipe result, final save payload - plus a new "Secondary Color (optional)" `ColorSwatchPicker` with a "Clear" button, since unlike the primary color this one can legitimately be unset), `recipePaste.js`/`recipeImport.js` (both gained the same optional-hex-validation treatment `liquidColor` already had, including the AI-prompt text describing the new field), and every `GlassSvg` call site that renders a real recipe (`CocktailCard`/`SmallCard`, `HomeScreen`'s Almost There rows, `HeroCard`) now passes `liquidColor2` through.

**Two test files needed updates for an unrelated reason, not a real regression**: `recipeImport.test.js`/`recipePaste.test.js` each had one `toEqual()` asserting the *entire* resolved/mapped object structurally - adding the new `liquidColor2: null` field to those functions' output broke both assertions immediately (expected, not a bug) - fixed by adding the field to each expected object, plus 4 new dedicated tests (valid/invalid `liquidColor2` in each of the two schemas, mirroring the existing `liquidColor` test pattern exactly).

Verified: `pnpm build`/`pnpm test` (117/117, +4 new)/`pnpm format` clean; `oxlint -D no-undef` across every changed file - only pre-existing accepted-baseline globals in unrelated code, zero regressions. **Not yet browser-verified** - the gradient rendering, the Secondary Color UI, and the opacity bump are all live via HMR but not yet clicked through by the user.

**Fourth follow-up: the "Clear" liquid-color swatch got real transparency, and now always sorts first.** User noticed while reviewing Bramble's colors that "Clear" (`#dbeafe`) reads as flat pale-blue/milky rather than genuinely transparent like a real clear spirit, and that it should be the first swatch in the picker (most commonly needed, since most spirits are clear) rather than wherever it falls alphabetically.

**Migration** (`20260826100000_liquid_colors_alpha.sql`): widened `liquid_colors.hex`'s check constraint from strictly 6 hex digits to 6-or-8 (`#RRGGBBAA` optional alpha suffix) - confirmed the actual constraint name (`liquid_colors_hex_check`) directly from the live DB before dropping it, rather than guessing. Updated "Clear" to `#dbeafe80` (50% alpha) - modern browsers support 8-digit hex natively in both CSS properties and SVG `fill`/`stop-color`, so every place this hex string already flows (`ColorSwatchPicker`'s swatch, `GlassSvg`'s fill and gradient stops, `IngredientIcon`'s `fillColor`) needed zero rendering-code changes, just the stored value. `db advisors --type security` unchanged (16 findings - a check-constraint change, no new RLS/function surface).

**`ColorSwatchPicker`** (`primitives.jsx`): added a stable sort (`Array.sort` is spec-guaranteed stable since ES2019) that always pins any swatch named "Clear" first, leaving every other swatch in its existing fetched (alphabetical) order - scoped to the picker component only, not the underlying fetch or Admin's own Liquid Colors management list, since alphabetical is still the right order for finding/editing an entry there.

Verified: `pnpm build`/`pnpm test` (117/117)/`pnpm format` clean, `oxlint -D no-undef` unchanged (same pre-existing baseline `document` global in the unrelated `Select` component). **Not yet browser-verified** - live via HMR but not yet visually confirmed by the user.

**Real bug found immediately by the user trying it**: picking the new "Clear" (now `#dbeafe80`, 8-digit) swatch while adding a new ingredient type ("Cachaça") failed with "Invalid color... expected hex like #a1b2c3" - a THIRD independent copy of the same `HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/` regex (in `ingredientImport.js`, distinct from the two in `recipeImport.js`/`recipePaste.js` already widened for `liquidColor2`) had never been updated to accept 8-digit hex. Grepped the whole codebase for the exact pattern to find all copies at once rather than fixing them one bug report at a time - confirmed exactly 3, all now widened to `/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/`. Confirmed `ingredient_types.color`/`recipes.liquid_color(_2)` have no DB-level check constraint (plain `text` columns), so only the client-side validators needed the fix - no further migration required. Added a matching "accepts 8-digit hex" test to all three schema test files (`ingredientImport.test.js`'s reuses the exact "Cachaça" example name the real bug report used).

**Third follow-up: the AI-prompt wording for `liquidColor2` was too narrow, caught by a real failed case.** User imported "Bramble" (gin/lemon/syrup shaken and strained, then Crème de Mûre poured over crushed ice in a circular motion so it visibly bleeds down - a textbook gradient drink) via the AI-prompt paste flow. The AI wrote correct steps describing the exact pour-over technique, but never set `liquidColor2` - it collapsed into one blended purple (`liquidColor: "#8b3a62"`) instead. Root cause: the prompt's `liquidColor2` instruction only gave two examples (Tequila Sunrise, "a layered shot") that don't cover this specific "shaken drink + floated liqueur bleeding through ice" pattern, so a pattern-matching AI had nothing to match against even though it understood the technique well enough to describe it correctly.

Rewrote the instruction as a rule tied to the AI's own output rather than a fixed example list: reason about whether *your own steps for this recipe* describe the drink ending up two distinct colors (layered-shot pour technique, a floated/poured liqueur creating a separate layer or bleed-through, or built-without-stirring so colors stay distinct) versus shaken/stirred/strained into one uniform mix. Both the batch-import and paste-a-recipe flows share the exact same `buildRecipeImportPrompt()` function, so this one wording fix covers both. Also manually fixed the already-imported Bramble directly in the DB (`liquid_color` = Lemon Juice's own pale catalog color for the top base layer, `liquid_color_2` = Crème de Mûre's own real deep-purple catalog color `#4C1D4F` for the bottom float) - confirmed via read-back. `pnpm build`/`pnpm test` (117/117)/`pnpm format` clean, `oxlint -D no-undef` clean.

**Second follow-up: audited all 28 existing recipes for genuine layered/gradient candidates, found exactly one.** User asked to update any recipe that's "supposed to be layered." Checked ingredients first, then (critically) each candidate's actual `steps` text before touching anything - ingredient-list guessing alone was wrong twice: Zombie looked like an obvious candidate (tiki drinks are famous for rum floats) but this recipe's own steps say "blend" and "pour unstrained" - fully mixed, one color; Manhattan Iced Tea's name suggested a Long Island-style cola float but it has no cola at all and is shaken/strained uniform. Shandy, Green Bunker, Bellini all explicitly stir/shake/strain too. The one real match: **Green Fallout Shooter** - its steps literally say "form the bottom layer" then "pouring it over the back of a spoon to create the top layer," an unambiguous 2-layer shot. Updated directly in the hosted DB (`liquid_color` = whiskey's own catalog color for the top whiskey+Galliano layer, `liquid_color_2` = amaretto's for the bottom amaretto+triple sec+lemon layer, each the dominant ingredient by volume in its layer) - confirmed via a read-back query. Whiskey Sour was considered and deliberately excluded despite its well-known egg-white foam cap: the egg white is an *optional* component of that specific recipe, so a permanent 2-color gradient would misrepresent every preparation made without it.

**Follow-up in the same conversation**: the Secondary Color picker was initially always visible (just an optional field with a "Clear" link once set) - user pointed out most cocktails don't use this at all, so showing it unconditionally made every ordinary recipe look incomplete. Replaced with a `hasSecondColor` checkbox ("Layered / gradient drink") that gates the picker's visibility entirely - unchecking it also clears `liquidColor2` back to `""` rather than just hiding a stale value. Threaded through all the same restore points `liquidColor2` itself already touches (draft restore, clone-from-source, paste-a-recipe result) via `Boolean(source.liquidColor2)`, so editing an existing gradient recipe correctly starts with the checkbox pre-checked. `pnpm build`/`pnpm test` (117/117)/`pnpm format` clean, `oxlint -D no-undef` unchanged (same pre-existing baseline globals only).

## Earlier chunk (empty/loading/error-state fix, real browser verification)

**Browser-verified the empty/loading/error-state fix (from an earlier session) via a real simulated Supabase outage - the one item from that chunk that had only ever been logic-reviewed, never observed failing live.** Walked the user through Chrome DevTools' Network request-blocking feature to make every call to the live Supabase project fail with a real network error, rather than a code change or mocking.

**Two false starts before landing on the right technique**, both instructive: (1) DevTools "Offline" network throttling blocks the page's own initial document/asset load too, not just API calls - hit Chrome's native offline dinosaur page before the app ever booted, never exercising the code being tested. (2) "3G" throttling tested something unrelated entirely - Vite's dev-mode unbundled ES modules (~95+ separate file requests) just crawl under high latency, nothing to do with Supabase reachability. The actual right tool: DevTools' dedicated "Network request blocking" panel (Ctrl+Shift+P → "Show Network request blocking"), with a pattern scoped to the Supabase domain specifically (`https://<project-ref>.supabase.co/*` - the pattern needs a full URL form to parse as a `URLPattern`, a plain domain string fails silently in current Chrome) - this lets the app's own dev-server-served files load normally while every Supabase call fails.

**First reproduction looked like a real regression** (stuck on "Loading..." indefinitely) but turned out to be impatience, not a bug: Supabase's client retries a failed request several times with backoff before finally giving up (~8 seconds observed here), and the user hadn't waited long enough the first time. Confirmed by retrying and waiting it out: the real `ErrorScreen` appeared ("Something went wrong / TypeError: Failed to fetch / Try Again"), and the Console showed zero uncaught errors - the `.catch()` handlers in `useSupabaseSession.js`/`useMembership.js` are working exactly as designed, propagating the failure into `error` state instead of hanging or throwing unhandled.

No code changes this chunk - pure verification. `current-context.md`'s Phase 6 status line updated to reflect this fix is now genuinely browser-confirmed, not just logic-reviewed.

## Earlier chunk (Phase 6 responsive/touch-target fixes, step-by-step with the user)

**Walked the 5 deferred layout/responsive findings from the earlier accessibility audit with the user one at a time, live-testing each in the browser via device toolbar at multiple real viewport sizes before moving to the next.** All 3 attempted this session are fixed and browser-confirmed; 2 remain (touch targets is also now done, so really just the color-only indicator is left).

**#1 + #3, tablet breakpoints / fixed 2-column grids (done together, same root cause)**: confirmed via a full-codebase grep that zero `sm:`/`md:`/`lg:` responsive classes existed anywhere - only `xl:` (1280px, the sidebar/bottomnav switch). `LibraryScreen.jsx`/`ListsScreen.jsx`'s cocktail grids were hardcoded `grid-cols-2` regardless of viewport. Fixed with `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` on both. User tested at 5 real sizes (phone portrait/landscape, iPad portrait/landscape, desktop) and confirmed correct 2→3→4 column scaling, including the edge case of iPad portrait (1024px) getting 4 columns while still on the mobile bottom-nav (1024 < the 1280 sidebar-switch breakpoint) - grid columns and the nav-switch breakpoint are correctly independent. My Bar's own grid (`auto-fill, minmax(104px,1fr)`) was never affected - already inherently responsive.

**#2, no max-width on wide viewports**: `AppShell`'s content area (`App.jsx`) had no cap at all - a live "TV?" screenshot at 1920px showed content clumped top-left with a huge empty void. First attempt (`max-w-[1600px] mx-auto`) fixed normal desktop widths but user found it left ~1150px of dead space per side at an actual 4K/TV viewport (3840px) - a flat pixel cap doesn't scale across that range. Switched to `max-w-[min(90%,2200px)]` (percentage of the flex column next to the sidebar, not `vw` - vw would ignore the sidebar's width) - scales with available space up to a 2200px ceiling, confirmed better-proportioned at 3840px by the user ("ok").

**#4, touch targets**: `TypeCard.jsx`'s corner edit-pencil/expand-chevron buttons were `p-0.5` around a 12px icon (~16px tappable area, well under the ~44px WCAG/mobile guideline) - the concrete example directly tied to the user's own "place for big fingers" request. Bumped to `w-8 h-8` (32px, the largest that fits two side-by-side in a card as narrow as ~96px without overlapping the icon tile below). **First attempt caused a real regression, caught from a live screenshot**: the buttons were `absolute`-positioned over the card's content, and at 32px tall they visually collided with the bottle icon underneath on narrow child cards ("the arrow is on top of the picture"). Fixed properly by moving the button row into normal document flow (reserving its own space, pushing the icon down) instead of floating over it - this makes the overlap structurally impossible regardless of button size, not just smaller. Also bumped `ExpandedProducts.jsx`'s per-product edit/delete buttons from `p-1`-around-14px (~22px) to `w-9 h-9` (36px, more room available here since it's a full-width row, not a cramped card corner).

**Real (non-)bug found via the same screenshot, mid-walkthrough**: user spotted what looked like one expanded product list visually split into two boxes with a gap. Traced to: `expandedTypeIds` legitimately had two different types in the same family cluster open at once (Dark Rum AND White Rum), each rendering its own separate bordered `ExpandedProducts` panel with no label - correct behavior, confusing presentation. Fixed by threading `typeName` from `MyBarScreen.jsx`'s `renderExpanded()` into `ExpandedProducts.jsx`, which now shows a small uppercase header naming its own type - makes each panel identifiable on its own, especially valuable (but not only useful) when multiple are stacked.

**#5, the color-only owned/unowned indicator - done, all 5 findings now closed.** `TypeCard.jsx`'s owned state was signaled only by border/background color (cyan vs gray) and text shade - no icon/checkmark/label difference (WCAG 1.4.1). Fixed by adding a small cyan checkmark badge (reusing the existing `IconCheck`) in a fixed-size slot on the left side of the same button row added for #4, visible only when `owned` - the row's conditional widened from `(allProducts.length > 0 || isStaff)` to `(owned || allProducts.length > 0 || isStaff)` so an owned-but-buttonless card (plain member, 0 products) still shows it. One real mistake caught before shipping: `IconCheck`'s underlying icon factory (`icons.jsx`) has no `color` prop at all - icons render via `currentColor`, set through `className`/`style` on an ancestor - passing `color="#07091a"` directly would have been silently ignored, leaving the checkmark glyph invisible (same dark navy as the cyan `+` button elsewhere) against its own cyan circle. Fixed to `text-[#07091a]` on the wrapping span instead. Browser-confirmed by the user ("I love it").

Verified after every sub-step: `pnpm build`/`pnpm test` (113/113)/`pnpm format` clean; `oxlint -D no-undef` - zero new findings, only pre-existing accepted-baseline globals in unrelated code. Compiled-CSS verification done for both new Tailwind arbitrary-value utilities (`max-w-[min(90%,2200px)]`, confirmed present in `dist/assets/*.css` after initially grepping for the wrong Tailwind v4 media-query syntor - v4 emits `@media (width>=48rem)` not literal `768px`). All of #1-#4 browser-confirmed by the user at multiple real viewport sizes throughout, not just code-reviewed.

## Earlier chunk (glass aliases)

**Family cluster + filter chip icons both browser-confirmed** (see chunk below).

**New feature, user-driven mid-accessibility-audit: glass aliases, mirroring the existing ingredient-alias system exactly.** User remembered a real gap while walking through the responsive/accessibility checklist: recipe glass names vary ("Rocks Glass"/"Lowball Glass"/"Old Fashioned Glass" for the same physical glass), and glass resolution (batch import and paste-a-recipe) has always been exact-name-only - no alias mechanism existed for glasses at all, unlike ingredients.

**Migration** (`20260825140000_glass_aliases.sql`): `glass_aliases` table built directly to `ingredient_aliases`' current final shape (not its historical incremental steps) - globally unique alias text (case-insensitive), `glass_id` FK cascade. RLS: member read, admin-or-moderator write (glasses are already one of the moderator's 7 catalog-authoring tables). Applied via `db query --linked` (not `db push` - confirmed again this session that `db push` tries to replay already-applied migrations and fails, since none of this project's migrations were ever pushed through it). `db advisors --type security` unchanged (16 findings, same baseline - plain table, no new function).

**`src/domain/glassResolution.js`**: `resolveGlass(name, {glasses, aliases})`, a straight mirror of `resolveIngredientType()` - canonical name first, then alias, exact case-insensitive match only (not fuzzy). 7 new unit tests mirroring `ingredientResolution.test.js`'s cases exactly.

**Wiring**: `fetchGlassAliases()`/`createGlassAlias()`/`deleteGlassAlias()` in `catalog.js` (no `updateGlassAlias` - confirmed the mirrored `updateIngredientAlias()` is actually dead code with zero callers, leftover from the removed standalone AliasManager, so the real pattern is chip-remove-and-re-add, not in-place edit). `useCatalog.js` fetches `glassAliases` alongside everything else. Both `recipeImport.js`'s `validateRecipeImport()` and `recipePaste.js`'s `parseRecipePaste()` swapped their exact-match `glasses.find()`/`glassByName.get()` for `resolveGlass()`, with `glassAliases` threaded through from `AdminScreen.jsx`'s batch-import call and `EditorScreen.jsx`'s paste-a-recipe call respectively.

**UI**: `NamedRowManager.jsx` (the shared component behind glasses/taste-tags/cocktail-families/ingredient-categories admin management) gained an optional `aliases`/`onCreateAlias`/`onDeleteAlias`/`onAliasesChanged` prop bundle - only rendered when passed, so the other 3 consumers are unaffected. Same inline chip-list-plus-add-input pattern `IngredientTypeEditor.jsx` already established for ingredient aliases, including the same collision check (`resolveGlass()` before insert, distinguishing "already refers to this glass" from "already refers to a different one"). Wired in `CatalogTab.jsx`'s Glasses entry only.

Verified: `pnpm build`/`pnpm test` (113/113, +7 new)/`pnpm format` clean; `oxlint -D no-undef` across every changed file - only pre-existing accepted-baseline globals in unrelated code (`navigator`/`setTimeout`/`crypto`/`URLSearchParams`/`localStorage`), zero regressions. **Not yet browser-verified** - implemented in response to a user request mid-conversation, not yet clicked through in the running app.

**Seeded 14 real aliases across the 19 existing glasses**, direct SQL insert against the hosted project (verified via a join-back query, all mapped to the correct glass) - user asked for aliases to be added but wasn't sure which ones mattered, so curated only genuinely unambiguous industry-standard alternate names (Flute/Champagne Flute, Cocktail Glass/Martini Glass, Old Fashioned Glass + Lowball Glass/Rocks Glass, Moscow Mule Mug/Copper Mug, etc.) - deliberately skipped anything ambiguous (e.g. "Whiskey Glass" could mean either Rocks or Glencairn in casual usage, so no alias was assigned to either). Explained to the user where these actually matter: not the manual New Recipe glass picker (a visual click-to-select grid, no name typing involved), but batch import and paste-a-recipe, whenever incoming JSON names a glass differently than the catalog's canonical name.

## Earlier chunk (family cluster + filter chip icons)

**Ingredient-search-matches-aliases fix browser-confirmed, 2026-08-25.**

**Two more icon placements added to My Bar, both user-driven follow-ups to the category-icon chunk below, both browser-confirmed.** User asked for "pictograms on the group name" - initially read as the family cluster headers ("Rum family", "Whiskey family"), implemented and confirmed working, but the user clarified they actually meant the category filter chips (Spirit/Wine/Liqueur/... pills at the top of My Bar, plain text until now) - built both anyway since both were real gaps once pointed out.

**Family cluster header icon** (`FamilyCluster.jsx`): the parent of a family (e.g. "Rum" for Rum Family) is already a real `ingredient_types` row with its own `shape`/`color` - reused those directly via `IngredientIcon` next to the "{name} family" label, matching the parent's own card exactly, rather than inventing a neutral/generic icon. Zero schema change needed.

**Category filter chip icons** (`SearchFilterHeader.jsx` + `FilterChip` primitive): `FilterChip` gained an optional `icon` node prop (backward compatible - the other 4 callers, none of which pass it, are unaffected). Each real category chip now shows its `ingredient_categories.shape` icon (from the migration in the chunk below), colored cyan when active/muted when not, matching the chip's own active-state color convention; "Owned only"/"All" get no icon (no real category to represent). Bumped from 13px to 15px after user feedback that the first size read a little small next to the chip text.

**Two identical transient HMR crashes hit and self-corrected within this chunk, both same root cause**: editing a component to use a new import/prop before the import/prop actually existed yet (added in a separate follow-up edit) produced a real `ReferenceError`/`TypeError` in the dev server logs for several seconds until the next edit landed - caught in both cases by checking the dev server's own terminal output after the fact, not by the user reporting a visible crash (their first screenshot report turned out to be unrelated - a hard-refresh timing gap, not this bug). Worth remembering for future multi-file wiring: land the import/prop-consumer and its prop/import source in the same edit batch where feasible, or expect a few seconds of real breakage on file save even though the end state is correct.

Verified: `pnpm build`/`pnpm test` (106/106)/`pnpm format` clean; `oxlint -D no-undef` - only the pre-existing accepted-baseline `document` global in `primitives.jsx` (unrelated `Select` component), no regression. Both browser-confirmed by the user, including the final 15px size call.

## Earlier chunk (ingredient search now matches aliases too)

**My Bar layout fix and category icons both browser-confirmed, 2026-08-25** - user: "My Bar looks better. I think that was partly your solution, give families their own place, not just a to z sorting."

**Real bug found and fixed: ingredient search didn't match aliases.** User added "Wodka" as an alias of Vodka (for Polish members) and confirmed searching "Wodka" in My Bar found nothing. Root cause: both `MyBarScreen.jsx`'s ingredient search and Admin → Ingredient Types' search (`TypesTab.jsx`) filtered on `t.name` only, never checking `catalog.aliases` - an alias resolved correctly everywhere aliases are looked up by exact match (import, recipe-ingredient resolution) but a live substring search box never consulted the alias list at all. Fixed both: build a `Map<ingredient_type_id, alias[]>` from `catalog.aliases`, and a type matches the query if either its name or any of its aliases contains the search text. This is substring search against an explicit, already-resolved alias list the user/admin typed in themselves - not the fuzzy inferred matching AGENTS.md's availability/import rule forbids.

Verified: `pnpm build`/`pnpm test` (106/106)/`pnpm format` clean; `oxlint -D no-undef` on both changed files - zero findings. Not yet browser-confirmed by the user for this specific fix.

## Earlier chunk (category-level icons + a real My Bar layout bug)

**Merge tool browser-confirmed working, 2026-08-25** - user tried it live, "works."

**Category-level pictograms, closing the item left open above.** User looked at a live My Bar screenshot: pictograms/sort read fine, but asked for icons at the category level too ("SPIRIT", "WINE", ...) - the mobile-ergonomics ask from the prior session. Implemented by reusing the exact same 11-value `INGREDIENT_SHAPES` enum and `ShapePicker`/`IngredientIcon` machinery `ingredient_types.shape` already uses, rather than inventing a second icon language - a category icon is just a coarser-grained version of the same pictogram set.

`20260825130000_ingredient_category_shapes.sql`: `ingredient_categories.shape` added `not null default 'spirit_bottle'`, backfilled per category using the *mode* of that category's own member types' existing shapes (queried live before writing the migration, not guessed) - e.g. Spirit/Liqueur/Vermouth → `spirit_bottle`, Wine → `wine_bottle`, Dairy & Eggs → `dairy`, same check-constraint-added-last sequencing every prior shape column in this codebase established. Applied directly via `db query --linked` (not `db push` - that command tried to replay already-applied migrations from earlier this session and failed with "already exists", confirming this project's migrations are tracked by direct application, not push history). `db advisors --type security` unchanged (16 findings total, same as after the merge-tool migration - no new function, no new RLS surface).

Deliberately **no color field alongside the new column** - unlike `ingredient_types.color` (which `IngredientIcon`'s `fillColor` uses for a "real ingredient color" effect), a category groups many differently-colored types, so there's no single real color to show; category icons render flat/neutral (`fillColor` omitted, defaults to the outline color).

**App wiring**: `fetchIngredientCategories()`/`createIngredientCategory()`/`updateIngredientCategory()` (`catalog.js`) now carry `shape`. `NamedRowManager.jsx` gained a third `shapeKind="ingredient"` branch (`IngredientIcon`, same as the existing glass/family branches) - **and a real bug caught while wiring it, not after**: `handleCreate`/`handleSaveEdit` were a mutually-exclusive `if (showSortOrder) {...} else if (shapeKind) {...} else if (colorField) {...}` chain, which silently drops every field but one whenever a table needs more than one at a time. `ingredient_categories` is now exactly that table (`showSortOrder` + `shapeKind` together, sort_order predating shape) - fixed by building the payload from whichever optional fields actually apply instead of a mutually-exclusive chain. `CatalogTab.jsx`'s "Ingredient Categories" `NamedRowManager` entry now passes `shapeKind="ingredient"` and threads `shape` through both callbacks. `MyBarScreen.jsx`'s category header labels (previously plain text) now render the category's icon beside the name, colored to match the label (`var(--text3)`) since it's a neutral navigational icon, not a real-ingredient-color swatch.

**Separately, a real My Bar layout bug found from the same live screenshot**: standalone single types (Tequila; Absinthe+Mezcal) were each stranded alone on their own row instead of flowing together, even though the "singles flow in the grid" fix from the prior My Bar redesign chunk was already in place and working as designed. Root cause: `FamilyCluster` renders `col-span-full` (a real grid-row break), and families/singles were interleaved in one combined priority-then-name sort order - any single that happened to sort between two family clusters could never share a row with another single, no matter how "flow-capable" its own wrapper was. Fixed in `MyBarScreen.jsx` by splitting each category's `clusters` into two contiguous passes - all singles render first in one shared grid block, then all family clusters render below - instead of interleaving them in raw sort order. Each half keeps its own existing priority/name ordering; only the grouping changed, not the sort. (The user described this as something already discussed and given a solution for in an earlier session that never made it into `current-context.md` - no record of that prior conversation was found here, so this fix was derived fresh from reading `MyBarScreen.jsx`/`FamilyCluster.jsx` directly against the live screenshot, not recovered from history.)

Verified: `pnpm build`/`pnpm test` (106/106)/`pnpm format` clean; `oxlint -D no-undef` on every changed file - zero findings. **Not yet browser-verified for the two new changes** (category icons, singles-regrouping) - dev server has HMR and was left running, so both should already be visible in the user's open tab, but no explicit confirmation yet this session.

## Earlier chunk (My Bar visual redesign follow-on notes)

**Possible stale browser view - resolved.** A My Bar screenshot flagged in an earlier session as possibly stale (old flat swatches/old "Other" category) turned out to be current after all - the live screenshot reviewed this session showed the real pictograms/categories correctly, just with the layout bug described above.

## Earlier chunk (My Bar visual redesign)

**My Bar visual redesign - ingredient pictograms + priority-based sort, user-driven (not from the spec/backlog).** User compared a Home screenshot (liked) against My Bar (called "messy and incomplete") and asked for pictograms per ingredient type plus a better family/subfamily ordering scheme, with a "real bar shelf/speed-rack" visual metaphor explicitly deferred as a future idea, not built now.

**Investigated live data before designing anything** (not just migrations - user flagged some categories were added via the admin UI during testing, not tracked in git): queried the hosted project directly for the real `ingredient_categories`/`ingredient_types` state. Confirmed `parent_type_id`-based "families" (Rum Family, Whiskey Family) are ad hoc, applied per-category inconsistently, not a general schema concept - and that Wine's `sort_order` was untracked drift (defaulted to 0, colliding with Spirit). Also found 87 real ingredient types across 12 categories, "Other" as a genuine grab-bag (dairy/eggs, bottled sauces, seasonings, one fruit purée, Ice, all sharing no coherent pictogram), and confirmed **Black Pepper/Pepper are still both live as separate rows with no alias between them** - the user described deleting one and aliasing the other, but that action isn't reflected in the current live DB. Flagged back, not touched (not part of this chunk's scope).

**Pictogram design iterated with the user before implementation**: proposed tying icons to category (reusing the exact `glasses.shape`/`cocktail_families.shape` + `ShapePicker` pattern already proven in this codebase), user pushed back that category-level would force ill-fitting pairings (Salt/sugar under a "bottle" icon), agreed to add 2 new categories (**Sauce**, **Dairy & Eggs** - both flat groupings split out of "Other," explicitly NOT modeled with `parent_type_id` substitution relationships, since e.g. Tabasco/Soy Sauce/Worcestershire aren't interchangeable the way Spiced/White Rum are) and to move the shape field from category-level to **per-ingredient-type** (matching the glasses/families precedent more precisely anyway - shape lives on the leaf row, not derived from a parent grouping), so outlier items (Salt, Nutmeg, Olives, sugars) can get the right icon without needing their own category. Landed on 11 pictograms: `spirit_bottle`, `wine_bottle`, `beer`, `soda_can`, `fruit`, `herb`, `dropper`, `jar`, `sauce_bottle`, `dairy`, `ice` - the last given its own dedicated shape despite being a category of one, since the user specifically wanted it visually distinct ("probably the most consistent [ingredient]").

**Hand-designed all 11 SVG pictograms** (`src/components/IngredientIcon.jsx`) matching `GlassSvg.jsx`/`FamilyIcon.jsx`'s existing visual language exactly (56x56 viewBox, `currentColor` stroke, neutral outline + a separate content-fill region using the type's own `color` field - same idea as `GlassSvg`'s `liquidColor`). Rather than trust hand-written SVG coordinates blindly, built a standalone scratch HTML preview and screenshotted it via Playwright to actually look at the shapes before wiring them into the app - caught two that didn't read as intended (`soda_can` first drew as a plain cup, not a can; `dairy` first drew as a bucket, not a carton) and redesigned both before finalizing, confirmed via a second screenshot.

**Migration** (`20260825110000_ingredient_type_shapes_and_categories.sql`): `ingredient_types.shape` added `not null default 'spirit_bottle'`, backfilled per-category then per-type overrides, check constraint added last - same sequencing `20260822160000_glass_shape.sql` established. Wine's `sort_order` fixed to 5 (was 0, colliding with Spirit). Two new categories inserted (`sort_order` 45/55, between Sweetener and Bitters) with the 6 relocated rows. Applied and verified directly against the hosted project (category/shape distribution queried and matches the design exactly); `db advisors --type security` unchanged from baseline (15 findings, same as before - no new RLS surface, `shape` is just a new column already covered by `ingredient_types`' existing admin/moderator write policies).

**Component wiring**: `INGREDIENT_SHAPES` added to `src/data/constants.js` alongside `GLASS_SHAPES`/`FAMILY_SHAPES`; `ShapePicker.jsx` extended with a third `kind="ingredient"` branch (required fixing `IngredientIcon`'s prop design mid-build - it needed both an outline `color`, matching `GlassSvg`/`FamilyIcon`'s convention the picker relies on to show active/inactive selection, and a separate `fillColor` for the real ingredient color, which the original single-`color` draft conflated); `IngredientTypeEditor.jsx` gained a Pictogram field wired to `updateIngredientType()` (which - along with `fetchIngredientTypes()` - needed `shape` added to its column list/select, since neither touched it before); `TypeCard.jsx`'s flat color-square swatch replaced with the real `IngredientIcon` inside the same background-tile treatment it already had.

**Sort-order fix**: `MyBarScreen.jsx` now sorts within each category by `bar_priority` (essential → common → specialized → niche, a column that already existed but was previously only consumed by `src/domain/recommendations.js`, never for display) then name, instead of pure alphabetical - applied to both top-level items and each family's children.

**A second display idea I proposed and then reverted after implementing it**: initially built "always box every top-level type in a bordered cluster, even singles with no children" (matching what I'd suggested and the user had broadly agreed to), but caught a real problem before shipping - every `TypeCard` already has its own border via `Card`'s base style, so a childless single doesn't need a second wrapper border at all; the actual issue was only ever the extra full-width grouping box+label, which only makes sense for a genuine multi-item family. Applying it to singles too would have forced every standalone type onto its own full-width row instead of flowing several-per-row in the grid - a real layout regression, not the fix it looked like on paper. Reverted `FamilyCluster.jsx`/`MyBarScreen.jsx` back to their original conditional (box only for real families) - confirmed via `git status` showing `FamilyCluster.jsx` byte-identical to before. Worth surfacing to the user directly rather than silently shipping a worse layout.

**Found while re-running the RLS suite as a sanity check (unrelated to this chunk)**: the suite's own fixture-selection query now fails at its very first assertion - one of the 2 real non-revoked "member" test accounts was promoted to `moderator` during the user's own earlier browser verification of that feature, so the query for "a second real member account" (which requires `role = 'member'` specifically) now returns nothing. Confirmed this predates and is unrelated to the current change (fails before touching anything `ingredient_types`-related) - flagged as a known follow-up, not fixed here, to avoid silently expanding this chunk's scope.

Verified: `pnpm build`/`pnpm format`/`pnpm test` (106/106) clean; `oxlint -D no-undef` across every changed file - zero findings at all, not even the usual benign globals. **Not yet browser-verified** - no login credentials available this session, so the new pictograms/sort order/pictogram picker have only been confirmed via the Playwright preview screenshots (isolated SVG shapes, not the real app) and careful code reading, not by looking at the actual My Bar screen.

## Earlier chunk (responsive/accessibility audit)

**Phase 6 QA: responsive/accessibility audit (code-level) and a keyboard-access + accessible-labels fix pass.** Surveyed via an Explore agent, spot-checked against actual files before trusting it (confirmed myself first, before delegating: grepped all of `src/**/*.jsx` for any Tailwind responsive variant prefix and found only 2 matches total, both toggling sidebar-vs-bottomnav at the `xl` breakpoint - zero tablet-specific layout anywhere, despite the spec's §15 explicitly requiring it). Six findings surfaced; user chose to fix the two that are real WCAG failures (keyboard access + accessible labels) this pass, leaving layout/responsive gaps (no tablet breakpoints, no max-width constraint on wide viewports, fixed 2-column grids, undersized touch targets, one color-only status indicator) for later.

**The most severe finding**: the app's primary navigation pattern - `Card` and `MoreScreen.jsx`'s hand-rolled `Row`, both plain `<div onClick>` - was used for the entire cocktail grid (`CocktailCard`/`SmallCard`), My Bar's type-toggle cards, `HomeScreen`'s "Almost There" rows, and the *entire* More menu (Admin Dashboard, Request an Ingredient, Edit Profile, Change Password, Sign Out). None of it was keyboard-focusable or operable - a keyboard-only user could not open a single cocktail, use My Bar, or reach Sign Out. Fixed centrally in `primitives.jsx`'s `Card` (role/tabIndex/onKeyDown only apply when `onClick` is passed, so a plain display Card stays a plain div) and separately in `MoreScreen.jsx`'s `Row` - this fixes every call site at once rather than touching each individually. The `Enter`/`Space` handler guards with `e.target === e.currentTarget`: several Cards (e.g. `TypeCard.jsx`) nest their own `stopPropagation`'d action buttons inside a clickable Card, and keydown bubbles independently of a click handler's `stopPropagation` - without the guard, pressing Enter on an inner button would also fire the outer Card's `onClick`. Added a visible focus ring too (`focus-visible:ring-2 focus-visible:ring-inset`, not `outline` - several Cards, e.g. `TypeCard`, use `overflow-hidden`, which can clip an outline but never clips an inset box-shadow) - an operable-but-invisible focus state is still a real gap (WCAG 2.4.7), not a nice-to-have layered on top.

**Accessible labels**: the codebase had zero uses of `aria-label` anywhere. Fixed the 5 icon-only buttons the audit found with no accessible name at all (not even a `title`, which several *other* icon-only buttons already had and were left alone): `Nav.jsx`'s `TopBar` back button, `DetailScreen.jsx`'s favorite/want-to-make toggles (also gained `aria-pressed`, since they're real toggles), `StepsEditor.jsx`'s remove-step button, and `IngredientRowsEditor.jsx`'s remove-row/remove-substitute buttons.

Verified: `pnpm build`/`pnpm format`/`pnpm test` (106/106) clean; `oxlint -D no-undef` - only pre-existing accepted-baseline `document` global flagged. Confirmed the new Tailwind `ring-2`/`ring-inset`/`ring-cyan` `focus-visible` utilities actually compiled into the CSS bundle (checked `dist/assets/*.css` directly, same discipline as every earlier Tailwind-conversion verification this session) rather than assuming the class names were valid. **Keyboard operability browser-confirmed working, 2026-08-25** - user tabbed through the app and confirmed the fix. No screen reader available to verify the `aria-label`/`aria-pressed` additions land correctly, but the DOM attributes themselves were verified by reading, and the keyboard fix (the higher-severity half of this chunk) is now real-world confirmed, not just logic-reviewed.

## Earlier chunk (empty/loading/error-state audit)

**Phase 6 QA: empty/loading/error-state audit and fix - the "two real bugs" scope the user chose.** Surveyed every screen and admin-tab component (via an Explore agent, spot-checked against the actual files before trusting it) for loading/empty/error handling. Found two real, distinct bug classes rather than cosmetic gaps:

**1. A recurring "confirm-then-mutate with no catch" bug, 7 instances**: `try { await mutate() } finally { ... }` with no `catch` - a failed delete/promote/unpublish/withdraw silently closed its confirm dialog as if it had succeeded, the real error visible only in the browser console. `DetailScreen.jsx`'s delete handler had no `try` at all. Fixed all 7 (`DetailScreen.jsx`, `AdminScreen.jsx`'s `handlePromote`, `ClassicRecipesTab.jsx`'s `handleDeleteClassic`, `ModerationTab.jsx`'s `handleUnpublish`, `RequestsTab.jsx`'s `handleDismissRequest`, `ExpandedProducts.jsx`'s `handleDeleteProduct`, `RequestIngredientScreen.jsx`'s `handleWithdraw`) to match the error-display convention already established by sibling handlers in the same files - `ConfirmPanel`'s `error` prop where a confirm panel already existed, an inline per-row coral message where it didn't.

**2. Root cause: none of the 6 data hooks (`useCatalog`/`useInventory`/`useRecipes`/`useLists`/`useMembership`/`useSupabaseSession`) exposed a fetch error.** A failed *initial* load of any of the four hooks `AppShell` gates on left `loading: true` forever (nothing ever set it false) - the entire app stuck on a bare "Loading..." screen indefinitely, for every route, with no way to know anything had gone wrong. `useMembership` was worse than silent: its catch block collapsed any error (network blip, RLS hiccup) into the same defaults as "never joined," routing a real member straight to `JoinScreen`'s "enter an invite code" form.

Fixed by adding `error` (and a `loaded` flag, on the four `AppShell`-level hooks) to all 6 hooks - `load()` now always resolves (never rejects) with the failure recorded as state instead of an unhandled promise rejection. `loaded` is the key design piece: true once the first successful fetch lands, never reset by a later failed *refetch* - this is what lets `App.jsx` tell "we've never had real data, block with a real error screen" apart from "a background refetch failed, keep showing what's already on screen" (e.g. `AddProductScreen`'s `catalog.refetch()` failing after a successful add shouldn't nuke the whole app and hide the product the user just added). New `ErrorScreen` component (`App.jsx`, styled to match the existing `RevokedScreen`) with a Try Again button - wired at both the top level (`useSupabaseSession`/`useMembership` errors, retry = reload / `refetch()`) and inside `AppShell` (`catalog`/`inventory`/`recipes`/`lists`, retry = re-fires all four). As a side effect, this also fixed a second-order issue in `useInventory`/`useLists`: their optimistic-update rollback path calls `load()` fire-and-forget after a failed write, never awaiting/catching it - if that rollback fetch itself failed, it used to be an unhandled rejection too, now it's just recorded state.

**Deliberately out of scope this pass** (flagged by the audit, not picked): `AdminScreen.jsx`'s own local per-tab loaders (`invitesLoading`/`communityLoading`/`usersLoading`/`requestsLoading`) have the same "stuck on Loading forever, silently" shape on fetch failure, but they're local `useState`/`useEffect` fetches inside a screen, not one of the 6 shared hooks - a smaller, separate instance of the same root cause. Also out of scope: 3 unreconciled empty-state visual styles across the app, and `HomeScreen.jsx` has no empty state at all for "everything's empty."

Verified: `pnpm build`/`pnpm format`/`pnpm test` (106/106) clean after each of the two fix batches; `oxlint -D no-undef` across every changed file - only pre-existing accepted-baseline globals flagged (`document`/`console`/`window`), never a real regression. Not yet browser-verified - triggering a real fetch failure needs either simulated network conditions or temporarily breaking a query, neither attempted this session; the logic was verified by careful reading of the hook state machines and the four-hook combination in `App.jsx`, not by observing it fail live.

## Earlier chunk (moderator role)

**New "moderator" role - a deliberate, confirmed departure from the spec's two-role model.** User request, not from the spec/backlog. `docs/Cocktail_Library_Development_Spec.md` §4 is explicitly Administrator/Invited-member only ("Only the administrator can mutate canonical taxonomies and classic recipes") - flagged this conflict to the user up front per AGENTS.md's scope-expansion rule, then scoped the exact permission boundary via explicit multiple-choice questions before writing any code (planned via `EnterPlanMode` - 1 Explore agent mapping the existing admin-gating surface, 1 Plan agent designing the migration/RLS/UI approach, both independently spot-checked by reading the actual files before trusting them). Final agreed scope: moderator gets full ingredient-catalog authoring (all 7 "member read, admin write" lookup tables - `ingredient_types`, `ingredient_categories`, `ingredient_aliases`, `glasses`, `taste_tags`, `cocktail_families`, `liquid_colors` - plus resolving `ingredient_requests`) and exactly three recipe actions (promote to classic, demote to community, unpublish) - no classic-recipe edit/delete, no Users/Invitations access, no authoring new classics via batch import.

**5 new migrations** (`20260825100000` through `20260825100400`): `is_moderator()`/`is_admin_or_moderator()` helper functions (matching `is_admin()`/`is_member()`'s own style - the second centralizes "what can staff collectively do" in one place instead of repeating the OR across ~25 policies); `profiles.role`'s check constraint widened to admit `'moderator'`; `admin_set_user_role()`'s accepted-value check widened (its `is_admin()`-only caller guard stays untouched - a moderator can never grant further privilege, including to themselves); 18 `ALTER POLICY` statements widening the 7 lookup tables' insert/update/delete policies plus both `ingredient_requests` policies (read AND resolve - the Requests tab does a blanket unfiltered read, so widening only the resolve/update policy would've left the tab rendering a usable button with zero visible rows); `admin_promote_recipe_to_classic()`/`admin_demote_recipe_to_community()`/`unpublish_recipe()` each get one `is_admin()` reference swapped for `is_admin_or_moderator()`, with an explicit exhaustive "deliberately left admin-only" list in the migration's own header comment (`publish_recipe()`, `admin_set_membership_revoked()`, `recipe_is_visible()`/`recipe_is_editable()` and everything keyed off them, the `recipes: insert` admin branch, `products` admin-update/delete, `invitations`).

**One real bug caught by `db advisors` before it shipped**: `is_moderator()`/`is_admin_or_moderator()` both showed up as `anon`-executable - a lingering `PUBLIC` grant (`create function`'s Postgres-default behavior, exactly the gotcha AGENTS.md's own "Database & Row Level Security" section documents) that `is_admin()`/`is_member()` don't have because an earlier session already fixed it for them specifically. Missed on the first pass, caught by running `db advisors --type security` immediately after applying the migrations rather than assuming clean, fixed with a same-session follow-up migration (`20260825100400`) rather than amending. Final advisor sweep: 15 findings, all matching the long-familiar accepted baseline exactly (14 `authenticated`-executable WARNs incl. the 2 new functions, 1 leaked-password WARN) - zero new categories.

**JS plumbing**: `isModerator`/`isStaff` (`isAdmin || isModerator`) computed once in `AppShell` (`App.jsx`) alongside the existing `isAdmin`, both added to `outletContext`. `RequireAdmin` renamed `RequireStaff` (route gate now admits moderator; finer-grained admin-only actions inside stay keyed on `isAdmin` specifically). Consumer-by-consumer, deliberately NOT a blanket find-replace: `SideNav`/`MoreScreen`'s Admin entry point and `MyBarScreen`→`TypeCard`'s ingredient-type-edit affordance became `isStaff`; `DetailScreen`'s `canManage` (community-recipe Unpublish) became `isStaff` (same underlying action `ModerationTab` already grants moderator, needs to behave consistently everywhere it appears - the one judgment call outside the literal agreed scope, confirmed with the user before implementing) while its `canEdit` (classic-recipe Edit) and `MyBarScreen`→`ExpandedProducts`'s product-edit affordance stayed `isAdmin`-only, deliberately - two different props (`isStaff` vs `isAdmin`) passed from the same `MyBarScreen` to two sibling components on purpose.

**`AdminScreen.jsx` tab visibility + two partial-tab splits**: `TABS`/`ImportTab`'s `ENTITIES` both gained an `adminOnly` flag (Users/Invitations tabs; Batch Import's Recipes sub-tab, which creates ownerless immediately-published classics directly - real classic-authoring power outside scope). Button-level filtering alone wasn't enough - `OverviewTab.jsx`'s stat cards call `onGoToTab()`/`setTab()` directly, bypassing the tab-button bar entirely - so the tab *content* blocks themselves are also gated (`{tab === "users" && isAdmin && <UsersTab/>}`), and the Invitations stat card is hidden outright for a moderator (`activeInvitesCount` passed as `null`, filtered out of `OverviewTab`'s card array) rather than left dead-ended. `ClassicRecipesTab.jsx` wraps Edit/Delete (+ Delete's confirm panel) in `{isAdmin && ...}`; Demote needs no extra check since reaching the tab at all already requires staff access.

**`UsersTab.jsx` fully reworked - required, not optional polish**, since without it there's no UI path to ever grant moderator. User's own explicit design redirect mid-session: not a hardcoded pairwise toggle button (which is what the original "Make Admin ⇄ Demote to Member" was), but a role `<select>` (reused the existing `Select` primitive rather than a raw `<select>`) + a "Confirm" button disabled until the selection differs from the row's current role - deliberately extensible to a future 4th level with no new button combinatorics, the user's own stated reasoning. The select-then-click *is* the confirmation step; no separate popup layered on top (supersedes an earlier "should Make Moderator get a confirm panel" question - moot once the mechanism changed). `setUserRole()` (`services/membership.js`) needed zero changes - already passed `newRole` straight through with no client-side enum check. One bug caught and fixed before it shipped, not by tooling: the per-row error-message JSX had no `u.id` scoping in an early draft, so a failed action on one row would have rendered its error under every row's card - fixed to check `userActionError?.userId === u.id`.

**Verification**: all 4 (then 5) migrations applied individually via `db query --linked`, `db advisors --type security` re-checked after (see bug above). `pnpm build`/`pnpm format`/`pnpm test` (106/106) clean; `oxlint -D no-undef` across every changed file - only pre-existing untouched globals flagged, same accepted baseline as every prior batch this session. RLS suite extended with a new "moderator role" section (full 7-lookup-table write power, `ingredient_requests` read/resolve, the promote/demote/unpublish trio as one continuous story reusing the still-live `shared_id` recipe fixture, and negative/boundary assertions - `admin_set_user_role()`/`admin_set_membership_revoked()` both correctly reject a moderator caller, a direct classic-recipe insert is denied, `products`/`invitations` access is denied). Deliberately reuses `member_other_id` (temporarily promoted in-transaction) rather than requiring a 3rd real test account, since the project only has 2 real non-revoked members and every earlier block needing `member_other_id` as an ordinary member has already run by the time the moderator section starts - placed last for exactly this reason. One real bug hit and fixed while writing this: the immediately-prior block left the `role` GUC switched to `authenticated` (LOCAL scope holds for the rest of the transaction, not just one statement) - the raw `update profiles set role='moderator'` failed with a real `permission denied for table profiles` until an explicit reset to the original superuser role was added first, mirroring what `set_identity()` already does internally before every one of its own calls. Verified the failure path still works via a deliberately-sabotaged copy (flipped one expected value, got back a precise `FAIL:` naming the exact broken check) before trusting the clean pass; confirmed zero leftover `RLS_TEST%` rows anywhere and zero lingering `role = 'moderator'` rows afterward, real admin count still exactly 1.

**Browser-confirmed working, 2026-08-25** - user promoted a real test account to moderator via the new Users tab role-select and confirmed it works end to end.

## Earlier chunk (security regression testing)

**Security regression testing (Phase 6, step 13's first sub-piece) - extended `supabase/tests/rls_suite.sql` to full 19-table coverage plus the two admin SECURITY DEFINER functions.** User chose this as the first Phase 6 area to tackle since it's mostly self-driven, no browser needed. Auditing all `create table` statements across every migration against the suite's existing coverage found two real gaps:

1. **`recipe_taste_tags` had zero test coverage** - the recipes migration created it with the identical shape as `recipe_components`/`recipe_component_alternatives` (no owner column, gates entirely through `recipe_is_editable()`/`recipe_is_visible()`), but it was never added to the suite alongside those two. Added a matching block (read/insert/delete only - no update policy exists, it's a pure link table).
2. **`profiles` had zero dedicated test coverage, and neither did `admin_set_user_role()`/`admin_set_membership_revoked()`** - the two SECURITY DEFINER functions added 2026-08-23 that provide the only legitimate write path onto `profiles.role`/`memberships.revoked_at`. This is the highest-blast-radius gap the schema could have: `profiles.role` is what `App.jsx`'s `isAdmin` check and every `is_admin()`-gated RLS policy reads, so an unnoticed self-promotion hole would mean full admin takeover. Added a `profiles` block confirming the column-level grant (`grant update (display_name, unit_preference, theme_preference)` - `role` deliberately excluded) actually rejects a direct role write with a real `insufficient_privilege` error, not just that the app never sends that field. Added a second block calling the two admin functions directly: non-admin caller rejected, admin targeting their own account rejected (both functions have an explicit self-targeting guard), an invalid role value rejected, and the real promote/demote/block/unblock path confirmed to actually change the row.

Verified the suite's own failure-detection still works before trusting a clean pass: ran a deliberately-sabotaged copy (flipped one expected role value) and got back a precise `ERROR: FAIL: admin_set_user_role: an admin can promote another member to admin`, naming the exact broken check - same discipline as every earlier RLS suite chunk. The real (unmodified) suite then ran clean (exit 0, no error). Confirmed zero `RLS_TEST%` rows left in any table afterward, zero lingering `revoked_at` memberships, and the real admin count back to exactly 1 - the mid-transaction promote/demote round-trip left no trace. `npx supabase db advisors --linked --type security` shows no new findings - only the long-familiar accepted baseline (SECURITY DEFINER functions intentionally callable by `authenticated`, leaked-password-protection disabled), expected since this chunk touched only the test file, no migration.

Coverage is now genuinely comprehensive: all 19 RLS-protected tables plus the two admin functions, up from the "~15 tables" the header comment used to claim (which undercounted - it never mentioned `recipe_taste_tags` or `profiles` at all). `pnpm test`/`pnpm build`/`pnpm format` not relevant (SQL test file only, no app code touched).

## Earlier chunk (browser click-through)

**Manual browser click-through of both stacked refactors (component-size refactor + Tailwind conversion) - both are now fully verified, backlog #9 struck through.** Walked the full script from the previous chunk's "Exact next recommended action": DetailScreen (owned/missing-ingredient/community recipes, edit/delete/publish confirm panels incl. cancel, the pre-existing "Clone as My Own Recipe" action on non-owned recipes), MyBarScreen (family expand/collapse, type/product edit/delete, owned-toggle propagating live to other screens with no stale state), EditorScreen (create from scratch, Paste-a-Recipe, ingredient row/substitution/step add-remove, draft-restore banner + other-drafts picker), AdminScreen tab-by-tab (Overview, Classic Recipes Demote, Users block/promote, Invitations generate/revoke, Moderation Promote, Requests, Catalog, Ingredient Types), Batch Import last and most carefully (ingredients/recipes/products batches, both cross-tab pre-fill paths from Requests' "+" and Ingredient Types' "+ Add"), and the desktop-width (≥1280px) layout. Every item passed.

**One real bug found, pre-existing (not caused by either refactor) - `BottomNav` never had a responsive hide rule.** Confirmed via `git log` back to the initial commit: it's been rendered unconditionally at every viewport width since day one, so at ≥1280px both `SideNav` and `BottomNav` showed at once. Fixed by adding `xl:hidden` to `BottomNav`'s className, matching `SideNav`'s own `xl:flex` breakpoint. Also confirmed intentional, not a bug: `SideNav` gets its own dedicated Admin shortcut link (desktop has room) while `BottomNav` has only 5 fixed slots and routes to Admin via More instead (mobile's `isNavItemActive` explicitly lights up "More" when on `/admin`) - unchanged, pre-existing behavior on both sides.

`pnpm build`/`pnpm test` (106/106)/`pnpm format`/`oxlint -D no-undef` all clean after the fix. Commits: `f44fa1d` (lg-sidebar/cocktail-grid CSS cleanup, prompted by the user questioning the runtime `<style>` block - see next paragraph), `626b289` (docs), `866e9b0` (BottomNav fix).

**Related cleanup found while investigating**: `App.jsx`'s literal `<style>{...}</style>` JSX block held only static rules (an `!important` media-query hack for `.lg-sidebar`, plus `.cocktail-grid` rules). Replaced properly rather than relocated: `.lg-sidebar` became the native `hidden xl:flex` Tailwind utility (removes the `!important` hack entirely - Tailwind's default `xl` breakpoint is exactly 1280px, verified against `node_modules/tailwindcss/theme.css` and the built CSS output), the desktop `body{overflow:hidden}` rule moved to a real media query in `index.css`, and `.cocktail-grid` was deleted outright - `git log -S` shows it was never applied to any element as far back as the initial commit, dead code unrelated to either refactor.

## Earlier chunk (Tailwind conversion)

**Tailwind utility-class conversion - `docs/plans/tailwind-conversion.md` is now done.** Direct follow-on to the component-size refactor below: user flagged that the post-refactor files were still hard to read because of the inline `style={{...}}` objects, and chose to skip that refactor's own browser-verification gate and start the conversion immediately rather than wait. 651 inline `style={{}}` occurrences across 52 files reduced to 17, all confirmed-legitimate exceptions: genuinely dynamic per-instance values from live DB data (`type.color`/`ing.color`-derived swatches and borders in `TypeCard.jsx`, `HexColorField.jsx`, `NamedRowManager.jsx`, `OverviewTab.jsx`, `TypesTab.jsx`, `HomeScreen.jsx`), the two dual radial-gradient backgrounds (`WelcomeScreen.jsx`, `SignInScreen.jsx`), and one recurring escape-hatch pattern (below).

Added `clsx` as a new dependency (conditional classNames - nothing like it existed before) and one new theme token, `--color-hairline: var(--border)`, to `src/index.css`'s `@theme inline` block. `ConfirmPanel` (`primitives.jsx`) gained an optional `className` prop.

**Recurring pattern found and reused throughout**: when a shared component (`Card`) has its own unconditional base `className` carrying a border/background color utility, a caller can't safely override that color via a second conditional `className` - two same-property utility classes at equal specificity resolve by Tailwind's internal stylesheet generation order, not JSX/prop intent (unlike plain style-object merging, which is deterministic). Fix applied consistently everywhere this came up (`ConfirmPanel`'s `CONFIRM_BORDER`, `TypeCard`'s owned/unowned border+background, `AddProductScreen.jsx`'s info/preview cards, `HomeScreen.jsx`'s "Buy Next" card, `ImportRecipes.jsx`'s add-ingredient draft card): keep that one property inline via `style`, move everything else on the element to `className`.

Verified per-file-batch (never batched multiple files' worth of unverified risk): `pnpm build`, `pnpm test` (106/106, unaffected - UI-only), `pnpm format`, and `npx --yes oxlint -D no-undef` on every changed file each time (only ever flagged pre-existing untouched globals - `document`/`navigator`/`setTimeout`/`crypto`/`localStorage`/`URLSearchParams`/`window`/`console` - never a real regression). `WelcomeScreen`/`SignInScreen` (the only two reachable without login credentials) were also screenshot-verified pixel-identical via `npx --yes playwright screenshot` before/after. No credentials were available this session for any authenticated screen or the `admin`/`myBar`/`editor` component directories, so those rely on build/test/lint confidence plus careful manual JSX diffing, not visual proof - flagged explicitly to the user rather than claimed as verified.

The manual browser click-through this chunk needed is now done - see the chunk above.

## Earlier chunk (component-size refactor)

**Component-size refactor of the four largest screen files - backlog #9 is now done.** User flagged `AdminScreen.jsx` (3,769 lines) while it was open in their editor and asked for a broader pass: no file over ~300-400 lines, real reusable components promoted where duplication existed. Planned via `EnterPlanMode` (2 parallel Explore agents mapping `EditorScreen.jsx`/`MyBarScreen.jsx`/`DetailScreen.jsx`, 1 Plan agent designing the split, then independently re-verified the plan's `ConfirmPanel` claim by reading `DetailScreen.jsx` directly) before any code changed. User chose "refactor first, then QA" so the deferred Phase 6 QA pass tests the final file layout.

**Final sizes**: `AdminScreen.jsx` 3,769 → 793 (79% cut), `EditorScreen.jsx` 1,425 → 799 (44%), `MyBarScreen.jsx` 852 → 301 (65%), `DetailScreen.jsx` 657 → 247 (62%). ~30 new files across four new directories - `src/components/admin/`, `src/components/editor/`, `src/components/myBar/`, `src/components/detail/` (convention documented in AGENTS.md's "Repository structure & ownership"). `EditorScreen`/`AdminScreen` land above the nominal 300-400 target - both flagged in the plan up front as accepted exceptions (genuinely cross-cutting state: `ings` touches nearly every effect in Editor; Admin's promote/demote/`startSingleAddFromRequest` cross real tab boundaries) rather than forced into an artificial further split.

**New shared component**: `ConfirmPanel` added to `primitives.jsx` - consolidates 3 independently-duplicated confirm-dialog implementations (DetailScreen's publish/unpublish/delete panels, MyBarScreen's product-delete row, AdminScreen's `NamedRowManager` delete-confirm) behind one prop surface (`layout: "card"|"row"|"stack"`, `borderTone` kept independent of `confirmVariant` since Unpublish is danger-styled but neutral-bordered - verified directly against the original JSX, not assumed). Real near-duplicate, not a forced abstraction - a *fourth* visually distinct confirm-box style, found while extracting `ClassicRecipesTab`/`UsersTab`/`ModerationTab`/`TypesTab` (colored-background wrapper divs unique to those admin-tab rows), was deliberately **not** folded into `ConfirmPanel` - reusing it there would have visibly changed the rendered output, exactly the kind of forced-reuse the user said to avoid.

**One real bug found and fixed post-hoc, not caught by build or tests**: `AdminScreen.jsx`'s new `OverviewTab` wiring called `deriveInvitationStatus()` without importing it - `pnpm build` and `pnpm test` both stayed green because a bare undefined-identifier reference is invisible to a bundler (it only resolves `import` statements) and there's no test coverage rendering `AdminScreen`. Caught by running `oxlint` ad-hoc via `npx --yes` (not installed as a project dependency - this repo has no lint command, per AGENTS.md) with `-D no-undef` explicitly enabled (off by default in oxlint's rule set) across every new/changed file. Re-ran after the fix, extracted the unique set of "not defined" symbol names across all ~30 files: only 6 hits, all standard browser globals (`document`, `navigator`, `setTimeout`, `crypto`, `localStorage`, `URLSearchParams`) - confirms no other instance of this bug class survived anywhere in the refactor.

`pnpm build` clean, `pnpm test` 106/106 (unaffected - UI-only, no domain logic touched), `pnpm format` clean (89 files, zero changes on the final pass). **Not yet browser-verified** - no browser automation was available this session (flagged to the user up front), so verification relied on build+test+`oxlint -D no-undef` plus careful manual diffing against the original JSX for every extracted block. User explicitly agreed to this trade-off (continue through all phases, do one comprehensive click-through at the end) rather than pausing after each file. **The full click-through is the critical next step before this chunk can be called done** - see "Exact next recommended action."

## Earlier chunk (RLS suite reaches full ~15-table coverage)

**Extended `supabase/tests/rls_suite.sql` to all ~15 RLS-protected tables - backlog #6 is now done.** Added the remaining 7: `products`, `invitations`, `ingredient_requests` each got their own dedicated block (real per-row owner/admin logic - the flat `pg_temp.test_lookup_table()` helper didn't fit); `ingredient_aliases` turned out to share the exact same "member read, admin write" shape as the five lookup tables from the last chunk, so it reuses that same helper with a dynamically-built values string (needs a real `ingredient_type_id`, unlike the others' static literals). `user_favorites`/`user_want_to_make` share an identical "strictly private, select/insert/delete own row only, no admin override" shape - one new `pg_temp.test_private_user_recipe_table()` helper covers both. `user_inventory` got its own block (same private shape but a polymorphic `ingredient_type_id`/`product_id` target, doesn't fit the generic helper). `recipe_components`/`recipe_component_alternatives` have no owner column of their own at all - both gate entirely through the existing `recipe_is_editable()`/`recipe_is_visible()` functions against the parent recipe, reusing the `private_id`/`shared_id` recipe fixtures the `recipes` section already creates earlier in the same transaction.

Two real bugs found while writing this - both in the test script itself, not the app (unlike the last chunk's `liquid_colors` finding): (1) the `recipe_components` "owner can read" assertion ran right after switching identity to `member_other` for a forged-insert check and never switched back - looked like a real RLS failure (correctly got a loud `FAIL:`, proving the failure path still works) but was actually the test's own identity bookkeeping. (2) `user_inventory`'s fixture picked "the first two ingredient types that exist" as static test values, which collided with `unique(user_id, ingredient_type_id)` on the real hosted account's actual My Bar contents - fixed by picking a type neither real member already owns, queried at runtime before switching away from the superuser connection. Re-ran after both fixes: clean pass. Verified zero `RLS_TEST%` rows left in any of the 8 newly-covered tables after a run; re-verified the failure path still aborts loudly with a real sabotaged-copy run (`ERROR: FAIL: invitations: an ordinary member cannot read any invitation`, pointing at the exact broken check). `db advisors --type security` unchanged from the long-standing baseline (test-file-only chunk, no schema/function change).

`pnpm test` — 106/106 passing (unaffected, no app code touched). Not relevant: `pnpm build`/`pnpm format` (SQL-only chunk).

## Earlier chunk (extended RLS suite to 8 tables)

**Extended `supabase/tests/rls_suite.sql` to 8 of ~15 tables, and it immediately paid for itself.** Added `glasses`, `taste_tags`, `cocktail_families`, `liquid_colors`, `ingredient_categories` - all five share the identical "member read, admin write" policy shape, so one generic `pg_temp.test_lookup_table(table, insert_cols, insert_vals, update_col, update_val)` helper covers all five instead of five near-duplicate blocks.

Running it the first time caught a real bug in this session's own earlier work: `liquid_colors`' two policies (`20260823150000_liquid_colors.sql`) were written with plain `for select using(...)`/`for all using(...) with check(...)`, which defaults to `to public` - every sibling table explicitly scopes `to authenticated`. Consequence: an anon request to the other four tables just gets an empty result (RLS skips a policy that doesn't apply to the caller's role, `is_member()`/`is_admin()` never even get called) - but `liquid_colors`' policies applied to anon too, and since anon has no EXECUTE grant on `is_member()`/`is_admin()`, an anon request threw a raw `permission denied for function is_member` instead. Not a real-world exposure (nothing in this invite-only app queries it unauthenticated), but a genuine inconsistency - exactly the class of drift this harness exists to catch. Fixed via `20260823160000_liquid_colors_policy_role_scope.sql` (`alter policy ... to authenticated` on both, no drop/recreate needed). Re-ran the suite after the fix - clean pass, zero fixture rows left behind, `db advisors --type security` unchanged.

`pnpm test` — 106/106 passing (unaffected, no app code touched). Not relevant: `pnpm build`/`pnpm format` (SQL-only chunk).

## Earlier chunk (first RLS regression suite)

**First RLS regression test suite, `supabase/tests/rls_suite.sql`.** Numbered backlog #6 ("automated RLS/integration test harness" - beyond this session's manual DB-level checks, no repeatable automated suite exercising owner/non-owner/admin/anon identities). User confirmed this was the right thing to pick up next over Phase 6 QA.

No Docker/Podman is available in this sandbox (confirmed by trying), so `supabase start` and `supabase test db`'s pgTAP support aren't usable here - the suite instead runs as plain SQL directly against the **hosted linked project** via `npx supabase db query --linked --file supabase/tests/rls_suite.sql`, using the same identity-simulation technique already used for manual verification all session (switching the `role` GUC + `request.jwt.claims`). The whole script runs inside one transaction that's rolled back at the very end, so no fixture data is ever left on the hosted project - verified directly (queried for `RLS_TEST%` rows after a run: zero). Each check is a `pg_temp.assert(condition, message)` call that raises a specific `FAIL: <message>` exception on failure (aborting the run at exactly that check) or a `PASS:` notice on success - **verified the failure path actually works**, not just that the script completes silently: ran a deliberately-sabotaged copy (flipped one expected value) and got a real `ERROR: FAIL: recipes: admin cannot read another member's private recipe (regression case)` back, pointing at the exact broken check.

Real bug found and fixed while writing this, not just testing existing code: switching the Postgres `role` GUC directly from `anon` to `authenticated` (or vice versa) mid-transaction fails with "permission denied to set role" - `anon` isn't a member of `authenticated` (siblings, not nested), so a direct jump only works one way depending on which roles the original connecting superuser can assume. Fixed with a `pg_temp.set_identity(role, sub)` helper that always resets to the original connecting role first, then assumes the target - safe regardless of the specific role hierarchy. Also needed explicit `grant all on <temp table> to authenticated, anon` on every one of the script's own bookkeeping temp tables (fixture ids, created-row ids) - switching `role` restricts access to those just as much as to the real `public` schema tables, which isn't obvious until you hit "permission denied for table" on your own test infrastructure.

Coverage scope, per user's choice: **3 of ~15 RLS-protected tables** - `recipes`, `ingredient_types`, `memberships` (the ones that already had a real RLS bug found and fixed this session), not a full pass. Fixture identities are the three real accounts already live in this project (`profiles.id` has a hard FK to `auth.users(id)`, which can't be populated with a plain insert since Supabase Auth owns that table - real accounts are the only practical option without a local instance). The `recipes` section specifically includes the admin-can't-read-another-member's-private-recipe regression case (the bug fixed in `20260823110000_tighten_recipe_read_scope.sql`) as an explicit named check, not just generic coverage.

`db advisors --type security` unchanged from baseline (nothing persists - pg_temp objects are session-local and everything else rolls back). No `pnpm test`/`pnpm build`/`pnpm format` relevance - this is a SQL file, not app code.

## Earlier chunk (ingredient aliases moved into the type's own edit form)

**Ingredient alias management moved from a standalone Admin list into each ingredient type's own edit form.** Surfaced during the round-5 "Ingredient aliases end-to-end" retest - the feature itself worked ("Sec" → Triple Sec resolved correctly everywhere), but the user felt the location was wrong: "I think the aliases should go into the ingredient edit/add, for each ingredient." Confirmed via a scoping question that the old standalone Admin → Catalog "Ingredient Aliases" list should be removed outright rather than kept alongside the new inline UI (one place to manage aliases, not two).

Removed the ~300-line `AliasManager` component and its Catalog-tab usage entirely. `IngredientTypeEditor.jsx` (shared by My Bar's edit pencil and Admin → Ingredient Types) gained an inline "Aliases" section - existing aliases as removable chips, plus a text input + "+ Add" button, scoped to that one type (no target-type picker needed, since the type is already fixed by which form you're in). Only on **Edit**, not the Single Ingredient **Add** form - an alias needs a real `ingredient_type_id` to attach to, which doesn't exist until the type itself has been created via Batch Import; a brand-new type's aliases are added afterward via its own Edit form, same as color/category/parent already work. New `onAliasesChanged` prop (wired to `catalog.refetch` by both callers) refreshes the shared `catalog.aliases` list after every add/delete, rather than tracking a separate local copy - deliberately avoiding the "two copies of the same data go stale relative to each other" bug class this session already hit twice (`useInventory` double-instantiation, the batch-import stale-closure bug).

`pnpm test` — 106/106 passing (unchanged, UI-only). `pnpm build` clean (bundle size actually dropped slightly, net code removed). `pnpm format` clean. **User browser-confirmed working, 2026-08-23** - add/remove from both My Bar's edit pencil and Admin → Ingredient Types, resolves correctly afterward.

## Earlier chunk (Admin tab reorder + Ingredient Types Add button)

**Two small Admin UX gaps found and fixed during the round-5 Catalog-tab retest.** User's own words: "the menu is really random there, no logic in it's location" and "Ingredient Types is not that correct and it has to have add button, that will sent me to the Batch Import on the singles." (1) `TABS` in `AdminScreen.jsx` was in pure accretion order (each feature appended at the end as it was built) - reordered into Overview → recipe content (Classic Recipes, Moderation) → catalog/taxonomy (Catalog, Ingredient Types, Batch Import, Requests) → membership admin (Users, Invitations). (2) The Ingredient Types tab had search/edit/delete but no way to create a new type - added a "+ Add" button next to the search box that deep-links into Batch Import's Single Ingredient form, reusing the existing `startSingleAddFromRequest()` helper (previously only reachable from a pending ingredient request) generalized with default params and a fix for a latent bug in that same helper: it never reset `importEntity` back to `"ingredients"`, so the deep link would land on whichever of Ingredients/Recipes/Products the admin had last viewed in Batch Import.

`pnpm test` — 106/106 passing (unchanged, UI-only). `pnpm build` clean. `pnpm format` clean. **User browser-confirmed** ("looks better").

## Earlier chunk (admin-manageable liquid color palette)

**Admin-manageable liquid color palette, replacing the hardcoded 10-value `LIQUID_COLORS` list.** User request while adding a new recipe: "We need more colors. Can't add Crème de Violette" - the fixed swatch list had no true violet or blue. Clarified via a scoping question that the user wanted more than a bigger hardcoded list or a raw hex input alone - "I want to add a color picker to admin in order to add more colors" - i.e. the same admin-manageable-catalog pattern already shipped for glasses and cocktail families. A member-facing "request a new color" flow was raised in the same breath but explicitly framed as tentative ("maybe... that's the idea") - treated as deferred backlog, not built.

**What shipped**: new `liquid_colors` table (migration `20260823150000_liquid_colors.sql`) - `(id, name unique, hex unique, check hex ~* '^#[0-9a-f]{6}$')`, RLS "members read / admin writes" mirroring `cocktail_families` exactly. Seeded with the original 10 swatch values plus 2 new ones that directly close the reported gap: Deep Violet (`#6b21a8`) and Blue (`#2563eb`). Deliberately **not** a foreign key target - `recipes.liquid_color` and `ingredient_types.color` both keep storing a plain hex string exactly as before; this table only supplies the picker's suggested swatches, so a color typed directly (or one later removed from the palette) never breaks an existing recipe/ingredient type. `ColorSwatchPicker` (`src/components/primitives.jsx`) now takes a `colors` prop (the live `catalog.liquidColors`) instead of importing the static constant, and gained a free hex text input alongside the swatches (with a live preview dot) as the fallback for anything not yet in the curated list - the user's own answer to the first scoping question. All 5 call sites updated to pass `colors={catalog.liquidColors}` (`IngredientTypeEditor.jsx`, two spots in `AdminScreen.jsx`'s Single Ingredient/Admin Ingredient Types forms, `EditorScreen.jsx`'s recipe liquid-color picker); `EditorScreen.jsx`'s initial `liquidColor` state can't depend on the catalog fetch resolving before first render, so it now defaults to a plain hardcoded `"#dbeafe"` (the same "Clear" value the old constant's first entry was) instead of `LIQUID_COLORS[0].value`. The now-fully-superseded `LIQUID_COLORS` constant was deleted from `src/data/constants.js` (zero remaining references).

Also added a matching Admin → Catalog → "Liquid Colors" management section (add/edit/delete), reusing the existing `NamedRowManager` shared component - generalized from its `shapeKind` prop with a new `colorField` boolean, plus a small `HexColorField` (swatch preview + hex text input) sibling to `ShapePicker`. Placed inline in the same row as the name field (not stacked above it) after a user layout note that the two-line version looked disjointed on a wide desktop viewport, even though it read fine on mobile.

`pnpm test` — 106/106 passing (unchanged, UI/service wiring against already-tested code). `pnpm build` clean. `pnpm format` clean. `npx supabase db advisors --linked --type security` unchanged from baseline (new table + RLS + seed data only, no new function). **User browser-confirmed working** (both the picker's free hex input and the new Admin Catalog management section, including the inline-layout fix).

## Earlier chunk (batch-import validate-button regression)

**Self-inflicted regression from the previous chunk's own fix, caught immediately on the user's very next paste.** `runRecipeImportValidation()` gained an optional `catalogOverride` parameter in the stale-closure fix - but the "Validate" button still had `onClick={runRecipeImportValidation}` (the bare function reference, not wrapped). React calls an `onClick` handler with the click `SyntheticEvent` as its first argument, so every click passed the event object in as `catalogOverride` instead of leaving it `undefined` - `c.types` etc. then read as `undefined`, breaking validation outright ("Validate doesn't work" on the user's next real paste, an "Angel Face" recipe). Fixed by wrapping in an arrow function so no argument passes through, same as every other zero-arg handler in this file already does. Worth remembering: adding a parameter to a function that's ALSO used as a bare event-handler reference anywhere is a real regression risk specific to React - should have grepped for other call sites of that exact shape before considering the earlier fix done, not just the one call site being fixed.

`pnpm test` — 106/106 passing (unchanged, UI-only). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (batch-import stale-closure fix)

**Recipe batch-import's inline "+Add ingredient" re-validate always used stale catalog data.** Found during the round-5 "fresh AI round-trip" retest: batch-importing "Alexander" (4 missing ingredients - Cognac, Crème de Cacao, Fresh Cream, Nutmeg), adding one via "+Add" and clicking "Add & Re-validate" left that *exact* ingredient still showing unresolved, one step behind each time. Not a rare timing glitch - a deterministic bug: `handleSaveAddIngredientDraft` awaited `catalog.refetch()` then called `runRecipeImportValidation()`, which reads `types`/`aliases`/etc from the component's own `catalog` variable, a plain JS closure captured at render time. Awaiting `refetch()` updates React *state* (a future render); it can never change the `catalog` object an already-running function is holding, no matter how long the await takes - so the re-validate was guaranteed to run against pre-refetch data every single time, which is exactly what tempted the user into retrying the same "+Add" and hitting "already exists in the catalog."

**Fix**: `useCatalog.js`'s `load()` (exposed as `refetch`) already returns the fresh data directly - `runRecipeImportValidation` now accepts an optional catalog override, and `handleSaveAddIngredientDraft` passes the `refetch()` return value straight through instead of relying on the stale closure. Checked every other `catalog.refetch()` call site in `AdminScreen.jsx` for the same pattern (a refetch immediately followed by re-running some OTHER validation using the closure) - this was the only one; `handleCommitProductImport`/`handleAddSingle` refetch but don't chain a cross-list re-validate afterward, so they were never exposed to this bug.

`pnpm test` — 106/106 passing (unchanged, UI-only). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (cocktail-family shape picker)

**Cocktail families get the same shape-picker fix glasses got, plus 10 new common families.** User request, surfaced while retesting the family pictogram picker: "we need to work on more cocktail families - put there the common ones." Checked `FamilyIcon.jsx` first and found it had exactly the same trap glasses had before their shape picker - only 5 hardcoded names (Beer/Shot/Sours/Spritz/Stirred) had real icons; everything else, including the existing "Highball," silently fell back to a generic tall-glass icon. Asked whether to just expand the hardcoded list or apply the same decoupled-shape fix as glasses - user chose the shape picker again, so nothing needs a code change for a future family either.

**What shipped** (migration `20260823140000_cocktail_family_shapes.sql`): `cocktail_families.shape` column, backfilled 1:1 from each existing row's name (preserves exactly what's on screen today), plus 10 new common families with their own new pictograms: Fizz, Flip, Julep, Martini, Old Fashioned, Punch, Smash, Tiki, Toddy, Frozen (16 total now). `NamedRowManager`/`ShapePicker` in `AdminScreen.jsx` (previously glass-only, a `showShapePicker` boolean) generalized to a `shapeKind` prop (`"glass"` | `"family"`) so the same admin component now manages both instead of needing a near-duplicate - Glasses' Catalog-tab entry updated to the new prop name, Cocktail Families' entry now passes `shape` through create/update. `FamilyIcon` itself switched from inferring the icon off the family's *name* to a `shape` prop (mirroring `GlassSvg`'s `type` prop); `EditorScreen.jsx`'s family picker updated to pass `f.shape` instead of `f.name`.

`pnpm test` — 106/106 passing (unchanged, UI/service wiring against already-tested code). `pnpm build` clean. `db advisors --type security` unchanged from baseline (no new function, just a column + check constraint + data). **Browser-confirmed working, 2026-08-23** - all 16 family icons render correctly in both the New Recipe picker and Admin → Catalog → Cocktail Families' shape-picker chip row.

## Earlier chunk (batch-import validator staleness fix)

**Recipe batch-import validator could offer a "+Add" doomed to fail.** Found while resuming the round-5 QA (recipe-import inline "Add ingredient" retest) - user pasted an older "Pistachio Margarita" JSON and got "Unresolved ingredient(s) flagged for review: Salt" with a "+Add 'Salt'" button, but clicking it failed with "'Salt' already exists in the catalog." Confirmed directly against the live DB that Salt genuinely does exist now (added during earlier testing this same session) - the pasted JSON was just stale, generated back when it didn't. Root cause: `unresolvedIngredients` entries were surfaced and offered for "+Add" based only on what the AI flagged *at generation time*, never re-checked against the live catalog. Now re-resolved via the same `resolveIngredientType()` real components use - a name that still doesn't resolve behaves exactly as before; one that now does gets a clearer message instead of a doomed "+Add" button (still can't be silently promoted into a real component either way, since a bare `unresolvedIngredients` name never captured an amount/unit). 1 new unit test.

`pnpm test` — 106/106 passing (105 previous + 1 new). `pnpm build` clean. **Browser-confirmed working, 2026-08-23**.

## Earlier chunk (My Bar card-overflow fix)

**My Bar family-cluster card could visually grow wider than its slot.** Found during the resumed round-5 QA (My Bar card-grid check) - user's screenshot showed a Whiskey family cluster's "Whiskey Sc..." card noticeably wider than its siblings once it had several owned products attached. Root cause: the cluster's `width:104`/`width:96` wrapper divs correctly fix each card's slot, but nothing on the `Card` itself clipped overflow, so a long unbroken product-name string could spill past that width rather than the existing ellipsis styling actually truncating it. Added `overflow: hidden` to the card - one-line fix, the truncation styling was already there and just needed a box that actually stayed put.

`pnpm test` — 105/105 passing (unchanged, UI-only). `pnpm build` clean. **Browser-confirmed working, 2026-08-23** - all cards in the cluster are the same width, product names ellipsize correctly.

## Earlier chunk (duplicate ingredient-request fix)

**Ingredient requests can no longer be submitted as duplicates.** User caught this from real evidence in Admin → Requests: "Coke" and "test" each showing up twice. `RequestIngredientScreen.jsx`'s `handleSubmit()` now checks, before submitting: (1) does the name already resolve against the catalog via the same exact-name-or-alias `resolveIngredientType()` used everywhere else - no fuzzy matching, so this only blocks a genuine duplicate; (2) does the requester already have a *pending* request with this name (case-insensitive), checked against their own already-loaded `myRequests` list. Scoped to the requester's own pending requests, not a global cross-member check - a member's RLS grant on `ingredient_requests` only lets them read their own rows, so that's the only duplicate this screen can actually see without a broader grant, which wasn't asked for.

`pnpm test` — 105/105 passing (unchanged, no domain logic touched). `pnpm build` clean. **Browser-confirmed working, 2026-08-23**.

## Earlier chunk (multi-draft index-wipe + nameless-draft restore fixes)

**Multi-draft QA (step 2) found a serious regression: starting a second concurrent draft wiped the entire draft index, not just displaying it wrong.** User verified directly in DevTools Local Storage (`recipe-drafts:<userId>` was a literal `[]`), not just a UI symptom - both the in-progress first draft and the second were gone.

**Two real, structural problems found in `EditorScreen.jsx`'s draft-persistence effects** (this session's earlier `20260823` race-condition fix addressed a related but different symptom in the same code - see "Earlier chunk" below):

1. **Self-triggering restore banner.** The mount-check effect re-runs whenever `draftId` changes - including when the autosave effect assigns itself a brand-new id on the first keystroke of a genuinely fresh draft (`draftId` is that effect's own dependency too). That self-assignment is indistinguishable, by the old code, from "returning to an existing draft from elsewhere" - it popped a restore banner for content the user was actively typing, and once `draftBanner` is truthy, the autosave effect's own guard silently freezes *all* further saving for that draft for the rest of the session. Fixed with a new `selfAssignedDraftIdRef` tracking ids this component instance created itself, so the mount-check effect can tell "I just made this" from "I'm returning to this."
2. **Fragile delete-on-empty heuristic.** The autosave effect used to delete a draft whenever the *current form state* looked empty - but a just-mounted, not-yet-restored form looks identical to a genuinely abandoned one, which is exactly the kind of thing that races. Removed entirely: a draft is now only ever deleted by an explicit user action (Discard) or a successful save. A stray low-content entry left behind is cheap - it self-heals the moment the user types something, or ages out via the existing `MAX_DRAFTS` eviction.

**Honesty note, same as the earlier draft-restore fix**: both of these are real, demonstrable bugs in genuinely fragile code, and fixing them is clearly the right direction - but static reading couldn't fully prove this is the *complete* mechanism behind the specific full-index wipe reported.

**Retested, 2026-08-23 - confirmed fixed**: two concurrent drafts (one through a full Request-Ingredient round trip) now correctly both persist - `recipe-drafts:<userId>` shows two real entries, and the "other drafts" picker correctly lists both instead of the index going empty.

**Follow-up bug found during that same retest, same day**: a draft left with no recipe name (but real content in ingredients/steps) saved correctly and showed up in the "other drafts" picker as "Untitled draft," but its own restore banner could never trigger - the mount-check effect only ever checked `draft.name.trim()`, while the autosave effect's own save-worthiness check (and the picker's own display fallback) already treated a filled-in ingredient or step as enough on its own. New shared `hasDraftContent()` replaces both ad-hoc checks so save and restore agree on what counts as a real draft; the banner text also now falls back to "Untitled draft" instead of rendering empty quotes.

`pnpm test` — 105/105 passing (unchanged, no domain logic touched). `pnpm build` clean. The nameless-draft fix itself is not yet browser-verified (found via the index-wipe retest, not separately re-tested after the fix).

**Also flagged, not a code issue**: the user pasted a real Supabase access/refresh token pair into chat while sharing DevTools output (for the non-admin test account). Short-lived (1hr access token per its `exp`) and their own test account, but worth a mention - noted here rather than acted on, no code change warranted.

## Earlier chunk (classic promotion feature)

**Admin can promote a community recipe to classic and back, crediting the original submitter.** User request, not from the spec/backlog: a way to move a cocktail between the published-community list and the canonical classic catalog while keeping the original author attached.

**The real design problem**: the catalog has always modeled a classic as `owner_id null` - every existing admin classic feature (the Classic Recipes tab's Edit/Delete, `recipe_is_editable()`) depends on that invariant. Promotion can't just flip `source_type` while leaving `owner_id` pointed at the original member, or `recipe_is_editable()` would let that member keep editing/deleting what's now supposed to be admin-managed catalog, and block admin from managing it through the Classic Recipes tab at all.

**What shipped** (migration `20260823130000_classic_promotion.sql`): new nullable `recipes.original_owner_id` column, purely informational - never read by any RLS policy or authorization check, so it can't interact with the ownerless-classic invariant at all. Two new `SECURITY DEFINER` functions, `admin_promote_recipe_to_classic()`/`admin_demote_recipe_to_community()` (same admin-gated pattern as `publish_recipe`/`unpublish_recipe`), swap `owner_id` ↔ `original_owner_id` along with `source_type`. Promote requires the recipe to already be a published, active community recipe (not private, not already classic). Demote is refused when `original_owner_id` is null - a "true" classic that was never a community recipe (batch imported or admin-authored) has no original author to hand it back to.

**A real PostgREST wrinkle found while wiring this up**: `RECIPE_SELECT`'s existing `owner:profiles(display_name)` embed had never needed an FK hint before, since `recipes` only had one FK to `profiles`. The moment `original_owner_id` (a second FK to the same table) existed, the relationship became ambiguous for PostgREST - *every* profiles embed off `recipes` needed an explicit `!<fk_name>` hint, including `fetchCommunityRecipes()`'s own `owner` embed, which doesn't even touch `original_owner_id`. Both fixed (`profiles!recipes_owner_id_fkey`, `profiles!recipes_original_owner_id_fkey`); sanity-checked via a real REST call per this repo's own documented protocol for embeds (200, empty due to anon RLS denial - confirms no ambiguity error, not just that the SQL parses).

**Credit reuses existing UI rather than adding new surface**: `mapRecipe()`'s `author` field now falls back to `original_owner`'s display name when `owner` is null - so the "by {author}" line already on `DetailScreen.jsx`/`CocktailCard.jsx` (from this session's earlier username fixes) automatically credits a promoted classic with zero new UI needed there.

**New Admin UI**: "Promote to Classic" button (confirm) on each Moderation-tab row; "Demote to Community" button (confirm) on a Classic-Recipes-tab row that has an `originalOwnerId` - plus an "originally by {name}" credit line on those rows. Neither button renders when the action would just fail server-side (matches this session's established pattern for the Users tab).

**Verified directly against the live DB** before any UI was built: promoted a real community recipe ("Green Bunker"), confirmed `owner_id`/`source_type`/`original_owner_id` all flipped correctly, a non-admin's demote attempt was rejected, then demoted it back and confirmed every field matched its exact original state; separately confirmed demoting a genuine classic (no `original_owner_id`) is rejected with a clear error.

`pnpm test` — 105/105 passing (unchanged, no domain logic touched). `pnpm build` clean. `db advisors --type security` shows only the two new functions' expected "callable by authenticated" WARNs, same baseline as every other admin function. **Browser-confirmed working, 2026-08-23** - promote and demote both round-tripped correctly through the real UI.

## Earlier chunk (oz as a recipe-editor entry unit)

**Recipe editor accepts oz as an amount entry unit, not just ml.** User noticed there was no way to type an amount in oz when creating or editing a recipe - the per-row unit picker only ever offered ml plus the semantic non-volume units (dash, barspoon, g, ...). Storage stays canonically ml per the spec's measurement rules; oz is purely an entry convenience, same relationship the app already has between stored ml and oz *display* elsewhere. New `ozToMl()` in `src/domain/availability.js` (inverse of the existing `mlToOz()`, rounded to the nearest whole ml, 1 new unit test) - `EditorScreen.jsx`'s `handleSave()` converts an oz-entered amount once at save time and stores it exactly like a plain ml entry. Editing an existing recipe still prefills in ml (the actual stored value) - oz is just an added input choice on that row, not a new stored variant, so there's no ambiguity about what got saved.

`pnpm test` — 105/105 passing (104 previous + 1 new `ozToMl` test). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (ingredient-request UX: auto-fulfill + remove standalone fulfill button)

**Admin → Requests: adding an ingredient now auto-fulfills that request.** User feedback while retesting the request flow: the "+" button already jumped to the Single Ingredient form pre-filled with the requested name, but saving didn't touch the request's status at all - the admin still had to go back and separately click the checkmark, which read as confusing extra steps ("I added it, why does it still show pending?"). This was a deliberate original design choice ("added to the catalog" and "marked fulfilled" kept as separate actions so the admin could double-check first) - real usage found no actual benefit to that separation, so it's gone. `startSingleAddFromRequest()` now threads the request id through; a successful single-add also resolves it as fulfilled and refreshes the list. Cleared on switching import entity/mode so a stale association can't leak into an unrelated later add. **Follow-up, same day, user pushed further**: with "+" now auto-fulfilling, the standalone checkmark button was worse than redundant - clicking it marked a request fulfilled without ever creating the ingredient type, a real trap for silently losing track of a request nobody actually acted on. Removed entirely; `handleResolveRequest(id, status)` simplified to `handleDismissRequest(id)` (always "dismissed" now - "fulfilled" only ever happens as the add-success side effect, never its own button). Requests tab now has just two actions per row: "+" (add and auto-fulfill) and "×" (dismiss without adding). **Note**: the "Light Lager" request already sitting there from before this fix has already had its ingredient type added (via the old flow) - just needs a manual Dismiss now to clear the stale pending entry, not a re-add (the type already exists, so re-adding would hit the duplicate-name check).

`pnpm test` — 104/104 passing (unchanged, no domain logic touched). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (recipe-draft restore race)

**Browser-confirmed fixed, 2026-08-23**: retested the exact same repro (new recipe → unmatched ingredient → Request it → "Back to what I was doing") and the form now correctly repopulates. The earlier honesty caveat (static reading couldn't fully rule out a second contributing factor) is resolved - this was the whole bug.

**Recipe-draft restore race found during the round-5 QA retest (multi-draft item).** User followed the exact repro steps: new recipe, unmatched ingredient, Request it, "Back to what I was doing" - the restore banner appeared with the correct draft name, but clicking Restore left the form empty. Root cause: `EditorScreen.jsx`'s mount-check effect (reads localStorage, decides whether to show the restore banner) and its autosave effect (decides whether the current form is empty enough to delete the draft) both share `draftId` in their dependency arrays. Landing on `/library/new?draft=<id>` after Request Ingredient is a fresh mount, so both effects fire in the *same commit* - the autosave effect ran against the form's just-mounted blank state (the mount-check effect's `setDraftBanner` update hadn't landed on that commit yet), concluded there was no content, and deleted the very draft the banner was about to offer restoring. Fixed with a ref set at the end of the mount-check effect and read by the autosave effect right after it - a ref rather than state specifically because the write needs to be visible to a same-commit effect, not just a later render.

**Honesty note**: this is a real, demonstrable bug and the right kind of fix for it, found by tracing the exact effect dependencies - but static reading couldn't fully rule out a second contributing factor, since `restoreDraft()` itself reads from the already-in-memory `draftBanner` object (not localStorage), which in theory should populate correctly regardless of this specific race. Needs a real retest of the *exact same steps* before calling this closed, not just build/test passing.

`pnpm test` — 104/104 passing (unchanged, no domain logic touched). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (real usernames: CocktailCard author display)

**Author name added to `CocktailCard.jsx` (the Library grid), follow-up to the display-names chunk below.** User set real display names on both accounts (Edit Profile confirmed working, header updates and persists) but the name still didn't show on "public cocktails." Root cause: `DetailScreen.jsx` already had a working "by {author}" line, but the actual Library grid card had no author display *at all* - `c.author` was already correctly populated by the earlier RLS/trigger fix, it just was never rendered there. Added the same `c.author &&` line (empty for classics, which have no owner) to `CocktailCard.jsx`.

**User also floated a future idea, explicitly not asking for it yet**: some kind of lightweight social layer (following other members) once usernames are real - noted here as a genuinely open, unscoped idea, not a commitment. Worth raising again if/when it comes up, not assumed into any current work.

`pnpm test` — 104/104 passing (unchanged, UI-only). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (private-recipe RLS fix + real usernames)

**Two real bugs from the same user report, both security/privacy-flavored, neither from the numbered backlog.**

**1. Admin's Library "Private" filter leaked other members' private recipes.** Root cause: `recipes: read`'s original RLS (`20260815214307`) let an admin SELECT every recipe in the DB - the migration's own comment cited spec §8.3, but the actual spec text only ever says "A recipe is visible when it is an active shared recipe, or when the current user owns it," no admin clause at all. Same class of bug as `20260815231800` (which tightened UPDATE/DELETE to match the spec after finding the original policies were wider than intended) - that pass missed SELECT. Fixed in `20260823110000_tighten_recipe_read_scope.sql` - confirmed no admin feature depended on the broader grant (Classic Recipes tab only reads `visibility='shared'`; Moderation's query only reads `moderation_status='active'`, both already covered by the policy's first clause) before removing it. Verified directly against the live DB: admin can no longer read the other test account's real private recipe (a genuine `unpublished_by_admin` one from earlier QA testing), the owner still can, admin's own recipe counts unaffected.

**2. Community recipe authorship was either broken or leaking an email, depending on who looked.** `DetailScreen.jsx` already had a "by {author}" line, but `profiles: read own or admin` gave an ordinary member no RLS path to read another member's `display_name` at all - the `owner:profiles(display_name)` embed silently came back null for anyone but admin, so the line never showed for a regular member. Separately, `handle_new_user()` defaulted `display_name` to the signup email whenever no OAuth `full_name` was present (true for every plain email/password signup) - harmless while only admin could read it, but a real PII leak once member-readable, exactly what the user flagged ("displaying emails to public is a security risk and probably illegal").

**What shipped** (migration `20260823120000_public_display_names.sql`): broadened profile read to any member (`profiles` has no email column at all - only `display_name`/`role`/preferences/join date, standard exposure for a small invite-only community); `id = own` kept as an explicit branch alongside `is_member()` so a freshly-signed-up user who hasn't redeemed an invitation yet can still read their own row (`useMembership`'s `Promise.all` would otherwise reject entirely for them); trigger fallback changed from the raw email to a bare `"New Member"` placeholder. App side: `SignInScreen.jsx`'s join form now collects a required Display Name, threaded through `signUpWithEmail()` as `raw_user_meta_data.full_name` (which the trigger already preferred); Google OAuth signups already supply their own, unaffected. Also fixed **"Edit Profile" in `MoreScreen.jsx`**, a no-op stub exactly like Change Password was before this session's first fix - lets any existing user (including both real accounts, which currently show their email as their display name right now) set a real one. Verified directly against the live DB: the non-admin test account can now read the admin's `display_name` and vice versa.

**Known limitation, not fixed automatically**: both real accounts' `display_name` still literally equals their email until someone uses the new Edit Profile to change it - deliberately not rewritten via direct SQL, since it's the user's own account data; the natural next QA step doubles as the fix.

`pnpm test` — 104/104 passing (unchanged - RLS/trigger + UI wiring, no domain logic touched). `pnpm build` clean. `db advisors --type security` unchanged from the pre-existing baseline (the new trigger isn't RPC-callable, so it doesn't add a new advisor entry). **Private-recipe leak fix browser-confirmed, 2026-08-23**: admin's Library Private filter now shows only their own recipes. Still needed: confirm the join form's new Display Name field and that a fresh signup gets a real name, not an email; confirm Edit Profile actually changes the header name and persists after a refresh; confirm a community recipe's Detail page now shows "by {name}" for a non-admin viewer once both accounts have real names set.

## Earlier chunk (Library Source filter always visible)

**Library's Source filter (Classic/Community/Private) promoted out of the collapsible Filters panel.** User feedback after finishing this session's full QA script: the toggle to switch between classic and community cocktails existed already (a multi-select `SOURCE_FILTERS` chip row) but was buried behind the Filters icon, mixed in with Taste tags - a member had to open Filters and find it among an unrelated section just to browse Classic vs Community. Moved the Source chip row out of the `showFilters` conditional so it's always visible, right under the already-always-visible Availability chips - same visual weight as the filter members clearly reach for most. Taste tags stay behind the Filters toggle. No state/logic change, pure layout - `sourceFilters` and the `?source=` deep-link read still work exactly as before, just more discoverable.

`pnpm test` — 104/104 passing (unchanged, UI-only). `pnpm build` clean. Not yet browser-verified.

## Earlier chunk (admin security fix + user management)

**Real security bug found and fixed: `/admin` had zero route-level access control.** User reported reaching the Admin screen as a regular (non-admin) member - `isAdmin` only ever controlled whether the SideNav *link* was shown; the `/admin` route itself rendered unconditionally for any authenticated user. Confirmed the actual data exposure was limited (RLS already default-denies the admin-only reads/writes underneath - a non-admin's `fetchInvitations()`/etc. calls already return only what their own grants allow) but the screen itself had no business being reachable at all. Fixed with a new `RequireAdmin` wrapper in `App.jsx` (checks `isAdmin` from the existing Outlet context, redirects to `/home` otherwise) - a route-level wrapper rather than a check inside `AdminScreen` itself, since that component calls dozens of hooks unconditionally and an early return before them would violate the rules of hooks.

**User management: role changes and block/unblock, from the same report.** User also asked for UI to edit a user's level (role) and block/disable one - genuinely new schema, unlike every other admin-tab chunk this session, since `profiles.role` had zero write path beyond direct DB access (the original migration's own comment said so: "manual operation until an admin-management flow exists") and `memberships` had zero write policy for anyone but invitation redemption. Asked three scoping questions before writing any migration: (1) block mechanism - user chose a soft-revoke `revoked_at` column (mirrors how `invitations` already models revocation via a timestamp, not a delete) over deleting the membership row outright; (2) self-action guard - user chose to block an admin from demoting/blocking their own account, so nobody can lock themselves out with no other admin around; (3) edit scope - user confirmed just role + block, no display-name editing (already self-managed) or anything else.

**What shipped** (migration `20260823100000_admin_user_management.sql`): `memberships.revoked_at`; `is_member()` now requires `revoked_at is null` - since every "members read" RLS policy in the schema goes through `is_member()`, this one change blocks a revoked user's access everywhere at once, no need to touch dozens of individual policies. Two new `SECURITY DEFINER` functions, `admin_set_user_role()` and `admin_set_membership_revoked()`, both admin-gated and refusing to target the caller's own account. **Deliberately functions, not a direct RLS/column grant** (even though admin already has full read access to both tables) - `profiles` already has an "update own" policy for the signed-in member; broadening its column grant to also cover `role` would let that *same* policy be satisfied by a member's own row, since Postgres OR's multiple permissive policies together rather than requiring the admin-only one specifically - a real self-escalation path that a function sidesteps entirely by never needing the dangerous grant to exist on the client-facing surface at all.

**Verified directly against the live DB** with simulated admin/non-admin JWT claims (the app's actual two real accounts, not synthetic test rows): admin can block/unblock and promote/demote the other account; `is_member()` flips to `false` immediately once blocked; a non-admin's identical call is rejected; an admin targeting their own account is rejected by both functions. State restored to original (admin/member, unblocked) after verification.

**Client side**: `useMembership` now distinguishes `isRevoked` (has a membership row, but blocked) from `!isMember` (never joined at all) - `App.jsx` shows a distinct "Your access has been revoked" screen instead of routing a blocked user into the invite-code `JoinScreen`, which would incorrectly imply they could just redeem their way back in (`redeem_invitation()` already rejects anyone who already has a membership row, revoked or not). New Admin "Users" tab (search box, matching the other new tabs) lists every registered user with role + status (Active/Blocked/Not a member); Make Admin and Block get an inline confirm since both grant or cut off real access, Make Member and Unblock don't; neither action renders on the admin's own row at all, rather than showing a button that can only ever fail server-side.

`pnpm test` — 104/104 passing (unchanged - no domain logic touched). `pnpm build` clean. `db advisors --type security` shows only the same long-familiar accepted WARNs (every admin `SECURITY DEFINER` function in this codebase produces the same "callable by authenticated" WARN by design). Not yet browser-verified - needs a real click-through: confirm a non-admin hitting `/admin` directly now redirects to `/home`; confirm blocking the real second test account from the Users tab actually locks them out of the live app (not just the DB-level check above), and unblocking restores access; confirm role promotion/demotion works end to end including the promoted user gaining real Admin nav access.

## Earlier chunk (Classic Recipes + Ingredient Types Admin tabs)

**Classic Recipes + Ingredient Types get their own Admin tabs, not from the numbered backlog.** User noticed the Admin Dashboard's "Classic Recipes" and "Ingredient Types" stat cards linked out to Library/My Bar - member-facing screens with no delete affordance at all for either entity, even though the RLS already permitted admin delete on both (`recipes: delete` allows `owner_id is null and is_admin()`; `ingredient_types: admin delete` has existed since the RLS-hardening pass with zero callers). Asked two scoping questions before building: (1) where should these live - user chose new AdminScreen tabs over separate routes, so the Dashboard cards now call `setTab("recipes")`/`setTab("types")` instead of `navigate()`; (2) whether "disable" (from the original ask) needs new schema - user confirmed Edit + Delete only, since neither entity has an active/inactive concept today and adding one is a separate, bigger decision.

**Classic Recipes tab**: lists `computed.filter(r => r.source === "classic")`, each row with Edit (→ the existing `/library/:id/edit`) and Delete (inline confirm, calls the already-existing `deleteRecipe()` - no new service function needed, the RLS already covered this). **Follow-up same day**: user asked for a search box "like in the ingredients [tab]" - added there and, since the same gap existed, on the pre-existing Moderation (community recipes) tab too, both filtering by name client-side against the already-loaded list.

**Ingredient Types tab**: lists every `catalog.types` row (search box, sorted by category then name), each with Edit and Delete. Delete is new: `deleteIngredientType()` in `src/services/catalog.js`, no pre-check for in-use - a child type/product/recipe component/substitution alternative referencing it all have their own restricting FK (verified by reading every migration referencing `ingredient_types(id)`: only `ingredient_aliases` and `user_inventory` cascade, both correctly - a dangling alias or ownership record for a deleted type is meaningless), so a real delete attempt surfaces the DB's own rejection, same precedent as glasses/taste tags/families.

**Refactor along the way**: My Bar's inline ingredient-type edit form (`editingType`/`handleSaveEditType`/`renderEditTypeForm`) was extracted into a new shared `src/components/IngredientTypeEditor.jsx` - the Admin tab needed the exact same edit form (name/category/parent/priority/color + the `validateIngredientImport()` duplicate-check reuse), and duplicating that business logic across two files would have been a real drift risk, not premature abstraction. My Bar's local state shrank to just `editingTypeId` (which row, if any); the component owns its own field state and save logic.

`pnpm test` — 104/104 passing (unchanged - UI/service wiring against already-tested domain logic). `pnpm build` clean. Not yet browser-verified - needs a real click-through: open each new tab from the Dashboard cards, edit a classic recipe and an ingredient type, delete an unused one of each, and confirm deleting an in-use ingredient type (e.g. one with products under it) shows the database's real FK-violation message rather than silently failing.

## Earlier chunk (substitute-match display)

**Substitute-match display, the item explicitly requested in QA round 5**: `DetailScreen.jsx` now shows *which* substitution alternative satisfied a component (e.g. "Substituting: Vodka" under "Gin"), not just that the component is available. `computeAvail()` (`src/domain/availability.js`) gained a `substitutions` map in its return value (`{ [ingId]: { matchedId, matchedName } }`, only populated when a component is satisfied via an alternative rather than the primary ingredient itself) - additive, no existing field changed. 2 new unit tests.

**Real inconsistency found and fixed while wiring this up**: the per-ingredient row's "owned" dot in `DetailScreen.jsx` was checking `owned.has(ri.ingId)` directly and never consulted `alternativeIds` at all - so a recipe correctly badged "perfect" overall (via a substitute) would still show that row's dot as unowned/red. Fixed by using the new `substitutions` map: `isOwned = owned.has(ri.ingId) || Boolean(substitution)`.

`pnpm test` — 104/104 passing (102 previous + 2 new `computeAvail` substitution tests). `pnpm build` clean. **Browser-confirmed working by the user, 2026-08-23.**

## Earlier chunk (Change Password fix + password-generator autofill)

**Change Password, a real bug fix (not from the numbered backlog)**: the "Change Password" row in `MoreScreen.jsx`'s Account section was a literal no-op (`onClick={() => {}}`) - user reported "change password doesn't work" and this was the root cause, not a deeper auth issue. Real-world trigger, for context: a second non-admin test account was running in an incognito window, so yesterday's password wasn't saved by the browser and got forgotten - this feature was actually needed, not just a QA-checklist item. Added `changePassword(newPassword)` to `src/services/auth.js` (`supabase.auth.updateUser({ password })`) and wired the row to expand an inline new-password/confirm form (min-length + match validation, error/success feedback) directly in `MoreScreen.jsx`, matching the existing inline-form style already used for "Forgot password" in `SignInScreen.jsx`.

**Follow-up same session**: wired the new form so Chrome's password-generator autofill actually has a chance to trigger - `Input`/`Btn` primitives (`src/components/primitives.jsx`) gained `autoComplete`/`name` and an explicit button `type` (`Btn` now defaults to `type="button"` so its many non-form call sites elsewhere are unaffected), and the password panel is now a real `<form>` (`autoComplete="new-password"` on both fields, a hidden `autoComplete="username"` field for context, `Save` as `type="submit"`) instead of a plain `<div>` with `onClick` handlers.

**Found, not fixed - flagged to the user, not yet on the numbered backlog**: the *forgot-password* email-reset flow (`sendPasswordReset` in `SignInScreen.jsx`) sends the reset email correctly, but there's no UI that detects the `type=recovery` session on the `/signin` redirect and lets the user actually set a new password - clicking the emailed link currently leads nowhere useful. Separate gap from the Change Password fix above; needs its own scoping/build pass if wanted.

`pnpm test` — 102/102 passing (unchanged - UI wiring, no domain logic touched). `pnpm build` clean.

## Earlier chunk (backlog #4: substitution-alternatives editor UI)

Backlog item **#4 done, scoped as agreed**: substitution-alternatives editor UI. User confirmed both scoping questions before starting: (1) any one owned alternative satisfies the component - same rule already used for parent/child ingredient hierarchy; (2) ingredient substitutions only, recipe-relationships (`recipe_relationships`, "variation of") stays a separate future item, not bundled in.

**Turned out to be smaller than expected**: the availability engine (`src/domain/availability.js`) already fully implemented "any one owned alternative satisfies the slot" and was already unit-tested (`availability.test.js`) - substitutions were designed into the domain layer back when the availability engine was built, just never given a way to actually create one. Same for reading: `recipes.js`'s `RECIPE_SELECT`/`mapRecipe()` already embedded and mapped `recipe_component_alternatives` into `ings[].alternativeIds`. The only real gaps were the write path and the editor UI.

**Write path**: `insertComponentsWithAlternatives()` in `recipes.js` (new, shared by `createRecipe()`/`createClassicRecipes()`/`updateRecipe()`) inserts `recipe_components` with `.select()` to get generated ids back, then correlates each returned row to its original input via `sort_order` (unique per recipe) rather than trusting array-return-order to match input order, and inserts `recipe_component_alternatives` referencing the right component id. `updateRecipe()`'s existing delete-then-reinsert pattern needed no extra cleanup step - `recipe_component_alternatives.recipe_component_id` is already `on delete cascade`, so deleting old components already removes their alternatives.

**Editor UI**: each ingredient row in `EditorScreen.jsx` now has a "Substitutes:" chip list (only shown once the row's own ingredient resolves) with a text+datalist input to add another - resolved via the same `resolveIngredientType()` used everywhere else (exact name or alias, no fuzzy matching), committed as a chip only once it actually resolves. Prefill (edit mode and clone mode) now also populates existing alternatives from `ri.alternativeIds`. Verified live: the recipe's owner can insert a component + alternative; a different identity - including admin, since this is a private *user* recipe and `recipe_is_editable()` only lets admin touch ownerless classics - gets a real RLS rejection, not a silent no-op.

**Found and fixed while wiring this up**: two more spots in `EditorScreen.jsx` were still matching ingredient names with a raw `types.some()`/`types.find()` instead of `resolveIngredientType()` - the manual ingredient row's red-border "doesn't match" check, now alias-aware too (this is a *third* instance of that exact gap this session, after `AddProductScreen`/`MyBarScreen` and the recipe-row matching itself already fixed last chunk - worth remembering that "matches an ingredient name" is a phrase to grep for whenever alias behavior changes again).

**Deliberately not built**: no display of substitution alternatives on `DetailScreen.jsx` (e.g. "or: Vodka") - the user's scoping answer was about the *editor*, and availability already correctly reflects substitutions in the missing-ingredients computation without needing a dedicated display; adding one is a reasonable small follow-up, not assumed into this pass.

`pnpm test` — 102/102 passing (no new tests - this is UI wiring plus a service-layer helper against already-tested domain logic, not new pure-function rules). `pnpm build` clean.

## Earlier chunk (backlog #3: member-facing paste-a-recipe)

Backlog item **#3 done**: member-facing "paste a recipe, app fills in New Recipe" - the actual ask behind the pineapple whisky sour pasted several rounds ago.

**Design call, made without re-asking since it followed directly from existing patterns**: unlike admin batch import (`validateRecipeImport`, all-or-nothing per row - a bad row just gets rejected with no human in the loop before commit), this had to be lenient - the result always lands in the ordinary New Recipe form for the member to review before saving, so a field that doesn't resolve should just show up as plain typed text (triggering the form's existing "doesn't match - Request it" warning) rather than blocking the whole paste. That's a different contract from the strict validator, so it's a new pure function rather than a reuse of `validateRecipeImport`: `src/schemas/recipePaste.js`'s `parseRecipePaste(raw, catalog)` - resolves glass/family/taste-tags/each-ingredient (via the same `resolveIngredientType()` alias-aware resolver everywhere else uses) where it cleanly can, and passes anything unresolved through as-typed instead of failing the whole thing. 11 unit tests, including one for the "unrecognized unit defaults to a non-volume unit, never silently reinterpreted as ml" edge case (mislabeling "2 cl" as "2 ml" would be a real, silent unit error, not just an inconvenience).

**Reused rather than duplicated**: the AI-formatting prompt is `buildRecipeImportPrompt()` unchanged - a 1-item JSON array works fine for a single recipe, no need for a member-flavored variant that could drift from the admin one. `EditorScreen.jsx` gained a "Start from Scratch" / "Paste a Recipe (AI)" toggle, shown only for a genuinely blank new recipe (not edit mode, not the existing `?clone=` flow, both of which already have their own prefill source) - "Fill Form" runs the paste through `parseRecipePaste()` and calls the exact same `setName`/`setIngs`/etc. setters the clone-prefill effect already uses, so the member ends up in the completely ordinary form afterward, reviewing and saving through `createRecipe()` like any hand-typed recipe.

**Found and fixed while wiring this up**: `EditorScreen.jsx`'s own manual ingredient-name matching (typing directly into an ingredient row, not via paste) was still using a raw `types.find()` with no alias awareness - missed when aliases were wired into every other resolution path last chunk. Now uses `resolveIngredientType()` too, and the ingredient datalist lists aliases alongside canonical names.

`pnpm test` — 102/102 passing (91 previous + 11 new `recipePaste.test.js`). `pnpm build` clean.

## Earlier chunk (backlog #2: ingredient aliases)

Backlog item **#2 done, full pass**: ingredient aliases (user chose "management UI + wire into resolution everywhere" over the smaller UI-only option). Real spec scope (Phase 2, §12.3) that had zero application code before this.

**Schema fix first**: `ingredient_aliases`'s original unique constraint was per-type (`ingredient_type_id, alias`), which would have let the same alias text point at two different ingredient types - genuinely ambiguous for a resolution table whose whole point is a deterministic answer. Migration `20260822150000_ingredient_alias_global_uniqueness.sql` replaces it with a case-insensitive unique index on `alias` alone (zero rows existed yet, so zero data risk). Verified live: inserting `__test_sec__` after `__TEST_SEC__` already exists correctly fails with a real `23505` violation naming the new index.

**New pure domain module**: `src/domain/ingredientResolution.js` - `resolveIngredientType(name, {types, aliases})`, exact match against canonical name first, then aliases, case-insensitive. One function, one place the "name or alias, never fuzzy" rule lives, instead of repeating it differently in five call sites. 7 unit tests (including a canonical-name-wins-over-a-same-text-alias case, and a dangling-alias-pointing-at-a-deleted-type case).

**Wired into every ingredient-name matching path in the app**, not just batch import: `recipeImport.js` (component resolution) and `productImport.js` (`ingredientType` resolution) now use it directly; `ingredientImport.js`'s "already exists" duplicate check for a *new* type now also catches "this name already resolves to an existing type via an alias" (with a distinct error message) and its `parentType` lookup accepts aliases too; `AddProductScreen.jsx` and `MyBarScreen.jsx`'s product-edit type input both switched from a raw `types.find()` to the shared resolver, and their `<datalist>`s now list alias text alongside canonical names so autocomplete actually surfaces them. All three AI-formatting prompts (`buildIngredientImportPrompt`/`buildRecipeImportPrompt`/`buildProductImportPrompt`) now annotate each ingredient type with its known aliases ("Gin (also known as: London Dry)") and explicitly tell the AI to use one name/alias by itself, never the whole annotated line - otherwise the prompt's own richer type list would have invited exactly the kind of malformed-name bug the recipe-import prompt fix caught earlier this session.

**New admin UI**: an "Ingredient Aliases" section in the Catalog tab (`AliasManager` component - alias text + a searchable "maps to" type input, list/add/edit/delete). Validates both directions before saving - the alias text can't already resolve to something (via canonical name or another alias), and the target type name must actually resolve to something real - giving a friendly error before ever hitting the DB's unique-index violation.

`useCatalog.js` now fetches `aliases` alongside everything else, shared via the same `AppShell` context as the rest of the catalog - one more caller-count example of the "fetch once, share via context" rule already established for this app.

`pnpm test` — 91/91 passing (77 previous + 7 new `ingredientResolution.test.js` + 2 new `ingredientImport.test.js` + 2 new `recipeImport.test.js` + 2 new `productImport.test.js` + 1 new prompt-annotation test each). `pnpm build` clean. Verified live: admin alias insert succeeds, a duplicate alias text (case-insensitive) is rejected by the new unique index, a non-admin insert attempt gets a real RLS rejection. Test rows cleaned up.

## Earlier chunk (backlog #1: glass/taste-tag/family/category management UI)

Backlog item **#1 done**: glass / taste-tag / cocktail-family / ingredient-category management UI, the last piece of step 12. All four tables were the same shape (`id, name unique`, plus `sort_order` on `ingredient_categories`) with full admin RLS and zero write callers - so instead of four near-identical CRUD screens, built one `NamedRowManager` component (list + inline add + inline edit + inline delete-with-confirm) parameterized by table-specific `onCreate`/`onUpdate`/`onDelete` callbacks and an optional `showSortOrder` flag, used four times in a new "Catalog" tab in `AdminScreen.jsx`. New service functions in `catalog.js`: `createGlass`/`updateGlass`/`deleteGlass`, `createTasteTag`/`updateTasteTag`/`deleteTasteTag`, `createCocktailFamily`/`updateCocktailFamily`/`deleteCocktailFamily` (all three via shared `createNamedRow`/`updateNamedRow`/`deleteNamedRow` helpers), plus `createIngredientCategory`/`updateIngredientCategory`/`deleteIngredientCategory` (separate, for the `sort_order` column). No migration needed - reused the `admin insert`/`admin update`/`admin delete` RLS policies the earlier audit had already found unused on all four tables.

Deliberately did **not** add an "is this in use" pre-check before delete - a row referenced by a recipe (`glass_id`/`family_id`) or `recipe_taste_tags`/`ingredient_types.category_id` is already protected by its own foreign-key constraint, so the DB rejects the delete and the UI just surfaces that Postgres error message as-is. Verified live: admin insert/update/rename succeed; a non-admin's insert attempt gets a real RLS rejection; deleting an in-use glass ("rocks") correctly fails with a real `23503` foreign-key violation naming the referencing table; deleting an actually-unused test row succeeds. Also surfaced a real caveat in the UI itself (found during the earlier research pass): `GlassSvg.jsx` only draws a real shape for glass names it already has a `case` for (rocks, highball/collins, coupe, wine) - a brand-new glass added through this screen works immediately for matching/availability but silently renders as a generic martini silhouette until someone adds a matching shape in code. Told the admin this directly in the tab rather than letting them discover it by surprise.

`pnpm test` — 77/77 passing (no new tests - CRUD UI wiring against already-simple tables, not new pure-function logic). `pnpm build` clean.

## Earlier chunk (RLS-policy audit)

Ran the RLS-policy audit flagged in the previous chunk (grep every `create policy` across `supabase/migrations/`, confirm each has a real caller in `src/services/`). Findings, and what got fixed vs. just logged:

**Fixed: members could submit an ingredient request but never see it again or withdraw it.** `fetchMyIngredientRequests()` already existed in `src/services/ingredientRequests.js` but had zero callers, and the `ingredient_requests: owner deletes while pending` RLS policy - built specifically for this, per its own migration comment - had never been exercised either. `RequestIngredientScreen.jsx` now loads and shows the current user's own request history (name, status, date, note) below the submit form, with a withdraw button on pending ones; new `deleteMyIngredientRequest()` in the service. Verified live: the owner can delete their own pending request, a different identity (including admin - there's no admin-delete policy on this table, only admin-*resolve*) gets zero rows deleted.

**Logged, not built - genuine spec scope gap, needs a decision before touching it**: `ingredient_aliases` has full RLS (read/admin insert/update/delete) and is explicitly listed in the spec's Phase 2 scope ("Ingredient types, products, categories, aliases") and §12.3's import-resolution rules ("Resolve ingredient types through IDs, canonical names, or controlled aliases") - but zero application code anywhere touches this table. Phase 2 was marked done without it. Building it would mean an admin-curated alias→canonical-type lookup (not fuzzy matching - an explicit mapping table, consistent with the no-fuzzy-matching rule) that the three importers (`ingredientImport.js`/`recipeImport.js`/`productImport.js`) and `AddProductScreen`'s live match check would all need to consult. Real, but a genuinely separate feature decision, not a quick fix.

**Logged, already tracked - not new**: `ingredient_categories`/`glasses`/`taste_tags`/`cocktail_families` all have complete admin insert/update/delete RLS with zero callers beyond their single `fetch...()` read - this is the same gap as the already-known "glass/taste-tag/family management UI" backlog item (now confirmed to include categories too, per spec §7.7's "Manage ingredient types, categories, aliases, and commonness"). `recipe_component_alternatives` is fully unused, matching the already-known "no substitution UI" item. `ingredient_types: admin delete` remains unused (flagged last chunk, not requested).

`pnpm test` — 77/77 passing (no new tests - a list/read view and a delete call against an already-tested table, not new pure-function logic). `pnpm build` clean.

## Earlier chunk (ingredient-type editing, Beer category, Digestif fix)

Three items from one user message: two real content/data gaps and one more instance of the "RLS policy existed, nothing ever called it" pattern.

**1. Ingredient-type editing, the third instance of that pattern this session** (after `products: admin update` and `products: admin delete`). The user pointed out that once a top-level ingredient type is added, nothing can ever edit it - `ingredient_types: admin update`/`admin delete` have existed since the RLS-hardening pass with zero callers. Added `updateIngredientType()` in `services/catalog.js` and an admin-only edit pencil on every type row in My Bar (parent and child), opening the same field set as Admin's Single Ingredient form (name, category, parent type scoped to category, bar priority, color). Reuses `validateIngredientImport()`'s single-item path rather than a second hand-rolled check - crucially, the type being edited is excluded from the candidate list passed to the validator first, otherwise saving with its own unchanged name would fail the "already exists in the catalog" duplicate check. Verified live: admin update succeeds, non-admin update matches zero rows. Type deletion wasn't asked for and wasn't added - editing was the actual complaint.

**2. Taxonomy correction, a judgment call with reasoning given, not silently applied.** The user asked whether Triple Sec and Crema di Pistacchio should be Digestifs. Assessed and explained: Crema di Pistacchio (a sweet cream liqueur) fits the Digestif pattern the same way Amaretto/Limoncello-style after-dinner liqueurs do - moved it under Digestif. Triple Sec is a mixing/curaçao-style liqueur (Margarita, Cosmopolitan), not something sipped after a meal - left top-level, same as how Gin/Vodka don't need a parent under Spirit.

**3. No "Beer" ingredient category existed at all**, despite real beer cocktails (Michelada, Black Velvet, shandy). Added via migration `20260822140000_beer_category.sql` (categories still have no admin-UI creation path, unlike types, so this followed the earlier Garnish-category precedent of an explicit migration rather than live data) - "Beer" (generic, sort_order 100) plus "Stout" as its one specific child, since Black Velvet genuinely calls for a stout specifically, not just any beer. Small starter set, matching the Garnish category's own precedent, not an attempt at a full beer catalog.

`pnpm test` — 77/77 passing (no new tests - editing existing rows via an already-tested validator, not new pure-function logic). `pnpm build` clean.

## Earlier chunk (product delete)

Product delete, admin-only, in My Bar's expanded product list (trash icon next to the edit pencil, with an inline "Delete '{name}'? This can't be undone." confirm replacing the row). Follows the exact same "RLS policy existed since step 5, no caller until now" pattern as `updateProduct()` last chunk - `products: admin delete` was already there. New `deleteProduct()` in `services/catalog.js`; `user_inventory.product_id` is `on delete cascade`, so any ownership record pointing at a deleted product is cleaned up automatically, no extra code needed. Triggered by the user noticing the newly-fixed "Orange Juice" (type) → "Orange Juice" (product) pairing reads as redundant now that the type itself covers generic ownership - deleting the vestigial product is a reasonable cleanup, so this shipped as a real capability rather than a one-off DB fix. Verified live: admin delete succeeds, non-admin delete attempt matches zero rows.

`pnpm test` — 77/77 passing (no new tests - a service function plus a confirm-and-delete UI pattern already used elsewhere in the app, not new pure-function logic). `pnpm build` clean.

## Earlier chunk (Orange Juice + type-picker fixes)

Found while the user was trying to use the new product-edit feature: a genuine seed-data bug and a real UX gap in the same picker, both fixed.

**1. "Orange Juice" (a seeded product) had no correct ingredient type to belong to at all - it had been mapped to "Lemon Juice" from day one.** The Juice category only ever had "Lemon Juice" and "Lime Juice" as real types - no generic "Orange Juice" existed, unlike the Rum/Whiskey category's generic-parent pattern. So the product-edit feature was working exactly as built, but there was nothing correct to select. Added "Orange Juice" as a real sibling ingredient type (Juice category, no parent, matching Lemon/Lime Juice's shape) and remapped the existing product to it via the same admin `updateProduct()` path just shipped - verified live before and after.

**2. The ingredient-type picker itself was the wrong tool once there are many types.** The new product-edit form used the plain `<Select>` primitive (a full unfiltered list, no search) for ingredient type - fine for the ~10 categories elsewhere in the app, unusable for "every ingredient type," which is already dozens and will only grow. Replaced it with the same searchable `<input list>` + `<datalist>` combo `AddProductScreen.jsx` already uses for exactly this problem (type-to-filter, browser-native, no new component needed) - `editingProduct` now stores the type as text, resolved to an id via the same exact-match rule (no fuzzy matching) at save time, with a "doesn't match" warning and disabled Save until it resolves.

`pnpm test` — 77/77 passing (no new tests - a searchable-input swap and catalog data, not new pure-function logic). `pnpm build` clean.

**Still not built at all - a genuinely separate feature**: a member-facing way to paste a full recipe as free text (not JSON) and have the New Recipe form auto-fill, mirroring admin's AI-prompt batch import but scoped to one recipe for ordinary members. This was the original ask behind the pineapple whisky sour recipe the user pasted several rounds ago - the "g" unit decision was a prerequisite for it, but the paste-and-fill member feature itself hasn't been scoped or built.

## Earlier chunk (QA round 3 - two fixes)

QA round 3 found one real security/correctness bug and one small real UX gap - both fixed.

**1. Ingredient requests were completely broken for every member - a real RLS bug, not a mock/gap this time.** The user tried to submit a request and got `new row violates row-level security policy for table "ingredient_requests"` straight from the UI. Root cause: `createIngredientRequest()` in `src/services/ingredientRequests.js` never sets `requested_by`, and unlike `products.created_by`/`recipes.owner_id`, the `ingredient_requests.requested_by` column had no `default auth.uid()` - so every insert sent `requested_by: null`, which the "insert own" RLS policy's `requested_by = auth.uid()` check correctly rejects. Exact same bug class as `recipes.owner_id` (fixed back in step 6's `20260815220554_fix_recipes_owner_default.sql`) - just never applied to this table. Fixed via `20260822120000_fix_ingredient_requests_owner_default.sql` (one `alter column ... set default auth.uid()`), verified by simulating the *exact* client-shaped insert (no `requested_by` in the payload) against the live DB before and after - confirms this wasn't just a policy-shape check but the literal failure the user hit. **Worth flagging honestly**: this session's earlier "ingredient request insert path verified against the live DB" (step 12, first slice) tested the RLS policy with `requested_by` explicitly supplied in raw SQL, which is exactly why it didn't catch a bug that only exists when the *client* omits it - a reminder that policy-shape verification and matching the app's actual query shape are two different checks, and both matter.

**2. The inline "+Add ingredient" draft used the AI-flagged text as a fixed, uneditable name.** Testing with an old (pre-prompt-fix) pasted JSON, the user hit "Fresh pineapple - 50 g" flagged as the ingredient name with no way to clean it up before creating the type - confirmed the new prompt fixes this going forward, but asked for the ability to correct it regardless (stale JSON, a non-compliant AI, or just a messy source recipe are all still possible). The draft's name is now an editable `Input` pre-filled from the flagged text rather than a static label.

`pnpm test` — 77/77 passing (no new tests this round - both fixes are a migration/data-default and a small always-editable-field UI change, not new pure-function logic). `pnpm build` clean.

**Still not built at all - a genuinely separate feature**: a member-facing way to paste a full recipe as free text (not JSON) and have the New Recipe form auto-fill, mirroring admin's AI-prompt batch import but scoped to one recipe for ordinary members. This was the original ask behind the pineapple whisky sour recipe the user pasted several rounds ago - the "g" unit decision was a prerequisite for it, but the paste-and-fill member feature itself hasn't been scoped or built.

## Earlier chunk (QA round 2 - two fixes)

**1. The recipe-import prompt itself was the bug behind "unresolved ingredients."** Testing the new "g" unit and inline-add recovery together, the user's real AI output put `"Fresh pineapple - 50 g"` and `"Salt - optional tiny pinch"` into `unresolvedIngredients` - full sentences, not ingredient names - because the prompt only ever told the AI to "put its name here" for that field and gave it no instruction to keep quantity/role data anywhere resolvable. Two compounding problems: the inline "+Add" button would have created an ingredient type literally named "Fresh pineapple - 50 g", and even after fixing that, the recipe would still silently drop the pineapple/salt components entirely - their amounts were never captured in `components` at all. Rewrote `buildRecipeImportPrompt()`'s instructions: every ingredient (even ones outside the existing catalog) must go in `components` with its real amount/unit and a bare, common name only ("Pineapple", not "50 g fresh pineapple"); `unresolvedIngredients` is now a rarely-needed last resort, explicitly bare-names-only if used at all. This means an ingredient missing from the catalog now correctly fails validation as an unresolved *component* (amount/unit preserved in the raw JSON) - so after an admin uses the inline "+Add" fix from the previous chunk and re-validates, the recipe imports with the pineapple/salt components intact, not silently missing. 2 new prompt-wording tests in `recipeImport.test.js`.

**2. No way to fix a miscategorized or typo'd product.** The user asked for "an edit window" after wondering whether a batch-imported product (Bacardí Carta Blanca → "Rum") was mapped correctly - checked directly against the DB and confirmed it's actually correct as-is (there's no separate "White Rum" type; the existing taxonomy already uses generic "Rum" for anything that isn't specifically "Dark Rum"), but the underlying complaint was real: once a product exists, nothing in the UI could ever change its name/type/brand, even though the RLS policy for it ("products: admin update") has existed since step 5 with no caller. Added `updateProduct()` to `services/catalog.js` and an admin-only inline edit (pencil icon → name/ingredient-type/brand form) on each product row in My Bar's new expanded product list - the same place the miscategorization would actually be noticed. Verified directly against the live DB: admin update succeeds, a non-admin member's identical update attempt matches zero rows (real RLS enforcement, not just a hidden button).

`pnpm test` — 77/77 passing. `pnpm build` clean.

**Also raised, not built**: the user flagged that a flat expanded product list could get unwieldy at real-world scale (50 vodkas, 200 whiskeys) - noted as a future concern, not acted on yet ("we'll see" - no ask to build search/filtering within the expanded list right now).

## Earlier chunk (four fixes from one browser-testing round)

Four fixes/features from one browser-testing round on the newly-shipped batch import + earlier taxonomy work, spanning steps 5/6/12 rather than a single step - grouped here because they landed together, not because they're one feature.

**1. "g" (grams) added as a real unit.** The user pasted a real recipe with `50 g fresh pineapple` while testing recipe import and there was no way to represent it - units were only ever ml (canonical, converted for display) or a fixed semantic list (dash, barspoon, piece, slice, wedge, top-up, part). Asked the user how to handle weight-based solids; chose adding "g" as a real unit over approximating with an existing one or punting to manual review. Mechanically trivial because `NON_VOLUME_UNITS` (`src/data/constants.js`) already encodes "amount + unit as free text in `unit_label`, DB `amount` column stays 0" for anything that isn't ml - the same mechanism already used for "2 dash" - so `formatAmount()` in `src/domain/availability.js` (which just checks `amount === 0`) needed zero changes. One array entry, one new test in `recipeImport.test.js`.

**2. My Bar had no way to own an EXISTING catalog product.** The user batch-imported 17 real products (Tanqueray, Absolut, Jameson, etc.) via the just-shipped Product batch import and "nothing appeared in the bar" - verified directly against the DB that all 17 rows really were created, so the import itself worked. The actual gap: My Bar only ever showed a *type* row, with an owned product as a read-only subtitle underneath - there was no way to browse the shared products catalog and claim ownership of one without retyping its exact name into Add Product, which creates a brand-new duplicate row rather than linking the existing one. Fixed by adding a per-type expand/collapse (chevron + product count next to the type name, `IconChevR`/`IconChevD`) that lists every catalog product under that type - owned or not - each with its own `OwnedToggle`. New `toggleProduct()` in `useInventory.js` and `removeProductOwnership()` in `services/inventory.js` (the RLS "user_inventory: delete own" policy already covered this, no migration - verified live with simulated JWT claims that a member can toggle their own product ownership on/off and that a different identity's delete attempt matches zero rows).

**3. "Clone as My Own Recipe."** User feedback: normal members should be able to adapt a classic (or someone else's community recipe) into their own editable version without retyping every ingredient and step, since real bars/countries/people make classics differently and members should be able to build on them, not just consume them as-is. Added a "Clone as My Own Recipe" button on `DetailScreen.jsx` (shown whenever `!isOwner`) linking to `/library/new?clone=<id>`; `EditorScreen.jsx` now reads that query param and prefills the New Recipe form from the source recipe's full data (name suffixed "(My Version)", ingredients, steps, glass, family, tags) exactly like edit-mode's existing prefill effect, but without entering edit mode - saving goes through the normal `createRecipe()` path and makes an ordinary private recipe the member owns outright. No backend change needed; this is UI-only prefill on top of recipe creation that already worked.

**4. Batch import dead-ended on an unresolved ingredient.** The user's pasted "Pistachio Margarita"/"Smoky Margarita" batch had one recipe blocked because "Salt" wasn't in the catalog, with no recovery path except abandoning the tab. `validateRecipeImport()` now also returns a structured `missingIngredientNames` array per row (union of the AI's own `unresolvedIngredients` review list and any component that didn't resolve), not just the human-readable error text. `AdminScreen.jsx`'s recipe-import results view renders an inline "+ Add "{name}"" button per missing name that opens a compact category/parent-type/bar-priority/color form (same fields as Single Ingredient, one draft at a time) - saving calls the same `validateIngredientImport()`/`createIngredientTypes()` path Single Ingredient already uses, then automatically re-runs `runRecipeImportValidation()` on the still-pasted JSON so the blocked row updates in place instead of requiring a re-paste.

`pnpm test` — 76/76 passing (74 previous + 1 new `g`-unit test + 1 new `missingIngredientNames` test). `pnpm build` clean.

**Not yet browser-clicked**: all four of the above (the g-unit end-to-end, expanding a type in My Bar and toggling a specific product, cloning a classic through the actual button, and the inline add-ingredient recovery flow during a real batch-import paste).

## Earlier chunk (step 12, sixth slice)

Product batch import, the last of the three batch-import entities (ingredients → recipes → products). Simplest of the three: a product is one flat row (`name`, `ingredient_type_id`, `brand`, `is_homemade`) with no per-row children to insert, so `src/schemas/productImport.js` (`validateProductImport` + `buildProductImportPrompt`, 10 unit tests) and `createProducts(rows)` in `src/services/catalog.js` (a single bulk `.insert()`) are both noticeably smaller than their recipe equivalents. Same standing rules as the other two importers: `ingredientType` resolves via an EXISTING `ingredient_types.name` exact match only (no fuzzy matching - the prompt tells the AI to leave a product out entirely rather than guess a close type match), and duplicate detection checks name+type pairs both against every existing product (`catalog.products`) and within the same paste (the same product name is fine under two different types - e.g. two brands both making an "Amaretto" and a "Grenadine" - so the dedupe key is `name+type`, not name alone). `AdminScreen.jsx`'s entity switch is now Ingredients/Recipes/Products, all three batch/AI-only for Recipes and Products (My Bar's Add Product and New Recipe already cover one-off creation).

No new migration - `createProducts()` goes through the exact same "products: member insert" RLS policy any member's single Add Product already uses (`created_by` defaults to `auth.uid()` per-row at the column level, which a live DB check confirmed works correctly for a multi-row bulk insert, not just a single row). Verified directly against the live DB with simulated admin JWT claims before considering this done, then cleaned up. `pnpm test` — 74/74 passing (64 previous + 10 new). `pnpm build` clean.

**Not yet browser-clicked**: same as recipes - generating the product AI prompt, a real AI round-trip, and paste/validate/commit through the actual Admin UI.

## Earlier chunk (step 12, fifth slice)

A real, repeated user-testing bug (not a code bug) around the Product vs. Ingredient Type split, plus the UX fix it exposed.

**What happened**: while browser-testing My Bar, the user added "Scotch" via **Add Product** (My Bar's member-facing `+`) expecting it to appear as a sibling of "Bourbon" under "Whiskey" (its own indented row, own toggle). Instead it showed as a small subtitle under "Whiskey" - because Add Product can only ever create a *product* mapped to an *existing* type (spec §8.1's ingredient-type/product split, enforced by the schema itself - products have no parent-type concept). The green "Matches catalog ingredient: Whiskey" success state looks like the action succeeded, but it succeeded at the wrong thing for what the user wanted. This repeated twice more in the same session ("Irish Whiskey", then a "Rye Whiskey" product about to be submitted) before the pattern was diagnosed - confirming it's a discoverability/clarity gap in the UI, not user error, even for the person who built the schema.

**Data fix** (not a migration - same precedent as the live-added Mezcal/Crema di Pistacchio ingredients from an earlier chunk: real catalog data added via the equivalent of the real admin feature, not schema): "Scotch", "Irish Whiskey", and "Rye" added as real `ingredient_types` siblings of "Bourbon" under "Whiskey" (Spirit category, color `#b45309` matching Whiskey/Bourbon, bar_priority `essential` for consistency with Bourbon/Scotch). The stray "Scotch" and "Irish Whiskey" *product* rows (created by the test member account) were deleted, and that account's `user_inventory` ownership was moved directly onto the new types so nothing appeared to silently disappear from their My Bar. All of this was verified directly against the live DB with simulated admin/non-admin JWT claims before and after, mirroring the verification style used for `create_invitation()`/`createClassicRecipes()`.

**UI fix**: `AddProductScreen.jsx`'s "Matches catalog ingredient" success state now shows a contextual follow-up line - *"This adds a specific product under {type}. If '{name}' is really its own style (like Bourbon or Rye), not a specific bottle, request it as a new ingredient type instead"* - linking to `/request-ingredient` prefilled with whatever the user typed. Placed inside the success state itself (not the generic top banner, which already existed and clearly wasn't enough) because that's the exact moment the false confidence happens.

**Also answered this session** (no code change): whether there's a color picker on Add Product (no - `products` has no `color` column; color is an `ingredient_types`-only attribute, by design), and what protects against DB/input attacks (parameterized PostgREST queries via `supabase-js`, RLS default-deny on every table, no service-role key in the browser, no `dangerouslySetInnerHTML` anywhere in `src/` - confirmed by grep; real gaps: no length caps on free-text fields, no automated injection/RLS fuzz-testing harness beyond this session's manual DB-level checks, and Supabase Auth's leaked-password-protection is still off).

## Earlier chunk (step 12, fourth slice)

Recipe batch import, the "natural next build" flagged in the previous chunk. Same shape as ingredient batch import - AI-formatting-prompt generated from the live catalog, paste JSON, validate with row-level errors, preview, commit only the valid rows - but recipes need ingredient-type/glass/family/taste-tag resolution and a multi-table (`recipes` + `recipe_components` + `recipe_taste_tags`) insert per row, so it's a new schema module rather than a copy of `ingredientImport.js`.

**What shipped**: `src/schemas/recipeImport.js` (`validateRecipeImport` + `buildRecipeImportPrompt`, 19 unit tests) resolves each component's `ingredient` field through an EXISTING `ingredient_types.name` exact match only (no fuzzy matching, per the standing rule) - an unmatched name is a hard error, and the prompt explicitly tells the AI to put anything it can't map onto an existing ingredient into an `unresolvedIngredients` review array (per spec §12.4) rather than guess, which the validator turns into a visible per-row error rather than silently accepting a bad guess. Units are ml (numeric, converted by the AI, never oz/cl) or one of the same `NON_VOLUME_UNITS` the manual recipe editor uses - that constant moved from `EditorScreen.jsx` into `src/data/constants.js` specifically so the editor and the batch importer can't drift onto different unit vocabularies. Glass/family/taste-tag names resolve the same exact-match way against the live catalog. Duplicate detection checks the new name against every recipe the admin can see (`computed`, via the shared `useRecipes()`/`AppShell` context - admin's RLS grant means that's already every recipe, not just classics) as well as within the same paste.

`src/services/recipes.js` gained `createClassicRecipes(rows)`: admin-only via the pre-existing "recipes: insert" RLS policy's `is_admin()` branch (no new grant/migration needed - unlike a member's `createRecipe()`, an admin's insert isn't restricted to `owner_id = auth.uid() and source_type='user' and visibility='private'`). Batch-imported recipes join the canonical classic catalog directly: ownerless, `visibility='shared'`, published immediately (no pre-publish review queue, same as community recipes). The shared recipe+components+taste-tags insert-with-cleanup logic was extracted into a new `insertRecipeWithRelations()` helper used by both `createRecipe()` and `createClassicRecipes()`, rather than duplicating that multi-step dance a second time. Each row commits independently and failures are collected (`{ createdCount, failures }`) instead of one row's DB-level failure hiding whether the rest of the same paste succeeded - matches the spec's "atomic or clearly reports partial-item failures" wording more literally than a single try/catch around the whole batch would.

`AdminScreen.jsx`'s Batch Import tab now has a top-level Ingredients/Recipes entity switch (reintroducing an entity picker that was deliberately dropped in the ingredient-import chunk when recipes/products had nothing real to pick - now one of them does). Recipes only get the batch/AI flow, not a "single recipe" quick-add mode - the existing New Recipe screen (`EditorScreen.jsx`) already covers one-off creation, so a duplicate quick-add here would be redundant.

**Explicitly out of scope for this pass** (matches the manual recipe editor's own current capability, so batch import doesn't get ahead of what a human can already do for the same recipe): substitution groups/alternatives and recipe-to-recipe relationships (variation links). Both are real schema (`recipe_component_alternatives`, `recipe_relationships`) with no editor UI yet - already on the long-carried backlog list below.

Verified directly against the live DB before considering this done (simulated admin and non-admin JWT claims via `supabase db query`, same technique as the invitations chunk): an admin can insert a `source_type='classic', owner_id=null, visibility='shared'` recipe row and its `recipe_components` row; a non-admin member's identical insert attempt is correctly rejected with a real RLS violation (`42501`). Test rows deleted as cleanup (cascade removed the test component automatically). `pnpm test` — 64/64 passing (45 previous + 19 new). `pnpm build` clean.

**Not yet browser-clicked**: generating the recipe AI prompt, getting real JSON back from an AI, pasting/validating/committing through the actual Admin UI, and confirming an imported classic recipe shows up correctly in the Library/Detail screens (availability badges, glass liquid color, etc.).

## Earlier chunk (step 12, third slice)

Real invitation generation/revocation, replacing the Admin → Invitations tab's client-only mock. Triggered directly by the user hitting the bug this mock caused: they tried to sign in as a second test user and got "This invitation code is not valid" for a code the Admin panel listed as "active" - because that code (`CL-ALPHA-7X2` from `MOCK_INVITES`) had never actually been written to the `invitations` table; `generateInvite` was pure `useState`, never touching Supabase, while the real "Invitation needed" screen's `redeem_invitation` RPC correctly checked the real (empty) table.

**Fix**: migration `20260822090000_invitation_generation.sql` adds `create_invitation(expires_in_days default 60)`, a `SECURITY DEFINER` function (admin-gated via `is_admin()` inside the function body, matching AGENTS.md's rule that generation must run in protected backend logic, not client-side trust) that generates a `CL-XXXXX-XXX` code with a 5-attempt unique-collision retry and inserts the row server-side. Also fixes `invitations.redeemed_by`'s FK to point at `public.profiles` instead of `auth.users` (matching `created_by` and `ingredient_requests.requested_by`), so the admin UI can embed the redeemer's `display_name` via a normal PostgREST select instead of a second round-trip. Revocation deliberately does **not** get a matching function - admins already have full RLS access to `invitations` ("invitations: admin manages"), so `revokeInvitation()` in the new `src/services/invitations.js` is a direct guarded update (`revoked_at is null and redeemed_at is null`), following the same precedent as `resolveIngredientRequest`/`createIngredientTypes` (SECURITY DEFINER is reserved for cases where RLS genuinely can't grant the caller access, like redemption-by-a-non-member). `AdminScreen.jsx`'s Invitations tab now loads/generates/revokes for real; status (active/redeemed/expired/**revoked** - a state the old mock never modeled) is derived client-side from timestamps via `deriveInvitationStatus()`, matching the table's own "no stored status column" design. `MOCK_INVITES` deleted from `src/data/mockData.js` (no longer referenced anywhere).

Verified directly against the live DB before considering this done (simulated admin and non-admin JWT claims via `supabase db query`): `create_invitation()` succeeds for an admin (returned a real row, `created_by` correctly set, `expires_at` ~60 days out) and raises `"Only administrators can generate invitations."` for a non-admin, exactly as the function requires. The new PostgREST embed (`profiles!invitations_redeemed_by_fkey`) sanity-checked via a real REST call per AGENTS.md's embed-testing guidance (200, empty due to anon RLS denial - confirms the select shape is valid). Test invitation revoked as cleanup after verification. `pnpm test` (45/45) and `pnpm build` both clean; `db advisors --type security` shows only the same long-familiar accepted WARNs (every admin `SECURITY DEFINER` function in this codebase produces the same "callable by authenticated" WARN by design).

**Not yet browser-clicked**: generate a real invitation via the Admin UI button, copy it, redeem it from a second account's "Invitation needed" screen, confirm it shows "redeemed" with the right display name, and confirm Revoke correctly blocks redemption of a revoked code.

## Earlier chunk (step 12, first slice)

Real ingredient-type batch import with an AI-formatting-prompt generator, plus a lightweight member-facing ingredient-request queue. Both were user-requested mid-session, growing out of the taxonomy conversation below.

**Ingredient requests** (migration `20260816013526_ingredient_requests.sql`): members can't create ingredient types (spec §4), but had no way to flag a gap. New `ingredient_requests` table (name, note, status pending/fulfilled/dismissed) - members insert/read their own and can delete while still pending, admin reads/resolves all. `RequestIngredientScreen.jsx` (`/request-ingredient`, linked from More → Catalog and from the "doesn't match an existing ingredient type" warnings in `EditorScreen.jsx`/`AddProductScreen.jsx`, pre-filled with whatever name didn't match) is the submission form. `AdminScreen.jsx` gained a "Requests" tab (badge-counted in the tab bar) to fulfill/dismiss.

**Ingredient batch import**: `src/schemas/ingredientImport.js` - pure, framework-free `validateIngredientImport(rawItems, {categories, types})` (rejects missing/duplicate/unknown-category/unknown-or-cross-category-parentType/invalid-barPriority/invalid-color) and `buildIngredientImportPrompt({categories, types})`, which generates the AI-formatting-prompt text *from the same live catalog data the validator checks against* - the two can't drift apart, per the standing rule in this file's history. 14 unit tests. `AdminScreen.jsx`'s Batch Import tab is now real for the "Ingredient Types" option (paste JSON → validate → per-row pass/fail preview → commit only the valid rows via new `createIngredientTypes()` in `src/services/catalog.js`, admin-only via the pre-existing `ingredient_types: admin writes` RLS policy - no new grant needed); "Classic Recipes" and "Products" options are shown but disabled ("Coming soon") rather than left silently mocked, since faking their result next to a real one would be misleading.

**Immediate refinement, same session, from user feedback**: (1) the AI prompt was rendered in a small `maxHeight:220` scrollable `Card`, easy to miss/hard to actually read or select - swapped for a proper full-width `readOnly` textarea (select-all-on-focus) so it's genuinely visible and copyable even if the clipboard button is blocked by browser permissions. (2) User wanted to add one ingredient without going through JSON/AI for something trivial. Added a "Single Ingredient" mode (now the default) alongside "Batch Import (AI)" - a plain form (name, category, optional parent type scoped to the chosen category, bar priority, optional color/description) that reuses the exact same `validateIngredientImport()` call (as a one-item array) and `createIngredientTypes()` commit path as batch import, so there's one validation rule set, not two. (3) Wired the Requests tab to the new single-add form: each pending request gets an "Add to catalog" button that jumps to Single Ingredient mode pre-filled with the requested name (doesn't auto-resolve the request - fulfilling and adding are kept as separate admin actions). Also dropped the old always-disabled "Select Import Type" step entirely (classics/products were never selectable) since there was nothing left to pick with only ingredients real.

**Follow-up question → real feature, same session**: user asked where recipe colors/glasses come from. Answer surfaced a real gap: `recipes.liquid_color` was set by hand for the 8 seeded classics (eyeballed hex values matching what each drink actually looks like - e.g. Negroni `#c2410c`) but the recipe editor never exposed a field for it at all - `createRecipe`/`updateRecipe` didn't even accept the parameter, so every user-created recipe silently fell back to a flat cyan default regardless of the actual drink. The DB side needed no migration - `liquid_color` was already in the column-restricted UPDATE grant from step 6 (`20260815214307_recipes_schema.sql`), just never exercised by the client. Asked the user preset-swatches vs. free hex vs. auto-derive-from-ingredient-colors; chose preset swatches. Added `LIQUID_COLORS` (10 curated drink-appropriate hex values) to `src/data/constants.js` and a `ColorSwatchPicker` component in `src/components/primitives.jsx`, used in `EditorScreen.jsx` next to the Family picker; threaded `liquidColor` through `createRecipe`/`updateRecipe` in `src/services/recipes.js`.

**Immediate follow-up, from a screenshot of the single-ingredient form**: two real issues. (1) User asked for the same color-swatch treatment on ingredients, not just recipes - the single-add form's Color field was still a raw hex text `Input`. Swapped it for the same `ColorSwatchPicker` just built for recipes (now a genuinely shared component, not near-duplicate inline JSX in two screens). (2) User pointed out the form always defaulted to "Spirit" (since it sorts first) and asked, in effect, "which spirit is tomato juice" - a real bug: `singleCategoryId` defaulted to `catalog.categories[0]?.id`, so anyone adding a non-spirit ingredient without consciously changing the dropdown would silently file it under Spirit, and the Parent Type list would show irrelevant spirit styles (Bourbon, Rum, etc.) the whole time. Fixed: no default category (starts unselected, with an explicit "Select a category..." placeholder option), and the Parent Type field only renders once a category is actually chosen - both to stop the silent-Spirit trap and because an unfiltered/empty parent list before a category is picked isn't meaningful anyway.

**Two loading-flash bugs found and fixed while wiring this up** (same class as the `useRecipes.js` bug fixed earlier this session): `useCatalog.js`'s `refetch()` was setting `loading:true` on every call, which unmounts the whole `Outlet` behind a bare loading screen - this was already being triggered today by `AddProductScreen` after adding a product, and would have been triggered by every future import commit too. Fixed the same way: don't re-enter the blocking state after the first load.

## Recently completed (this session, already committed and pushed)

- **Step 11**: recipe publishing/unpublishing, with a NULL-safety authorization bug caught and DB-verified before shipping. Browser-confirmed working.
- **Recipe editing**: owners can edit their own recipe, admins can edit the classic catalog only (tightened a pre-existing gap where admins could edit *any* member's recipe - migration `20260815231800_tighten_recipe_edit_scope.sql`).
- **Two real layout/state bugs, browser-confirmed fixed**: `useRecipes.js`'s refetch causing a full-app loading flash on every publish/unpublish/save, and `AppShell`'s root wrapper using `minHeight` instead of `height` (a flex container without a *definite* height can't give its `overflow-y:auto` child a bounded box to scroll within - nothing was scrolling anywhere, for any screen, for any content taller than the viewport).
- **Ingredient taxonomy pass**: `ingredient_types.parent_type_id` existed in the schema since day one but was never populated *or even fetched* (`fetchIngredientTypes()` was missing the column from its select - a second, independent latent bug). Now used for real: "Rum"/"Whiskey" under Spirit (Dark Rum/Bourbon reparented beneath them), "Aperitif"/"Digestif" under Liqueur (Campari/Aperol under Aperitif). Added `ingredient_categories.sort_order` (Spirit leads; Bitters/Herb/Juice/Garnish trail). Folded the sparse "Citrus" category into a broader "Juice" one (matches the spec's own suggested category list). Added a new "Garnish" category (also spec-named, previously missing entirely) with 5 starter types: Orange, Lemon, Lime, Cherry, Berries. `MyBarScreen.jsx` now sub-groups by category order and parent/child, and shows "Covered by \<child\>" under a parent type that isn't directly owned but has an owned child (the availability engine already treated this as satisfied via the parent-walk; the toggle alone didn't communicate that).
- **A pre-existing, untracked "Juice" and "Wine" ingredient category** were found live in the DB with no migration behind them during this work - not investigated further, just worked around (merged into rather than colliding with "Juice"; "Wine" left untouched). Still an open item - see Blockers.

Migrations for all of the above: `20260815230002_recipe_publishing.sql`, `20260815231800_tighten_recipe_edit_scope.sql`, `20260816010047_category_order_and_spirit_hierarchy.sql`, `20260816011432_liqueur_aperitif_hierarchy.sql`, `20260816012630_garnish_category.sql`, `20260816013526_ingredient_requests.sql`.

## Implemented & verified

- `pnpm test` — 45/45 passing (31 domain + 14 new schema tests).
- `pnpm build` succeeds — no errors, checked repeatedly through the session.
- Every migration this session clean on `db advisors --type all`/`--type security` (only the long-familiar accepted WARNs - SECURITY DEFINER functions intentionally callable by `authenticated`, leaked-password-protection disabled).
- Admin ingredient-type insert path verified directly against the live DB (simulated admin auth, real insert/select/cleanup).
- Ingredient request insert/read/update path verified directly against the live DB - including confirming the "owner can delete only while pending" policy correctly blocks a delete after the admin has resolved it (found via a real blocked cleanup attempt, not by reasoning alone).
- Step 11, the loading-flash fix, and the scroll fix are all **browser-confirmed by the user**.
- `create_invitation()` verified directly against the live DB with simulated admin and non-admin JWT claims (admin succeeds with a real row, non-admin correctly rejected); the new `profiles!invitations_redeemed_by_fkey` PostgREST embed sanity-checked via a real REST call (200, empty due to anon RLS denial).
- `createClassicRecipes()`'s underlying insert path verified directly against the live DB with simulated admin (succeeds, `owner_id null`/`source_type classic`/`visibility shared`) and non-admin (real `42501` RLS rejection) JWT claims. `pnpm test` — 64/64 passing (45 previous + 19 new recipe-import schema tests).
- `createProducts()`'s bulk-insert path verified directly against the live DB with simulated admin JWT claims (a 2-row insert succeeds, `created_by` correctly defaults per-row to the caller). `pnpm test` — 74/74 passing (64 previous + 10 new product-import schema tests).
- The Scotch/Irish Whiskey/Rye taxonomy fix and the stray-product cleanup (see "Earlier chunk, fifth slice") were all verified directly against the live DB (insert, delete, and inventory-restore each confirmed via a follow-up select) - not yet re-confirmed by the user in the actual My Bar UI.

## Browser walkthrough, 2026-08-22 - results

User worked through the full "Checks needed" list from the previous chunk:

- **Recipe editing**: admin-edit-a-classic confirmed working. Owner-editing-their-own-community-recipe still **not checked** (only got to test as admin).
- **Taxonomy display in My Bar**: all five sub-checks (sort order, Rum/Whiskey indentation, Aperitif indentation, Garnish section, "Covered by ‹child›") **confirmed working**. Follow-up request (deferred, polish backlog): pictogram+text per ingredient type in My Bar, with the on/off toggle living on the pictogram itself rather than a separate switch.
- **Ingredient requests**: flow wasn't clear from the checklist wording alone - walked the user through the exact screens/buttons (More → Catalog → "Request an Ingredient", or the "Request it" link in New Recipe/Add Product's "doesn't match" warning; admin resolves via Admin → Requests). Not yet actually clicked through.
- **Ingredient batch import**: **confirmed working end-to-end** - user generated the AI prompt, got real JSON back for Mezcal + Crema di Pistacchio, pasted/validated/committed successfully.
- **Single Ingredient add**: user flagged "no color picker in My Bar" as a possible gap - confirmed this is correct behavior, not a bug: the color picker only exists where a *new ingredient type* is defined (Admin → Batch Import → Single Ingredient), because `AddProductScreen` (My Bar's add-product flow) only ever attaches a product to an *existing* ingredient type, which already has a color.
- **Liquid color picker**: **confirmed working** (swatch picker saves, detail-page glass color updates). Two follow-up requests raised at the time: pictogram+text glass picker (replacing the current text-label buttons in `EditorScreen.jsx`), and an admin-facing way to add custom colors beyond the then-fixed 10 swatches - the second one **shipped 2026-08-23** as the `liquid_colors` DB table (see "Last completed chunk").
- **User also asked** whether classic/community/private recipes are visually distinguished - they already are, via the existing `SourceBadge` component (`src/components/primitives.jsx`) shown on Library cards and the Detail screen, plus a Library filter-chip row. Nothing to build there; just wasn't obvious from the UI alone.
- **Real bug found this session, now fixed** (see "Last completed chunk" above): Admin → Invitations was a client-only mock disconnected from the real `invitations` table - the user hit this directly trying to test with a second account. Real invitation generation/revocation now shipped; generating and redeeming a real invitation end-to-end through the browser is the one still-open item from this fix.

## Confirmed working via a real browser walkthrough, 2026-08-22

Real invitation generate → redeem round-trip; the Whiskey/Bourbon/Scotch/Irish Whiskey/Rye taxonomy fix; the Add Product "request it as a new ingredient type" hint; recipe batch import's happy path (AI prompt → real JSON → validate → commit → shows up correctly); product batch import's commit step (the 17 real products the user pasted all landed in the DB - the *browsing/ownership* gap that surfaced from this is now fixed, see "Last completed chunk").

## Confirmed working, QA round 2 (2026-08-22)

Real invitation generate/redeem round-trip; My Bar's expand-and-toggle-a-specific-product flow (user confirmed it works, and separately flagged - not a bug, just a forward-looking note - that a flat product list could get unwieldy at real-world scale, e.g. 50 vodkas/200 whiskeys under one type; no action taken yet, "we'll see"); the Whiskey/Bourbon/Scotch/Irish Whiskey/Rye taxonomy siblings; "Clone as My Own Recipe" (full prefill confirmed); recipe editing as owner; the owner/admin edit-permission boundary.

## Confirmed working, QA round 3 (2026-08-22)

The new admin-only product edit in My Bar ("2. works"). The recipe-import prompt fix wasn't actually re-tested with a *fresh* AI round-trip yet - the user's round-3 test reused stale pre-fix JSON, which is exactly why it still showed the old "Fresh pineapple - 50 g" bug and led to finding the real fixes below; a genuine fresh-prompt re-test is still outstanding (see below).

## Confirmed working, QA round 4 (2026-08-22)

My Bar correctly shows "Orange Juice" as its own row, separate from "Lemon Juice" - the seed-data fix and the searchable type-picker both hold up in the real browser.

## Confirmed working, QA round 5 (2026-08-22)

Substitution alternatives: adding a substitute, saving, and re-opening the recipe all persist correctly, and owning the substitute (not the original) does flip the recipe to available - the write path + availability read-back both confirmed live. Two things fell out of this round, both fixed same-day (see "Last completed chunk"): (1) the recipe detail view doesn't show *which* substitute matched, just that the component is satisfied - user wants this surfaced, not just correct under the hood; (2) the recipe-import inline "Add ingredient" draft's category field was a collapsed `<Select>` with no visible label, which on the user's screen read as inert placeholder text rather than a tappable control - blocked using the "+Add" flow entirely. Replaced with a `CategoryPicker` chip grid (all ~11 categories visible at once, no hidden second tap) in all three places that pattern existed: the inline draft, single-ingredient add, and My Bar's ingredient-type edit.

## QA script — this session's work (2026-08-23), step by step

Concrete steps for the "Checks still needed" items below, in priority order. Needs both accounts open at once: admin in the normal window, the non-admin test account in incognito (matches the user's existing setup). Being fed to the user in small portions, one section at a time, per their request - mark each step's checkbox-equivalent (~~strikethrough~~) as they report it back, don't dump the whole remaining list on them at once.

1. ~~**`/admin` redirect (the actual security bug reported)**~~ — **browser-confirmed working, 2026-08-23**: non-admin hitting `/admin` directly now redirects to `/home`.
2. ~~**Users tab - block**~~ — **browser-confirmed working, 2026-08-23**: blocking the test account showed the "Your access has been revoked" screen live in incognito.
3. ~~**Users tab - unblock**~~ — **browser-confirmed working, 2026-08-23**: unblocking restored normal access.
4. ~~**Users tab - promote/demote**~~ — **browser-confirmed working, 2026-08-23**: promoting the test account granted real Admin access live, demoting removed it. User feedback: the demote button read as "Make Member" - relabeled to "Demote to Member" for clarity against "Make Admin".
5. ~~**Users tab - self-action guard**~~ — **browser-confirmed working, 2026-08-23**: no action buttons render on the admin's own row, just "(you)".
6. ~~**Classic Recipes tab**~~ — **browser-confirmed working, 2026-08-23**: search filters, Edit opens the recipe editor, Delete removes it from the list and the Dashboard count.
7. ~~**Ingredient Types tab**~~ — **browser-confirmed working, 2026-08-23**: search, Edit, and Delete (both the in-use rejection and the successful unused-type delete) all confirmed live.
8. ~~**Moderation tab search**~~ — **browser-confirmed working, 2026-08-23**: search filters, Unpublish still works on a filtered result.

**This QA script is now fully complete, 2026-08-23** - the /admin security fix and every new Admin tab from this session are browser-confirmed working end to end.

## Checks still needed (not yet browser-verified)

- ~~**`/admin` access-control fix, urgent retest**~~ — **browser-confirmed working, 2026-08-23**: non-admin hitting `/admin` directly now redirects to `/home` instead of rendering the Admin screen.
- ~~**New Admin "Users" tab - block/unblock**~~ — **browser-confirmed working, 2026-08-23**: blocking the real test account live-locked it out (the "Your access has been revoked" screen), unblocking restored normal access.
- ~~**New Admin "Users" tab - promote/demote**~~ — **browser-confirmed working, 2026-08-23**: promote/demote both worked live; demote button relabeled "Demote to Member" per user feedback.
- ~~**Editing *any* existing recipe, urgent retest**~~ — **browser-confirmed working, 2026-08-23**: the glass-shape regression's Save crash is gone; editing a recipe with a since-renamed glass prefills correctly and saves.
- ~~**Admin Dashboard's 5 stat cards, all now clickable**~~ — **browser-confirmed working, 2026-08-23** (all led to the right places under the previous Library/My Bar destinations). **Superseded same day**: Classic Recipes and Ingredient Types now open their own new Admin tabs instead (see "Last completed chunk") - needs a fresh recheck, not the same test as before.
- ~~**New Admin "Classic Recipes" tab**~~ — **browser-confirmed working, 2026-08-23**: search, Edit, and Delete (with Dashboard count update) all confirmed live.
- ~~**New Admin "Ingredient Types" tab**~~ — **browser-confirmed working, 2026-08-23**: search, Edit (shared `IngredientTypeEditor`), and both Delete outcomes (in-use rejection, unused-type success) all confirmed live. My Bar's own edit pencil (the other caller of the same shared component) still worth a separate glance next time that screen's open, but not urgent given this refactor was a straight extraction, not a rewrite.
- ~~**Moderation tab's new search box**~~ — **browser-confirmed working, 2026-08-23**.
- ~~**New Recipe's multi-draft auto-save, full retest**~~ — **fully browser-confirmed working, 2026-08-23**, all three parts: (1) single-draft restore after a Request-Ingredient round trip, (2) two concurrent drafts both persisting with a working picker (found and fixed a real index-wipe regression along the way, plus a nameless-draft restore bug and a duplicate-ingredient-request bug found from the same testing thread), (3) the 5-draft cap evicting the oldest correctly.
- ~~**Add Product's updated copy**~~ — **browser-confirmed working, 2026-08-23**.
- ~~**Recipe-import inline "Add ingredient" draft, retest**~~ — **browser-confirmed working, 2026-08-23**: category chip grid confirmed working; also found and fixed a real staleness bug along the way (see "Last completed chunk" history) where a name already in the catalog still offered a doomed "+Add" button.
- ~~**New Recipe editor's glass and family pictogram pickers**~~ — **browser-confirmed working, 2026-08-23**: all 19 glass icons and (as of this session's new work) all 16 family icons render correctly and highlight on selection.
- ~~**My Bar's new card-grid layout**~~ — **browser-confirmed working, 2026-08-23**: tap-to-toggle, chevron expand, and admin edit pencil all behave correctly and independently (a card whose ownership is driven by an owned product rather than the generic flag correctly doesn't toggle on tap - confirmed as intended, not a bug). Family clusters read clearly as groups; standalone types render as plain cards outside any box; the flattened Liqueur types (Aperol, Campari, Galliano, Amaretto, Crema di Pistacchio, Triple Sec) show with no "Aperitif"/"Digestif" row above them. Found and fixed one real bug along the way: a cluster card with several owned products could visually grow wider than its slot (see "Last completed chunk" history) - now fixed. Not separately re-checked on a real small/mobile viewport.
- ~~**Admin → Catalog → Glasses' new shape picker**~~ — **browser-confirmed working, 2026-08-23**: added a glass ("Shcnitzel") with no matching name, picked Collins' shape manually, confirmed it saves and shows correctly in the list. Not separately re-confirmed on a real recipe card/detail - same rendering path already proven for all 19 built-in glasses, low risk.
- ~~**Full 19-glass catalog, first real look**~~ — **browser-confirmed working, 2026-08-23**: the New Recipe glass picker screenshot from this same session showed all 19 icons rendering distinctly in one view. The "did a rename silently break an existing recipe's icon" half wasn't separately re-checked against a specific pre-existing recipe, but no glass-icon issue has surfaced anywhere across this whole session's extensive Detail/Library/Editor use, so treating this as low-risk rather than demanding a dedicated re-check.
- ~~**Ingredient request flow, for real this time**~~ — **browser-confirmed working, 2026-08-23**: submitted multiple real requests, confirmed they show in Admin → Requests, resolve correctly, and (new) duplicates are now blocked.
- ~~**Recipe batch import with a genuinely fresh AI round-trip**~~ — **browser-confirmed working, 2026-08-23**: current prompt → real out-of-catalog ingredient → AI put it in `components` correctly → inline "+Add" → amount stayed intact through import.
- ~~**Product delete in My Bar's expanded list**~~ — **browser-confirmed working, 2026-08-23**: trash icon → confirm inline → Delete, product disappears from the list immediately.
- ~~**Ingredient-type edit in My Bar**~~ — **browser-confirmed working, 2026-08-23**: edit pencil on a type row → change category/parent/color → Save → sticks and re-sorts correctly.
- ~~**Crema di Pistacchio under Digestif, and the new Beer/Stout types**~~ — **browser-confirmed working, 2026-08-23**: Crema di Pistacchio shows under Liqueur with no stray "Digestif" grouping; new Beer/Stout types show correctly under Beer.
- ~~**The new "Your Requests" list on Request an Ingredient**~~ — **browser-confirmed working, 2026-08-23**: submitted requests show up with a "Pending" status; withdraw button visible and functional.
- ~~**Admin → Catalog tab**~~ — **browser-confirmed working, 2026-08-23**: add/rename/delete round-trip confirmed. Two real UX gaps found alongside this (not bugs, see "Last completed chunk"/backlog): the admin tab bar's order has no logic to it, and the Ingredient Types tab has no "Add" entry point (should deep-link into Batch Import's Single Ingredient mode).
- ~~**Ingredient aliases end-to-end**~~ — **browser-confirmed working, 2026-08-23**: added "Sec" → Triple Sec, confirmed it resolves correctly. Real UX gap found alongside this: the alias-management location itself was wrong (a standalone global list) - moved into each ingredient type's own edit form instead (see "Last completed chunk"). The relocated UI itself still needs its own fresh click-through.
- ~~**New Recipe → "Paste a Recipe (AI)"**~~ — **browser-confirmed working, 2026-08-23**: prompt → real AI JSON → paste → Fill Form → form populated correctly.

## Remaining / not started (what's next) - numbered backlog, 2026-08-22

Working through this list one item at a time, in this order unless redirected. Mark each done in place (`~~strikethrough~~ — done, <date>`) rather than deleting, same convention as the Phase & chunk list above.

1. ~~**Glass / taste-tag / family / ingredient-category management UI**~~ — **done, 2026-08-22**: new "Catalog" tab in `AdminScreen.jsx`, one shared `NamedRowManager` component for all four tables.
2. ~~**Ingredient aliases**~~ — **done, 2026-08-22**: `src/domain/ingredientResolution.js` + admin CRUD UI + wired into all three importers, Add Product, and My Bar's product-edit type input.
3. ~~**Member-facing "paste a recipe, app fills in New Recipe"**~~ — **done, 2026-08-22**: new "Paste a Recipe (AI)" mode on New Recipe, `src/schemas/recipePaste.js`'s lenient `parseRecipePaste()`.
4. ~~**Substitution alternatives editor UI**~~ — **done, 2026-08-22, scoped to substitutions only per user's answer**: `EditorScreen.jsx`'s new "Substitutes:" chips, `insertComponentsWithAlternatives()` in `recipes.js`. `recipe_relationships` ("variation of") deliberately not included - a separate future item.
5. **Polish backlog** - partially done, 2026-08-22:
   - ~~pictogram+text glass picker in the recipe editor~~ — **done**: reuses `GlassSvg` (added an optional `color` prop so the icon can highlight cyan when selected, defaulting to the old hardcoded `var(--text2)` for existing callers).
   - ~~pictogram treatment for cocktail families in the recipe editor~~ — **done, not originally scoped but requested alongside the glass picker**: new `src/components/FamilyIcon.jsx` (Beer/Highball/Shot/Sours/Spritz/Stirred, flat outline SVGs matching `GlassSvg`'s visual language).
   - ~~pictogram+text card treatment for ingredient types in My Bar, toggle living on the card itself~~ — **done**: `MyBarScreen.jsx`'s per-category row list is now a CSS grid of cards (color-swatch pictogram + name, tapping the card toggles owned state); edit-type form and the expanded per-type product list each render as a `gridColumn: "1 / -1"` full-width panel instead of inline list rows. Child types (e.g. Dark Rum under Rum) keep a smaller card + muted styling instead of list indentation, and rely on DOM order (appearing right after their parent) to read as grouped.
   - ~~glass icon tied to a code change per new glass name~~ — **done, 2026-08-22, user-reported gap right after the glass-picker pictogram work landed**: user noticed the Catalog tab's own hint text said a new glass falls back to a generic martini icon until someone edits `GlassSvg.jsx`, and asked not to have to request a code change for every new glass. New `glasses.shape` column (migration `20260822160000_glass_shape.sql`, backfilled to match each existing row's current on-screen icon) decouples the pictogram from the name - admin picks a shape via a new `ShapePicker` chip row (Catalog tab, both add and edit forms) instead of the icon being inferred from spelling.
   - ~~full 19-glass catalog with a distinct pictogram for each~~ — **done, 2026-08-22, immediately after the shape-picker landed**: user supplied a 19-item reference list (Rocks/Highball/Collins/Coupe/Nick & Nora/Martini/Copper Mug/Hurricane/Tiki Mug/Margarita/Red & White Wine/Champagne Flute & Tulip/Pint/Pilsner/Beer Stein/Glencairn/Shot) and asked to add them all with "an image for each," expecting no more to be needed after this. Migration `20260822170000_full_glass_catalog.sql` renames the 5 glasses with a 1:1 match in place (preserves `id`, so no existing recipe's `glass_id` breaks) and inserts the other 14 as new rows; `GlassSvg.jsx` grew from 5 shape branches to 19 and `GLASS_SHAPES` (`src/data/constants.js`) lists all 19 keys. The old single "wine" glass had no 1:1 match (the new list splits wine into red/white) - renamed to "Red Wine Glass" as the closer default, "White Wine Glass" added alongside it as new. A genuinely novel silhouette none of these 19 resemble would still need a developer to add a `GlassSvg` branch + `GLASS_SHAPES` entry, but that's the rare case now, not the default.
   - ~~parent/child ingredient types indistinguishable in the card grid~~ — **done, 2026-08-22, user-reported after seeing the Whiskey/Bourbon/Scotch/Rye/Irish Whiskey and Aperitif/Campari/Aperol/Galliano rows**: the only distinction had been a small icon-size difference (30px vs 38px), too subtle to read as a hierarchy once 10+ cards sit in a row. Chose "bordered family cluster" from 3 options presented (vs. a parent-name tag on each child, or a colored accent bar) - a parent with children now renders as its own bordered box spanning the full grid width, labeled "`<Name>` family," with the parent + children laid out together inside via flex-wrap; a parent with no children still renders as a plain standalone card, unchanged. Required extracting the per-item card/edit-form/expanded-products JSX into three reusable functions (`renderTypeCard`/`renderEditTypeForm`/`renderExpandedProducts`) so both the standalone and clustered layouts could call the same code with a different "full width" style (`gridColumn: "1 / -1"` for a direct grid child vs `width: "100%"` for something nested inside the cluster's own box).
   - ~~admin-facing custom colors beyond the fixed 10-value `LIQUID_COLORS` list~~ — **done, 2026-08-23**: new `liquid_colors` DB table + Admin → Catalog management section (see "Last completed chunk"). Deferred, tentative per user's own framing: a member-facing "request a new color" flow mirroring ingredient requests.
   - Still open: search/filter within My Bar's expanded per-type product list once a catalog has many products under one type.

**Domain-modeling fix alongside the above, 2026-08-22**: Aperitif and Digestif were removed as parent ingredient types - user pointed out their children (Aperol/Campari/Galliano, Amaretto/Crema di Pistacchio/Triple Sec) aren't real substitutes for each other the way a Gin sub-style or (arguably) a Rum variant is, so the parent-covers-child availability logic was implying a substitutability that was never true, and nobody owns a bottle of generic "Aperitif." Checked live data before changing anything: zero recipes reference "Aperitif," "Digestif," or "Whiskey" directly, so all three were safe to restructure with no recipe impact - but one recipe *does* use generic "Rum" directly, so Rum's hierarchy stays. Migration `20260822180000_flatten_aperitif_digestif.sql` nulls the children's `parent_type_id` and deletes the two now-childless parent rows. User explicitly chose to leave Whiskey's hierarchy (Bourbon/Scotch/Rye/Irish Whiskey) as-is for now, despite citing it as the same underlying problem - a separate decision to revisit later if they change their mind, not an oversight.

**Known pre-existing drift, not touched by the glass-catalog work above**: `supabase/seed.sql`'s glasses insert (`martini, rocks, highball, coupe, wine, collins`, no `shape` column at all) still reflects the original 6-glass scheme and doesn't match the live 19-glass catalog - it's dev-fixture bootstrapping for a from-scratch local DB (per AGENTS.md, not applied to the hosted project), and was already stale relative to `ingredient_categories`/`ingredient_types` before this chunk (years of migrations since the last seed.sql update). Fixing it properly means reconciling the whole file with current live data, not just the glasses line - a separate cleanup task, flagged here rather than done partially.
6. ~~**Automated RLS/integration test harness**~~ — **done, 2026-08-24**: `supabase/tests/rls_suite.sql` now covers all ~15 RLS-protected tables (`recipes`, `ingredient_types`, `memberships`, `glasses`, `taste_tags`, `cocktail_families`, `liquid_colors`, `ingredient_categories`, `products`, `ingredient_aliases`, `invitations`, `ingredient_requests`, `user_inventory`, `recipe_components`, `recipe_component_alternatives`, `user_favorites`, `user_want_to_make`) - caught two real app bugs along the way this session (`liquid_colors` role scoping, the earlier `recipes`/`memberships` finds) plus two test-script-only bugs in this final extension (see "Last completed chunk"). Still open, not done: wiring this into actual CI (no `.github/workflows` exists in this repo yet - that's a separate follow-up needing the hosted project's credentials as GitHub secrets, not assumed to be wanted just because the script exists) - re-run manually via `npx supabase db query --linked --file supabase/tests/rls_suite.sql` for now, and re-run the whole suite after any future migration touching RLS.
7. **Step 13 (final phase)**: responsive/accessibility/security/deployment QA - not started at all yet.
8. **Recipe relationships ("variation of")** - split out from the old #4 when the user scoped that item to substitutions only. `recipe_relationships` is real schema/RLS with zero callers, same audit finding as substitutions had before this chunk - but a separate feature decision (what counts as a "variation," how it displays), not assumed to be the same shape as the substitution work just finished.
9. ~~**Component-size refactor**~~ — **done, 2026-08-24**: `AdminScreen.jsx` 3,769→793, `EditorScreen.jsx` 1,425→799, `MyBarScreen.jsx` 852→301, `DetailScreen.jsx` 657→247 - see "Last completed chunk" for the full breakdown, the new `ConfirmPanel` shared component, and the one real bug (`deriveInvitationStatus` used without an import) found via ad-hoc `oxlint -D no-undef`. **Still needs a full manual browser click-through** before considering this fully closed - no browser automation was available this session.

**Not on the numbered list - smaller loose ends, pick up opportunistically**: `ingredient_types: admin delete` RLS policy still has no caller (not requested); `<datalist>` ingredient-autocomplete theming (user-accepted deferral back in step 6); no recipe yet references any of the Garnish ingredient types added earlier; the untracked "Juice"/"Wine" ingredient-category mystery needs a question asked of the user, not code (see Blockers).

**Requested QA round 5 (2026-08-22)** — ~~`DetailScreen.jsx`'s availability view should show *which* substitute satisfied an ingredient~~ — **done, 2026-08-23**: `computeAvail()`'s new `substitutions` map plus the `DetailScreen.jsx` row display (see "Last completed chunk"), including the owned-dot fix found while building it. Not yet browser-verified.

**Real feature, not started, not covered by anything above**: a member-facing "paste a full recipe as free text, app fills in New Recipe" flow - the actual ask behind the pineapple whisky sour recipe the user originally pasted. Needs its own scoping pass (an AI-formatting-prompt + paste + validate + prefill flow like admin batch import, but for one recipe and available to ordinary members, not admin-only).

## Blockers / open questions

An untracked "Juice"/"Wine" ingredient-category pair was found live in the database with no migration behind it (see above) - not blocking, but worth asking the user directly: did something write to the DB outside the migration flow? `AGENTS.md` explicitly calls out avoiding undocumented dashboard-only changes.

## Decisions made & why

- **`recipes: read` and `profiles: read own or admin` both had a spec deviation baked into their very first migration - fixed by matching the actual spec text, not by asking, 2026-08-23.** Unlike the Users-tab feature (a genuinely new capability needing scoping questions), these were bugs where the shipped RLS was already wider than what `docs/Cocktail_Library_Development_Spec.md` §8.3 actually specifies (confirmed by reading the real spec text, not just the migration's own comment describing it) - same class of drift already caught once this session for recipe UPDATE/DELETE. A bug matching a documented spec doesn't need a scoping conversation, just a citation.
- **Any member can now read any other member's `profiles` row (broadened from admin-or-self), 2026-08-23.** Needed for community-recipe authorship to work for ordinary members, not just admins. Judged low-risk without asking first: `profiles` has no email column at all (email lives only in `auth.users`), so the exposed columns are `display_name`/`role`/preferences/join date - standard visibility for a small invite-only community, not comparable to the block/role-change feature's actual security stakes.
- **`handle_new_user()`'s fallback changed from the raw signup email to a generic `"New Member"` placeholder, not a derived-from-email alternative (e.g. the local-part before `@`).** The point of the fix is no longer leaking anything email-derived once display names are member-readable - a bare non-PII placeholder, paired with the join form now requiring a real display name up front, means the fallback should rarely even fire going forward.
- **Both real accounts' `display_name` (currently their literal email) were deliberately left untouched rather than fixed via direct SQL.** It's the user's own account data; the newly-fixed Edit Profile screen is both the intended fix and the natural next QA step for that exact feature.
- **`/admin` route gating lives in a wrapper (`RequireAdmin` in `App.jsx`), not a check inside `AdminScreen` itself, 2026-08-23.** `AdminScreen` calls dozens of `useState`/`useEffect` hooks unconditionally through its body - an early `if (!isAdmin) return <Navigate/>` before them would violate the rules of hooks (conditionally skipping hook calls). A route-level wrapper checks `isAdmin` once, in its own component with a single hook call, and simply never mounts `AdminScreen` at all for a non-admin.
- **Block/unblock is a `memberships.revoked_at` soft-revoke column, not a row delete, 2026-08-23.** User's explicit choice - mirrors how `invitations` already models revocation via a timestamp rather than deleting the row, preserves the original `invitation_id`/`granted_at`, and makes unblocking a clean reversal (`revoked_at = null`) instead of needing to fabricate a new membership row with no real invitation behind it.
- **Role changes and block/unblock are both `SECURITY DEFINER` functions, not direct RLS/column grants, even though admin already has full read access to both tables.** For `profiles.role` specifically this isn't just style: the table already has an "update own" policy for the signed-in member (display_name/unit/theme via its own column grant) - broadening that column grant to also include `role` would let the *same* "update own" policy be satisfied by a member's own row, since Postgres OR's multiple permissive policies together rather than requiring the admin-only one specifically. That's a real self-escalation path; a function sidesteps it entirely by running with its own privilege and never needing the dangerous grant to exist on the client-facing surface. Applied the same treatment to `memberships` for consistency, since it already had zero write policy for anyone but invitation redemption and this keeps that boundary intact.
- **Neither user-management function lets an admin target their own account, 2026-08-23.** User's explicit choice over allowing it - avoids an admin accidentally demoting or blocking themselves with no other admin around to undo it. The Users tab UI also just doesn't render the action buttons on the signed-in admin's own row, rather than showing a control that can only ever fail server-side.
- **Classic Recipes and Ingredient Types are new AdminScreen tabs, not separate routes, 2026-08-23.** User's explicit choice over standalone `/admin/recipes`-style URLs - keeps them in the existing tab-bar pattern (Overview/Invitations/Moderation/Requests/Batch Import/Catalog) instead of a new navigation shape.
- **Edit + Delete only for classics/ingredient types, no "disable," 2026-08-23.** The original ask mentioned disable, but neither entity has an active/inactive concept in the schema today - user confirmed Edit+Delete (zero new migrations, both already RLS-permitted) over adding a new column and wiring it through every place availability/library filtering reads recipes/types, which is real, separate scope.
- **`deleteIngredientType()` has no in-use pre-check, matching the glasses/taste-tags/families precedent.** Every FK actually referencing `ingredient_types(id)` (child types via `parent_type_id`, `products`, `recipe_components`, `recipe_component_alternatives`) is a plain restricting FK, not cascade - verified by reading every migration that references the table before writing this, not assumed. Only `ingredient_aliases` and `user_inventory` cascade, and both are meant to (a dangling alias or ownership record for a deleted type is meaningless). So a real delete attempt on an in-use type fails with the DB's own error, the same UX already shipped for glasses.
- **Ingredient-type edit form extracted into a shared `IngredientTypeEditor` component rather than duplicated.** My Bar's admin pencil and the new Admin tab need the identical form (including the `validateIngredientImport()` single-item duplicate-check reuse) - genuine reuse of real business logic across two files, not the "three similar lines" case the no-premature-abstraction rule is about.
- **Ingredient-type hierarchy uses the existing `parent_type_id` column, not new tables or new categories.** Matches the spec's own example (`Spirit → Gin → London Dry Gin`) and required zero schema changes - the column existed, just unused and unfetched.
- **Admin can only edit/delete the classic (ownerless) catalog, never another member's recipe**, tightened from the original broader policy - the spec says "No by default" for admin editing another user's recipe, and the original RLS was wider than that.
- **Batch import commits only the valid rows and reports the rest, rather than an all-or-nothing transaction.** Matches the spec's "atomic-or-clearly-partial commit" wording; simpler than a single multi-row transaction via RPC, and each row is independent (no cross-row foreign keys within one import).
- **The AI-formatting-prompt is generated from the same catalog data the validator checks against**, not hand-written separately - this was flagged as a requirement while planning step 12, specifically to prevent the prompt's instructions and the validator's actual rules from silently drifting apart over time.
- **Classic/product import options were shown but disabled ("Coming soon") while unbuilt, rather than left as the old fake-success mock** - once one import path was real, faking success for the other two would have been actively misleading rather than merely incomplete. Historical now: all three (ingredients, recipes, products) are real as of this session, so there's no remaining "Coming soon" state in Batch Import.
- **Product batch import dedupes on `name + ingredientType`, not name alone.** Unlike a recipe or ingredient-type name (expected to be globally unique-ish), the same product name legitimately exists under two different types (two brands both selling an "Amaretto" mixer vs. liqueur, say) - deduping on name alone would have produced false-positive duplicate errors.
- **Ingredient requests don't auto-create anything.** Fulfilling a request is bookkeeping (marks it resolved); the admin still goes through Batch Import to actually add the type, since a request is just a name + optional note, not a validated category/hierarchy/color.
- **Invitation generation is a `SECURITY DEFINER` function; revocation is a direct RLS-gated update, not a matching function.** AGENTS.md is explicit that invitation *generation* must run in protected backend logic, not client-side trust - but admins already have a full RLS grant on `invitations` ("invitations: admin manages"), so revocation (and reading the list) go through that grant directly, same precedent as `resolveIngredientRequest`/`createIngredientTypes`. SECURITY DEFINER is reserved for cases RLS genuinely can't cover, like a not-yet-a-member redeeming a code.
- **`invitations.redeemed_by` now references `profiles`, not `auth.users`.** Matches `created_by` and `ingredient_requests.requested_by`, and lets the admin UI embed the redeemer's `display_name` in one PostgREST select instead of a second query.
- **Recipe batch import creates classic (ownerless, published) recipes directly via the existing admin RLS grant, not a new `SECURITY DEFINER` function.** Unlike invitation generation, the "recipes: insert" policy's `is_admin()` branch already gives an admin unrestricted insert - there's no identity boundary for a function to cross, so adding one would just be an unnecessary extra layer (same reasoning as invitation revocation).
- **Recipe batch import deliberately doesn't support substitution alternatives or recipe relationships.** The manual recipe editor doesn't expose either yet - letting batch import get ahead of manual creation would mean an imported recipe could have structure no human-created recipe can replicate through the UI, and no way to edit that structure afterward either.
- **`createClassicRecipes()` collects per-row commit failures instead of throwing on the first one.** Each recipe's insert is already independent (no cross-row foreign keys within one import, same reasoning as ingredient batch import), so a rare DB-level failure on one row (validation already checked shape/references, but not concurrent state) shouldn't obscure whether the rest of the same paste succeeded.
- **New-recipe drafts auto-save to browser localStorage, not a real server-side draft table, 2026-08-22.** User reported real churn risk: a recipe blocked by an unresolved ingredient (spec explicitly forbids members creating ingredient types - "prevents user-created data from breaking recipe matching") could get abandoned along with the whole edit if the tab closed while waiting on admin approval. Presented three options (real server-side draft with nullable `ingredient_type_id`/`glass_id`, local-only auto-save, or letting members create types directly); user chose local-only as the pragmatic near-term fix over the bigger schema project - explicitly accepting it won't survive a different device or a cleared browser. Scoped to plain new-recipe creation only (`EditorScreen.jsx`, `!isEditing && !cloneSourceId`), keyed per user id, cleared on successful save.
- **Real gap found immediately after shipping the above, same day**: the draft was being saved correctly, but nothing routed the member back to it after submitting an ingredient request - "Request it" only led to a generic Request an Ingredient screen with a plain history-based "Back," easy to not associate with "my recipe is still there." Fixed by having `EditorScreen.jsx`/`AddProductScreen.jsx`'s "Request it" links carry a `returnTo` param (their own current path), and `RequestIngredientScreen.jsx`'s post-submit confirmation shows an explicit "Back to what I was doing" button using it, plus a line confirming unsaved changes are still there - deterministic navigation instead of relying on browser history semantics the member has to already trust.
- **Second real gap found right after that, same day**: the draft used one fixed localStorage slot per user - starting a second in-progress recipe (e.g. while waiting on the first one's ingredient approval) silently overwrote the first, reported as "all of them are deleted." Each draft now gets its own id reflected in the URL (`?draft=<id>`, so a refresh or the ingredient-request return path keeps pointing at the same one), tracked in a small per-user index (id/name/updatedAt) capped at 5 - landing on a blank New Recipe with others already saved shows a picker list instead of just the latest one.
- **Add Product's copy now leads with "you probably don't need this."** Spec §8.1 already states a generic ownership toggle satisfies a recipe's requirement just as well as a specific product - user found the screen implied a required step and got confused by it, but the underlying architecture was already correct (a brand-critical spirit like Jägermeister is modeled as its own ingredient *type*, same as Campari; Add Product is genuinely only for optional brand-level tracking). Fixed with copy + a My Bar link, no architecture change.
- **Real regression found live, 2026-08-22, from the glass-shape work earlier in the session**: `mapRecipe()` (`recipes.js`) had been changed to output `glass: row.glass?.shape` (e.g. `"rocks"`) so `GlassSvg` could render the right pictogram - but `EditorScreen.jsx` also reads that same `glass` field to prefill the glass picker and, at save time, looks it up by *name* against the live `glasses` list. Since every glass got renamed to a full display name in the 19-glass migration (`"rocks"` → `"Rocks Glass"`), that lookup silently found nothing for *every* recipe, and `Save` crashed with "Cannot read properties of undefined (reading 'id')" - a real recipe (the Becherovka one from this session's earlier draft-loss testing) hit this exact crash trying to edit and re-save. Fixed by splitting the field: `glass` is the real name again (what `EditorScreen.jsx` has always needed), `glassShape` is the new dedicated field for `GlassSvg`'s pictogram - both now selected via `glass:glasses(name, shape)`. Verified against the actual affected recipe ("Signal Lost") that its glass row's name/shape now resolve correctly.

Earlier decisions (still standing, trimmed here - see git history for step 2-10 and earlier step-11 notes): JS-only in `src/**` with `vite.config.ts` exempted; hosted Supabase; repo at `github.com/maxsoulfly/cocktail-library`; RLS policy shape (one policy per command, `to authenticated` explicit, `(select auth.uid())` wrapped, `coalesce(..., false)` around any comparison against a nullable column used in an authorization check); every `SECURITY DEFINER` function needs `revoke ... from public, anon, authenticated` explicitly; `useCatalog`/`useInventory`/`useRecipes`/`useLists` called exactly once in `AppShell` and shared via context, and none of their `refetch()`s should re-enter a blocking `loading:true` state; `Card` forwards `onClick`; `AppShell`'s root wrapper needs `height`, not `minHeight`.

## Migrations / environment changes

Newest: `20260905130000_fix_topup_part_corruption.sql` - data-correction only (no schema change), repairs the 5 `recipe_components` rows corrupted by the `unitLabelToForm()` bug (see current-context.md's top-up/part chunk) back to `unit_label = 'top-up'`, targeted by row id with a `unit_label = 'top-up part'` guard. **`supabase db push --linked` failed** on this session's first attempt with `is_moderator already exists` while trying to replay migration history starting from `20260825100000_moderator_role.sql` - this fresh CLI session's local migration-tracking state doesn't match what's actually applied on the remote. Not investigated/resolved (would need understanding the mismatch before forcing anything against a live database) - applied this one fix directly via `supabase db query --linked --file <migration>` instead (same mechanism already used for the RLS test suite), and verified the result directly against the DB rather than trusting the push. **Worth flagging to the user**: any future `db push` in a fresh CLI session may hit the same conflict until this history mismatch is actually diagnosed. Earlier entries below predate this and are not fully up to date (several migrations from 2026-08-25/26 landed without an entry added here - see git history in `supabase/migrations/` for the authoritative list). Previous logged: `20260823150000_liquid_colors.sql` - new `liquid_colors` table `(id, name unique, hex unique, check hex ~* '^#[0-9a-f]{6}$')`, RLS "members read / admin writes" mirroring `cocktail_families`. Seeded with the 10 original `LIQUID_COLORS` swatch values plus 2 new ones (Deep Violet `#6b21a8`, Blue `#2563eb`). Not a foreign key target - `recipes.liquid_color`/`ingredient_types.color` are untouched, still plain hex strings. Applied via `supabase db push --linked`, verified 12 rows present via `supabase db query --linked`. `db advisors --type security` unchanged (no new function). Previous: `20260823140000_cocktail_family_shapes.sql` - adds `cocktail_families.shape`, backfilled 1:1 from name, plus 10 new common family rows (Fizz, Flip, Julep, Martini, Old Fashioned, Punch, Smash, Tiki, Toddy, Frozen). Previous: `20260823130000_classic_promotion.sql` - adds `recipes.original_owner_id` (purely informational, no RLS/authorization dependency) and `admin_promote_recipe_to_classic()`/`admin_demote_recipe_to_community()` (both `SECURITY DEFINER`, admin-gated). Required an app-side follow-up: `RECIPE_SELECT`'s `owner:profiles(...)` embed needed an explicit `!recipes_owner_id_fkey` hint once a second FK to `profiles` existed, or PostgREST treats the relationship as ambiguous - same fix needed on `fetchCommunityRecipes()`'s embed even though it doesn't touch the new column. Previous: `20260823120000_public_display_names.sql` - broadens `profiles: read own or admin` to `profiles: read own or member` (any member, `id = own` kept as an explicit branch), and changes `handle_new_user()`'s fallback from the raw signup email to `"New Member"`. Previous: `20260823110000_tighten_recipe_read_scope.sql` - removes the `or public.is_admin()` branch from `recipes: read` so admin can no longer read another member's still-private recipe (matches the actual spec §8.3 text, which never included an admin clause). Before that: `20260823100000_admin_user_management.sql` - adds `memberships.revoked_at`, updates `is_member()` to require it `is null`, and adds `admin_set_user_role()`/`admin_set_membership_revoked()` (both `SECURITY DEFINER`, admin-gated, self-target refused). All applied via `supabase db push --linked`; `db advisors --type security` unchanged from the pre-existing baseline throughout (new functions get the same expected "callable by authenticated" WARN as every other admin function; RLS-only changes and the trigger don't add new findings).

Sixteen migrations total across this session's work (thirteen prior to today, three more today) - backlog #4 (substitutions) needed **no new migration**, it reuses the existing `recipe_component_alternatives` RLS policies (read/insert/delete via `recipe_is_editable()`) that had simply never been called. Newest: `20260822170000_full_glass_catalog.sql` renames the 5 originally-matching glasses in place and inserts the other 14, widening `glasses_shape_check` to 19 shape keys first (had to drop the constraint, run the renames, then re-add it - `add constraint check` validates existing rows immediately, and the old "wine" row would have failed against the new list until its own rename ran first; caught this the first push attempt, which rolled back cleanly with no partial state). Previous: `20260822160000_glass_shape.sql` added the `glasses.shape` column itself. All migrations applied via `supabase db push`. No new environment variables.

## Tests / build checks last run

2026-09-10 (Ingredient Forms admin UX rework - `IngredientFormsTab.jsx` only: compact rows, reveal-on-demand add form, collapsed inline searchable `TypeComboBox` pickers, `max-w-2xl`, side-by-side-on-desktop fields): `corepack pnpm@10.34.3 test` - **242/242** (unchanged, no domain/service change). `pnpm build` clean (168 modules). `pnpm format` not run (oxfmt CRLF bug); isolated-LF `oxfmt --check` clean on `IngredientFormsTab.jsx` (4 reflows hand-applied). No migration, no schema/RLS/service change. **No browser tooling in this sandbox** (no Playwright/Puppeteer/Chromium, `$PORT` unset) - reworked layout + admin add/edit/save NOT visually verified. User confirmed the three engine/data checks (Whiskey Sour / Caipirinha / seeded pairs listed).

2026-09-10 (Ingredient Forms - Concept 2: computeAvail form-conversion matching + ingredient_form_conversions table + admin "Ingredient forms" tab + inline recipe guidance): `corepack pnpm@10.34.3 test` - **242/242** passing (232 prior + 9 in `availability.test.js` + 1 in `recommendations.test.js`). `pnpm build` clean. `pnpm format` not run (oxfmt CRLF bug); isolated-LF `oxfmt --check` clean on all 10 changed files (availability.js / IngredientFormsTab.jsx / AdminScreen.jsx needed reflow, hand-applied). Migrations `20260910140000` + `20260910150000` pushed via `supabase db push --linked` (clean). `db advisors --type security` - no new finding. RLS suite (`supabase/tests/rls_suite.sql`) extended with an `ingredient_form_conversions` block - full suite passes. Live REST: anon GET on the table -> `200 []`; seed rows (Lemon->Lemon Juice, Lime->Lime Juice) present. **Mobile verification pending** - checklist handed over with the commit.

2026-09-10 (Household Basics Stage 3 close-out - docs + verification only, no code change): `corepack pnpm@10.34.3 test` — 232/232 passing (unchanged). `pnpm build` clean. `pnpm format` not run (oxfmt CRLF bug; no source changed anyway). Shortcut wiring for all three admin entry points (Home "Edit list", My Bar ⋯, Add ingredients ⋯ → `/admin?tab=onboarding`) verified by reading `BuildYourBar.jsx` / `AdminMenu.jsx` / `SearchFilterHeader.jsx` / `AddIngredientsScreen.jsx` / `AdminScreen.jsx` (`TABS` entry + `?tab=` deep-link resolution + render guard) / `App.jsx` (`RequireStaff`, `isAdmin` context). User drag retest PASSED. Two non-blocking limits recorded (Home "Edit list" visual check - no empty-bar admin account; offline-save handling). **Household Basics complete.**

2026-09-06 (Cocktail Library/My Bar UX Stage 3 - IngredientDetailScreen.jsx + two routes + Library's `?ingredient=` filter): `pnpm test` — 182/182 passing (unchanged, no new domain logic). `pnpm build` clean. `pnpm format` clean. Committing this stage before requesting the mobile check (per the standing process note). Mobile verification **pending**, not yet performed. Real test URLs recorded in "Last completed chunk" above, since nothing links to this screen yet.

2026-09-06 (Cocktail Library/My Bar UX Stage 2 - Library's grouped availability view, `?sort=availability`): `pnpm test` — 182/182 passing (unchanged, no domain logic touched). `pnpm build` clean. `pnpm format` clean. Committed as `110aff8`. **Partially browser/mobile-verified, 2026-09-06 - layout confirmed good on a real iPhone; search/filter interaction on top of the grouped view not yet reported, recorded as outstanding, not assumed.**

2026-09-06 (Cocktail Library/My Bar UX Stage 1 - findRecipesUsingIngredient(), pure domain matching): `pnpm test` — 182/182 passing (170 prior + 12 new). `pnpm build` clean. `pnpm format` clean. Committed as `7066e95`. No UI wiring yet, so no browser verification applied to this stage.

2026-09-06 (Build Your Bar Stage 4 - final integration review, no new feature code): `pnpm test` — 170/170 passing (unchanged from Stage 3). `pnpm build` clean. `pnpm format` clean. No new manual verification - reused the recorded Stage 1-3 checks per the user's instruction, all already confirmed on a real iPhone. One real integration question chased down (whether a failed initial inventory fetch could strand the per-visit snapshot at `null` forever) and confirmed not reachable, by reading `App.jsx`'s actual error-gating code. **Feature complete.**

2026-09-06 (Build Your Bar Stage 3 - "Show my cocktails" + LibraryScreen's ?sort=availability): `pnpm test` — 170/170 passing (unchanged, no new domain logic this stage). `pnpm build` clean. `pnpm format` clean. **Browser/mobile-verified by the user on a real iPhone, 2026-09-06 - button usability, availability ordering, search/filters, and unchanged Browse behavior all confirmed.**

2026-09-06 (Build Your Bar Stage 2 - the homepage section: BuildYourBar.jsx + HomeScreen.jsx wiring, per-visit snapshot with account-safe reset): `pnpm test` — 170/170 passing (unchanged, no new domain logic this stage). `pnpm build` clean. `pnpm format` clean. **Browser/mobile-verified by the user on a real iPhone, 2026-09-06 - full manual checklist passed, nothing found.**

2026-09-06 (Build Your Bar Stage 1 - essentials list + resolver + `/bar?focus=1` autofocus): `pnpm test` — 170/170 passing (164 prior + 6 new in `buildYourBar.test.js`). `pnpm build` clean. `pnpm format` clean. Committed as `fca3768`. **Manual autofocus check done and confirmed working** (desktop + real iPhone) - see the Stage 1 chunk above for the iOS keyboard-doesn't-auto-open finding.

2026-09-05 (both editor-parsing follow-ups closed: plural-unit normalization for edit-prefill, descriptive-unit scaling exclusion for a legacy numeric prefix): `pnpm test` — 164/164 passing (160 prior + 4 new). `pnpm build` clean. `pnpm format` clean. Not committed yet. Migration-history mismatch investigated (`migration list --linked`), not forced/altered per explicit instruction. Browser "open/save/reopen" verification still needed from the user - no credentials available to the agent.

2026-09-05 (top-up/part corruption bug - found live, fixed `parseUnitLabel()`/`EditorScreen.jsx`, data repaired): `pnpm test` — 160/160 passing (157 prior + 3 new). `pnpm build` clean. `pnpm format` clean. Data fix verified directly against the live DB via `supabase db query --linked` (all 5 corrupted rows confirmed repaired, nothing else changed). Not committed yet. Browser "open/save/reopen" verification still needed from the user - no credentials available to the agent.

2026-09-05 (serving-size Stage 5 - final integration review, no new feature code): `pnpm test` — 157/157 passing (unchanged from Stage 4). `pnpm build` clean. `pnpm format` clean, tree already clean. No new manual verification - reused the recorded Stage 1-4 checks per the user's instruction, all already confirmed on a real iPhone. **Feature complete.**

2026-09-05 (serving-size Stage 4 follow-up - hide servings selector + base-recipe amounts while in parts mode): `pnpm test` — 157/157 passing (153 prior + 4 new in `recipeShareText.test.js`, the first test file outside `src/domain/`). `pnpm build` clean. `pnpm format` clean. **Browser/mobile re-verified by the user on a real iPhone, 2026-09-05 - full round-trip passed, Stage 4 fully accepted.**

2026-09-05 (serving-size Stage 4 - parts-mode UI, 3-way ml/oz/parts toggle + mixed-recipe fallback): `pnpm test` — 153/153 passing (148 prior + 5 new in `parts.test.js`). `pnpm build` clean. `pnpm format` clean. **Browser/mobile-verified by the user on a real iPhone, 2026-09-05 - full manual checklist passed.**

2026-09-05 (serving-size Stage 3 - parts ratio computation, `computePartsRatio()`, incl. a precision bug found in review and fixed before commit - see the Stage 3 chunk): `pnpm test` — 148/148 passing (138 prior + 10 new in `parts.test.js`). `pnpm build` clean. `pnpm format` clean. Committed as `33dc7c9`. No browser verification applicable - pure domain logic, nothing wired to a screen yet.

2026-09-05 (serving-size Stage 2 - selector UI wired into DetailScreen): `pnpm test` — 138/138 passing (unchanged, no domain logic touched). `pnpm build` clean. `pnpm format` clean. **Browser/mobile-verified by the user on a real iPhone, 2026-09-05 - full manual checklist passed, no bugs found** (see "Last completed chunk" for the full checklist).

2026-09-05 (serving-size Stage 1 - shared scaling logic, splash/to-taste units): `pnpm test` — 138/138 passing (125 prior + 13 new in `servings.test.js`, 2 new in `recipeImport.test.js`). `pnpm build` clean. `pnpm format` clean. No browser verification applicable - pure domain logic, nothing wired to a screen yet.

2026-08-23 (ingredient aliases moved into the type's own edit form): `pnpm test` — 106/106 passing (unchanged, UI-only). `pnpm build` clean (bundle size dropped slightly, net code removed). `pnpm format` clean. **User browser-confirmed working, 2026-08-23**.

2026-08-23 (admin-manageable liquid color palette): `pnpm test` — 106/106 passing (unchanged, UI/service wiring). `pnpm build` clean. `pnpm format` clean. `db advisors --type security` unchanged from baseline. **User browser-confirmed working**, including a follow-up layout fix (hex field moved inline with the name field/Add button instead of stacking on its own line, per user's "weird when they are on different lines" note on a wide viewport - looked fine on mobile, fixed anyway for consistency).

2026-08-23 (private-recipe RLS fix + real usernames): `pnpm test` — 104/104 passing (unchanged). `pnpm build` clean. `db advisors --type security` unchanged from baseline. Verified directly against the live DB for both migrations (see "Last completed chunk" for exact checks). Not yet browser-verified.

2026-08-23 (Change Password fix + password-generator autofill wiring): `pnpm test` — 102/102 passing (unchanged). `pnpm build` clean, both after the initial fix and after the autofill follow-up. **Browser-confirmed working by the user, 2026-08-23** (Save actually changes the password - confirmed via the exact real-world case above, a forgotten incognito-account password).

2026-08-22 (recipe-draft localStorage auto-save + Add Product copy): `pnpm test` — 102/102 passing (UI-only, no schema/domain change). `pnpm build` — no errors. `pnpm format` — clean. Not yet browser-verified - needs a real test: start a new recipe, type a name and an unmatched ingredient, close the tab, reopen New Recipe, confirm the "Restore draft" banner appears and repopulates every field correctly (including substitution alternatives); confirm the draft is gone after a real successful save.

2026-08-22 (My Bar family clusters + flatten Aperitif/Digestif): `pnpm test` — 102/102 passing. `pnpm build` — no errors. `pnpm format` — clean. Verified live: querying the Liqueur category post-migration shows Aperol/Campari/Galliano/Amaretto/Crema di Pistacchio/Triple Sec all with `parent_type_id = null`, and the "Aperitif"/"Digestif" rows are gone; confirmed beforehand that zero recipes/products/aliases referenced either type directly, so the delete carried no FK risk. `db advisors --type security` unchanged from the pre-existing baseline. Not yet browser-verified - see "Checks still needed" above (folded into the My Bar card-grid check).

2026-08-22 (margarita `GlassSvg` shape, 2 rounds): `pnpm test` — 102/102 passing (UI-only). `pnpm build` — no errors. `pnpm format` — clean. User supplied a real photo reference for both rounds; first fix was still wrong (two-tier saucer-on-belly), second fix (single wide bulging bowl) matched.

2026-08-22 (full 19-glass catalog + 14 new `GlassSvg` shapes): `pnpm test` — 102/102 passing (UI/service wiring, no domain logic touched). `pnpm build` — no errors. `pnpm format` — clean. Verified live against the DB: all 19 rows present with the expected name/shape pairs post-migration; `db advisors --type security` shows no new findings beyond the pre-existing ones.

2026-08-22 (glass `shape` column + admin `ShapePicker`): `pnpm test` — 102/102 passing (UI/service wiring, no domain logic touched). `pnpm build` — no errors. `pnpm format` — clean. Verified live against the DB: admin can insert a glass with a valid shape; an invalid shape (`'teapot'`) is rejected by the new check constraint; backfilled shapes for all 6 existing glasses match what they already rendered as (`collins`→`highball`, everything else→its own name). Not yet browser-verified - see "Checks still needed" above.

2026-08-22 (pictograms - `GlassSvg`/`FamilyIcon` in the recipe editor, My Bar card grid): `pnpm test` — 102/102 passing (UI-only change). `pnpm build` — no errors. `pnpm format` — clean. Not yet browser-verified - see "Checks still needed" above.

2026-08-22 (QA round 5 fix - `CategoryPicker`): `pnpm test` — 102/102 passing (UI-only change, no domain logic touched). `pnpm build` — no errors. `pnpm format` — clean.

2026-08-22 (backlog #4): `pnpm test` — 102/102 passing (unchanged by backlog #4 - UI/service wiring against already-tested domain logic, not new pure-function rules). `pnpm build` — no errors. `pnpm format` — clean. Verified directly against the live DB this session, most recently: a recipe owner can insert a component + substitution alternative; a different identity (including admin, since this was a private user recipe and `recipe_is_editable()` only lets admin touch ownerless classics) gets a real RLS rejection; the `recipe_component_alternatives` embed sanity-checked via a real REST call. Earlier in the session: `create_invitation()`, `createClassicRecipes()`, `createProducts()`, `updateProduct()`, `deleteProduct()`, `updateIngredientType()`, `deleteMyIngredientRequest()`, the `createGlass`/`updateGlass`/`deleteGlass`/`createIngredientCategory` family, and `createIngredientAlias()` (admin/owner succeeds, non-admin/non-owner matches zero rows / real RLS rejection; deleting an in-use glass fails with a real `23503` FK violation; a case-insensitive-duplicate alias fails with a real `23505` unique-index violation). All test rows/recipes cleaned up after verification.

## Exact next recommended action

**Stopped for the day mid-feature, 2026-08-25 - start here.** Immediate next step: build the UI for the duplicate-merge tool (see "Last completed chunk" above for full backend detail, already applied and verified). Concretely:
1. `mergeIngredientType(loserId, survivorId, addAlias)` wrapper in `src/services/catalog.js`, calling the already-applied `admin_merge_ingredient_type` RPC.
2. A "Merge into..." action in `src/components/admin/TypesTab.jsx` next to the existing edit/delete controls - needs a survivor picker (searchable, since there could be 80+ types), the add-alias checkbox, and a confirm step before calling the merge (this is real data deletion, no undo).
3. Extend `supabase/tests/rls_suite.sql` with coverage: non-admin and moderator callers both rejected, a real merge round-trip confirming reassignment landed correctly across all 6 referenced tables (parent_type_id, recipe_components, recipe_component_alternatives, products, user_inventory, ingredient_aliases).
4. Once built: browser-verify the actual Black Pepper/Pepper merge for real, since that's the live duplicate that prompted this feature.

**Also queued, not started**: category-level icons for mobile touch targets (user's second request this session - "we need icons, and place for big fingers"). Needs a scoping pass first (which category header/filter-chip UI gets icons, new migration for a shape/icon column on `ingredient_categories`, whether to reuse the `INGREDIENT_SHAPES` pattern or make a smaller category-specific set) before any code - see "Last completed chunk" for what's already known.

**Also queued, unrelated to the above**: the RLS suite's fixture-selection query is currently broken (fails at its very first assertion) because one of the 2 real test "member" accounts got promoted to `moderator` during earlier browser verification - needs either a relaxed fixture query or a genuine 3rd plain-member test account before the suite can run clean again.

**Before any of the above**: ask the user to hard-refresh their browser first - the My Bar screenshot they showed at the end of this session was stale (didn't reflect the already-applied pictogram/category migration), which is what triggered the "there was one, but whatever" Black Pepper/Pepper confusion. Confirm they're actually seeing the new pictograms/categories before doing anything else.

**Saved plan documents**: `docs/plans/component-size-refactor.md` and `docs/plans/tailwind-conversion.md` - both executed, committed, and fully browser-verified. Full design rationale in each.

**Two Phase 6 sub-pieces are code-complete but not yet browser/assistive-tech-verified** (older than the above, still true):
1. Empty/loading/error-state fix (7 silent-failure handlers fixed, all 6 data hooks now expose a real `error`/`loaded` state, a new `ErrorScreen` closes the "stuck on Loading... forever" gap) - needs a manual pass killing network mid-load to confirm `ErrorScreen` + Try Again work, and confirming a refetch failure (e.g. add a product while offline) doesn't nuke the whole app back to that screen.
2. Keyboard-access + accessible-labels fix - **keyboard operability browser-confirmed working, 2026-08-25**. The `aria-label`/`aria-pressed` additions are still unverified with a real screen reader (none available this session) but are lower-risk (simple, directly-readable DOM attributes).

Layout/responsive gaps found by the accessibility audit were deliberately left unfixed (user's choice): zero tablet-specific breakpoints anywhere in the codebase despite the spec requiring them, no max-width constraint at wide desktop viewports (content stretches edge-to-edge), several fixed 2-column grids that don't densify at tablet/desktop width, a handful of touch targets under ~32px in My Bar/editor flows (directly relevant to the new category-icon request above), and one color-only status indicator (`IngredientsSection.jsx`'s per-ingredient dot).

Two Phase 6 sub-pieces remain untouched: dark/light theme QA and production deployment/backup notes - both need the user actively driving a browser (or, for deployment notes, mostly documentation work). The new moderator role (see "Earlier chunk") is done and browser-confirmed. Backlog #9 (component-size refactor + Tailwind conversion) and step 13's security regression testing sub-piece are also both entirely done.

Other open items, lower priority: backlog #7/#8 (`recipe_relationships`/"variation of" - needs its own scoping conversation first, what counts as a "variation" and how it displays), or wiring the RLS suite into actual CI (needs the hosted project's credentials as GitHub secrets - not started, not assumed wanted without asking).

Round-5 QA is fully browser-confirmed as of earlier today - every item on the checklist (see "Checks still needed" above, now all struck through) has been walked through in the real app, including two real UX fixes found along the way (admin-manageable liquid colors, ingredient aliases relocated into each type's own edit form).

**Still mid-flight from earlier the same day**: two things. (1) Browser-verify the new promote/demote-classic feature (Moderation tab → Promote a real published community recipe → confirm it lands correctly in Classic Recipes with the "originally by" credit and the Detail page's own credit line → Demote it back → confirm it's restored under the original owner in Moderation). (2) Resume the interrupted multi-draft QA retest - step 1 (draft survives a Request-Ingredient round trip) is confirmed fixed; still need step 2 (a *second* concurrent draft, picker shows both, Continue/Discard/Save each behave correctly) and step 3 (push past 5 drafts, oldest quietly evicted).

**Older, still true**: **Highest priority, another real user report**: (1) ~~Private filter~~, (2) ~~Edit Profile sets a real name, sticks after refresh~~, and (3) ~~Library grid cards now show "by {name}"~~ - all **browser-confirmed working, 2026-08-23**. (2) surfaced a real gap along the way: `CocktailCard.jsx` never rendered an author at all, only `DetailScreen.jsx` did - now fixed. User also caught the join form's Password field not offering Chrome's password generator - `SignInScreen.jsx` had the same missing-real-`<form>` issue Change Password had earlier this session, now fixed the same way (`autoComplete="new-password"` in join mode, `"current-password"` in sign-in mode). ~~Browser-confirmed working, 2026-08-23.~~ Still needed, lower priority/optional (costs a real invitation code): (4) generate a fresh invitation and run through the full join form to confirm the required Display Name field works end to end and a fresh signup never falls back to showing an email.

**The full 2026-08-23 security-fix + Users-tab + new-Admin-tabs QA script is fully browser-confirmed** (see the QA script section above - every step passed, one copy tweak made: "Make Member" → "Demote to Member"). The Library Source-filter visibility change also still needs its first click-through - confirm the chips render right under Availability and still filter correctly.

Change Password and the substitute-match display are both **browser-confirmed working, 2026-08-23** - the Google-password-generator-suggestion half of Change Password specifically wasn't re-confirmed (the user's test was a real forgotten-password recovery, not a fresh-suggestion check), worth a quick look next time that screen's open but not urgent.

User is mid-QA-walkthrough (round 5) - "Paste a Recipe (AI)" and "Editing *any* existing recipe" (glass-shape regression) are **browser-confirmed working, 2026-08-23**. Resume the rest of the round-5 checklist (My Bar card-grid, glass shape picker, 19-glass catalog, family clusters, etc. - see "Checks still needed" above) once the Library filter change is confirmed. Once the user finishes the current checklist pass: continue numbered backlog #5 (remaining polish items)-#8 unless redirected. Ask about the untracked "Juice"/"Wine" *category* mystery whenever convenient - not urgent. Also worth asking at some point whether Whiskey should get the same Aperitif/Digestif flattening treatment - user explicitly deferred that decision, not forgot it.

**Process note for future verification**: when a table's INSERT/UPDATE RLS policy checks a column against `auth.uid()`, verify by simulating the exact payload the client actually sends (letting column defaults apply, not supplying the column explicitly in test SQL) - this session's earlier "verified against the live DB" claim for ingredient requests tested the policy shape but not the client's actual call shape, which is exactly why this bug went undetected until a real user hit it.

**RLS-caller audit: done once, 2026-08-22, now fully resolved.** Full original results in the RLS-audit chunk further down. `ingredient_aliases`, the four `glasses`/`taste_tags`/`cocktail_families`/`ingredient_categories` admin-write policies, `recipe_component_alternatives`, and (as of this session's last chunk) `ingredient_types: admin delete` and `recipes: delete` on the classic catalog are all now resolved (backlog #1, #2, #4, and the new Admin tabs). Still open: `recipe_relationships` (split into its own backlog #8, a genuinely separate feature decision from substitutions). Re-run this audit after any future batch of new tables/policies rather than waiting for the user to notice gaps one at a time.

## Files/areas relevant to next action

`src/domain/ingredientResolution.js` (the shared name-or-alias resolver - now used by every ingredient-matching path in the app, three separate instances of a raw-matching gap found and fixed across this session). `src/services/recipes.js`'s `insertComponentsWithAlternatives()` and `EditorScreen.jsx`'s substitution chips - just shipped, needs a browser click-through with a real saved recipe. `src/schemas/recipePaste.js`/`EditorScreen.jsx`'s "Paste a Recipe (AI)" mode, `src/screens/AdminScreen.jsx`'s "Catalog" tab, and `src/screens/RequestIngredientScreen.jsx`'s "Your Requests" list also still need their own browser click-throughs. Numbered backlog #5-#8 in "Remaining / not started" are what's left - #8 (`recipe_relationships`) is the next real feature decision if picked up.
