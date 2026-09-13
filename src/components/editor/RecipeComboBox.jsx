import { useMemo, useState } from "react"
import clsx from "clsx"
import { IconChevD, IconX } from "@/components/icons"
import { Input } from "@/components/primitives"

// Collapsed, searchable single-select over recipes - same interaction
// pattern as TypeComboBox.jsx (collapsed trigger -> inline search + a
// bounded scrollable result list -> collapses on pick, no overlay, so the
// keyboard never covers Save/Cancel), built narrowly for Linked
// Variations' "Variation of" picker (Stage V.2) rather than adding
// variation-specific search logic directly into EditorScreen.jsx.
//
// Name match only, plain substring - no alias/fuzzy resolution (AGENTS.md:
// "no fuzzy/name-similarity matching"). Each result row also shows a
// small muted source/author line, since recipe names can collide in a way
// ingredient type names don't (two different members' own "(My Version)"
// clones, a classic and a community recipe sharing a name, etc.) - this is
// the "show enough identity to distinguish candidates" requirement.
//
// `recipes` is expected pre-filtered by the caller (exclude the recipe
// being edited itself - self-selection should not even be choosable, not
// just rejected server-side; RLS/`computed` already excludes anything the
// viewer can't see at all, so no separate visibility filter is needed
// here).
export function RecipeComboBox({
  valueId,
  onPick,
  recipes,
  placeholder = "Search recipes...",
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const chosen = valueId ? recipes.find((r) => r.id === valueId) : null

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = recipes
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { shown: matches.slice(0, 8), total: matches.length }
  }, [recipes, query])

  const identityLine = (r) => {
    if (r.source === "classic") return "Classic"
    const kind = r.source === "community" ? "Community" : "Private"
    return r.author ? `${kind} · ${r.author}` : kind
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
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
              aria-label="Close recipe search"
              className="w-11 h-11 shrink-0 rounded-sm border border-bdr bg-surface text-tx2 flex items-center justify-center cursor-pointer"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.shown.length === 0 ? (
              <p className="text-[13px] text-tx3 px-1 py-2">
                No matching recipe.
              </p>
            ) : (
              results.shown.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPick(r.id)
                    setOpen(false)
                    setQuery("")
                  }}
                  className={clsx(
                    "w-full text-left py-2 px-2 min-h-11 rounded-sm bg-transparent border-none cursor-pointer",
                    r.id === valueId && "bg-cyan/10",
                  )}
                >
                  <span
                    className={clsx(
                      "block text-sm",
                      r.id === valueId ? "text-cyan" : "text-tx",
                    )}
                  >
                    {r.name}
                  </span>
                  <span className="block text-[11px] text-tx3">
                    {identityLine(r)}
                  </span>
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
            {chosen ? chosen.name : "Search recipes..."}
          </span>
          <IconChevD size={14} className="text-tx3 shrink-0" />
        </button>
      )}
    </div>
  )
}
