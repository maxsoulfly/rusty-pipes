import { useEffect, useState } from "react"
import { retryOnClockSkew } from "@/lib/retryOnClockSkew"
import { fetchMembership, fetchProfile } from "@/services/membership"

export function useMembership(userId) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    profile: null,
    isMember: false,
    isRevoked: false,
  })
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!userId) {
      setState({
        loading: false,
        error: null,
        profile: null,
        isMember: false,
        isRevoked: false,
      })
      return
    }
    let active = true
    setState((prev) => ({ ...prev, loading: true }))
    // First authenticated reads after startup - see retryOnClockSkew.js for
    // why a freshly refreshed token can be briefly rejected as "issued at
    // future". The hook stays `loading: true` across the retries, so App.jsx
    // keeps showing the normal loading screen rather than flashing an error.
    retryOnClockSkew(() =>
      Promise.all([fetchProfile(userId), fetchMembership(userId)]),
    )
      .then(([profile, membership]) => {
        if (active)
          setState({
            loading: false,
            error: null,
            profile,
            isMember: Boolean(membership) && !membership.revoked_at,
            isRevoked: Boolean(membership?.revoked_at),
          })
      })
      // Previously collapsed any failure (network error, RLS hiccup) into
      // the same defaults as "never joined" - isMember: false routes
      // straight to JoinScreen's "enter an invite code" form (App.jsx),
      // which is actively misleading for a transient error: a real member
      // hitting a network blip would see a screen telling them to redeem
      // an invitation they already used. Recording the error instead lets
      // App.jsx show a real error screen and distinguish the two cases.
      .catch((err) => {
        if (active)
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message,
          }))
      })
    return () => {
      active = false
    }
  }, [userId, refreshToken])

  return { ...state, refetch: () => setRefreshToken((t) => t + 1) }
}
