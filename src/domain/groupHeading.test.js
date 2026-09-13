import { describe, expect, it } from "vitest"
import { isRedundantHeading } from "./groupHeading"

describe("isRedundantHeading", () => {
  it("is redundant when the label matches the parent heading exactly", () => {
    expect(isRedundantHeading("Beer", "Beer")).toBe(true)
  })

  it("ignores case - both headings render all-caps via CSS regardless of stored casing", () => {
    expect(isRedundantHeading("beer", "BEER")).toBe(true)
  })

  it("tolerates surrounding whitespace", () => {
    expect(isRedundantHeading("  Beer ", "Beer")).toBe(true)
  })

  it("is not redundant when the label genuinely differs from the parent heading", () => {
    expect(isRedundantHeading("Rum", "Spirit")).toBe(false)
    expect(isRedundantHeading("Whiskey", "Spirit")).toBe(false)
    expect(isRedundantHeading("Sparkling Wine", "Wine")).toBe(false)
  })

  it("is not redundant when either heading is missing (never fabricates a match)", () => {
    expect(isRedundantHeading("Beer", null)).toBe(false)
    expect(isRedundantHeading(null, "Beer")).toBe(false)
    expect(isRedundantHeading(undefined, undefined)).toBe(false)
  })
})
