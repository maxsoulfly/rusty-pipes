import { useState } from "react"
import clsx from "clsx"
import { useNavigate } from "react-router-dom"
import { IconChevD, IconEdit, IconTrash } from "@/components/icons"
import { Btn, Card, Input } from "@/components/primitives"
import { deleteRecipe } from "@/services/recipes"

// The ownerless classic catalog, split out from Community (published member
// recipes) into its own admin list per the user's request -
// browsing/editing/deleting classics through Library/Detail worked, but
// reads and feels like a member screen, not an admin one, and there was no
// way to delete a classic at all despite the RLS "recipes: delete" policy
// already allowing it for owner_id is null rows.
//
// Demote (a classic promoted from a community recipe, back to its original
// author) is the one action here that crosses into the Moderation tab's own
// data - onDemote/confirmDemoteId/demoting/demoteError all come from the
// AdminLayout shell rather than being local to this tab, since a successful
// demote needs to refresh the shell-owned communityRecipes list too.
//
// Edit/Delete are admin-only (classic-recipe editing is out of moderator's
// agreed scope); Demote needs no extra check here - reaching this tab at
// all already requires isStaff, and Demote is fully in scope for any
// staff member who gets there.
export function ClassicRecipesTab({
  classicRecipes,
  refetchRecipes,
  isAdmin,
  confirmDemoteId,
  demoting,
  demoteError,
  onSetConfirmDemote,
  onDemote,
}) {
  const navigate = useNavigate()
  const [classicQuery, setClassicQuery] = useState("")
  const [confirmDeleteClassicId, setConfirmDeleteClassicId] = useState(null)
  const [deletingClassic, setDeletingClassic] = useState(false)
  const [deleteClassicError, setDeleteClassicError] = useState(null)

  const filtered = classicRecipes.filter((r) =>
    r.name.toLowerCase().includes(classicQuery.toLowerCase()),
  )

  const handleDeleteClassic = async (id) => {
    setDeletingClassic(true)
    setDeleteClassicError(null)
    try {
      await deleteRecipe(id)
      await refetchRecipes()
      setConfirmDeleteClassicId(null)
    } catch (err) {
      setDeleteClassicError(err.message)
    } finally {
      setDeletingClassic(false)
    }
  }

  return (
    <div className="fade-in flex flex-col gap-3">
      <p className="text-[13px] text-tx2">
        The ownerless classic catalog. Edit any of these directly, or delete one
        - that's permanent, unlike unpublishing a community recipe. A classic
        promoted from a community recipe (via the Moderation tab) can be demoted
        back to its original author.
      </p>
      <Input
        placeholder="Search classic recipes..."
        value={classicQuery}
        onChange={setClassicQuery}
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-tx3">
          {classicQuery
            ? "No classic recipes match."
            : "No classic recipes yet."}
        </p>
      ) : (
        filtered.map((r) => (
          <Card key={r.id} className="py-3.5 px-4">
            <div className="flex items-start gap-2.5">
              <div className="flex-1">
                <div className="text-[15px] font-display font-bold text-tx mb-[3px]">
                  {r.name}
                </div>
                <div className="text-xs text-tx3">
                  {r.family ?? "No family"} · {r.glass}
                  {r.originalOwnerId &&
                    ` · originally by ${r.author ?? "a member"}`}
                </div>
              </div>
              {/* Icon-only on mobile, label restored at md: - three full-text
                  buttons on one row was crowding the title into multiple
                  lines on narrow screens. */}
              {r.originalOwnerId && (
                <button
                  onClick={() =>
                    onSetConfirmDemote(confirmDemoteId === r.id ? null : r.id)
                  }
                  title="Demote to Community"
                  aria-label="Demote to Community"
                  className="bg-violet/10 border border-violet/25 rounded-sm py-1.5 px-3 cursor-pointer text-violet text-xs font-display font-semibold flex items-center gap-1"
                >
                  <IconChevD
                    size={12}
                    className={clsx(
                      "transition-transform duration-150",
                      confirmDemoteId === r.id && "rotate-180",
                    )}
                  />
                  <span className="hidden md:inline">Demote to Community</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => navigate(`/library/${r.id}/edit`)}
                  title="Edit"
                  aria-label="Edit"
                  className="bg-cyan/10 border border-cyan/25 rounded-sm py-1.5 px-3 cursor-pointer text-cyan text-xs font-display font-semibold flex items-center gap-1"
                >
                  <IconEdit size={12} />
                  <span className="hidden md:inline">Edit</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    setConfirmDeleteClassicId(
                      confirmDeleteClassicId === r.id ? null : r.id,
                    )
                    setDeleteClassicError(null)
                  }}
                  title="Delete"
                  aria-label="Delete"
                  className="bg-coral/10 border border-coral/25 rounded-sm py-1.5 px-3 cursor-pointer text-coral text-xs font-display font-semibold flex items-center gap-1"
                >
                  <IconTrash size={12} />
                  <span className="hidden md:inline">Delete</span>
                </button>
              )}
            </div>
            {confirmDemoteId === r.id && (
              <div className="mt-3 p-3 bg-violet/8 rounded-sm border border-violet/25">
                <p className="mb-2.5 text-[13px] text-tx2">
                  {demoteError
                    ? demoteError
                    : `Demote "${r.name}" back to a community recipe owned by ${r.author ?? "its original author"}?`}
                </p>
                <div className="flex gap-2">
                  <Btn
                    variant="primary"
                    small
                    disabled={demoting}
                    onClick={() => onDemote(r.id)}
                  >
                    Demote
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => onSetConfirmDemote(null)}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
            {isAdmin && confirmDeleteClassicId === r.id && (
              <div className="mt-3 p-3 bg-coral/8 rounded-sm border border-coral/25">
                <p className="mb-2.5 text-[13px] text-tx2">
                  {deleteClassicError
                    ? deleteClassicError
                    : `Delete "${r.name}"? This removes it from the catalog for every member and can't be undone.`}
                </p>
                <div className="flex gap-2">
                  <Btn
                    variant="danger"
                    small
                    disabled={deletingClassic}
                    onClick={() => handleDeleteClassic(r.id)}
                  >
                    Delete
                  </Btn>
                  <Btn
                    variant="ghost"
                    small
                    onClick={() => {
                      setConfirmDeleteClassicId(null)
                      setDeleteClassicError(null)
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
