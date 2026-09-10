import { useEffect, useState } from "react"
import clsx from "clsx"
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom"
import { IconChevD } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import {
  buildIngredientImportPrompt,
  validateIngredientImport,
} from "@/schemas/ingredientImport"
import {
  buildProductImportPrompt,
  validateProductImport,
} from "@/schemas/productImport"
import {
  buildRecipeImportPrompt,
  validateRecipeImport,
} from "@/schemas/recipeImport"
import { createIngredientTypes, createProducts } from "@/services/catalog"
import {
  fetchPendingIngredientRequests,
  resolveIngredientRequest,
} from "@/services/ingredientRequests"
import {
  deriveInvitationStatus,
  fetchInvitations,
} from "@/services/invitations"
import {
  createClassicRecipes,
  demoteRecipeToCommunity,
  fetchCommunityRecipes,
  promoteRecipeToClassic,
} from "@/services/recipes"
import { fetchAllUsers } from "@/services/membership"
import { CatalogTab } from "@/components/admin/CatalogTab"
import { ClassicRecipesTab } from "@/components/admin/ClassicRecipesTab"
import { ImportTab } from "@/components/admin/ImportTab"
import { IngredientFormsTab } from "@/components/admin/IngredientFormsTab"
import { InvitesTab } from "@/components/admin/InvitesTab"
import { ModerationTab } from "@/components/admin/ModerationTab"
import { OnboardingTab } from "@/components/admin/OnboardingTab"
import { OverviewTab } from "@/components/admin/OverviewTab"
import { RequestsTab } from "@/components/admin/RequestsTab"
import { TypesTab } from "@/components/admin/TypesTab"
import { UsersTab } from "@/components/admin/UsersTab"

// Grouped by what the tab is *for*, not the order each was built in
// (the original order): Overview first, then recipe content (Classic
// Recipes, Moderation - which is community recipe moderation), then
// catalog/taxonomy tools (Catalog, Ingredient Types, Batch Import,
// Requests - Requests feeds directly into Ingredient Types/Batch Import),
// then membership admin (Users, Invitations) last.
// adminOnly tabs are invisible to a moderator - full ingredient-catalog
// authoring + the promote/demote/unpublish trio is moderator's scope, but
// Users/Invitations management stays admin-only.
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "recipes", label: "Classic Recipes" },
  { id: "moderation", label: "Moderation" },
  { id: "catalog", label: "Catalog" },
  { id: "types", label: "Ingredient Types" },
  { id: "onboarding", label: "Onboarding ingredients", adminOnly: true },
  { id: "forms", label: "Ingredient forms", adminOnly: true },
  { id: "import", label: "Batch Import" },
  { id: "requests", label: "Requests" },
  { id: "users", label: "Users", adminOnly: true },
  { id: "invites", label: "Invitations", adminOnly: true },
]

