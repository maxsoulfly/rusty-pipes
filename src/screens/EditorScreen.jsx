import { useEffect, useMemo, useState } from "react"
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom"
import { GlassSvg } from "@/components/GlassSvg"
import { TopBar } from "@/components/Nav"
import { DraftRestoreBanner } from "@/components/editor/DraftRestoreBanner"
import { EntryModeSwitcher } from "@/components/editor/EntryModeSwitcher"
import { FamilyPicker } from "@/components/editor/FamilyPicker"
import { GlassPicker } from "@/components/editor/GlassPicker"
import { IngredientRowsEditor } from "@/components/editor/IngredientRowsEditor"
import { OtherDraftsPicker } from "@/components/editor/OtherDraftsPicker"
import { PasteRecipeMode } from "@/components/editor/PasteRecipeMode"
import { RecipeComboBox } from "@/components/editor/RecipeComboBox"
import { StepsEditor } from "@/components/editor/StepsEditor"
import { TasteTagChips } from "@/components/editor/TasteTagChips"
import { Btn, ColorSwatchPicker, Input } from "@/components/primitives"
import { NON_VOLUME_UNITS } from "@/data/constants"
import { ozToMl } from "@/domain/availability"
import { resolveEditorHeaderTitle } from "@/domain/editorHeader"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import {
  resolveBaseRelationship,
  resolveVariationCandidates,
} from "@/domain/recipeRelationships"
import { parseUnitLabel } from "@/domain/servings"
import { useRecipeDraftAutosave } from "@/hooks/useRecipeDraftAutosave"
import { useRecipePasteImport } from "@/hooks/useRecipePasteImport"
import { MAX_DRAFTS } from "@/lib/recipeDrafts"
import { createRecipe, updateRecipe } from "@/services/recipes"

// Reverses createRecipe's amount/unitLabel encoding (see services/recipes.js)
// so an existing component can prefill the amount+unit inputs. Uses
// domain/servings.js's parseUnitLabel() rather than a naive
// split(" ") - a bare label with no leading number (e.g. "top-up") is
// entirely the unit, not an "amount" of its first word; the old version
// got this wrong and corrupted "top-up" into "top-up part" on a re-save
// (see parseUnitLabel's own comment for the full story).
function unitLabelToForm(ri) {
  if (ri.unitLabel === "ml") return { amount: String(ri.amount), unit: "ml" }
  const { amount, unit } = parseUnitLabel(ri.unitLabel)
  return { amount, unit: unit || NON_VOLUME_UNITS[0] }
}

