// Rusty Pipes convention (final, settled 2026-09-14 after a factual audit
// of GlassSvg.jsx's renderer vs. every real stored layered recipe - do not
// reverse again): liquidColor is always the BOTTOM/base color, liquidColor2
// (when set) is always the TOP/upper color layered above it. Extracted as
// its own pure function so this mapping is unit-testable without rendering
// GlassSvg.jsx (no jsdom in this project's test setup - see AGENTS.md).
//
// GlassSvg's gradient has no `gradientUnits` set, so it defaults to
// `objectBoundingBox`, where offset 0% is the top of the filled shape and
// 100% is the bottom - true uniformly for every glass shape it draws. That
// means the TOP stop (0%) must get liquidColor2 and the BOTTOM stop (100%)
// must get liquidColor.
export function resolveGradientStops(liquidColor, liquidColor2) {
  return {
    topStopColor: liquidColor2,
    bottomStopColor: liquidColor,
  }
}
