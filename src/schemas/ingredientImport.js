// Pure, framework-free validation for ingredient-type batch import (spec
// §12). No Supabase/React here - takes plain data in, returns plain data
// out, so it's independently testable and so the AI-prompt generator below
// can share its rules instead of restating them by hand (the two drifting
// apart is exactly what the spec's "reject unknown units/values" and this
// project's no-fuzzy-matching rule are meant to prevent).
//
// Rich ingredient import (2026-09-14): the Ingredient Type editor
// (src/components/IngredientTypeEditor.jsx) and its atomic
// save_ingredient_type() RPC support far more than name/category/parentType/
// barPriority/color/description - aliases, "Can provide" ingredient-form
// conversions, "Can be replaced by" suggested substitutes, and a homemade
// preparation (inputs + steps) are all real, saved fields the batch importer
// never exposed. This file now validates/resolves all of them too, so a
// single AI-formatted import can produce a genuinely complete ingredient
// type instead of requiring manual enrichment afterward.
//
// Every relationship field below (parentType, canProvide, canBeReplacedBy,
// a homemade preparation's inputs) resolves ONLY against the live catalog
// passed in (`types`/`aliases`) - never against another item in this same
// import batch. This matches parentType's existing, established behavior
// (unchanged by this work) and is the deliberately simpler, safer choice:
// a name that doesn't resolve is a validation error, never a dangling
// reference and never a same-batch id it has to invent before the row
// exists. Importing two new ingredients that should reference each other
// still works - just as two imports (or one import + a follow-up edit in
// the Ingredient Type editor) instead of one.
//
// Persistence for the rich fields is necessarily two-phase, because
// save_ingredient_type() only ever UPDATEs an existing row (it raises if
// p_type_id doesn't already exist) - it cannot create one. The batch-import
// commit flow (AdminLayout.jsx's handleCommitImport) inserts every item's
// plain ingredient_types columns first (toIngredientTypeRow() below strips
// the relationship fields out of `resolved` for that insert), then calls
// the SAME atomic save_ingredient_type() the editor uses, once per newly
// inserted row that actually asked for aliases/conversions/substitutes/a
// preparation. A failure in that second call leaves the row exactly as
// phase one created it (no partial relationships - save_ingredient_type()
// is one transaction) - never dangling, never half-attached - and is
// reported per-item so it can be finished later in the ordinary editor.

import { INGREDIENT_SHAPES, PREPARATION_UNITS } from "@/data/constants"
import { resolveIngredientType } from "@/domain/ingredientResolution"

export const BAR_PRIORITIES = ["essential", "common", "specialized", "niche"]
// Optional 8-digit #RRGGBBAA form too, not just 6 - see recipeImport.js's
// matching HEX_COLOR_RE comment for why (the "Clear" liquid_colors swatch
// now carries real alpha) - this is exactly the regex that rejected picking
// "Clear" for a new ingredient type before this fix.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/

// Shared shape for canProvide/canBeReplacedBy - both are "an array of
// { <targetKey>: an existing type's name or alias, <noteKey>: required
// 1-200 character text }" (matching ingredient_form_conversions.guidance /
// ingredient_substitutions.flavor_note's own NOT NULL CHECK constraints).
// Resolved against the live catalog only (see the module comment above).
// Appends any problems straight onto the shared `errors` list, prefixed
// with `label` and the entry's index, so a bad relationship reads as
// clearly as every other per-field error here.
function resolveRelationshipNoteList(
  rawList,
  { label, targetKey, noteKey, types, aliases, errors },
) {
  if (rawList === undefined || rawList === null) return []
  if (!Array.isArray(rawList)) {
    errors.push(`${label} must be an array`)
    return []
  }
  const resolved = []
  const seenTargetIds = new Set()
  rawList.forEach((entry, i) => {
    const raw = entry && typeof entry === "object" ? entry : {}
    const targetName =
      typeof raw[targetKey] === "string" ? raw[targetKey].trim() : ""
    if (!targetName) {
      errors.push(`${label}[${i}]: missing ${targetKey}`)
      return
    }
    const target = resolveIngredientType(targetName, { types, aliases })
    if (!target) {
      errors.push(`${label}[${i}]: unknown ${targetKey} "${targetName}"`)
      return
    }
    if (seenTargetIds.has(target.id)) {
      errors.push(
        `${label}[${i}]: duplicate ${targetKey} "${targetName}" in this item`,
      )
      return
    }
    const note = typeof raw[noteKey] === "string" ? raw[noteKey].trim() : ""
    if (!note || note.length > 200) {
      errors.push(
        `${label}[${i}] ("${targetName}"): ${noteKey} is required (1-200 characters)`,
      )
      return
    }
    seenTargetIds.add(target.id)
    resolved.push({ targetId: target.id, note })
  })
  return resolved
}

