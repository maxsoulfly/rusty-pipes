import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import clsx from "clsx"
import { IconCheck, IconChevD, IconX } from "@/components/icons"
import { IngredientIcon } from "@/components/IngredientIcon"

export const AVAIL_CFG = {
  perfect: {
    label: "Perfect",
    color: "var(--perfect)",
    icon: "✦",
    glow: "glow-green",
  },
  good: {
    label: "Good Enough",
    color: "var(--good)",
    icon: "◎",
    glow: "glow-cyan",
  },
  almost: {
    label: "Almost",
    color: "var(--almost)",
    icon: "◐",
    glow: "glow-amber",
  },
  unavail: {
    label: "Unavailable",
    color: "var(--unavail)",
    icon: "○",
    glow: "",
  },
  // Stage D.1 - a recipe resolvable through a configured, owned general
  // substitute (and, from Stage D.2 on, a satisfiable preparation). Reuses
  // the existing violet accent (already the "Classic" source-badge color,
  // distinct from every other avail tone) rather than inventing a new one.
  // `label` here is only the fallback - AvailBadge below prefers the
  // per-recipe composed text from `display.label` when one is given, since
  // "Make with substitutions" vs. a future "Prepare X first" isn't a fixed
  // string per tier the way the other four are.
  adapted: {
    label: "Make with substitutions",
    color: "var(--violet)",
    icon: "⇄",
    glow: "glow-violet",
  },
}

export const AVAIL_TONE = {
  perfect: "text-perfect border-perfect",
  good: "text-good border-good",
  almost: "text-almost border-almost",
  unavail: "text-unavail border-unavail",
  adapted: "text-violet border-violet",
}

// `label` overrides AVAIL_CFG[avail]'s static text - pass a recipe's own
// `display.label` (Stage D.1) so an "adapted" badge shows its actual
// composed status ("Make with substitutions · Prepare syrup first") rather
// than the generic fallback above. Every existing caller that only passes
// `avail` is unaffected - `label` is optional and AVAIL_CFG already has a
// static string for the four original tiers.
export function AvailBadge({ avail, small, label }) {
  const c = AVAIL_CFG[avail]
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border font-mono font-medium",
        AVAIL_TONE[avail],
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-[3px] text-xs",
        avail === "unavail" && "opacity-60",
      )}
    >
      <span className={small ? "text-[10px]" : "text-[11px]"}>{c.icon}</span>
      {label ?? c.label}
    </span>
  )
}

const SOURCE_CFG = {
  classic: { label: "Classic", tone: "text-violet bg-violet/12" },
  community: { label: "Community", tone: "text-cyan bg-cyan/10" },
  private: { label: "Private", tone: "text-tx3 bg-tx3/10" },
}

export function SourceBadge({ source }) {
  const cfg = SOURCE_CFG[source]
  return (
    <span
      className={clsx(
        "rounded-[6px] px-2 py-0.5 text-[11px] font-semibold font-display tracking-[0.02em]",
        cfg.tone,
      )}
    >
      {cfg.label}
    </span>
  )
}

export function TasteTag({ label }) {
  return (
    <span className="bg-surface3 text-tx2 border border-bdr rounded-[6px] px-2 py-0.5 text-[11px] font-body">
      {label}
    </span>
  )
}

export function FilterChip({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-3.5 py-[5px] text-[13px] font-display whitespace-nowrap transition-all duration-150 border cursor-pointer flex items-center gap-1.5",
        active
          ? "font-semibold border-cyan bg-cyan/12 text-cyan shadow-[0_0_10px_rgba(34,211,238,0.2)]"
          : "font-normal border-bdr bg-surface text-tx2",
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export function OwnedToggle({ owned, onChange }) {
  return (
    <button
      onClick={() => onChange(!owned)}
      className={clsx(
        "w-11 h-6 rounded-full border-none relative shrink-0 cursor-pointer transition-colors duration-200",
        owned ? "bg-cyan shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "bg-surface3",
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center transition-[left] duration-[180ms]",
          owned ? "left-[22px]" : "left-0.5",
        )}
      >
        {owned && <IconCheck size={12} className="text-cyan" />}
      </span>
    </button>
  )
}

const BTN_VARIANT = {
  primary:
    "bg-cyan text-[#07091a] shadow-[0_0_16px_rgba(34,211,238,0.35)] border-none",
  secondary: "bg-surface3 text-tx border border-bdr",
  ghost: "bg-transparent text-tx2 border border-bdr",
  danger: "bg-coral/15 text-coral border border-coral/30",
}

export function Btn({
  children,
  variant = "primary",
  onClick,
  full,
  small,
  disabled,
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "rounded font-display font-semibold inline-flex items-center justify-center gap-1.5 transition-[opacity,box-shadow] duration-150",
        BTN_VARIANT[variant],
        small ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2.5 text-sm",
        full && "w-full",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      {children}
    </button>
  )
}

export function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  label,
  autoComplete,
  name,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-tx2 font-display uppercase tracking-[0.06em]">
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-bdr rounded-sm px-3.5 py-2.5 text-tx text-sm font-body w-full"
      />
    </div>
  )
}

