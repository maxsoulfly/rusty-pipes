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
// neutral hover/press tint, and a visible keyboard focus ring reusing
// Card's own focus-visible:ring convention (primitives.jsx).
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
        "inline-block rounded-sm py-3 -my-3 transition-colors duration-150 hover:bg-tx3/10 active:bg-tx3/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan",
        className,
      )}
    >
      {children}
    </Link>
  )
}
