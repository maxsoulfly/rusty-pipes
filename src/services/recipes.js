import { supabase } from "@/lib/supabaseClient"

// "Community" vs "private" is derived, not stored - see recipes table comment
// in the migration. Matches the source values SourceBadge already expects.
function deriveSource(recipe) {
  if (recipe.source_type === "classic") return "classic"
  if (recipe.visibility === "shared" && recipe.moderation_status === "active")
    return "community"
  return "private"
}

// Shapes a Supabase row into exactly what src/domain/availability.js and the
// screens already expect from the old mock COCKTAILS array (ings[].ingId/
// amount/unitLabel/role, taste[], etc.) so screen components don't need to
// change just because the data source did.
function mapRecipe(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    source: deriveSource(row),
    ownerId: row.owner_id,
    // A promoted classic has owner_id null (see 20260823130000 - admin
    // manages it exactly like any other classic) but keeps its original
    // community author attached via original_owner_id for credit - falling
    // back to it here means the existing "by {author}" line on
    // DetailScreen/CocktailCard just works for a promoted classic with no
    // extra UI needed, same as it already does for an ordinary community
    // recipe.
    author:
      row.owner?.display_name ?? row.original_owner?.display_name ?? undefined,
    originalOwnerId: row.original_owner_id,
    // `glass` is the glass's real name - EditorScreen matches it back
    // against the live glasses list by name to prefill/save the picker, so
    // this has to stay a name, not the shape key. `glassShape` is the
    // separate field GlassSvg actually wants for its pictogram. Conflating
    // the two (this used to just be `row.glass?.shape`) broke editing any
    // recipe whose glass's shape key didn't match its current display name
    // (true for every renamed glass since the 19-glass catalog migration) -
    // Save crashed with "Cannot read properties of undefined (reading
    // 'id')" because the picker's by-name lookup silently found nothing.
    glass: row.glass?.name ?? "Rocks Glass",
    glassShape: row.glass?.shape ?? "rocks",
    family: row.family?.name,
    liquidColor: row.liquid_color ?? "#22d3ee",
    liquidColor2: row.liquid_color_2 ?? null,
    // Cross-user popularity - a denormalized counter (20260826110000), kept
    // in sync by a trigger whenever anyone favorites/adds to Want to Make -
    // never a live per-request aggregate, and never exposes which users
    // contributed to it (user_favorites/user_want_to_make stay strictly
    // private).
    favoriteCount: row.favorite_count ?? 0,
    wantToMakeCount: row.want_to_make_count ?? 0,
    steps: row.steps ?? [],
    taste: (row.recipe_taste_tags ?? [])
      .map((t) => t.taste_tags?.name)
      .filter(Boolean),
    ings: (row.recipe_components ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => {
        const alts = c.recipe_component_alternatives ?? []
        return {
          ingId: c.ingredient_type_id,
          alternativeIds: alts.map((a) => a.ingredient_type_id),
          // Recipe-scoped flavor-change notes (Stage B), keyed by the
          // alternative's type id. Only alternatives that carry a note
          // appear here; computeAvail() reads it purely for display.
          alternativeNotes: Object.fromEntries(
            alts
              .filter((a) => a.note)
              .map((a) => [a.ingredient_type_id, a.note]),
          ),
          // Stage D.4: this component's own excluded general-substitute
          // target ids (recipe_components.excluded_substitute_type_ids) -
          // read by computeMakeability()'s tier 4 and by the detail page's
          // "Try:" suggestions. Never affects tier 3 (alternativeIds above)
          // or tier 5 (preparations).
          excludedSubstituteTypeIds: c.excluded_substitute_type_ids ?? [],
          // numeric columns come back as strings over PostgREST
          amount: Number(c.amount),
          unitLabel: c.unit_label,
          role: c.role,
          name: c.ingredient_types?.name,
        }
      }),
  }
}

const RECIPE_SELECT = `
  id, name, description, source_type, visibility, moderation_status, owner_id, original_owner_id, liquid_color, liquid_color_2, favorite_count, want_to_make_count, steps,
  glass:glasses(name, shape),
  family:cocktail_families(name),
  owner:profiles!recipes_owner_id_fkey(display_name),
  original_owner:profiles!recipes_original_owner_id_fkey(display_name),
  recipe_components(id, ingredient_type_id, amount, unit_label, role, sort_order, excluded_substitute_type_ids, ingredient_types(name, color), recipe_component_alternatives(ingredient_type_id, note)),
  recipe_taste_tags(taste_tags(name))
`

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("name")
  if (error) throw error
  return data.map(mapRecipe)
}