// Native <select> popups render via the browser/OS, not the page's CSS, so
// they always show up unthemed regardless of what's set on the <select>
// element itself. This is a small custom dropdown for the handful of short,
// fixed option lists in the app (ingredient unit/role) that need to match
// the rest of the UI instead.
export function Select({ value, onChange, options, small }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  )
  const current = normalized.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "bg-surface border border-bdr rounded-sm text-tx2 font-mono cursor-pointer flex items-center gap-1 whitespace-nowrap w-full justify-between",
          small ? "p-2 text-xs" : "px-3.5 py-2.5 text-sm",
        )}
      >
        {current?.label ?? value}
        <IconChevD size={12} className="shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%_+_4px)] left-0 z-20 bg-surface2 border border-bdr rounded-sm shadow-[0_8px_24px_rgba(0,0,0,0.35)] min-w-full overflow-hidden">
          {normalized.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={clsx(
                "block w-full text-left py-2 px-3 border-none cursor-pointer text-[13px] font-body whitespace-nowrap",
                o.value === value ? "bg-cyan/12 text-cyan" : "text-tx",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Ingredient categories (~10-14 options) used to render as an always-
// expanded chip grid inline - deliberately, at the time (a collapsed
// dropdown reads as inert label text on mobile rather than something
// tappable). Converted to the same compact trigger + BottomSheet pattern
// as ShapePicker/ColorSwatchPicker once that pattern existed: the trigger
// button still looks clearly tappable (border, background, chevron), so
// it doesn't have the "looks like inert text" problem a native collapsed
// <select> had, while saving the same vertical space the shape/color
// pickers did.
export function CategoryPicker({ categories, value, onChange }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const current = categories.find((c) => c.id === value)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 py-2 px-3 bg-surface border border-bdr rounded-sm cursor-pointer w-fit"
      >
        {current && (
          <IngredientIcon shape={current.shape} size={14} color="var(--cyan)" />
        )}
        <span className="text-[13px] text-cyan">
          {current?.name ?? "Choose a category"}
        </span>
        <IconChevD size={12} className="text-tx3" />
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a category"
        anchorRef={triggerRef}
      >
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => {
            const active = value === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                }}
                className={clsx(
                  "py-2 px-3 rounded-sm border text-[13px] font-body cursor-pointer flex items-center gap-1.5",
                  active
                    ? "border-cyan bg-cyan/12 text-cyan"
                    : "border-bdr bg-surface text-tx2",
                )}
              >
                <IngredientIcon
                  shape={c.shape}
                  size={14}
                  color={active ? "var(--cyan)" : "var(--text3)"}
                />
                {c.name}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}

// Must match the actual `w-[480px]` on the desktop dropdown below - kept as
// one literal so the JS-side viewport-clamping math and the rendered width
// can't drift out of sync with each other.
const DESKTOP_SHEET_WIDTH = 480

// A single shared overlay for every "tap the current value, pick from a
// grid, it closes" picker in the app (color swatches, shape pictograms) -
// these grids used to render fully expanded inline everywhere they appeared,
// which ate a huge amount of vertical space once a table grew past a
// handful of options (10+ ingredient categories, 19+ glasses). Slides up
// from the bottom on mobile - the more familiar convention for this kind of
// chooser (photo/icon/color pickers in most native apps). On desktop (the
// `xl` breakpoint - the same one AppShell already switches sidebar-vs-
// bottomnav on), a full-screen dimmed sheet reads as overkill on a screen
// with plenty of room, so it renders instead as a small dropdown anchored
// directly under the trigger button - pass `anchorRef` (a ref on that
// button) so it knows where. Both variants exist in the DOM at once and
// Tailwind's `xl:` responsive classes pick which is visible, rather than a
// JS viewport check, so there's no resize-driven remount.
export function BottomSheet({ open, onClose, title, children, anchorRef }) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Layout effect, not a plain effect - runs synchronously after the DOM
  // update but before the browser paints, so the desktop dropdown's
  // anchored position is already known on its very first paint instead of
  // flashing at the `!pos` centered fallback for one frame and then
  // jumping to the real spot (caught from a live screenshot showing
  // exactly that jump).
  // Clamped to the actual viewport, not just anchored below-and-left of the
  // trigger unconditionally - a trigger sitting low or far right on a long
  // admin form (e.g. a color/shape picker deep in an "Add ingredient" panel)
  // could otherwise position the dropdown partly or entirely off-screen,
  // with no way to reach the rest of it (found from a live screenshot: the
  // sheet's lower rows were cut off past the bottom edge, invisible and
  // unscrollable, since this whole overlay is `position: fixed` - it isn't
  // itself a scrolling container tied to page scroll). DESKTOP_SHEET_WIDTH
  // matches the fixed `w-[480px]` on the actual dropdown below.
  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setPos(null)
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const margin = 12
    const sheetWidth = DESKTOP_SHEET_WIDTH
    let left = rect.left
    if (left + sheetWidth > window.innerWidth - margin) {
      left = window.innerWidth - sheetWidth - margin
    }
    if (left < margin) left = margin
    const top = rect.bottom + 8
    const maxHeight = Math.max(160, window.innerHeight - top - margin)
    setPos({ top, left, maxHeight })
  }, [open, anchorRef])

  if (!open) return null

  const header = (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-tx2 font-display uppercase tracking-[0.06em]">
        {title}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="bg-transparent border-none cursor-pointer p-1 text-tx3"
      >
        <IconX size={16} />
      </button>
    </div>
  )

  // Portaled straight to document.body - rendered in place, `fixed inset-0`
  // would anchor to the nearest ancestor with a `transform`/`filter`/
  // `backdrop-filter` instead of the real viewport (a CSS containing-block
  // rule, not a bug in this component), and several callers (e.g.
  // SearchFilterHeader's sticky header) use `backdrop-blur-md` for exactly
  // that reason. Caught from a live screenshot where the sheet rendered
  // cramped inside that header's own small box instead of covering the
  // screen.
  return createPortal(
    <>
      <div className="xl:hidden fixed inset-0 z-[200] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative w-full max-w-[520px] max-h-[80vh] overflow-y-auto bg-surface border-t border-bdr rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
          {header}
          {children}
        </div>
      </div>
      <div
        className={clsx(
          "hidden xl:flex fixed inset-0 z-[200]",
          !pos && "items-center justify-center",
        )}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          style={
            pos
              ? {
                  position: "absolute",
                  top: pos.top,
                  left: pos.left,
                  maxHeight: pos.maxHeight,
                }
              : undefined
          }
          // A plain border-bdr + shadow-2xl reads fine in light mode
          // (white card on a pale background), but in dark mode surface/bg
          // are both near-black with very little contrast between them, and
          // a drop shadow barely shows up against a dark page at all - the
          // popover was nearly invisible with no full-screen dimming behind
          // it to lift it off the page. A cyan-tinted ring (the app's
          // existing accent color) plus a real dark shadow gives it a
          // visible edge in both themes instead of relying on border color
          // contrast alone.
          className="w-[480px] max-h-[70vh] overflow-y-auto bg-surface rounded-lg p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_0_1px_rgba(34,211,238,0.25)]"
        >
          {header}
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}

