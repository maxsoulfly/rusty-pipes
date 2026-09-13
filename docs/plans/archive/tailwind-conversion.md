# Convert inline styling to Tailwind utility classes

> Status: **done and browser-verified, 2026-08-25.** User chose to skip the component-size-refactor browser-verification gate and start immediately (inline CSS was itself making the post-refactor files hard to read). All files in scope converted across 17 commits, plus `App.jsx` as a user-approved bonus beyond the original file list. A full manual click-through covering both this conversion and the component-size refactor together found one pre-existing bug (`BottomNav` never hiding at desktop width, unrelated to either refactor) - fixed. See `current-context.md` for the verified result.

## Context

The user flagged that `src/index.css` is nearly empty (146 lines, mostly design tokens) while the app relies almost entirely on inline `style={{...}}` objects — 651 occurrences across 52 files. Investigation found the project already has **Tailwind v4 fully imported and themed** (`@import 'tailwindcss'` plus a `@theme inline` block in `src/index.css` mapping every design token — colors, radii, fonts — into Tailwind's utility namespace) but it's essentially unused: only 17 total `className` usages app-wide, almost all just the existing `.fade-in`/`.glow-*` animation classes. The Figma Make scaffold set up the Tailwind theme but the components never adopted it.

User confirmed (via question): convert to **Tailwind utility classes**, not hand-written CSS classes/modules — this uses the theme setup that already exists instead of building a second, parallel styling system. User also confirmed: **verify the component-size refactor via a browser click-through first**, before any of this starts.

## Setting realistic expectations up front

"No inline styling" cannot mean literally zero `style` props left — Tailwind's own guidance is that genuinely dynamic, runtime/data-derived values belong in `style`, scoped to just that one property, with everything else on the element as `className`. Found real cases that must stay inline:

- `TypeCard.jsx`, `HexColorField.jsx`, `ShapePicker.jsx`: computed hex+alpha colors from DB data (e.g. `` `${type.color}25` ``) — not expressible as a Tailwind utility since Tailwind's JIT can't see a runtime template string at build time.
- `WelcomeScreen.jsx`: dual `radial-gradient` background — not a simple utility.
- ~10 files: `paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))"` — could become an arbitrary-value class (`pb-[calc(96px+env(safe-area-inset-bottom,0px))]`) but is arguably clearer left as one shared inline value or promoted to a real CSS class.

Goal: eliminate the *static, token-derivable* styling currently duplicated as inline objects (the ~85-90% majority) — not chase the last few genuinely dynamic properties into contorted arbitrary-value syntax.

## Theme token mapping already in place (`src/index.css`, `@theme inline`, lines 65-95)

Colors (`--color-X: var(--X)` → `bg-X`/`text-X`/`border-X`/etc.): `bg`, `bg2`, `surface`, `surface2`, `surface3`, `bdr` (maps to `--border-s`, note the name mismatch), `tx`/`tx2`/`tx3` (maps to `--text`/`--text2`/`--text3`), `cyan`, `blue`, `violet`, `magenta`, `coral`, `amber`, `green`, `perfect`, `good`, `almost`, `unavail`. Fonts → `font-display`, `font-body`, `font-mono`. Radii (`--radius-X: var(--r-X)`) → `rounded-sm` (8px), `rounded` (12px), `rounded-lg` (16px), `rounded-xl` (24px).

Notably absent: `--border` (the subtle rgba outline color, used constantly for card/input borders) has no Tailwind-facing name yet, and there's no spacing scale — but Tailwind's *default* scale already covers most one-off pixel values found in the audit (e.g. `rounded-full` for `999px` needs no new token).

## What needs to happen before mechanical conversion starts

1. **Add a classname-joining helper.** No `clsx`/`classnames`/`cva`/`cn()` exists anywhere in the codebase today — conditional styling is done entirely via ternaries inside style objects. ~25-30% of the 651 blocks are conditional (active/small/owned/disabled flags choosing between 2-3 values), and those need a real conditional-classes utility, not string concatenation sprinkled everywhere. Add `clsx` (a few hundred bytes, the de facto standard for exactly this) as a new dependency — flagging this explicitly since it's a new package, not because it's a risky choice.

2. **Extend `@theme inline`** for tokens that exist as CSS variables but have no Tailwind-facing name yet: add something like `--color-hairline: var(--border)` so call sites can write `border-hairline` instead of an arbitrary-value class. Only add what's genuinely missing — don't pre-build a token for every literal found in the audit.

## Conversion pattern (per file)

Mechanical, one file at a time:

- Static token-only styles (`color: "var(--cyan)"`, `borderRadius: "var(--r-lg)"`, fixed `padding`/`fontSize`) → Tailwind utility classes on `className`.
- Conditional styles (ternaries on props/state) → `clsx(...)` building the className string; the previous ternary's two branches become the two classes clsx picks between.
- Layout (`display: flex`, `gap`, `alignItems`, etc.) → Tailwind's flex/grid utilities.
- Genuinely dynamic per-instance values (computed hex colors, gradients) → stay as a minimal `style={{ ... }}` for *only* that property, everything else on the element moves to `className`.
- Remove the `style` prop entirely once nothing dynamic remains on that element.

## Rough taxonomy of the 651 blocks (sampled ~150 across 8 files)

- **~55-60% pure token substitution** — trivial mechanical conversion, e.g. `primitives.jsx:264-272`, `WelcomeScreen.jsx:127-135`.
- **~25-30% conditional/ternary** on props/state — needs the `clsx` helper first, then straightforward; e.g. `primitives.jsx:115-123` (`FilterChip`), `LibraryScreen.jsx:102-108`.
- **~10-15% genuinely dynamic/non-trivial** — computed hex+alpha strings, radial gradients, `calc()+env()` safe-area padding, literal one-off pixel dimensions with no scale match — needs arbitrary-value Tailwind syntax or must remain scoped inline.

## Order of operations

Foundation first, since every screen depends on it:

1. **`src/components/primitives.jsx`** — `Btn`, `Card`, `Input`, `Select`, `ConfirmPanel`, `FilterChip`, `OwnedToggle`, `AvailBadge`, etc. Converting this first means every consumer benefits immediately and the conditional-class patterns get established once, not reinvented per screen.
2. **`src/components/icons.jsx`, `GlassSvg.jsx`, `FamilyIcon.jsx`, `Nav.jsx`** — small, low-risk, mostly SVG props not `style` objects per the audit.
3. **The `src/components/{admin,editor,myBar,detail}/` directories** from the component-size refactor — freshly written, patterns still fresh and consistent.
4. **Remaining `src/screens/*.jsx`**, smallest to largest, same reasoning as the component-size refactor's ordering.

**Commits**: one per logical unit (primitives.jsx, then icons/shared, then each directory, then screens individually or in small related batches) — same granularity as the component-size refactor.

## Scope honesty

651 style blocks across 52 files is substantially larger than the component-size refactor (which touched ~4 files' worth of new code). This will likely span multiple sessions. Recommend treating primitives.jsx + the shared components as the first deliverable, confirming the pattern reads well and holds up, before committing to converting all 52 files in one continuous push.

## Verification

Per file/batch: `pnpm build`, `pnpm test` (106/106 should stay unaffected — no domain logic touched), `pnpm format`, then `npx --yes oxlint -D no-undef <changed files>` to catch any dropped import (the exact bug class found in the component-size refactor). Final step before calling the whole conversion done: a full manual browser click-through, now covering both changes together since Tailwind classes are a real visual/rendering change in a way the component split wasn't.
