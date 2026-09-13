import { useState } from "react"
import clsx from "clsx"
import { IconEdit, IconTrash } from "@/components/icons"
import {
  Btn,
  Card,
  ConfirmPanel,
  Input,
  OwnedToggle,
} from "@/components/primitives"
import { resolveIngredientType } from "@/domain/ingredientResolution"
import { deleteProduct, updateProduct } from "@/services/products"

// The per-type "browse every catalog product, owned or not" panel - what
// shows when a type card's chevron is expanded. Admin-only product
// correction (edit/delete) state is fully local here since nothing outside
// this panel ever reads it.
export function ExpandedProducts({
  typeName,
  products,
  types,
  aliases,
  ownedProductIds,
  isAdmin,
  onToggleProduct,
  onProductsChanged,
  onViewProduct,
  style,
}) {
  // Admin-only product correction - a miscategorized/typo'd product (from
  // Add Product or batch import) had no fix short of an admin deleting and
  // recreating it. One draft at a time, same pattern as Admin's inline
  // add-ingredient draft.
  const [editingProduct, setEditingProduct] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(false)
  const [deleteProductError, setDeleteProductError] = useState(null)

  const startEditProduct = (p) => {
    setEditError(null)
    setEditingProduct({
      id: p.id,
      name: p.name,
      brand: p.brand ?? "",
      // Text, not an id - see the ingredient-type input below. A plain
      // dropdown of every ingredient type became unusable once the catalog
      // had more than a handful (a real complaint after Orange Juice turned
      // out to have no correct type to pick at all - see the type-search
      // input's comment) - same searchable text+datalist pattern
      // AddProductScreen already uses for this exact problem.
      ingredientTypeName:
        types.find((t) => t.id === p.ingredient_type_id)?.name ?? "",
      isHomemade: p.is_homemade,
    })
  }

  const editMatchedType = editingProduct
    ? resolveIngredientType(editingProduct.ingredientTypeName, {
        types,
        aliases,
      })
    : null

  const handleSaveEditProduct = async () => {
    if (!editingProduct || !editMatchedType) return
    setEditSaving(true)
    setEditError(null)
    try {
      await updateProduct(editingProduct.id, {
        name: editingProduct.name.trim(),
        ingredientTypeId: editMatchedType.id,
        brand: editingProduct.brand.trim(),
        isHomemade: editingProduct.isHomemade,
      })
      await onProductsChanged()
      setEditingProduct(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteProduct = async (id) => {
    setDeletingProduct(true)
    setDeleteProductError(null)
    try {
      await deleteProduct(id)
      await onProductsChanged()
      setConfirmDeleteProductId(null)
    } catch (err) {
      setDeleteProductError(err.message)
    } finally {
      setDeletingProduct(false)
    }
  }

  return (
    <Card className="p-0 overflow-hidden" style={style}>
      {/* Labeled so this list is identifiable on its own - matters most
          when a family cluster has more than one type expanded at once
          (e.g. Dark Rum and White Rum both open), where two of these
          panels stack right next to each other with no other way to tell
          which products belong to which type (found from a live
          screenshot - looked like one broken list instead of two). */}
      <div className="py-1.5 px-3.5 bg-bg2 border-b border-bdr text-[10px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
        {typeName}
      </div>
      {products.map((p, pIdx) => {
        const isLastRow = pIdx === products.length - 1
        if (editingProduct?.id === p.id) {
          return (
            <div
              key={p.id}
              className={clsx(
                "py-2.5 px-3.5 bg-bg2 flex flex-col gap-2",
                !isLastRow && "border-b border-bdr",
              )}
            >
              <Input
                label="Name"
                value={editingProduct.name}
                onChange={(v) =>
                  setEditingProduct({ ...editingProduct, name: v })
                }
              />
              <div>
                <label className="text-[11px] font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-1">
                  Ingredient Type
                </label>
                <input
                  list={`edit-ing-types-${p.id}`}
                  value={editingProduct.ingredientTypeName}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      ingredientTypeName: e.target.value,
                    })
                  }
                  className="bg-surface border border-bdr rounded-sm py-2 px-2.5 text-tx text-[13px] font-body w-full"
                />
                <datalist id={`edit-ing-types-${p.id}`}>
                  {types.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                  {aliases.map((a) => (
                    <option key={a.id} value={a.alias} />
                  ))}
                </datalist>
                {editingProduct.ingredientTypeName.trim() &&
                  !editMatchedType && (
                    <p className="mt-1 text-[11px] text-amber">
                      Doesn't match an existing ingredient type.
                    </p>
                  )}
              </div>
              <Input
                label="Brand (optional)"
                value={editingProduct.brand}
                onChange={(v) =>
                  setEditingProduct({ ...editingProduct, brand: v })
                }
              />
              {editError && <p className="text-xs text-coral">{editError}</p>}
              <div className="flex gap-2">
                <Btn
                  variant="primary"
                  small
                  disabled={
                    editSaving ||
                    !editingProduct.name.trim() ||
                    !editMatchedType
                  }
                  onClick={handleSaveEditProduct}
                >
                  {editSaving ? "Saving..." : "Save"}
                </Btn>
                <Btn
                  variant="ghost"
                  small
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Btn>
              </div>
            </div>
          )
        }
        if (confirmDeleteProductId === p.id) {
          return (
            <ConfirmPanel
              key={p.id}
              layout="row"
              className={clsx(
                "py-[7px] px-3.5 bg-bg2",
                !isLastRow && "border-b border-bdr",
              )}
              message={`Delete "${p.name}"? This can't be undone.`}
              error={deleteProductError}
              busy={deletingProduct}
              onConfirm={() => handleDeleteProduct(p.id)}
              onCancel={() => {
                setConfirmDeleteProductId(null)
                setDeleteProductError(null)
              }}
            />
          )
        }
        return (
          <div
            key={p.id}
            className={clsx(
              "flex items-center gap-3 py-[7px] px-3.5 bg-bg2",
              !isLastRow && "border-b border-bdr",
            )}
          >
            {/* A real button, not a div - tapping the name views this
                product's recipe page (preserving its bottle name, per
                current-context.md's Stage 4 chunk), same
                view-never-mutates-ownership split as TypeCard's own card
                body vs. checkmark. Row height stays this list's existing
                compact size rather than an independent 44px bump - that
                minimum was the explicit requirement for TypeCard's
                checkmark specifically, not restated for this row. */}
            <button
              onClick={() => onViewProduct(p.id)}
              className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer py-1"
            >
              <span
                className={clsx(
                  "text-xs",
                  ownedProductIds.has(p.id) ? "text-tx" : "text-tx3",
                )}
              >
                {p.name}
                {p.brand && p.brand !== p.name ? ` · ${p.brand}` : ""}
                {p.is_homemade ? " · homemade" : ""}
              </span>
            </button>
            {isAdmin && (
              <button
                onClick={() => startEditProduct(p)}
                title="Edit product"
                className="bg-transparent border-none cursor-pointer w-9 h-9 text-tx3 flex items-center justify-center shrink-0"
              >
                <IconEdit size={14} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setConfirmDeleteProductId(p.id)}
                title="Delete product"
                className="bg-transparent border-none cursor-pointer w-9 h-9 text-tx3 flex items-center justify-center shrink-0"
              >
                <IconTrash size={14} />
              </button>
            )}
            <OwnedToggle
              owned={ownedProductIds.has(p.id)}
              onChange={() => onToggleProduct(p.id)}
            />
          </div>
        )
      })}
    </Card>
  )
}
