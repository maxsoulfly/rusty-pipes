// Editor sticky-header identity - pure selection of what the recipe
// editor's TopBar (src/components/Nav.jsx) should show as its `title`/
// `subtitle` while creating or editing a recipe. Found and fixed during
// manual testing of Linked Variations (unrelated to that feature): after
// scrolling deep into a long recipe's edit form (Ingredients, Steps,
// Taste Tags, Variation Of), only a generic "Edit Recipe" stayed visible
// up top, making it unnecessarily easy to lose track of WHICH recipe was
// being edited - especially confusing right around "Variation of," where
// the base and the variation are two different, easily-confused recipes.
//
// Extracted into its own pure function (rather than left as an inline
// ternary in EditorScreen.jsx's JSX) so this decision is unit-testable
// without a component-rendering harness - this project has none (no
// jsdom/testing-library - confirmed repeatedly elsewhere in this
// codebase's own test suite/current-context.md), so a plain data-in/
// data-out function is the only part of this fix that can be exercised
// by an automated test; the actual visual result (truncation, sticky
// positioning, TopBar's own layout) is a direct, one-line-readable JSX/
// CSS fact in Nav.jsx, confirmed by manual verification instead.
//
// Deliberately reads `existingName` from the PERSISTED recipe record
// (e.g. `computed.find(...).name` in EditorScreen.jsx) - never a live,
// unsaved "Recipe Name" field draft. The header's job is to answer
// "which EXISTING recipe am I editing," while the form itself is where
// an in-progress, unsaved rename is shown - the two deliberately do not
// have to agree until Save succeeds and `computed` refetches with the
// new name. This is the user's own explicitly stated preference: show
// the persisted/original identity until Save, not the draft.
//
// New-recipe/clone mode gets no persisted identity yet (there's no saved
// recipe to name the header after) and deliberately does NOT mirror the
// live Recipe Name field's every keystroke either - a stable generic
// label ("New Recipe"/"Clone Recipe") until there's something real to
// show, matching the explicit instruction not to make the sticky header
// continuously track an unsaved field.

/**
 * @param {{
 *   isEditing: boolean,
 *   existingName: string | null | undefined,
 *   cloneSourceId: string | null | undefined,
 * }} params
 * @returns {{ title: string, subtitle: string | undefined }}
 */
export function resolveEditorHeaderTitle({
  isEditing,
  existingName,
  cloneSourceId,
}) {
  if (isEditing) {
    // Defensive fallback only - by the time EditorScreen.jsx reaches the
    // TopBar render, `isEditing && !existing` has already returned its
    // own "Cocktail not found" screen earlier, so `existingName` is
    // expected to always be a real string here in practice.
    return { title: existingName ?? "Edit Recipe", subtitle: "Edit Recipe" }
  }
  return {
    title: cloneSourceId ? "Clone Recipe" : "New Recipe",
    subtitle: undefined,
  }
}
