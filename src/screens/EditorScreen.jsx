import { useEffect, useRef, useState } from "react"
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom"
import { TopBar } from "@/components/Nav"
import { DraftRestoreBanner } from "@/components/editor/DraftRestoreBanner"
import { EntryModeSwitcher } from "@/components/editor/EntryModeSwitcher"
import { FamilyPicker } from "@/components/editor/FamilyPicker"
import { GlassPicker } from "@/components/editor/GlassPicker"
import { IngredientRowsEditor } from "@/components/editor/IngredientRowsEditor"
import { OtherDraftsPicker } from "@/components/editor/OtherDraftsPicker"
import { PasteRecipeMode } from "@/components/editor/PasteRecipeMode"
import { StepsEditor } from "@/components/editor/StepsEditor"
import { TasteTagChips } from "@/components/editor/TasteTagChips"
import { Btn, ColorSwatchPicker, Input } from "@/components/primitives"
import { NON_VOLUME_UNITS } from "@/data/constants"
import { ozToMl } from "@/domain/availability"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import { parseUnitLabel } from "@/domain/servings"
import { buildRecipeImportPrompt } from "@/schemas/recipeImport"
import { parseRecipePaste } from "@/schemas/recipePaste"
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

// New-recipe drafts (see the isDraftable block in the component below) used
// a single localStorage slot per user - starting a second in-progress
// recipe silently overwrote the first one, which read as "my draft got
// deleted" the moment someone had two blocked recipes going at once. Each
// draft now gets its own id (reflected in the URL as ?draft=<id> so a
// refresh/return-from-ingredient-request keeps pointing at the same one),
// with a small index tracking id/name/updatedAt for all of them. Capped at
// MAX_DRAFTS, oldest evicted first, so this can't grow without bound.
const MAX_DRAFTS = 5
const draftIndexKeyFor = (userId) => `recipe-drafts:${userId}`
const draftContentKeyFor = (userId, draftId) =>
  `recipe-draft:${userId}:${draftId}`