// Linked Variations Stage V.2 - the whole `recipe_relationships` table,
// flat (mirrors catalog.formConversions/ingredientSubstitutions' own
// "fetch once, resolve client-side" pattern rather than a doubly-self-
// referencing PostgREST embed in RECIPE_SELECT - simpler, lower-risk, and
// this table is small/rarely-changing like those). Never joined into
// RECIPE_SELECT and never read by the availability engine - only by
// src/domain/recipeRelationships.js's pure resolvers. RLS already limits
// this to rows where both sides are visible to the caller, so no further
// client-side filtering is needed.
export async function fetchRecipeRelationships() {
  const { data, error } = await supabase
    .from("recipe_relationships")
    .select("recipe_id, related_recipe_id, note")
  if (error) throw error
  return data.map((row) => ({
    recipeId: row.recipe_id,
    relatedRecipeId: row.related_recipe_id,
    note: row.note,
  }))
}

// Shapes the editor's `components` (see EditorScreen.jsx's own
// `components` array - `{ ingredientTypeId, amount, unitLabel, role,
// alternatives: [{ ingredientTypeId, note }], excludedSubstituteTypeIds }`)
// into save_recipe()'s expected snake_case JSONB shape. Shared by
// createRecipe()/updateRecipe() below - both now go through save_recipe()
// (Linked Variations atomicity fix, 20260913140000), not the older
// per-table sequence createClassicRecipes() still uses (see
// insertComponentsWithAlternatives() further down - unchanged, batch
// import stays on its own established path, out of scope for this fix).
function toComponentsPayload(components) {
  return components.map((c) => ({
    ingredient_type_id: c.ingredientTypeId,
    amount: c.amount,
    unit_label: c.unitLabel,
    role: c.role,
    excluded_substitute_type_ids: c.excludedSubstituteTypeIds ?? [],
    alternatives: (
      c.alternatives ??
      (c.alternativeIds ?? []).map((altId) => ({
        ingredientTypeId: altId,
        note: null,
      }))
    ).map((a) => ({
      ingredient_type_id: a.ingredientTypeId,
      note: a.note?.trim() ? a.note.trim() : null,
    })),
  }))
}

// `variationOf` (Linked Variations) - `{ baseRecipeId, note } | undefined`.
// `baseRecipeId: null`/undefined means "no base" - save_recipe() deletes
// any existing relationship and inserts nothing.
function toVariationOfPayload(variationOf) {
  return {
    base_recipe_id: variationOf?.baseRecipeId ?? null,
    note: variationOf?.note ?? null,
  }
}

export async function fetchRecipe(id) {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .single()
  if (error) throw error
  return mapRecipe(data)
}

// Used only by insertRecipeWithRelations() (createClassicRecipes'/batch
// import's own path) now - createRecipe()/updateRecipe() moved to
// save_recipe() (Linked Variations atomicity fix, 20260913140000), which
// does its own equivalent component/alternative insertion in SQL. Inserts
// recipe_components, then recipe_component_alternatives for whichever
// components carry them ("gin OR vodka" - src/domain/availability.js
// already treats any one owned alternative as satisfying the slot; this
// is the write side of that). Alternatives reference the component row's
// own id, which only exists after the components insert returns -
// correlated back to the right component via sort_order (unique per
// recipe) rather than trusting the returned rows' array order to match
// the input order.
async function insertComponentsWithAlternatives(recipeId, components) {
  if (components.length === 0) return
  const { data: insertedComponents, error: componentsError } = await supabase
    .from("recipe_components")
    .insert(
      components.map((c, index) => ({
        recipe_id: recipeId,
        ingredient_type_id: c.ingredientTypeId,
        amount: c.amount,
        unit_label: c.unitLabel,
        role: c.role,
        sort_order: index,
        // Stage D.4 - defaults to '{}' (every configured general
        // substitute stays eligible) when a caller doesn't set this, same
        // as the column's own DB default.
        excluded_substitute_type_ids: c.excludedSubstituteTypeIds ?? [],
      })),
    )
    .select()
  if (componentsError) throw componentsError

  const alternativeRows = []
  components.forEach((c, index) => {
    // Editor payload: `alternatives` = [{ ingredientTypeId, note }]. Older
    // callers (batch import doesn't set either, but stay defensive) may pass
    // a plain `alternativeIds` string array - treat those as note-less.
    const alts =
      c.alternatives ??
      (c.alternativeIds ?? []).map((id) => ({
        ingredientTypeId: id,
        note: null,
      }))
    if (!alts.length) return
    const componentRow = insertedComponents.find((r) => r.sort_order === index)
    if (!componentRow) return
    alts.forEach((alt) => {
      alternativeRows.push({
        recipe_id: recipeId,
        recipe_component_id: componentRow.id,
        ingredient_type_id: alt.ingredientTypeId,
        note: alt.note?.trim() ? alt.note.trim() : null,
      })
    })
  })
  if (alternativeRows.length > 0) {
    const { error: altError } = await supabase
      .from("recipe_component_alternatives")
      .insert(alternativeRows)
    if (altError) throw altError
  }
}

