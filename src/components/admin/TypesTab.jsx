import { useState } from "react"
import { IconEdit, IconMerge, IconTrash } from "@/components/icons"
import { IngredientTypeEditor } from "@/components/IngredientTypeEditor"
import { Btn, Card, ConfirmPanel, Input } from "@/components/primitives"
import { deleteIngredientType, mergeIngredientType } from "@/services/catalog"

// Every ingredient type in the catalog. Same split-out reasoning as Classic
// Recipes - editing already existed (My Bar's admin pencil, now
// IngredientTypeEditor shared with this tab), but delete had zero UI
// despite the "ingredient_types: admin delete" RLS policy existing since
// the RLS-hardening pass. No pre-check for in-use: a child type, product,
// recipe component, or substitution alternative referencing this type all
// have their own restricting FK, so a real delete attempt on an in-use type
// surfaces the DB's own error as-is, same precedent as the Catalog tab.
export function TypesTab({ catalog, onAddNew }) {
  const [typeQuery, setTypeQuery] = useState("")
  const [editingAdminTypeId, setEditingAdminTypeId] = useState(null)
  const [confirmDeleteTypeId, setConfirmDeleteTypeId] = useState(null)
  const [deletingType, setDeletingType] = useState(false)
  const [typeDeleteError, setTypeDeleteError] = useState(null)

  const [mergingLoserId, setMergingLoserId] = useState(null)
  const [mergeSurvivorId, setMergeSurvivorId] = useState(null)
  const [mergeAddAlias, setMergeAddAlias] = useState(true)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState(null)

  const categoryNameById = new Map(
    catalog.categories.map((c) => [c.id, c.name]),
  )
  const typeNameById = new Map(catalog.types.map((t) => [t.id, t.name]))
  const aliasesByTypeId = new Map()
  catalog.aliases.forEach((a) => {
    if (!aliasesByTypeId.has(a.ingredient_type_id))
      aliasesByTypeId.set(a.ingredient_type_id, [])
    aliasesByTypeId.get(a.ingredient_type_id).push(a.alias)
  })
  // Search matches an alias too, not just the canonical name (e.g. "Wodka"
  // -> Vodka) - same reasoning as My Bar's ingredient search.
  const filteredTypes = [...catalog.types]
    .filter((t) => {
      const q = typeQuery.toLowerCase()
      const matchesName = t.name.toLowerCase().includes(q)
      const matchesAlias = (aliasesByTypeId.get(t.id) ?? []).some((a) =>
        a.toLowerCase().includes(q),
      )
      return matchesName || matchesAlias
    })
    .sort(
      (a, b) =>
        (categoryNameById.get(a.category_id) ?? "").localeCompare(
          categoryNameById.get(b.category_id) ?? "",
        ) || a.name.localeCompare(b.name),
    )

  const handleDeleteType = async (id) => {
    setDeletingType(true)
    setTypeDeleteError(null)
    try {
      await deleteIngredientType(id)
      await catalog.refetch()
      setConfirmDeleteTypeId(null)
    } catch (err) {
      setTypeDeleteError(err.message)
    } finally {
      setDeletingType(false)
    }
  }

  const startMerge = (id) => {
    setMergingLoserId(id)
    setMergeSurvivorId(null)
    setMergeError(null)
  }
  const cancelMerge = () => {
    setMergingLoserId(null)
    setMergeSurvivorId(null)
    setMergeError(null)
  }
  const handleConfirmMerge = async () => {
    setMerging(true)
    setMergeError(null)
    try {
      await mergeIngredientType({
        loserId: mergingLoserId,
        survivorId: mergeSurvivorId,
        addAlias: mergeAddAlias,
      })
      await catalog.refetch()
      cancelMerge()
    } catch (err) {
      setMergeError(err.message)
    } finally {
      setMerging(false)
    }
  }

  const mergingLoserName = mergingLoserId
    ? typeNameById.get(mergingLoserId)
    : null
  const mergeSurvivorName = mergeSurvivorId
    ? typeNameById.get(mergeSurvivorId)
    : null

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        Every ingredient type in the catalog. Delete only succeeds if nothing -
        a child type, product, recipe, or substitution - still references it;
        the database's own rejection shows as-is.
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search types..."
            value={typeQuery}
            onChange={setTypeQuery}
          />
        </div>
        <Btn variant="primary" small onClick={onAddNew}>
          + Add
        </Btn>
      </div>
      {mergingLoserId && !mergeSurvivorId && (
        <Card className="p-3.5 flex items-center justify-between gap-2.5">
          <p className="text-[13px] text-tx2">
            Merging <b>{mergingLoserName}</b> - pick the survivor below by
            clicking "Merge into this" on the type it should be folded into.
          </p>
          <Btn variant="ghost" small onClick={cancelMerge}>
            Cancel
          </Btn>
        </Card>
      )}
      {mergingLoserId && mergeSurvivorId && (
        <Card className="p-3.5 flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-[13px] text-tx2 cursor-pointer">
            <input
              type="checkbox"
              checked={mergeAddAlias}
              onChange={(e) => setMergeAddAlias(e.target.checked)}
            />
            Keep "{mergingLoserName}" as an alias of "{mergeSurvivorName}"
          </label>
          <ConfirmPanel
            layout="stack"
            message={`Merge "${mergingLoserName}" into "${mergeSurvivorName}"? Every recipe, product, My Bar entry, and alias referencing "${mergingLoserName}" will be reassigned to "${mergeSurvivorName}", and "${mergingLoserName}" will be deleted. This can't be undone.`}
            confirmLabel="Merge"
            busy={merging}
            onConfirm={handleConfirmMerge}
            onCancel={cancelMerge}
          />
          {mergeError && <p className="text-xs text-coral">{mergeError}</p>}
        </Card>
      )}
      {filteredTypes.length === 0 ? (
        <p className="text-sm text-tx3">No matching ingredient types.</p>
      ) : (
        filteredTypes.map((t) =>
          editingAdminTypeId === t.id ? (
            <IngredientTypeEditor
              key={t.id}
              type={t}
              categories={catalog.categories}
              types={catalog.types}
              aliases={catalog.aliases}
              liquidColors={catalog.liquidColors}
              formConversions={catalog.formConversions}
              ingredientSubstitutions={catalog.ingredientSubstitutions}
              ingredientPreparations={catalog.ingredientPreparations}
              ingredientPreparationInputs={catalog.ingredientPreparationInputs}
              onSaved={async () => {
                await catalog.refetch()
                setEditingAdminTypeId(null)
              }}
              onCancel={() => setEditingAdminTypeId(null)}
            />
          ) : (
            <Card key={t.id} className="py-3.5 px-4">
              <div className="flex items-start gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 border border-bdr"
                  style={{ background: t.color || "var(--surface3)" }}
                />
                <div className="flex-1">
                  <div className="text-[15px] font-display font-bold text-tx mb-[3px]">
                    {t.name}
                  </div>
                  <div className="text-xs text-tx3">
                    {categoryNameById.get(t.category_id) ?? "Uncategorized"}
                    {t.parent_type_id &&
                      ` · under ${typeNameById.get(t.parent_type_id)}`}
                  </div>
                </div>
                {mergingLoserId === t.id ? (
                  <button
                    onClick={cancelMerge}
                    className="bg-surface3 border border-bdr rounded-sm py-1.5 px-3 cursor-pointer text-tx2 text-xs font-display font-semibold"
                  >
                    Cancel merge
                  </button>
                ) : mergingLoserId ? (
                  <button
                    onClick={() => setMergeSurvivorId(t.id)}
                    className={
                      mergeSurvivorId === t.id
                        ? "bg-cyan/20 border border-cyan/50 rounded-sm py-1.5 px-3 cursor-pointer text-cyan text-xs font-display font-semibold"
                        : "bg-cyan/10 border border-cyan/25 rounded-sm py-1.5 px-3 cursor-pointer text-cyan text-xs font-display font-semibold"
                    }
                  >
                    {mergeSurvivorId === t.id ? "Survivor" : "Merge into this"}
                  </button>
                ) : (
                  // Icon-only on mobile, label restored at md: - three
                  // full-text buttons on every row was cramped. The
                  // merge-flow buttons below (Cancel merge/Merge into
                  // this/Survivor) stay full text - those carry meaning
                  // that's risky to compress into an icon mid-merge.
                  <>
                    <button
                      onClick={() => setEditingAdminTypeId(t.id)}
                      title="Edit"
                      aria-label="Edit"
                      className="bg-cyan/10 border border-cyan/25 rounded-sm py-1.5 px-3 cursor-pointer text-cyan text-xs font-display font-semibold flex items-center gap-1"
                    >
                      <IconEdit size={12} />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => startMerge(t.id)}
                      title="Merge"
                      aria-label="Merge"
                      className="bg-surface3 border border-bdr rounded-sm py-1.5 px-3 cursor-pointer text-tx2 text-xs font-display font-semibold flex items-center gap-1"
                    >
                      <IconMerge size={12} />
                      <span className="hidden md:inline">Merge</span>
                    </button>
                    <button
                      onClick={() => {
                        setTypeDeleteError(null)
                        setConfirmDeleteTypeId(
                          confirmDeleteTypeId === t.id ? null : t.id,
                        )
                      }}
                      title="Delete"
                      aria-label="Delete"
                      className="bg-coral/10 border border-coral/25 rounded-sm py-1.5 px-3 cursor-pointer text-coral text-xs font-display font-semibold flex items-center gap-1"
                    >
                      <IconTrash size={12} />
                      <span className="hidden md:inline">Delete</span>
                    </button>
                  </>
                )}
              </div>
              {confirmDeleteTypeId === t.id && (
                <div className="mt-3 p-3 bg-coral/8 rounded-sm border border-coral/25">
                  <p className="mb-2.5 text-[13px] text-tx2">
                    {typeDeleteError
                      ? typeDeleteError
                      : `Delete "${t.name}"? This can't be undone.`}
                  </p>
                  <div className="flex gap-2">
                    <Btn
                      variant="danger"
                      small
                      disabled={deletingType}
                      onClick={() => handleDeleteType(t.id)}
                    >
                      Delete
                    </Btn>
                    <Btn
                      variant="ghost"
                      small
                      onClick={() => {
                        setConfirmDeleteTypeId(null)
                        setTypeDeleteError(null)
                      }}
                    >
                      Cancel
                    </Btn>
                  </div>
                </div>
              )}
            </Card>
          ),
        )
      )}
    </div>
  )
}
