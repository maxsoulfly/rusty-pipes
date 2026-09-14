// Pure, framework-free validation for recipe batch import (spec §12), same
// shape as src/schemas/ingredientImport.js: takes plain data in, returns
// plain data out, and the AI-prompt generator shares this module's rules so
// the prompt and validator can't silently drift apart.
//
// Ingredients are resolved through an EXISTING ingredient_type's exact name
// only (no fuzzy matching, per this project's standing rule) - an AI can
// never invent one. Substitution groups and recipe-to-recipe relationships
// are out of scope for this first pass: the manual recipe editor doesn't
// expose either yet (see current-context.md's long-carried items), so batch
// import doesn't get ahead of what a human can already do for the same
// recipe.

import { NON_VOLUME_UNITS } from "@/data/constants"
import { resolveGlass } from "@/domain/glassResolution"
import { resolveIngredientType } from "@/domain/ingredientResolution"

export const RECIPE_ROLES = ["required", "optional", "garnish"]
// Optional 8-digit #RRGGBBAA form too, not just 6 - the "Clear" liquid_colors
// swatch carries real alpha (20260826100000_liquid_colors_alpha.sql) so it
// can look genuinely transparent instead of flat pale-blue, and any picker
// built on this catalog needs to accept it, not just create it.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

/**
 * @param {unknown[]} rawItems - parsed JSON array, not yet validated
 * @param {{
 *   types: {id: string, name: string}[],
 *   glasses: {id: string, name: string}[],
 *   families: {id: string, name: string}[],
 *   tasteTags: {id: string, name: string}[],
 *   aliases?: {alias: string, ingredient_type_id: string}[],
 *   glassAliases?: {alias: string, glass_id: string}[],
 *   existingRecipeNames?: string[],
 * }} catalog
 */
