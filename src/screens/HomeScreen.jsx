import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import {
  IconBookmark,
  IconBottle,
  IconCheck,
  IconChevR,
  IconHeart,
  IconSearch,
} from "@/components/icons"
import { BuildYourBar } from "@/components/home/BuildYourBar"
import { GlassSvg } from "@/components/GlassSvg"
import { SmallCard } from "@/components/CocktailCard"
import { Card, SectionTitle } from "@/components/primitives"
import { rankAdapted, rankAlmostThere } from "@/domain/almostThere"
import { rankPurchaseRecommendations } from "@/domain/recommendations"

// Capped so a member with dozens of "almost" recipes doesn't get a Home
// screen that's mostly one giant list - "Show more" reveals the rest on
// demand instead.
const ALMOST_INITIAL_LIMIT = 3

export default function HomeScreen() {
  const navigate = useNavigate()
  const {
    computed,
    favorites,
    wantToMake,
    profile,
    email,
    ingredientTypesById,
    inventory,
    catalog,
    userId,
    isAdmin,
  } = useOutletContext()
  const firstName = (profile?.display_name || email || "there").split(
    /[\s@]/,
  )[0]
  const [showAllAlmost, setShowAllAlmost] = useState(false)

  // Build Your Bar's visibility is an explicit per-visit snapshot ("was the
  // bar empty when I arrived here"), not a live check against current
  // ownership - a live check would hide the section the instant the first
  // optimistic tap landed, mid-selection. null = not yet decided for the
  // current user; decided exactly once, after the real inventory fetch
  // resolves, and never re-evaluated for the rest of this mount regardless
  // of how many items get toggled.
  const [showBuildYourBar, setShowBuildYourBar] = useState(null)
  // Resets the snapshot whenever the signed-in user changes, so a previous
  // account's "already saw it" decision can never leak into a freshly-
  // signed-in different one on the same device. In practice a sign-out
  // already unmounts the whole authenticated route tree (session -> no
  // session -> AppShell itself unmounts), which would reset this state on
  // its own anyway - this is a defensive backstop in case that ever
  // changes (e.g. a future admin "view as" feature that doesn't fully
  // unmount), not evidence a live leak has been observed.
  const lastUserIdRef = useRef(userId)
  useEffect(() => {
    if (lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId
      setShowBuildYourBar(null)
    }
  }, [userId])
  useEffect(() => {
    if (showBuildYourBar !== null) return
    if (!inventory.loaded) return
    setShowBuildYourBar(
      inventory.ownedTypeIds.size === 0 && inventory.ownedProductIds.size === 0,
    )
  }, [
    showBuildYourBar,
    inventory.loaded,
    inventory.ownedTypeIds,
    inventory.ownedProductIds,
  ])

  // Stage D.2: filtered by the shared `display.tier`, not raw `avail` - for
  // a genuinely perfect/good recipe the two are always identical
  // (computeMakeability only attempts adaptation when `strict` isn't
  // already perfect/good), so this is a like-for-like swap, not a
  // behavior change - it just stops this screen from independently
  // re-interpreting `avail` alongside the shared result.
  const perfect = computed.filter(
    (c) => (c.display?.tier ?? c.avail) === "perfect",
  )
  const good = computed.filter((c) => (c.display?.tier ?? c.avail) === "good")
  // Ranked by real cross-user popularity (favoriteCount + wantToMakeCount) -
  // every recipe here is already tied on "how close" by definition (avail
  // === "almost" only ever means exactly 1 missing required ingredient, see
  // availability.js), so popularity is the only signal that actually
  // differentiates them. Excludes anything now `display.tier === "adapted"`
  // (see domain/almostThere.js) - that has its own section below instead.
  const almostRanked = useMemo(() => rankAlmostThere(computed), [computed])
  const almost = showAllAlmost
    ? almostRanked
    : almostRanked.slice(0, ALMOST_INITIAL_LIMIT)
  // Stage D.2 - "Make With Substitutions": resolvable via a configured,
  // owned general substitute. Shown as its own section, ranked between
  // Good Enough and Almost There (see HomeScreen's render order below),
  // never mixed into Almost There even when the underlying `strict.avail`
  // happens to be "almost" too.
  const adaptedRanked = useMemo(() => rankAdapted(computed), [computed])

  const buyNext = useMemo(
    () =>
      rankPurchaseRecommendations({
        computed,
        ingredientTypesById,
        favoriteIds: favorites,
        wantToMakeIds: wantToMake,
        limit: 2,
      }),
    [computed, ingredientTypesById, favorites, wantToMake],
  )

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <div className="pt-5 px-5 pb-0 bg-bg2 border-b border-bdr">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-tx2 font-display font-semibold uppercase tracking-[0.06em]">
              {greeting}
            </p>
            <h1 className="mt-0.5 text-2xl font-display font-extrabold text-tx tracking-[-0.02em]">
              {firstName}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/lists")}
              className="bg-surface border border-bdr rounded-sm py-1.5 px-3 cursor-pointer flex items-center gap-1.5 text-coral text-xs font-display font-semibold"
            >
              <IconHeart size={14} /> {favorites.size}
            </button>
            <button
              onClick={() => navigate("/lists")}
              className="bg-surface border border-bdr rounded-sm py-1.5 px-3 cursor-pointer flex items-center gap-1.5 text-violet text-xs font-display font-semibold"
            >
              <IconBookmark size={14} /> {wantToMake.size}
            </button>
          </div>
        </div>
        <button
          onClick={() => navigate("/library?focus=1")}
          className="flex items-center gap-2.5 bg-surface border border-bdr rounded py-2.5 px-3.5 w-full cursor-text mb-4"
        >
          <IconSearch size={16} className="text-tx3" />
          <span className="text-tx3 text-sm font-body">
            Search cocktails...
          </span>
        </button>
      </div>

      <div className="pt-5 px-5 pb-0">
        {showBuildYourBar && (
          <BuildYourBar
            catalog={catalog}
            inventory={inventory}
            computed={computed}
            isAdmin={isAdmin}
          />
        )}

        {perfect.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Ready to Pour</SectionTitle>
              <span className="text-xs font-mono text-perfect">
                ✦ {perfect.length}
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {perfect.map((c) => (
                <SmallCard
                  key={c.id}
                  c={c}
                  onClick={() => navigate(`/library/${c.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {good.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Good Enough</SectionTitle>
              <span className="text-xs font-mono text-good">
                ◎ {good.length}
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {good.map((c) => (
                <SmallCard
                  key={c.id}
                  c={c}
                  onClick={() => navigate(`/library/${c.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stage D.2 - "Make With Substitutions": ranked after Perfect/Good
            Enough (cocktails needing no adaptation still come first) and
            ahead of Almost There, matching Library's own group order
            (domain/availabilityGroups.js). SmallCard already renders each
            recipe's own violet "adapted" primary status (Stage D.1) -
            nothing further to distinguish here beyond the section itself. */}
        {adaptedRanked.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Make With Substitutions</SectionTitle>
              <span className="text-xs font-mono text-violet">
                ⇄ {adaptedRanked.length}
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {adaptedRanked.map((c) => (
                <SmallCard
                  key={c.id}
                  c={c}
                  onClick={() => navigate(`/library/${c.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {almostRanked.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Almost There</SectionTitle>
              <span className="text-xs font-mono text-almost">
                ◐ {almostRanked.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {almost.map((c) => (
                <Card
                  key={c.id}
                  className="py-3 px-4 cursor-pointer flex items-center gap-3"
                  onClick={() => navigate(`/library/${c.id}`)}
                >
                  <GlassSvg
                    type={c.glassShape}
                    liquidColor={c.liquidColor}
                    liquidColor2={c.liquidColor2}
                    size={40}
                    avail="almost"
                  />
                  <div className="flex-1">
                    <div className="text-[15px] font-display font-bold text-tx mb-0.5">
                      {c.name}
                    </div>
                    <div className="text-xs text-tx2">
                      Missing:{" "}
                      <span className="text-almost font-semibold">
                        {c.missingRequired[0]}
                      </span>
                    </div>
                  </div>
                  <IconChevR size={16} className="text-tx3" />
                </Card>
              ))}
            </div>
            {!showAllAlmost && almostRanked.length > ALMOST_INITIAL_LIMIT && (
              <button
                onClick={() => setShowAllAlmost(true)}
                className="w-full mt-2 py-2.5 bg-transparent border border-bdr rounded-sm cursor-pointer text-tx2 text-[13px] font-display font-semibold"
              >
                Show {almostRanked.length - ALMOST_INITIAL_LIMIT} more
              </button>
            )}
          </div>
        )}

        {buyNext.length > 0 && (
          <div className="mb-6">
            <SectionTitle>Buy Next</SectionTitle>
            <div className="flex flex-col gap-2">
              {buyNext.map((candidate) => {
                const ing = ingredientTypesById.get(candidate.ingredientTypeId)
                return (
                  <Card
                    key={candidate.ingredientTypeId}
                    className="py-3.5 px-4"
                    style={{
                      border: "1px solid rgba(251,191,36,0.25)",
                      background: "rgba(251,191,36,0.05)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{
                          background: ing
                            ? `${ing.color}30`
                            : "var(--surface3)",
                          border: ing
                            ? `1px solid ${ing.color}50`
                            : "1px solid var(--border-s)",
                        }}
                      >
                        <IconBottle
                          size={18}
                          style={{ color: ing?.color ?? "var(--text2)" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-display font-bold text-tx mb-0.5">
                          {candidate.name}
                        </div>
                        <div className="text-xs text-tx2">
                          {candidate.reason}
                        </div>
                        <div className="text-[11px] text-almost font-mono mt-1">
                          +{candidate.unlockCount}{" "}
                          {candidate.unlockCount === 1
                            ? "cocktail"
                            : "cocktails"}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          inventory.toggleType(candidate.ingredientTypeId)
                        }
                        title="Mark as owned in My Bar"
                        className="bg-surface3 border border-bdr rounded-sm w-9 h-9 shrink-0 flex items-center justify-center cursor-pointer text-green"
                      >
                        <IconCheck size={16} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
