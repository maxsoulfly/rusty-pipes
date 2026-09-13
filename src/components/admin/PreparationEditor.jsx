import { StepsEditor } from "@/components/editor/StepsEditor"
import { TypeComboBox } from "@/components/admin/TypeComboBox"
import { IconX } from "@/components/icons"
import { Input, Select } from "@/components/primitives"
import { NON_VOLUME_UNITS } from "@/data/constants"

const LABEL =
  "text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]"
const QUIET_BTN =
  "min-h-11 px-3 rounded-sm border border-bdr bg-transparent text-tx2 text-[13px] font-display font-semibold cursor-pointer disabled:opacity-50"

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

// Homemade preparation draft (produced side = this type) - Stage D.3.
// Unlike LinkedTypeListEditor's two lists, at most one preparation exists
// per produced type, so this is a single optional block, not a list.
// null = no preparation configured.
//
// Fully controlled, same pattern as IngredientTypeEditor's other draft
// sections: `preparation`/`onChange` IS the caller's own draftPreparation
// state (read by its dirty-check and handleSave) - this component only ever
// computes the next value and hands it back via onChange, it never persists
// anything itself.
export function PreparationEditor({
  typeName,
  preparation,
  onChange,
  addableInputTypesFor,
  aliasesByTypeId,
}) {
  const startPreparation = () =>
    onChange({ name: typeName, instructions: [], inputs: [] })
  const addInput = () =>
    onChange({
      ...preparation,
      inputs: [
        ...preparation.inputs,
        // A fresh client-side key (never a real row yet) - stable React
        // identity independent of position, same reasoning as a loaded
        // preparation's own `key: i.id` in IngredientTypeEditor.
        {
          key: crypto.randomUUID(),
          ingredientTypeId: null,
          amount: 0,
          unitLabel: "ml",
        },
      ],
    })
  const updateInput = (idx, patch) =>
    onChange({
      ...preparation,
      inputs: preparation.inputs.map((i, ix) =>
        ix === idx ? { ...i, ...patch } : i,
      ),
    })
  const removeInput = (idx) =>
    onChange({
      ...preparation,
      inputs: preparation.inputs.filter((_, ix) => ix !== idx),
    })
  const addStep = () =>
    onChange({ ...preparation, instructions: [...preparation.instructions, ""] })
  const removeStep = (idx) =>
    onChange({
      ...preparation,
      instructions: preparation.instructions.filter((_, ix) => ix !== idx),
    })
  const updateStep = (idx, value) =>
    onChange({
      ...preparation,
      instructions: preparation.instructions.map((s, ix) =>
        ix === idx ? value : s,
      ),
    })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className={LABEL}>Homemade preparation</label>
        {!preparation && (
          <button
            type="button"
            onClick={startPreparation}
            className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
          >
            + Add
          </button>
        )}
      </div>
      <p className="text-xs text-tx3 leading-snug">
        How a member could make {typeName} at home. A recipe missing{" "}
        {typeName} can adapt around it once every input below is available -
        it is never marked as owned just because it's preparable.
      </p>

      {preparation && (
        <div className="rounded-sm border border-bdr bg-surface2 p-2.5 flex flex-col gap-2.5">
          <Input
            label="Name"
            value={preparation.name}
            onChange={(v) => onChange({ ...preparation, name: v })}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={LABEL}>Inputs</span>
              <button
                type="button"
                onClick={addInput}
                className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
              >
                + Add input
              </button>
            </div>
            {preparation.inputs.length === 0 && (
              <p className="text-xs text-tx3">
                At least one input is required.
              </p>
            )}
            {preparation.inputs.map((input, idx) => (
              <div key={input.key} className="flex gap-1.5 items-center">
                <div className="flex-1 min-w-0">
                  <TypeComboBox
                    valueId={input.ingredientTypeId}
                    onPick={(id) => updateInput(idx, { ingredientTypeId: id })}
                    types={addableInputTypesFor(idx)}
                    aliasesByTypeId={aliasesByTypeId}
                    placeholder="Search ingredient..."
                  />
                </div>
                <input
                  aria-label={`Amount for input ${idx + 1}`}
                  value={input.amount}
                  onChange={(e) =>
                    updateInput(idx, { amount: Number(e.target.value) || 0 })
                  }
                  inputMode="decimal"
                  className="w-14 shrink-0 bg-surface border border-bdr rounded-sm p-2 text-tx text-[13px] text-center font-mono"
                />
                <div className="w-17 shrink-0">
                  <Select
                    small
                    value={input.unitLabel}
                    onChange={(v) => updateInput(idx, { unitLabel: v })}
                    options={PREPARATION_UNIT_OPTIONS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeInput(idx)}
                  aria-label={`Remove input ${idx + 1}`}
                  className="w-11 h-11 shrink-0 rounded-sm border border-bdr text-tx2 flex items-center justify-center cursor-pointer hover:text-tx active:bg-bg2"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
          </div>

          <StepsEditor
            steps={preparation.instructions}
            onAdd={addStep}
            onRemove={removeStep}
            onUpdate={updateStep}
          />

          <button
            type="button"
            onClick={() => onChange(null)}
            className={`${QUIET_BTN} text-coral self-start`}
          >
            Remove preparation
          </button>
        </div>
      )}
    </div>
  )
}