export function validateRecipeImport(
  rawItems,
  {
    types,
    glasses,
    families,
    tasteTags,
    aliases = [],
    glassAliases = [],
    existingRecipeNames = [],
  },
) {
  const familyByName = new Map(families.map((f) => [f.name.toLowerCase(), f]))
  const tagByName = new Map(tasteTags.map((t) => [t.name.toLowerCase(), t]))
  const existingNames = new Set(existingRecipeNames.map((n) => n.toLowerCase()))
  const seenNames = new Set()

  const results = rawItems.map((item, index) => {
    const errors = []
    const raw = item && typeof item === "object" ? item : {}

    const name = typeof raw.name === "string" ? raw.name.trim() : ""
    if (!name) errors.push("Missing name")
    else if (existingNames.has(name.toLowerCase()))
      errors.push(`Possible duplicate of an existing recipe named "${name}"`)
    else if (seenNames.has(name.toLowerCase()))
      errors.push(`Duplicate "${name}" earlier in this import`)
    if (name) seenNames.add(name.toLowerCase())

    const glassName = typeof raw.glass === "string" ? raw.glass.trim() : ""
    const glass = resolveGlass(glassName, { glasses, aliases: glassAliases })
    if (!glassName) errors.push("Missing glass")
    else if (!glass) errors.push(`Unknown glass "${glassName}"`)

    let family = null
    if (raw.family) {
      const familyName = String(raw.family).trim()
      family = familyByName.get(familyName.toLowerCase())
      if (!family) errors.push(`Unknown family "${familyName}"`)
    }

    let liquidColor = null
    if (
      raw.liquidColor !== undefined &&
      raw.liquidColor !== null &&
      raw.liquidColor !== ""
    ) {
      if (!HEX_COLOR_RE.test(raw.liquidColor))
        errors.push(
          `Invalid liquidColor "${raw.liquidColor}" (expected hex like #a1b2c3)`,
        )
      else liquidColor = raw.liquidColor
    }

    // Optional second color, for a layered/gradient drink a single flat
    // fill can't represent - see GlassSvg's own comment for how it renders.
    let liquidColor2 = null
    if (
      raw.liquidColor2 !== undefined &&
      raw.liquidColor2 !== null &&
      raw.liquidColor2 !== ""
    ) {
      if (!HEX_COLOR_RE.test(raw.liquidColor2))
        errors.push(
          `Invalid liquidColor2 "${raw.liquidColor2}" (expected hex like #a1b2c3)`,
        )
      else liquidColor2 = raw.liquidColor2
    }

    const tasteTagIds = []
    if (raw.tasteTags !== undefined) {
      if (!Array.isArray(raw.tasteTags)) {
        errors.push("tasteTags must be an array")
      } else {
        for (const t of raw.tasteTags) {
          const tagName = String(t).trim()
          const tag = tagByName.get(tagName.toLowerCase())
          if (!tag) errors.push(`Unknown taste tag "${tagName}"`)
          else tasteTagIds.push(tag.id)
        }
      }
    }

    const steps = Array.isArray(raw.steps)
      ? raw.steps
          .filter((s) => typeof s === "string" && s.trim())
          .map((s) => s.trim())
      : []
    if (steps.length === 0) errors.push("Missing steps")

    // Names a fix could plausibly resolve, collected from both the AI's own
    // unresolvedIngredients review list and any component that didn't match
    // - surfaced separately from `errors` (which stays human-readable text)
    // so the UI can offer an inline "add this ingredient" action per name
    // instead of parsing it back out of an error string.
    const missingIngredientNames = []
    const addMissing = (rawName) => {
      const trimmed = String(rawName).trim()
      if (
        trimmed &&
        !missingIngredientNames.some(
          (n) => n.toLowerCase() === trimmed.toLowerCase(),
        )
      )
        missingIngredientNames.push(trimmed)
    }

    if (
      Array.isArray(raw.unresolvedIngredients) &&
      raw.unresolvedIngredients.length > 0
    ) {
      // The AI flagged these as unresolvable *at generation time* - the
      // catalog may have changed since (the ingredient added later, or
      // this JSON is reused/stale). Re-checking against the live catalog
      // here avoids offering a "+Add" button that's guaranteed to fail
      // with "already exists" for a name that's already real - a real,
      // confusing case this validator hit with a stale "Salt" entry.
      // There's still no amount/unit captured for these bare names either
      // way, so even an already-resolvable one can't just be silently
      // promoted into a real component - the recipe still needs a fresh
      // paste to actually capture its measurement.
      const stillUnresolved = raw.unresolvedIngredients.filter(
        (n) => !resolveIngredientType(n, { types, aliases }),
      )
      const nowResolvable = raw.unresolvedIngredients.filter((n) =>
        resolveIngredientType(n, { types, aliases }),
      )
      if (stillUnresolved.length > 0) {
        errors.push(
          `Unresolved ingredient(s) flagged for review: ${stillUnresolved.join(", ")}`,
        )
        stillUnresolved.forEach(addMissing)
      }
      if (nowResolvable.length > 0) {
        errors.push(
          `${nowResolvable.join(", ")} ${
            nowResolvable.length === 1 ? "is" : "are"
          } now in the catalog, but this JSON never captured ${
            nowResolvable.length === 1 ? "its" : "their"
          } amount/unit - re-paste with a fresh AI round-trip so it's included as a real component, or add it to this recipe manually after import.`,
        )
      }
    }

    const rawComponents = Array.isArray(raw.components) ? raw.components : []
    if (rawComponents.length === 0) errors.push("Missing components")

    const components = []
    rawComponents.forEach((c, ci) => {
      const rawComp = c && typeof c === "object" ? c : {}
      const label = `Component ${ci + 1}`

      const ingredientName =
        typeof rawComp.ingredient === "string" ? rawComp.ingredient.trim() : ""
      const matchedType = resolveIngredientType(ingredientName, {
        types,
        aliases,
      })
      if (!ingredientName) {
        errors.push(`${label}: missing ingredient name`)
        return
      }
      if (!matchedType) {
        errors.push(`${label}: unresolved ingredient "${ingredientName}"`)
        addMissing(ingredientName)
        return
      }

      const role = rawComp.role ?? "required"
      if (!RECIPE_ROLES.includes(role)) {
        errors.push(`${label} ("${ingredientName}"): invalid role "${role}"`)
        return
      }

      const unit = typeof rawComp.unit === "string" ? rawComp.unit.trim() : ""
      if (unit === "ml") {
        const amount = Number(rawComp.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
          errors.push(
            `${label} ("${ingredientName}"): invalid ml amount "${rawComp.amount}"`,
          )
          return
        }
        components.push({
          ingredientTypeId: matchedType.id,
          amount,
          unitLabel: "ml",
          role,
        })
        return
      }
      if (NON_VOLUME_UNITS.includes(unit)) {
        const amount =
          rawComp.amount !== undefined && rawComp.amount !== null
            ? String(rawComp.amount).trim()
            : ""
        components.push({
          ingredientTypeId: matchedType.id,
          amount: 0,
          unitLabel: amount ? `${amount} ${unit}` : unit,
          role,
        })
        return
      }
      errors.push(
        `${label} ("${ingredientName}"): invalid unit "${unit}" (expected "ml" or one of ${NON_VOLUME_UNITS.join(", ")})`,
      )
    })

    const valid = errors.length === 0
    return {
      index,
      name: name || undefined,
      errors,
      valid,
      missingIngredientNames,
      resolved: valid
        ? {
            name,
            description:
              typeof raw.description === "string" ? raw.description.trim() : "",
            glassId: glass.id,
            familyId: family?.id ?? null,
            liquidColor,
            liquidColor2,
            steps,
            tasteTagIds,
            components,
          }
        : null,
    }
  })

  return {
    results,
    validCount: results.filter((r) => r.valid).length,
    errorCount: results.filter((r) => !r.valid).length,
  }
}

/**
 * Builds a copy-paste prompt for formatting new recipes with an AI
 * assistant, generated from the live catalog so it can never drift from
 * what validateRecipeImport() actually accepts.
 */
