import { Link, useLocation } from "react-router-dom"
import clsx from "clsx"
import {
  IconBack,
  IconBottle,
  IconCrown,
  IconGlass,
  IconHeart,
  IconHome,
  IconMenu,
} from "@/components/icons"

const NAV_ITEMS = [
  { path: "/home", label: "Home", Icon: IconHome },
  { path: "/library", label: "Cocktails", Icon: IconGlass },
  { path: "/bar", label: "My Bar", Icon: IconBottle },
  { path: "/lists", label: "Lists", Icon: IconHeart },
  { path: "/more", label: "More", Icon: IconMenu },
]

// "More" also lights up on /admin, since that's where the admin dashboard is reached from.
function isNavItemActive(pathname, itemPath) {
  if (itemPath === "/more")
    return pathname.startsWith("/more") || pathname.startsWith("/admin")
  return pathname.startsWith(itemPath)
}

export function BottomNav() {
  const location = useLocation()
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[calc(64px_+_env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-bg2 border-t border-bdr flex items-stretch z-[100] backdrop-blur-md xl:hidden">
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const isActive = isNavItemActive(location.pathname, path)
        return (
          <Link
            key={path}
            to={path}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1 no-underline transition-colors duration-150",
              isActive ? "text-cyan" : "text-tx3",
            )}
          >
            {isActive && (
              <span className="line-glow-cyan absolute w-7 h-0.5 rounded-[1px] -mt-13" />
            )}
            <Icon size={20} />
            <span
              className={clsx(
                "text-[10px] font-display",
                isActive ? "font-semibold" : "font-normal",
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function SideNav({ isStaff }) {
  const location = useLocation()
  const isAdminActive = location.pathname.startsWith("/admin")
  return (
    <aside className="w-55 shrink-0 bg-bg2 border-r border-bdr flex flex-col py-6 px-3 gap-1">
      <div className="pt-0 px-3 pb-5 mb-1 border-b border-bdr">
        <span className="font-display font-extrabold text-lg text-cyan tracking-[-0.02em]">
          Rusty Pipes
        </span>
      </div>
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const isActive = isNavItemActive(location.pathname, path)
        return (
          <Link
            key={path}
            to={path}
            className={clsx(
              "flex items-center gap-2.5 py-2.5 px-3 rounded-sm no-underline text-sm font-display transition-all duration-150",
              isActive
                ? "bg-cyan/10 text-cyan font-semibold shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                : "text-tx2 font-normal",
            )}
          >
            <Icon size={18} /> {label}
          </Link>
        )
      })}
      {isStaff && (
        <Link
          to="/admin"
          className={clsx(
            "flex items-center gap-2.5 py-2.5 px-3 rounded-sm no-underline text-sm font-display transition-all duration-150 mt-auto",
            isAdminActive
              ? "bg-violet/12 text-violet font-semibold"
              : "text-tx2 font-normal",
          )}
        >
          <IconCrown size={18} /> Admin
        </Link>
      )}
    </aside>
  )
}

// `subtitle` (optional) - a small, muted caption ABOVE `title`, for a
// screen that needs a bit more context than one line (e.g. EditorScreen's
// "Edit Recipe" while `title` carries the recipe's own identity - see
// current-context.md's "Editor sticky-header" polish). Every existing
// caller that only ever passed `title` renders byte-for-byte the same as
// before - `subtitle` is opt-in, additive, no layout change when absent.
// `truncate` on both lines (plus `min-w-0` on the flex-1 wrapper, required
// for `truncate` to actually clip inside a flex row instead of just
// forcing the row wider) is new here too - previously an unusually long
// title had no overflow handling at all; this is a small, broadly-safe
// robustness fix for every TopBar caller, not just the one that motivated
// it, since a short title (every existing caller today) renders
// identically either way.
export function TopBar({ title, subtitle, onBack, right }) {
  return (
    <div className="flex items-center py-3.5 px-5 gap-3 border-b border-bdr bg-bg2 sticky top-0 z-10 backdrop-blur-md">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          className="bg-transparent border-none cursor-pointer text-tx2 p-0 flex items-center"
        >
          <IconBack size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {subtitle && (
          <div className="text-[11px] font-semibold text-tx3 uppercase tracking-[0.05em] leading-tight truncate">
            {subtitle}
          </div>
        )}
        <h1 className="text-lg font-bold font-display text-tx truncate">
          {title}
        </h1>
      </div>
      {right}
    </div>
  )
}
