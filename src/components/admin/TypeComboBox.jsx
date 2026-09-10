import { useMemo, useState } from "react"
import clsx from "clsx"
import { IconChevD, IconX } from "@/components/icons"
import { Input } from "@/components/primitives"

// Collapsed, searchable single-select over ingredient types (name + alias
// match). A one-line trigger shows the current selection (or a placeholder);
// tapping it opens an inline search box + a bounded scrollable result list,
// and picking a row collapses it again. Kept inline (no portal/overlay) so
// the list and any surrounding Save/Cancel stay reachable with a mobile
// keyboard open. Extracted from the former Ingredient Forms admin tab so the
// "Can provide" section of the Ingredient Type editor can reuse it.
//
// `types` is expected pre-filtered by the caller (e.g. exclude the type
// being edited and anything already linked). `label` is optional - omit it
// when the surrounding section already has its own heading.
export function TypeComboBox({
  label,
  hint,
  valueId,
  onPick,
  types,
  aliasesByTypeId,
  placeholder = "Search ingredients...",
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const chosen = valueId ? types.find((t) => t.id === valueId) : null

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = types
      .filter((t) => {
        if (!q) return true
        if (t.name.toLowerCase().includes(q)) return true
        return (aliasesByTypeId.get(t.id) ?? []).some((a) =>
          a.toLowerCase().includes(q),
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return { shown: matches.slice(0, 8), total: matches.length }
  }, [types, aliasesByTypeId, query])

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && (
        <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
          {label}
          {hint && <span className="normal-case font-normal"> — {hint}</span>}
        </div>
      )}

      {open ? (
        <div className="flex flex-col gap-1.5 rounded-sm border border-cyan/40 bg-surface p-2">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <Input
                placeholder={placeholder}
                value={query}
                onChange={setQuery}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setQuery("")
              }}
              aria-label="Close ingredient search"
              className="w-11 h-11 shrink-0 rounded-sm border border-bdr bg-surface text-tx2 flex items-center justify-center cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.shown.length === 0 ? (
              <p className="text-[13px] text-tx3 px-1 py-2">
                No matching ingredient.
              </p>
            ) : (
              results.shown.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onPick(t.id)
                    setOpen(false)
                    setQuery("")
                  }}
                  className={clsx(
                    "w-full text-left py-2.5 px-2 min-h-11 rounded-sm bg-transparent border-none cursor-pointer text-sm",
                    t.id === valueId ? "text-cyan bg-cyan/10" : "text-tx",
                  )}
                >
                  {t.name}
                </button>
              ))
            )}
            {results.total > results.shown.length && (
              <p className="text-[11px] text-tx3 font-mono px-2 py-1.5">
                {results.total - results.shown.length} more — keep typing to
                narrow.
              </p>
            )}
          </div>
          {chosen && (
            <p className="text-[11px] text-tx3 px-1">
              Currently <span className="text-tx2">{chosen.name}</span>
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
          className="min-h-11 flex items-center justify-between gap-2 py-2 px-3 rounded-sm border border-bdr bg-surface cursor-pointer text-left"
        >
          <span
            className={clsx(
              "text-sm truncate",
              chosen ? "text-tx font-display font-semibold" : "text-tx3",
            )}
          >
            {chosen ? chosen.name : "Choose an ingredient"}
          </span>
          <IconChevD size={14} className="text-tx3 shrink-0" />
        </button>
      )}
    </div>
  )
}
