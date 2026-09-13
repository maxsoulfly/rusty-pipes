import { beforeEach, describe, expect, it } from "vitest"
import {
  MAX_DRAFTS,
  hasDraftContent,
  isSelfAssignedDraft,
  readDraftContent,
  readDraftIndex,
  removeDraftIndexEntry,
  shouldAutosaveDraft,
  upsertDraftIndexEntry,
  writeDraftContent,
} from "./recipeDrafts"

// This vitest config runs in a plain Node environment (no jsdom) - there is
// no real localStorage global. A minimal in-memory stand-in is enough to
// exercise these pure functions' actual read/write/eviction behavior
// without adding a browser-DOM test dependency to the project.
function installFakeLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  }
  return store
}

let store
beforeEach(() => {
  store = installFakeLocalStorage()
})

describe("hasDraftContent", () => {
  it("is false for a genuinely blank draft", () => {
    expect(hasDraftContent({ name: "", ings: [], steps: [] })).toBe(false)
    expect(hasDraftContent({})).toBe(false)
    expect(hasDraftContent(null)).toBe(false)
    expect(hasDraftContent(undefined)).toBe(false)
  })

  it("is true when only the name is filled in", () => {
    expect(hasDraftContent({ name: "  Daiquiri  ", ings: [], steps: [] })).toBe(
      true,
    )
  })

  it("is true when only an ingredient row has a name, even with a blank recipe name", () => {
    expect(
      hasDraftContent({
        name: "",
        ings: [{ ingredientName: "" }, { ingredientName: "White Rum" }],
        steps: [],
      }),
    ).toBe(true)
  })

  it("is true when only a step is filled in", () => {
    expect(
      hasDraftContent({ name: "", ings: [], steps: ["", "Shake well"] }),
    ).toBe(true)
  })

  it("treats whitespace-only fields as blank", () => {
    expect(
      hasDraftContent({
        name: "   ",
        ings: [{ ingredientName: "  " }],
        steps: ["   "],
      }),
    ).toBe(false)
  })
})

describe("readDraftIndex / upsertDraftIndexEntry / removeDraftIndexEntry", () => {
  it("returns an empty list for a user with no drafts", () => {
    expect(readDraftIndex("user-1")).toEqual([])
  })

  it("returns an empty list (not a throw) for corrupted index JSON", () => {
    store.set("recipe-drafts:user-1", "{not json")
    expect(readDraftIndex("user-1")).toEqual([])
  })

  it("adds a new entry to the front of the index", () => {
    upsertDraftIndexEntry("user-1", { id: "a", name: "First", updatedAt: 1 })
    upsertDraftIndexEntry("user-1", { id: "b", name: "Second", updatedAt: 2 })
    expect(readDraftIndex("user-1").map((d) => d.id)).toEqual(["b", "a"])
  })

  it("updates (and moves to front) an existing entry rather than duplicating it", () => {
    upsertDraftIndexEntry("user-1", { id: "a", name: "First", updatedAt: 1 })
    upsertDraftIndexEntry("user-1", { id: "b", name: "Second", updatedAt: 2 })
    upsertDraftIndexEntry("user-1", {
      id: "a",
      name: "First (renamed)",
      updatedAt: 3,
    })
    const index = readDraftIndex("user-1")
    expect(index.map((d) => d.id)).toEqual(["a", "b"])
    expect(index[0].name).toBe("First (renamed)")
  })

  it("evicts the oldest draft past MAX_DRAFTS, removing its content key too", () => {
    for (let i = 0; i < MAX_DRAFTS; i++) {
      upsertDraftIndexEntry("user-1", { id: `d${i}`, name: `Draft ${i}`, updatedAt: i })
      writeDraftContent("user-1", `d${i}`, { name: `Draft ${i}`, ings: [], steps: [] })
    }
    expect(readDraftIndex("user-1")).toHaveLength(MAX_DRAFTS)
    expect(readDraftContent("user-1", "d0")).not.toBeNull()

    // One more push should evict the oldest (d0 - it sits at the back of
    // the list since every upsert unshifts its entry to the front).
    upsertDraftIndexEntry("user-1", {
      id: "d-new",
      name: "Newest",
      updatedAt: 99,
    })
    const index = readDraftIndex("user-1")
    expect(index).toHaveLength(MAX_DRAFTS)
    expect(index.some((d) => d.id === "d0")).toBe(false)
    expect(readDraftContent("user-1", "d0")).toBeNull()
  })

  it("removeDraftIndexEntry removes only the targeted draft, leaving others intact", () => {
    upsertDraftIndexEntry("user-1", { id: "a", name: "A", updatedAt: 1 })
    upsertDraftIndexEntry("user-1", { id: "b", name: "B", updatedAt: 2 })
    writeDraftContent("user-1", "a", { name: "A", ings: [], steps: [] })
    writeDraftContent("user-1", "b", { name: "B", ings: [], steps: [] })

    removeDraftIndexEntry("user-1", "a")

    const index = readDraftIndex("user-1")
    expect(index.map((d) => d.id)).toEqual(["b"])
    expect(readDraftContent("user-1", "a")).toBeNull()
    expect(readDraftContent("user-1", "b")).not.toBeNull()
  })

  it("keeps drafts scoped per user - one user's index never sees another's entries", () => {
    upsertDraftIndexEntry("user-1", { id: "a", name: "A", updatedAt: 1 })
    upsertDraftIndexEntry("user-2", { id: "z", name: "Z", updatedAt: 1 })
    expect(readDraftIndex("user-1").map((d) => d.id)).toEqual(["a"])
    expect(readDraftIndex("user-2").map((d) => d.id)).toEqual(["z"])
  })
})

