// Whether an intermediate grouping heading is redundant with the heading
// already shown directly above it - case-insensitive and whitespace-
// trimmed, since headings in this app render all-caps via CSS regardless
// of the stored casing (found live in My Bar: category "Beer" has a
// mid-level "Beer" parent type grouping Light Lager/Pilsner/Stout, so the
// family heading and the category heading above it both read "BEER" even
// though nothing in the data is literally duplicated - every other parent
// type in the catalogue has a name distinct from its own category, so this
// only ever suppresses a genuine duplicate, never a real subheading).
// Generic on purpose - not specific to "Beer" or to any one screen.
export function isRedundantHeading(label, parentLabel) {
  if (label == null || parentLabel == null) return false
  return label.trim().toLowerCase() === parentLabel.trim().toLowerCase()
}
