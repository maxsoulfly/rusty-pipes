import { describe, expect, it } from "vitest"
import { resolveLegacyAdminPath } from "./adminLegacyRoutes"

describe("resolveLegacyAdminPath", () => {
  it("returns null for a plain /admin visit with no legacy tab param - never redirects to itself", () => {
    expect(resolveLegacyAdminPath({ tab: null })).toBeNull()
    expect(resolveLegacyAdminPath({ tab: undefined })).toBeNull()
    expect(resolveLegacyAdminPath({ tab: "" })).toBeNull()
  })

  it("maps every known legacy tab id to its real route", () => {
    expect(resolveLegacyAdminPath({ tab: "overview" })).toBe("/admin")
    expect(resolveLegacyAdminPath({ tab: "recipes" })).toBe("/admin/recipes")
    expect(resolveLegacyAdminPath({ tab: "moderation" })).toBe(
      "/admin/moderation",
    )
    expect(resolveLegacyAdminPath({ tab: "catalog" })).toBe("/admin/catalog")
    expect(resolveLegacyAdminPath({ tab: "types" })).toBe(
      "/admin/ingredient-types",
    )
    expect(resolveLegacyAdminPath({ tab: "onboarding" })).toBe(
      "/admin/onboarding",
    )
    expect(resolveLegacyAdminPath({ tab: "import" })).toBe("/admin/import")
    expect(resolveLegacyAdminPath({ tab: "requests" })).toBe(
      "/admin/requests",
    )
    expect(resolveLegacyAdminPath({ tab: "users" })).toBe("/admin/users")
    expect(resolveLegacyAdminPath({ tab: "invites" })).toBe(
      "/admin/invitations",
    )
  })

  it("preserves ?type=<id> only for the types -> ingredient-types redirect", () => {
    expect(
      resolveLegacyAdminPath({ tab: "types", type: "tomato-juice" }),
    ).toBe("/admin/ingredient-types?type=tomato-juice")
  })

  it("does not carry a type param onto any other tab's redirect", () => {
    expect(
      resolveLegacyAdminPath({ tab: "recipes", type: "tomato-juice" }),
    ).toBe("/admin/recipes")
  })

  it("falls back to /admin for an unrecognized legacy tab id, rather than a broken destination", () => {
    expect(resolveLegacyAdminPath({ tab: "not-a-real-tab" })).toBe("/admin")
  })

  it("falls back to /admin for an unrecognized tab even with a type param present", () => {
    expect(resolveLegacyAdminPath({ tab: "not-a-real-tab", type: "x" })).toBe(
      "/admin",
    )
  })
})
