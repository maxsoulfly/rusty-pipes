import { useMemo, useRef, useState } from "react"
import { LinkedTypeListEditor } from "@/components/admin/LinkedTypeListEditor"
import { PreparationEditor } from "@/components/admin/PreparationEditor"
import { ShapePicker } from "@/components/admin/ShapePicker"
import { TypeComboBox } from "@/components/admin/TypeComboBox"
import {
  Btn,
  Card,
  CategoryPicker,
  ColorSwatchPicker,
  Input,
  OwnedToggle,
  Select,
} from "@/components/primitives"
import {
  resolveParentTypeCandidates,
  resolveParentTypeIdForCategory,
} from "@/domain/ingredientParentType"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import {
  BAR_PRIORITIES,
  validateIngredientImport,
} from "@/schemas/ingredientImport"
import { saveIngredientType } from "@/services/ingredientTypes"

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
//
// This shell owns every draft's state, the dirty-check snapshot, and
// handleSave - the "Can provide"/"Can be replaced by" lists render through
// the shared LinkedTypeListEditor (src/components/admin/), and the
// homemade-preparation block through PreparationEditor (same dir); both are
// fully controlled (value + onChange), so this file stays the only place
// that ever calls saveIngredientType().

const LABEL =
  "text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]"
// Quiet-but-tappable: 44px min height, outline only, no fill. Used for every
// secondary action so "Save changes" is the only filled/prominent button.
const QUIET_BTN =
  "min-h-11 px-3 rounded-sm border border-bdr bg-transparent text-tx2 text-[13px] font-display font-semibold cursor-pointer disabled:opacity-50"

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

  // Pickable "replacement" types: not this type and not already listed.
  // Deliberately NO inverse filter - "White Rum can be replaced by Spiced
  // Rum" and the reverse are both legitimate, separate rows.
  const addableReplacementTypes = useMemo(() => {
    const listed = new Set(draftSubstitutes.map((s) => s.toTypeId))
    return types.filter((t) => t.id !== type.id && !listed.has(t.id))
  }, [types, draftSubstitutes, type.id])

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

  const parentTypeCandidates = resolveParentTypeCandidates(types, {
    excludeTypeId: type.id,
    categoryId,
  })

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
            setParentTypeId(
              resolveParentTypeIdForCategory(parentTypeId, {
                types,
                categoryId: v,
              }),
            )
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Parent type</label>
          <TypeComboBox
            valueId={parentTypeId || null}
            onPick={(id) => setParentTypeId(id ?? "")}
            types={parentTypeCandidates}
            aliasesByTypeId={aliasesByTypeId}
            placeholder="Search parent type..."
            nullOption={{ label: "No parent type" }}
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

      <LinkedTypeListEditor
        label="Can provide"
        description={`Owning ${type.name} can satisfy a recipe that needs the prepared form. One-way.`}
        items={draftConversions.map((c) => ({
          id: c.preparedTypeId,
          titleNode: typeNameById.get(c.preparedTypeId) ?? "(unknown)",
          ariaName: typeNameById.get(c.preparedTypeId) ?? "(unknown)",
          note: c.guidance,
        }))}
        addableTypes={addablePreparedTypes}
        aliasesByTypeId={aliasesByTypeId}
        onAdd={(targetId, note) =>
          setDraftConversions([
            ...draftConversions,
            { preparedTypeId: targetId, guidance: note },
          ])
        }
        onEditNote={(idx, note) =>
          setDraftConversions(
            draftConversions.map((c, i) =>
              i === idx ? { ...c, guidance: note } : c,
            ),
          )
        }
        onRemove={(idx) =>
          setDraftConversions(draftConversions.filter((_, i) => i !== idx))
        }
        addPlaceholder="Search prepared ingredient..."
        notePlaceholder="e.g. Squeeze fresh juice from Lemon"
        ariaLabelFor={(item) => `Actions for ${item.ariaName}`}
        emptyNoteFallback="No guidance"
        menuTitle="Conversion"
        editMenuLabel="Edit guidance"
      />

      {/* "Can be replaced by" (Stage B) - suggestion only: never changes any
          recipe's availability. */}
      <LinkedTypeListEditor
        label="Can be replaced by"
        description={`When a recipe needs ${type.name}, suggest one of these as a stand-in. A hint only — it never changes availability, and it is one-way (not the reverse).`}
        items={draftSubstitutes.map((s) => {
          const toName = typeNameById.get(s.toTypeId) ?? "(unknown)"
          return {
            id: s.toTypeId,
            titleNode: (
              <>
                {type.name} <span className="text-tx3">→</span> {toName}
              </>
            ),
            ariaName: toName,
            note: s.flavorNote,
          }
        })}
        addableTypes={addableReplacementTypes}
        aliasesByTypeId={aliasesByTypeId}
        onAdd={(targetId, note) =>
          setDraftSubstitutes([
            ...draftSubstitutes,
            { toTypeId: targetId, flavorNote: note },
          ])
        }
        onEditNote={(idx, note) =>
          setDraftSubstitutes(
            draftSubstitutes.map((s, i) =>
              i === idx ? { ...s, flavorNote: note } : s,
            ),
          )
        }
        onRemove={(idx) =>
          setDraftSubstitutes(draftSubstitutes.filter((_, i) => i !== idx))
        }
        addPlaceholder="Search replacement ingredient..."
        notePlaceholder="e.g. drier, less sweet"
        ariaLabelFor={(item) =>
          `Actions for ${type.name} replaced by ${item.ariaName}`
        }
        menuTitle="Substitute suggestion"
        editMenuLabel="Edit note"
      />

      <PreparationEditor
        typeName={type.name}
        preparation={draftPreparation}
        onChange={setDraftPreparation}
        addableInputTypesFor={addablePreparationInputTypes}
        aliasesByTypeId={aliasesByTypeId}
      />

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
    </Card>
  )
}
