import { useMemo, useRef, useState } from "react"
import { ShapePicker } from "@/components/admin/ShapePicker"
import { TypeComboBox } from "@/components/admin/TypeComboBox"
import { StepsEditor } from "@/components/editor/StepsEditor"
import { IconDots, IconX } from "@/components/icons"
import {
  BottomSheet,
  Btn,
  Card,
  CategoryPicker,
  ColorSwatchPicker,
  Input,
  OwnedToggle,
  Select,
} from "@/components/primitives"
import { NON_VOLUME_UNITS } from "@/data/constants"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import {
  BAR_PRIORITIES,
  validateIngredientImport,
} from "@/schemas/ingredientImport"
import { saveIngredientType } from "@/services/catalog"

// Shared "edit an existing ingredient type" form. Only consumer today is
// Admin -> Ingredient Types (src/components/admin/TypesTab.jsx).
//
// Local-draft model (2026-09-10): every field, plus Aliases and "Can
// provide" conversions, is held in local state and NOTHING is written until
// "Save changes". Cancel discards the draft with zero database writes. Save
// commits the whole draft atomically through save_ingredient_type()
// (20260910170000, one transaction) - a failure anywhere writes nothing and
// leaves the draft intact with an inline error.
//
// Aliases live here (not a global list) per user request - "Sec -> Triple
// Sec" reads more naturally next to Triple Sec's own fields. "Can provide"
// (ingredient_form_conversions, raw side = this type) and "Can be replaced
// by" (ingredient_substitutions, from side = this type - Stage B,
// suggestion-only) live here for the same reason. All three are Edit-only
// and part of the one atomic save.
//
// The one catalog-shape rule (duplicate name / parent hierarchy) still runs
// client-side via validateIngredientImport()'s single-item path before the
// save call.

const LABEL =
  "text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]"
// Quiet-but-tappable: 44px min height, outline only, no fill. Used for every
// secondary action so "Save changes" is the only filled/prominent button.
const QUIET_BTN =
  "min-h-11 px-3 rounded-sm border border-bdr bg-transparent text-tx2 text-[13px] font-display font-semibold cursor-pointer disabled:opacity-50"
const MENU_ITEM =
  "w-full text-left py-2.5 px-3 min-h-11 rounded-sm text-[13px] text-tx bg-surface border border-bdr cursor-pointer"

// Display-only reorder for a preparation input's unit picker (Stage D.4) -
// weight is the common case for a homemade preparation (sugar, salt, ...),
// so "g" moves up next to "ml" instead of sitting last. Reuses
// NON_VOLUME_UNITS as-is (same allowed vocabulary, no duplicate list) -
// that array's own order stays untouched everywhere else, since position 0
// ("part") is a load-bearing fallback default in src/schemas/recipePaste.js,
// not just a display preference.
const PREPARATION_UNIT_OPTIONS = [
  "ml",
  "g",
  "oz",
  ...NON_VOLUME_UNITS.filter((u) => u !== "g"),
]

function normConversions(list) {
  return [...list]
    .map((c) => [c.preparedTypeId, c.guidance])
    .sort((a, b) => a[0].localeCompare(b[0]))
}

function normSubstitutes(list) {
  return [...list]
    .map((s) => [s.toTypeId, s.flavorNote])
    .sort((a, b) => a[0].localeCompare(b[0]))
}