function readDraftIndex(userId) {
  if (!userId) return []
  try {
    return JSON.parse(localStorage.getItem(draftIndexKeyFor(userId))) ?? []
  } catch {
    return []
  }
}
function upsertDraftIndexEntry(userId, entry) {
  const list = readDraftIndex(userId).filter((d) => d.id !== entry.id)
  list.unshift(entry)
  while (list.length > MAX_DRAFTS) {
    const evicted = list.pop()
    localStorage.removeItem(draftContentKeyFor(userId, evicted.id))
  }
  localStorage.setItem(draftIndexKeyFor(userId), JSON.stringify(list))
}
function removeDraftIndexEntry(userId, draftId) {
  const list = readDraftIndex(userId).filter((d) => d.id !== draftId)
  localStorage.setItem(draftIndexKeyFor(userId), JSON.stringify(list))
  localStorage.removeItem(draftContentKeyFor(userId, draftId))
}
// Shared by the autosave effect (decides whether the live form has enough
// to save) and the mount-check effect (decides whether a saved draft has
// enough to offer restoring) - a real bug had these disagree: saving
// allowed a blank name as long as an ingredient or step was filled in
// (upsertDraftIndexEntry falls back to "Untitled draft" for display), but
// restoring only ever checked the name, so a nameless-but-real draft saved
// correctly and even showed up in the "other drafts" picker, but its own
// restore banner could never trigger.
function hasDraftContent(draft) {
  return Boolean(
    draft?.name?.trim() ||
      draft?.ings?.some((i) => i.ingredientName?.trim()) ||
      draft?.steps?.some((s) => s?.trim()),
  )
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
  const { catalog, computed, userId, isAdmin, refetchRecipes } =
    useOutletContext()
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
  const [ings, setIngs] = useState([
    { ingredientName: "", amount: "", unit: "ml", role: "required" },
  ])
  const [steps, setSteps] = useState([""])
  const [tasteTagIds, setTasteTagIds] = useState([])
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
  const draftId = isDraftable ? searchParams.get("draft") : null
  const draftKey =
    isDraftable && userId && draftId
      ? draftContentKeyFor(userId, draftId)
      : null
  const [draftBanner, setDraftBanner] = useState(null)
  // Shown instead of draftBanner when landing on a genuinely blank New
  // Recipe (no ?draft= yet) and other drafts already exist on this browser -
  // picking one navigates to the same page with ?draft=<id>, which then
  // shows draftBanner for that specific one on the next check below.
  const [otherDrafts, setOtherDrafts] = useState([])

  // Set by the autosave effect below when IT assigns a brand-new draft id
  // (first keystroke on a genuinely blank New Recipe) - read here so this
  // effect never mistakes "a draft id I just created for myself" for
  // "returning to an existing draft" and pops a restore banner for content
  // the user is actively typing right now. That's a real bug this exact
  // shape used to have: assigning a fresh id changes draftId, which is
  // this effect's own dependency, so it re-ran on the very next render -
  // showed the banner mid-keystroke, and then permanently froze the
  // autosave effect below (its own draftBanner guard) for the rest of that
  // session, since nothing ever set draftBanner back to null except a
  // Restore/Discard click the user never needed to make and might not have
  // understood the point of.
  const selfAssignedDraftIdRef = useRef(null)

  useEffect(() => {
    if (!isDraftable || !userId) return
    if (!draftId) {
      setOtherDrafts(readDraftIndex(userId))
      return
    }
    if (draftId === selfAssignedDraftIdRef.current) return
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const draft = JSON.parse(raw)
      if (hasDraftContent(draft)) setDraftBanner(draft)
    } catch {
      // Corrupted entry - leave it alone rather than deleting it here.
      // There's nothing to restore either way; if the user keeps typing,
      // autosave below overwrites it with valid content anyway.
    }
    // Only ever check once, right after mount - restoring/discarding is a
    // one-time user decision, not something to re-run as the form changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftable, userId, draftId])

  // Deliberately never deletes a draft just because the form looks empty
  // right now - that heuristic used to run against transient render state
  // (e.g. a just-mounted, not-yet-restored form) and could delete a draft
  // out from under its own restore banner. Deletion only ever happens from
  // an explicit user action (discardDraft/discardOtherDraft below, or a
  // successful save) - a stray empty entry is low-cost and self-heals the
  // moment the user types something, or ages out via MAX_DRAFTS eviction.
  useEffect(() => {
    if (!isDraftable || !userId || draftBanner) return
    if (!hasDraftContent({ name, ings, steps })) return
    const id =
      draftId ??
      (() => {
        const newId = crypto.randomUUID()
        selfAssignedDraftIdRef.current = newId
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set("draft", newId)
            return next
          },
          { replace: true },
        )
        return newId
      })()
    localStorage.setItem(
      draftContentKeyFor(userId, id),
      JSON.stringify({
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
    )
    upsertDraftIndexEntry(userId, {
      id,
      name: name.trim() || "Untitled draft",
      updatedAt: Date.now(),
    })
  }, [
    isDraftable,
    userId,
    draftBanner,
    draftId,
    name,
    desc,
    glassName,
    familyId,
    liquidColor,
    liquidColor2,
    ings,
    steps,
    tasteTagIds,
    setSearchParams,
  ])

  const restoreDraft = () => {
    setName(draftBanner.name ?? "")
    setDesc(draftBanner.desc ?? "")
    setGlassName(draftBanner.glassName ?? "")
    setFamilyId(draftBanner.familyId ?? "")
    if (draftBanner.liquidColor) setLiquidColor(draftBanner.liquidColor)
    setHasSecondColor(Boolean(draftBanner.liquidColor2))
    setLiquidColor2(draftBanner.liquidColor2 ?? "")
    setIngs(
      (
        draftBanner.ings ?? [
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
    setSteps(draftBanner.steps ?? [""])
    setTasteTagIds(draftBanner.tasteTagIds ?? [])
    setDraftBanner(null)
  }
  const discardDraft = () => {
    if (userId && draftId) removeDraftIndexEntry(userId, draftId)
    setDraftBanner(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("draft")
        return next
      },
      { replace: true },
    )
  }
  const continueOtherDraft = (id) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("draft", id)
        return next
      },
      { replace: true },
    )
  const discardOtherDraft = (id) => {
    if (userId) removeDraftIndexEntry(userId, id)
    setOtherDrafts((prev) => prev.filter((d) => d.id !== id))
  }

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
      })),
    )
    setSteps(source.steps.length > 0 ? source.steps : [""])
    setTasteTagIds(
      source.taste
        .map((name) => tasteTags.find((t) => t.name === name)?.id)
        .filter(Boolean),
    )
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
  const [entryMode, setEntryMode] = useState("scratch")
  const [pasteJson, setPasteJson] = useState("")
  const [pasteError, setPasteError] = useState(null)
  const [promptCopied, setPromptCopied] = useState(false)

  const pastePrompt = buildRecipeImportPrompt({
    types,
    glasses,
    families,
    tasteTags,
    aliases: catalog.aliases,
  })

  const copyPastePrompt = () => {
    navigator.clipboard.writeText(pastePrompt).catch(() => {})
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleFillFromPaste = () => {
    setPasteError(null)
    let parsed
    try {
      parsed = JSON.parse(pasteJson)
    } catch (err) {
      setPasteError(`Couldn't parse that as JSON: ${err.message}`)
      return
    }
    const result = parseRecipePaste(parsed, {
      types,
      glasses,
      families,
      tasteTags,
      aliases: catalog.aliases,
      glassAliases: catalog.glassAliases,
    })
    if (!result) {
      setPasteError(
        "That doesn't look like a recipe - expected an object with a name, glass, steps, and components.",
      )
      return
    }
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
    setEntryMode("scratch")
  }

  const effectiveGlassName = glassName || glasses[0]?.name || ""

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
      }
      const recipe = isEditing
        ? await updateRecipe(id, payload)
        : await createRecipe(payload)
      if (userId && draftId) removeDraftIndexEntry(userId, draftId)
      await refetchRecipes() // so the change is in `computed` before DetailScreen looks for it
      navigate(`/library/${recipe.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
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
      <TopBar
        title={
          isEditing
            ? "Edit Recipe"
            : cloneSourceId
              ? "Clone Recipe"
              : "New Recipe"
        }
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
                Liquid Color
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
                    For a Tequila Sunrise, a layered shot, or similar - the
                    glass renders a top-to-bottom blend between the two colors
                    instead of one flat fill. Most cocktails don't need this.
                  </p>
                  <ColorSwatchPicker
                    value={liquidColor2}
                    onChange={setLiquidColor2}
                    colors={catalog.liquidColors}
                  />
                </>
              )}
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

            {!isEditing && (
              <p className="text-xs text-tx3 leading-normal">
                New recipes start private to you. You can publish to the
                community from the recipe page once it's saved.
              </p>
            )}

            {error && <p className="text-xs text-coral">{error}</p>}

            <Btn
              variant="primary"
              full
              onClick={handleSave}
              disabled={!canSave}
            >
              {isEditing ? "Save Changes" : "Save Recipe"}
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}
