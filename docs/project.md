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
Existing Cocktail Adaptation Pass - going through every shared cocktail (~7 at a time) to fix up the canonical recipe (ingredients, amounts, glass, family, etc.) and research realistic home-bar adaptations for it. Started after the ingredient catalogue enrichment pass finished. See `current-context.md` for methodology and progress.

# Next
- Improve mood/taste discovery (still the long-standing open item from earlier - not started).
- Ingredient Detail screen visual/design polish pass - a deliberate follow-up to the shipped v1 (see `current-context.md`), not started.
- A few small manual-verification checks are still owed on recently shipped work (Ingredient Detail I.4's admin shortcut; Linked Variations' real Bloody Mary/Zombie relationships end-to-end; the adapted-card compact-action wording on a real phone) - see `current-context.md` for the exact checklists.

# Backlog
- Duplicate-ingredient-type merge tool (Admin → Ingredient Types → "Merge") is built and RLS-covered but never browser-verified - do that click-through before relying on it for a real live duplicate.
- Ingredient Type descriptions have no UI surface yet - the field exists and is being filled in by the catalog enrichment pass, but the admin editor doesn't show/edit it and it's not displayed anywhere member-facing either. Evaluate later: expose it in the editor, and/or show it on Ingredient Detail.
- Personal Substitutions / My Preferences - let me define my own private "I'm happy using X instead of Y" rules that make a recipe Adapted for me specifically, without changing the shared catalogue's real substitutions. Not designed/implemented yet.
- Clone/Adapt Recipe - let me fork a canonical recipe into my own customized version (different spirit, different ratio) as its own saved recipe. Separate from Personal Substitutions - one's a reusable preference, the other's a specific recipe. Not designed/implemented yet.
- Classic/Flexible makeability mode - a setting where "Classic" only counts canonical/close-traditional substitutions and "Flexible" allows broader home-bar adaptations with an honest "here's how it'll change" note. Names not final. Not designed/implemented yet - part of the post-enrichment adaptation audit (see `current-context.md`).
- Living catalogue / let me add my own missing ingredients - I shouldn't be stuck with only what's in the shared catalogue. Let me add a bottle I own that isn't there yet, map it to an existing generic type where possible so makeability still works, and maybe propose it for the real shared catalogue later. Not designed/implemented yet.
- Bartender Course / Learn DLC (idea only, unscheduled) - a possible future expansion with researched educational content per cocktail: history, origins, creators/bartenders, bars/locations, approximate dates, notable historical variants, technique/ingredient context, relationships between traditions/styles. Not part of the Existing Cocktail Pass, not scheduled next, no schema/fields for this yet - just don't want to lose the idea.

# Done
- Serving-size selector + parts ratio view — 2026-09-05.
- Homepage "Build your bar" for an empty My Bar — 2026-09-06.
- Cocktail Library + My Bar UX (grouped Library, Sort control, ingredient/bottle recipe pages) — 2026-09-06.
- My Bar redesign (owned-first "My ingredients", "Add ingredients" split, shelf visuals, Speed Rack) — 2026-09-07.
- Household basics (Ice, Salt, Water, White Sugar, Black Pepper) + admin-managed "Build your bar" onboarding list — 2026-09-10.
- Ingredient forms ("Can provide" — owning Lemon satisfies a Lemon Juice recipe) + Suggested Substitutes (catalogue-wide, suggestion-only) — 2026-09-10/11.
- Adapted availability & makeability ("Make With Adaptations": a recipe missing an ingredient you can substitute or prepare at home is discoverably makeable, not just "unavailable") + homemade preparations — 2026-09-11/12.
- Ingredient Detail page v1 (tap any ingredient name → its own detail page: My Bar action, Can provide/Can be replaced by, homemade preparation, cocktails using it, admin edit shortcut) — 2026-09-12/13.
- Linked Variations (a recipe can declare "this is a variation of that," e.g. Bloody Mary / Bloody Mary (Practical Version) — pure metadata + navigation, never affects either recipe's own availability) — 2026-09-13.
- Adapted-card UI polish (cocktail cards show a compact concrete action — "⇄ Spiced Rum", "Prep Simple Syrup" — instead of a verbose repeated status sentence) — 2026-09-13.

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
2026-09-10 — General catalogue substitutes are suggestion-only by default; a recipe's own adopted alternative is what actually affects that recipe's availability.
2026-09-11 — A recipe resolvable via an owned general substitute or a satisfiable homemade preparation is "Make With Adaptations" — discoverably makeable, never lumped in with "Unavailable," and never silently merged into "Perfect"/"Good Enough" either.
2026-09-13 — A linked variation is pure metadata + navigation between two otherwise-independent recipes — never ingredient/instruction inheritance, and never affects either recipe's own availability. One base, many variations; a relationship cycle is invalid data and rejected at write time.
