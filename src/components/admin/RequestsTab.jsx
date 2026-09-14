import { useState } from "react"
import { IconPlus, IconX } from "@/components/icons"
import { Card } from "@/components/primitives"
import { resolveIngredientRequest } from "@/services/ingredientRequests"

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

// Members' suggestions for missing ingredient types (see
// RequestIngredientScreen.jsx). Fulfilling one doesn't auto-create the type
// - the admin still goes through Batch Import for that (onAddToCatalog,
// which lives in the AdminLayout shell since it also jumps to the Batch
// Import tab), since a request is just a name/note, not a validated
// category+hierarchy.
export function RequestsTab({
  pendingRequests,
  requestsLoading,
  onRequestsChanged,
  onAddToCatalog,
}) {
  const [resolvingRequestId, setResolvingRequestId] = useState(null)
  const [dismissError, setDismissError] = useState(null)

  // The only remaining manual resolution - "fulfilled" now only ever
  // happens as a side effect of successfully adding the ingredient, never
  // as its own button, so there's nothing left to accidentally mark done
  // without actually creating the type.
  const handleDismissRequest = async (id) => {
    setResolvingRequestId(id)
    setDismissError(null)
    try {
      await resolveIngredientRequest(id, "dismissed")
      onRequestsChanged()
    } catch (err) {
      setDismissError({ id, message: err.message })
    } finally {
      setResolvingRequestId(null)
    }
  }

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        Ingredients members have asked for. "+" adds it to the catalog and marks
        the request fulfilled in one step; "×" dismisses a request without
        adding anything.
      </p>
      {requestsLoading ? (
        <p className="text-sm text-tx3">Loading...</p>
      ) : pendingRequests.length === 0 ? (
        <p className="text-sm text-tx3">No pending requests.</p>
      ) : (
        pendingRequests.map((r) => (
          <Card key={r.id} className="py-3.5 px-4">
            <div className="flex items-start gap-2.5">
              <div className="flex-1">
                <div className="text-[15px] font-display font-bold text-tx mb-[3px]">
                  {r.name}
                </div>
                <div className="text-xs text-tx3">
                  by {r.requester?.display_name ?? "unknown"} ·{" "}
                  {formatDate(r.created_at)}
                </div>
                {r.note && (
                  <p className="mt-1.5 text-[13px] text-tx2">{r.note}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => onAddToCatalog(r.name, r.id)}
                  title="Add to catalog"
                  className="bg-cyan/10 border border-cyan/25 rounded-[6px] py-1.5 px-2 cursor-pointer text-cyan"
                >
                  <IconPlus size={14} />
                </button>
                <button
                  onClick={() => handleDismissRequest(r.id)}
                  disabled={resolvingRequestId === r.id}
                  title="Dismiss"
                  className="bg-coral/10 border border-coral/25 rounded-[6px] py-1.5 px-2 cursor-pointer text-coral"
                >
                  <IconX size={14} />
                </button>
              </div>
            </div>
            {dismissError?.id === r.id && (
              <p className="mt-2 text-xs text-coral">{dismissError.message}</p>
            )}
          </Card>
        ))
      )}
    </div>
  )
}
