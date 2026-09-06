PROJECT.md

# Vision
Rusty Pipes

Purpose:
Personal cocktail notebook that helps me decide what to drink and easily prepare it.

Success looks like:

I can quickly find something I want.
I can find cocktails matching a request/mood.
Recipes are easy to follow while mixing.
The app remains useful even when My Bar is empty.

Not currently trying to be:
Social network, cocktail school, public community.

You might revisit this every few months, not every day.

# Current Focus
Fixing the recurring "JWT issued at future" startup error on the first app open of the day.

# Next
- My Bar redesign (`docs/my-bar-ux-plan.md`): all three stages built (owned-first "My ingredients", "Add ingredients" split, shelf visuals, Speed Rack). Speed Rack awaiting phone verification.

# Backlog
- Improve mood/taste discovery.

# Done
- Serving-size selector + parts ratio view — 2026-09-05.
- Homepage "Build your bar" for an empty My Bar — 2026-09-06.
- Cocktail Library + My Bar UX (grouped Library, Sort control, ingredient/bottle recipe pages) — 2026-09-06.

# Scenarios
S01 — Choose a drink
Yana suggests cocktails → I open Rusty Pipes → quickly find something I want.

S02 — Prepare two drinks
Choose cocktail → select 2 servings → quantities update → instructions are clear.

S03 — Sweet tropical request
Yana asks for something sweet and tropical → I can quickly get a few appropriate options.

# Decisions
Brief product decisions worth keeping for planning. Implementation detail and rationale live in `current-context.md`.

2026-09-05 — Parts ratio uses exact GCD reduction of stored ml, not rounded "nice" numbers — honest about awkward recipes.
2026-09-05 — Parts mode is a per-recipe view toggle, not a saved preference like ml/oz.
2026-09-05 — The public share page has no servings control; it stays member-facing only.
2026-09-06 — Build Your Bar's essentials list is its own client-side list, kept away from `bar_priority` (which only drives Buy Next).
2026-09-06 — "Show my cocktails" sorts Library by availability rather than filtering — nothing is ever hidden, almost-matches stay visible.
2026-09-06 — Library defaults to grouped Availability, with a visible Sort control (Availability / Name A–Z).
2026-09-06 — Tapping an ingredient/bottle opens its matching cocktails; owning it is a separate action. Generic ownership and specific-product ownership stay distinct — never silently remove products or add generic ownership.
2026-09-06 — Substitution matches are phrased as a possibility ("Can replace Bourbon"), never as an active substitution.
2026-09-06 — Admin ingredient-type editing moves off the My Bar browsing grid to a detail overflow action; full editing stays in Admin → Ingredient Types.
