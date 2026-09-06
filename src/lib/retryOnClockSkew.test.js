import { describe, expect, it, vi } from "vitest"
import { isClockSkewJwtError, retryOnClockSkew } from "./retryOnClockSkew"

const skewError = (message) =>
  Object.assign(new Error(message), {
    code: "PGRST301",
  })

describe("isClockSkewJwtError", () => {
  it("matches the 'issued at future' iat rejection", () => {
    expect(isClockSkewJwtError(skewError("JWT issued at future"))).toBe(true)
  })

  it("matches the 'not yet valid' nbf rejection", () => {
    expect(isClockSkewJwtError(skewError("JWT not yet valid"))).toBe(true)
  })

  it("is case-insensitive on the message", () => {
    expect(isClockSkewJwtError(skewError("jwt ISSUED AT FUTURE"))).toBe(true)
  })

  it("does NOT match an expired token (needs re-auth, not a retry)", () => {
    expect(isClockSkewJwtError(skewError("JWT expired"))).toBe(false)
  })

  it("does NOT match other JWT / auth failures", () => {
    expect(isClockSkewJwtError(skewError("invalid JWT"))).toBe(false)
    expect(isClockSkewJwtError(skewError("JWSError JWSInvalidSignature"))).toBe(
      false,
    )
  })

  it("is safe on non-error / message-less inputs", () => {
    expect(isClockSkewJwtError(null)).toBe(false)
    expect(isClockSkewJwtError(undefined)).toBe(false)
    expect(isClockSkewJwtError({})).toBe(false)
    expect(isClockSkewJwtError("JWT issued at future")).toBe(false)
  })
})

describe("retryOnClockSkew", () => {
  const noSleep = { sleep: vi.fn().mockResolvedValue(undefined) }

  it("returns the result without retrying when fn succeeds first try", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn().mockResolvedValue("ok")
    await expect(retryOnClockSkew(fn, { sleep })).resolves.toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("retries the clock-skew error then resolves, with exponential backoff", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi
      .fn()
      .mockRejectedValueOnce(skewError("JWT issued at future"))
      .mockRejectedValueOnce(skewError("JWT issued at future"))
      .mockResolvedValueOnce("recovered")
    await expect(retryOnClockSkew(fn, { sleep })).resolves.toBe("recovered")
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([300, 600])
  })

  it("rethrows after exhausting the bounded retries", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const err = skewError("JWT issued at future")
    const fn = vi.fn().mockRejectedValue(err)
    await expect(retryOnClockSkew(fn, { retries: 3, sleep })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(4) // initial + 3 retries
    expect(sleep).toHaveBeenCalledTimes(3)
  })

  it("does not retry a non-clock-skew error - fails fast", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const err = skewError("JWT expired")
    const fn = vi.fn().mockRejectedValue(err)
    await expect(retryOnClockSkew(fn, { sleep })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("honours a custom retry count", async () => {
    const fn = vi.fn().mockRejectedValue(skewError("JWT not yet valid"))
    await expect(
      retryOnClockSkew(fn, { retries: 1, ...noSleep }),
    ).rejects.toThrow("JWT not yet valid")
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
