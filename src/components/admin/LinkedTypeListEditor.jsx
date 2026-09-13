import { useRef, useState } from "react"
import { TypeComboBox } from "@/components/admin/TypeComboBox"
import { IconDots } from "@/components/icons"
import { BottomSheet, Input } from "@/components/primitives"

const QUIET_BTN =
  "min-h-11 px-3 rounded-sm border border-bdr bg-transparent text-tx2 text-[13px] font-display font-semibold cursor-pointer disabled:opacity-50"
const MENU_ITEM =
  "w-full text-left py-2.5 px-3 min-h-11 rounded-sm text-[13px] text-tx bg-surface border border-bdr cursor-pointer"

// Shared list-editor for IngredientTypeEditor's two directional, one-way
// draft lists - "Can provide" (raw side = this type, ingredient_form_
// conversions) and "Can be replaced by" (from side = this type,
// ingredient_substitutions, Stage B, suggestion-only). Both are the same
// shape (a list of {linked type, one-line note}, added/edited via a
// TypeComboBox + Input, removed/edited via a per-row ⋮ BottomSheet) -
// genuine duplication, same reasoning as ConfirmPanel in the 2026-08-24
// refactor. NOT a general-purpose list editor: it only ever renders these
// two existing shapes (both directional, one-way, no inverse) - do not widen
// this for anything else.
//
// Fully controlled: `items`/`addableTypes` and the onAdd/onEditNote/onRemove
// callbacks are the caller's own draft state (IngredientTypeEditor keeps
// owning draftConversions/draftSubstitutes for its dirty-check and
// handleSave) - this component's own local state is UI-only (add-form open,
// which row is mid-edit, which row's menu is open) and never persisted.
export function LinkedTypeListEditor({
  label,
  description,
  items,
  addableTypes,
  aliasesByTypeId,
  onAdd,
  onEditNote,
  onRemove,
  addPlaceholder,
  notePlaceholder,
  ariaLabelFor,
  emptyNoteFallback,
  menuTitle,
  editMenuLabel,
}) {
  const [adding, setAdding] = useState(false)
  const [newTargetId, setNewTargetId] = useState(null)
  const [newNoteText, setNewNoteText] = useState("")
  const [editingIdx, setEditingIdx] = useState(null)
  const [editNoteText, setEditNoteText] = useState("")
  const [menuIdx, setMenuIdx] = useState(null)
  const menuAnchorRef = useRef(null)

  const openAdd = () => {
    setAdding(true)
    setNewTargetId(null)
    setNewNoteText("")
  }
  const commitAdd = () => {
    if (!newTargetId || !newNoteText.trim()) return
    onAdd(newTargetId, newNoteText.trim())
    setAdding(false)
  }
  const openMenu = (e, idx) => {
    menuAnchorRef.current = e.currentTarget
    setMenuIdx(idx)
  }
  const startEdit = (idx) => {
    setEditingIdx(idx)
    setEditNoteText(items[idx].note)
  }
  const commitEdit = () => {
    const text = editNoteText.trim()
    if (!text) return
    onEditNote(editingIdx, text)
    setEditingIdx(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
          {label}
        </label>
        {!adding && (
          <button
            type="button"
            onClick={openAdd}
            className="min-h-11 px-2.5 text-xs text-cyan font-display font-semibold bg-transparent border-none cursor-pointer shrink-0"
          >
            + Add
          </button>
        )}
      </div>
      <p className="text-xs text-tx3 leading-snug">{description}</p>

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, idx) => {
            const editing = editingIdx === idx
            return (
              <div
                key={item.id}
                className="rounded-sm border border-bdr bg-surface2 p-2.5 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-tx font-display font-semibold break-words">
                    {item.titleNode}
                  </div>
                  {editing ? (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      <Input
                        placeholder={notePlaceholder}
                        value={editNoteText}
                        onChange={setEditNoteText}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!editNoteText.trim()}
                          onClick={commitEdit}
                          className={QUIET_BTN}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIdx(null)}
                          className={QUIET_BTN}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-tx2 break-words mt-0.5">
                      {item.note ||
                        (emptyNoteFallback && (
                          <span className="italic text-tx3">
                            {emptyNoteFallback}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={(e) => openMenu(e, idx)}
                    aria-label={ariaLabelFor(item)}
                    className="w-11 h-11 -mr-1 -mt-1 shrink-0 rounded-sm border border-bdr text-tx2 flex items-center justify-center cursor-pointer hover:text-tx active:bg-bg2"
                  >
                    <IconDots size={18} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="rounded-sm border border-cyan/40 bg-surface2 p-2.5 flex flex-col gap-1.5">
          <TypeComboBox
            valueId={newTargetId}
            onPick={setNewTargetId}
            types={addableTypes}
            aliasesByTypeId={aliasesByTypeId}
            placeholder={addPlaceholder}
          />
          <Input
            placeholder={notePlaceholder}
            value={newNoteText}
            onChange={setNewNoteText}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!newTargetId || !newNoteText.trim()}
              onClick={commitAdd}
              className={QUIET_BTN}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={QUIET_BTN}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomSheet
        open={menuIdx !== null}
        onClose={() => setMenuIdx(null)}
        title={menuTitle}
        anchorRef={menuAnchorRef}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              startEdit(menuIdx)
              setMenuIdx(null)
            }}
            className={MENU_ITEM}
          >
            {editMenuLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onRemove(menuIdx)
              setMenuIdx(null)
            }}
            className={`${MENU_ITEM} text-coral`}
          >
            Remove
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
