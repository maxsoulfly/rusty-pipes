// Flat glass silhouette with a liquid-color fill — the spec's stand-in for
// recipe photography. Fill opacity drops when the cocktail is unavailable.
// One branch per shape key in GLASS_SHAPES (src/data/constants.js) - keep
// the two lists in sync when adding a new glass shape.

import { useId } from "react"
import { resolveGradientStops } from "@/domain/glassGradient"

export function GlassSvg({
  type,
  liquidColor,
  liquidColor2,
  size = 64,
  avail = "unavail",
  color = "var(--text2)",
}) {
  // 0.2 read as "the color is wrong" rather than "unavailable" - a user
  // adding a real recipe couldn't tell their own color choice had actually
  // saved correctly, since it looked identical to a broken/missing value.
  // 0.45 keeps a real visual difference from the 0.72 available state
  // (still an availability cue, not just decoration) while keeping the
  // actual hue recognizable - the "○ Unavailable" text label underneath
  // is still the primary, unambiguous signal either way.
  const liqOp = avail === "unavail" ? 0.45 : 0.72

  // Optional second color, for layered/gradient cocktails (Tequila Sunrise,
  // a layered shot, a rainbow shot) that a single flat fill can't represent
  // at all - a simple top-to-bottom 2-tone gradient, not a full N-layer
  // band system (see the migration's own comment for why). `fill` swaps in
  // for the plain liquid color used everywhere below - every shape branch
  // already fills its liquid shape identically, so this is a single
  // substitution point rather than touching all ~20 branches.
  //
  // No `gradientUnits` is set below, so this defaults to
  // `objectBoundingBox`, where offset 0% is the top of whichever shape this
  // gradient fills and 100% is the bottom - true uniformly for every shape
  // branch, since none of them apply a transform to the filled element.
  // resolveGradientStops() (src/domain/glassGradient.js) owns which color
  // goes to which end - see its own comment for the settled convention and
  // why this used to be reversed.
  const gradId = useId()
  const fill = liquidColor2 ? `url(#${gradId})` : liquidColor
  const { topStopColor, bottomStopColor } = resolveGradientStops(
    liquidColor,
    liquidColor2,
  )
  const gradientDefs = liquidColor2 && (
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={topStopColor} />
        <stop offset="100%" stopColor={bottomStopColor} />
      </linearGradient>
    </defs>
  )
  const stk = {
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  }
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 56 56",
    fill: "none",
    style: { color },
  }

  if (type === "rocks")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="11"
          y="20"
          width="34"
          height="24"
          rx="2"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M12 16 L11 44 L45 44 L44 16 Z" {...stk} />
        <rect
          x="16"
          y="20"
          width="8"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeOpacity={0.35}
          fill="none"
        />
        <rect
          x="28"
          y="18"
          width="8"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeOpacity={0.35}
          fill="none"
        />
      </svg>
    )
  if (type === "highball")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="15"
          y="22"
          width="26"
          height="26"
          rx="2"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M17 6 L15 48 L41 48 L39 6 Z" {...stk} />
        <rect
          x="20"
          y="11"
          width="7"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeOpacity={0.3}
          fill="none"
        />
        <rect
          x="31"
          y="9"
          width="7"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeOpacity={0.3}
          fill="none"
        />
      </svg>
    )
  // Taller and narrower than the highball, straight-sided all the way down -
  // the real distinction between the two glasses.
  if (type === "collins")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="20"
          y="16"
          width="16"
          height="32"
          rx="2"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M20 4 L19 50 L37 50 L36 4 Z" {...stk} />
      </svg>
    )
  if (type === "coupe")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M10 10 Q10 30 28 34 Q46 30 46 10 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M10 10 Q10 32 28 36 Q46 32 46 10" {...stk} />
        <line x1="8" y1="10" x2="48" y2="10" {...stk} />
        <line x1="28" y1="36" x2="28" y2="46" {...stk} />
        <line x1="19" y1="46" x2="37" y2="46" {...stk} />
      </svg>
    )
  // Between a coupe and a martini - a narrower, more tapered bowl than the
  // coupe's wide shallow curve, but rounded at the bottom instead of coming
  // to the martini's sharp point.
  if (type === "nick_and_nora")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M14 10 Q14 24 28 30 Q42 24 42 10 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M14 10 Q14 24 28 30 Q42 24 42 10" {...stk} />
        <line x1="12" y1="10" x2="44" y2="10" {...stk} />
        <line x1="28" y1="30" x2="28" y2="42" {...stk} />
        <line x1="20" y1="42" x2="36" y2="42" {...stk} />
      </svg>
    )
  if (type === "martini")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <polygon points="10,10 46,10 28,34" fill={fill} fillOpacity={liqOp} />
        <path d="M10 10 L28 34 L46 10" {...stk} />
        <line x1="8" y1="10" x2="48" y2="10" {...stk} />
        <line x1="28" y1="34" x2="28" y2="44" {...stk} />
        <line x1="19" y1="44" x2="37" y2="44" {...stk} />
      </svg>
    )
  if (type === "copper_mug")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="17"
          y="24"
          width="22"
          height="20"
          rx="1"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M14 20 L16 46 L38 46 L40 20 Z" {...stk} />
        <path d="M40 24 Q50 24 50 33 Q50 42 40 42" {...stk} />
      </svg>
    )
  // Vase-like hourglass silhouette - the tropical-drink equivalent of the
  // wine glass's curve, just wider and with a pinch in the middle.
  if (type === "hurricane")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M16 6 Q13 18 20 26 Q13 34 16 48 L40 48 Q43 34 36 26 Q43 18 40 6 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path
          d="M16 6 Q13 18 20 26 Q13 34 16 48 L40 48 Q43 34 36 26 Q43 18 40 6 Z"
          {...stk}
        />
        <line x1="14" y1="6" x2="42" y2="6" {...stk} />
      </svg>
    )
  // Squat handleless barrel mug, no stem/foot - deliberately chunkier than
  // every other glass here.
  if (type === "tiki_mug")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="18"
          y="20"
          width="20"
          height="24"
          rx="2"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M15 16 Q28 10 41 16 L38 47 L18 47 Z" {...stk} />
      </svg>
    )
  // Wide flat rim, bulging convex shoulders, tapering to a point at the
  // bottom of the bowl (not a coupe's flat-bottomed curve, not a martini's
  // straight-sided V) - the actual margarita silhouette.
  if (type === "margarita")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M6 8 Q2 24 28 36 Q54 24 50 8 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M6 8 Q2 24 28 36 Q54 24 50 8" {...stk} />
        <line x1="4" y1="8" x2="52" y2="8" {...stk} />
        <line x1="28" y1="36" x2="28" y2="46" {...stk} />
        <line x1="19" y1="46" x2="37" y2="46" {...stk} />
      </svg>
    )
  // Narrower and shorter than the red wine bowl below.
  if (type === "white_wine")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M19 10 Q17 22 21 28 Q24 33 28 35 Q32 33 35 28 Q39 22 37 10 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path
          d="M19 10 Q17 22 21 28 Q24 33 28 35 Q32 33 35 28 Q39 22 37 10 Z"
          {...stk}
        />
        <line x1="28" y1="35" x2="28" y2="46" {...stk} />
        <line x1="20" y1="46" x2="36" y2="46" {...stk} />
      </svg>
    )
  if (type === "red_wine")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M16 6 Q13 22 18 30 Q22 36 28 38 Q34 36 38 30 Q43 22 40 6 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path
          d="M16 6 Q13 22 18 30 Q22 36 28 38 Q34 36 38 30 Q43 22 40 6 Z"
          {...stk}
        />
        <line x1="28" y1="38" x2="28" y2="48" {...stk} />
        <line x1="20" y1="48" x2="36" y2="48" {...stk} />
      </svg>
    )
  if (type === "champagne_flute")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="23"
          y="14"
          width="10"
          height="20"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M23 8 L22 34 L34 34 L33 8 Z" {...stk} />
        <line x1="21" y1="8" x2="35" y2="8" {...stk} />
        <line x1="28" y1="34" x2="28" y2="46" {...stk} />
        <line x1="20" y1="46" x2="36" y2="46" {...stk} />
      </svg>
    )
  // Same slender stem/base as the flute, but the bowl bulges out in the
  // lower half before tapering back in at the rim.
  if (type === "champagne_tulip")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M25 6 Q20 16 22 24 Q24 30 28 31 Q32 30 34 24 Q36 16 31 6 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path
          d="M25 6 Q20 16 22 24 Q24 30 28 31 Q32 30 34 24 Q36 16 31 6 Z"
          {...stk}
        />
        <line x1="28" y1="31" x2="28" y2="44" {...stk} />
        <line x1="20" y1="44" x2="36" y2="44" {...stk} />
      </svg>
    )
  // No stem, flared wider at the rim than the base - the "shaker pint" shape.
  if (type === "pint")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M15 20 L18 44 L38 44 L41 20 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M12 14 L16 46 L40 46 L44 14 Z" {...stk} />
      </svg>
    )
  // A true cone - narrow base flaring all the way out to a wide rim.
  if (type === "pilsner")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M24 14 L14 44 L42 44 L32 14 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M22 8 L10 46 L46 46 L34 8 Z" {...stk} />
      </svg>
    )
  // Wider/shorter than the copper mug, with a heavier double-line rim to
  // read as thick glass or ceramic rather than thin metal.
  if (type === "beer_stein")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <rect
          x="16"
          y="26"
          width="22"
          height="18"
          rx="1"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M12 20 L14 46 L40 46 L42 20 Z" {...stk} />
        <line x1="14" y1="24" x2="40" y2="24" {...stk} />
        <path d="M42 24 Q52 24 52 33 Q52 42 42 42" {...stk} />
      </svg>
    )
  // Nosing glass - bulbous body that tapers inward at the rim (the opposite
  // taper direction from every tumbler/cone shape above), short stem.
  if (type === "glencairn")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M18 10 Q14 24 20 34 Q24 40 28 40 Q32 40 36 34 Q42 24 38 10 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path
          d="M18 10 Q14 24 20 34 Q24 40 28 40 Q32 40 36 34 Q42 24 38 10 Z"
          {...stk}
        />
        <line x1="28" y1="40" x2="28" y2="44" {...stk} />
        <line x1="22" y1="46" x2="34" y2="46" {...stk} />
      </svg>
    )
  if (type === "shot")
    return (
      <svg {...svgProps}>
        {gradientDefs}
        <path
          d="M19 24 L21 40 L35 40 L37 24 Z"
          fill={fill}
          fillOpacity={liqOp}
        />
        <path d="M18 20 L21 42 L35 42 L38 20 Z" {...stk} />
        <line x1="17" y1="20" x2="39" y2="20" {...stk} />
      </svg>
    )
  // Unmatched shape key falls back to the martini silhouette.
  return (
    <svg {...svgProps}>
      {gradientDefs}
      <polygon points="10,10 46,10 28,34" fill={fill} fillOpacity={liqOp} />
      <path d="M10 10 L28 34 L46 10" {...stk} />
      <line x1="8" y1="10" x2="48" y2="10" {...stk} />
      <line x1="28" y1="34" x2="28" y2="44" {...stk} />
      <line x1="19" y1="44" x2="37" y2="44" {...stk} />
    </svg>
  )
}
