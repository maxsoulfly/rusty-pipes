import { useEffect, useMemo, useState } from "react"
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useOutletContext,
} from "react-router-dom"
import { BottomNav, SideNav } from "@/components/Nav"
import {
  computeAvail,
  resolveOwnedIngredientTypes,
} from "@/domain/availability"
import { useCatalog } from "@/hooks/useCatalog"
import { useInventory } from "@/hooks/useInventory"
import { useLists } from "@/hooks/useLists"
import { useMembership } from "@/hooks/useMembership"
import { useRecipes } from "@/hooks/useRecipes"
import { useSupabaseSession } from "@/hooks/useSupabaseSession"
import AddIngredientsScreen from "@/screens/AddIngredientsScreen"
import AddProductScreen from "@/screens/AddProductScreen"
import AdminScreen from "@/screens/AdminScreen"
import DetailScreen from "@/screens/DetailScreen"
import EditorScreen from "@/screens/EditorScreen"
import HomeScreen from "@/screens/HomeScreen"
import IngredientDetailScreen from "@/screens/IngredientDetailScreen"
import JoinScreen from "@/screens/JoinScreen"
import LibraryScreen from "@/screens/LibraryScreen"
import ListsScreen from "@/screens/ListsScreen"
import MoreScreen from "@/screens/MoreScreen"
import MyBarScreen from "@/screens/MyBarScreen"
import RequestIngredientScreen from "@/screens/RequestIngredientScreen"
import SharedRecipeScreen from "@/screens/SharedRecipeScreen"
import SignInScreen from "@/screens/SignInScreen"
import WelcomeScreen from "@/screens/WelcomeScreen"
import { signOut } from "@/services/auth"
import { updateProfile } from "@/services/membership"

// The /admin route itself had no gate at all - isAdmin only ever hid the
// SideNav link, so any authenticated member could reach the Admin screen
// directly by URL. RLS already default-denies the actual reads/writes
// underneath, but the screen shouldn't be reachable at all - a wrapper
// rather than a check inside AdminScreen itself, since AdminScreen calls
// dozens of hooks unconditionally and an early return before them would
// violate the rules of hooks.
//
// Renamed from RequireAdmin: a moderator can also reach /admin now (a
// scoped-down view of it - see AdminScreen.jsx's tab filtering), so this
// gate checks isStaff (admin OR moderator). Finer-grained admin-only
// actions inside stay gated by isAdmin specifically.
function RequireStaff({ children }) {
  const { isStaff } = useOutletContext()
  return isStaff ? children : <Navigate to="/home" replace />
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center text-tx2 font-display text-sm">
      Loading...
    </div>
  )
}

// Shown only when an initial fetch has never succeeded - there's nothing
// usable to fall back to. A failed *refetch* after data already loaded
// once does NOT reach this screen (see each hook's `loaded` flag) - the
// app keeps showing stale-but-valid content instead, since nuking the
// whole screen over e.g. a failed background catalog refresh would be
// worse than doing nothing.
function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display font-bold text-lg text-tx">
        Something went wrong
      </p>
      <p className="text-tx2 text-sm max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 bg-transparent border border-bdr rounded-sm py-2 px-4 cursor-pointer text-tx2 text-[13px] font-display"
      >
        Try Again
      </button>
    </div>
  )
}

// A blocked member has a real memberships row (revoked_at set), unlike
// someone who's never joined at all - showing JoinScreen's "enter an invite
// code" form here would be actively misleading, since redeem_invitation()
// rejects a user who already has a membership row regardless of revoked
// status. This is a distinct, deliberately blunt dead end instead.
function RevokedScreen() {
  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display font-bold text-lg text-tx">
        Your access has been revoked
      </p>
      <p className="text-tx2 text-sm">
        Contact an administrator if you think this is a mistake.
      </p>
      <button
        onClick={() => signOut()}
        className="mt-2 bg-transparent border border-bdr rounded-sm py-2 px-4 cursor-pointer text-tx2 text-[13px] font-display"
      >
        Sign Out
      </button>
    </div>
  )
}

