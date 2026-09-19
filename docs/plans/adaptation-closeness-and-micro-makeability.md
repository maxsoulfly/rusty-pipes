# Adaptation Closeness & Micro-Quantity Makeability

**Planning document — 2026-09-19/20.** Follows the completed Existing Cocktail
Adaptation Pass (Batches 1-11, `current-context.md`) and a dedicated
Adaptation/Replaceability Model Audit conducted against that pass's real
evidence rather than theoretically. All decisions below (Parts A/B/C) are
**approved by Max**; this document specifies the implementation. Not started —
see "Staged implementation plan" at the end before writing any code.

## Why this exists

The model audit found three concrete, evidence-backed gaps in the existing
availability/adaptation engine (`src/domain/availability.js`,
`src/domain/makeability.js`):

1. When a recipe component has multiple owned valid alternatives, the app
   picks one to display arbitrarily (`Array.prototype.find()` over an
   unordered DB result) with no real logic and no way for the user to see or
   choose among the others. Found via a real case: Between the Sheets' White
   Rum component has both `→ Spiced Rum` and `→ Vodka` recipe-specific
   alternatives; whichever the embedded query happens to return first wins,
   and nothing pins that order.
2. `required` currently means one thing only: "required to reproduce the
   canonical recipe," which is correct and must stay unambiguous — but it's
   also the *only* signal `computeAvail()` uses to decide practical
   makeability, so a missing 2-dash Angostura Bitters and a missing 60ml
   Bourbon are computed identically (`almost`, one missing required). Found
   via real cases: Old Fashioned's Angostura vs. its Bourbon; Trinidad Sour's
   Angostura stored at 45ml (functioning as a base spirit) vs. Vieux Carré
   (1938)'s Angostura at 1 dash (a true accent) — proof this can't be solved
   by ingredient identity/category.
3. `recipe_component_alternatives` has no amount/unit override, so an adopted
   alternative always inherits its parent component's exact amount/unit.
   Found via a real wall: Gin & Tonic's Lime garnish (`1 wedge`) can't
   honestly link to Perfect Serve's Cucumber convention (`3 slice`) without
   either lying about the quantity or leaving the swap incomplete.

Three independent, additive pieces of work follow from this (A, B, C below).
None of them change what `strict`/`computeAvail()` means — canonical truth
stays exactly as authored. All three are pure additions on top of the
existing four-tier model.

---

## Part A — Substitution closeness

### Problem

Multiple owned valid alternatives for one component need a deterministic,
honestly-framed default order. Picking "how far this replacement moves from
canonical" needed investigating against the real substitution graph before
committing to a scale — a numeric score turned out not to be defensible (see
audit sessions), but a coarse 3-band model is.

### Semantics (tightened, evidence-tested against the full live graph)

**Close** — same functional role, and no single character axis (flavor,
sweetness, color, body, proof) is significant enough that an honest note
needs a contrastive clause. Test: could the note be written without a "but"?
Examples: `Cognac → Brandy`, `Lime Juice ↔ Lemon Juice`, `Sugar Cube ↔ White
Sugar`.

**Noticeable** — same functional role, but one clear, nameable character axis
changes (a real flavor note, a real sweetness/proof shift) — the drinker
would notice and could describe it, but recognizes the same kind of drink.
Examples: `Peychaud's Bitters → Angostura Bitters`, `Grapefruit Juice →
Orange Juice`, `White Rum → Gold Rum`.

**Transformative** — either the functional/structural role itself changes (a
characterful ingredient replaced by something structurally neutral, or an
entire flavor dimension added/removed rather than shifted), or multiple axes
change at once. Examples: `White Rum → Vodka`, `Gin ↔ Vodka`, `Falernum →
Orgeat Syrup`.

**Explicit non-goals, must be preserved in every consuming surface:**
- Closeness answers *"how far from canonical"*, never *"will I like this"*
  or *"is this good."* No UI surface may render a closer option as "best,"
  "recommended," "preferred," or "better."