// Shared between EditorScreen (recipe liquid_color) and the ingredient-type
// forms (AdminScreen, IngredientTypeEditor) - same "pick a drink-appropriate
// color, no hex knowledge required" idea in both places. `colors` is the
// live liquid_colors catalog (admin-managed - see Admin → Catalog), not a
// hardcoded list, so the swatches on offer can grow over time. The free hex
// input alongside them means a color missing from the curated list is never
// a hard blocker either - stored recipes/ingredient types have always just
// been a plain hex string, this table only supplies the picker's suggestions.
//
// Renders as a compact swatch+name trigger that opens the actual grid in a
// BottomSheet - picking a swatch closes it immediately, typing a hex value
// doesn't (so the user isn't fighting a closing sheet mid-keystroke).
export function ColorSwatchPicker({ value, onChange, colors }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  // "Clear" is the most commonly reached-for swatch (most spirits are
  // clear) - worth always leading with it rather than wherever it happens
  // to fall alphabetically. A stable sort (guaranteed by the spec since
  // ES2019) leaves every other swatch in its existing fetched order.
  const sorted = [...colors].sort((a, b) =>
    a.name === "Clear" ? -1 : b.name === "Clear" ? 1 : 0,
  )
  const current = colors.find((c) => c.hex === value)
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 py-1.5 px-2.5 bg-surface border border-bdr rounded-sm cursor-pointer w-fit"
      >
        <div
          className="w-6 h-6 rounded-full border border-bdr shrink-0"
          style={{ background: value || "transparent" }}
        />
        <span className="text-[13px] text-tx font-mono">
          {current?.name ?? value ?? "Choose color"}
        </span>
        <IconChevD size={12} className="text-tx3" />
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Choose a color"
        anchorRef={triggerRef}
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-2.5 flex-wrap">
            {sorted.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.hex)
                  setOpen(false)
                }}
                title={c.name}
                className={clsx(
                  "w-9 h-9 rounded-full cursor-pointer border-2",
                  value === c.hex
                    ? "border-tx shadow-[0_0_0_2px_var(--bg),0_0_0_3px_var(--cyan)]"
                    : "border-bdr",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border border-bdr shrink-0"
              style={{ background: value || "transparent" }}
            />
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or type any hex, e.g. #6b21a8"
              className="flex-1 bg-surface border border-bdr rounded-sm py-1.5 px-2.5 text-tx text-[13px] font-mono"
            />
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

// role/tabIndex/onKeyDown only apply when onClick is passed - a plain
// display Card stays a plain div. `e.target === e.currentTarget` guards
// against a nested real <button> (several callers put stopPropagation'd
// action buttons inside a clickable Card) - without it, pressing Enter/
// Space on that inner button would both fire its own onClick AND bubble
// the keydown up to trigger the outer Card's onClick too, since keydown
// bubbles independently of an inner click handler's stopPropagation.
export function Card({ children, style, className, onClick }) {
  return (
    <div
      className={clsx(
        "bg-surface border border-bdr rounded-lg",
        // ring (box-shadow), not outline - several callers (e.g. TypeCard)
        // set overflow-hidden, which can clip an outline but never clips an
        // inset box-shadow.
        onClick &&
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                e.target === e.currentTarget
              ) {
                e.preventDefault()
                onClick(e)
              }
            }
          : undefined
      }
      style={style}
    >
      {children}
    </div>
  )
}

// Shared "are you sure?" panel - message + confirm/cancel buttons, with an
// optional separate error line. Consolidates 3 independently-duplicated
// confirm implementations (DetailScreen's publish/unpublish/delete panels,
// MyBarScreen's product-delete row, AdminScreen's NamedRowManager
// delete-confirm) that differ only in container shape, not in the underlying
// pattern. `layout="card"` wraps in a bordered Card (DetailScreen's shape,
// `borderTone` picked independently of `confirmVariant` - e.g. Unpublish is
// danger-styled but neutral-bordered); `layout="row"` is a single horizontal
// flex row with no Card and no separate error line (MyBarScreen's shape -
// callers supply their own row padding/border/background via `style`);
// `layout="stack"` is an unwrapped vertical flex column, one message
// paragraph, no separate error line (AdminScreen's shape - pass an
// already-combined message string rather than a separate `error`, matching
// the single-paragraph output it always had).
// Kept as inline style rather than a className: Card's own base classes
// already set border-color via `border-bdr`, so a second border-color
// *class* here would compete with Card's for the same property at equal
// specificity, with the winner decided by Tailwind's generated stylesheet
// order rather than by which one was meant to override. An inline style
// always wins deterministically over any class regardless of source order.
const CONFIRM_BORDER = {
  cyan: "rgba(34,211,238,0.25)",
  neutral: "var(--border-s)",
  coral: "rgba(251,113,133,0.3)",
}

export function ConfirmPanel({
  message,
  error,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  busy,
  layout = "card",
  borderTone = "neutral",
  style,
  className,
}) {
  const buttons = (
    <>
      <Btn variant={confirmVariant} small disabled={busy} onClick={onConfirm}>
        {confirmLabel}
      </Btn>
      <Btn variant="ghost" small onClick={onCancel}>
        {cancelLabel}
      </Btn>
    </>
  )

  if (layout === "row") {
    return (
      <div
        className={clsx("flex items-center gap-2.5", className)}
        style={style}
      >
        <span className="flex-1 text-xs text-coral">{message}</span>
        {buttons}
      </div>
    )
  }

  if (layout === "stack") {
    return (
      <div className={clsx("flex flex-col gap-2", className)} style={style}>
        <p className="m-0 text-[13px] text-coral">{message}</p>
        <div className="flex gap-2">{buttons}</div>
      </div>
    )
  }

  return (
    <Card
      className={clsx("p-4", className)}
      style={{ borderColor: CONFIRM_BORDER[borderTone], ...style }}
    >
      <p className="mb-3 text-sm text-tx2">{message}</p>
      {error && <p className="mb-3 text-xs text-coral">{error}</p>}
      <div className="flex gap-2">{buttons}</div>
    </Card>
  )
}

export function SectionTitle({ children }) {
  return (
    <h2 className="mb-3 text-[13px] font-bold font-display text-tx2 uppercase tracking-[0.08em]">
      {children}
    </h2>
  )
}