export function buildRecipeImportPrompt({
  types,
  glasses,
  families,
  tasteTags,
  aliases = [],
}) {
  const aliasesByTypeId = new Map()
  aliases.forEach((a) => {
    if (!aliasesByTypeId.has(a.ingredient_type_id))
      aliasesByTypeId.set(a.ingredient_type_id, [])
    aliasesByTypeId.get(a.ingredient_type_id).push(a.alias)
  })
  const typeNames = types
    .map((t) => {
      const known = aliasesByTypeId.get(t.id) ?? []
      return known.length > 0
        ? `${t.name} (also known as: ${known.join(", ")})`
        : t.name
    })
    .sort()
  const glassNames = glasses.map((g) => g.name).sort()
  const familyNames = families.map((f) => f.name).sort()
  const tagNames = tasteTags.map((t) => t.name).sort()

  return `Format a JSON array of cocktail recipes for import into Rusty Pipes.

Return ONLY a JSON array (no markdown fences, no commentary) where each item has:
- "name": string, required.
- "description": string, optional short description.
- "glass": string, required. Must be exactly one of: ${glassNames.join(", ")}.
- "family": string, optional. Must be exactly one of: ${familyNames.join(", ") || "(none defined yet - omit this field)"}.
- "liquidColor": optional hex color like "#f97316" for the drink's visual fill. Always the color at the BOTTOM of the glass in the finished drink - for a single-color drink this is simply its one color; for a two-color drink (see liquidColor2) it is specifically whichever layer sits at the bottom. Determine this purely from the drink's actual visual layering in the finished glass - never from ingredient order, recipe/step order, which color is more prominent, or which ingredient is the dominant flavor.
- "liquidColor2": optional second hex color, only for a drink that visibly separates into two distinct color bands in the finished glass. Always the color layered ABOVE liquidColor, at the TOP - same rule as liquidColor: base this purely on visual position in the glass, never on pour order, ingredient order, or dominance. Example: in a Tequila Sunrise, the grenadine sinks and colors the BOTTOM of the glass red, while the orange juice stays as its own distinct layer above it - so liquidColor is the red (grenadine, bottom) and liquidColor2 is the orange (orange juice, top), regardless of which ingredient went into the glass first. Set liquidColor2 whenever YOUR OWN steps for this recipe describe the drink ending up two distinct colors rather than one uniform color - not just for famous examples, reason about the actual technique in the steps you just wrote: a layered shot built in bands ("pour over the back of a spoon", "float", "layer"); a liqueur poured/floated on top of a shaken-and-strained drink so it sits as a separate top layer or visibly bleeds down through crushed ice (e.g. a Bramble's Crème de Mûre poured over crushed ice at the end); a drink built in the glass without stirring so two colors stay distinct. Omit liquidColor2 entirely (use only liquidColor) if your steps say to shake, stir, or strain everything together into one uniform mix, or if the drink is simply one color - the two-color fields only apply when the recipe's own instructions keep the layers visually separate.
- "tasteTags": optional array of strings, each exactly one of: ${tagNames.join(", ") || "(none defined yet - omit this field)"}.
- "steps": array of strings, required, one instruction per step, in order.
- "components": array of objects, required - list EVERY ingredient the recipe uses here, including ones not in the existing list below, each with:
  - "ingredient": string, required. If it matches one of the existing ingredient types below (or one of its known aliases, shown in parentheses), spell it EXACTLY as ONE of those names - either the main name or a single alias by itself, never the whole "Name (also known as: ...)" line - never guess a close match. If it does NOT exist yet, still put it here: use only the plain, common name a shopper would recognize (e.g. "Pineapple", "Salt") - never append quantity, unit, preparation, or notes to this name (NOT "Fresh pineapple - 50 g", NOT "Salt - optional tiny pinch"). Never invent a new ingredient type name that's a variant of an existing one - use the plain generic name instead.
  - "amount": number. Use canonical ml values for volume; for weight, use grams; for other non-volume units, use a plain count (e.g. 2 for "2 dashes"); omit for a unit like "top-up" or "to taste" that has no count.
  - "unit": either "ml" (canonical volume unit - always convert to ml, never oz or cl), "g" (grams, for weight-based solids), or one of: ${NON_VOLUME_UNITS.filter((u) => u !== "g").join(", ")}.
  - "role": one of "required", "optional", "garnish". Defaults to "required" if omitted. An ingredient the recipe calls optional (e.g. "optional: a pinch of salt") is still a real component - set "role" to "optional", don't move it out of components or bury that detail in the ingredient name.
- "unresolvedIngredients": optional array of strings, rarely needed - only for something that genuinely cannot be expressed as a components entry at all (not a normal missing ingredient - see above, those belong in components). If used, each entry must be a bare ingredient name only, with no quantity, unit, or notes appended.

Never invent a new ingredient type, glass, family, or taste tag name - only use the exact names listed below.

Existing ingredient types (use EXACTLY one of these names or aliases - names in parentheses are known aliases, already covered, not gaps to fill):
${typeNames.join(", ") || "(none yet)"}

Existing glasses: ${glassNames.join(", ") || "(none yet)"}
Existing cocktail families: ${familyNames.join(", ") || "(none yet)"}
Existing taste tags: ${tagNames.join(", ") || "(none yet)"}

Here is what I want to add:
`
}
