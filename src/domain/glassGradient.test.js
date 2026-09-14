import { describe, expect, it } from "vitest"
import { resolveGradientStops } from "./glassGradient"

describe("resolveGradientStops", () => {
  it("maps liquidColor2 to the top stop and liquidColor to the bottom stop", () => {
    const { topStopColor, bottomStopColor } = resolveGradientStops(
      "#d92323", // liquidColor - e.g. Tequila Sunrise's grenadine
      "#f5a623", // liquidColor2 - e.g. Tequila Sunrise's orange juice
    )
    expect(topStopColor).toBe("#f5a623")
    expect(bottomStopColor).toBe("#d92323")
  })

  it("never swaps the two colors relative to their field - liquidColor always ends up as the bottom stop", () => {
    const { topStopColor, bottomStopColor } = resolveGradientStops(
      "#111111",
      "#222222",
    )
    expect(bottomStopColor).toBe("#111111")
    expect(topStopColor).toBe("#222222")
    expect(bottomStopColor).not.toBe(topStopColor)
  })
})
