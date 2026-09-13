import clsx from "clsx"
import { GlassSvg } from "@/components/GlassSvg"
import { buildAdaptedCardActions } from "@/domain/makeability"
import {
  AVAIL_CFG,
  AVAIL_TONE,
  Card,
  SourceBadge,
  TasteTag,
} from "@/components/primitives"

export function CocktailCard({ c, onClick }) {
  // Stage D.1: `display` is the primary status (falls back to the bare
  // `avail` for a caller that hasn't gone through computeMakeability). A
  // recipe resolvable through a configured, owned substitute leads with
  // "Make with substitutions", never a contradictory "Unavailable" badge.
  const display = c.display ?? { tier: c.avail, label: null, isAdapted: false }
  const cfg = AVAIL_CFG[display.tier]
  // UI polish (manual-testing finding) - an adapted card's generic status
  // line ("Make with substitutions", "Make with substitutions · Prepare
  // Simple Syrup first") repeated the "Make With Adaptations" category
  // it's already grouped under and gave no concrete guidance. Compact
  // actions are built directly from `c.adapted.resolvedRequired` (the
  // actual substitute/preparation computeMakeability() selected for THIS
  // recipe with THIS user's bar - never every catalogue possibility, and
  // never re-derived from `display.label`'s prose) - see
  // buildAdaptedCardActions() (src/domain/makeability.js) for the one
  // shared, tested definition every card surface reads. Empty unless
  // `display.tier === "adapted"`, so every other tier's rendering below
  // is completely unaffected.
  const adaptedActions =
    display.tier === "adapted"
      ? buildAdaptedCardActions(c.adapted?.resolvedRequired)
      : []
  return (
    <Card
      className="fade-in cursor-pointer overflow-hidden transition-[transform,box-shadow] duration-150"
      onClick={onClick}
    >
      <div className="pt-4 px-4 pb-3 flex flex-col items-center gap-2.5">
        <GlassSvg
          type={c.glassShape}
          liquidColor={c.liquidColor}
          liquidColor2={c.liquidColor2}
          size={60}
          avail={display.tier}
        />
        <div className="w-full flex flex-col items-center md:items-stretch">
          {/* Stacked and center-aligned on mobile - a 2-column grid leaves
              so little width per card that a long name (e.g. "Between the
              Sheets", "Black Russian") crowds right up against the badge
              and both become hard to read at a glance, and left-aligned
              text under the already-centered glass icon above looked
              lopsided. md: matches the grid's own 2->3 column breakpoint,
              switching back to the denser left-aligned single-row layout
              once cards have room for it. */}
          <div className="flex flex-col items-center md:flex-row md:items-start md:justify-between md:w-full gap-1 mb-1">
            <span className="font-display font-bold text-sm text-tx leading-[1.2] text-center md:text-left">
              {c.name}
            </span>
            <SourceBadge source={c.source} />
          </div>
          {c.author && (
            <div className="text-[11px] text-tx3 mb-1.5 text-center md:text-left md:w-full">
              by {c.author}
            </div>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-1 mb-2">
            {c.taste.slice(0, 2).map((t) => (
              <TasteTag key={t} label={t} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-1 md:flex-row md:items-start md:justify-between md:w-full">
            {adaptedActions.length > 0 ? (
              // One compact row per action, in the same deterministic
              // recipe-component order buildAdaptedCardActions() already
              // returns - a substitute gets the shared "adapted" tier icon
              // (reused, not a new one); a preparation gets no icon at all
              // (no existing preparation-specific icon to reuse, and the
              // instructions explicitly say not to invent a decorative one
              // just for this).
              //
              // UI polish (mobile follow-up) - left-aligned and
              // `inline-flex` unconditionally (not the card's usual
              // center-on-mobile/left-on-desktop split above) so the icon
              // stays bound to its text as one compact unit rather than
              // splitting across lines the way centered wrapped text did -
              // these read as status/action rows, not prose, so they don't
              // need the same centering treatment as the recipe name. Text
              // itself is short enough now (bare "<name>"/"Prep <name>",
              // no "Use"/"first") to fit one line at this card width in the
              // overwhelming majority of cases; a genuinely long ingredient
              // name still wraps naturally rather than overflowing - this
              // only keeps the icon from detaching onto its own line.
              <div className="flex flex-col items-start gap-0.5 w-full">
                {adaptedActions.map((action) => (
                  <span
                    key={action.ingId}
                    className="inline-flex items-center gap-1 text-xs font-mono text-violet"
                  >
                    {action.kind === "substitute" && <span>{cfg.icon}</span>}
                    <span>{action.text}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span
                className={clsx(
                  "text-xs font-mono flex items-center gap-1",
                  AVAIL_TONE[display.tier],
                )}
              >
                <span>{cfg.icon}</span> {display.label ?? cfg.label}
              </span>
            )}
            {/* UI polish - reads `display.tier` (the one field every
                primary-status surface reads), not the bare strict `avail`,
                so this chip never contradicts an adapted card's own
                actions above by re-showing the exact requirement those
                actions already resolved (e.g. "−Lime Juice" next to "⇄
                Lemon Juice"). Genuinely unresolved Almost/Unavailable
                cards are completely unaffected - `display.tier` equals the
                bare `avail` for both of those, same condition as before. */}
            {display.tier === "almost" && c.missingRequired[0] && (
              <span className="text-[11px] text-almost bg-almost/10 rounded-[4px] py-0.5 px-1.5 max-w-25 overflow-hidden text-ellipsis whitespace-nowrap">
                −{c.missingRequired[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function SmallCard({ c, onClick }) {
  // Stage D.1: same display fallback as CocktailCard above - keeps the
  // glass's full-opacity "available" look consistent for an adapted recipe.
  const display = c.display ?? { tier: c.avail }
  // UI polish - same compact-actions treatment as CocktailCard above (see
  // its own comment for the full reasoning); used on Home's "Make With
  // Adaptations" shelf, where every card is adapted by construction, so
  // this is the one place a member is specifically browsing what they can
  // adapt - showing the concrete action here is the highest-value spot
  // for it, not an afterthought.
  const adaptedActions =
    display.tier === "adapted"
      ? buildAdaptedCardActions(c.adapted?.resolvedRequired)
      : []
  return (
    <Card
      className="cursor-pointer min-w-[150px] max-w-[160px] p-3 flex flex-col items-center gap-2 shrink-0 transition-transform duration-150"
      onClick={onClick}
    >
      <GlassSvg
        type={c.glassShape}
        liquidColor={c.liquidColor}
        liquidColor2={c.liquidColor2}
        size={48}
        avail={display.tier}
      />
      <span className="font-display font-semibold text-[13px] text-center text-tx leading-[1.2]">
        {c.name}
      </span>
      {adaptedActions.length > 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          {adaptedActions.map((action) => (
            <span
              key={action.ingId}
              className="text-[10px] font-mono text-violet text-center leading-[1.3]"
            >
              {action.kind === "substitute" ? `${AVAIL_CFG.adapted.icon} ` : ""}
              {action.text}
            </span>
          ))}
        </div>
      ) : (
        // UI polish - reads `display.tier`, not the bare strict `avail`, so
        // this never contradicts an adapted card's own actions above (see
        // CocktailCard's matching comment) - unaffected for genuinely
        // unresolved Almost/Unavailable cards.
        display.tier === "almost" &&
        c.missingRequired[0] && (
          <span className="text-[10px] text-almost bg-almost/10 rounded-[4px] py-0.5 px-1.5 text-center leading-[1.3]">
            needs {c.missingRequired[0]}
          </span>
        )
      )}
    </Card>
  )
}