- A more transformative option remains fully, equally selectable. The user
  may deliberately want it (Between the Sheets made with Vodka on purpose).
- Real pairs will be genuinely borderline (`White Rum → Dark Rum`,
  `Blue Curaçao ↔ Cointreau`). This is expected of a coarse model, not a
  defect — authors should not agonize over precision the underlying
  judgment doesn't have.
- **Closeness is not context-independent in every case.** `Blue Curaçao ↔
  Cointreau` is the clearest proof: a global "Noticeable" is defensible for
  most recipes, but any recipe where the blue color is structurally the
  point (a Blue Lagoon-style drink) needs a recipe-specific override to
  "Transformative." This is why the override mechanism below is required,
  not optional polish.

### Schema

```sql
alter table public.ingredient_substitutions
  add column closeness text
    check (closeness is null or closeness in ('close', 'noticeable', 'transformative'));

alter table public.recipe_component_alternatives
  add column closeness text
    check (closeness is null or closeness in ('close', 'noticeable', 'transformative'));
```

Both nullable, **no default value** — the existing ~95 `ingredient_substitutions`
rows are not backfilled with a guessed value by migration. This is a
deliberate, author-judgment field (per the audit's own finding that it can't
be reliably automated from taxonomy or any other existing signal); rows
without a value simply have no closeness opinion yet.

`recipe_component_alternatives.closeness`: `null` means "inherit the global
row's closeness, if any." A non-null value overrides it for that specific
recipe/component only — same override shape already proven necessary for
`note`.

RLS: no change. Both tables' write policies (`is_admin_or_moderator()` /
`recipe_is_editable(recipe_id)`) already cover any column on these tables.

### Resolving effective closeness (read-time, pure function)

```
effectiveCloseness(alternative, globalSubstitution):
  return alternative.closeness
      ?? globalSubstitution?.closeness
      ?? null   // "unclassified" - see ordering below
```

### Picker default ordering

Options sort: `close` → `noticeable` → `transformative` → unclassified
(`null`), with a stable secondary sort (alphabetical by name) within each
band so the order is fully deterministic regardless of DB/PostgREST return
order — closes the arbitrary-first-match bug directly.

### Multi-option data shape (replaces single-match `.find()`)

Today `computeAvail()`'s `substitutions[ingId]` and `computeMakeability()`'s
tier-4 resolution each keep exactly one matched candidate. Both need to
enumerate **every** owned valid candidate (tier 3 recipe-scoped alternatives
*and* tier 4 owned general substitutes, pooled into one list — the tier
distinction is an implementation detail, not something the user needs to
see) rather than stopping at the first:

```
substitutions[ingId] = {
  options: [{ id, name, note, closeness }, ...],  // deterministically ordered per above
  selectedId: <one option id>,                    // defaults to first in order
  // matchedId/matchedName/note kept as convenience aliases resolving to the
  // selected option's own fields, so every existing consumer (CocktailCard,
  // buildAdaptedCardActions, etc.) keeps working unchanged without opting in
}
```

`avail`/`strict`/`adapted`/`display` tier computation is **completely
unchanged** by this — this is purely an enumeration/ordering change on top of
an already-satisfied component, never new availability logic.

### Recipe Detail picker UI

- Canonical ingredient + amount stays the primary, unambiguous line —
  unchanged, first, full weight.
- Beneath it: `Using: <selected name>` + that option's own note.
- 2-3 options shown inline as tappable chips (closer-to-canonical first, per
  the ordering above), wrapped (no horizontal scroll, mobile-first). The
  selected chip is visually distinct (filled/checkmark) — **no chip is
  styled as "best."**
- 4th+ option collapses behind a `+N more` chip, expanding in place — reusing
  the app's existing collapsed-picker pattern (`TypeComboBox`) rather than a
  new interaction idiom.
- Tapping a different chip is instant, local, client-side only — no network
  round-trip, since this is choosing among already-loaded, already-valid
  data.
- A component with 0 or 1 owned valid candidate renders exactly as today —
  no chip row, no picker, zero change for the overwhelming majority of
  components.