// Wraps every authenticated screen: side/bottom nav plus the shared app state
// handed down via router Outlet context.
//
// catalog/inventory/recipes are each fetched exactly ONCE here and shared via
// context - screens must not call useCatalog()/useInventory()/useRecipes()
// themselves. They did originally (one call per screen), which meant e.g.
// toggling an ingredient in My Bar updated My Bar's own copy of inventory
// state instantly but left this component's separate copy (the one feeding
// the availability badges) stale until a full page reload recreated
// everything from scratch. Sharing one instance fixes that: an optimistic
// update anywhere is immediately visible everywhere, since it's the same
// React state.
//
// `computed` = real recipes run through computeAvail(), fed a resolved
// "owned ingredient type ids" set from resolveOwnedIngredientTypes() (src/
// domain/availability.js) - generic ownership, owned products' mapped
// types, and parent/child hierarchy, all expanded once up front so
// computeAvail() itself only ever needs a plain Set membership check.
// Favorites/Want to Make are real too as of step 9 (src/hooks/useLists.js),
// same optimistic-update + "call once, share via context" discipline as
// catalog/inventory/recipes above.
function AppShell({ profile, session }) {
  const userId = session?.user?.id
  // profiles.theme_preference defaults to 'system' for new signups, but there's
  // no OS-preference detection implemented - treat anything but an explicit
  // 'light' as dark, so the More screen's toggle always has a coherent
  // selected state instead of showing neither button active.
  const [theme, setThemeState] = useState(() =>
    profile?.theme_preference === "light" ? "light" : "dark",
  )
  const [unit, setUnitState] = useState(() => profile?.unit_preference ?? "ml")

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])

  // Wrapped so every change is felt instantly (local state) and remembered
  // across sessions (persisted to profiles) - fire-and-forget, since a rare
  // failed preference save isn't worth interrupting the user over.
  const setTheme = (value) => {
    setThemeState(value)
    if (userId)
      updateProfile(userId, { theme_preference: value }).catch((err) =>
        console.error("Failed to save theme preference:", err),
      )
  }
  const setUnit = (value) => {
    setUnitState(value)
    if (userId)
      updateProfile(userId, { unit_preference: value }).catch((err) =>
        console.error("Failed to save unit preference:", err),
      )
  }

  const catalog = useCatalog()
  const inventory = useInventory(userId)
  const lists = useLists(userId)
  const recipesQuery = useRecipes()
  const {
    recipes,
    loading: recipesLoading,
    refetch: refetchRecipes,
  } = recipesQuery

  const ingredientTypesById = useMemo(
    () => new Map(catalog.types.map((t) => [t.id, t])),
    [catalog.types],
  )

  const resolvedOwned = useMemo(
    () =>
      resolveOwnedIngredientTypes({
        ownedTypeIds: inventory.ownedTypeIds,
        ownedProductIds: inventory.ownedProductIds,
        products: catalog.products,
        ingredientTypes: catalog.types,
      }),
    [
      inventory.ownedTypeIds,
      inventory.ownedProductIds,
      catalog.products,
      catalog.types,
    ],
  )

  const computed = useMemo(
    () =>
      recipes.map((r) => ({
        ...r,
        ...computeAvail(
          r,
          resolvedOwned,
          (id) => ingredientTypesById.get(id)?.name ?? id,
        ),
      })),
    [recipes, resolvedOwned, ingredientTypesById],
  )

  const isAdmin = profile?.role === "admin"
  const isModerator = profile?.role === "moderator"
  const isStaff = isAdmin || isModerator
  const isLoading =
    catalog.loading || inventory.loading || recipesLoading || lists.loading
  // Only blocks the whole app when the failing hook has NEVER loaded real
  // data - a failed refetch (e.g. AddProductScreen's catalog.refetch()
  // after a successful add) leaves `loaded` true and keeps showing
  // whatever's already on screen instead.
  const loadError =
    (!catalog.loaded && catalog.error) ||
    (!inventory.loaded && inventory.error) ||
    (!recipesQuery.loaded && recipesQuery.error) ||
    (!lists.loaded && lists.error) ||
    null
  const retryFailedLoads = () => {
    catalog.refetch()
    inventory.refetch()
    refetchRecipes()
    lists.refetch()
  }

  const outletContext = {
    computed,
    refetchRecipes,
    owned: resolvedOwned,
    ingredientTypesById,
    catalog,
    inventory,
    favorites: lists.favoriteIds,
    toggleFav: lists.toggleFavorite,
    wantToMake: lists.wantToMakeIds,
    toggleWtm: lists.toggleWantToMake,
    unit,
    setUnit,
    theme,
    setTheme,
    isAdmin,
    isModerator,
    isStaff,
    profile,
    userId,
    email: session?.user?.email,
    signOut,
  }

  return (
    <div className="flex h-dvh bg-bg">
      {/* height (not minHeight) is required here: a flex row with only
          minHeight has no definite height, so the overflowY:auto child below
          can never establish a bounded box to scroll within - it just grows
          to fit its content instead, and nothing ever scrolls. */}
      <div className="hidden xl:flex">
        <SideNav isStaff={isStaff} />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* The scroll container above stays full-width (so the scrollbar
            sits at the true viewport edge, standard behavior) - this inner
            wrapper is what actually caps content width and centers it. No
            constraint at all here meant a very wide monitor stretched every
            screen's content edge-to-edge next to the sidebar (found via a
            live screenshot - "TV?"), while sticky headers (e.g.
            SearchFilterHeader) still work fine since sticky positioning is
            relative to the scrolling ancestor, not this wrapper. A flat
            pixel cap looked fine on a regular monitor but left huge dead
            margins on a 4K/TV-sized viewport (a live screenshot at 3840px
            showed the content shrunk to under half the screen) - min(90%,
            2200px) scales with the available width instead (percentage, not
            vw - this wrapper's parent is the flex column next to the
            sidebar, not the raw viewport, so a vw-based cap would ignore
            the sidebar's width), only kicking in as a hard ceiling once 90%
            of the available space would exceed 2200px. */}
        <div className="max-w-[min(90%,2200px)] mx-auto">
          {isLoading ? (
            <LoadingScreen />
          ) : loadError ? (
            <ErrorScreen message={loadError} onRetry={retryFailedLoads} />
          ) : (
            <Outlet context={outletContext} />
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

// /share/:id is the one genuinely public route - no session, no membership,
// reachable by anyone with the link. Split out from AuthenticatedApp below
// (rather than a branch inside it) so it never touches useSupabaseSession/
// useMembership at all - a signed-out visitor shouldn't wait on an auth
// check that has nothing to do with viewing a shared recipe.
export default function App() {
  return (
    <Routes>
      <Route path="/share/:id" element={<SharedRecipeScreen />} />
      <Route path="*" element={<AuthenticatedApp />} />
    </Routes>
  )
}

function AuthenticatedApp() {
  const {
    loading: authLoading,
    error: authError,
    session,
  } = useSupabaseSession()
  const userId = session?.user?.id
  const {
    loading: memberLoading,
    error: memberError,
    isMember,
    isRevoked,
    profile,
    refetch,
  } = useMembership(userId)

  if (authLoading) return <LoadingScreen />

  // A failed getSession() call - reloading re-runs it from scratch, which
  // is the only real recovery path here (there's no partial state to
  // retry in place, unlike the AppShell-level hooks below).
  if (authError)
    return (
      <ErrorScreen
        message={authError}
        onRetry={() => window.location.reload()}
      />
    )

  if (!session) {
    return (
      <Routes>
        <Route path="/signin" element={<SignInScreen />} />
        <Route path="*" element={<WelcomeScreen />} />
      </Routes>
    )
  }

  if (memberLoading) return <LoadingScreen />

  // Previously, a failed profile/membership fetch fell all the way through
  // to `!isMember` and showed JoinScreen - misleading for a transient
  // error, since a real member hitting a network blip would be told to
  // redeem an invitation they already used.
  if (memberError)
    return <ErrorScreen message={memberError} onRetry={refetch} />

  if (isRevoked) {
    return <RevokedScreen />
  }

  if (!isMember) {
    return <JoinScreen onRedeemed={refetch} />
  }

  return (
    <Routes>
      <Route element={<AppShell profile={profile} session={session} />}>
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/library/new" element={<EditorScreen />} />
        <Route path="/library/:id" element={<DetailScreen />} />
        <Route path="/library/:id/edit" element={<EditorScreen />} />
        <Route path="/bar" element={<MyBarScreen />} />
        {/* Owned-first My ingredients (/bar) vs. the separate category-first
            "find and add" flow. /bar/add stays the specific-bottle tracker,
            now reached from within Add ingredients. */}
        <Route path="/bar/add-ingredients" element={<AddIngredientsScreen />} />
        <Route path="/bar/add" element={<AddProductScreen />} />
        {/* Two routes, one screen - `kind` tells IngredientDetailScreen
            which id flavor it received rather than sniffing the path.
            Not yet linked from anywhere (Stage 4 wires My Bar's tap-to-view
            behavior) - reachable by direct URL only for now, same "ship
            inert, wire later" pattern as every other multi-stage feature
            in this app. */}
        <Route
          path="/bar/type/:id"
          element={<IngredientDetailScreen kind="type" />}
        />
        <Route
          path="/bar/product/:id"
          element={<IngredientDetailScreen kind="product" />}
        />
        <Route
          path="/request-ingredient"
          element={<RequestIngredientScreen />}
        />
        <Route path="/lists" element={<ListsScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminScreen />
            </RequireStaff>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