// null (no preparation) normalizes to null; otherwise a deterministic
// snapshot for the dirty-check (input order doesn't matter to the user, so
// it's sorted here the same way conversions/substitutes are above).
//
// Unlike a conversion/substitute row (which only ever enters the draft
// already fully picked - "Add" stays disabled until then), a preparation
// input row is added blank (`ingredientTypeId: null`) and filled in place,
// so this comparator MUST tolerate a null id - `.sort()` only ever invokes
// it once the array has 2+ elements, which is exactly why adding a second
// input row (and only a second one) crashed here: `null.localeCompare(...)`
// throws, but a single-input array is trivially "sorted" without ever
// calling the comparator at all.
// Exported (only this one, not normConversions/normSubstitutes above) so
// the null-safety regression this function exists for - see
// IngredientTypeEditor.test.js - can be tested directly without mounting
// the component (no jsdom in this project's test setup).
export function normPreparation(prep) {
  if (!prep) return null
  return {
    name: prep.name.trim(),
    instructions: prep.instructions.map((s) => s.trim()).filter(Boolean),
    inputs: [...prep.inputs]
      .map((i) => [i.ingredientTypeId, i.amount, i.unitLabel])
      .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? "")),
  }
}

export function IngredientTypeEditor({
  type,
  categories,
  types,
  aliases,
  liquidColors,
  formConversions,
  ingredientSubstitutions,
  ingredientPreparations,
  ingredientPreparationInputs,
  onSaved,
  onCancel,
  style,
}) {
  const [name, setName] = useState(type.name)
  const [categoryId, setCategoryId] = useState(type.category_id)
  const [parentTypeId, setParentTypeId] = useState(type.parent_type_id ?? "")
  const [barPriority, setBarPriority] = useState(type.bar_priority)
  const [assumedAvailable, setAssumedAvailable] = useState(
    type.assumed_available ?? false,
  )
  const [color, setColor] = useState(type.color ?? "")
  const [shape, setShape] = useState(type.shape ?? "spirit_bottle")
  // Not editable in this form - carried through the save unchanged (it comes
  // from batch import).
  const description = type.description ?? ""

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const otherTypes = useMemo(
    () => types.filter((t) => t.id !== type.id),
    [types, type.id],
  )
  const typeNameById = useMemo(
    () => new Map(types.map((t) => [t.id, t.name])),
    [types],
  )
  const aliasesByTypeId = useMemo(() => {
    const m = new Map()
    for (const a of aliases ?? []) {
      if (!m.has(a.ingredient_type_id)) m.set(a.ingredient_type_id, [])
      m.get(a.ingredient_type_id).push(a.alias)
    }
    return m
  }, [aliases])

  // ── Aliases draft ──────────────────────────────────────────────────────
  const initialAliases = useMemo(
    () =>
      aliases
        .filter((a) => a.ingredient_type_id === type.id)
        .map((a) => a.alias),
    [aliases, type.id],
  )
  const [draftAliases, setDraftAliases] = useState(initialAliases)
  const [newAlias, setNewAlias] = useState("")
  const [aliasError, setAliasError] = useState(null)

  const addAliasToDraft = () => {
    const text = newAlias.trim()
    if (!text) return
    if (draftAliases.some((a) => a.toLowerCase() === text.toLowerCase())) {
      setNewAlias("")
      return
    }
    const resolved = resolveIngredientType(text, { types, aliases })
    if (resolved && resolved.id !== type.id) {
      setAliasError(`"${text}" already refers to "${resolved.name}"`)
      return
    }
    setDraftAliases([...draftAliases, text])
    setNewAlias("")
    setAliasError(null)
  }
  const removeAliasFromDraft = (a) =>
    setDraftAliases(draftAliases.filter((x) => x !== a))

  // ── "Can provide" draft (raw side = this type) ─────────────────────────
  const initialConversions = useMemo(
    () =>
      (formConversions ?? [])
        .filter((c) => c.raw_type_id === type.id)
        .map((c) => ({
          preparedTypeId: c.prepared_type_id,
          guidance: c.guidance,
        }))
        .sort((a, b) =>
          (typeNameById.get(a.preparedTypeId) ?? "").localeCompare(
            typeNameById.get(b.preparedTypeId) ?? "",
          ),
        ),
    [formConversions, type.id, typeNameById],
  )
  const [draftConversions, setDraftConversions] = useState(initialConversions)
  const [addingConv, setAddingConv] = useState(false)
  const [newConvPreparedId, setNewConvPreparedId] = useState(null)
  const [newConvGuidance, setNewConvGuidance] = useState("")
  const [editingConvIdx, setEditingConvIdx] = useState(null)
  const [convEditText, setConvEditText] = useState("")
  const [menuForIdx, setMenuForIdx] = useState(null)
  const menuAnchorRef = useRef(null)

  // Pickable "prepared" types: not this type, not already in the draft, and
  // not one that already provides THIS type (the DB trigger rejects that
  // inverse anyway).
  const addablePreparedTypes = useMemo(() => {
    const linked = new Set(draftConversions.map((c) => c.preparedTypeId))
    const providesThis = new Set(
      (formConversions ?? [])
        .filter((c) => c.prepared_type_id === type.id)
        .map((c) => c.raw_type_id),
    )
    return types.filter(
      (t) => t.id !== type.id && !linked.has(t.id) && !providesThis.has(t.id),
    )
  }, [types, draftConversions, formConversions, type.id])

  const openAddConv = () => {
    setAddingConv(true)
    setNewConvPreparedId(null)
    setNewConvGuidance("")
  }
  const commitAddConv = () => {
    if (!newConvPreparedId || !newConvGuidance.trim()) return
    setDraftConversions([
      ...draftConversions,
      { preparedTypeId: newConvPreparedId, guidance: newConvGuidance.trim() },
    ])
    setAddingConv(false)
  }
  const removeConvAt = (idx) =>
    setDraftConversions(draftConversions.filter((_, i) => i !== idx))
  const startConvEdit = (idx) => {
    setEditingConvIdx(idx)
    setConvEditText(draftConversions[idx].guidance)
  }
  const commitConvEdit = () => {
    const text = convEditText.trim()
    if (!text) return
    setDraftConversions(
      draftConversions.map((c, i) =>
        i === editingConvIdx ? { ...c, guidance: text } : c,
      ),
    )
    setEditingConvIdx(null)
  }
  const openMenu = (e, idx) => {
    menuAnchorRef.current = e.currentTarget
    setMenuForSubIdx(null)
    setMenuForIdx(idx)
  }

  // ── "Can be replaced by" draft (from side = this type) - Stage B ──────
  // Directional catalogue suggestion. NOT symmetric, no inverse guard, no
  // chaining - it never affects availability, it only surfaces as a muted
  // hint on a recipe's missing rows.
  const initialSubstitutes = useMemo(
    () =>
      (ingredientSubstitutions ?? [])
        .filter((s) => s.from_type_id === type.id)
        .map((s) => ({ toTypeId: s.to_type_id, flavorNote: s.flavor_note }))
        .sort((a, b) =>
          (typeNameById.get(a.toTypeId) ?? "").localeCompare(
            typeNameById.get(b.toTypeId) ?? "",
          ),
        ),
    [ingredientSubstitutions, type.id, typeNameById],
  )
  const [draftSubstitutes, setDraftSubstitutes] = useState(initialSubstitutes)
  const [addingSub, setAddingSub] = useState(false)
  const [newSubToId, setNewSubToId] = useState(null)
  const [newSubNote, setNewSubNote] = useState("")
  const [editingSubIdx, setEditingSubIdx] = useState(null)
  const [subEditText, setSubEditText] = useState("")
  const [menuForSubIdx, setMenuForSubIdx] = useState(null)

  // Pickable "replacement" types: not this type and not already listed.
  // Deliberately NO inverse filter - "White Rum can be replaced by Spiced
  // Rum" and the reverse are both legitimate, separate rows.
  const addableReplacementTypes = useMemo(() => {
    const listed = new Set(draftSubstitutes.map((s) => s.toTypeId))
    return types.filter((t) => t.id !== type.id && !listed.has(t.id))
  }, [types, draftSubstitutes, type.id])

  const openAddSub = () => {
    setAddingSub(true)
    setNewSubToId(null)
    setNewSubNote("")
  }
  const commitAddSub = () => {
    if (!newSubToId || !newSubNote.trim()) return
    setDraftSubstitutes([
      ...draftSubstitutes,
      { toTypeId: newSubToId, flavorNote: newSubNote.trim() },
    ])
    setAddingSub(false)
  }
  const removeSubAt = (idx) =>
    setDraftSubstitutes(draftSubstitutes.filter((_, i) => i !== idx))
  const startSubEdit = (idx) => {
    setEditingSubIdx(idx)
    setSubEditText(draftSubstitutes[idx].flavorNote)
  }
  const commitSubEdit = () => {
    const text = subEditText.trim()
    if (!text) return
    setDraftSubstitutes(
      draftSubstitutes.map((s, i) =>
        i === editingSubIdx ? { ...s, flavorNote: text } : s,
      ),
    )
    setEditingSubIdx(null)
  }
  const openSubMenu = (e, idx) => {
    menuAnchorRef.current = e.currentTarget
    setMenuForIdx(null)
    setMenuForSubIdx(idx)
  }

  // ── Homemade preparation draft (produced side = this type) - Stage D.3 ─
  // Unlike "Can provide"/"Can be replaced by" above, this type is the
  // PRODUCED side, not the raw/from side - and at most one preparation
  // exists per produced type, so this is a single optional block, not a
  // list. null = no preparation configured.
  const initialPreparation = useMemo(() => {
    const prep = (ingredientPreparations ?? []).find(
      (p) => p.produces_type_id === type.id,
    )
    if (!prep) return null
    return {
      name: prep.name,
      instructions: prep.instructions ?? [],
      // `key` is a stable React identity for this row, independent of its
      // position in the array (a real DB id here) - never sent to the
      // server (saveIngredientType() only reads ingredientTypeId/amount/
      // unitLabel off each input). Using the array index instead would
      // make React reuse a row's component instance/local state for
      // whatever row now sits at that same position after an add/remove.
      inputs: (ingredientPreparationInputs ?? [])
        .filter((i) => i.preparation_id === prep.id)
        .map((i) => ({
          key: i.id,
          ingredientTypeId: i.ingredient_type_id,
          amount: i.amount,
          unitLabel: i.unit_label,
        })),
    }
  }, [ingredientPreparations, ingredientPreparationInputs, type.id])
  const [draftPreparation, setDraftPreparation] = useState(initialPreparation)

  // Types this preparation's inputs may pick from: not this type itself
  // (self-reference), and not any type already produced by SOME
  // preparation (including this type's own, if it has one) - both are
  // exactly what the depth-1 DB trigger would reject, checked here too so
  // the picker doesn't offer a choice the save will just bounce back.
  const producedTypeIds = useMemo(
    () =>
      new Set((ingredientPreparations ?? []).map((p) => p.produces_type_id)),
    [ingredientPreparations],
  )
  const addablePreparationInputTypes = (excludeIdx) => {
    const alreadyUsed = new Set(
      (draftPreparation?.inputs ?? [])
        .filter((_, i) => i !== excludeIdx)
        .map((i) => i.ingredientTypeId),
    )
    return types.filter(
      (t) =>
        t.id !== type.id &&
        !producedTypeIds.has(t.id) &&
        !alreadyUsed.has(t.id),
    )
  }

  const openAddPreparation = () =>
    setDraftPreparation({ name: type.name, instructions: [], inputs: [] })
  const addPreparationInput = () =>
    setDraftPreparation({
      ...draftPreparation,
      inputs: [
        ...draftPreparation.inputs,
        // A fresh client-side key (never a real row yet) - same stability
        // reasoning as the loaded-preparation case above.
        {
          key: crypto.randomUUID(),
          ingredientTypeId: null,
          amount: 0,
          unitLabel: "ml",
        },
      ],
    })
  const updatePreparationInput = (idx, patch) =>
    setDraftPreparation({
      ...draftPreparation,
      inputs: draftPreparation.inputs.map((i, ix) =>
        ix === idx ? { ...i, ...patch } : i,
      ),
    })
  const removePreparationInput = (idx) =>
    setDraftPreparation({
      ...draftPreparation,
      inputs: draftPreparation.inputs.filter((_, ix) => ix !== idx),
    })
  const addPreparationStep = () =>
    setDraftPreparation({
      ...draftPreparation,
      instructions: [...draftPreparation.instructions, ""],
    })
  const removePreparationStep = (idx) =>
    setDraftPreparation({
      ...draftPreparation,
      instructions: draftPreparation.instructions.filter((_, ix) => ix !== idx),
    })
  const updatePreparationStep = (idx, value) =>
    setDraftPreparation({
      ...draftPreparation,
      instructions: draftPreparation.instructions.map((s, ix) =>
        ix === idx ? value : s,
      ),
    })

  // ── Dirty hint ────────────────────────────────────────────────────────
  const initialSnapshot = useRef(null)
  if (initialSnapshot.current === null) {
    initialSnapshot.current = JSON.stringify({
      name: type.name,
      categoryId: type.category_id,
      parentTypeId: type.parent_type_id ?? "",
      barPriority: type.bar_priority,
      assumedAvailable: type.assumed_available ?? false,
      color: type.color ?? "",
      shape: type.shape ?? "spirit_bottle",
      aliases: [...initialAliases].sort(),
      conversions: normConversions(initialConversions),
      substitutes: normSubstitutes(initialSubstitutes),
      preparation: normPreparation(initialPreparation),
    })
  }
  const isDirty =
    initialSnapshot.current !==
    JSON.stringify({
      name,
      categoryId,
      parentTypeId,
      barPriority,
      assumedAvailable,
      color,
      shape,
      aliases: [...draftAliases].sort(),
      conversions: normConversions(draftConversions),
      substitutes: normSubstitutes(draftSubstitutes),
      preparation: normPreparation(draftPreparation),
    })

  // ── Save (the only DB write this editor makes) ────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? ""
    const parentTypeName = parentTypeId
      ? otherTypes.find((t) => t.id === parentTypeId)?.name
      : undefined
    const { results } = validateIngredientImport(
      [
        {
          name: name.trim(),
          category: categoryName,
          parentType: parentTypeName,
          barPriority,
          color: color.trim() || undefined,
          description: description.trim() || undefined,
        },
      ],
      { categories, types: otherTypes, aliases },
    )
    const [result] = results
    if (!result.valid) {
      setError(result.errors.join("; "))
      setSaving(false)
      return
    }
    try {
      await saveIngredientType({
        typeId: type.id,
        name: result.resolved.name,
        categoryId: result.resolved.category_id,
        parentTypeId: result.resolved.parent_type_id,
        barPriority: result.resolved.bar_priority,
        assumedAvailable,
        color: result.resolved.color,
        description: result.resolved.description,
        shape,
        aliases: draftAliases,
        conversions: draftConversions,
        substitutes: draftSubstitutes,
        preparation: draftPreparation,
      })
      await onSaved()
    } catch (err) {
      // Draft is left exactly as it is - only the error line appears.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // A preparation must have a name and at least one fully-picked input -
  // enforced client-side (disables Save with an inline hint) rather than
  // left to surface as a raw Postgres cast error from an incomplete row.
  const preparationInvalid =
    draftPreparation != null &&
    (!draftPreparation.name.trim() ||
      draftPreparation.inputs.length === 0 ||
      draftPreparation.inputs.some((i) => !i.ingredientTypeId))

  const parentOptions = [
    { value: "", label: "No parent type" },
    ...otherTypes
      .filter((t) => t.category_id === categoryId)
      .map((t) => ({ value: t.id, label: t.name })),
  ]

  return (
    <Card className="p-4 flex flex-col gap-3 max-w-2xl w-full" style={style}>
      <Input label="Name" value={name} onChange={setName} />

      <div className="flex flex-col gap-1.5">
        <label className={LABEL}>Category</label>
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v)
            setParentTypeId("")
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Parent type</label>
          <Select
            value={parentTypeId}
            onChange={setParentTypeId}
            options={parentOptions}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Priority</label>
          <Select
            value={barPriority}
            onChange={setBarPriority}
            options={BAR_PRIORITIES.map((p) => ({
              value: p,
              label: p[0].toUpperCase() + p.slice(1),
            }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 py-1">
        <div>
          <div className="text-[13px] font-body font-medium text-tx">
            Household basic
          </div>
          <div className="text-xs text-tx3 leading-snug">
            Assumed in every bar — never shows as missing or in Buy Next.
          </div>
        </div>
        <OwnedToggle owned={assumedAvailable} onChange={setAssumedAvailable} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Color</label>
          <ColorSwatchPicker
            value={color}
            onChange={setColor}
            colors={liquidColors}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Icon</label>
          <ShapePicker kind="ingredient" value={shape} onChange={setShape} />
        </div>
      </div>

      {/* Aliases - local draft, committed on Save changes */}
      <div className="flex flex-col gap-1.5">
        <label className={LABEL}>Aliases</label>
        {draftAliases.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {draftAliases.map((a) => (
              <div
                key={a}
                className="flex items-center justify-between gap-2 rounded-sm border border-bdr bg-surface2 pl-2.5 min-h-11"
              >
                <span className="text-[13px] text-tx break-words min-w-0">
                  {a}
                </span>
                <button
                  type="button"
                  onClick={() => removeAliasFromDraft(a)}
                  className="min-h-11 px-3 text-xs text-coral font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Add alias (e.g. Sec)"
              value={newAlias}
              onChange={setNewAlias}
            />
          </div>
          <button
            type="button"
            disabled={!newAlias.trim()}
            onClick={addAliasToDraft}
            className={QUIET_BTN}
          >
            Add
          </button>
        </div>
        {aliasError && <p className="text-xs text-coral">{aliasError}</p>}
      </div>

      {/* Can provide - local draft, committed on Save changes */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={LABEL}>Can provide</label>
          {!addingConv && (
            <button
              type="button"
              onClick={openAddConv}
              className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
            >
              + Add
            </button>
          )}
        </div>
        <p className="text-xs text-tx3 leading-snug">
          Owning {type.name} can satisfy a recipe that needs the prepared form.
          One-way.
        </p>

        {draftConversions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {draftConversions.map((c, idx) => {
              const preparedName =
                typeNameById.get(c.preparedTypeId) ?? "(unknown)"
              const editing = editingConvIdx === idx
              return (
                <div
                  key={c.preparedTypeId}
                  className="rounded-sm border border-bdr bg-surface2 p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-tx font-display font-semibold break-words">
                      {preparedName}
                    </div>
                    {editing ? (
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        <Input
                          placeholder="e.g. Squeeze fresh juice from Lemon"
                          value={convEditText}
                          onChange={setConvEditText}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!convEditText.trim()}
                            onClick={commitConvEdit}
                            className={QUIET_BTN}
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingConvIdx(null)}
                            className={QUIET_BTN}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-tx2 break-words mt-0.5">
                        {c.guidance || (
                          <span className="italic text-tx3">No guidance</span>
                        )}
                      </div>
                    )}
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, idx)}
                      aria-label={`Actions for ${preparedName}`}
                      className="w-11 h-11 -mr-1 -mt-1 shrink-0 rounded-sm border border-bdr text-tx2 flex items-center justify-center cursor-pointer hover:text-tx active:bg-bg2"
                    >
                      <IconDots size={18} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {addingConv && (
          <div className="rounded-sm border border-cyan/40 bg-surface2 p-2.5 flex flex-col gap-1.5">
            <TypeComboBox
              valueId={newConvPreparedId}
              onPick={setNewConvPreparedId}
              types={addablePreparedTypes}
              aliasesByTypeId={aliasesByTypeId}
              placeholder="Search prepared ingredient..."
            />
            <Input
              placeholder="e.g. Squeeze fresh juice from Lemon"
              value={newConvGuidance}
              onChange={setNewConvGuidance}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!newConvPreparedId || !newConvGuidance.trim()}
                onClick={commitAddConv}
                className={QUIET_BTN}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingConv(false)}
                className={QUIET_BTN}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Can be replaced by (Stage B) - local draft, committed on Save
          changes. Suggestion only: never changes any recipe's availability. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={LABEL}>Can be replaced by</label>
          {!addingSub && (
            <button
              type="button"
              onClick={openAddSub}
              className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
            >
              + Add
            </button>
          )}
        </div>
        <p className="text-xs text-tx3 leading-snug">
          When a recipe needs {type.name}, suggest one of these as a stand-in. A
          hint only — it never changes availability, and it is one-way (not the
          reverse).
        </p>

        {draftSubstitutes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {draftSubstitutes.map((s, idx) => {
              const toName = typeNameById.get(s.toTypeId) ?? "(unknown)"
              const editing = editingSubIdx === idx
              return (
                <div
                  key={s.toTypeId}
                  className="rounded-sm border border-bdr bg-surface2 p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-tx font-display font-semibold break-words">
                      {type.name} <span className="text-tx3">→</span> {toName}
                    </div>
                    {editing ? (
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        <Input
                          placeholder="e.g. drier, less sweet"
                          value={subEditText}
                          onChange={setSubEditText}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!subEditText.trim()}
                            onClick={commitSubEdit}
                            className={QUIET_BTN}
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubIdx(null)}
                            className={QUIET_BTN}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-tx2 break-words mt-0.5">
                        {s.flavorNote}
                      </div>
                    )}
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={(e) => openSubMenu(e, idx)}
                      aria-label={`Actions for ${type.name} replaced by ${toName}`}
                      className="w-11 h-11 -mr-1 -mt-1 shrink-0 rounded-sm border border-bdr text-tx2 flex items-center justify-center cursor-pointer hover:text-tx active:bg-bg2"
                    >
                      <IconDots size={18} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {addingSub && (
          <div className="rounded-sm border border-cyan/40 bg-surface2 p-2.5 flex flex-col gap-1.5">
            <TypeComboBox
              valueId={newSubToId}
              onPick={setNewSubToId}
              types={addableReplacementTypes}
              aliasesByTypeId={aliasesByTypeId}
              placeholder="Search replacement ingredient..."
            />
            <Input
              placeholder="e.g. drier, less sweet"
              value={newSubNote}
              onChange={setNewSubNote}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!newSubToId || !newSubNote.trim()}
                onClick={commitAddSub}
                className={QUIET_BTN}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingSub(false)}
                className={QUIET_BTN}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Homemade preparation (produced side = this type) - Stage D.3.
          Single optional block, not a list - local draft, committed on Save
          changes like everything else in this editor. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className={LABEL}>Homemade preparation</label>
          {!draftPreparation && (
            <button
              type="button"
              onClick={openAddPreparation}
              className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
            >
              + Add
            </button>
          )}
        </div>
        <p className="text-xs text-tx3 leading-snug">
          How a member could make {type.name} at home. A recipe missing{" "}
          {type.name} can adapt around it once every input below is available -
          it is never marked as owned just because it's preparable.
        </p>

        {draftPreparation && (
          <div className="rounded-sm border border-bdr bg-surface2 p-2.5 flex flex-col gap-2.5">
            <Input
              label="Name"
              value={draftPreparation.name}
              onChange={(v) =>
                setDraftPreparation({ ...draftPreparation, name: v })
              }
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className={LABEL}>Inputs</span>
                <button
                  type="button"
                  onClick={addPreparationInput}
                  className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
                >
                  + Add input
                </button>
              </div>
              {draftPreparation.inputs.length === 0 && (
                <p className="text-xs text-tx3">
                  At least one input is required.
                </p>
              )}
              {draftPreparation.inputs.map((input, idx) => (
                <div key={input.key} className="flex gap-1.5 items-center">
                  <div className="flex-1 min-w-0">
                    <TypeComboBox
                      valueId={input.ingredientTypeId}
                      onPick={(id) =>
                        updatePreparationInput(idx, { ingredientTypeId: id })
                      }
                      types={addablePreparationInputTypes(idx)}
                      aliasesByTypeId={aliasesByTypeId}
                      placeholder="Search ingredient..."
                    />
                  </div>
                  <input
                    aria-label={`Amount for input ${idx + 1}`}
                    value={input.amount}
                    onChange={(e) =>
                      updatePreparationInput(idx, {
                        amount: Number(e.target.value) || 0,
                      })
                    }
                    inputMode="decimal"
                    className="w-14 shrink-0 bg-surface border border-bdr rounded-sm p-2 text-tx text-[13px] text-center font-mono"
                  />
                  <div className="w-17 shrink-0">
                    <Select
                      small
                      value={input.unitLabel}
                      onChange={(v) =>
                        updatePreparationInput(idx, { unitLabel: v })
                      }
                      options={PREPARATION_UNIT_OPTIONS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePreparationInput(idx)}
                    aria-label={`Remove input ${idx + 1}`}
                    className="w-11 h-11 shrink-0 rounded-sm border border-bdr text-tx2 flex items-center justify-center cursor-pointer hover:text-tx active:bg-bg2"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>

            <StepsEditor
              steps={draftPreparation.instructions}
              onAdd={addPreparationStep}
              onRemove={removePreparationStep}
              onUpdate={updatePreparationStep}
            />

            <button
              type="button"
              onClick={() => setDraftPreparation(null)}
              className={`${QUIET_BTN} text-coral self-start`}
            >
              Remove preparation
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13px] text-coral" role="alert">
          {error}
        </p>
      )}
      {isDirty && !error && <p className="text-xs text-tx3">Unsaved changes</p>}
      {preparationInvalid && !error && (
        <p className="text-xs text-coral">
          The homemade preparation needs a name and at least one fully selected
          input before this can be saved.
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Btn
          variant="primary"
          disabled={saving || !name.trim() || !categoryId || preparationInvalid}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save changes"}
        </Btn>
        <button type="button" onClick={onCancel} className={QUIET_BTN}>
          Cancel
        </button>
      </div>

      <BottomSheet
        open={menuForIdx !== null}
        onClose={() => setMenuForIdx(null)}
        title="Conversion"
        anchorRef={menuAnchorRef}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              startConvEdit(menuForIdx)
              setMenuForIdx(null)
            }}
            className={MENU_ITEM}
          >
            Edit guidance
          </button>
          <button
            type="button"
            onClick={() => {
              removeConvAt(menuForIdx)
              setMenuForIdx(null)
            }}
            className={`${MENU_ITEM} text-coral`}
          >
            Remove
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={menuForSubIdx !== null}
        onClose={() => setMenuForSubIdx(null)}
        title="Substitute suggestion"
        anchorRef={menuAnchorRef}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              startSubEdit(menuForSubIdx)
              setMenuForSubIdx(null)
            }}
            className={MENU_ITEM}
          >
            Edit note
          </button>
          <button
            type="button"
            onClick={() => {
              removeSubAt(menuForSubIdx)
              setMenuForSubIdx(null)
            }}
            className={`${MENU_ITEM} text-coral`}
          >
            Remove
          </button>
        </div>
      </BottomSheet>
    </Card>
  )
}