// Blank entries are silently dropped (matching save_ingredient_type()'s own
// `where btrim(a) <> ''` filter) rather than erroring - not worth failing an
// otherwise-good item over a stray empty string. A real problem (collides
// with this item's own name, an existing type/alias, or a duplicate within
// this same list) still errors, same as the Ingredient Type editor's own
// addAliasToDraft().
function resolveAliasList(rawAliases, { name, types, aliases, errors }) {
  if (rawAliases === undefined || rawAliases === null) return []
  if (!Array.isArray(rawAliases)) {
    errors.push("aliases must be an array of strings")
    return []
  }
  const resolved = []
  const seenLower = new Set()
  const ownNameLower = name.toLowerCase()
  rawAliases.forEach((a, i) => {
    const text = typeof a === "string" ? a.trim() : ""
    if (!text) return
    const lower = text.toLowerCase()
    if (lower === ownNameLower) {
      errors.push(`aliases[${i}]: "${text}" duplicates this item's own name`)
      return
    }
    if (seenLower.has(lower)) {
      errors.push(`aliases[${i}]: duplicate alias "${text}" within this item`)
      return
    }
    const existing = resolveIngredientType(text, { types, aliases })
    if (existing) {
      errors.push(
        `aliases[${i}]: "${text}" already refers to an existing ingredient type "${existing.name}"`,
      )
      return
    }
    seenLower.add(lower)
    resolved.push(text)
  })
  return resolved
}

// A homemade preparation - the PRODUCED side (this item), never the raw/
// from side conversions/substitutes above are. `ingredientPreparations` is
// the live catalog's existing preparations, needed for the depth-1 guard
// (an input can never itself be some OTHER preparation's produced type -
// mirrors enforce_preparation_input_depth(), 20260911120000) - checkable
// up front since it only concerns EXISTING preparations, never this same
// batch's own new items (which, per the module comment, can't be
// referenced as relationship targets anyway).
function resolvePreparation(
  raw,
  { types, aliases, ingredientPreparations, errors },
) {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push("homemadePreparation must be an object")
    return null
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!name || name.length > 100)
    errors.push("homemadePreparation: name is required (1-100 characters)")

  const rawInputs = raw.inputs
  if (!Array.isArray(rawInputs) || rawInputs.length === 0) {
    errors.push("homemadePreparation: at least one input is required")
    return null
  }

  const producedTypeIds = new Set(
    (ingredientPreparations ?? []).map((p) => p.produces_type_id),
  )
  const inputs = []
  const seenInputIds = new Set()
  rawInputs.forEach((entry, i) => {
    const item = entry && typeof entry === "object" ? entry : {}
    const typeName = typeof item.type === "string" ? item.type.trim() : ""
    if (!typeName) {
      errors.push(`homemadePreparation.inputs[${i}]: missing type`)
      return
    }
    const resolvedType = resolveIngredientType(typeName, { types, aliases })
    if (!resolvedType) {
      errors.push(
        `homemadePreparation.inputs[${i}]: unknown type "${typeName}"`,
      )
      return
    }
    if (producedTypeIds.has(resolvedType.id)) {
      errors.push(
        `homemadePreparation.inputs[${i}]: "${typeName}" is itself made by another preparation and can't be used as an input`,
      )
      return
    }
    if (seenInputIds.has(resolvedType.id)) {
      errors.push(
        `homemadePreparation.inputs[${i}]: duplicate input type "${typeName}" in this preparation`,
      )
      return
    }
    const amount = Number(item.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(
        `homemadePreparation.inputs[${i}] ("${typeName}"): amount must be a positive number`,
      )
      return
    }
    const unit = typeof item.unit === "string" ? item.unit.trim() : ""
    if (!PREPARATION_UNITS.includes(unit)) {
      errors.push(
        `homemadePreparation.inputs[${i}] ("${typeName}"): invalid unit "${unit}" (must be one of ${PREPARATION_UNITS.join(", ")})`,
      )
      return
    }
    seenInputIds.add(resolvedType.id)
    inputs.push({ ingredientTypeId: resolvedType.id, amount, unitLabel: unit })
  })

  const instructions = Array.isArray(raw.steps)
    ? raw.steps.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean)
    : []

  return { name, instructions, inputs }
}

