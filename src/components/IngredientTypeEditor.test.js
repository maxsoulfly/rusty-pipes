import { describe, expect, it } from "vitest"
import { normPreparation } from "./IngredientTypeEditor"

// Regression test for a real bug found during Stage D.3 manual
// verification: adding a second preparation input row crashed the editor.
// Root cause - a preparation input row starts blank (`ingredientTypeId:
// null`) and is filled in place (unlike a conversion/substitute row, which
// only ever enters the draft already fully picked). normPreparation()'s
// dirty-check sort comparator called `.localeCompare()` directly on
// `ingredientTypeId`, which is `null` for any not-yet-picked row.
// `Array.prototype.sort()` only ever invokes its comparator once the array
// has 2+ elements, so the crash was dormant with zero or one input rows
// and surfaced the moment a second one existed - exactly what was
// reported ("crashes when pressing + Add to add a second... row").
//
// This is a pure-JS bug in a plain helper function, not a React rendering
// issue - fully testable here without mounting the component (this
// project's vitest setup has no jsdom - see AGENTS.md/current-context.md's
// documented test-coverage limits for this same editor's other draft
// state). The actual click-driven UI flow (pressing "+ Add" twice in the
// browser) is NOT exercised by this test and was not re-verified in a
// browser here - only the underlying logic bug is covered.
describe("normPreparation", () => {
  it("does not throw when a second input row is still unpicked (the reported crash)", () => {
    const prep = {
      name: "Simple Syrup",
      instructions: [],
      inputs: [
        { ingredientTypeId: "sugar-id", amount: 100, unitLabel: "ml" },
        { ingredientTypeId: null, amount: 0, unitLabel: "ml" }, // just added, not yet picked
      ],
    }
    expect(() => normPreparation(prep)).not.toThrow()
  })

  it("does not throw when every input row is still unpicked", () => {
    const prep = {
      name: "Simple Syrup",
      instructions: [],
      inputs: [
        { ingredientTypeId: null, amount: 0, unitLabel: "ml" },
        { ingredientTypeId: null, amount: 0, unitLabel: "ml" },
      ],
    }
    expect(() => normPreparation(prep)).not.toThrow()
  })

  it("sorts a fully-picked multi-input preparation deterministically by ingredientTypeId", () => {
    const prep = {
      name: "Simple Syrup",
      instructions: ["Combine", "Heat"],
      inputs: [
        { ingredientTypeId: "water-id", amount: 100, unitLabel: "ml" },
        { ingredientTypeId: "sugar-id", amount: 100, unitLabel: "ml" },
      ],
    }
    expect(normPreparation(prep)).toEqual({
      name: "Simple Syrup",
      instructions: ["Combine", "Heat"],
      inputs: [
        ["sugar-id", 100, "ml"],
        ["water-id", 100, "ml"],
      ],
    })
  })

  it("still handles a single input row (the pre-bug-fix case that never surfaced the crash)", () => {
    const prep = {
      name: "Simple Syrup",
      instructions: [],
      inputs: [{ ingredientTypeId: null, amount: 0, unitLabel: "ml" }],
    }
    expect(() => normPreparation(prep)).not.toThrow()
  })

  it("returns null for no preparation", () => {
    expect(normPreparation(null)).toBeNull()
  })

  it("trims the name and drops blank instructions", () => {
    const prep = {
      name: "  Simple Syrup  ",
      instructions: ["  Combine  ", "", "   ", "Heat"],
      inputs: [{ ingredientTypeId: "sugar-id", amount: 100, unitLabel: "ml" }],
    }
    expect(normPreparation(prep)).toEqual({
      name: "Simple Syrup",
      instructions: ["Combine", "Heat"],
      inputs: [["sugar-id", 100, "ml"]],
    })
  })
})