### Cards / list views

Unchanged. Read `selectedId`'s resolved entry, same as today's single-match
behavior — no enumeration, no chips, anywhere outside recipe detail.

### Future-proofing for per-make preference tracking (not built now)

The picker's local state is already exactly `{ ingId → selectedAlternativeId
}` pairs — the same shape a future "record what I actually made, and rate
it" feature would need to persist. No v1 design choice here blocks that
later; it would only add an optional save step. **Not designed or
implemented in this plan.**

---

## Part B — Micro-quantity required components ("Good Enough" via forgiven accents)

### Problem

`required` must keep meaning "required to reproduce canonical" unambiguously
— `computeAvail()` is not changing. But practical makeability should
distinguish a genuinely-missing 2-dash bitters from a genuinely-missing
60ml base spirit, **without inventing a new user-facing tier** and without
any ingredient-category heuristic ("bitters are always minor" is explicitly
wrong — Trinidad Sour's 45ml Angostura proves it).

### The magnitude classifier (pure function, zero schema change)

Reads only `amount` + `unit_label`, already present on every
`recipe_components` row. Exhaustively tested against the full live
catalogue (every `ml <= 5` row, every `barspoon` row, every discrete-unit
row) — not a sample.

```
isAccentScale(component):  // component: { amount, unit_label }
  if unit_label matches /^(\d+([-–]\d+)?\s*)?dash$/i
     or unit_label matches /^(\d+\s*)?splash$/i
     or unit_label === "rinse":
    return true

  if unit_label === "ml":
    return amount <= 1   // NOT 5 - see rejected-threshold note below

  return false   // to taste, top-up, barspoon (any count), discrete units
                 // (piece/slice/wedge/cube/g), and anything unrecognized
                 // all default to false (non-forgivable)
```

**Why `ml <= 1`, not `<= 5`** (rejected after exhaustive testing, not by
assumption): every `required` component at `ml <= 5` in the live catalogue
was pulled and reviewed completely (5 rows total). Four of five are real,
small-but-structural doses of a defining modifier, not accents — Pineapple
Rum Old Fashioned's 5ml Simple Syrup (the drink's *only* sweetener), Zombie's
5ml Cinnamon Syrup (half of "Donn's Mix"), and Grenadine at 5ml in both
Zombie recipes (the drink's color/sweetness-balancing element). Only Zombie's
0.3ml Pernod ("6 drops") is a true trace accent. `<= 1ml` is grounded in a
real bartending fact (a dash is itself roughly 0.6-1ml) and, tested against
the complete current dataset, correctly isolates exactly the one genuine
case with zero ambiguity.

**Why `barspoon` is excluded at any count**: a barspoon (~5ml) sits in the
same danger zone as the rejected `<= 5ml` threshold — `Brandy Crusta`'s
Curaçao/Simple Syrup and `Vieux Carré`'s Bénédictine (all `1 barspoon`) are
real modifier doses, not accents; this pass's own earlier research
independently established that even a *modern* "1 barspoon" Bénédictine is a
meaningful, defining pour (the 1938 Vieux Carré original used half that).

**Why `to taste` is excluded**: checked exhaustively — every `to taste`
required component in the live catalogue is Ice, with zero exceptions. The
principled reason to exclude it generalizes beyond that fact, though: an
unquantified requirement has no magnitude to classify as "small" at all, so
it can never safely auto-qualify. This is a unit-shape rule, not an
ingredient exception.

**Why discrete units (`piece`/`slice`/`wedge`/`cube`/`g`) default to
non-forgivable**: reviewed all 20 live `required` discrete-unit rows
completely. A fractional-count signal (`0.5 slice` reading as garnish-scale)
looked promising but wasn't reliable across the catalogue — the Sherry
Cobbler "practical version" expresses the *identical* garnish-adjacent role
as whole counts (`1 wedge`, `2 wedge`). Checking the actual recipes' steps
text resolved it properly: **Sherry Cobbler's required citrus is genuinely
shaken into the drink** ("Add the Amontillado sherry, Palo Cortado sherry,
sugar, orange, and lemon to a cocktail shaker... Shake briskly"), structurally
real, correctly `required`, and correctly non-forgivable under the default —
not an exception case at all. Every other discrete-unit row (Basil, muddled
Cucumber, Egg White, muddled Fresh Mint, Lime in the Caipirinha family, Sugar
Cube, Ice) is unambiguously structural by the same check. **No override
mechanism is being built for this** — the plain default already gets every
current case right.

### Tier semantics — no new tier name

`computeAvail()` is **completely unchanged**. `strict.avail` still means
exactly what it means today.

`computeMakeability()` gains one new step, only reached when
`computeAdaptedResult()` (today's tier 4/5 substitute/preparation attempt)
returns `null` — i.e., only for components that are satisfied at *neither*
strict *nor* adapted level (this is what correctly separates "genuinely
absent" from "satisfied via a substitute/preparation," which must stay
distinguished per the approved design — a substituted dash of bitters is not
the same situation as an omitted one, and it never reaches this new code
path at all):

```
adapted = computeAdaptedResult(...)   // unchanged

