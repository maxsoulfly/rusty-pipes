import { GlassSvg } from "@/components/GlassSvg"
import { AvailBadge, SourceBadge, TasteTag } from "@/components/primitives"

export function HeroCard({ c }) {
  // Stage D.1: `display` (falling back to the bare `avail` string for any
  // caller that hasn't gone through computeMakeability, e.g. a stale
  // localStorage draft preview) is the primary status - a recipe resolvable
  // through a configured, owned substitute leads with "Make with
  // substitutions", never with a contradictory "Unavailable" badge.
  const display = c.display ?? { tier: c.avail, label: null, isAdapted: false }
  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-surface rounded-xl border border-bdr">
      <GlassSvg
        type={c.glassShape}
        liquidColor={c.liquidColor}
        liquidColor2={c.liquidColor2}
        size={96}
        avail={display.tier}
      />
      <div className="text-center">
        <div className="flex gap-1.5 justify-center mb-2">
          <SourceBadge source={c.source} />
          {c.author && (
            <span className="text-xs text-tx3 leading-[1.8]">
              by {c.author}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {c.taste.map((t) => (
            <TasteTag key={t} label={t} />
          ))}
        </div>
      </div>
      <AvailBadge avail={display.tier} label={display.label} />
      {/* The original recipe's own strict state stays visible and honest
          even when adapted - reworded (not "Missing", which would read as
          a second, contradictory status right under the badge above) so it
          reads as background on the unadapted original, not a competing
          claim. */}
      {c.avail === "almost" && c.missingRequired[0] && (
        <div className="bg-almost/10 border border-almost/30 rounded-sm py-2 px-3.5 text-center">
          <span className="text-[13px] text-almost">
            {display.isAdapted ? "Original recipe still needs" : "Missing"}:{" "}
            <strong>{c.missingRequired.join(", ")}</strong>
          </span>
        </div>
      )}
      {c.family && (
        <span className="text-xs text-tx3 font-mono">Family: {c.family}</span>
      )}
    </div>
  )
}
