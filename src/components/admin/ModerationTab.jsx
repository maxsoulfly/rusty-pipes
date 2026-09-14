import { useState } from "react"
import { IconLock, IconUpload } from "@/components/icons"
import { Btn, Card, Input } from "@/components/primitives"
import { unpublishRecipe } from "@/services/recipes"

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

// Currently-published community recipes, with Unpublish and Promote to
// Classic actions. Promote crosses into the Classic Recipes tab's data (it
// nulls owner_id via admin_promote_recipe_to_classic()), so
// onPromote/confirmPromote/promoting come from the AdminLayout shell rather
// than being local to this tab - a successful promote needs to refresh both
// this tab's communityRecipes list and the shared `computed` recipes the
// Classic Recipes tab derives from.
export function ModerationTab({
  communityRecipes,
  communityLoading,
  onCommunityRecipesChanged,
  confirmPromote,
  promoting,
  promoteError,
  onSetConfirmPromote,
  onPromote,
}) {
  const [communityQuery, setCommunityQuery] = useState("")
  const [confirmUnpublish, setConfirmUnpublish] = useState(null)
  const [unpublishing, setUnpublishing] = useState(false)
  const [unpublishError, setUnpublishError] = useState(null)

  const filtered = communityRecipes.filter((c) =>
    c.name.toLowerCase().includes(communityQuery.toLowerCase()),
  )

  const handleUnpublish = async (id) => {
    setUnpublishing(true)
    setUnpublishError(null)
    try {
      await unpublishRecipe(id)
      onCommunityRecipesChanged()
      setConfirmUnpublish(null)
    } catch (err) {
      setUnpublishError(err.message)
    } finally {
      setUnpublishing(false)
    }
  }

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        Published community recipes. Unpublishing returns a recipe to its
        owner's private list without deleting it.
      </p>
      <Input
        placeholder="Search community recipes..."
        value={communityQuery}
        onChange={setCommunityQuery}
      />
      {communityLoading ? (
        <p className="text-sm text-tx3">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-tx3">
          {communityQuery
            ? "No community recipes match."
            : "No published community recipes."}
        </p>
      ) : (
        filtered.map((c) => (
          <Card key={c.id} className="py-3.5 px-4">
            <div className="flex items-start gap-2.5">
              <div className="flex-1">
                <div className="text-[15px] font-display font-bold text-tx mb-[3px]">
                  {c.name}
                </div>
                <div className="text-xs text-tx3">
                  by {c.owner?.display_name ?? "unknown"}
                  {c.published_at &&
                    ` · published ${formatDate(c.published_at)}`}
                </div>
              </div>
              <div className="flex gap-1.5">
                {/* Icon-only on mobile, label restored at md: - "Promote to
                    Classic"/"Unpublish" as full text on every row was
                    crowding the title into 2-3 lines on narrow screens. */}
                <button
                  onClick={() =>
                    onSetConfirmPromote(confirmPromote === c.id ? null : c.id)
                  }
                  title="Promote to Classic"
                  aria-label="Promote to Classic"
                  className="bg-violet/10 border border-violet/25 rounded-sm py-1.5 px-3 cursor-pointer text-violet text-xs font-display font-semibold flex items-center gap-1"
                >
                  <IconUpload size={12} />
                  <span className="hidden md:inline">Promote to Classic</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmUnpublish(confirmUnpublish === c.id ? null : c.id)
                    setUnpublishError(null)
                  }}
                  title="Unpublish"
                  aria-label="Unpublish"
                  className="bg-coral/10 border border-coral/25 rounded-sm py-1.5 px-3 cursor-pointer text-coral text-xs font-display font-semibold flex items-center gap-1"
                >
                  <IconLock size={12} />
                  <span className="hidden md:inline">Unpublish</span>
                </button>
              </div>
            </div>
            {confirmPromote === c.id && (
              <div className="mt-3 p-3 bg-violet/8 rounded-sm border border-violet/25">
                <p className="mb-2.5 text-[13px] text-tx2">
                  {promoteError
                    ? promoteError
                    : `Promote "${c.name}" to the classic catalog? It becomes ownerless/admin-managed, but stays credited to ${c.owner?.display_name ?? "its author"} - this can be reversed from the Classic Recipes tab.`}
                </p>
                <div className="flex gap-2">
                  <Btn
                    variant="primary"
                    small
                    disabled={promoting}
                    onClick={() => onPromote(c.id)}
                  >
                    Promote
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => onSetConfirmPromote(null)}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
            {confirmUnpublish === c.id && (
              <div className="mt-3 p-3 bg-coral/8 rounded-sm border border-coral/25">
                <p className="mb-2.5 text-[13px] text-tx2">
                  {unpublishError
                    ? unpublishError
                    : `Unpublish "${c.name}"? It returns to ${c.owner?.display_name ?? "the owner"}'s private list — their copy won't be deleted.`}
                </p>
                <div className="flex gap-2">
                  <Btn
                    variant="danger"
                    small
                    disabled={unpublishing}
                    onClick={() => handleUnpublish(c.id)}
                  >
                    Unpublish
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => {
                      setConfirmUnpublish(null)
                      setUnpublishError(null)
                    }}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  )
}
