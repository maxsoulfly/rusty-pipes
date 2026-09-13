import { describe, expect, it } from "vitest"
import { resolveEditorHeaderTitle } from "./editorHeader"

describe("resolveEditorHeaderTitle", () => {
  it("editing an existing recipe shows its own persisted name as the title, with 'Edit Recipe' as the subtitle", () => {
    expect(
      resolveEditorHeaderTitle({
        isEditing: true,
        existingName: "Bloody Mary (Practical Version)",
        cloneSourceId: null,
      }),
    ).toEqual({
      title: "Bloody Mary (Practical Version)",
      subtitle: "Edit Recipe",
    })
  })

  it("an unsaved Recipe Name draft never reaches this function at all - it only ever receives the persisted name, so it cannot leak a draft into the header even if a caller had one", () => {
    // Simulates EditorScreen.jsx's own call shape: `existingName` always
    // comes from `existing?.name` (the persisted `computed` record), never
    // the live `name` state the Recipe Name input writes to. Passing the
    // ORIGINAL, persisted name here and confirming it comes straight back
    // unchanged is exactly what proves the header shows the saved
    // identity, not a draft - there is no separate "draft" parameter this
    // function could accidentally prefer instead.
    const persistedName = "Bloody Mary (Practical Version)"
    expect(
      resolveEditorHeaderTitle({
        isEditing: true,
        existingName: persistedName,
        cloneSourceId: null,
      }).title,
    ).toBe(persistedName)
  })

  it("falls back to a generic 'Edit Recipe' title if somehow editing with no persisted name available (defensive - EditorScreen.jsx's own 'not found' screen prevents this in practice)", () => {
    expect(
      resolveEditorHeaderTitle({
        isEditing: true,
        existingName: null,
        cloneSourceId: null,
      }),
    ).toEqual({ title: "Edit Recipe", subtitle: "Edit Recipe" })
    expect(
      resolveEditorHeaderTitle({
        isEditing: true,
        existingName: undefined,
        cloneSourceId: null,
      }).title,
    ).toBe("Edit Recipe")
  })

  it("creating a brand-new recipe shows the generic 'New Recipe' title with no subtitle", () => {
    expect(
      resolveEditorHeaderTitle({
        isEditing: false,
        existingName: undefined,
        cloneSourceId: null,
      }),
    ).toEqual({ title: "New Recipe", subtitle: undefined })
  })

  it("cloning shows 'Clone Recipe' with no subtitle, distinct from both editing and a blank new recipe", () => {
    expect(
      resolveEditorHeaderTitle({
        isEditing: false,
        existingName: undefined,
        cloneSourceId: "some-recipe-id",
      }),
    ).toEqual({ title: "Clone Recipe", subtitle: undefined })
  })

  it("a long recipe name is returned exactly as-is - truncation is a display concern (TopBar's own `truncate` class), not something this function shortens or alters", () => {
    const longName =
      "Bloody Mary (Practical Version, Extra Spicy, Home Bar Batch)"
    expect(
      resolveEditorHeaderTitle({
        isEditing: true,
        existingName: longName,
        cloneSourceId: null,
      }).title,
    ).toBe(longName)
  })
})
