import { describe, expect, it } from "vitest"
import { buildFamilyClusters, byPriorityThenName } from "./myBarGrouping"

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
})

describe("buildFamilyClusters", () => {
  it("gives every parentless item its own cluster with no children, in order", () => {
    const items = [{ id: "gin" }, { id: "tequila" }]
    const clusters = buildFamilyClusters(items, new Map())
    expect(clusters).toEqual([
      { parent: { id: "gin" }, children: [] },
      { parent: { id: "tequila" }, children: [] },
    ])
  })

  it("nests a parent's children that are present in items, in childrenByParentId's own order", () => {
    const rum = { id: "rum" }
    const darkRum = { id: "dark-rum", parent_type_id: "rum" }
    const whiteRum = { id: "white-rum", parent_type_id: "rum" }
    const items = [rum, darkRum, whiteRum]
    const childrenByParentId = new Map([["rum", [darkRum, whiteRum]]])
    const clusters = buildFamilyClusters(items, childrenByParentId)
    expect(clusters).toEqual([
      { parent: rum, children: [darkRum, whiteRum] },
    ])
  })

  it("excludes a child that exists in childrenByParentId but didn't pass the caller's own filter", () => {
    const rum = { id: "rum" }
    const darkRum = { id: "dark-rum", parent_type_id: "rum" }
    const whiteRum = { id: "white-rum", parent_type_id: "rum" }
    // Only darkRum made it into `items` (e.g. search matched "dark", or only
    // Dark Rum is owned) - whiteRum must not appear anywhere in the result.
    const items = [rum, darkRum]
    const childrenByParentId = new Map([["rum", [darkRum, whiteRum]]])
    const clusters = buildFamilyClusters(items, childrenByParentId)
    expect(clusters).toEqual([{ parent: rum, children: [darkRum] }])
  })

  it("renders an orphan child (its parent didn't pass the filter) as its own top-level cluster, appended after real clusters", () => {
    const gin = { id: "gin" }
    const darkRum = { id: "dark-rum", parent_type_id: "rum" }
    // "rum" itself is NOT in items - only its child matched/owned.
    const items = [gin, darkRum]
    const clusters = buildFamilyClusters(items, new Map())
    expect(clusters).toEqual([
      { parent: gin, children: [] },
      { parent: darkRum, children: [] },
    ])
  })
})