if adapted resolved everything:
  display.tier = "adapted"            // unchanged

elif every still-unresolved required component isAccentScale(component):
  display.tier = "good"               // NEW path into the EXISTING "good" tier
  // no cumulative count/proportion check - see rationale below

else:
  display.tier = strict.avail         // unchanged fallback (almost/unavail)
```

**No cumulative-count or proportion rule.** Investigated explicitly against
every real multi-accent recipe in the catalogue (Suffering Bastard (Trader
Vic's): 3 simultaneous dash-scale components; Tuxedo (1900)/Tuxedo No.
2/Turf Club (1900): 3 each; Vieux Carré (1938): 2). In every case, the
recipe's structural base — once every accent is removed — is still a
complete, coherent, independently recognizable drink (a Gin/Dry-Vermouth
Martini underlies the Tuxedos; a rum-and-lime sour underlies Suffering
Bastard). No real counterexample exists in the current catalogue. Per the
explicit decision: **do not add speculative complexity for a case the
evidence doesn't demonstrate** — if a future recipe's structure genuinely
breaks this (e.g. a hypothetical drink built from several small components
with no dominant base spirit), solve that demonstrated case then. The rule
is simply: *every structural required component satisfied, regardless of how
many accent components are missing.*

`display` gains a small additive flag (parallel to the existing `isAdapted`)
so the UI/data layer can tell "good because of a missing garnish" (today's
existing path) apart from "good because of a forgiven accent" (the new
path) if it ever needs to word them differently — not required for the
approved message shape, but keeps provenance honest and costs nothing.

### Missing-component disclosure (must not imply the recipe is complete)

The domain layer surfaces a new explicit list — `missingMicroRequiredIds` (a
subset of `missingRequiredIds`, populated only on the new `good`-via-accent
path) — alongside the unchanged `missingRequiredIds`/`missingOptionalIds`.
Recipe Detail reuses its existing missing-ingredient-row rendering (already
used for missing optional/garnish under today's "Good Enough") to display
these honestly: *"Missing: 2 dashes Angostura Bitters"* — same muted
treatment already used for an unmet garnish, not new UI, and never implying
canonical completeness.

### Downstream effects, traced

- **Home / Library**: `DISPLAY_TIER_ORDER` (`availabilityGroups.js`) is
  unchanged — no new tier value. Recipes previously landing in `almost`
  purely from a missing dash now land in `good` — a real, intended, visible
  reshuffle.
- **"N cocktails possible"** (`makeabilityCounts.js`): `good` already counts
  as possible (`isPossibleTier`). The ready count genuinely increases for
  these recipes — this is the point of the change.
- **Sorting** (`almostThere.js`): Almost There becomes more accurate — these
  recipes stop appearing there.
- **Buy Next** (`recommendations.js`) — approved fix: candidate gathering
  still reads raw `strict.avail === "almost"` (unchanged), so a recipe
  already showing "Good Enough" via a forgiven accent could still surface a
  purchase suggestion for that same ingredient. Extend the **existing**
  `restoresOriginalRecipes` bucket's trigger condition (today used only for
  `display.tier === "adapted"`) to also include `display.tier === "good"`
  reached via the new accent-forgiveness path. This reuses a mechanism
  already built for exactly this shape of situation ("buying X restores the
  true canonical version of an already-possible recipe") rather than adding
  a new one — a small, precedented extension, not new machinery.
- **Build Your Bar counts**: shares `makeabilityCounts.js` per its own
  module header — same effect as "N cocktails possible" above.

---

## Part C — `recipe_component_alternatives` amount/unit override

### Schema

```sql
alter table public.recipe_component_alternatives
  add column amount numeric,
  add column unit_label text;
