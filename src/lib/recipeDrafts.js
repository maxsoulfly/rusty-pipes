// New-recipe drafts (see EditorScreen.jsx's `isDraftable` block) used a
// single localStorage slot per user - starting a second in-progress recipe
// silently overwrote the first one, which read as "my draft got deleted"
// the moment someone had two blocked recipes going at once. Each draft now
// gets its own id (reflected in the URL as ?draft=<id> so a refresh/
// return-from-ingredient-request keeps pointing at the same one), with a
// small index tracking id/name/updatedAt for all of them. Capped at
// MAX_DRAFTS, oldest evicted first, so this can't grow without bound.
//
// Pure localStorage helpers only - no React state, no effects. The React
// side (state, timing, when to call these) lives in
// src/hooks/useRecipeDraftAutosave.js.
export const MAX_DRAFTS = 5

const draftIndexKeyFor = (userId) => `recipe-drafts:${userId}`
const draftContentKeyFor = (userId, draftId) =>
  `recipe-draft:${userId}:${draftId}`

export function readDraftIndex(userId) {
  if (!userId) return []
  try {
    return JSON.parse(localStorage.getItem(draftIndexKeyFor(userId))) ?? []
  } catch {
    return []
  }
}

export function upsertDraftIndexEntry(userId, entry) {
  const list = readDraftIndex(userId).filter((d) => d.id !== entry.id)
  list.unshift(entry)
  while (list.length > MAX_DRAFTS) {
    const evicted = list.pop()
    localStorage.removeItem(draftContentKeyFor(userId, evicted.id))
  }
  localStorage.setItem(draftIndexKeyFor(userId), JSON.stringify(list))
}

export function removeDraftIndexEntry(userId, draftId) {
  const list = readDraftIndex(userId).filter((d) => d.id !== draftId)
  localStorage.setItem(draftIndexKeyFor(userId), JSON.stringify(list))
  localStorage.removeItem(draftContentKeyFor(userId, draftId))
}

export function readDraftContent(userId, draftId) {
  const raw = localStorage.getItem(draftContentKeyFor(userId, draftId))
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // Corrupted entry - treated as "nothing to restore," same as a missing
    // one. Left alone rather than deleted here - there's nothing to restore
    // either way, and if the user keeps typing, autosave overwrites it with
    // valid content anyway.
    return null
  }
}

export function writeDraftContent(userId, draftId, content) {
  localStorage.setItem(draftContentKeyFor(userId, draftId), JSON.stringify(content))
}

// Shared by the autosave effect (decides whether the live form has enough
// to save) and the mount-check effect (decides whether a saved draft has
// enough to offer restoring) - a real bug had these disagree: saving
// allowed a blank name as long as an ingredient or step was filled in
// (upsertDraftIndexEntry falls back to "Untitled draft" for display), but
// restoring only ever checked the name, so a nameless-but-real draft saved
// correctly and even showed up in the "other drafts" picker, but its own
// restore banner could never trigger.
export function hasDraftContent(draft) {
  return Boolean(
    draft?.name?.trim() ||
      draft?.ings?.some((i) => i.ingredientName?.trim()) ||
      draft?.steps?.some((s) => s?.trim()),
  )
}

// A draft id the autosave effect assigned to ITSELF this session (first
// keystroke on a genuinely blank New Recipe) must never be mistaken by the
// mount-check effect for "an existing draft to offer restoring" - see
// useRecipeDraftAutosave.js's own comment for the exact bug this prevents
// (a restore banner popping mid-keystroke, which then permanently freezes
// autosave via shouldAutosaveDraft below, since nothing else ever clears
// it).
export function isSelfAssignedDraft(draftId, selfAssignedDraftId) {
  return draftId != null && draftId === selfAssignedDraftId
}

// Autosave must never run while a restore banner is pending - otherwise the
// still-unrestored draft in localStorage gets silently overwritten by
// whatever the (blank, or different) live form currently holds before the
// user ever sees the banner. This is the one condition that most directly
// protects "restoring a draft doesn't corrupt it."
export function shouldAutosaveDraft({ isDraftable, userId, draftBanner, formValues }) {
  if (!isDraftable || !userId || draftBanner) return false
  return hasDraftContent(formValues)
}
