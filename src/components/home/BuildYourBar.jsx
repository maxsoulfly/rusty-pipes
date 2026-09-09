import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TypeCard } from "@/components/myBar/TypeCard"
import { Btn } from "@/components/primitives"
import { resolveOnboardingSelection } from "@/domain/buildYourBar"

// Build Your Bar never shows product-level detail (that's the Add
// ingredients / My ingredients job, reached via "Find more ingredients") -
// every TypeCard here is always generic-ownership-only, so onToggleExpand
// is a permanent no-op and never actually invoked (TypeCard only renders
// the expand chevron when allProducts.length > 0, always empty here).
const NOOP = () => {}

export function BuildYourBar({ catalog, inventory, computed }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  // The onboarding tile lists come from the admin-curated
  // onboarding_ingredients table (fetched with the rest of the catalog),
  // resolved against the live types by a pure function:
  //   - a row whose type was deleted since seeding just drops out
  //   - a row whose type is a household basic (assumed_available) is
  //     excluded from both lists - the engine already treats it as owned
  //   - `six` backfills up to 6 from the non-initial rows, so a short or
  //     partly-excluded initial set still fills the grid
  // catalog is always loaded by the time Home renders (App.jsx gates the
  // whole Outlet on catalog.loading and shows a blocking error screen if the
  // first load failed); a later refetch failure keeps the last-good rows. An
  // empty config resolves to no tiles + empty groups - heading, copy, CTAs
  // and the makeable-count line still render.
  const { six, groups } = useMemo(
    () =>
      resolveOnboardingSelection(catalog.onboardingIngredients, catalog.types),
    [catalog.onboardingIngredients, catalog.types],
  )

  // Only the groups that actually have tiles - an empty heading (e.g. every
  // Mixers row deleted or flagged) would just be noise.
  const nonEmptyGroups = groups.filter(([, types]) => types.length > 0)

  // perfect+good: every required ingredient satisfied - the same tier
  // boundary Home's own "Good Enough" section already uses. Already
  // reflects substitution matches (computeAvail treats a satisfied
  // alternative the same as the primary ingredient) - called out
  // explicitly in the visible copy below rather than left as an unstated
  // assumption.
  const makeableCount = computed.filter(
    (c) => c.avail === "perfect" || c.avail === "good",
  ).length

  // This section only ever renders when the bar started empty this visit
  // (see HomeScreen.jsx's per-visit snapshot), so any ownership present now
  // can only have come from a tap made during this same visit - "contains a
  // selection" reduces to a plain non-empty check, no separate "did the
  // user pick something" flag needed.
  const hasSelection =
    inventory.ownedTypeIds.size > 0 || inventory.ownedProductIds.size > 0

  const renderTile = (type) => {
    // Tap-to-select, preserved exactly - both the card body and the
    // dedicated checkmark button toggle the same thing here, unlike My
    // ingredients (see current-context.md's Stage 4 chunk for why the two
    // screens deliberately differ on what a card tap does).
    const toggle = () => inventory.toggleType(type.id)
    return (
      <TypeCard
        key={type.id}
        type={type}
        isChild={false}
        owned={inventory.ownedTypeIds.has(type.id)}
        ownedProducts={[]}
        allProducts={[]}
        expanded={false}
        onToggleExpand={NOOP}
        coveringChildren={[]}
        onCardClick={toggle}
        onToggleOwned={toggle}
      />
    )
  }

  return (
    <div className="mb-6 bg-surface2 border border-bdr rounded-lg p-4">
      <h2 className="text-lg font-display font-extrabold text-tx mb-1">
        Build your bar
      </h2>
      <p className="text-sm text-tx2 mb-3">
        Select ingredients you already have to discover what you can make.
      </p>
      {/* Near the heading, not buried after the grid - always available,
          zero commitment, per the explicit "browsing/search links" +
          mobile-primary-actions-reachable requirement. min-h-11 (44px)
          even though this reads as a plain text link, not a button. */}
      <button
        onClick={() => navigate("/library")}
        className="text-cyan text-[13px] font-display font-semibold bg-transparent border-none cursor-pointer p-0 mb-4 min-h-11 flex items-center"
      >
        Browse cocktails
      </button>

      {expanded ? (
        <div className="flex flex-col gap-4 mb-3">
          {nonEmptyGroups.map(([label, types]) => (
            <div key={label}>
              <div className="text-[11px] font-bold text-tx3 uppercase tracking-[0.06em] mb-1.5 font-display">
                {label}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {types.map(renderTile)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {six.map(renderTile)}
        </div>
      )}

      {/* Only offer the toggle when the expanded view actually holds more
          than the six already shown - otherwise it just collapses/expands
          the same tiles. */}
      {nonEmptyGroups.reduce((n, [, types]) => n + types.length, 0) >
        six.length && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 min-h-11 bg-transparent border border-bdr rounded-sm cursor-pointer text-tx2 text-[13px] font-display font-semibold mb-4"
        >
          {expanded ? "Show fewer" : "Show all essentials"}
        </button>
      )}

      <p className="text-xs text-tx3 mb-3">
        <span className="text-tx font-semibold">{makeableCount}</span>{" "}
        {makeableCount === 1 ? "cocktail" : "cocktails"} you could make right
        now. Includes substitutions.
      </p>

      <div className="flex flex-col gap-2">
        {/* Only rendered once there's something to show for - avoids a
            dead/disabled button on the first paint of an empty-bar
            homepage. Primary (not ghost) styling: once a selection exists
            this is the natural next action, and needs to read as clearly
            visible/tappable on a phone, not a secondary afterthought. */}
        {hasSelection && (
          <Btn
            variant="primary"
            full
            onClick={() => navigate("/library?sort=availability")}
          >
            Show my cocktails
          </Btn>
        )}
        <Btn
          variant="ghost"
          full
          onClick={() => navigate("/bar/add-ingredients?focus=1")}
        >
          Find more ingredients
        </Btn>
      </div>
    </div>
  )
}
