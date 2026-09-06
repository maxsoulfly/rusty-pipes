// Pure helpers for the optimistic user_inventory row list that
// useInventory.js maintains. Extracted here so the
// own -> pin -> un-own -> re-own -> pin lifecycle is unit-testable
// without React.
//
// The bug this addresses: an optimistic ownership add inserts a
// placeholder row with a fake id (`optimistic-<id>`) and the real insert
// never got reconciled back into local state on success. Ownership display
// only cares that a row for the id exists, so that was invisible - until
// Speed Rack, which needs the row's *real* id to UPDATE `pinned`. Pinning
// a freshly (re-)owned item silently did nothing because the only matching
// row was still the fake-id placeholder.

export const isOptimisticId = (id) => String(id).startsWith("optimistic-")

// The row you would UPDATE to pin/unpin a given type or product. Returns
// null when the only matching row is still an unsaved optimistic insert
// (no real id to UPDATE yet) - the caller should treat a pin toggle as a
// no-op until the add has reconciled.
export function findPinnableRow(rows, match) {
  const row = rows.find(match)
  return row && !isOptimisticId(row.id) ? row : null
}

// Replace the optimistic placeholder for an add with the real row the
// server returned, so its id (and any server-side defaults like
// `pinned: false`) become usable. A no-op if the placeholder is already
// gone (e.g. the user un-owned again before the insert resolved).
export function reconcileOptimisticRow(rows, optimisticId, realRow) {
  return rows.map((r) => (r.id === optimisticId ? realRow : r))
}
