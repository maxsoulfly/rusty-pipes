import { describe, expect, it } from "vitest"
import { byPriorityThenName } from "./ingredientPriority"

describe("byPriorityThenName", () => {
  it("orders essential before common before specialized before niche", () => {
    const items = [
      { name: "Z", bar_priority: "niche" },
      { name: "Y", bar_priority: "specialized" },
      { name: "X", bar_priority: "common" },
      { name: "W", bar_priority: "essential" },
    ]
    expect([...items].sort(byPriorityThenName).map((i) => i.name)).toEqual([
      "W",
      "X",
      "Y",
      "Z",
    ])
  })

  it("breaks a tie within the same priority alphabetically by name", () => {
    const items = [
      { name: "Vodka", bar_priority: "essential" },
      { name: "Gin", bar_priority: "essential" },
    ]
    expect([...items].sort(byPriorityThenName).map((i) => i.name)).toEqual([
      "Gin",
      "Vodka",
    ])
  })

  it("sorts an unrecognized/missing priority last, not first", () => {
    const items = [
      { name: "Absinthe", bar_priority: "weird-value" },
      { name: "Gin", bar_priority: "essential" },
    ]
    expect([...items].sort(byPriorityThenName).map((i) => i.name)).toEqual([
      "Gin",
      "Absinthe",
    ])
  })

  it("treats a completely missing bar_priority the same as unrecognized (sorts last)", () => {
    const items = [{ name: "NoPriority" }, { name: "Gin", bar_priority: "essential" }]
    expect([...items].sort(byPriorityThenName).map((i) => i.name)).toEqual([
      "Gin",
      "NoPriority",
    ])
  })
})
