import { describe, expect, it } from "vitest"
import {
  defaultOnboardingGroup,
  ONBOARDING_GROUP_LABELS,
  reorderOnboardingDraft,
  resolveOnboardingSelection,
} from "./buildYourBar"

// Catalog fixture. `basic` is a household basic (assumed_available) - the
// engine already treats it as owned, so the resolver must drop it from both
// outputs. `deleted` is intentionally NOT here, to exercise a row pointing
// at a since-deleted type.
const types = [
  { id: "gin", name: "Gin" },
  { id: "vodka", name: "Vodka" },
  { id: "bourbon", name: "Bourbon" },
  { id: "soda", name: "Soda Water" },
  { id: "coke", name: "Coke" },
  { id: "tonic", name: "Tonic Water" },
  { id: "lemon", name: "Lemon Juice" },
  { id: "lime", name: "Lime Juice" },
  { id: "syrup", name: "Simple Syrup" },
  { id: "ice", name: "Ice", assumed_available: true },
]

// A representative seeded config: 3 groups, 6 is_initial, position-ordered.
const rows = [
  {
    ingredient_type_id: "gin",
    position: 1,
    is_initial: true,
    group_label: "Spirits",
  },
  {
    ingredient_type_id: "vodka",
    position: 2,
    is_initial: true,
    group_label: "Spirits",
  },
  {
    ingredient_type_id: "bourbon",
    position: 3,
    is_initial: false,
    group_label: "Spirits",
  },
  {
    ingredient_type_id: "soda",
    position: 8,
    is_initial: true,
    group_label: "Mixers",
  },
  {
    ingredient_type_id: "coke",
    position: 9,
    is_initial: true,
    group_label: "Mixers",
  },
  {
    ingredient_type_id: "tonic",
    position: 10,
    is_initial: false,
    group_label: "Mixers",
  },
  {
    ingredient_type_id: "lemon",
    position: 11,
    is_initial: true,
    group_label: "Kitchen basics",
  },
  {
    ingredient_type_id: "lime",
    position: 12,
    is_initial: true,
    group_label: "Kitchen basics",
  },
  {
    ingredient_type_id: "syrup",
    position: 13,
    is_initial: false,
    group_label: "Kitchen basics",
  },
]

const names = (list) => list.map((t) => t.name)

describe("resolveOnboardingSelection", () => {
  it("returns the 3 fixed group labels in fixed order, whatever the row order", () => {
    const shuffled = [...rows].reverse()
    const { groups } = resolveOnboardingSelection(shuffled, types)
    expect(groups.map(([label]) => label)).toEqual(ONBOARDING_GROUP_LABELS)
  })

  it("buckets survivors by group_label, each bucket sorted by position", () => {
    const { groups } = resolveOnboardingSelection([...rows].reverse(), types)
    expect(groups).toEqual([
      ["Spirits", [types[0], types[1], types[2]]],
      ["Mixers", [types[3], types[4], types[5]]],
      ["Kitchen basics", [types[6], types[7], types[8]]],
    ])
  })

  it("six = the is_initial rows in overall position order", () => {
    const { six } = resolveOnboardingSelection(rows, types)
    expect(names(six)).toEqual([
      "Gin",
      "Vodka",
      "Soda Water",
      "Coke",
      "Lemon Juice",
      "Lime Juice",
    ])
  })

  it("backfills six from non-initial rows (position order) when fewer than 6 are is_initial", () => {
    const fewInitial = rows.map((r) => ({
      ...r,
      is_initial:
        r.ingredient_type_id === "gin" || r.ingredient_type_id === "vodka",
    }))
    const { six } = resolveOnboardingSelection(fewInitial, types)
    // Gin + Vodka first (is_initial), then Bourbon, Soda Water, Coke, Tonic
    // Water by position.
    expect(names(six)).toEqual([
      "Gin",
      "Vodka",
      "Bourbon",
      "Soda Water",
      "Coke",
      "Tonic Water",
    ])
  })

  it("does not duplicate an is_initial row when the backfill pass reaches it", () => {
    const { six } = resolveOnboardingSelection(rows, types)
    expect(new Set(six.map((t) => t.id)).size).toBe(six.length)
  })

  it("caps six at the first 6 by position when more than 6 rows are is_initial", () => {
    const allInitial = rows.map((r) => ({ ...r, is_initial: true }))
    const { six } = resolveOnboardingSelection(allInitial, types)
    expect(six).toHaveLength(6)
    expect(names(six)).toEqual([
      "Gin",
      "Vodka",
      "Bourbon",
      "Soda Water",
      "Coke",
      "Tonic Water",
    ])
  })

  it("returns fewer than 6 (no gap, no crash) when fewer than 6 rows are eligible", () => {
    const shortConfig = rows.slice(0, 3) // Gin, Vodka, Bourbon
    const { six, groups } = resolveOnboardingSelection(shortConfig, types)
    expect(names(six)).toEqual(["Gin", "Vodka", "Bourbon"])
    expect(groups.map(([label]) => label)).toEqual(ONBOARDING_GROUP_LABELS)
    expect(names(groups[1][1])).toEqual([]) // Mixers empty, still present
  })

  it("drops a row whose ingredient_type was deleted since seeding, from both outputs", () => {
    const withDeleted = [
      ...rows,
      {
        ingredient_type_id: "ghost",
        position: 4,
        is_initial: true,
        group_label: "Spirits",
      },
    ]
    const { six, groups } = resolveOnboardingSelection(withDeleted, types)
    expect(six.some((t) => t.id === "ghost")).toBe(false)
    expect(groups[0][1].some((t) => t.id === "ghost")).toBe(false)
    // The deleted is_initial row does not consume a slot - six still fills.
    expect(six).toHaveLength(6)
  })

  it("excludes an assumed_available (household basic) type from both outputs", () => {
    const withIce = [
      ...rows,
      {
        ingredient_type_id: "ice",
        position: 5,
        is_initial: true,
        group_label: "Kitchen basics",
      },
    ]
    const { six, groups } = resolveOnboardingSelection(withIce, types)
    expect(six.some((t) => t.id === "ice")).toBe(false)
    expect(groups[2][1].some((t) => t.id === "ice")).toBe(false)
  })

  it("a flagged (now-excluded) initial member pulls the next backfill candidate up into six", () => {
    // Same config as the household-basic test, but Bourbon is is_initial and
    // Ice would have been one of the six. Ice drops -> Bourbon (next by
    // position) takes the freed slot rather than the grid rendering 5.
    const cfg = [
      ...rows.map((r) => ({
        ...r,
        is_initial: r.ingredient_type_id === "bourbon" ? true : r.is_initial,
      })),
      {
        ingredient_type_id: "ice",
        position: 5,
        is_initial: true,
        group_label: "Kitchen basics",
      },
    ]
    const { six } = resolveOnboardingSelection(cfg, types)
    expect(six).toHaveLength(6)
    expect(six.some((t) => t.id === "ice")).toBe(false)
    expect(six.some((t) => t.id === "bourbon")).toBe(true)
  })

  it("every type in six also appears in exactly one groups bucket", () => {
    const { six, groups } = resolveOnboardingSelection(rows, types)
    const groupIds = groups.flatMap(([, list]) => list.map((t) => t.id))
    for (const t of six) {
      expect(groupIds.filter((id) => id === t.id)).toHaveLength(1)
    }
  })

  it("handles an empty config without crashing (no tiles, 3 empty groups)", () => {
    const { six, groups } = resolveOnboardingSelection([], types)
    expect(six).toEqual([])
    expect(groups).toEqual([
      ["Spirits", []],
      ["Mixers", []],
      ["Kitchen basics", []],
    ])
  })

  it("tolerates null/undefined rows and types", () => {
    expect(resolveOnboardingSelection(null, null)).toEqual({
      six: [],
      groups: [
        ["Spirits", []],
        ["Mixers", []],
        ["Kitchen basics", []],
      ],
    })
  })
})

