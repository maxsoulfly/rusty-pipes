import clsx from "clsx"
import { GlassSvg } from "@/components/GlassSvg"
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
          <div className="flex flex-col items-center gap-1 md:flex-row md:items-center md:justify-between md:w-full">
            <span
              className={clsx(
                "text-xs font-mono flex items-center gap-1",
                AVAIL_TONE[display.tier],
              )}
            >
              <span>{cfg.icon}</span> {display.label ?? cfg.label}
            </span>
            {c.avail === "almost" && c.missingRequired[0] && (
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
      {c.avail === "almost" && c.missingRequired[0] && (
        <span className="text-[10px] text-almost bg-almost/10 rounded-[4px] py-0.5 px-1.5 text-center leading-[1.3]">
          needs {c.missingRequired[0]}
        </span>
      )}
    </Card>
  )
}