```

Both nullable, **no paired CHECK constraint** (a candidate "both null or both
set" constraint was proposed and explicitly rejected — real cases exist for
amount-only override, e.g. a more assertive alternative wanting "use a bit
less, same unit," and unit-only override isn't harmful to permit even though
no strong real case was found for it). No RLS change — the same
`recipe_is_editable(recipe_id)`/`recipe_is_visible(recipe_id)` policies
already governing this table cover any column on it, identical to how the
`note` column was added with zero policy changes.

### Resolution (independent per field)

```
effectiveAmount(alternative, parentComponent):
  return alternative.amount ?? parentComponent.amount

effectiveUnitLabel(alternative, parentComponent):
  return alternative.unit_label ?? parentComponent.unit_label
```

- Neither set → inherit both canonical values (today's actual behavior,
  now explicit rather than implicit).
- Amount only set → override amount, inherit canonical unit.
- Unit only set → inherit canonical amount, override unit.
- Both set → override both (solves Gin & Tonic's Lime `1 wedge` → Cucumber
  `3 slice`, matching Perfect Serve's own convention, without corrupting the
  canonical component or pretending Cucumber uses Lime's unit).

Availability (`computeAvail()`/`computeMakeability()`) is untouched by this
— it only ever cares whether the alternative ingredient type is owned, never
its displayed quantity. Purely a display/consumer-layer read.

### Consumer changes — must ship in Stage 1, not deferred to Stage 3

This is not a store-and-forget schema addition. Stage 1 must make the
**existing** single-alternative presentation ("Substituting: X") consume the
effective values immediately, so the override is visible and useful the
moment it's authored — the Part A multi-option picker (Stage 3) is a later
enhancement to *how many* options are shown, not a prerequisite for *any*
option's quantity to display correctly.

Concretely, in Stage 1:

- `RECIPE_SELECT`/`mapRecipe()` (`src/services/recipes.js`) select `amount,
  unit_label` alongside the existing `ingredient_type_id, note` on the
  embedded `recipe_component_alternatives(...)`. (`closeness`, from Part A,
  is added to this same select in Stage 3, when the column exists.)
- The existing single-match "Substituting: X" rendering (today reading the
  parent component's own `amount`/`unit_label` unconditionally) is changed
  to resolve via `effectiveAmount()`/`effectiveUnitLabel()` above instead.
  After Stage 1, if a component's canonical amount is Lime `1 wedge` and its
  (today's single, pre-picker) adopted alternative is authored as Cucumber
  `3 slice`, the existing recipe UI already shows the Cucumber alternative
  at its own effective `3 slice` quantity — with no picker, no multi-option
  enumeration, and no dependency on Part A.
- Recipe editor: an optional, collapsed amount+unit field on each
  alternative chip — same UX precedent as the existing optional flavor-note
  field (starts empty/inherited, expands only if the author sets it).

Stage 3 later replaces this single-match read with the multi-option
enumeration (`substitutions[ingId].options`), but every option in that list
still resolves its quantity through the exact same
`effectiveAmount()`/`effectiveUnitLabel()` functions built here — Stage 3
changes *how many* candidates are shown and in what order, not how any one
candidate's quantity is computed.

---

## Included catalogue cleanup (small, justified, not a product decision)

- **Ramos Fizz's Vanilla Extract row**: currently `amount=2, unit_label=
  "dash"` — the only row anywhere in the catalogue storing a dash count this
  way (every other dash-scale row, including this recipe's own adjacent
  Orange Flower Water row, stores `amount=0, unit_label="N dash"`). Correct
  to `amount=0, unit_label="2 dash"` to match convention. No product
  decision involved — a straightforward representation fix, included here so
  it doesn't get left behind as a known inconsistency.
- **Sherry Cobbler**: investigated, confirmed **no change needed** — its
  required citrus rows are correctly modeled (see Part B rationale above).

---

## Explicitly out of scope for this plan

- **Cross-session persistence of picker selections.** Local component state
  only, resets on revisit.
- **Per-make substitution tracking / ratings** ("Between the Sheets, White
  Rum→Spiced Rum, Cognac→Brandy, 5/5"). The Part A data shape is
  future-proofed for this (explicit per-component selections, not a
  flattened description) but nothing is built now.
- **Cumulative missing-accent rules of any kind** (count, proportion,
  weighting) — explicitly rejected by evidence, not deferred as "later work
  to design."
- **A discrete-component override/exception mechanism** — investigated and
  found unnecessary; the plain default is correct for every current case.
- **Any new user-facing tier** — deliberately not introduced; "Good Enough"
  is reused, not renamed or supplemented.
- **A fifth `closeness` value or numeric score** — deliberately rejected in
  favor of the coarse 3-band model.

---

## Staged implementation plan

Each stage: implement → `corepack pnpm@10.34.3 test` + `pnpm build` →
isolated-LF `oxfmt --check` on changed files → RLS suite re-run where a
table changed → `supabase db advisors --type security` after any migration →
manual dev-app verification of the affected flow (per `AGENTS.md`'s
pre-commit rule) → commit/push → stop for Max's own check. Stages are
independent enough to ship one at a time; suggested order below front-loads
the lowest-risk, highest-value piece.

**Stage 1 — Part C (amount/unit override), consumer-complete.** Smallest,
most isolated, zero ambiguity remaining. Migration, `mapRecipe()`/
`RECIPE_SELECT` changes, resolution functions + unit tests, recipe editor
field, **and** the existing single-match "Substituting: X" presentation
updated to read effective amount/unit instead of always the parent
component's own. This stage must be independently verifiable end-to-end: an
authored override (e.g. Gin & Tonic's Lime → Cucumber at `3 slice`) is
visibly correct in the running app before Stage 3 exists, not merely stored
and unread. Manual dev-app check for this stage: author one real override,
confirm the existing recipe detail UI displays the overridden quantity, not
the canonical component's own.

**Stage 2 — Part B (magnitude classifier + Good Enough extension).** Zero
schema change — pure `src/domain/` addition
(`isAccentScale()`/equivalent) with thorough unit tests against every case
tested in this document (Old Fashioned, Vieux Carré (1938), Trinidad Sour,
Vesper, Zombie, the barspoon/`to taste`/discrete cases), plus the
`computeMakeability()` extension, `missingMicroRequiredIds`, the Recipe
Detail disclosure reuse, and the Buy Next `restoresOriginalRecipes`
extension. Include the Ramos Fizz data cleanup as a small guarded SQL
statement in this stage (unrelated to the code change but convenient to land
alongside the classifier that would otherwise need it corrected first for a
clean test fixture).

**Stage 3 — Part A (closeness + picker), shipped with meaningful closeness
data, not an empty/unclassified graph.** Largest stage, with two halves that
both must land together: the code/schema half, and a full catalogue-authoring
pass over the existing substitution graph. Shipping the picker while leaving
most relationships unclassified would just move the arbitrary-ordering
problem from "array position" to "unclassified bucket, alphabetical" —
that does not actually solve the problem this stage exists for.

**3a — Code/schema.** Migration (`closeness` on both `ingredient_substitutions`
and `recipe_component_alternatives`) → domain enumeration change (multi-option
`substitutions[ingId].options`, replacing Stage 1's single-match read from
Part C, per the note above) → ordering function + unit tests → Recipe Detail
picker component (chips, `+N more`, `Using: X`, no "best"/"recommended"
styling anywhere) → card/list-view confirmation that they still read the
single selected value unchanged. Admin/editor support: closeness field added
to the ingredient type editor's existing "Can be replaced by" section
(global rows) and to the recipe editor's per-component alternative chip
(recipe-specific override), same UX precedent as the existing note field.

**3b — Catalogue closeness authoring**, done as its own live-data pass
following this project's established procedure (matching the Existing
Cocktail Adaptation Pass's own methodology) rather than a single blind bulk
write:

1. Read the complete live `ingredient_substitutions` graph (~95 rows at
   time of writing — re-query fresh, don't trust this count).
2. Classify each row `close` / `noticeable` / `transformative` against the
   tightened definitions in this document, using the same reasoning already
   demonstrated against real pairs during the model audit (`Cognac →
   Brandy` = close; `Peychaud's Bitters → Angostura Bitters` = noticeable;
   `White Rum → Vodka` = transformative; etc.) as the working precedent set.
