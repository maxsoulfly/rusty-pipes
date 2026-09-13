// Generic catalogue ordering: within any list of ingredient types, order by
// real-world "how likely is this on a bar" - bar_priority already exists on
// every type (also read directly, as a raw string, by
// src/domain/recommendations.js's purchase-suggestion ranking), name as
// tiebreaker. Previously pure alphabetical in every caller below, which put
// e.g. Absinthe ahead of Gin purely on spelling - no relationship to which
// one an actual bar would stock. Shared by My Bar's own category/family
// grouping (src/domain/myBarGrouping.js) and the Add Ingredients catalogue
// browse/search screen - both need the exact same rule, not two copies that
// could quietly drift apart.
const PRIORITY_RANK = { essential: 0, common: 1, specialized: 2, niche: 3 }
export function byPriorityThenName(a, b) {
  return (
    (PRIORITY_RANK[a.bar_priority] ?? 99) -
      (PRIORITY_RANK[b.bar_priority] ?? 99) || a.name.localeCompare(b.name)
  )
}
