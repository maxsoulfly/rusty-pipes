// Within a category, order by real-world "how likely is this on a bar" -
// bar_priority already exists on every type (currently only consumed by
// src/domain/recommendations.js for purchase suggestions), name as
// tiebreaker. Previously pure alphabetical, which put e.g. Absinthe ahead
// of Gin purely on spelling - no relationship to which one an actual bar
// would stock.
const PRIORITY_RANK = { essential: 0, common: 1, specialized: 2, niche: 3 }
export function byPriorityThenName(a, b) {
  return (
    (PRIORITY_RANK[a.bar_priority] ?? 99) -
      (PRIORITY_RANK[b.bar_priority] ?? 99) || a.name.localeCompare(b.name)
  )
}

// Renders parent types followed immediately by their (filtered) children,
// indented - a child whose parent didn't pass the filter (e.g. searching
// "dark" matches "Dark Rum" but not "Rum", or the parent simply isn't
// owned) still shows, just flat, so grouping never hides a real match.
function buildRows(items, childrenByParentId) {
  const filteredIds = new Set(items.map((t) => t.id))
  const topLevel = items.filter((t) => !t.parent_type_id)
  const orphanChildren = items.filter(
    (t) => t.parent_type_id && !filteredIds.has(t.parent_type_id),
  )
  const rows = []
  topLevel.forEach((t) => {
    rows.push({ type: t, isChild: false })
    ;(childrenByParentId.get(t.id) ?? [])
      .filter((child) => filteredIds.has(child.id))
      .forEach((child) => rows.push({ type: child, isChild: true }))
  })
  orphanChildren.forEach((t) => rows.push({ type: t, isChild: false }))
  return rows
}

// Groups buildRows()'s flat [{type, isChild}] list into
// [{parent, children}] clusters, one per top-level type - lets My Bar box a
// parent + its children together (a "family" cluster) instead of relying on
// card size alone to suggest the relationship, which tested as too subtle
// to notice. `items` should already be filtered/sorted (owned, matching the
// current search/category, in display order) - this function only groups,
// it never filters or sorts on its own.
export function buildFamilyClusters(items, childrenByParentId) {
  const clusters = []
  buildRows(items, childrenByParentId).forEach(({ type, isChild }) => {
    if (!isChild) clusters.push({ parent: type, children: [] })
    else clusters[clusters.length - 1].children.push(type)
  })
  return clusters
}