export default function EditorScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditing = Boolean(id)
  // Cloning (?clone=<id>, linked from DetailScreen's "Clone as My Own
  // Recipe") is a plain new-recipe creation, not editing - it prefills the
  // form from another visible recipe (classic or someone else's community
  // one) so a member doesn't have to retype every ingredient/step to build
  // their own variant, but saving still goes through createRecipe() and
  // makes an ordinary private recipe they own outright.
  const cloneSourceId = !isEditing ? searchParams.get("clone") : null
  const {
    catalog,
    computed,
    userId,
    isAdmin,
    refetchRecipes,
    recipeRelationships,
  } = useOutletContext()
  const {
    types,
    glasses,
    families,
    tasteTags,
    loading: catalogLoading,
  } = catalog

  const existing = isEditing ? computed.find((item) => item.id === id) : null
  const cloneSource = cloneSourceId
    ? computed.find((item) => item.id === cloneSourceId)
    : null
  // Spec §4: owners edit their own recipe (any state); admins edit only the
  // ownerless classic catalog. Same rule the DB now enforces (see
  // supabase/migrations/20260815231800_tighten_recipe_edit_scope.sql) -
  // this is just the UI-side reflection of it, not the source of truth.
  const canEditExisting =
    existing &&
    (existing.ownerId === userId || (isAdmin && existing.source === "classic"))

  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [glassName, setGlassName] = useState("")
  const [familyId, setFamilyId] = useState("")
  // "Clear" (#dbeafe) - can't default from catalog.liquidColors here, that's
  // an async fetch that hasn't necessarily resolved yet at first render.
  const [liquidColor, setLiquidColor] = useState("#dbeafe")
  // Optional second color, for a layered/gradient drink (Tequila Sunrise,
  // a layered shot, a rainbow shot) a single flat fill can't represent -
  // "" (not set) means a plain flat fill, matching liquidColor2 being
  // nullable in the DB. hasSecondColor is a separate checkbox rather than
  // just "is liquidColor2 non-empty", since most cocktails don't use this
  // at all - showing the picker unconditionally made every ordinary
  // single-color recipe look like it was missing a step.
  const [hasSecondColor, setHasSecondColor] = useState(false)
  const [liquidColor2, setLiquidColor2] = useState("")
  const toggleSecondColor = (checked) => {
    setHasSecondColor(checked)
    if (!checked) setLiquidColor2("")
  }
  // Editor convenience only - swaps the two draft color values in place, no
  // service/domain call, no persistence beyond the normal recipe save that
  // already happens on Save Recipe/Save Changes. Only ever reachable when
  // both colors exist (see the disabled guard at its call site) - there is
  // nothing meaningful to swap otherwise.
  const swapColors = () => {
    setLiquidColor(liquidColor2)
    setLiquidColor2(liquidColor)
  }
  const [ings, setIngs] = useState([
    { ingredientName: "", amount: "", unit: "ml", role: "required" },
  ])
  const [steps, setSteps] = useState([""])
  const [tasteTagIds, setTasteTagIds] = useState([])
  // Linked Variations Stage V.2 - "Variation of." Draft-only, like every
  // other field here: nothing is written until Save (createRecipe()/
  // updateRecipe() below), and Cancel (navigating away without saving)
  // discards it with zero writes, same as the rest of this form.
  // `variationOfRecipeId: null` means "no base / not a variation."
  const [variationOfRecipeId, setVariationOfRecipeId] = useState(null)
  const [variationNote, setVariationNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [prefilled, setPrefilled] = useState(!isEditing && !cloneSourceId)

  // A blocked save (most often: an ingredient that doesn't exist yet and
  // needs admin approval - see RequestIngredientScreen) used to just lose
  // whatever the member had typed, with no way back to it. Auto-saves a
  // blank "New Recipe" in progress to this browser's local storage so a
  // closed tab or a wait-on-approval doesn't erase it - not a real
  // server-side draft (doesn't survive a different device or a cleared
  // browser), but a cheap safety net for the common case. Scoped to plain
  // new-recipe creation only, not editing or cloning - both of those already
  // have their own prefill source and a saved copy to fall back to.
  const isDraftable = !isEditing && !cloneSourceId

  // The 9 fields a draft actually captures - memoized so its reference only
  // changes when one of them does, exactly matching what the autosave
  // effect depended on before it moved into useRecipeDraftAutosave (9
  // separate primitive dependencies, not "re-run on every render").
  const draftFormValues = useMemo(
    () => ({
      name,
      desc,
      glassName,
      familyId,
      liquidColor,
      liquidColor2,
      ings,
      steps,
      tasteTagIds,
    }),
    [
      name,
      desc,
      glassName,
      familyId,
      liquidColor,
      liquidColor2,
      ings,
      steps,
      tasteTagIds,
    ],
  )
  // The other side of restoring a draft - loads its 9 fields into this
  // form's own state. Kept here (not in the hook) since it's the one place
  // that owns every one of those setters.
  const applyDraftToForm = (draft) => {
    setName(draft.name ?? "")
    setDesc(draft.desc ?? "")
    setGlassName(draft.glassName ?? "")
    setFamilyId(draft.familyId ?? "")
    if (draft.liquidColor) setLiquidColor(draft.liquidColor)
    setHasSecondColor(Boolean(draft.liquidColor2))
    setLiquidColor2(draft.liquidColor2 ?? "")
    setIngs(
      (
        draft.ings ?? [
          { ingredientName: "", amount: "", unit: "ml", role: "required" },
        ]
      ).map((ing) => ({
        ...ing,
        // A draft saved before Stage B carries `alternativeNames: string[]`.
        // Migrate it forward so its substitutes (and any adopted flavor
        // notes on later saves) aren't silently dropped on restore.
        alternatives:
          ing.alternatives ??
          (ing.alternativeNames ?? []).map((name) => ({ name, note: "" })),
      })),
    )
    setSteps(draft.steps ?? [""])
    setTasteTagIds(draft.tasteTagIds ?? [])
  }
  const {
    draftBanner,
    otherDrafts,
    restoreDraft,
    discardDraft,
    continueOtherDraft,
    discardOtherDraft,
    clearDraftOnSave,
  } = useRecipeDraftAutosave({
    isDraftable,
    userId,
    searchParams,
    setSearchParams,
    formValues: draftFormValues,
    onApplyDraft: applyDraftToForm,
  })

  useEffect(() => {
    const source = isEditing ? existing : cloneSource
    if (prefilled || !source || catalogLoading) return
    setName(isEditing ? source.name : `${source.name} (My Version)`)
    setDesc(source.description ?? "")
    setGlassName(source.glass)
    setLiquidColor(source.liquidColor)
    setHasSecondColor(Boolean(source.liquidColor2))
    setLiquidColor2(source.liquidColor2 ?? "")
    const family = families.find((f) => f.name === source.family)
    setFamilyId(family?.id ?? "")
    setIngs(
      source.ings.map((ri) => ({
        ingredientName: ri.name ?? "",
        ...unitLabelToForm(ri),
        role: ri.role,
        alternatives: (ri.alternativeIds ?? [])
          .map((altId) => {
            const t = types.find((t) => t.id === altId)
            return t
              ? { name: t.name, note: ri.alternativeNotes?.[altId] ?? "" }
              : null
          })
          .filter(Boolean),
        // Stage D.4 - per-component general-substitute exclusion, carried
        // through unchanged for editing.
        excludedSubstituteTypeIds: ri.excludedSubstituteTypeIds ?? [],
      })),
    )
    setSteps(source.steps.length > 0 ? source.steps : [""])
    setTasteTagIds(
      source.taste
        .map((name) => tasteTags.find((t) => t.name === name)?.id)
        .filter(Boolean),
    )
    // Linked Variations Stage V.2 - only on a genuine edit, never on a
    // clone (a clone is a brand-new, unlinked recipe by default; the
    // plan's own opt-in "this is a variation of the clone source"
    // checkbox is a separate, deferred follow-up, not built here).
    if (isEditing) {
      const relationship = resolveBaseRelationship(
        source.id,
        recipeRelationships,
      )
      setVariationOfRecipeId(relationship?.baseRecipeId ?? null)
      setVariationNote(relationship?.note ?? "")
    }
    setPrefilled(true)
  }, [
    isEditing,
    prefilled,
    existing,
    cloneSource,
    catalogLoading,
    families,
    tasteTags,
    types,
    recipeRelationships,
  ])

  // Member-facing "paste a recipe, app fills in the form" - only offered
  // for a genuinely blank new recipe (not editing, not cloning, both of
  // which already have their own prefill source above). Backlog #3: the
  // actual ask behind the pineapple whisky sour recipe pasted earlier -
  // reuses the exact same AI-formatting prompt and ingredient/alias
  // resolution as admin batch import, but deliberately lenient
  // (parseRecipePaste) rather than all-or-nothing, since the result always
  // lands in this same form for the member to review before saving, not a
  // direct commit.
  const showPasteOption = !isEditing && !cloneSourceId
  const applyPastedRecipe = (result) => {
    setName(result.name)
    setDesc(result.description)
    setGlassName(result.glassName)
    setFamilyId(result.familyId)
    if (result.liquidColor) setLiquidColor(result.liquidColor)
    setHasSecondColor(Boolean(result.liquidColor2))
    setLiquidColor2(result.liquidColor2 ?? "")
    setTasteTagIds(result.tasteTagIds)
    setSteps(result.steps)
    setIngs(result.ings)
  }
  const {
    entryMode,
    setEntryMode,
    pasteJson,
    setPasteJson,
    pasteError,
    promptCopied,
    pastePrompt,
    copyPastePrompt,
    handleFillFromPaste,
  } = useRecipePasteImport({
    types,
    glasses,
    families,
    tasteTags,
    aliases: catalog.aliases,
    glassAliases: catalog.glassAliases,
    onFill: applyPastedRecipe,
  })

  const effectiveGlassName = glassName || glasses[0]?.name || ""
  // For the live color preview below - if the name doesn't resolve to a
  // real glass (nothing picked yet, or a stale name), `undefined` is passed
  // straight through to GlassSvg, which already has its own existing
  // fallback silhouette for an unmatched shape - no new fallback invented.
  const previewGlassShape = glasses.find(
    (g) => g.name === effectiveGlassName,
  )?.shape

  // Linked Variations Stage V.2 - candidate bases for "Variation of":
  // every recipe this viewer can already see (`computed` is already
  // RLS-filtered), excluding the recipe being edited itself. `id` is
  // undefined for a brand-new recipe, so nothing is excluded yet -
  // correct, since there's no "self" to exclude before it's saved once.
  // No client-side cycle filtering - the plan deliberately leaves cycle
  // rejection to the DB trigger alone (see docs/plans/linked-variations.md's
  // Admin/editor UX section).
  const variationCandidates = resolveVariationCandidates(computed, id)

  const addIng = () =>
    setIngs([
      ...ings,
      { ingredientName: "", amount: "", unit: "ml", role: "required" },
    ])
  const removeIng = (i) => setIngs(ings.filter((_, idx) => idx !== i))
  const updateIng = (i, k, v) =>
    setIngs(ings.map((ing, idx) => (idx === i ? { ...ing, [k]: v } : ing)))

  // Substitution groups ("gin OR vodka") - the availability engine treats
  // any one owned alternative as satisfying the slot
  // (src/domain/availability.js). Each entry is { name, note } - `note` is
  // an optional recipe-scoped flavor-change line (Stage B). Resolved the
  // same way the main ingredient field is (exact name or alias, no fuzzy
  // matching), committed only once it resolves to a real type.
  const commitAlternativeDraft = (i) => {
    const ing = ings[i]
    const draft = (ing.altDraft ?? "").trim()
    if (!draft) return
    const resolved = resolveIngredientType(draft, {
      types,
      aliases: catalog.aliases,
    })
    if (!resolved) return
    const existing = ing.alternatives ?? []
    if (
      resolved.name.toLowerCase() === ing.ingredientName.trim().toLowerCase() ||
      existing.some((a) => a.name.toLowerCase() === resolved.name.toLowerCase())
    ) {
      updateIng(i, "altDraft", "")
      return
    }
    setIngs(
      ings.map((row, idx) =>
        idx === i
          ? {
              ...row,
              alternatives: [...existing, { name: resolved.name, note: "" }],
              altDraft: "",
            }
          : row,
      ),
    )
  }
  const removeAlternative = (i, altIndex) =>
    setIngs(
      ings.map((row, idx) =>
        idx === i
          ? {
              ...row,
              alternatives: (row.alternatives ?? []).filter(
                (_, ai) => ai !== altIndex,
              ),
            }
          : row,
      ),
    )
  const updateAlternativeNote = (i, altIndex, note) =>
    setIngs(
      ings.map((row, idx) =>
        idx === i
          ? {
              ...row,
              alternatives: (row.alternatives ?? []).map((a, ai) =>
                ai === altIndex ? { ...a, note } : a,
              ),
            }
          : row,
      ),
    )
  // Adopt a catalogue "Suggested substitute" onto this component - it
  // becomes a real recipe_component_alternatives row (with its flavor note)
  // on Save, and only then does it affect this recipe's availability.
  const adoptSuggestion = (i, toName, note) =>
    setIngs(
      ings.map((row, idx) => {
        if (idx !== i) return row
        const existing = row.alternatives ?? []
        if (existing.some((a) => a.name.toLowerCase() === toName.toLowerCase()))
          return row
        return {
          ...row,
          alternatives: [...existing, { name: toName, note: note ?? "" }],
        }
      }),
    )
  // Stage D.4 - "Spiced Rum doesn't belong in my Daiquiri": excludes ONE
  // configured general substitute from tier 4 on this one component, never
  // a whole-component/whole-recipe switch. Toggles in place (excluding
  // again un-excludes it) so the same chip acts as its own undo.
  const toggleExcludedSubstitute = (i, toTypeId) =>
    setIngs(
      ings.map((row, idx) => {
        if (idx !== i) return row
        const existing = row.excludedSubstituteTypeIds ?? []
        return {
          ...row,
          excludedSubstituteTypeIds: existing.includes(toTypeId)
            ? existing.filter((id) => id !== toTypeId)
            : [...existing, toTypeId],
        }
      }),
    )

  const addStep = () => setSteps([...steps, ""])
  const removeStep = (i) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i, v) =>
    setSteps(steps.map((s, idx) => (idx === i ? v : s)))

  const toggleTaste = (tagId) =>
    setTasteTagIds(
      tasteTagIds.includes(tagId)
        ? tasteTagIds.filter((x) => x !== tagId)
        : [...tasteTagIds, tagId],
    )

  // Non-empty rows must match a real ingredient type - same rule as Add
  // Product, since a member can't create a new ingredient type either way.
  const nonEmptyIngs = ings.filter(
    (i) => i.ingredientName.trim() || i.amount.trim(),
  )
  const resolvedIngs = nonEmptyIngs.map((i) => ({
    ...i,
    matchedType: resolveIngredientType(i.ingredientName, {
      types,
      aliases: catalog.aliases,
    }),
  }))
  const hasUnmatchedIng = resolvedIngs.some((i) => !i.matchedType)
  const canSave =
    name.trim() &&
    effectiveGlassName &&
    resolvedIngs.length > 0 &&
    !hasUnmatchedIng &&
    !saving &&
    (!isEditing || canEditExisting)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const glass = glasses.find((g) => g.name === effectiveGlassName)
      const components = resolvedIngs.map((i) => {
        const isVolume = i.unit === "ml" || i.unit === "oz"
        // oz is an entry convenience only - storage stays canonically ml
        // (per the spec's measurement rules), so an oz-entered amount is
        // converted once here and saved exactly like a plain ml entry.
        const amountMl =
          i.unit === "oz"
            ? ozToMl(Number(i.amount) || 0)
            : Number(i.amount) || 0
        const alternatives = (i.alternatives ?? [])
          .map((a) => {
            const t = resolveIngredientType(a.name, {
              types,
              aliases: catalog.aliases,
            })
            return t
              ? { ingredientTypeId: t.id, note: a.note?.trim() || null }
              : null
          })
          .filter(Boolean)
        return {
          ingredientTypeId: i.matchedType.id,
          amount: isVolume ? amountMl : 0,
          unitLabel: isVolume ? "ml" : `${i.amount} ${i.unit}`.trim(),
          role: i.role,
          alternatives,
          excludedSubstituteTypeIds: i.excludedSubstituteTypeIds ?? [],
        }
      })
      const payload = {
        name: name.trim(),
        description: desc.trim(),
        glassId: glass.id,
        familyId: familyId || null,
        liquidColor,
        liquidColor2: liquidColor2 || null,
        steps: steps.map((s) => s.trim()).filter(Boolean),
        components,
        tasteTagIds,
        // Linked Variations Stage V.2 - see updateRecipe()/createRecipe()
        // (src/services/recipes.js) for exactly how/when this is written;
        // it never touches the fields above.
        variationOf: {
          baseRecipeId: variationOfRecipeId,
          note: variationNote.trim() || null,
        },
      }
      const recipe = isEditing
        ? await updateRecipe(id, payload)
        : await createRecipe(payload)
      clearDraftOnSave()
      await refetchRecipes() // so the change is in `computed` before DetailScreen looks for it
      navigate(`/library/${recipe.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  // Abandons the current editing session with zero writes - never calls
  // createRecipe/updateRecipe. In edit mode there's nothing else to clean up
  // (isEditing never writes a draft to localStorage in the first place - see
  // isDraftable above). In create mode, discardDraft() is the SAME helper
  // the "Discard" button on DraftRestoreBanner already uses
  // (useRecipeDraftAutosave.js) - it deletes this draft's localStorage entry/
  // index row and clears `?draft=` from the URL, and is already a no-op-safe
  // call whether a draft was just self-assigned this session, restored from
  // an earlier session, still mid-decision behind the restore banner, or
  // never created at all (blank draftId). Reuses the same back-navigation
  // the header's own back arrow already uses, rather than a hardcoded route,
  // so Cancel returns wherever the user actually came from (recipe detail,
  // library, etc.) in both edit and create mode.
  const handleCancel = () => {
    if (isDraftable) discardDraft()
    navigate(-1)
  }

  if (catalogLoading || (isEditing && !prefilled)) {
    return (
      <div className="py-15 px-6 text-center text-tx2 text-sm">Loading...</div>
    )
  }

  if (isEditing && !existing) {
    return (
      <div className="py-15 px-6 text-center text-tx3">
        <p className="mb-3 text-base font-display font-semibold">
          Cocktail not found
        </p>
        <Btn variant="ghost" small onClick={() => navigate("/library")}>
          Back to library
        </Btn>
      </div>
    )
  }

  if (isEditing && !canEditExisting) {
    return (
      <div className="py-15 px-6 text-center text-tx3">
        <p className="mb-3 text-base font-display font-semibold">
          You can't edit this recipe
        </p>
        <p className="mb-3 text-[13px]">
          Only the recipe's owner, or an admin for classic recipes, can make
          changes.
        </p>
        <Btn variant="ghost" small onClick={() => navigate(`/library/${id}`)}>
          Back to recipe
        </Btn>
      </div>
    )
  }

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      {/* Editor sticky-header improvement (manual-testing finding, Linked
          Variations) - scrolling deep into a long recipe's edit form (past
          Ingredients/Steps/Taste Tags/Variation Of) left only a generic
          "Edit Recipe" visible up top, so it was easy to lose track of
          WHICH recipe was being edited. `resolveEditorHeaderTitle()`
          (src/domain/editorHeader.js) picks the title/subtitle from
          `existing?.name` - the PERSISTED name from `computed`, never the
          live `name` draft state below - so an unsaved Recipe Name edit
          does NOT retitle the header until Save succeeds and `computed`
          refetches; the header keeps answering "which existing recipe am
          I editing," while the form is where the in-progress draft shows.
          Same sticky TopBar, same tap target, no new component. */}
      <TopBar
        {...resolveEditorHeaderTitle({
          isEditing,
          existingName: existing?.name,
          cloneSourceId,
        })}
        onBack={() => navigate(-1)}
      />
      <div className="p-5 flex flex-col gap-5">
        {draftBanner && (
          <DraftRestoreBanner
            draft={draftBanner}
            onRestore={restoreDraft}
            onDiscard={discardDraft}
          />
        )}
        {!draftBanner && otherDrafts.length > 0 && (
          <OtherDraftsPicker
            drafts={otherDrafts}
            maxDrafts={MAX_DRAFTS}
            onContinue={continueOtherDraft}
            onDiscard={discardOtherDraft}
          />
        )}
        {showPasteOption && (
          <EntryModeSwitcher mode={entryMode} onModeChange={setEntryMode} />
        )}

        {entryMode === "paste" ? (
          <PasteRecipeMode
            prompt={pastePrompt}
            promptCopied={promptCopied}
            onCopyPrompt={copyPastePrompt}
            pasteJson={pasteJson}
            onPasteJsonChange={setPasteJson}
            pasteError={pasteError}
            onFill={handleFillFromPaste}
          />
        ) : (
          <>
            <Input
              label="Recipe Name"
              placeholder="My Signature Cocktail"
              value={name}
              onChange={setName}
            />

            <div>
              <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-1.5">
                Description
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What makes this cocktail special?"
                rows={3}
                className="bg-surface border border-bdr rounded-sm py-2.5 px-3.5 text-tx text-sm font-body w-full resize-y"
              />
            </div>

            <GlassPicker
              glasses={glasses}
              value={effectiveGlassName}
              onChange={setGlassName}
            />

            <FamilyPicker
              families={families}
              value={familyId}
              onChange={setFamilyId}
            />

            <div>
              <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-2">
                Liquid Color — Bottom / Base
              </label>
              <ColorSwatchPicker
                value={liquidColor}
                onChange={setLiquidColor}
                colors={catalog.liquidColors}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={hasSecondColor}
                  onChange={(e) => toggleSecondColor(e.target.checked)}
                />
                <span className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
                  Layered / gradient drink
                </span>
              </label>
              {hasSecondColor && (
                <>
                  <p className="text-[11px] text-tx3 mb-2">
                    For a layered drink like a Tequila Sunrise - this second
                    color renders as the TOP layer, above the bottom/base
                    color, instead of one flat fill. Most cocktails don't need
                    this.
                  </p>
                  <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-2">
                    Liquid Color 2 — Top / Upper
                  </label>
                  <ColorSwatchPicker
                    value={liquidColor2}
                    onChange={setLiquidColor2}
                    colors={catalog.liquidColors}
                  />
                  <button
                    type="button"
                    disabled={!liquidColor2}
                    onClick={swapColors}
                    className="mt-2 min-h-11 px-3 rounded-sm border border-bdr bg-transparent text-tx2 text-[13px] font-display font-semibold cursor-pointer disabled:opacity-50"
                  >
                    ⇄ Swap colors
                  </button>
                </>
              )}
            </div>

            {/* Live preview - the editor had no visual feedback at all for
                these two fields before this (2026-09-14 audit finding), so
                a human author had no way to confirm which color would land
                where short of saving and viewing the recipe elsewhere. */}
            <div className="flex items-center gap-2">
              <GlassSvg
                type={previewGlassShape}
                liquidColor={liquidColor}
                liquidColor2={hasSecondColor ? liquidColor2 : null}
                size={48}
                avail="perfect"
              />
              <span className="text-xs text-tx3">Preview</span>
            </div>

            <IngredientRowsEditor
              ings={ings}
              types={types}
              aliases={catalog.aliases}
              ingredientSubstitutions={catalog.ingredientSubstitutions}
              onAdd={addIng}
              onRemove={removeIng}
              onUpdate={updateIng}
              onCommitAlternative={commitAlternativeDraft}
              onRemoveAlternative={removeAlternative}
              onUpdateAlternativeNote={updateAlternativeNote}
              onAdoptSuggestion={adoptSuggestion}
              onToggleExcludedSubstitute={toggleExcludedSubstitute}
              hasUnmatchedIng={hasUnmatchedIng}
              isDraftable={isDraftable}
              returnTo={location.pathname + location.search}
            />

            <StepsEditor
              steps={steps}
              onAdd={addStep}
              onRemove={removeStep}
              onUpdate={updateStep}
            />

            <TasteTagChips
              tasteTags={tasteTags}
              selectedIds={tasteTagIds}
              onToggle={toggleTaste}
            />

            {/* Linked Variations Stage V.2 - metadata/navigation only.
                Never copies, inherits, or modifies this recipe's own
                ingredients/instructions/availability/tags/images -
                changing or removing this field never touches anything
                above; it's its own row in its own table
                (recipe_relationships), written by
                createRecipe()/updateRecipe() as a genuinely atomic step
                (see src/services/recipes.js). */}
            <div>
              {/* Stage V.4 - wording polish from manual testing: the
                  original "Variation of" label alone left the direction
                  ambiguous (which recipe is "the variation" - this one, or
                  the one being picked?). "Based on" makes the direction
                  explicit: picking a recipe here means THIS recipe is a
                  variation OF that one. */}
              <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-1.5">
                Based on / variation of (optional)
              </label>
              <p className="text-[11px] text-tx3 mb-2 leading-snug">
                If this recipe is a variation of another cocktail, select the
                original/base recipe. This is metadata only: ingredients,
                steps, and availability stay completely independent either
                way.
              </p>
              <RecipeComboBox
                valueId={variationOfRecipeId}
                onPick={setVariationOfRecipeId}
                recipes={variationCandidates}
              />
              {variationOfRecipeId && (
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    label="How it differs (optional)"
                    placeholder="e.g. Uses canned tomato juice, no fresh horseradish"
                    value={variationNote}
                    onChange={setVariationNote}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVariationOfRecipeId(null)
                      setVariationNote("")
                    }}
                    className="self-start min-h-11 px-3 text-xs text-tx2 font-display font-semibold bg-transparent border border-bdr rounded-sm cursor-pointer"
                  >
                    Remove - not a variation
                  </button>
                </div>
              )}
            </div>

            {!isEditing && (
              <p className="text-xs text-tx3 leading-normal">
                New recipes start private to you. You can publish to the
                community from the recipe page once it's saved.
              </p>
            )}

            {error && <p className="text-xs text-coral">{error}</p>}

            <div className="flex gap-2">
              <div className="flex-[7]">
                <Btn
                  variant="primary"
                  full
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  {isEditing ? "Save Changes" : "Save Recipe"}
                </Btn>
              </div>
              <div className="flex-[3]">
                <Btn
                  variant="ghost"
                  full
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