// Used only by createClassicRecipes() (batch import) now - createRecipe()
// moved to save_recipe() (Linked Variations atomicity fix, 20260913140000)
// for a genuine single-transaction save. Batch import deliberately stays
// on this older, per-table-calls-with-compensating-delete path: it's
// already its own per-row-isolated flow (a DB failure on one row doesn't
// abort the rest of the pasted batch), doesn't support a relationship
// reference at all (see the plan doc's Import decision), and moving it to
// save_recipe() isn't something this fix was asked for or needs - inserts
// the recipe row, then its components/alternatives/taste tags in separate
// calls (no client-side multi-statement transaction available for this
// path); best-effort cleanup deletes the recipe again if a later step
// fails, so a partial write can't leave an empty/broken recipe behind.
async function insertRecipeWithRelations(
  recipeInsert,
  { components, tasteTagIds },
) {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert(recipeInsert)
    .select()
    .single()
  if (recipeError) throw recipeError

  try {
    await insertComponentsWithAlternatives(recipe.id, components)

    if (tasteTagIds.length > 0) {
      const { error: tagsError } = await supabase
        .from("recipe_taste_tags")
        .insert(
          tasteTagIds.map((tagId) => ({
            recipe_id: recipe.id,
            taste_tag_id: tagId,
          })),
        )
      if (tagsError) throw tagsError
    }
  } catch (err) {
    await supabase.from("recipes").delete().eq("id", recipe.id)
    throw err
  }

  return recipe.id
}

// Always creates a private user recipe - publishing is a separate action
// (publishRecipe(), below). Goes through save_recipe() (Linked Variations
// atomicity fix, 20260913140000) with p_recipe_id null: the recipe row,
// its components/alternatives, its taste tags, AND its optional
// relationship are all inserted in one transaction - a failure anywhere
// (an invalid ingredient reference, a chosen base that would somehow
// create a cycle) leaves nothing behind at all, not a half-created recipe
// needing a compensating cleanup delete.
export async function createRecipe({
  name,
  description,
  glassId,
  familyId,
  liquidColor,
  liquidColor2,
  steps,
  components,
  tasteTagIds,
  variationOf,
}) {
  const { data: id, error } = await supabase.rpc("save_recipe", {
    p_recipe_id: null,
    p_fields: {
      name,
      description: description || null,
      glass_id: glassId,
      family_id: familyId || null,
      liquid_color: liquidColor || null,
      liquid_color_2: liquidColor2 || null,
      steps,
    },
    p_components: toComponentsPayload(components),
    p_taste_tag_ids: tasteTagIds ?? [],
    p_variation_of: toVariationOfPayload(variationOf),
  })
  if (error) throw error
  return fetchRecipe(id)
}