3. Research genuinely ambiguous/borderline pairs rather than guessing —
   the audit already flagged real examples needing this (`White Rum → Dark
   Rum`; `Blue Curaçao ↔ Cointreau`, whose global value should reflect the
   *typical* recipe, with the color-critical exception handled by the
   recipe-specific override in step 4, not by forcing the global value to
   cover every case).
4. Review every existing `recipe_component_alternatives` row against its
   corresponding global relationship (if one exists):
   - global closeness is appropriate for that cocktail's context → leave
     the recipe-specific `closeness` `null` (inherits the global value);
   - cocktail context materially changes the practical consequence → author
     an explicit recipe-specific override (the Trinidad Sour Angostura-at-
     base-scale pattern, and the Blue Curaçao/Cointreau color case, are the
     two clearest existing precedents for when this is warranted);
   - the alternative has no corresponding global substitution at all → give
     it an explicit closeness value directly when defensible, rather than
     leaving it accidentally unclassified merely because there's no global
     row to inherit from.
5. Closeness stays strictly "distance from canonical" throughout — never
   quality, never a recommendation, never used to hide or downrank a
   transformative-but-valid option.
6. Do not force precision onto a genuinely ambiguous relationship. Where
   real judgment is required and the evidence doesn't clearly settle it,
   surface the specific row(s) to Max for a decision rather than picking a
   plausible-sounding value — same standard already used throughout the
   Existing Cocktail Adaptation Pass.
