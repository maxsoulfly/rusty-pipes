import { useEffect, useRef, useState } from "react"
import {
  hasDraftContent,
  isSelfAssignedDraft,
  readDraftContent,
  readDraftIndex,
  removeDraftIndexEntry,
  shouldAutosaveDraft,
  upsertDraftIndexEntry,
  writeDraftContent,
} from "@/lib/recipeDrafts"

// A blocked save (most often: an ingredient that doesn't exist yet and
// needs admin approval - see RequestIngredientScreen) used to just lose
// whatever the member had typed, with no way back to it. Auto-saves a
// blank "New Recipe" in progress to this browser's local storage so a
// closed tab or a wait-on-approval doesn't erase it - not a real
// server-side draft (doesn't survive a different device or a cleared
// browser), but a cheap safety net for the common case.
//
// `isDraftable` is the caller's own decision (EditorScreen.jsx: plain
// new-recipe creation only, not editing or cloning - both of those already
// have their own prefill source and a saved copy to fall back to) - this
// hook just does nothing when it's false. `searchParams`/`setSearchParams`
// are passed in rather than called again via `useSearchParams()` here, so
// the `?draft=<id>` URL param has exactly one read/write call site, same as
// before this was split out of EditorScreen.jsx. `formValues` must be
// referentially stable except when one of the draft-relevant fields
// actually changes (the caller memoizes it) - the autosave effect's timing
// depends on that exactly the same way it depended on 9 separate primitive
// dependencies before this was a hook. `onApplyDraft(draft)` is the
// caller's own callback that loads a draft's fields into its live form
// state - this hook never touches the recipe's own form fields directly.
export function useRecipeDraftAutosave({
  isDraftable,
  userId,
  searchParams,
  setSearchParams,
  formValues,
  onApplyDraft,
}) {
  const draftId = isDraftable ? searchParams.get("draft") : null

  const [draftBanner, setDraftBanner] = useState(null)
  // Shown instead of draftBanner when landing on a genuinely blank New
  // Recipe (no ?draft= yet) and other drafts already exist on this browser -
  // picking one navigates to the same page with ?draft=<id>, which then
  // shows draftBanner for that specific one on the next check below.
  const [otherDrafts, setOtherDrafts] = useState([])

  // Set by the autosave effect below when IT assigns a brand-new draft id
  // (first keystroke on a genuinely blank New Recipe) - read here so this
  // effect never mistakes "a draft id I just created for myself" for
  // "returning to an existing draft" and pops a restore banner for content
  // the user is actively typing right now. That's a real bug this exact
  // shape used to have: assigning a fresh id changes draftId, which is
  // this effect's own dependency, so it re-ran on the very next render -
  // showed the banner mid-keystroke, and then permanently froze the
  // autosave effect below (its own draftBanner guard) for the rest of that
  // session, since nothing ever set draftBanner back to null except a
  // Restore/Discard click the user never needed to make and might not have
  // understood the point of.
  const selfAssignedDraftIdRef = useRef(null)

  useEffect(() => {
    if (!isDraftable || !userId) return
    if (!draftId) {
      setOtherDrafts(readDraftIndex(userId))
      return
    }
    if (isSelfAssignedDraft(draftId, selfAssignedDraftIdRef.current)) return
    const draft = readDraftContent(userId, draftId)
    if (draft && hasDraftContent(draft)) setDraftBanner(draft)
    // Only ever check once, right after mount - restoring/discarding is a
    // one-time user decision, not something to re-run as the form changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftable, userId, draftId])

  // Deliberately never deletes a draft just because the form looks empty
  // right now - that heuristic used to run against transient render state
  // (e.g. a just-mounted, not-yet-restored form) and could delete a draft
  // out from under its own restore banner. Deletion only ever happens from
  // an explicit user action (discardDraft/discardOtherDraft below, or a
  // successful save via clearDraftOnSave) - a stray empty entry is low-cost
  // and self-heals the moment the user types something, or ages out via
  // MAX_DRAFTS eviction.
  useEffect(() => {
    if (!shouldAutosaveDraft({ isDraftable, userId, draftBanner, formValues }))
      return
    const id =
      draftId ??
      (() => {
        const newId = crypto.randomUUID()
        selfAssignedDraftIdRef.current = newId
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set("draft", newId)
            return next
          },
          { replace: true },
        )
        return newId
      })()
    writeDraftContent(userId, id, formValues)
    upsertDraftIndexEntry(userId, {
      id,
      name: formValues.name.trim() || "Untitled draft",
      updatedAt: Date.now(),
    })
  }, [isDraftable, userId, draftBanner, draftId, formValues, setSearchParams])

  const restoreDraft = () => {
    onApplyDraft(draftBanner)
    setDraftBanner(null)
  }
  const discardDraft = () => {
    if (userId && draftId) removeDraftIndexEntry(userId, draftId)
    setDraftBanner(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete("draft")
        return next
      },
      { replace: true },
    )
  }
  const continueOtherDraft = (id) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("draft", id)
        return next
      },
      { replace: true },
    )
  const discardOtherDraft = (id) => {
    if (userId) removeDraftIndexEntry(userId, id)
    setOtherDrafts((prev) => prev.filter((d) => d.id !== id))
  }
  // Called by the shell after a successful save - a real save supersedes
  // the local safety-net copy, so it's cleaned up the same way an explicit
  // discard would.
  const clearDraftOnSave = () => {
    if (userId && draftId) removeDraftIndexEntry(userId, draftId)
  }

  return {
    draftBanner,
    otherDrafts,
    restoreDraft,
    discardDraft,
    continueOtherDraft,
    discardOtherDraft,
    clearDraftOnSave,
  }
}