// Admin-only via the "recipes: insert" RLS policy's is_admin() branch (see
// supabase/migrations/20260815214307_recipes_schema.sql) - no new grant
// needed. Unlike createRecipe()'s always-private member recipes, batch
// imports join the canonical classic catalog directly: ownerless, published
// immediately (there's no pre-publish review queue for classics, same as
// community recipes per the moderation-tab comment above). `rows` are
// already-validated resolved objects from src/schemas/recipeImport.js, not
// raw import JSON. Commits each row independently and collects failures
// rather than throwing on the first one - a per-row DB failure here (rare,
// since validation already checked shape/references) shouldn't hide whether
// the other, unrelated rows in the same paste succeeded.
export async function createClassicRecipes(rows) {
  const failures = []
  let createdCount = 0
  for (const [index, row] of rows.entries()) {
    try {
      await insertRecipeWithRelations(
        {
          name: row.name,
          description: row.description || null,
          source_type: "classic",
          owner_id: null,
          visibility: "shared",
          moderation_status: "active",
          glass_id: row.glassId,
          family_id: row.familyId || null,
          liquid_color: row.liquidColor || null,
          liquid_color_2: row.liquidColor2 || null,
          steps: row.steps,
        },
        { components: row.components, tasteTagIds: row.tasteTagIds },
      )
      createdCount += 1
    } catch (err) {
      failures.push({ index, name: row.name, message: err.message })
    }
  }
  return { createdCount, failures }
}

// Spec §4: owners can edit their own recipe (private or published), and
// admins can edit the classic catalog (owner_id null) - enforced
// server-side by RLS on every table save_recipe() touches, not just this
// client check.
//
// Goes through save_recipe() (Linked Variations atomicity fix,
// 20260913140000) - the recipe's own fields, its full component/
// alternative set, its full taste-tag set, and its one relationship row
// (`variationOf`: `{ baseRecipeId, note } | undefined` - `baseRecipeId:
// null`/undefined removes it) are now all written in ONE transaction. A
// failure anywhere - a bad ingredient reference, the caller not actually
// owning the recipe, or a chosen base that would create a cycle - rolls
// back everything this call would have changed, leaving the recipe
// exactly as it was before Save. This replaces an earlier version of this
// function that called a narrower set_recipe_variation_of() RPC first and
// then ran the recipe/components/tags writes as separate sequential
// Supabase calls - correct for "a cyclic rejection stops later writes"
// (call order), but NOT correct for "the relationship write already
// succeeded and committed before a LATER step failed" - a real gap this
// single-transaction RPC closes for good, per the explicit instruction not
// to simulate rollback via compensating client-side writes.
export async function updateRecipe(
  id,
  {
    name,
    description,
    glassId,
    familyId,
    liquidColor,
    liquidColor2,
    steps,
    components,
    tasteTagIds,
    variationOf,
  },
) {
  const { error } = await supabase.rpc("save_recipe", {
    p_recipe_id: id,
    p_fields: {
      name,
      description: description || null,
      glass_id: glassId,
      family_id: familyId || null,
      liquid_color: liquidColor || null,
      liquid_color_2: liquidColor2 || null,
      steps,
    },
    p_components: toComponentsPayload(components),
    p_taste_tag_ids: tasteTagIds ?? [],
    p_variation_of: toVariationOfPayload(variationOf),
  })
  if (error) throw error
  return fetchRecipe(id)
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from("recipes").delete().eq("id", id)
  if (error) throw error
}

// Both go through SECURITY DEFINER functions - visibility/moderation_status
// are deliberately excluded from the general recipes UPDATE grant (step 6),
// so a direct .update({visibility: 'shared'}) call would fail regardless.
export async function publishRecipe(id) {
  const { error } = await supabase.rpc("publish_recipe", { p_recipe_id: id })
  if (error) throw error
}

export async function unpublishRecipe(id) {
  const { error } = await supabase.rpc("unpublish_recipe", { p_recipe_id: id })
  if (error) throw error
}

// Admin-only, both via SECURITY DEFINER functions - see
// 20260823130000_classic_promotion.sql for why owner_id/original_owner_id
// get swapped rather than just flipping source_type in place.
export async function promoteRecipeToClassic(id) {
  const { error } = await supabase.rpc("admin_promote_recipe_to_classic", {
    p_recipe_id: id,
  })
  if (error) throw error
}

export async function demoteRecipeToCommunity(id) {
  const { error } = await supabase.rpc("admin_demote_recipe_to_community", {
    p_recipe_id: id,
  })
  if (error) throw error
}

// Admin moderation tab: currently-shared community recipes only - there's no
// pre-publish review queue (publishing is immediate per the spec), just
// after-the-fact unpublishing.
export async function fetchCommunityRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, name, published_at, owner:profiles!recipes_owner_id_fkey(display_name)",
    )
    .eq("source_type", "user")
    .eq("visibility", "shared")
    .eq("moderation_status", "active")
    .order("published_at", { ascending: false })
  if (error) throw error
  return data
}