/**
 * @param {unknown[]} rawItems - parsed JSON array, not yet validated
 * @param {{
 *   categories: {id: string, name: string}[],
 *   types: {id: string, name: string, category_id: string}[],
 *   aliases?: {alias: string, ingredient_type_id: string}[],
 *   ingredientPreparations?: {produces_type_id: string}[],
 * }} catalog
 */
export function validateIngredientImport(
  rawItems,
  { categories, types, aliases = [], ingredientPreparations = [] },
) {
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c]),
  )
  const seenNames = new Set()

  const results = rawItems.map((item, index) => {
    const errors = []
    const raw = item && typeof item === "object" ? item : {}

    const name = typeof raw.name === "string" ? raw.name.trim() : ""
    const existingViaName = name
      ? resolveIngredientType(name, { types, aliases })
      : null
    if (!name) errors.push("Missing name")
    else if (existingViaName)
      errors.push(
        existingViaName.name.toLowerCase() === name.toLowerCase()
          ? `"${name}" already exists in the catalog`
          : `"${name}" already resolves to "${existingViaName.name}" via an existing alias`,
      )
    else if (seenNames.has(name.toLowerCase()))
      errors.push(`Duplicate "${name}" earlier in this import`)
    if (name) seenNames.add(name.toLowerCase())

    const categoryName =
      typeof raw.category === "string" ? raw.category.trim() : ""
    const category = categoryByName.get(categoryName.toLowerCase())
    if (!categoryName) errors.push("Missing category")
    else if (!category) errors.push(`Unknown category "${categoryName}"`)

    let parent = null
    if (raw.parentType) {
      const parentName = String(raw.parentType).trim()
      parent = resolveIngredientType(parentName, { types, aliases })
      if (!parent) errors.push(`Unknown parentType "${parentName}"`)
      else if (category && parent.category_id !== category.id)
        errors.push(
          `parentType "${parentName}" is not in category "${categoryName}"`,
        )
    }

    const barPriority = raw.barPriority ?? "common"
    if (!BAR_PRIORITIES.includes(barPriority))
      errors.push(
        `Invalid barPriority "${barPriority}" (must be one of ${BAR_PRIORITIES.join(", ")})`,
      )

    if (
      raw.color !== undefined &&
      raw.color !== null &&
      !HEX_COLOR_RE.test(raw.color)
    )
      errors.push(`Invalid color "${raw.color}" (expected hex like #a1b2c3)`)

    let shape = null
    if (raw.icon !== undefined && raw.icon !== null && raw.icon !== "") {
      const iconTrimmed = String(raw.icon).trim()
      if (!INGREDIENT_SHAPES.includes(iconTrimmed))
        errors.push(
          `Invalid icon "${iconTrimmed}" (must be one of ${INGREDIENT_SHAPES.join(", ")})`,
        )
      else shape = iconTrimmed
    }

    let assumedAvailable = false
    if (raw.householdBasic !== undefined && raw.householdBasic !== null) {
      if (typeof raw.householdBasic !== "boolean")
        errors.push(
          `Invalid householdBasic "${raw.householdBasic}" (must be true or false)`,
        )
      else assumedAvailable = raw.householdBasic
    }

    const resolvedAliases = resolveAliasList(raw.aliases, {
      name,
      types,
      aliases,
      errors,
    })
    const conversions = resolveRelationshipNoteList(raw.canProvide, {
      label: "canProvide",
      targetKey: "preparedType",
      noteKey: "guidance",
      types,
      aliases,
      errors,
    }).map(({ targetId, note }) => ({ preparedTypeId: targetId, guidance: note }))
    const substitutes = resolveRelationshipNoteList(raw.canBeReplacedBy, {
      label: "canBeReplacedBy",
      targetKey: "type",
      noteKey: "note",
      types,
      aliases,
      errors,
    }).map(({ targetId, note }) => ({ toTypeId: targetId, flavorNote: note }))
    const preparation = resolvePreparation(raw.homemadePreparation, {
      types,
      aliases,
      ingredientPreparations,
      errors,
    })

    const valid = errors.length === 0
    return {
      index,
      name: name || undefined,
      errors,
      valid,
      resolved: valid
        ? {
            name,
            category_id: category.id,
            parent_type_id: parent?.id ?? null,
            color: raw.color ?? null,
            bar_priority: barPriority,
            description:
              typeof raw.description === "string" ? raw.description : null,
            shape,
            assumed_available: assumedAvailable,
            aliases: resolvedAliases,
            conversions,
            substitutes,
            preparation,
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
 * Maps a validated/resolved item to exactly the columns
 * public.ingredient_types has, for a plain `.insert()` - stripping the
 * relationship fields (aliases/conversions/substitutes/preparation) that
 * validateIngredientImport() also resolves onto the same object but that
 * are NOT columns on this table (they're attached afterward through
 * save_ingredient_type() instead - see this file's module comment).
 * `shape`'s column is `not null default 'spirit_bottle'` - sending an
 * explicit `null` would violate that constraint, so the key is omitted
 * entirely when no icon was requested, letting the column default apply
 * exactly as it always did before this field existed in the importer.
 *
 * @param {object} resolved - one result's `.resolved` from validateIngredientImport()
 */
export function toIngredientTypeRow(resolved) {
  const {
    aliases: _aliases,
    conversions: _conversions,
    substitutes: _substitutes,
    preparation: _preparation,
    shape,
    ...row
  } = resolved
  return shape ? { ...row, shape } : row
}

/**
 * Builds a copy-paste prompt for formatting new ingredient types with an AI
 * assistant, generated from the live catalog so it can never drift from
 * what validateIngredientImport() actually accepts.
 */
export function buildIngredientImportPrompt({
  categories,
  types,
  aliases = [],
  liquidColors = [],
}) {
  const categoryNames = categories.map((c) => c.name).sort()
  const typesByCategory = new Map(categoryNames.map((name) => [name, []]))
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const aliasesByTypeId = new Map()
  aliases.forEach((a) => {
    if (!aliasesByTypeId.has(a.ingredient_type_id))
      aliasesByTypeId.set(a.ingredient_type_id, [])
    aliasesByTypeId.get(a.ingredient_type_id).push(a.alias)
  })
  types.forEach((t) => {
    const categoryName = categoryNameById.get(t.category_id)
    if (!categoryName) return
    const knownAliases = aliasesByTypeId.get(t.id) ?? []
    const label =
      knownAliases.length > 0
        ? `${t.name} (also known as: ${knownAliases.join(", ")})`
        : t.name
    typesByCategory.get(categoryName)?.push(label)
  })

  const existingLines = categoryNames
    .map(
      (name) =>
        `- ${name}: ${(typesByCategory.get(name) ?? []).sort().join(", ") || "(none yet)"}`,
    )
    .join("\n")

  const colorLines =
    liquidColors.length > 0
      ? liquidColors.map((c) => `${c.name}: ${c.hex}`).join(", ")
      : "(none defined yet - any valid hex color works)"

  return `Format a JSON array of new cocktail ingredient types for import into Rusty Pipes.

## Research first - accuracy over completeness

Before producing each ingredient's data, research it using reliable culinary/product knowledge. If your environment has live web/research capability, use it to verify uncertain facts (spelling, common names, whether a homemade version is actually realistic, typical substitutes).

NEVER invent metadata just to fill in a field. If something can't be established with confidence:
- omit the optional field or relationship entirely (do not include the key at all);
- use an empty array where the import contract expects a collection;
- do NOT invent aliases nobody actually uses;
- do NOT invent a "Can be replaced by" substitute just because two ingredients seem similar;
- do NOT invent a parent-type relationship;
- do NOT invent a homemade preparation recipe, or guess at its quantities/steps;
- do NOT claim two ingredients are interchangeable merely because they're both, say, "a citrus juice" - only include a substitute when it's genuinely, broadly defensible for that ingredient type as a whole.

A sparse but correct ingredient record is always better than a richly populated speculative one. Every field below except "name" and "category" is optional - leave it out rather than guess.

## Return format

Return ONLY a JSON array (no markdown fences, no commentary) where each item has:

- "name": string, required. Must not duplicate an existing ingredient type or any of its known aliases below.
- "category": string, required. Must be exactly one of: ${categoryNames.join(", ")}.
- "parentType": string, optional. Must be an EXISTING type's exact name (or one of its known aliases) within the SAME category, used to group related styles (e.g. "Rum" as the parentType for a new "Spiced Rum"). Never invent one, and never point this at another new item in this same array - it must already exist in the catalog listed below.
- "barPriority": one of ${BAR_PRIORITIES.join(", ")}. Optional, defaults to "common". essential/common are promoted in purchase recommendations; specialized/niche are suppressed.
- "householdBasic": boolean, optional, defaults to false. true means "assume every bar has this" (e.g. water, ice) - it never shows as missing or gets recommended to buy. Use this rarely and only for genuinely universal basics.
- "color": optional hex color like "#fb923c" (6 or 8 digits, the last 2 being alpha). Known palette (a suggestion for visual consistency, not a requirement - any valid hex works): ${colorLines}.
- "icon": string, optional. Must be exactly one of: ${INGREDIENT_SHAPES.join(", ")}. Pick whichever pictogram best matches the ingredient's real-world container/form (e.g. "wine_bottle" for a vermouth, "jar" for a preserved good, "fruit" for a whole citrus). Defaults to a generic bottle icon if omitted.
- "description": optional short string.
- "aliases": optional array of strings - genuine, commonly-used alternate names that would help match this ingredient while searching or importing a recipe (e.g. "Sec" for "Triple Sec"). Do NOT include misspellings, made-up abbreviations nobody uses, translations (unless that translation is itself a name English-speaking bartenders commonly use), or a brand name standing in for a generic ingredient type. Never propose an alias that's already someone else's name in the catalog below - check first.
- "canProvide": optional array of { "preparedType": string, "guidance": string }. Directional: owning THIS new ingredient can satisfy a recipe that asks for "preparedType" instead (e.g. whole "Lemon" can provide "Lemon Juice", never the reverse). "preparedType" MUST be an existing type's exact name or alias from the catalog below - never another new item in this array, and never invented. "guidance" is required, 1-200 characters, a short instruction like "Squeeze fresh juice from Lemon". Do not add the reverse relationship yourself - if it's genuinely also true, it belongs on the OTHER ingredient's own "canProvide" list in a separate/later import, not inferred here.
- "canBeReplacedBy": optional array of { "type": string, "note": string }. Directional, suggestion-only, and NOT automatically reversible - "A can be replaced by B" never implies "B can be replaced by A" (they can say different things, e.g. one is sweeter, the other drier), and there is no chaining. "type" MUST be an existing type's exact name or alias from the catalog below. "note" is required, 1-200 characters, a short flavor/usage note like "sweeter, warmer spice". Only include this when the substitution is broadly true for the ingredient TYPE in general, not just plausible for one specific cocktail - a recipe-specific swap belongs on that recipe, never here.
- "homemadePreparation": optional object, ONLY when there is a realistic, established way for a home bartender to actually make this ingredient - syrups, infusions, cordials, and fresh juices are common legitimate cases, but judge each ingredient on its own merits; do NOT invent an implausible "homemade" version of a commercial spirit or manufactured product just to fill this field. Shape: { "name": string (required, 1-100 characters), "inputs": [{ "type": string, "amount": number, "unit": string }] (required, at least one), "steps": [string] (optional, ordered instructions) }. Each input's "type" MUST be an existing type's exact name or alias from the catalog below (never another new item in this array, never invented) and must not itself be something already made by another preparation. "amount" must be a positive number and "unit" must be exactly one of: ${PREPARATION_UNITS.join(", ")}.

## Existing catalog

Every relationship field above (parentType, canProvide's preparedType, canBeReplacedBy's type, a homemade preparation's input types) can ONLY reference a name or alias from this list - do not invent a new category, and reuse an existing type name or alias wherever a relationship should point at something that already exists (names in parentheses are known aliases, already covered, not gaps to fill):
${existingLines}

Here is what I want to add:
`
}