7. Apply as a guarded, transactional write (pre-write conflict/snapshot
   check → single transaction → full DB read-back verifying every row's
   closeness landed as classified, zero unintended rows touched) — the same
   procedure used for every catalogue-data change in this project, not a
   new one invented for this stage.

**Verification for Stage 3**: the catalogue-authoring half (3b) is ordinary
persisted metadata — a clean pre-write check + transactional apply + full DB
read-back is sufficient on its own, per this project's established standard;
it does not need a repetitive manual DEV pass to re-confirm values the
read-back already verified. Manual dev-app verification is still required
for the actual runtime behavior introduced in 3a: picker ordering (closer
options genuinely sort first once real data exists), selection/switching
between chips, notes updating on switch, amount/unit presentation for a
selected option, mobile interaction (`+N more` expansion, touch targets,
wrapping), and confirming card/list views are visually unchanged.

Testing note for all three stages: `pnpm test` coverage extends
`availability.test.js`/`makeability.test.js`/new files for the pure-function
additions; RLS suite gets new blocks only for Stage 1 and Stage 3a's schema
changes (Stage 2 has no schema surface). No new SECURITY DEFINER functions
are needed anywhere in this plan — every write goes through existing
RLS-gated tables via existing patterns.

---

## Not started

This document is a plan only. No migration, code, or catalogue change has
been made. Implementation begins only after Max reviews and approves this
document.
