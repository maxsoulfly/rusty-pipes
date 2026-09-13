import clsx from "clsx"
import { Link } from "react-router-dom"

// Shared "an ingredient name is also a navigation link" treatment,
// extracted (Ingredient Detail Stage I.1 follow-up) once a second surface
// needed the exact same look - HeroCard.jsx's "Missing: X" callout, next
// to IngredientsSection.jsx's per-row name. Centralizes only the
// interactive/navigation concerns (route, ≥44px vertical tap target, the
// subtle neutral hover/active/focus-ring treatment) - NOT typography or
// any host-specific horizontal bleed (e.g. IngredientsSection's dot-
// covering left padding), since those differ per caller and forcing them
// through one shared className would fight the "preserve existing
// badge/panel styling" requirement each caller has. Callers pass their own
// text color/weight/size and any extra padding via `className`.
//
// Deliberately no underline and no link-colored text - a plain hyperlink
// look read as noisy in a dense ingredient list (see the I.1 polish
// chunk in current-context.md). Interactivity is instead: a subtle
// brightness shift on hover/press (`brightness-*`, color-agnostic - works
// the same regardless of whatever text color a caller applies), and a
// visible keyboard focus ring reusing Card's own focus-visible:ring
// convention (primitives.jsx).
//
// UI polish (manual-testing finding) - the original hover/active state
// used a filled background tint (`hover:bg-tx3/10 active:bg-tx3/15`).
// Because this component only wraps the ingredient NAME (an inline-block
// with its own vertical tap-target padding), that background rendered as
// a small filled "pill" around just the name - fine for a bare name, but
// when a caller renders a secondary line directly below it (e.g.
// IngredientsSection's "Substituting: X"/"Adapted: X" captions, or
// IngredientDetailScreen's row guidance/flavor notes), the pill visually
// separated the name from its own secondary text, reading as two
// unrelated pieces instead of one ingredient row. Replaced with a
// background-free brightness shift so the row reads as one coherent
// block at rest, on hover, and on press - the tap target/hit-area
// technique (`py-3 -my-3` etc., extended per-caller via bleed padding)
// and the focus-visible ring are both unchanged, so keyboard
// accessibility and the existing ≥44px practical tap target are
// unaffected. HeroCard.jsx's "Missing: X" callout is a SEPARATE panel
// (its own `bg-almost/10 border ...` div wrapping the whole line) that
// this component has never controlled - removing this hover/active
// background changes nothing about that intentional callout box.
//
// `ingId` is always an ingredient TYPE id (a recipe component's `ingId`,
// or a `missingRequiredIds` entry - both come from the same
// domain/availability.js source), so this is always the `/bar/type/:id`
// route, never `/bar/product/:id` - no branching needed here.
export function IngredientLink({ ingId, className, children }) {
  return (
    <Link
      to={`/bar/type/${ingId}`}
      className={clsx(
        "inline-block rounded-sm py-3 -my-3 transition duration-150 hover:brightness-125 active:brightness-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan",
        className,
      )}
    >
      {children}
    </Link>
  )
}
