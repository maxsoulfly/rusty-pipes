// Cold-start clock-skew recovery for the first authenticated PostgREST reads.
//
// Symptom: on the first app open after the stored access token has expired
// (typically the next day - Supabase access tokens live 1 hour), the app
// showed "Something went wrong - JWT issued at future", and tapping "Try
// Again" fixed it immediately with no other change.
//
// Cause: `getSession()` sees the expired token on startup and refreshes it,
// so a brand-new access token is minted by GoTrue (Supabase Auth) and the
// app fires `fetchProfile`/`fetchMembership` (then the catalog/inventory/
// recipe/list reads) against PostgREST within a fraction of a second. The
// token's `iat` (issued-at) claim is stamped by GoTrue; PostgREST validates
// it against its own node clock with zero skew allowance. When PostgREST's
// clock briefly trails GoTrue's at that instant, `iat` is "in the future"
// and PostgREST returns 401 `PGRST301` with message "JWT issued at future".
// Wall-clock advances past `iat` within about a second, so the *same* token
// validates on retry - which is exactly why "Try Again" worked. Any other
// time of day the token is minutes old before it's first used, so the window
// never opens.
//
// This is deliberately narrow. It retries ONLY the two messages that mean
// "this exact token will be valid in a moment" - `iat` in the future and
// `nbf` (not-before) not yet reached. Expired / invalid-signature /
// missing-claim / malformed JWT errors are NOT retried here: they need a
// real re-auth or a reload, and looping on them would just delay a genuine
// failure. It never touches token validation itself.

const CLOCK_SKEW_JWT_MESSAGES = [/issued at future/i, /not yet valid/i]

// True only for the transient "valid in a moment" JWT errors above. Matches
// on the PostgREST message text, not the `code`: PGRST301 also covers "JWT
// expired", which must not be retried.
export function isClockSkewJwtError(error) {
  const message = error?.message
  if (typeof message !== "string") return false
  return CLOCK_SKEW_JWT_MESSAGES.some((re) => re.test(message))
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Runs `fn`; if it rejects with the clock-skew JWT error above, retries with
// exponential backoff (300ms, 600ms, 1200ms by default - ~2.1s total across
// 3 retries, inside the self-heal window). Every other rejection, and
// exhausting the retries, rethrows unchanged so the caller's normal error
// handling (App.jsx's ErrorScreen + "Try Again") still applies. While this
// is retrying, the calling hook simply stays in its existing loading state,
// so the app keeps showing its normal loading screen rather than a flash of
// error.
export async function retryOnClockSkew(
  fn,
  { retries = 3, baseDelayMs = 300, sleep = defaultSleep } = {},
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= retries || !isClockSkewJwtError(error)) throw error
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
}
