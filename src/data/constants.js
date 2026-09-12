// Pure UI vocabulary (not admin-managed catalog data, unlike taste tags and
// glasses - those are real Supabase tables now, fetched via useCatalog()).

// The one shared name for the "adapted" discovery category - the tier's
// own internal identifier (`display.tier === "adapted"`) is unrelated and
// deliberately NOT renamed alongside this (see the finalization note in
// docs/plans/substitutes-and-variations.md, 2026-09-12). Named
// "...Adaptations", not "...Substitutions" - the category also holds
// cocktails resolvable through a homemade PREPARATION alone (no
// substitute involved at all, e.g. a cocktail only missing Simple Syrup),
// so "Substitutions" alone under-described it once preparations shipped
// (Stage D.3). A cocktail's own composed status text
// ("Make with substitutions" / "Prepare X first" / both joined) is a
// separate, more specific mechanism (computeAdaptedResult() /
// composeAdaptedLabel() in src/domain/makeability.js) and is NOT this
// constant - that text describes what ONE cocktail actually needs; this
// one names the CATEGORY that groups every such cocktail together, on
// Library's grouped view, Home's section, and the shared availability
// filter (Library/Lists).
export const ADAPTED_CATEGORY_LABEL = "Make With Adaptations"

// Shared "grouped by makeability" section headings - matches
// HomeScreen.jsx's own section names exactly, for the same tiers.
// AVAIL_CFG's own `label` (primitives.jsx - "Perfect", not "Ready to Pour")
// is a different, shorter string used on the per-card badge, kept as-is;
// this is the group HEADING text specifically. Extracted from
// LibraryScreen.jsx (Ingredient Detail Stage I.1, `docs/plans/
// ingredient-detail-page.md`) so IngredientDetailScreen can share the exact
// same wording instead of keeping a second, drifting copy.
export const AVAIL_GROUP_LABEL = {
  perfect: "Ready to Pour",
  good: "Good Enough",
  adapted: ADAPTED_CATEGORY_LABEL,
  almost: "Almost There",
  unavail: "Unavailable",
}

// Keys match computeMakeability()'s `display.tier` (Stage D.1/D.2,
// src/domain/makeability.js) - "adapted" was added 2026-09-11 for a recipe
// resolvable via a configured, owned general substitute or a satisfiable
// homemade preparation. Every consumer of this list (LibraryScreen,
// ListsScreen) must compare against a recipe's `display.tier`, not its raw
// `avail`, or a filter like "Almost" would wrongly surface an adapted
// recipe that no longer belongs there.
export const AVAIL_FILTERS = [
  { key: "all", label: "All" },
  { key: "perfect", label: "Perfect" },
  { key: "good", label: "Good Enough" },
  { key: "adapted", label: ADAPTED_CATEGORY_LABEL },
  { key: "almost", label: "Almost" },
  { key: "unavail", label: "Unavailable" },
]

export const SOURCE_FILTERS = [
  { key: "classic", label: "Classic" },
  { key: "community", label: "Community" },
  { key: "private", label: "Private" },
]

// Library's Sort control. "availability" is the default (plain /library, or
// any ?sort value other than "name" - keeps the original ?sort=availability
// deep link working unchanged); "name" is the flat alphabetical view.
export const SORT_FILTERS = [
  { key: "availability", label: "Availability" },
  { key: "name", label: "Name A-Z" },
]

// "part" isn't in the spec's explicit semantic-unit list (§9: dash,
// barspoon, piece, slice, wedge, top-up) but is a very common real cocktail
// unit for ratio-based recipes ("1 part gin, 1 part vermouth") - added per
// user request. "g" (grams) was added the same way - muddled/solid
// ingredients (fresh fruit, sugar) are genuinely measured by weight, not a
// count or a volume, and there was no way to represent that at all. Shared
// between the manual recipe editor and the recipe batch-import
// validator/prompt so both accept exactly the same unit vocabulary - if they
// drifted, an AI-imported recipe could use a unit the manual editor doesn't
// support, or vice versa.
// "splash" and "to taste" added for the serving-size-scaling feature
// (docs/plans - see current-context.md): "splash" is a countable measure
// like "dash" (scales with servings), "to taste" is a bare descriptive
// label like "top-up" (never has a leading number, so src/domain/servings.js
// leaves it untouched automatically - no special-casing needed).
// Position 0 is load-bearing, not just display order - src/schemas/
// recipePaste.js falls back to NON_VOLUME_UNITS[0] ("part") for an
// unrecognized pasted unit, and its own test asserts exactly that. Don't
// reorder this array for a display-only preference (a preparation input's
// unit picker reorders its own `options` locally instead - see
// IngredientTypeEditor.jsx, Stage D.4 - rather than risk changing that
// fallback default).
export const NON_VOLUME_UNITS = [
  "part",
  "dash",
  "barspoon",
  "piece",
  "slice",
  "wedge",
  "top-up",
  "to taste",
  "splash",
  "g",
]

// The fixed set of pictograms GlassSvg.jsx actually knows how to draw - a
// glass row's `shape` column must be one of these (DB check constraint
// mirrors it). Admin picks a shape when creating/renaming a glass instead of
// the icon being tied 1:1 to the glass's name, so a new glass can still
// render a sensible pictogram without a code change - only a genuinely
// novel silhouette none of these resemble still needs one.
export const GLASS_SHAPES = [
  "rocks",
  "highball",
  "collins",
  "coupe",
  "nick_and_nora",
  "martini",
  "copper_mug",
  "hurricane",
  "tiki_mug",
  "margarita",
  "red_wine",
  "white_wine",
  "champagne_flute",
  "champagne_tulip",
  "pint",
  "pilsner",
  "beer_stein",
  "glencairn",
  "shot",
]

// See FamilyIcon.jsx - same decoupled-icon pattern as GLASS_SHAPES above.
export const FAMILY_SHAPES = [
  "beer",
  "highball",
  "shot",
  "sours",
  "spritz",
  "stirred",
  "fizz",
  "flip",
  "julep",
  "martini",
  "old_fashioned",
  "punch",
  "smash",
  "tiki",
  "toddy",
  "frozen",
]

// See IngredientIcon.jsx - same decoupled-icon pattern as GLASS_SHAPES/
// FAMILY_SHAPES above, but keyed per ingredient_type row rather than per
// category: a handful of items (Salt, sugars, seasonings) don't share their
// category's obvious pictogram, so the shape lives on the type itself and
// gets a sensible default per category at creation time, overridable per
// row exactly like a glass or family already is.
export const INGREDIENT_SHAPES = [
  "spirit_bottle",
  "wine_bottle",
  "beer",
  "soda_can",
  "fruit",
  "herb",
  "dropper",
  "jar",
  "sauce_bottle",
  "dairy",
  "ice",
]
