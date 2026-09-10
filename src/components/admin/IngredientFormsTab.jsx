import { useMemo, useState } from "react"
import clsx from "clsx"
import {
  IconChevD,
  IconEdit,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/icons"
import { Btn, Card, ConfirmPanel, Input } from "@/components/primitives"
import {
  createIngredientFormConversion,
  deleteIngredientFormConversion,
  updateIngredientFormConversionGuidance,
} from "@/services/ingredientForms"

// Admin editor for ingredient_form_conversions (Concept 2, Ingredient
// Forms). Each row: "owning <raw> satisfies a recipe that asks for
// <prepared>", plus the guidance line members see inline on the recipe
// ("Squeeze fresh juice from Lemon"). One-directional - the DB refuses the
// inverse pair, a self-pair, and a duplicate; those errors surface as-is.
// Adding a pair needs no code change: the shared catalog refetches and every
// recipe re-resolves.
//
// Layout: a compact list of existing conversions (pair, guidance beneath,
// edit/delete alongside), then a "+ Add conversion" button that reveals the
// form only when needed. The two ingredient pickers stay collapsed to a
// single-line trigger until tapped, then expand to a search box + a bounded
// scrollable result list, and collapse again on selection - kept inline (not
// a portal/overlay) so the results and the Save/Cancel buttons stay
// reachable with a mobile keyboard open. Capped max-width so the form
// doesn't stretch across a desktop screen; the two pickers sit side by side
// from `sm:` up.

// Collapsed, searchable single-select over ingredient types (name + alias
// match). Trigger shows the current selection (or a placeholder); tapping it
// opens an inline search + result list; picking a row collapses it again.
function TypeComboBox({
  label,
  hint,
  valueId,
  onPick,
  types,
  aliasesByTypeId,
}) {
  const [open, setOpen] = useState(false)
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
    return { shown: matches.slice(0, 8), total: matches.length }
  }, [types, aliasesByTypeId, query])

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
        {label}
        {hint && <span className="normal-case font-normal"> — {hint}</span>}
      </div>

      {open ? (
        <div className="flex flex-col gap-1.5 rounded-sm border border-cyan/40 bg-surface p-2">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Search ingredients..."
                value={query}
                onChange={setQuery}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setQuery("")
              }}
              aria-label="Close ingredient search"
              className="w-11 h-11 shrink-0 rounded-sm border border-bdr bg-surface text-tx2 flex items-center justify-center cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.shown.length === 0 ? (
              <p className="text-[13px] text-tx3 px-1 py-2">
                No matching ingredient.
              </p>
            ) : (
              results.shown.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onPick(t.id)
                    setOpen(false)
                    setQuery("")
                  }}
                  className={clsx(
                    "w-full text-left py-2.5 px-2 min-h-11 rounded-sm bg-transparent border-none cursor-pointer text-sm",
                    t.id === valueId ? "text-cyan bg-cyan/10" : "text-tx",
                  )}
                >
                  {t.name}
                </button>
              ))
            )}
            {results.total > results.shown.length && (
              <p className="text-[11px] text-tx3 font-mono px-2 py-1.5">
                {results.total - results.shown.length} more — keep typing to
                narrow.
              </p>
            )}
          </div>
          {chosen && (
            <p className="text-[11px] text-tx3 px-1">
              Currently <span className="text-tx2">{chosen.name}</span>
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
          className="min-h-11 flex items-center justify-between gap-2 py-2 px-3 rounded-sm border border-bdr bg-surface cursor-pointer text-left"
        >
          <span
            className={clsx(
              "text-sm truncate",
              chosen ? "text-tx font-display font-semibold" : "text-tx3",
            )}
          >
            {chosen ? chosen.name : "Choose an ingredient"}
          </span>
          <IconChevD size={14} className="text-tx3 shrink-0" />
        </button>
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

  const [showAddForm, setShowAddForm] = useState(false)
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
  const sameType = Boolean(rawId) && rawId === preparedId
  const canAdd =
    Boolean(rawId) &&
    Boolean(preparedId) &&
    !sameType &&
    effectiveGuidance.trim().length > 0 &&
    !adding

  const openAddForm = () => {
    setRawId(null)
    setPreparedId(null)
    setGuidance("")
    setGuidanceTouched(false)
    setAddError(null)
    setShowAddForm(true)
  }
  const closeAddForm = () => {
    setShowAddForm(false)
    setAddError(null)
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
      closeAddForm()
    } catch (err) {
      // Draft (both picks + the guidance text) is left exactly as it was -
      // only the error line appears, beside the form.
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditGuidance(row.guidance)
    setEditError(null)
    setConfirmDeleteId(null)
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
    <div className="fade-in flex flex-col gap-4 max-w-2xl">
      <p className="text-[13px] text-tx2">
        Whole ingredients can satisfy their prepared forms. Conversions work one
        way.
      </p>

      {rows.length === 0 && !showAddForm ? (
        <p className="text-sm text-tx3">No conversions configured yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const raw = typeById.get(row.raw_type_id)
            const prepared = typeById.get(row.prepared_type_id)
            const pairLabel = `${raw ? raw.name : "(missing)"} → ${
              prepared ? prepared.name : "(missing)"
            }`
            return (
              <Card key={row.id} className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-display font-bold text-tx">
                      {raw ? raw.name : "(missing)"}{" "}
                      <span className="text-tx3 font-normal">→</span>{" "}
                      {prepared ? prepared.name : "(missing)"}
                    </div>
                    {editingId !== row.id && (
                      <p className="text-[13px] text-tx2 mt-0.5 break-words">
                        {row.guidance}
                      </p>
                    )}
                  </div>
                  {editingId !== row.id && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        aria-label={`Edit guidance for ${pairLabel}`}
                        className="w-11 h-11 rounded-sm bg-cyan/10 border border-cyan/25 text-cyan flex items-center justify-center cursor-pointer"
                      >
                        <IconEdit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setConfirmDeleteId(
                            confirmDeleteId === row.id ? null : row.id,
                          )
                        }}
                        aria-label={`Delete ${pairLabel} conversion`}
                        className="w-11 h-11 rounded-sm bg-coral/10 border border-coral/25 text-coral flex items-center justify-center cursor-pointer"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === row.id && (
                  <div className="flex flex-col gap-2">
                    <Input
                      label="Guidance shown on the recipe"
                      value={editGuidance}
                      onChange={setEditGuidance}
                    />
                    {editError && (
                      <p className="text-xs text-coral" role="alert">
                        {editError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Btn
                        variant="primary"
                        disabled={savingEdit || !editGuidance.trim()}
                        onClick={() => handleSaveEdit(row.id)}
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </Btn>
                      <Btn
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null)
                          setEditError(null)
                        }}
                      >
                        Cancel
                      </Btn>
                    </div>
                  </div>
                )}

                {confirmDeleteId === row.id && (
                  <ConfirmPanel
                    layout="stack"
                    message={
                      deleteError ??
                      `Remove ${pairLabel}? Recipes needing ${
                        prepared?.name ?? "the prepared form"
                      } will stop counting ${
                        raw?.name ?? "the raw ingredient"
                      } as a match.`
                    }
                    confirmLabel="Remove"
                    busy={deleting}
                    onConfirm={() => handleDelete(row.id)}
                    onCancel={() => {
                      setConfirmDeleteId(null)
                      setDeleteError(null)
                    }}
                  />
                )}
              </Card>
            )
          })}
        </div>
      )}

      {showAddForm ? (
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-tx3 uppercase tracking-[0.06em] font-display">
              New conversion
            </span>
            <button
              type="button"
              onClick={closeAddForm}
              aria-label="Cancel new conversion"
              className="w-11 h-11 -mr-1 rounded-sm bg-transparent border-none text-tx3 flex items-center justify-center cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TypeComboBox
              label="Raw ingredient"
              hint="what you own"
              valueId={rawId}
              onPick={setRawId}
              types={catalog.types}
              aliasesByTypeId={aliasesByTypeId}
            />
            <TypeComboBox
              label="Prepared ingredient"
              hint="what the recipe asks for"
              valueId={preparedId}
              onPick={setPreparedId}
              types={catalog.types}
              aliasesByTypeId={aliasesByTypeId}
            />
          </div>

          <Input
            label="Guidance shown on the recipe"
            placeholder="Squeeze fresh juice from Lemon"
            value={effectiveGuidance}
            onChange={(v) => {
              setGuidanceTouched(true)
              setGuidance(v)
            }}
          />

          {sameType && (
            <p className="text-xs text-coral">
              Raw and prepared must be different ingredients.
            </p>
          )}
          {addError && (
            <p className="text-[13px] text-coral" role="alert">
              {addError}
            </p>
          )}

          <div className="flex gap-2">
            <Btn variant="primary" disabled={!canAdd} onClick={handleAdd}>
              {adding ? "Adding..." : "Add conversion"}
            </Btn>
            <Btn variant="ghost" onClick={closeAddForm}>
              Cancel
            </Btn>
          </div>
        </Card>
      ) : (
        <div>
          <Btn variant="ghost" onClick={openAddForm}>
            <IconPlus size={14} />
            Add conversion
          </Btn>
        </div>
      )}
    </div>
  )
}
