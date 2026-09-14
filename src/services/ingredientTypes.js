import { supabase } from "@/lib/supabaseClient"

export async function fetchIngredientTypes() {
  const { data, error } = await supabase
    .from("ingredient_types")
    .select(
      "id, category_id, parent_type_id, name, color, bar_priority, recommend_by_default, description, shape, assumed_available",
    )
    .order("name")
  if (error) throw error
  return data
}

// Admin-only via ingredient_types' existing "admin insert" RLS policy - no
// new grant needed. `rows` must already be exactly this table's own columns
// (src/schemas/ingredientImport.js's toIngredientTypeRow() strips its
// richer resolved shape down to this before calling here) - never the
// relationship fields (aliases/conversions/substitutes/preparation), which
// aren't columns on this table at all and would make the insert fail.
// Returns the inserted rows' id+name (rich ingredient import, 2026-09-14) so
// a caller can attach a newly-created row's aliases/"Can provide"/"Can be
// replaced by"/homemade preparation afterward via saveIngredientType() -
// this plain insert can't create those itself, save_ingredient_type() only
// ever updates an existing row.
export async function createIngredientTypes(rows) {
  const { data, error } = await supabase
    .from("ingredient_types")
    .insert(rows)
    .select("id, name")
  if (error) throw error
  return data
}

// Admin/moderator-only via the pre-existing "ingredient_types: admin update"
// RLS policy. Plain single-table update - kept for callers that only touch
// the type row itself. The Ingredient Type editor uses saveIngredientType()
// below instead (type + aliases + "Can provide" in one transaction).
export async function updateIngredientType(
  id,
  {
    name,
    categoryId,
    parentTypeId,
    barPriority,
    color,
    description,
    shape,
    assumedAvailable,
  },
) {
  const { data, error } = await supabase
    .from("ingredient_types")
    .update({
      name,
      category_id: categoryId,
      parent_type_id: parentTypeId || null,
      bar_priority: barPriority,
      color: color || null,
      description: description || null,
      shape,
      assumed_available: assumedAvailable,
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Atomic save for the Ingredient Type editor: the type's own fields, its
// full alias set, and its full "Can provide" conversion set, applied in one
// transaction by save_ingredient_type() (20260910170000, SECURITY INVOKER).
// If any part fails - a name clash, an alias colliding with another type, a
// conversion tripping the inverse-pair trigger - nothing is written and the
// error propagates for the editor to show inline while keeping the draft.
// RLS still gates every statement, so admin/moderator only; a member's call
// raises before touching anything.
//
// `aliases` is the full desired list of alias strings. `conversions` is the
// full desired list of { preparedTypeId, guidance } whose raw side is this
// type. `substitutes` is the full desired list of { toTypeId, flavorNote }
// whose from side is this type (Stage B - catalogue "Suggested substitutes",
// suggestion-only, never touches availability). `preparation` (Stage D.3) is
// either `null`/`undefined` (no homemade preparation for this type) or
// `{ name, instructions: string[], inputs: [{ ingredientTypeId, amount, unitLabel }] }`
// - the PRODUCED side (unlike conversions/substitutes above, which key off
// this type as the raw/from side). All four replace the type's current set
// entirely, in the one transaction.
export async function saveIngredientType({
  typeId,
  name,
  categoryId,
  parentTypeId,
  barPriority,
  assumedAvailable,
  color,
  description,
  shape,
  aliases,
  conversions,
  substitutes,
  preparation,
}) {
  const { error } = await supabase.rpc("save_ingredient_type", {
    p_type_id: typeId,
    p_fields: {
      name,
      category_id: categoryId,
      parent_type_id: parentTypeId || null,
      bar_priority: barPriority,
      assumed_available: Boolean(assumedAvailable),
      color: color || null,
      description: description || null,
      shape,
    },
    p_aliases: aliases ?? [],
    p_conversions: (conversions ?? []).map((c) => ({
      prepared_type_id: c.preparedTypeId,
      guidance: c.guidance,
    })),
    p_substitutions: (substitutes ?? []).map((s) => ({
      to_type_id: s.toTypeId,
      flavor_note: s.flavorNote,
    })),
    p_preparation: preparation
      ? {
          name: preparation.name,
          instructions: preparation.instructions ?? [],
          inputs: (preparation.inputs ?? []).map((i) => ({
            ingredient_type_id: i.ingredientTypeId,
            amount: i.amount,
            unit_label: i.unitLabel,
          })),
        }
      : null,
  })
  if (error) throw error
}

// Admin-only via the pre-existing "ingredient_types: admin delete" RLS
// policy - existed since the RLS-hardening pass with no caller until now.
// No pre-check for in-use: a child type, product, recipe component, or
// substitution alternative referencing this type all have their own
// restricting FK, so the DB rejects the delete with a real error naming the
// referencing table (same precedent as glasses/taste tags/families).
// ingredient_aliases and user_inventory rows pointing at this type cascade
// away, since a dangling alias or ownership record for a deleted type is
// meaningless, not something worth blocking on.
export async function deleteIngredientType(id) {
  const { error } = await supabase
    .from("ingredient_types")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// Admin-only via admin_merge_ingredient_type()'s own is_admin() check (not
// an RLS policy - this is a SECURITY DEFINER function call). Reassigns every
// recipe/product/inventory/alias row referencing loserId onto survivorId,
// then deletes the loser type outright - see the migration's own header
// comment for why each of the 6 referencing tables needs its own handling.
export async function mergeIngredientType({ loserId, survivorId, addAlias }) {
  const { error } = await supabase.rpc("admin_merge_ingredient_type", {
    p_loser_id: loserId,
    p_survivor_id: survivorId,
    p_add_alias: addAlias,
  })
  if (error) throw error
}

export async function fetchIngredientAliases() {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .select("id, ingredient_type_id, alias")
    .order("alias")
  if (error) throw error
  return data
}

// Admin-only via the pre-existing "ingredient_aliases: admin insert/update/
// delete" RLS policies - real spec scope (Phase 2, §12.3's "resolve through
// IDs, canonical names, or controlled aliases") that had zero application
// code until now. Uniqueness (one alias string can only ever mean one
// ingredient type) is enforced by a case-insensitive unique index
// (20260822150000_ingredient_alias_global_uniqueness.sql), not just app-side
// checking - the DB is the actual source of truth for that guarantee.
//
// No current caller (2026-09-14 audit) - the Ingredient Type editor manages
// aliases entirely through saveIngredientType()'s atomic RPC above instead.
// Left in place rather than removed (dead-code removal wasn't in scope for
// that pass) - see docs/plans/archive/catalog-service-split.md.
export async function createIngredientAlias({ alias, ingredientTypeId }) {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .insert({ alias, ingredient_type_id: ingredientTypeId })
    .select()
    .single()
  if (error) throw error
  return data
}
export async function updateIngredientAlias(id, { alias, ingredientTypeId }) {
  const { data, error } = await supabase
    .from("ingredient_aliases")
    .update({ alias, ingredient_type_id: ingredientTypeId })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}
export async function deleteIngredientAlias(id) {
  const { error } = await supabase
    .from("ingredient_aliases")
    .delete()
    .eq("id", id)
  if (error) throw error
}
