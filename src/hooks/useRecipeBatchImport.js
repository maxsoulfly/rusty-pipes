import { useState } from "react"
import { validateIngredientImport } from "@/schemas/ingredientImport"
import {
  buildRecipeImportPrompt,
  validateRecipeImport,
} from "@/schemas/recipeImport"
import { createIngredientTypes } from "@/services/ingredientTypes"
import { createClassicRecipes } from "@/services/recipes"

// Admin Batch Import -> Recipes (adminOnly - see ImportTab.jsx's own
// comment on why). Fully self-contained: nothing outside ImportRecipes.jsx
// reads or writes any of this state, unlike the Ingredients entity's
// single-add path (which Requests/Ingredient Types deep-link into and
// which shares its own success-message state with that cross-tab flow) -
// that asymmetry is why ingredients import stays lifted in AdminLayout.jsx
// (renamed from AdminScreen.jsx in the 2026-09-14 nested-route migration)
// while this and useProductBatchImport moved out.
//
// The inline "add this missing ingredient" flow (addIngredientDraft and
// friends) lives here too, not as a separate hook - it only ever exists to
// unblock a row in THIS recipe import batch, and re-validates that same
// batch in place afterward (see onSaveAddIngredientDraft below).
export function useRecipeBatchImport({ catalog, computed, refetchRecipes }) {
  const [recipeBatchPhase, setRecipeBatchPhase] = useState("paste")
  const [recipeImportJson, setRecipeImportJson] = useState("")
  const [recipeImportResult, setRecipeImportResult] = useState(null)
  const [recipeImporting, setRecipeImporting] = useState(false)
  const [recipePromptCopied, setRecipePromptCopied] = useState(false)
  const [recipeImportSuccessMessage, setRecipeImportSuccessMessage] =
    useState(null)
  const [addIngredientDraft, setAddIngredientDraft] = useState(null)
  const [addIngredientSaving, setAddIngredientSaving] = useState(false)
  const [addIngredientError, setAddIngredientError] = useState(null)

  const recipeImportPrompt = buildRecipeImportPrompt({
    types: catalog.types,
    glasses: catalog.glasses,
    families: catalog.families,
    tasteTags: catalog.tasteTags,
    aliases: catalog.aliases,
  })

  const onCopyPrompt = () => {
    navigator.clipboard.writeText(recipeImportPrompt).catch(() => {})
    setRecipePromptCopied(true)
    setTimeout(() => setRecipePromptCopied(false), 2000)
  }

  // catalogOverride lets a caller pass freshly-refetched data directly,
  // instead of this function reading the hook's own `catalog` closure -
  // needed because `catalog.refetch()` updates React *state* (a future
  // render), it never mutates the `catalog` object an already-running
  // function is holding. onSaveAddIngredientDraft used to call this right
  // after awaiting catalog.refetch() and still validate against the
  // pre-refetch catalog every single time (not a rare race - a plain JS
  // closure can never see a state update from within its own execution) -
  // real bug a user hit while batch-importing "Alexander" and adding its
  // missing ingredients one at a time, where each add's re-validate still
  // showed that exact ingredient as unresolved.
  const runRecipeImportValidation = (catalogOverride) => {
    const c = catalogOverride ?? catalog
    let parsed
    try {
      parsed = JSON.parse(recipeImportJson)
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array")
    } catch (err) {
      setRecipeImportResult({ parseError: err.message })
      setRecipeBatchPhase("results")
      return
    }
    const validation = validateRecipeImport(parsed, {
      types: c.types,
      glasses: c.glasses,
      families: c.families,
      tasteTags: c.tasteTags,
      aliases: c.aliases,
      glassAliases: c.glassAliases,
      existingRecipeNames: computed.map((r) => r.name),
    })
    setRecipeImportResult(validation)
    setRecipeBatchPhase("results")
  }

  const onCommit = async () => {
    if (!recipeImportResult?.results) return
    const rows = recipeImportResult.results
      .filter((r) => r.valid)
      .map((r) => r.resolved)
    if (rows.length === 0) return
    setRecipeImporting(true)
    try {
      const { createdCount, failures } = await createClassicRecipes(rows)
      await refetchRecipes()
      if (failures.length === 0) {
        setRecipeImportSuccessMessage(
          `Imported ${createdCount} recipe${createdCount === 1 ? "" : "s"}.`,
        )
        setRecipeBatchPhase("paste")
        setRecipeImportJson("")
        setRecipeImportResult(null)
      } else {
        setRecipeImportResult({
          ...recipeImportResult,
          commitError: `${createdCount} imported, ${failures.length} failed: ${failures
            .map((f) => `"${f.name}" (${f.message})`)
            .join("; ")}`,
        })
      }
    } catch (err) {
      setRecipeImportResult({ ...recipeImportResult, commitError: err.message })
    } finally {
      setRecipeImporting(false)
    }
  }

  const onOpenAddIngredientDraft = (name) => {
    setAddIngredientError(null)
    setAddIngredientDraft({
      name,
      categoryId: "",
      parentTypeId: "",
      barPriority: "common",
      color: "",
      description: "",
    })
  }

  const onSaveAddIngredientDraft = async () => {
    if (!addIngredientDraft) return
    setAddIngredientSaving(true)
    setAddIngredientError(null)
    const categoryName =
      catalog.categories.find((c) => c.id === addIngredientDraft.categoryId)
        ?.name ?? ""
    const parentTypeName = addIngredientDraft.parentTypeId
      ? catalog.types.find((t) => t.id === addIngredientDraft.parentTypeId)
          ?.name
      : undefined
    const { results } = validateIngredientImport(
      [
        {
          name: addIngredientDraft.name.trim(),
          category: categoryName,
          parentType: parentTypeName,
          barPriority: addIngredientDraft.barPriority,
          color: addIngredientDraft.color.trim() || undefined,
          description: addIngredientDraft.description.trim() || undefined,
        },
      ],
      {
        categories: catalog.categories,
        types: catalog.types,
        aliases: catalog.aliases,
      },
    )
    const [result] = results
    if (!result.valid) {
      setAddIngredientError(result.errors.join("; "))
      setAddIngredientSaving(false)
      return
    }
    try {
      await createIngredientTypes([result.resolved])
      const freshCatalog = await catalog.refetch()
      setAddIngredientDraft(null)
      // Re-validate in place so the row that was blocked on this ingredient
      // updates immediately, without losing the pasted JSON. Passed
      // explicitly - see runRecipeImportValidation's comment for why this
      // can't just read the hook's own (stale) catalog closure here.
      runRecipeImportValidation(freshCatalog)
    } catch (err) {
      setAddIngredientError(err.message)
    } finally {
      setAddIngredientSaving(false)
    }
  }

  return {
    recipeImportSuccessMessage,
    recipeBatchPhase,
    setRecipeBatchPhase,
    recipeImportPrompt,
    recipePromptCopied,
    onCopyPrompt,
    recipeImportJson,
    setRecipeImportJson,
    onValidate: () => runRecipeImportValidation(),
    recipeImportResult,
    setRecipeImportResult,
    recipeImporting,
    onCommit,
    addIngredientDraft,
    setAddIngredientDraft,
    onOpenAddIngredientDraft,
    addIngredientError,
    addIngredientSaving,
    onSaveAddIngredientDraft,
  }
}