describe("readDraftContent / writeDraftContent", () => {
  it("round-trips a draft's content exactly", () => {
    const content = { name: "Margarita", ings: [{ ingredientName: "Tequila" }], steps: ["Shake"] }
    writeDraftContent("user-1", "draft-1", content)
    expect(readDraftContent("user-1", "draft-1")).toEqual(content)
  })

  it("returns null for a draft that was never written", () => {
    expect(readDraftContent("user-1", "nonexistent")).toBeNull()
  })

  it("returns null (not a throw) for corrupted content JSON", () => {
    store.set("recipe-draft:user-1:draft-1", "{not json")
    expect(readDraftContent("user-1", "draft-1")).toBeNull()
  })
})

describe("shouldAutosaveDraft", () => {
  const filledForm = { name: "Daiquiri", ings: [], steps: [] }
  const blankForm = { name: "", ings: [], steps: [] }

  it("is true when draftable, a user is present, no banner is pending, and there is real content", () => {
    expect(
      shouldAutosaveDraft({
        isDraftable: true,
        userId: "user-1",
        draftBanner: null,
        formValues: filledForm,
      }),
    ).toBe(true)
  })

  it("is false while a restore banner is pending - the invariant that stops autosave from corrupting an unrestored draft", () => {
    expect(
      shouldAutosaveDraft({
        isDraftable: true,
        userId: "user-1",
        draftBanner: { name: "Some other in-progress draft" },
        formValues: filledForm,
      }),
    ).toBe(false)
  })

  it("is false when not in a draftable context (editing or cloning)", () => {
    expect(
      shouldAutosaveDraft({
        isDraftable: false,
        userId: "user-1",
        draftBanner: null,
        formValues: filledForm,
      }),
    ).toBe(false)
  })

  it("is false with no signed-in user", () => {
    expect(
      shouldAutosaveDraft({
        isDraftable: true,
        userId: null,
        draftBanner: null,
        formValues: filledForm,
      }),
    ).toBe(false)
  })

  it("is false when the form has no real content yet", () => {
    expect(
      shouldAutosaveDraft({
        isDraftable: true,
        userId: "user-1",
        draftBanner: null,
        formValues: blankForm,
      }),
    ).toBe(false)
  })
})

describe("isSelfAssignedDraft", () => {
  it("is true when the current draft id is the one this session just assigned itself", () => {
    expect(isSelfAssignedDraft("abc", "abc")).toBe(true)
  })

  it("is false for a genuinely different (returning) draft id", () => {
    expect(isSelfAssignedDraft("abc", "xyz")).toBe(false)
  })

  it("is false when there is no draft id, or nothing has been self-assigned yet", () => {
    expect(isSelfAssignedDraft(null, null)).toBe(false)
    expect(isSelfAssignedDraft("abc", null)).toBe(false)
  })
})
