// Admin nested-route migration (2026-09-14) - Admin used to be one screen
// (/admin) with a `?tab=<id>` query param and no distinct routes per
// section. Old links/bookmarks such as `/admin?tab=types&type=<id>` must
// keep working indefinitely - cheap to support, so kept rather than
// removed. This maps a legacy tab id (plus, for Ingredient Types only, the
// deeper `?type=<id>` deep-link param) to its real replacement route. Pure
// and route-agnostic - takes/returns plain strings, never a URLSearchParams
// or React Router type - so it's unit-testable without rendering
// <Routes>/<Navigate> (this project's Vitest config has no jsdom - see
// AGENTS.md).
const LEGACY_TAB_PATHS = {
  overview: "/admin",
  recipes: "/admin/recipes",
  moderation: "/admin/moderation",
  catalog: "/admin/catalog",
  types: "/admin/ingredient-types",
  onboarding: "/admin/onboarding",
  import: "/admin/import",
  requests: "/admin/requests",
  users: "/admin/users",
  invites: "/admin/invitations",
}

/**
 * Resolves a legacy `/admin?tab=<id>[&type=<id>]` URL to its replacement
 * route, or `null` when there's nothing to redirect - a plain `/admin`
 * visit with no `tab` param at all, which is already the correct Overview
 * route and must never redirect to itself (that would be a loop).
 *
 * An unrecognized tab id falls back to `/admin` rather than producing a
 * broken/blank destination - same "never fabricate, fail safe" precedent
 * as this file's sibling, ingredientEditTarget.js. `type` is only ever
 * carried onto the Ingredient Types redirect (the one legacy deep link
 * that used a second param) - a stray `type` alongside any other tab id is
 * silently dropped, matching what that param ever meant.
 *
 * @param {{ tab: string | null, type?: string | null }} params
 * @returns {string | null}
 */
export function resolveLegacyAdminPath({ tab, type }) {
  if (!tab) return null
  const path = LEGACY_TAB_PATHS[tab] ?? "/admin"
  if (path === "/admin/ingredient-types" && type) {
    return `${path}?type=${type}`
  }
  return path
}
