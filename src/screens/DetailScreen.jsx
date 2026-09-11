import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import { useNavigate, useOutletContext, useParams } from "react-router-dom"
import { IconBookmark, IconHeart } from "@/components/icons"
import { TopBar } from "@/components/Nav"
import { ActionButtons } from "@/components/detail/ActionButtons"
import { HeroCard } from "@/components/detail/HeroCard"
import { IngredientsSection } from "@/components/detail/IngredientsSection"
import { ServingsSelector } from "@/components/detail/ServingsSelector"
import { StepsSection } from "@/components/detail/StepsSection"
import { Btn, ConfirmPanel } from "@/components/primitives"
import { buildSubstituteSuggester } from "@/domain/substituteSuggestions"
import {
  deleteRecipe,
  publishRecipe,
  unpublishRecipe,
} from "@/services/recipes"

export default function DetailScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const {
    computed,
    unit,
    setUnit,
    favorites,
    wantToMake,
    toggleFav,
    toggleWtm,
    owned,
    userId,
    isAdmin,
    isStaff,
    refetchRecipes,
    catalog,
    ingredientTypesById,
  } = useOutletContext()

  // Catalogue "Suggested substitutes" (Stage B) - display-only hints on
  // missing rows, owned stand-ins first. Never feeds computeAvail(), so
  // availability / makeable counts / Buy Next are untouched.
  const getSubstituteSuggestions = useMemo(
    () =>
      buildSubstituteSuggester(
        catalog.ingredientSubstitutions,
        owned,
        (tid) => ingredientTypesById.get(tid)?.name ?? tid,
      ),
    [catalog.ingredientSubstitutions, owned, ingredientTypesById],
  )
  const [showConfirmShare, setShowConfirmShare] = useState(false)
  const [showConfirmUnpublish, setShowConfirmUnpublish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [actionError, setActionError] = useState(null)
  // Local, not persisted like the ml/oz unit preference - "how many am I
  // making right now" is per-visit, not a saved setting. Reset whenever the
  // recipe itself changes (id) so navigating from one recipe to another
  // doesn't carry a stale serving count over via this still-mounted screen.
  const [servings, setServings] = useState(1)
  // Also local/not persisted - parts is a view toggle, not a saved unit
  // preference like `unit` (ml/oz). Selecting it never touches `unit`, so
  // the saved preference is preserved underneath and comes right back when
  // parts mode is turned off. Reset alongside servings for the same reason.
  const [partsMode, setPartsMode] = useState(false)
  useEffect(() => {
    setServings(1)
    setPartsMode(false)
  }, [id])

  const c = computed.find((item) => item.id === id)

  if (!c) {
    return (
      <div className="py-15 px-6 text-center text-tx3">
        <p className="mb-3 text-base font-display font-semibold">
          Cocktail not found
        </p>
        <Btn variant="ghost" small onClick={() => navigate("/library")}>
          Back to library
        </Btn>
      </div>
    )
  }

  const isFav = favorites.has(c.id)
  const isWtm = wantToMake.has(c.id)
  const isOwner = c.ownerId === userId
  // canManage gates Unpublish on a community recipe - the same action
  // ModerationTab.jsx grants moderator, so it needs to behave consistently
  // wherever it appears, not just from the Moderation tab list.
  const canManage = isOwner || isStaff
  // Spec §4: owners can edit their own recipe; admins are limited to the
  // classic catalog (owner_id null) - matches the DB-enforced rule in
  // supabase/migrations/20260815231800_tighten_recipe_edit_scope.sql.
  // Deliberately isAdmin, not isStaff/isModerator - classic-recipe editing
  // is out of moderator's scope.
  const canEdit = isOwner || (isAdmin && c.source === "classic")

  const handlePublish = async () => {
    setPublishing(true)
    setActionError(null)
    try {
      await publishRecipe(c.id)
      await refetchRecipes()
      setShowConfirmShare(false)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    setUnpublishing(true)
    setActionError(null)
    try {
      await unpublishRecipe(c.id)
      await refetchRecipes()
      setShowConfirmUnpublish(false)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUnpublishing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setActionError(null)
    try {
      await deleteRecipe(c.id)
      await refetchRecipes()
      navigate("/library")
    } catch (err) {
      setActionError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="pb-[calc(96px_+_env(safe-area-inset-bottom,0px))]">
      <TopBar
        title={c.name}
        onBack={() => navigate(-1)}
        right={
          <div className="flex gap-2">
            <button
              onClick={() => toggleFav(c.id)}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFav}
              className={clsx(
                "rounded-sm w-9 h-9 cursor-pointer flex items-center justify-center border",
                isFav
                  ? "bg-coral/15 border-coral text-coral"
                  : "bg-surface border-bdr text-tx2",
              )}
            >
              <IconHeart size={16} />
            </button>
            <button
              onClick={() => toggleWtm(c.id)}
              aria-label={
                isWtm ? "Remove from Want to Make" : "Add to Want to Make"
              }
              aria-pressed={isWtm}
              className={clsx(
                "rounded-sm w-9 h-9 cursor-pointer flex items-center justify-center border",
                isWtm
                  ? "bg-violet/15 border-violet text-violet"
                  : "bg-surface border-bdr text-tx2",
              )}
            >
              <IconBookmark size={16} />
            </button>
          </div>
        }
      />

      <div className="py-6 px-5 flex flex-col gap-6">
        <HeroCard c={c} />

        {/* Split on blank/single line breaks so a multi-paragraph description
            (e.g. a base description plus a separate "Legal & Ingredient
            Note" callout) renders as real paragraphs instead of one run-on
            block - a plain single <p> collapses every newline in the stored
            text down to a space. */}
        {c.description && (
          <div className="flex flex-col gap-2.5">
            {c.description
              .split(/\n+/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-sm text-tx2 leading-[1.6]">
                  {para}
                </p>
              ))}
          </div>
        )}

        {!partsMode && (
          <ServingsSelector servings={servings} onChange={setServings} />
        )}

        <IngredientsSection
          ings={c.ings}
          substitutions={c.substitutions}
          householdBasics={c.householdBasics}
          formConversions={c.formConversions}
          missingOptional={c.missingOptional}
          owned={owned}
          unit={unit}
          setUnit={setUnit}
          servings={servings}
          partsMode={partsMode}
          setPartsMode={setPartsMode}
          getSubstituteSuggestions={getSubstituteSuggestions}
          adapted={c.adapted}
        />

        <StepsSection steps={c.steps} />

        <ActionButtons
          c={c}
          unit={unit}
          servings={servings}
          partsMode={partsMode}
          isOwner={isOwner}
          canEdit={canEdit}
          canManage={canManage}
          onTogglePublish={() => setShowConfirmShare(!showConfirmShare)}
          onRequestDelete={() => setConfirmDelete(true)}
          onRequestUnpublish={() => setShowConfirmUnpublish(true)}
        />

        {showConfirmShare && (
          <ConfirmPanel
            borderTone="cyan"
            confirmVariant="primary"
            confirmLabel="Publish"
            message="Publishing makes this recipe visible to all Rusty Pipes members. You can unpublish it later from your profile."
            error={actionError}
            busy={publishing}
            onConfirm={handlePublish}
            onCancel={() => setShowConfirmShare(false)}
          />
        )}
        {showConfirmUnpublish && (
          <ConfirmPanel
            borderTone="neutral"
            confirmVariant="danger"
            confirmLabel="Unpublish"
            message={
              isOwner
                ? "Make this recipe private again? Only you will be able to see it."
                : `Unpublish "${c.name}"? It returns to ${c.author ?? "the owner"}'s private list - their copy won't be deleted.`
            }
            error={actionError}
            busy={unpublishing}
            onConfirm={handleUnpublish}
            onCancel={() => setShowConfirmUnpublish(false)}
          />
        )}
        {confirmDelete && (
          <ConfirmPanel
            borderTone="coral"
            confirmVariant="danger"
            confirmLabel="Delete"
            message={`Delete "${c.name}"? This can't be undone.`}
            error={actionError}
            busy={deleting}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    </div>
  )
}
