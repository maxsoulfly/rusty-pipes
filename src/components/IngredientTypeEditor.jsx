import { useMemo, useState } from "react"
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
import { resolveIngredientType } from "@/domain/ingredientResolution"
import {
  BAR_PRIORITIES,
  validateIngredientImport,
} from "@/schemas/ingredientImport"
import {
  createIngredientAlias,
  deleteIngredientAlias,
  updateIngredientType,
} from "@/services/catalog"
import {
  createIngredientFormConversion,
  deleteIngredientFormConversion,
  updateIngredientFormConversionGuidance,
} from "@/services/ingredientForms"

// Shared "edit an existing ingredient type" form - used by both My Bar's
// inline admin edit pencil and Admin's Ingredient Types tab, so the one real
// business rule here (reusing validateIngredientImport()'s single-item path
// for the duplicate-name/parent-hierarchy check) only lives in one place.
// Aliases live here too (not a separate admin-wide list) per user request -
// managing "Sec -> Triple Sec" reads more naturally next to Triple Sec's own
// name/category/color than in a global table of every alias for every type.
// "Can provide" (ingredient_form_conversions) lives here for the same reason
// (2026-09-10) - it replaced a standalone admin tab. Each row is a
// directional raw -> prepared conversion whose raw side is this type, with
// the guidance line members see on the recipe. Adds/edits/removals write
// immediately (like aliases), independent of the type's own Save button.
// Both aliases and Can-provide are Edit-only: the row must already exist to
// attach to.
export function IngredientTypeEditor({
  type,
  categories,
  types,
  aliases,
  liquidColors,
  formConversions,
  onSaved,
  onAliasesChanged,
  onConversionsChanged,
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
  const [description] = useState(type.description ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const typeAliases = aliases.filter((a) => a.ingredient_type_id === type.id)
  const [newAlias, setNewAlias] = useState("")
  const [aliasSaving, setAliasSaving] = useState(false)
  const [aliasError, setAliasError] = useState(null)
  const [deletingAliasId, setDeletingAliasId] = useState(null)

  const otherTypes = types.filter((t) => t.id !== type.id)

  // ── "Can provide" (ingredient_form_conversions, raw side = this type) ──
  const conversions = formConversions ?? []
  const refreshConversions = onConversionsChanged ?? (() => {})
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
  const myConversions = useMemo(
    () =>
      conversions
        .filter((c) => c.raw_type_id === type.id)
        .sort((a, b) =>
          (typeNameById.get(a.prepared_type_id) ?? "").localeCompare(
            typeNameById.get(b.prepared_type_id) ?? "",
          ),
        ),
    [conversions, type.id, typeNameById],
  )
  // Pickable "prepared" types: not this type, not already linked from it, and
  // not one that already provides THIS type (the DB trigger would reject that
  // inverse anyway - filtering it out avoids a confusing error).
  const addablePreparedTypes = useMemo(() => {
    const linked = new Set(myConversions.map((c) => c.prepared_type_id))
    const providesThis = new Set(
      conversions
        .filter((c) => c.prepared_type_id === type.id)
        .map((c) => c.raw_type_id),
    )
    return types.filter(
      (t) => t.id !== type.id && !linked.has(t.id) && !providesThis.has(t.id),
    )
  }, [types, myConversions, conversions, type.id])

  const [addingConv, setAddingConv] = useState(false)
  const [newConvPreparedId, setNewConvPreparedId] = useState(null)
  const [newConvGuidance, setNewConvGuidance] = useState("")
  const [editingConvId, setEditingConvId] = useState(null)
  const [convEditText, setConvEditText] = useState("")
  const [convSaving, setConvSaving] = useState(false)
  const [convError, setConvError] = useState(null)
  const [removingConvId, setRemovingConvId] = useState(null)

  const openAddConv = () => {
    setAddingConv(true)
    setNewConvPreparedId(null)
    setNewConvGuidance("")
    setConvError(null)
  }
  const closeAddConv = () => {
    setAddingConv(false)
    setConvError(null)
  }
  const handleAddConv = async () => {
    setConvSaving(true)
    setConvError(null)
    try {
      await createIngredientFormConversion({
        rawTypeId: type.id,
        preparedTypeId: newConvPreparedId,
        guidance: newConvGuidance.trim(),
      })
      await refreshConversions()
      setAddingConv(false)
      setNewConvPreparedId(null)
      setNewConvGuidance("")
    } catch (err) {
      // Keep the picked type + typed guidance so the admin can retry.
      setConvError(err.message)
    } finally {
      setConvSaving(false)
    }
  }
  const startConvEdit = (c) => {
    setEditingConvId(c.id)
    setConvEditText(c.guidance)
    setConvError(null)
  }
  const cancelConvEdit = () => {
    setEditingConvId(null)
    setConvError(null)
  }
  const handleSaveConvEdit = async (id) => {
    setConvSaving(true)
    setConvError(null)
    try {
      await updateIngredientFormConversionGuidance(id, convEditText.trim())
      await refreshConversions()
      setEditingConvId(null)
    } catch (err) {
      // Stay in edit mode with the text intact.
      setConvError(err.message)
    } finally {
      setConvSaving(false)
    }
  }
  const handleRemoveConv = async (id) => {
    setRemovingConvId(id)
    setConvError(null)
    try {
      await deleteIngredientFormConversion(id)
      await refreshConversions()
    } catch (err) {
      setConvError(err.message)
    } finally {
      setRemovingConvId(null)
    }
  }

  const handleAddAlias = async () => {
    const aliasText = newAlias.trim()
    if (!aliasText) return
    setAliasSaving(true)
    setAliasError(null)
    const collision = resolveIngredientType(aliasText, { types, aliases })
    if (collision) {
      setAliasError(
        collision.id === type.id
          ? `"${aliasText}" already refers to this type`
          : `"${aliasText}" already refers to "${collision.name}"`,
      )
      setAliasSaving(false)
      return
    }
    try {
      await createIngredientAlias({
        alias: aliasText,
        ingredientTypeId: type.id,
      })
      setNewAlias("")
      await onAliasesChanged()
    } catch (err) {
      setAliasError(err.message)
    } finally {
      setAliasSaving(false)
    }
  }

  const handleDeleteAlias = async (id) => {
    setDeletingAliasId(id)
    setAliasError(null)
    try {
      await deleteIngredientAlias(id)
      await onAliasesChanged()
    } catch (err) {
      setAliasError(err.message)
    } finally {
      setDeletingAliasId(null)
    }
  }

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
      const updated = await updateIngredientType(type.id, {
        name: result.resolved.name,
        categoryId: result.resolved.category_id,
        parentTypeId: result.resolved.parent_type_id,
        barPriority: result.resolved.bar_priority,
        color: result.resolved.color,
        description: result.resolved.description,
        shape,
        assumedAvailable,
      })
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-3.5 flex flex-col gap-2" style={style}>
      <Input label="Name" value={name} onChange={setName} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          Category
        </label>
        {/* A bare trigger showing just the current category's name (e.g.
            "Beer") is genuinely ambiguous without this label - confusingly
            so whenever an ingredient type's own name happens to match its
            category's name, as with the "Beer" type under the "Beer"
            category. */}
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v)
            setParentTypeId("")
          }}
        />
      </div>
      <Select
        value={parentTypeId}
        onChange={setParentTypeId}
        options={[
          { value: "", label: "No parent type" },
          ...otherTypes
            .filter((t) => t.category_id === categoryId)
            .map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
      <Select
        value={barPriority}
        onChange={setBarPriority}
        options={BAR_PRIORITIES.map((p) => ({
          value: p,
          label: p[0].toUpperCase() + p.slice(1),
        }))}
      />
      {/* Household basic - a catalogue-wide "assume everyone has this" flag
          (Ice, Salt, plain Sugar, Water). Sits next to bar_priority because
          both are catalogue-level availability tuning, distinct from the
          display fields (color/icon) below. Inert until the availability
          engine starts reading it. */}
      <div className="flex items-center justify-between gap-3 py-1">
        <div>
          <div className="text-[13px] font-body font-medium text-tx">
            Household basic
          </div>
          <div className="text-xs text-tx3 leading-snug">
            Assume every member has this. It never shows as missing in a recipe
            and never drives a Buy Next suggestion.
          </div>
        </div>
        <OwnedToggle owned={assumedAvailable} onChange={setAssumedAvailable} />
      </div>
      {/* Color and Icon grouped together, right next to each other - both
          are "how this type displays," as distinct from the
          category/hierarchy/priority fields above. */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          Color
        </label>
        <ColorSwatchPicker
          value={color}
          onChange={setColor}
          colors={liquidColors}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          Icon
        </label>
        <ShapePicker kind="ingredient" value={shape} onChange={setShape} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          Aliases
        </label>
        {typeAliases.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {typeAliases.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 py-1 px-2 bg-surface border border-bdr rounded-sm text-[13px] text-tx"
              >
                {a.alias}
                <button
                  onClick={() => handleDeleteAlias(a.id)}
                  disabled={deletingAliasId === a.id}
                  title={`Remove alias "${a.alias}"`}
                  className="bg-transparent border-none cursor-pointer p-0 text-tx3 text-sm leading-none"
                >
                  ×
                </button>
              </span>
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
          <Btn
            small
            disabled={aliasSaving || !newAlias.trim()}
            onClick={handleAddAlias}
          >
            {aliasSaving ? "Adding..." : "+ Add"}
          </Btn>
        </div>
        {aliasError && <p className="text-xs text-coral">{aliasError}</p>}
      </div>

      {/* "Can provide" - directional raw -> prepared conversions whose raw
          side is this ingredient. Writes immediately, like Aliases above,
          independent of the type's own Save button. */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          Can provide
        </label>
        <p className="text-xs text-tx3 leading-snug">
          Owning {type.name} counts toward a recipe that needs one of these
          prepared forms, shown with your guidance text. One-way — the prepared
          form never counts as {type.name}.
        </p>

        {myConversions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {myConversions.map((c) => {
              const preparedName =
                typeNameById.get(c.prepared_type_id) ?? "(unknown)"
              const isEditingRow = editingConvId === c.id
              return (
                <div
                  key={c.id}
                  className="rounded-sm border border-bdr bg-surface p-2 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] text-tx font-display font-semibold min-w-0 break-words">
                      → {preparedName}
                    </span>
                    {!isEditingRow && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startConvEdit(c)}
                          aria-label={`Edit guidance for ${type.name} provides ${preparedName}`}
                          className="min-h-11 px-2 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveConv(c.id)}
                          disabled={removingConvId === c.id}
                          aria-label={`Remove: ${type.name} provides ${preparedName}`}
                          className="min-h-11 px-2 text-xs text-coral font-display font-semibold bg-transparent border-none cursor-pointer disabled:opacity-50"
                        >
                          {removingConvId === c.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditingRow ? (
                    <div className="flex flex-col gap-1.5">
                      <Input
                        placeholder="e.g. Squeeze fresh juice from Lemon"
                        value={convEditText}
                        onChange={setConvEditText}
                      />
                      {convError && (
                        <p className="text-xs text-coral">{convError}</p>
                      )}
                      <div className="flex gap-2">
                        <Btn
                          variant="primary"
                          small
                          disabled={convSaving || !convEditText.trim()}
                          onClick={() => handleSaveConvEdit(c.id)}
                        >
                          {convSaving ? "Saving..." : "Save"}
                        </Btn>
                        <Btn variant="ghost" small onClick={cancelConvEdit}>
                          Cancel
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-tx2 italic break-words">
                      &quot;{c.guidance}&quot;
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {convError && !addingConv && editingConvId === null && (
          <p className="text-xs text-coral">{convError}</p>
        )}

        {addingConv ? (
          <div className="rounded-sm border border-cyan/40 bg-surface p-2 flex flex-col gap-1.5">
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
            {convError && <p className="text-xs text-coral">{convError}</p>}
            <div className="flex gap-2">
              <Btn
                variant="primary"
                small
                disabled={
                  convSaving || !newConvPreparedId || !newConvGuidance.trim()
                }
                onClick={handleAddConv}
              >
                {convSaving ? "Adding..." : "Add"}
              </Btn>
              <Btn variant="ghost" small onClick={closeAddConv}>
                Cancel
              </Btn>
            </div>
          </div>
        ) : (
          <Btn variant="ghost" small onClick={openAddConv}>
            + Add
          </Btn>
        )}
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
      <div className="flex gap-2">
        <Btn
          variant="primary"
          small
          disabled={saving || !name.trim() || !categoryId}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save"}
        </Btn>
        <Btn variant="ghost" small onClick={onCancel}>
          Cancel
        </Btn>
      </div>
    </Card>
  )
}
