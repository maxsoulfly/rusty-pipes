import { useEffect, useState } from "react"
import clsx from "clsx"
import {
  Navigate,
  NavLink,
  Outlet,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom"
import { IconChevD } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import { resolveLegacyAdminPath } from "@/domain/adminLegacyRoutes"
import {
  buildIngredientImportPrompt,
  toIngredientTypeRow,
  validateIngredientImport,
} from "@/schemas/ingredientImport"
import {
  fetchPendingIngredientRequests,
  resolveIngredientRequest,
} from "@/services/ingredientRequests"
import {
  createIngredientTypes,
  saveIngredientType,
} from "@/services/ingredientTypes"
import {
  deriveInvitationStatus,
  fetchInvitations,
} from "@/services/invitations"
import {
  demoteRecipeToCommunity,
  fetchCommunityRecipes,
  promoteRecipeToClassic,
} from "@/services/recipes"
import { fetchAllUsers } from "@/services/membership"
import { CatalogTab } from "@/components/admin/CatalogTab"
import { ClassicRecipesTab } from "@/components/admin/ClassicRecipesTab"
import { ImportTab } from "@/components/admin/ImportTab"
import { InvitesTab } from "@/components/admin/InvitesTab"
import { ModerationTab } from "@/components/admin/ModerationTab"
import { OnboardingTab } from "@/components/admin/OnboardingTab"
import { OverviewTab } from "@/components/admin/OverviewTab"
import { RequestsTab } from "@/components/admin/RequestsTab"
import { TypesTab } from "@/components/admin/TypesTab"
import { UsersTab } from "@/components/admin/UsersTab"

// Admin nested-route migration (2026-09-14) - this file used to BE the
// single /admin screen, switching what it rendered via local `tab` state
// and a one-time `?tab=`/`?type=` URL read (see git history). It's now the
// shared layout for real nested routes (/admin, /admin/recipes, /admin/
// ingredient-types, ...) declared in App.jsx: TopBar + tab nav + an
// <Outlet> for whichever admin section route matched. `RequireStaff` (and,
// for the three admin-only sections below, `RequireAdmin`) wraps this
// layout's own route in App.jsx, not anything in here - a non-staff/
// non-admin visitor never gets far enough to mount this component or any
// child route at all, so there's nothing left to gate inside it.
//
// The genuinely cross-section state this screen owned before the route
// split - ingredient batch-import state (shared by Requests "Add to
// catalog," Ingredient Types "+ Add," and Import itself), community/
// classic recipe state (shared by Moderation's Promote and Classic
// Recipes/Overview), and every count Overview/the nav badge read - all
// stays lifted HERE, unchanged, and is handed to whichever child route is
// active via <Outlet context={...}>, the same "call once, share via
// context" mechanism App.jsx's own AppShell already uses one level up for
// catalog/inventory/recipes. Recipe and Product batch import are the one
// exception, already living in their own hooks with zero cross-section
// coupling (see docs/plans/archive/admin-screen-modularization.md) - that
// stays exactly as it is, untouched by this migration.
//
// Grouped by what the tab is *for*, not the order each was built in:
// Overview first, then recipe content (Classic Recipes, Moderation -
// community recipe moderation), then catalog/taxonomy tools (Catalog,
// Ingredient Types, Batch Import, Requests - Requests feeds directly into
// Ingredient Types/Batch Import), then membership admin (Users,
// Invitations) last. adminOnly tabs are invisible to a moderator - full
// ingredient-catalog authoring + the promote/demote/unpublish trio is
// moderator's scope, but Users/Invitations/Onboarding management stays
// admin-only (RequireAdmin in App.jsx enforces this at the route level,
// not just nav visibility - see App.jsx's own comment).
const TABS = [
  { id: "overview", label: "Overview", path: "/admin" },
  { id: "recipes", label: "Classic Recipes", path: "/admin/recipes" },
  { id: "moderation", label: "Moderation", path: "/admin/moderation" },
  { id: "catalog", label: "Catalog", path: "/admin/catalog" },
  {
    id: "types",
    label: "Ingredient Types",
    path: "/admin/ingredient-types",
  },
  {
    id: "onboarding",
    label: "Onboarding ingredients",
    path: "/admin/onboarding",
    adminOnly: true,
  },
  { id: "import", label: "Batch Import", path: "/admin/import" },
  { id: "requests", label: "Requests", path: "/admin/requests" },
  { id: "users", label: "Users", path: "/admin/users", adminOnly: true },
  {
    id: "invites",
    label: "Invitations",
    path: "/admin/invitations",
    adminOnly: true,
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { catalog, computed, refetchRecipes, userId, isAdmin } =
    useOutletContext()
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  // Real navigation now, not a state switch - used by Overview's card taps
  // and by startSingleAddFromRequest's cross-section jump below. Looks the
  // tab id up in TABS rather than taking a raw path, so every caller keeps
  // using the same short ids this screen has always used internally.
  const goToTab = (id) =>
    navigate(TABS.find((t) => t.id === id)?.path ?? "/admin")

  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(true)

  // Several tabs (Catalog especially - Glasses/Taste Tags/Cocktail
  // Families/Ingredient Categories/Liquid Colors all stacked) run long
  // enough to scroll well past the tab bar, with no way back to it short of
  // scrolling all the way up by hand.
  const [showScrollTop, setShowScrollTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Batch Import covers three entities: "ingredients" (with its own
  // single/batch sub-modes below), "recipes", and "products" - the latter
  // two are batch/AI only, since both already have a member-facing
  // equivalent for one-off creation (New Recipe, My Bar's Add Product), so a
  // duplicate quick-add here would be redundant.
  const [importEntity, setImportEntity] = useState("ingredients")

  // Ingredient-adding has two modes: "single" (a quick form for the common
  // case of adding one thing) and "batch" (AI-formatted JSON, for adding
  // several at once).
  const [importMode, setImportMode] = useState("single")
  const [importSuccessMessage, setImportSuccessMessage] = useState(null)

  const [singleName, setSingleName] = useState("")
  // No default category - defaulting to the first one (Spirit, since it
  // sorts first) meant every ingredient silently started out mis-filed as a
  // spirit unless you noticed and changed it. Forcing an explicit choice
  // also means the parent-type list can't show irrelevant spirit styles
  // while adding something like a juice or mixer.
  const [singleCategoryId, setSingleCategoryId] = useState("")
  const [singleParentTypeId, setSingleParentTypeId] = useState("")
  const [singleBarPriority, setSingleBarPriority] = useState("common")
  const [singleColor, setSingleColor] = useState("")
  const [singleDescription, setSingleDescription] = useState("")
  const [singleSaving, setSingleSaving] = useState(false)
  const [singleError, setSingleError] = useState(null)

  const [batchPhase, setBatchPhase] = useState("paste")
  const [importJson, setImportJson] = useState("")
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  // Recipe and Product batch import each own their state locally now
  // (useRecipeBatchImport/useProductBatchImport, called inside
  // ImportRecipes.jsx/ImportProducts.jsx) - unlike Ingredients above, neither
  // has any cross-tab coupling, so there was nothing keeping them lifted
  // here. See docs/plans/archive/admin-screen-modularization.md.

  // Moderation is real: currently-published community recipes, with an
  // Unpublish action. There's no pre-publish review queue in the spec
  // (publishing is immediate) - the original mock's "pending/approve/reject"
  // flow didn't map to anything real and has been dropped rather than faked.
  // Kept at the shell level (rather than local to ModerationTab) because
  // Promote crosses into it - see handlePromote below.
  const [communityRecipes, setCommunityRecipes] = useState([])
  const [communityLoading, setCommunityLoading] = useState(true)

  const loadCommunityRecipes = () => {
    setCommunityLoading(true)
    fetchCommunityRecipes().then((data) => {
      setCommunityRecipes(data)
      setCommunityLoading(false)
    })
  }

  useEffect(() => {
    loadCommunityRecipes()
  }, [])

  // Promote a published community recipe into the classic catalog - the
  // admin_promote_recipe_to_classic() function does the real work (nulls
  // owner_id, sets original_owner_id for credit - see
  // 20260823130000_classic_promotion.sql); this just needs to refetch both
  // lists the promoted row moves between (communityRecipes above, and
  // `computed`/classicRecipes below via refetchRecipes) - real cross-tab
  // coupling between Moderation and Classic Recipes, so this stays here
  // rather than becoming local to either tab.
  const [confirmPromote, setConfirmPromote] = useState(null)
  const [promoting, setPromoting] = useState(false)
  const [promoteError, setPromoteError] = useState(null)

  const handlePromote = async (id) => {
    setPromoting(true)
    setPromoteError(null)
    try {
      await promoteRecipeToClassic(id)
      loadCommunityRecipes()
      await refetchRecipes()
      setConfirmPromote(null)
    } catch (err) {
      setPromoteError(err.message)
    } finally {
      setPromoting(false)
    }
  }

  // Classic Recipes tab: the ownerless catalog, split out from Community
  // (published member recipes) into its own admin list per the user's
  // request - browsing/editing/deleting classics through Library/Detail
  // worked, but reads and feels like a member screen, not an admin one, and
  // there was no way to delete a classic at all despite the RLS "recipes:
  // delete" policy already allowing it for owner_id is null rows. Derived
  // straight from `computed` (no separate fetch) - kept here rather than in
  // ClassicRecipesTab since OverviewTab's count also needs it.
  const classicRecipes = [...computed]
    .filter((r) => r.source === "classic")
    .sort((a, b) => a.name.localeCompare(b.name))

  // Demote a promoted classic back to an ordinary community recipe under
  // its original author - only possible when originalOwnerId is set (the
  // function itself also refuses a "true" classic with no original
  // community author to hand it back to, this is just the UI reflecting
  // that same rule so there's nothing to click that can only ever fail).
  // Same cross-tab reasoning as handlePromote above, in reverse.
  const [confirmDemoteId, setConfirmDemoteId] = useState(null)
  const [demoting, setDemoting] = useState(false)
  const [demoteError, setDemoteError] = useState(null)

  const handleDemote = async (id) => {
    setDemoting(true)
    setDemoteError(null)
    try {
      await demoteRecipeToCommunity(id)
      await refetchRecipes()
      loadCommunityRecipes()
      setConfirmDemoteId(null)
    } catch (err) {
      setDemoteError(err.message)
    } finally {
      setDemoting(false)
    }
  }

  // Users tab data fetch - kept here (rather than local to UsersTab) simply
  // to match this file's established pattern of fetching once per
  // AdminLayout mount; nothing else reads `users`.
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

  const loadUsers = () => {
    setUsersLoading(true)
    fetchAllUsers().then((data) => {
      setUsers(data)
      setUsersLoading(false)
    })
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Requests: members' suggestions for missing ingredient types (see
  // RequestIngredientScreen.jsx). Fulfilling one doesn't auto-create the
  // type - the admin still goes through Batch Import for that, since a
  // request is just a name/note, not a validated category+hierarchy. Kept
  // at the shell level since OverviewTab's count also needs pendingRequests.
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const loadPendingRequests = () => {
    setRequestsLoading(true)
    fetchPendingIngredientRequests().then((data) => {
      setPendingRequests(data)
      setRequestsLoading(false)
    })
  }

  useEffect(() => {
    loadPendingRequests()
  }, [])

  // Jumps to the single-add form, optionally pre-filled with a request's
  // name. singleFromRequestId is threaded through so a successful save can
  // also mark the request fulfilled - originally these were kept as two
  // separate manual steps, but real usage found that confusing ("I added
  // it, why does it still show as pending, do I need to press + again?"),
  // with no actual benefit: nothing meaningfully different could happen
  // between "add succeeded" and "mark fulfilled" that would warrant a
  // separate confirm. Also the Ingredient Types tab's own "+ Add" button,
  // which has no request behind it - resets importEntity too, since
  // without that a prior visit to Recipes/Products import would leave this
  // deep link landing on the wrong sub-tab. Called from both RequestsTab and
  // TypesTab, and reaches into Batch Import's own state - stays at the
  // shell level rather than becoming local to either tab. Now a real route
  // navigation (goToTab) instead of a local setTab - the state it primes
  // still lives here and is read by AdminImportRoute via Outlet context, so
  // the prefill survives the route transition exactly as it survived a tab
  // switch before.
  const [singleFromRequestId, setSingleFromRequestId] = useState(null)
  const startSingleAddFromRequest = (name = "", requestId = null) => {
    setImportSuccessMessage(null)
    setImportEntity("ingredients")
    setImportMode("single")
    setSingleName(name)
    setSingleFromRequestId(requestId)
    goToTab("import")
  }

  const loadInvitations = () => {
    setInvitesLoading(true)
    fetchInvitations().then((data) => {
      setInvites(data)
      setInvitesLoading(false)
    })
  }

  useEffect(() => {
    loadInvitations()
  }, [])

  const importPrompt = buildIngredientImportPrompt({
    categories: catalog.categories,
    types: catalog.types,
    aliases: catalog.aliases,
    liquidColors: catalog.liquidColors,
  })

  const copyImportPrompt = () => {
    navigator.clipboard.writeText(importPrompt).catch(() => {})
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const runImportValidation = () => {
    let parsed
    try {
      parsed = JSON.parse(importJson)
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array")
    } catch (err) {
      setImportResult({ parseError: err.message })
      setBatchPhase("results")
      return
    }
    const validation = validateIngredientImport(parsed, {
      categories: catalog.categories,
      types: catalog.types,
      aliases: catalog.aliases,
      ingredientPreparations: catalog.ingredientPreparations,
    })
    setImportResult(validation)
    setBatchPhase("results")
  }

  // Two-phase because save_ingredient_type() only ever UPDATEs an existing
  // row (it raises if p_type_id doesn't already exist - see its own
  // migration comment) - it cannot create one, so a rich import can't do
  // everything in a single call the way editing an existing type can.
  //
  // Phase 1: bulk-insert every valid row's plain ingredient_types columns
  // only (toIngredientTypeRow() strips aliases/canProvide/canBeReplacedBy/
  // homemadePreparation - none of those are columns on this table). One
  // statement, atomic - either every row in this batch lands or none do,
  // exactly as it always has.
  //
  // Phase 2: for whichever of those rows actually asked for aliases/"Can
  // provide"/"Can be replaced by"/a homemade preparation, attach them
  // through the SAME atomic save_ingredient_type() RPC the Ingredient Type
  // editor itself uses - one transaction per type, so a type never ends up
  // with half its relationships (save_ingredient_type() rolls its own call
  // back entirely on any failure). A failure here never touches phase 1's
  // already-committed base row for ANY type, including this one - the type
  // simply exists without its requested extras, fully editable normally,
  // and is named in the result below rather than silently dropped.
  const handleCommitImport = async () => {
    if (!importResult?.results) return
    const validResults = importResult.results.filter((r) => r.valid)
    if (validResults.length === 0) return
    setImporting(true)
    try {
      const inserted = await createIngredientTypes(
        validResults.map((r) => toIngredientTypeRow(r.resolved)),
      )
      const idByName = new Map(inserted.map((row) => [row.name, row.id]))

      const relationshipFailures = []
      for (const { resolved } of validResults) {
        const hasRelationships =
          resolved.aliases.length > 0 ||
          resolved.conversions.length > 0 ||
          resolved.substitutes.length > 0 ||
          resolved.preparation != null
        if (!hasRelationships) continue
        const typeId = idByName.get(resolved.name)
        if (!typeId) continue // every valid row was just inserted above
        try {
          await saveIngredientType({
            typeId,
            name: resolved.name,
            categoryId: resolved.category_id,
            parentTypeId: resolved.parent_type_id,
            barPriority: resolved.bar_priority,
            assumedAvailable: resolved.assumed_available,
            color: resolved.color,
            description: resolved.description,
            shape: resolved.shape ?? "spirit_bottle",
            aliases: resolved.aliases,
            conversions: resolved.conversions,
            substitutes: resolved.substitutes,
            preparation: resolved.preparation,
          })
        } catch (err) {
          relationshipFailures.push({ name: resolved.name, message: err.message })
        }
      }

      await catalog.refetch()
      const summary = `Imported ${inserted.length} ingredient type${
        inserted.length === 1 ? "" : "s"
      }.`
      if (relationshipFailures.length > 0) {
        setImportSuccessMessage(summary)
        setImportResult({
          ...importResult,
          commitError: `${relationshipFailures.length} type${
            relationshipFailures.length === 1 ? "" : "s"
          } imported without its extra details - fix in the Ingredient Type editor: ${relationshipFailures
            .map((f) => `${f.name} (${f.message})`)
            .join("; ")}`,
        })
      } else {
        setImportSuccessMessage(summary)
        setBatchPhase("paste")
        setImportJson("")
        setImportResult(null)
      }
    } catch (err) {
      setImportResult({ ...importResult, commitError: err.message })
    } finally {
      setImporting(false)
    }
  }

  // Reuses the same validator batch import uses (single-item array), so a
  // duplicate/unknown-value mistake is caught the same way in both paths
  // instead of a separately hand-rolled check that could drift.
  const handleAddSingle = async () => {
    setSingleSaving(true)
    setSingleError(null)
    const categoryName =
      catalog.categories.find((c) => c.id === singleCategoryId)?.name ?? ""
    const parentTypeName = singleParentTypeId
      ? catalog.types.find((t) => t.id === singleParentTypeId)?.name
      : undefined
    const { results } = validateIngredientImport(
      [
        {
          name: singleName.trim(),
          category: categoryName,
          parentType: parentTypeName,
          barPriority: singleBarPriority,
          color: singleColor.trim() || undefined,
          description: singleDescription.trim() || undefined,
        },
      ],
      {
        categories: catalog.categories,
        types: catalog.types,
        aliases: catalog.aliases,
        ingredientPreparations: catalog.ingredientPreparations,
      },
    )
    const [result] = results
    if (!result.valid) {
      setSingleError(result.errors.join("; "))
      setSingleSaving(false)
      return
    }
    try {
      // This form has no fields for aliases/canProvide/canBeReplacedBy/a
      // homemade preparation, so result.resolved always has them empty -
      // toIngredientTypeRow() strips those (always-present-but-empty) keys
      // the same way the batch path does, purely for a consistent, correct
      // insert payload; there is never a second (relationship-attaching)
      // phase to run for this path.
      await createIngredientTypes([toIngredientTypeRow(result.resolved)])
      await catalog.refetch()
      let message = `Added "${result.resolved.name}".`
      if (singleFromRequestId) {
        await resolveIngredientRequest(singleFromRequestId, "fulfilled")
        loadPendingRequests()
        setSingleFromRequestId(null)
        message += " The matching request is marked fulfilled too."
      }
      setImportSuccessMessage(message)
      setSingleName("")
      setSingleParentTypeId("")
      setSingleColor("")
      setSingleDescription("")
    } catch (err) {
      setSingleError(err.message)
    } finally {
      setSingleSaving(false)
    }
  }

  // Handed down to whichever child route is active via <Outlet context>,
  // same mechanism App.jsx's own AppShell uses one level up - every value a
  // tab/route needs, computed/owned exactly once here regardless of how
  // many sections read it (classicRecipes, communityRecipes, users,
  // invites, pendingRequests all cross section boundaries - see this file's
  // top comment).
  const adminContext = {
    catalog,
    computed,
    refetchRecipes,
    userId,
    isAdmin,
    goToTab,
    classicRecipes,
    communityRecipes,
    communityLoading,
    loadCommunityRecipes,
    confirmPromote,
    promoting,
    promoteError,
    setConfirmPromote,
    handlePromote,
    confirmDemoteId,
    demoting,
    demoteError,
    setConfirmDemoteId,
    handleDemote,
    users,
    usersLoading,
    loadUsers,
    invites,
    setInvites,
    invitesLoading,
    pendingRequests,
    requestsLoading,
    loadPendingRequests,
    startSingleAddFromRequest,
    importEntity,
    setImportEntity,
    importMode,
    setImportMode,
    importSuccessMessage,
    setImportSuccessMessage,
    setSingleFromRequestId,
    singleName,
    setSingleName,
    singleCategoryId,
    setSingleCategoryId,
    singleParentTypeId,
    setSingleParentTypeId,
    singleBarPriority,
    setSingleBarPriority,
    singleColor,
    setSingleColor,
    singleDescription,
    setSingleDescription,
    singleSaving,
    singleError,
    handleAddSingle,
    batchPhase,
    setBatchPhase,
    importPrompt,
    promptCopied,
    copyImportPrompt,
    importJson,
    setImportJson,
    runImportValidation,
    importResult,
    setImportResult,
    importing,
    handleCommitImport,
  }

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      {/* TopBar is already sticky on its own (Nav.jsx) - wrapping it and the
          tab row together in one sticky container keeps both pinned as a
          unit, rather than the tab row scrolling away on a long tab
          (Catalog especially) while the title bar alone stays put. */}
      <div className="sticky top-0 z-20 bg-bg2">
        <TopBar title="Admin Dashboard" onBack={() => navigate(-1)} />

        <div className="flex border-b border-bdr bg-bg2 overflow-x-auto">
          {visibleTabs.map((t) => (
            <NavLink
              key={t.id}
              to={t.path}
              end={t.id === "overview"}
              className={({ isActive }) =>
                clsx(
                  "py-3 px-4 bg-transparent border-none border-b-2 cursor-pointer text-[13px] font-display whitespace-nowrap transition-all duration-150 no-underline",
                  isActive
                    ? "border-violet text-violet font-bold"
                    : "border-transparent text-tx2 font-normal",
                )
              }
            >
              {t.label}
              {t.id === "requests" && pendingRequests.length > 0
                ? ` (${pendingRequests.length})`
                : ""}
            </NavLink>
          ))}
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          title="Back to top"
          className="glow-cyan fixed bottom-24 right-4 z-30 w-11 h-11 rounded-full bg-cyan border-none cursor-pointer flex items-center justify-center text-[#07091a]"
        >
          <IconChevD size={20} className="rotate-180" />
        </button>
      )}

      <div className="p-5">
        <Outlet context={adminContext} />
      </div>
    </div>
  )
}

// One thin route-element component per admin section below - each reads
// only the slice of adminContext it needs and renders the same tab
// component with the same props AdminLayout used to pass directly, so
// every existing CatalogTab/ClassicRecipesTab/... keeps its exact current
// prop contract. This is deliberately mechanical (no new behavior, no
// re-modularization) - the only thing that changed is that a route in
// App.jsx now decides which one mounts, instead of AdminLayout's own
// removed `tab === "..."` switch.

// The Overview route is also `/admin` itself, so it's the one place the
// legacy `?tab=`/`?type=` compatibility redirect needs to live (every old
// link only ever pointed at bare /admin - there was only ever one route to
// begin with). A plain `/admin` visit (no `tab` param) falls through to
// Overview exactly as before.
export function AdminOverviewRoute() {
  const [searchParams] = useSearchParams()
  const ctx = useOutletContext()
  const legacyRedirect = resolveLegacyAdminPath({
    tab: searchParams.get("tab"),
    type: searchParams.get("type"),
  })
  if (legacyRedirect) return <Navigate to={legacyRedirect} replace />
  return (
    <OverviewTab
      classicCount={ctx.classicRecipes.length}
      communityCount={ctx.communityRecipes.length}
      pendingRequestsCount={ctx.pendingRequests.length}
      ingredientTypesCount={ctx.catalog.types.length}
      activeInvitesCount={
        ctx.isAdmin
          ? ctx.invites.filter((i) => deriveInvitationStatus(i) === "active")
              .length
          : null
      }
      onGoToTab={ctx.goToTab}
    />
  )
}

export function AdminRecipesRoute() {
  const {
    classicRecipes,
    refetchRecipes,
    isAdmin,
    confirmDemoteId,
    demoting,
    demoteError,
    setConfirmDemoteId,
    handleDemote,
  } = useOutletContext()
  return (
    <ClassicRecipesTab
      classicRecipes={classicRecipes}
      refetchRecipes={refetchRecipes}
      isAdmin={isAdmin}
      confirmDemoteId={confirmDemoteId}
      demoting={demoting}
      demoteError={demoteError}
      onSetConfirmDemote={setConfirmDemoteId}
      onDemote={handleDemote}
    />
  )
}

export function AdminModerationRoute() {
  const {
    communityRecipes,
    communityLoading,
    loadCommunityRecipes,
    confirmPromote,
    promoting,
    promoteError,
    setConfirmPromote,
    handlePromote,
  } = useOutletContext()
  return (
    <ModerationTab
      communityRecipes={communityRecipes}
      communityLoading={communityLoading}
      onCommunityRecipesChanged={loadCommunityRecipes}
      confirmPromote={confirmPromote}
      promoting={promoting}
      promoteError={promoteError}
      onSetConfirmPromote={setConfirmPromote}
      onPromote={handlePromote}
    />
  )
}

export function AdminCatalogRoute() {
  const { catalog } = useOutletContext()
  return <CatalogTab catalog={catalog} />
}

// `?type=<id>` (Ingredient Detail Stage I.4's "Edit ingredient" shortcut,
// now `/admin/ingredient-types?type=<id>`) is read right here, once, rather
// than lifted to AdminLayout - it's single-section-scoped, unlike every
// other value in adminContext. TypesTab itself is unchanged: it still just
// takes `initialEditingTypeId` as a plain prop and resolves the deep-linked
// search text with the same existing resolveDeepLinkedSearchQuery() (see
// src/domain/ingredientEditTarget.js) - that logic was already URL-shape
// agnostic and needed no changes for this migration. A manual tab click
// (via the nav bar's plain <NavLink to="/admin/ingredient-types">) never
// carries a `?type=` here in the first place, so it lands on the clean,
// full-list starting state exactly as required.
export function AdminIngredientTypesRoute() {
  const { catalog, startSingleAddFromRequest } = useOutletContext()
  const [searchParams] = useSearchParams()
  return (
    <TypesTab
      catalog={catalog}
      onAddNew={() => startSingleAddFromRequest()}
      initialEditingTypeId={searchParams.get("type")}
    />
  )
}

export function AdminOnboardingRoute() {
  const { catalog } = useOutletContext()
  return <OnboardingTab catalog={catalog} />
}

export function AdminImportRoute() {
  const ctx = useOutletContext()
  return (
    <ImportTab
      catalog={ctx.catalog}
      computed={ctx.computed}
      refetchRecipes={ctx.refetchRecipes}
      isAdmin={ctx.isAdmin}
      importEntity={ctx.importEntity}
      setImportEntity={ctx.setImportEntity}
      importMode={ctx.importMode}
      setImportMode={ctx.setImportMode}
      importSuccessMessage={ctx.importSuccessMessage}
      setImportSuccessMessage={ctx.setImportSuccessMessage}
      setSingleFromRequestId={ctx.setSingleFromRequestId}
      singleName={ctx.singleName}
      setSingleName={ctx.setSingleName}
      singleCategoryId={ctx.singleCategoryId}
      setSingleCategoryId={ctx.setSingleCategoryId}
      singleParentTypeId={ctx.singleParentTypeId}
      setSingleParentTypeId={ctx.setSingleParentTypeId}
      singleBarPriority={ctx.singleBarPriority}
      setSingleBarPriority={ctx.setSingleBarPriority}
      singleColor={ctx.singleColor}
      setSingleColor={ctx.setSingleColor}
      singleDescription={ctx.singleDescription}
      setSingleDescription={ctx.setSingleDescription}
      singleSaving={ctx.singleSaving}
      singleError={ctx.singleError}
      onAddSingle={ctx.handleAddSingle}
      batchPhase={ctx.batchPhase}
      setBatchPhase={ctx.setBatchPhase}
      importPrompt={ctx.importPrompt}
      promptCopied={ctx.promptCopied}
      onCopyImportPrompt={ctx.copyImportPrompt}
      importJson={ctx.importJson}
      setImportJson={ctx.setImportJson}
      onRunImportValidation={ctx.runImportValidation}
      importResult={ctx.importResult}
      setImportResult={ctx.setImportResult}
      importing={ctx.importing}
      onCommitImport={ctx.handleCommitImport}
    />
  )
}

export function AdminRequestsRoute() {
  const {
    pendingRequests,
    requestsLoading,
    loadPendingRequests,
    startSingleAddFromRequest,
  } = useOutletContext()
  return (
    <RequestsTab
      pendingRequests={pendingRequests}
      requestsLoading={requestsLoading}
      onRequestsChanged={loadPendingRequests}
      onAddToCatalog={startSingleAddFromRequest}
    />
  )
}

export function AdminUsersRoute() {
  const { users, usersLoading, userId, loadUsers } = useOutletContext()
  return (
    <UsersTab
      users={users}
      usersLoading={usersLoading}
      currentUserId={userId}
      onUsersChanged={loadUsers}
    />
  )
}

export function AdminInvitationsRoute() {
  const { invites, setInvites, invitesLoading } = useOutletContext()
  return (
    <InvitesTab
      invites={invites}
      setInvites={setInvites}
      invitesLoading={invitesLoading}
    />
  )
}
