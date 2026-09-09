import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { IconChevD, IconTrash } from "@/components/icons"
import { Btn, Card, Input, Select } from "@/components/primitives"
import {
  defaultOnboardingGroup,
  ONBOARDING_GROUP_LABELS,
} from "@/domain/buildYourBar"
import { saveOnboardingConfig } from "@/services/onboarding"

// Admin editor for the "Build your bar" onboarding lists
// (onboarding_ingredients). The whole config is edited as one local draft -
// adds, removes, group changes, initial flags, order - and saved atomically
// in a single set_onboarding_config() call, so the live list Home reads is
// never left partial. An unsaved draft survives a save failure; on success
// the shared catalog is refetched so Home reflects the change with no
// redeploy.
//
// Draft rows are kept in one flat array, always ordered so every Spirits row
// comes before every Mixers row before every Kitchen basics row (stable
// within each group). That invariant makes both the grouped rendering below
// and the position-from-index numbering at save time trivial.

const MAX_INITIAL = 6

function regroup(items) {
  return ONBOARDING_GROUP_LABELS.flatMap((label) =>
    items.filter((it) => it.groupLabel === label),
  )
}

function toDraft(rows) {
  const items = [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      typeId: r.ingredient_type_id,
      groupLabel: ONBOARDING_GROUP_LABELS.includes(r.group_label)
        ? r.group_label
        : "Kitchen basics",
      isInitial: r.is_initial === true,
    }))
  return regroup(items)
}

function serialize(draft) {
  return JSON.stringify(draft.map((d) => [d.typeId, d.groupLabel, d.isInitial]))
}

