import { describe, expect, it } from "vitest"
import { PreparationEditor } from "./PreparationEditor"

// Regression test for the real P0 crash (2026-09-14): commit 8d9cbc9 (rich
// ingredient batch import) replaced this file's own PREPARATION_UNIT_OPTIONS/
// NON_VOLUME_UNITS with the shared PREPARATION_UNITS constant, and in doing
// so deleted the local `LABEL`/`QUIET_BTN` style constants along with them -
// but they were still referenced further down in the JSX (the "Homemade
// preparation" label, the Inputs label, and the "Remove preparation"
// button). Since PreparationEditor renders unconditionally as part of
// IngredientTypeEditor, this threw `ReferenceError: LABEL is not defined`
// the instant the editor mounted - i.e. opening Admin -> Ingredient Types ->
// Edit on ANY ingredient, via either entry path.
//
// No jsdom/testing-library in this project (see AGENTS.md) - but this
// component has zero hooks, so calling it directly as a plain function
// (bypassing ReactDOM entirely) still exercises every JSX expression in its
// return value, including the undefined-variable reference this test
// guards against. This is the same "call the function directly" precedent
// IngredientTypeEditor.test.js already uses for normPreparation(), just
// applied to a component instead of a helper.
describe("PreparationEditor", () => {
  it("renders with no preparation configured without throwing", () => {
    expect(() =>
      PreparationEditor({
        typeName: "Lemon",
        preparation: null,
        onChange: () => {},
        addableInputTypesFor: () => [],
        aliasesByTypeId: new Map(),
      }),
    ).not.toThrow()
  })

  it("renders with an existing preparation without throwing (the reported crash)", () => {
    expect(() =>
      PreparationEditor({
        typeName: "Grenadine",
        preparation: {
          name: "Grenadine",
          instructions: ["Combine", "Heat"],
          inputs: [
            {
              key: "1",
              ingredientTypeId: "sugar-id",
              amount: 100,
              unitLabel: "g",
            },
          ],
        },
        onChange: () => {},
        addableInputTypesFor: () => [],
        aliasesByTypeId: new Map(),
      }),
    ).not.toThrow()
  })
})