export default function AdminScreen() {
  const navigate = useNavigate()
  const { catalog, computed, refetchRecipes, userId, isAdmin } =
    useOutletContext()
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)
  // Deep-link support (?tab=types) so e.g. My Bar's admin ⋯ menu can open
  // straight into Ingredient Types. Read once as the initial value, not kept
  // in sync afterward - manual tab clicks shouldn't rewrite the URL. Falls
  // back to Overview for an unknown or (for a moderator) admin-only id.
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const [tab, setTab] = useState(
    visibleTabs.some((t) => t.id === requestedTab) ? requestedTab : "overview",
  )
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

  // Recipe batch import - same paste/validate/preview/commit shape as
  // ingredients, kept as separate state since the two entities' prompts,
  // validators, and commit paths are unrelated.
  const [recipeBatchPhase, setRecipeBatchPhase] = useState("paste")
  const [recipeImportJson, setRecipeImportJson] = useState("")
  const [recipeImportResult, setRecipeImportResult] = useState(null)
  const [recipeImporting, setRecipeImporting] = useState(false)
  const [recipePromptCopied, setRecipePromptCopied] = useState(false)
  const [recipeImportSuccessMessage, setRecipeImportSuccessMessage] =
    useState(null)

  // Inline "add this missing ingredient" from a recipe-import row, rather
  // than forcing a trip out to the Ingredients tab and back with the pasted
  // JSON lost. One draft at a time (not per-row) since only one form can be
  // usefully edited at once anyway. Reuses validateIngredientImport/
  // createIngredientTypes - same rules as Single Ingredient, not a second
  // hand-rolled check.
  const [addIngredientDraft, setAddIngredientDraft] = useState(null)
  const [addIngredientSaving, setAddIngredientSaving] = useState(false)
  const [addIngredientError, setAddIngredientError] = useState(null)

  // Product batch import - same shape again, one flat bulk insert since
  // products have no per-row children (unlike recipes' components/tags).
  const [productBatchPhase, setProductBatchPhase] = useState("paste")
  const [productImportJson, setProductImportJson] = useState("")
  const [productImportResult, setProductImportResult] = useState(null)
  const [productImporting, setProductImporting] = useState(false)
  const [productPromptCopied, setProductPromptCopied] = useState(false)
  const [productImportSuccessMessage, setProductImportSuccessMessage] =
    useState(null)

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
  // AdminScreen mount; nothing else reads `users`.
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
  // shell level rather than becoming local to either tab.
  const [singleFromRequestId, setSingleFromRequestId] = useState(null)
  const startSingleAddFromRequest = (name = "", requestId = null) => {
    setImportSuccessMessage(null)
    setImportEntity("ingredients")
    setImportMode("single")
    setSingleName(name)
    setSingleFromRequestId(requestId)
    setTab("import")
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
    })
    setImportResult(validation)
    setBatchPhase("results")
  }

  const handleCommitImport = async () => {
    if (!importResult?.results) return
    const rows = importResult.results
      .filter((r) => r.valid)
      .map((r) => r.resolved)
    if (rows.length === 0) return
    setImporting(true)
    try {
      await createIngredientTypes(rows)
      await catalog.refetch()
      setImportSuccessMessage(
        `Imported ${rows.length} ingredient type${
          rows.length === 1 ? "" : "s"
        }.`,
      )
      setBatchPhase("paste")
      setImportJson("")
      setImportResult(null)
    } catch (err) {
      setImportResult({ ...importResult, commitError: err.message })
    } finally {
      setImporting(false)
    }
  }

  const recipeImportPrompt = buildRecipeImportPrompt({
    types: catalog.types,
    glasses: catalog.glasses,
    families: catalog.families,
    tasteTags: catalog.tasteTags,
    aliases: catalog.aliases,
  })

  const copyRecipeImportPrompt = () => {
    navigator.clipboard.writeText(recipeImportPrompt).catch(() => {})
    setRecipePromptCopied(true)
    setTimeout(() => setRecipePromptCopied(false), 2000)
  }

  // catalogOverride lets a caller pass freshly-refetched data directly,
  // instead of this function reading the component's own `catalog` closure -
  // needed because `catalog.refetch()` updates React *state* (a future
  // render), it never mutates the `catalog` object an already-running
  // function is holding. handleSaveAddIngredientDraft used to call this
  // right after awaiting catalog.refetch() and still validate against the
  // pre-refetch catalog every single time (not a rare race - a plain JS
  // closure can never see a state update from within its own execution) -
  // real bug a user hit while batch-importing "Alexander" and adding its
  // missing ingredients one at a time, where each add's re-validate still
  // showed that exact ingredient as unresolved.
  const runRecipeImportValidation = (catalogOverride) => {
    const c = catalogOverride ?? catalog
    let parsed
    try {
      parsed = JSON.parse(recipeImportJson)
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array")
    } catch (err) {
      setRecipeImportResult({ parseError: err.message })
      setRecipeBatchPhase("results")
      return
    }
    const validation = validateRecipeImport(parsed, {
      types: c.types,
      glasses: c.glasses,
      families: c.families,
      tasteTags: c.tasteTags,
      aliases: c.aliases,
      glassAliases: c.glassAliases,
      existingRecipeNames: computed.map((r) => r.name),
    })
    setRecipeImportResult(validation)
    setRecipeBatchPhase("results")
  }

  const handleCommitRecipeImport = async () => {
    if (!recipeImportResult?.results) return
    const rows = recipeImportResult.results
      .filter((r) => r.valid)
      .map((r) => r.resolved)
    if (rows.length === 0) return
    setRecipeImporting(true)
    try {
      const { createdCount, failures } = await createClassicRecipes(rows)
      await refetchRecipes()
      if (failures.length === 0) {
        setRecipeImportSuccessMessage(
          `Imported ${createdCount} recipe${createdCount === 1 ? "" : "s"}.`,
        )
        setRecipeBatchPhase("paste")
        setRecipeImportJson("")
        setRecipeImportResult(null)
      } else {
        setRecipeImportResult({
          ...recipeImportResult,
          commitError: `${createdCount} imported, ${failures.length} failed: ${failures
            .map((f) => `"${f.name}" (${f.message})`)
            .join("; ")}`,
        })
      }
    } catch (err) {
      setRecipeImportResult({ ...recipeImportResult, commitError: err.message })
    } finally {
      setRecipeImporting(false)
    }
  }

  const openAddIngredientDraft = (name) => {
    setAddIngredientError(null)
    setAddIngredientDraft({
      name,
      categoryId: "",
      parentTypeId: "",
      barPriority: "common",
      color: "",
      description: "",
    })
  }

  const handleSaveAddIngredientDraft = async () => {
    if (!addIngredientDraft) return
    setAddIngredientSaving(true)
    setAddIngredientError(null)
    const categoryName =
      catalog.categories.find((c) => c.id === addIngredientDraft.categoryId)
        ?.name ?? ""
    const parentTypeName = addIngredientDraft.parentTypeId
      ? catalog.types.find((t) => t.id === addIngredientDraft.parentTypeId)
          ?.name
      : undefined
    const { results } = validateIngredientImport(
      [
        {
          name: addIngredientDraft.name.trim(),
          category: categoryName,
          parentType: parentTypeName,
          barPriority: addIngredientDraft.barPriority,
          color: addIngredientDraft.color.trim() || undefined,
          description: addIngredientDraft.description.trim() || undefined,
        },
      ],
      {
        categories: catalog.categories,
        types: catalog.types,
        aliases: catalog.aliases,
      },
    )
    const [result] = results
    if (!result.valid) {
      setAddIngredientError(result.errors.join("; "))
      setAddIngredientSaving(false)
      return
    }
    try {
      await createIngredientTypes([result.resolved])
      const freshCatalog = await catalog.refetch()
      setAddIngredientDraft(null)
      // Re-validate in place so the row that was blocked on this ingredient
      // updates immediately, without losing the pasted JSON. Passed
      // explicitly - see runRecipeImportValidation's comment for why this
      // can't just read the component's own (stale) catalog closure here.
      runRecipeImportValidation(freshCatalog)
    } catch (err) {
      setAddIngredientError(err.message)
    } finally {
      setAddIngredientSaving(false)
    }
  }

  const productImportPrompt = buildProductImportPrompt({
    types: catalog.types,
    aliases: catalog.aliases,
  })

  const copyProductImportPrompt = () => {
    navigator.clipboard.writeText(productImportPrompt).catch(() => {})
    setProductPromptCopied(true)
    setTimeout(() => setProductPromptCopied(false), 2000)
  }

  const runProductImportValidation = () => {
    let parsed
    try {
      parsed = JSON.parse(productImportJson)
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array")
    } catch (err) {
      setProductImportResult({ parseError: err.message })
      setProductBatchPhase("results")
      return
    }
    const validation = validateProductImport(parsed, {
      types: catalog.types,
      aliases: catalog.aliases,
      existingProducts: catalog.products,
    })
    setProductImportResult(validation)
    setProductBatchPhase("results")
  }

  const handleCommitProductImport = async () => {
    if (!productImportResult?.results) return
    const rows = productImportResult.results
      .filter((r) => r.valid)
      .map((r) => r.resolved)
    if (rows.length === 0) return
    setProductImporting(true)
    try {
      await createProducts(rows)
      await catalog.refetch()
      setProductImportSuccessMessage(
        `Imported ${rows.length} product${rows.length === 1 ? "" : "s"}.`,
      )
      setProductBatchPhase("paste")
      setProductImportJson("")
      setProductImportResult(null)
    } catch (err) {
      setProductImportResult({
        ...productImportResult,
        commitError: err.message,
      })
    } finally {
      setProductImporting(false)
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
      },
    )
    const [result] = results
    if (!result.valid) {
      setSingleError(result.errors.join("; "))
      setSingleSaving(false)
      return
    }
    try {
      await createIngredientTypes([result.resolved])
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
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "py-3 px-4 bg-transparent border-none border-b-2 cursor-pointer text-[13px] font-display whitespace-nowrap transition-all duration-150",
                tab === t.id
                  ? "border-violet text-violet font-bold"
                  : "border-transparent text-tx2 font-normal",
              )}
            >
              {t.label}
              {t.id === "requests" && pendingRequests.length > 0
                ? ` (${pendingRequests.length})`
                : ""}
            </button>
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
        {tab === "overview" && (
          <OverviewTab
            classicCount={classicRecipes.length}
            communityCount={communityRecipes.length}
            pendingRequestsCount={pendingRequests.length}
            ingredientTypesCount={catalog.types.length}
            activeInvitesCount={
              isAdmin
                ? invites.filter((i) => deriveInvitationStatus(i) === "active")
                    .length
                : null
            }
            onGoToTab={setTab}
          />
        )}

        {tab === "recipes" && (
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
        )}

        {tab === "users" && isAdmin && (
          <UsersTab
            users={users}
            usersLoading={usersLoading}
            currentUserId={userId}
            onUsersChanged={loadUsers}
          />
        )}

        {tab === "invites" && isAdmin && (
          <InvitesTab
            invites={invites}
            setInvites={setInvites}
            invitesLoading={invitesLoading}
          />
        )}

        {tab === "moderation" && (
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
        )}

        {tab === "requests" && (
          <RequestsTab
            pendingRequests={pendingRequests}
            requestsLoading={requestsLoading}
            onRequestsChanged={loadPendingRequests}
            onAddToCatalog={startSingleAddFromRequest}
          />
        )}

        {tab === "import" && (
          <ImportTab
            catalog={catalog}
            isAdmin={isAdmin}
            importEntity={importEntity}
            setImportEntity={setImportEntity}
            importMode={importMode}
            setImportMode={setImportMode}
            importSuccessMessage={importSuccessMessage}
            setImportSuccessMessage={setImportSuccessMessage}
            setSingleFromRequestId={setSingleFromRequestId}
            singleName={singleName}
            setSingleName={setSingleName}
            singleCategoryId={singleCategoryId}
            setSingleCategoryId={setSingleCategoryId}
            singleParentTypeId={singleParentTypeId}
            setSingleParentTypeId={setSingleParentTypeId}
            singleBarPriority={singleBarPriority}
            setSingleBarPriority={setSingleBarPriority}
            singleColor={singleColor}
            setSingleColor={setSingleColor}
            singleDescription={singleDescription}
            setSingleDescription={setSingleDescription}
            singleSaving={singleSaving}
            singleError={singleError}
            onAddSingle={handleAddSingle}
            batchPhase={batchPhase}
            setBatchPhase={setBatchPhase}
            importPrompt={importPrompt}
            promptCopied={promptCopied}
            onCopyImportPrompt={copyImportPrompt}
            importJson={importJson}
            setImportJson={setImportJson}
            onRunImportValidation={runImportValidation}
            importResult={importResult}
            setImportResult={setImportResult}
            importing={importing}
            onCommitImport={handleCommitImport}
            recipeImportSuccessMessage={recipeImportSuccessMessage}
            recipeBatchPhase={recipeBatchPhase}
            setRecipeBatchPhase={setRecipeBatchPhase}
            recipeImportPrompt={recipeImportPrompt}
            recipePromptCopied={recipePromptCopied}
            onCopyRecipeImportPrompt={copyRecipeImportPrompt}
            recipeImportJson={recipeImportJson}
            setRecipeImportJson={setRecipeImportJson}
            onRunRecipeImportValidation={() => runRecipeImportValidation()}
            recipeImportResult={recipeImportResult}
            setRecipeImportResult={setRecipeImportResult}
            recipeImporting={recipeImporting}
            onCommitRecipeImport={handleCommitRecipeImport}
            addIngredientDraft={addIngredientDraft}
            setAddIngredientDraft={setAddIngredientDraft}
            onOpenAddIngredientDraft={openAddIngredientDraft}
            addIngredientError={addIngredientError}
            addIngredientSaving={addIngredientSaving}
            onSaveAddIngredientDraft={handleSaveAddIngredientDraft}
            productImportSuccessMessage={productImportSuccessMessage}
            productBatchPhase={productBatchPhase}
            setProductBatchPhase={setProductBatchPhase}
            productImportPrompt={productImportPrompt}
            productPromptCopied={productPromptCopied}
            onCopyProductImportPrompt={copyProductImportPrompt}
            productImportJson={productImportJson}
            setProductImportJson={setProductImportJson}
            onRunProductImportValidation={runProductImportValidation}
            productImportResult={productImportResult}
            setProductImportResult={setProductImportResult}
            productImporting={productImporting}
            onCommitProductImport={handleCommitProductImport}
          />
        )}

        {tab === "catalog" && <CatalogTab catalog={catalog} />}

        {tab === "onboarding" && isAdmin && <OnboardingTab catalog={catalog} />}

        {tab === "forms" && isAdmin && <IngredientFormsTab catalog={catalog} />}

        {tab === "types" && (
          <TypesTab
            catalog={catalog}
            onAddNew={() => startSingleAddFromRequest()}
          />
        )}
      </div>
    </div>
  )
}
