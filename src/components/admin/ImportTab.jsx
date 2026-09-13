import clsx from "clsx"
import { ImportIngredientsBatch } from "@/components/admin/ImportIngredientsBatch"
import { ImportIngredientsSingle } from "@/components/admin/ImportIngredientsSingle"
import { ImportProducts } from "@/components/admin/ImportProducts"
import { ImportRecipes } from "@/components/admin/ImportRecipes"

// recipes is adminOnly - it creates ownerless, immediately-published
// classics directly (createClassicRecipes(), riding the "recipes: insert"
// policy's admin branch), which is real classic-recipe-authoring power
// outside moderator's agreed scope (promote/demote/unpublish only).
const ENTITIES = [
  { id: "ingredients", label: "Ingredients" },
  { id: "recipes", label: "Recipes", adminOnly: true },
  { id: "products", label: "Products" },
]

const INGREDIENT_MODES = [
  { id: "single", label: "Single Ingredient" },
  { id: "batch", label: "Batch Import (AI)" },
]

// Batch Import covers three entities - "ingredients" (with its own
// single/batch sub-modes), "recipes", and "products" (both batch/AI only,
// since they already have a member-facing equivalent for one-off creation).
//
// Ingredients' state stays lifted in the AdminScreen shell rather than
// becoming local here - `startSingleAddFromRequest` (Requests and
// Ingredient Types tabs deep-link into the single-ingredient form) reads
// and writes several of those same fields from outside this tab entirely,
// and the single-add and batch-ingredient paths share one success-message
// slot, so splitting either out would just mean threading a second copy
// back up. Recipes and Products have no such cross-tab coupling - each now
// owns its own batch-import state locally (useRecipeBatchImport /
// useProductBatchImport, called inside ImportRecipes.jsx/ImportProducts.jsx
// themselves) - this tab only threads through the plain data
// (catalog/computed/refetchRecipes) those hooks need.
export function ImportTab(props) {
  const {
    catalog,
    computed,
    refetchRecipes,
    importEntity,
    setImportEntity,
    importMode,
    setImportMode,
    importSuccessMessage,
    setImportSuccessMessage,
    setSingleFromRequestId,
    isAdmin,
  } = props
  const visibleEntities = ENTITIES.filter((e) => !e.adminOnly || isAdmin)

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="flex bg-surface border border-bdr rounded-sm overflow-hidden">
        {visibleEntities.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setSingleFromRequestId(null)
              setImportEntity(e.id)
            }}
            className={clsx(
              "flex-1 p-2.5 border-none cursor-pointer font-display text-[13px] transition-all duration-150",
              importEntity === e.id
                ? "bg-cyan/12 text-cyan font-bold"
                : "text-tx2 font-normal",
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      {importEntity === "ingredients" && (
        <div className="flex flex-col gap-4">
          {importSuccessMessage && (
            <p className="text-[13px] text-green">{importSuccessMessage}</p>
          )}

          <div className="flex bg-surface border border-bdr rounded-sm overflow-hidden">
            {INGREDIENT_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setImportSuccessMessage(null)
                  setSingleFromRequestId(null)
                  setImportMode(m.id)
                }}
                className={clsx(
                  "flex-1 p-2.5 border-none cursor-pointer font-display text-[13px] transition-all duration-150",
                  importMode === m.id
                    ? "bg-violet/12 text-violet font-bold"
                    : "text-tx2 font-normal",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {importMode === "single" && (
            <ImportIngredientsSingle
              catalog={catalog}
              singleName={props.singleName}
              setSingleName={props.setSingleName}
              singleCategoryId={props.singleCategoryId}
              setSingleCategoryId={props.setSingleCategoryId}
              singleParentTypeId={props.singleParentTypeId}
              setSingleParentTypeId={props.setSingleParentTypeId}
              singleBarPriority={props.singleBarPriority}
              setSingleBarPriority={props.setSingleBarPriority}
              singleColor={props.singleColor}
              setSingleColor={props.setSingleColor}
              singleDescription={props.singleDescription}
              setSingleDescription={props.setSingleDescription}
              singleSaving={props.singleSaving}
              singleError={props.singleError}
              onAddSingle={props.onAddSingle}
            />
          )}

          {importMode === "batch" && (
            <ImportIngredientsBatch
              batchPhase={props.batchPhase}
              setBatchPhase={props.setBatchPhase}
              importPrompt={props.importPrompt}
              promptCopied={props.promptCopied}
              onCopyPrompt={props.onCopyImportPrompt}
              importJson={props.importJson}
              setImportJson={props.setImportJson}
              onValidate={props.onRunImportValidation}
              importResult={props.importResult}
              setImportResult={props.setImportResult}
              importing={props.importing}
              onCommit={props.onCommitImport}
            />
          )}
        </div>
      )}

      {importEntity === "recipes" && isAdmin && (
        <ImportRecipes
          catalog={catalog}
          computed={computed}
          refetchRecipes={refetchRecipes}
        />
      )}

      {importEntity === "products" && <ImportProducts catalog={catalog} />}
    </div>
  )
}
