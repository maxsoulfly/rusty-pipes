import { useMemo, useRef, useState } from "react"
import { ShapePicker } from "@/components/admin/ShapePicker"
import { TypeComboBox } from "@/components/admin/TypeComboBox"
import { IconDots } from "@/components/icons"
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

export function IngredientTypeEditor({
  type,
  categories,
  types,
  aliases,
  liquidColors,
  formConversions,
  ingredientSubstitutions,
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
      })
      await onSaved()
    } catch (err) {
      // Draft is left exactly as it is - only the error line appears.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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

      {error && (
        <p className="text-[13px] text-coral" role="alert">
          {error}
        </p>
      )}
      {isDirty && !error && <p className="text-xs text-tx3">Unsaved changes</p>}

      <div className="flex items-center gap-2 pt-1">
        <Btn
          variant="primary"
          disabled={saving || !name.trim() || !categoryId}
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