export function OnboardingTab({ catalog }) {
  const typeById = useMemo(
    () => new Map(catalog.types.map((t) => [t.id, t])),
    [catalog.types],
  )
  const categoryNameById = useMemo(
    () => new Map(catalog.categories.map((c) => [c.id, c.name])),
    [catalog.categories],
  )
  const aliasesByTypeId = useMemo(() => {
    const m = new Map()
    for (const a of catalog.aliases ?? []) {
      if (!m.has(a.ingredient_type_id)) m.set(a.ingredient_type_id, [])
      m.get(a.ingredient_type_id).push(a.alias)
    }
    return m
  }, [catalog.aliases])

  const [draft, setDraft] = useState(() =>
    toDraft(catalog.onboardingIngredients),
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serialize(toDraft(catalog.onboardingIngredients)),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedOk, setSavedOk] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")

  const dirty = serialize(draft) !== savedSnapshot
  // Keep the effect below from re-syncing (and wiping) an in-progress edit
  // when the catalog refetches for any reason. It only pulls fresh rows in
  // while the draft is clean.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const syncFromCatalog = useCallback((rows) => {
    const next = toDraft(rows)
    setDraft(next)
    setSavedSnapshot(serialize(next))
  }, [])

  useEffect(() => {
    if (dirtyRef.current) return
    syncFromCatalog(catalog.onboardingIngredients)
  }, [catalog.onboardingIngredients, syncFromCatalog])

  const initialCount = draft.filter((d) => d.isInitial).length
  const atInitialCap = initialCount >= MAX_INITIAL

  const inDraft = useMemo(() => new Set(draft.map((d) => d.typeId)), [draft])

  const edit = (fn) => {
    setError(null)
    setSavedOk(false)
    setDraft((cur) => fn(cur))
  }

  const addType = (typeId) => {
    const type = typeById.get(typeId)
    const group = defaultOnboardingGroup(
      type ? categoryNameById.get(type.category_id) : null,
    )
    edit((cur) =>
      regroup([...cur, { typeId, groupLabel: group, isInitial: false }]),
    )
    setPickerQuery("")
  }
  const removeAt = (i) => edit((cur) => cur.filter((_, idx) => idx !== i))
  const setGroupAt = (i, group) =>
    edit((cur) =>
      regroup(
        cur.map((it, idx) => (idx === i ? { ...it, groupLabel: group } : it)),
      ),
    )
  const toggleInitialAt = (i) =>
    edit((cur) =>
      cur.map((it, idx) => {
        if (idx !== i) return it
        if (
          !it.isInitial &&
          cur.filter((x) => x.isInitial).length >= MAX_INITIAL
        )
          return it
        return { ...it, isInitial: !it.isInitial }
      }),
    )
  const move = (i, dir) =>
    edit((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      if (cur[j].groupLabel !== cur[i].groupLabel) return cur // group boundary
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveOnboardingConfig(
        draft.map((d) => ({
          ingredientTypeId: d.typeId,
          isInitial: d.isInitial,
          groupLabel: d.groupLabel,
        })),
      )
      setSavedSnapshot(serialize(draft))
      setSavedOk(true)
      await catalog.refetch()
    } catch (err) {
      // Draft is left exactly as the admin had it - only the message shows.
      setError(err.message || "Save failed. Your edits are still here.")
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setError(null)
    setSavedOk(false)
    syncFromCatalog(catalog.onboardingIngredients)
  }

  // "+ Add ingredient" picker: catalog types not already in the draft,
  // matched on canonical name or any alias (same as the Ingredient Types
  // tab). Capped so a blank query doesn't render the whole catalog.
  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    const matches = catalog.types
      .filter((t) => !inDraft.has(t.id))
      .filter((t) => {
        if (!q) return true
        if (t.name.toLowerCase().includes(q)) return true
        return (aliasesByTypeId.get(t.id) ?? []).some((a) =>
          a.toLowerCase().includes(q),
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return { shown: matches.slice(0, 20), total: matches.length }
  }, [catalog.types, inDraft, aliasesByTypeId, pickerQuery])

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        The "Build your bar" onboarding lists shown to members with an empty
        bar. The expanded view groups every ingredient below under its heading
        in this order; the home screen shows the first <b>{MAX_INITIAL}</b>{" "}
        marked <b>Initial</b>, and fills any empty slots from the rest of the
        list. Household basics are assumed for everyone, so they never appear on
        the home screen even if listed here.
      </p>

      {/* Save bar. Not sticky - the Admin screen already provides a
          "back to top" affordance on long tabs, and a mis-measured sticky
          offset would just float over the tab row on mobile. */}
      <div className="bg-bg2 py-2 flex items-center gap-2 flex-wrap border-b border-bdr">
        <Btn
          variant="primary"
          small
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save changes"}
        </Btn>
        <Btn
          variant="ghost"
          small
          disabled={!dirty || saving}
          onClick={handleDiscard}
        >
          Discard
        </Btn>
        <span
          className={clsx(
            "text-xs font-mono",
            atInitialCap ? "text-almost" : "text-tx3",
          )}
        >
          {initialCount}/{MAX_INITIAL} initial
        </span>
        {dirty && !error && (
          <span className="text-xs text-tx3">Unsaved changes</span>
        )}
        {savedOk && !dirty && (
          <span className="text-xs text-perfect">Saved.</span>
        )}
      </div>
      {atInitialCap && (
        <p className="text-xs text-tx3">
          {MAX_INITIAL} selected — extra tiles are backfilled automatically from
          the list below.
        </p>
      )}
      {error && (
        <p className="text-[13px] text-coral" role="alert">
          {error}
        </p>
      )}

      {draft.length === 0 ? (
        <p className="text-sm text-tx3">
          No ingredients configured. Members with an empty bar will see the
          heading and prompts but no tiles. Add some below.
        </p>
      ) : (
        ONBOARDING_GROUP_LABELS.map((label) => {
          const groupItems = draft
            .map((it, idx) => ({ it, idx }))
            .filter(({ it }) => it.groupLabel === label)
          if (groupItems.length === 0) return null
          return (
            <div key={label} className="flex flex-col gap-2">
              <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
                {label}
              </div>
              {groupItems.map(({ it, idx }, posInGroup) => {
                const type = typeById.get(it.typeId)
                const hidden = type?.assumed_available === true
                return (
                  <Card key={it.typeId} className="p-3">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <span
                          className={clsx(
                            "flex-1 text-[15px] font-display font-bold",
                            hidden ? "text-tx3 line-through" : "text-tx",
                          )}
                        >
                          {type ? type.name : "(missing ingredient)"}
                        </span>
                        {hidden && (
                          <span className="text-[11px] text-tx3 font-mono shrink-0 mt-1">
                            Hidden — household basic
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="min-w-[8.5rem]">
                          <Select
                            small
                            value={it.groupLabel}
                            onChange={(g) => setGroupAt(idx, g)}
                            options={ONBOARDING_GROUP_LABELS}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleInitialAt(idx)}
                          disabled={!it.isInitial && atInitialCap}
                          aria-pressed={it.isInitial}
                          className={clsx(
                            "h-11 px-3 rounded-sm text-xs font-display font-semibold border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                            it.isInitial
                              ? "bg-cyan/15 border-cyan/40 text-cyan"
                              : "bg-surface3 border-bdr text-tx2",
                          )}
                        >
                          {it.isInitial ? "★ Initial" : "Initial"}
                        </button>
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={posInGroup === 0}
                          aria-label={`Move ${type?.name ?? "row"} up`}
                          className="w-11 h-11 rounded-sm bg-surface3 border border-bdr text-tx2 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <IconChevD size={16} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={posInGroup === groupItems.length - 1}
                          aria-label={`Move ${type?.name ?? "row"} down`}
                          className="w-11 h-11 rounded-sm bg-surface3 border border-bdr text-tx2 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <IconChevD size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          aria-label={`Remove ${type?.name ?? "row"}`}
                          className="w-11 h-11 rounded-sm bg-coral/10 border border-coral/25 text-coral flex items-center justify-center cursor-pointer"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        })
      )}

      <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-bdr">
        <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] font-display">
          Add ingredient
        </div>
        <Input
          placeholder="Search catalogue ingredients..."
          value={pickerQuery}
          onChange={setPickerQuery}
        />
        {pickerResults.shown.length === 0 ? (
          <p className="text-[13px] text-tx3">
            {pickerQuery.trim()
              ? "No matching ingredient not already in the list."
              : "Every catalogue ingredient is already in the list."}
          </p>
        ) : (
          <Card className="p-0">
            {pickerResults.shown.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addType(t.id)}
                className={clsx(
                  "w-full text-left py-2.5 px-3.5 min-h-11 bg-transparent border-none cursor-pointer text-sm text-tx flex items-center justify-between gap-2",
                  i < pickerResults.shown.length - 1 && "border-b border-bdr",
                )}
              >
                <span>{t.name}</span>
                <span className="text-xs text-cyan font-display font-semibold shrink-0">
                  + Add
                </span>
              </button>
            ))}
            {pickerResults.total > pickerResults.shown.length && (
              <p className="py-2 px-3.5 text-[11px] text-tx3 font-mono border-t border-bdr">
                {pickerResults.total - pickerResults.shown.length} more — keep
                typing to narrow.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
