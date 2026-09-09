// Pure, framework-free resolution of the admin-curated
// `onboarding_ingredients` rows into the two lists the homepage "Build your
// bar" widget renders (src/components/home/BuildYourBar.jsx):
//
//   - `six`    - the initial home-screen tiles
//   - `groups` - the expanded "Show all essentials" view
//
// The rows are ID references into ingredient_types (rename-safe, `on delete
// cascade`), so resolution here is a plain id lookup against the live
// catalog - no name matching, no aliases. A row whose type has been deleted
// since seeding simply drops out; a row whose type is flagged
// `assumed_available` (a household basic - the availability engine already
// treats it as owned, so a tile would be a no-op) is excluded from both
// outputs on every render, exactly the way Ice behaves today.
//
// Deliberately separate from ingredient_types.bar_priority / Buy Next
// ranking (src/domain/recommendations.js) - curating this list must never
// touch purchase recommendations.

// The three fixed expanded-view headings, in fixed render order. Mirrors the
// `group_label` CHECK constraint on onboarding_ingredients.
export const ONBOARDING_GROUP_LABELS = ["Spirits", "Mixers", "Kitchen basics"]

// Default group for a newly added onboarding row, guessed from the
// ingredient's catalogue category name so the admin usually doesn't have to
// touch the dropdown. Anything that isn't clearly a spirit or a mixer falls
// to "Kitchen basics" (juices, syrups, bitters, garnishes, ...).
export function defaultOnboardingGroup(categoryName) {
  const c = (categoryName ?? "").toLowerCase()
  if (c.includes("spirit")) return "Spirits"
  if (c.includes("mixer")) return "Mixers"
  return "Kitchen basics"
}

// The initial grid holds at most this many tiles - is_initial rows first,
// then backfilled from the rest so a short is_initial set still fills the
// grid. Fewer eligible rows than this just render fewer tiles.
const INITIAL_TILE_TARGET = 6

/**
 * @param {{ ingredient_type_id: string, position: number,
 *   is_initial: boolean, group_label: string }[]} rows - onboarding_ingredients
 *   rows (any order; this function sorts them)
 * @param {{ id: string, name: string, assumed_available?: boolean }[]} types -
 *   the live catalog
 * @returns {{ six: object[], groups: [string, object[]][] }}
 *   `six` = initial tiles (<= 6, deduped); `groups` = always the 3 fixed
 *   labels in fixed order, each with its resolved types in position order.
 *   Every type in `six` also appears in exactly one `groups` bucket.
 */
export function resolveOnboardingSelection(rows, types) {
  const typeById = new Map((types ?? []).map((t) => [t.id, t]))

  // Resolve each row to its type, then drop:
  //   - rows whose type no longer exists (deleted since seeding)
  //   - rows whose type is a household basic (assumed_available) - excluded
  //     from both lists every render
  //   - rows with an out-of-range group_label (the DB CHECK prevents this;
  //     filtering here keeps the "six is a subset of groups" invariant true
  //     even against dirty data)
  const survivors = (rows ?? [])
    .map((r) => ({ ...r, type: typeById.get(r.ingredient_type_id) }))
    .filter(
      (r) =>
        r.type &&
        r.type.assumed_available !== true &&
        ONBOARDING_GROUP_LABELS.includes(r.group_label),
    )

  // Overall order: position, then name as a deterministic tiebreak (position
  // has no DB uniqueness guarantee).
  const ordered = [...survivors].sort(
    (a, b) => a.position - b.position || a.type.name.localeCompare(b.type.name),
  )

  const groups = ONBOARDING_GROUP_LABELS.map((label) => [
    label,
    ordered.filter((r) => r.group_label === label).map((r) => r.type),
  ])

  // six = is_initial rows in overall position order, then backfilled from
  // the remaining rows in the same order, deduped by id, capped at 6. More
  // than 6 is_initial rows -> the first 6 by position win.
  const seen = new Set()
  const six = []
  for (const r of [...ordered.filter((r) => r.is_initial), ...ordered]) {
    if (six.length >= INITIAL_TILE_TARGET) break
    if (seen.has(r.type.id)) continue
    seen.add(r.type.id)
    six.push(r.type)
  }

  return { six, groups }
}
