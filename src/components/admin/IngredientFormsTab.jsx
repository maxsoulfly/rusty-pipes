import { useMemo, useState } from "react"
import clsx from "clsx"
import { IconTrash } from "@/components/icons"
import { Btn, Card, Input } from "@/components/primitives"
import {
  createIngredientFormConversion,
  deleteIngredientFormConversion,
  updateIngredientFormConversionGuidance,
} from "@/services/ingredientForms"

// Admin editor for ingredient_form_conversions (Concept 2, Ingredient
// Forms). Each row says "owning <raw> satisfies a recipe that asks for
// <prepared>", with the guidance line shown to members inline on the recipe
// ("Squeeze fresh juice from Lemon"). One-directional - the DB refuses the
// inverse pair, a self-pair, and a duplicate; those errors surface as-is.
// Adding a pair here needs no code change or redeploy: the shared catalog
// refetches and every recipe re-resolves.

// Small searchable single-select over ingredient types (name + alias
// match), same pattern as the Onboarding tab's "Add ingredient" picker.
// Collapses to the chosen name with a "change" affordance once picked.
function TypePicker({ label, valueId, onPick, types, aliasesByTypeId }) {
  const [query, setQuery] = useState("")
  const chosen = valueId ? types.find((t) => t.id === valueId) : null

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = types
      .filter((t) => {
        if (!q) return true
        if (t.name.toLowerCase().includes(q)) return true
        return (aliasesByTypeId.get(t.id) ?? []).some((a) =>
          a.toLowerCase().includes(q),
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return { shown: matches.slice(0, 12), total: matches.length }
  }, [types, aliasesByTypeId, query])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
        {label}
      </div>
      {chosen ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm text-tx font-display font-bold">
            {chosen.name}
          </span>
          <button
            type="button"
            onClick={() => {
              onPick(null)
              setQuery("")
            }}
            className="min-h-11 px-3 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer"
          >
            change
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Search ingredients..."
            value={query}
            onChange={setQuery}
          />
          {results.shown.length === 0 ? (
            <p className="text-[13px] text-tx3">No matching ingredient.</p>
          ) : (
            <Card className="p-0">
              {results.shown.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onPick(t.id)
                    setQuery("")
                  }}
                  className={clsx(
                    "w-full text-left py-2.5 px-3.5 min-h-11 bg-transparent border-none cursor-pointer text-sm text-tx",
                    i < results.shown.length - 1 && "border-b border-bdr",
                  )}
                >
                  {t.name}
                </button>
              ))}
              {results.total > results.shown.length && (
                <p className="py-2 px-3.5 text-[11px] text-tx3 font-mono border-t border-bdr">
                  {results.total - results.shown.length} more — keep typing to
                  narrow.
                </p>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export function IngredientFormsTab({ catalog }) {
  const typeById = useMemo(
    () => new Map(catalog.types.map((t) => [t.id, t])),
    [catalog.types],
  )
  const aliasesByTypeId = useMemo(() => {
    const m = new Map()
    for (const a of catalog.aliases ?? []) {
      if (!m.has(a.ingredient_type_id)) m.set(a.ingredient_type_id, [])
      m.get(a.ingredient_type_id).push(a.alias)
    }
    return m
  }, [catalog.aliases])

  const rows = useMemo(
    () =>
      [...(catalog.formConversions ?? [])].sort((a, b) =>
        (typeById.get(a.raw_type_id)?.name ?? "").localeCompare(
          typeById.get(b.raw_type_id)?.name ?? "",
        ),
      ),
    [catalog.formConversions, typeById],
  )

  const [rawId, setRawId] = useState(null)
  const [preparedId, setPreparedId] = useState(null)
  const [guidance, setGuidance] = useState("")
  const [guidanceTouched, setGuidanceTouched] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editGuidance, setEditGuidance] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Suggest "Squeeze fresh juice from <raw>" until the admin edits the box.
  const suggestedGuidance = rawId
    ? `Squeeze fresh juice from ${typeById.get(rawId)?.name ?? ""}`.trim()
    : ""
  const effectiveGuidance = guidanceTouched ? guidance : suggestedGuidance
  const canAdd =
    Boolean(rawId) &&
    Boolean(preparedId) &&
    rawId !== preparedId &&
    effectiveGuidance.trim().length > 0 &&
    !adding

  const resetAddForm = () => {
    setRawId(null)
    setPreparedId(null)
    setGuidance("")
    setGuidanceTouched(false)
  }

  const handleAdd = async () => {
    setAdding(true)
    setAddError(null)
    try {
      await createIngredientFormConversion({
        rawTypeId: rawId,
        preparedTypeId: preparedId,
        guidance: effectiveGuidance.trim(),
      })
      await catalog.refetch()
      resetAddForm()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditGuidance(row.guidance)
    setEditError(null)
  }
  const handleSaveEdit = async (id) => {
    setSavingEdit(true)
    setEditError(null)
    try {
      await updateIngredientFormConversionGuidance(id, editGuidance.trim())
      await catalog.refetch()
      setEditingId(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteIngredientFormConversion(id)
      await catalog.refetch()
      setConfirmDeleteId(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        Ingredient form conversions. Owning the <b>raw</b> ingredient satisfies
        any recipe that asks for its <b>prepared</b> form — e.g. owning{" "}
        <b>Lemon</b> covers a <b>Lemon Juice</b> requirement, shown on the
        recipe with the guidance line below. This is one-directional: owning the
        prepared form never satisfies a raw requirement, and the database
        refuses the inverse pair.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-tx3">No conversions configured yet.</p>
      ) : (
        rows.map((row) => {
          const raw = typeById.get(row.raw_type_id)
          const prepared = typeById.get(row.prepared_type_id)
          return (
            <Card key={row.id} className="py-3.5 px-4 flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 text-[15px] font-display font-bold text-tx">
                  {raw ? raw.name : "(missing)"}{" "}
                  <span className="text-tx3 font-normal">→</span>{" "}
                  {prepared ? prepared.name : "(missing)"}
                </div>
                {editingId !== row.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="min-h-11 px-3 rounded-sm bg-cyan/10 border border-cyan/25 text-cyan text-xs font-display font-semibold cursor-pointer"
                    >
                      Edit text
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null)
                        setConfirmDeleteId(
                          confirmDeleteId === row.id ? null : row.id,
                        )
                      }}
                      aria-label={`Delete ${raw?.name ?? ""} to ${
                        prepared?.name ?? ""
                      } conversion`}
                      className="w-11 h-11 rounded-sm bg-coral/10 border border-coral/25 text-coral flex items-center justify-center cursor-pointer"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === row.id ? (
                <div className="flex flex-col gap-2">
                  <Input value={editGuidance} onChange={setEditGuidance} />
                  {editError && (
                    <p className="text-xs text-coral" role="alert">
                      {editError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Btn
                      variant="primary"
                      small
                      disabled={savingEdit || !editGuidance.trim()}
                      onClick={() => handleSaveEdit(row.id)}
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </Btn>
                    <Btn
                      variant="ghost"
                      small
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Btn>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-tx2 italic">"{row.guidance}"</p>
              )}

              {confirmDeleteId === row.id && (
                <div className="p-3 bg-coral/8 rounded-sm border border-coral/25">
                  <p className="mb-2.5 text-[13px] text-tx2">
                    {deleteError
                      ? deleteError
                      : `Remove this conversion? Recipes needing ${
                          prepared?.name ?? "the prepared form"
                        } will stop counting ${
                          raw?.name ?? "the raw ingredient"
                        } as a match.`}
                  </p>
                  <div className="flex gap-2">
                    <Btn
                      variant="danger"
                      small
                      disabled={deleting}
                      onClick={() => handleDelete(row.id)}
                    >
                      Remove
                    </Btn>
                    <Btn
                      variant="ghost"
                      small
                      onClick={() => {
                        setConfirmDeleteId(null)
                        setDeleteError(null)
                      }}
                    >
                      Cancel
                    </Btn>
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}

      <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-bdr">
        <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
          Add a conversion
        </div>
        <TypePicker
          label="Raw ingredient (what you own)"
          valueId={rawId}
          onPick={setRawId}
          types={catalog.types}
          aliasesByTypeId={aliasesByTypeId}
        />
        <TypePicker
          label="Prepared ingredient (what the recipe asks for)"
          valueId={preparedId}
          onPick={setPreparedId}
          types={catalog.types}
          aliasesByTypeId={aliasesByTypeId}
        />
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
            Guidance shown on the recipe
          </div>
          <Input
            placeholder="Squeeze fresh juice from Lemon"
            value={effectiveGuidance}
            onChange={(v) => {
              setGuidanceTouched(true)
              setGuidance(v)
            }}
          />
        </div>
        {rawId && preparedId && rawId === preparedId && (
          <p className="text-xs text-coral">
            Raw and prepared must be different ingredients.
          </p>
        )}
        {addError && (
          <p className="text-[13px] text-coral" role="alert">
            {addError}
          </p>
        )}
        <div>
          <Btn variant="primary" small disabled={!canAdd} onClick={handleAdd}>
            {adding ? "Adding..." : "Add conversion"}
          </Btn>
        </div>
      </div>
    </div>
  )
}