describe("defaultOnboardingGroup", () => {
  it("maps a spirit category to Spirits", () => {
    expect(defaultOnboardingGroup("Base Spirit")).toBe("Spirits")
    expect(defaultOnboardingGroup("Spirits")).toBe("Spirits")
  })

  it("maps a mixer category to Mixers", () => {
    expect(defaultOnboardingGroup("Mixer")).toBe("Mixers")
    expect(defaultOnboardingGroup("Carbonated Mixers")).toBe("Mixers")
  })

  it("falls back to Kitchen basics for anything else, including null/empty", () => {
    expect(defaultOnboardingGroup("Juice")).toBe("Kitchen basics")
    expect(defaultOnboardingGroup("Bitters")).toBe("Kitchen basics")
    expect(defaultOnboardingGroup("")).toBe("Kitchen basics")
    expect(defaultOnboardingGroup(null)).toBe("Kitchen basics")
    expect(defaultOnboardingGroup(undefined)).toBe("Kitchen basics")
  })

  it("always returns one of the three fixed labels", () => {
    for (const name of ["Spirit", "Mixer", "Whatever", ""]) {
      expect(ONBOARDING_GROUP_LABELS).toContain(defaultOnboardingGroup(name))
    }
  })
})

describe("reorderOnboardingDraft", () => {
  const rows = [
    { typeId: "gin", groupLabel: "Spirits", isInitial: true },
    { typeId: "vodka", groupLabel: "Spirits", isInitial: true },
    { typeId: "rum", groupLabel: "Spirits", isInitial: false },
    { typeId: "soda", groupLabel: "Mixers", isInitial: true },
    { typeId: "coke", groupLabel: "Mixers", isInitial: false },
  ]

  it("moves a dragged row down to where the target sits, within its group", () => {
    const out = reorderOnboardingDraft(rows, "gin", "rum")
    expect(out.map((r) => r.typeId)).toEqual([
      "vodka",
      "rum",
      "gin",
      "soda",
      "coke",
    ])
  })

  it("moves a dragged row up to the target's slot", () => {
    const out = reorderOnboardingDraft(rows, "rum", "gin")
    expect(out.map((r) => r.typeId)).toEqual([
      "rum",
      "gin",
      "vodka",
      "soda",
      "coke",
    ])
  })

  it("is a no-op (same reference) across groups - the dropdown handles that", () => {
    expect(reorderOnboardingDraft(rows, "gin", "coke")).toBe(rows)
  })

  it("is a no-op for an unknown id or a drag onto itself", () => {
    expect(reorderOnboardingDraft(rows, "gin", "gin")).toBe(rows)
    expect(reorderOnboardingDraft(rows, "ghost", "gin")).toBe(rows)
    expect(reorderOnboardingDraft(rows, "gin", "ghost")).toBe(rows)
  })

  it("does not mutate the input array", () => {
    const snapshot = rows.map((r) => r.typeId)
    reorderOnboardingDraft(rows, "gin", "rum")
    expect(rows.map((r) => r.typeId)).toEqual(snapshot)
  })
})
