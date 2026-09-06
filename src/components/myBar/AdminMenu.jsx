import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IconDots } from "@/components/icons"
import { BottomSheet } from "@/components/primitives"

// Admin-only ⋯ menu for the My Bar / Add ingredients headers (My Bar
// redesign Stage 2). One item for now - "Edit ingredients" jumps straight
// to Admin -> Ingredient Types, the real management view. Renders nothing
// for non-admins; it gates only its own visibility - `/admin` stays behind
// RequireStaff and every underlying write keeps its own RLS/role check.
export function AdminMenu({ isAdmin }) {
  const navigate = useNavigate()
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)

  if (!isAdmin) return null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ingredient admin menu"
        aria-haspopup="menu"
        className="w-11 h-11 rounded-sm border border-bdr bg-surface text-tx2 flex items-center justify-center cursor-pointer shrink-0"
      >
        <IconDots size={18} />
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Ingredient admin"
        anchorRef={triggerRef}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            navigate("/admin?tab=types")
          }}
          className="w-full text-left py-2.5 px-3 rounded-sm text-[13px] text-tx bg-surface border border-bdr cursor-pointer"
        >
          Edit ingredients
        </button>
      </BottomSheet>
    </>
  )
}
