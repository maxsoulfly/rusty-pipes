import clsx from "clsx"
import { IconCheck, IconCopy, IconPlus } from "@/components/icons"
import {
  Btn,
  Card,
  CategoryPicker,
  ColorSwatchPicker,
  Input,
  Select,
} from "@/components/primitives"
import { useRecipeBatchImport } from "@/hooks/useRecipeBatchImport"
import { BAR_PRIORITIES } from "@/schemas/ingredientImport"

export function ImportRecipes({ catalog, computed, refetchRecipes }) {
  const {
    recipeImportSuccessMessage,
    recipeBatchPhase,
    setRecipeBatchPhase,
    recipeImportPrompt,
    recipePromptCopied,
    onCopyPrompt,
    recipeImportJson,
    setRecipeImportJson,
    onValidate,
    recipeImportResult,
    setRecipeImportResult,
    recipeImporting,
    onCommit,
    addIngredientDraft,
    setAddIngredientDraft,
    onOpenAddIngredientDraft,
    addIngredientError,
    addIngredientSaving,
    onSaveAddIngredientDraft,
  } = useRecipeBatchImport({ catalog, computed, refetchRecipes })
  return (
    <div className="flex flex-col gap-4">
      {recipeImportSuccessMessage && (
        <p className="text-[13px] text-green">{recipeImportSuccessMessage}</p>
      )}

      {recipeBatchPhase === "paste" && (
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-[17px] font-bold text-tx">
            Format with AI, then Paste JSON
          </h3>
          <p className="text-[13px] text-tx2">
            Copy this prompt into an AI chat along with what recipes you want to
            add, then paste its JSON output below. The prompt is generated from
            the live catalog (ingredients, glasses, families, taste tags), so
            the AI can only reference things that actually exist.
          </p>
          <textarea
            readOnly
            value={recipeImportPrompt}
            rows={14}
            onFocus={(e) => e.target.select()}
            className="bg-surface2 border border-bdr rounded-sm p-3.5 text-tx2 text-xs font-mono leading-[1.6] resize-y w-full"
          />
          <Btn variant="ghost" small onClick={onCopyPrompt}>
            {recipePromptCopied ? (
              <IconCheck size={14} />
            ) : (
              <IconCopy size={14} />
            )}{" "}
            {recipePromptCopied ? "Copied" : "Copy Prompt"}
          </Btn>
          <textarea
            value={recipeImportJson}
            onChange={(e) => setRecipeImportJson(e.target.value)}
            placeholder="Paste your JSON here..."
            rows={8}
            className="bg-surface border border-bdr rounded-sm py-3 px-3.5 text-tx text-[13px] font-mono resize-y w-full"
          />
          <Btn variant="primary" full onClick={onValidate}>
            Validate
          </Btn>
        </div>
      )}

      {recipeBatchPhase === "results" && recipeImportResult && (
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-[17px] font-bold text-tx">
            Validation Results
          </h3>
          {recipeImportResult.parseError ? (
            <p className="text-[13px] text-coral">
              Couldn't parse that as a JSON array:{" "}
              {recipeImportResult.parseError}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Ready to import",
                    val: recipeImportResult.validCount,
                    tone: "text-green",
                  },
                  {
                    label: "Errors",
                    val: recipeImportResult.errorCount,
                    tone: "text-coral",
                  },
                ].map(({ label, val, tone }) => (
                  <Card key={label} className="p-3 text-center">
                    <div
                      className={clsx(
                        "text-2xl font-display font-extrabold mb-0.5",
                        tone,
                      )}
                    >
                      {val}
                    </div>
                    <div className="text-[11px] text-tx2">{label}</div>
                  </Card>
                ))}
              </div>
              <Card className="py-3 px-3.5">
                {recipeImportResult.results.map((row, i, arr) => (
                  <div
                    key={row.index}
                    className={clsx(
                      "flex items-start gap-2.5 py-2",
                      i < arr.length - 1 && "border-b border-bdr",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                        row.valid ? "bg-green" : "bg-coral",
                      )}
                    />
                    <div className="flex-1">
                      <span className="text-[13px] text-tx">
                        {row.name ?? `Row ${row.index + 1}`}
                      </span>
                      {!row.valid && (
                        <div className="text-[11px] text-coral mt-0.5">
                          {row.errors.join("; ")}
                        </div>
                      )}
                      {row.missingIngredientNames?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {row.missingIngredientNames.map((n) => (
                            <button
                              key={n}
                              onClick={() => onOpenAddIngredientDraft(n)}
                              className="bg-cyan/10 border border-cyan/25 rounded-[6px] py-[3px] px-2 cursor-pointer text-cyan text-[11px] flex items-center gap-1"
                            >
                              <IconPlus size={10} /> Add "{n}"
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>

              {addIngredientDraft && (
                <Card
                  className="p-3.5 flex flex-col gap-2.5"
                  style={{ borderColor: "rgba(34,211,238,0.25)" }}
                >
                  <div className="text-[13px] font-bold text-tx font-display">
                    Add ingredient
                  </div>
                  {/* The AI-flagged text isn't always a clean ingredient name
                      (e.g. "Fresh pineapple - 50 g", with the quantity/notes
                      still attached) - editable rather than a fixed label so
                      that can be cleaned up before creating the type. */}
                  <Input
                    label="Name"
                    value={addIngredientDraft.name}
                    onChange={(v) =>
                      setAddIngredientDraft({ ...addIngredientDraft, name: v })
                    }
                  />
                  <div>
                    <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em] block mb-1.5">
                      Category
                    </label>
                    <CategoryPicker
                      categories={catalog.categories}
                      value={addIngredientDraft.categoryId}
                      onChange={(v) =>
                        setAddIngredientDraft({
                          ...addIngredientDraft,
                          categoryId: v,
                          parentTypeId: "",
                        })
                      }
                    />
                  </div>
                  {addIngredientDraft.categoryId && (
                    <Select
                      value={addIngredientDraft.parentTypeId}
                      onChange={(v) =>
                        setAddIngredientDraft({
                          ...addIngredientDraft,
                          parentTypeId: v,
                        })
                      }
                      options={[
                        { value: "", label: "No parent type" },
                        ...catalog.types
                          .filter(
                            (t) =>
                              t.category_id === addIngredientDraft.categoryId,
                          )
                          .map((t) => ({ value: t.id, label: t.name })),
                      ]}
                    />
                  )}
                  <Select
                    value={addIngredientDraft.barPriority}
                    onChange={(v) =>
                      setAddIngredientDraft({
                        ...addIngredientDraft,
                        barPriority: v,
                      })
                    }
                    options={BAR_PRIORITIES.map((p) => ({
                      value: p,
                      label: p[0].toUpperCase() + p.slice(1),
                    }))}
                  />
                  <ColorSwatchPicker
                    value={addIngredientDraft.color}
                    onChange={(v) =>
                      setAddIngredientDraft({ ...addIngredientDraft, color: v })
                    }
                    colors={catalog.liquidColors}
                  />
                  {addIngredientError && (
                    <p className="text-xs text-coral">{addIngredientError}</p>
                  )}
                  <div className="flex gap-2">
                    <Btn
                      variant="primary"
                      small
                      disabled={
                        !addIngredientDraft.name.trim() ||
                        !addIngredientDraft.categoryId ||
                        addIngredientSaving
                      }
                      onClick={onSaveAddIngredientDraft}
                    >
                      {addIngredientSaving ? "Adding..." : "Add & Re-validate"}
                    </Btn>
                    <Btn
                      variant="ghost"
                      small
                      onClick={() => setAddIngredientDraft(null)}
                    >
                      Cancel
                    </Btn>
                  </div>
                </Card>
              )}
              {recipeImportResult.commitError && (
                <p className="text-xs text-coral">
                  {recipeImportResult.commitError}
                </p>
              )}
            </>
          )}
          <div className="flex gap-2">
            <Btn
              variant="ghost"
              small
              onClick={() => {
                setRecipeBatchPhase("paste")
                setRecipeImportJson("")
                setRecipeImportResult(null)
              }}
            >
              Cancel
            </Btn>
            {!recipeImportResult.parseError && (
              <Btn
                variant="primary"
                full
                disabled={
                  recipeImporting || recipeImportResult.validCount === 0
                }
                onClick={onCommit}
              >
                {recipeImporting
                  ? "Importing..."
                  : `Import ${recipeImportResult.validCount} Recipe${
                      recipeImportResult.validCount === 1 ? "" : "s"
                    }`}
              </Btn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
