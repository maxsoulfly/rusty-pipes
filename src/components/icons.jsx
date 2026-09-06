// Flat stroke-icon set built from a single path-icon factory. No icon library
// dependency — matches the spec's "no photography, flat SVG" visual direction.

const I =
  (path, opts) =>
  ({ size = 20, className, style }) => (
    <svg
      width={size}
      height={size}
      viewBox={opts?.vb ?? "0 0 24 24"}
      fill={opts?.fill ? "currentColor" : "none"}
      stroke={opts?.fill ? "none" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={path} />
    </svg>
  )

export const IconHome = I(
  "M3 9.5L12 3L21 9.5V20C21 20.6 20.6 21 20 21H15V15H9V21H4C3.4 21 3 20.6 3 20V9.5Z",
)
export const IconGlass = I(
  "M8 2H16L20 10C20 10 16 12 12 12C8 12 4 10 4 10L8 2ZM12 12V22M8 22H16",
)
export const IconBottle = I(
  "M9 2H15V5C15 5 18 7 18 11V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V11C6 7 9 5 9 5V2Z",
)
export const IconHeart = I(
  "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
)
export const IconMenu = I("M4 6H20M4 12H20M4 18H20")
export const IconDots = I(
  "M6 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM21 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  { fill: true },
)
export const IconSearch = I(
  "M11 19C15.418 19 19 15.418 19 11C19 6.582 15.418 3 11 3C6.582 3 3 6.582 3 11C3 15.418 6.582 19 11 19ZM21 21L16.65 16.65",
)
export const IconBack = I("M19 12H5M5 12L12 19M5 12L12 5")
export const IconPlus = I("M12 5V19M5 12H19")
export const IconMinus = I("M5 12H19")
export const IconCheck = I("M20 6L9 17L4 12")
export const IconStar = I(
  "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z",
)
export const IconBookmark = I(
  "M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z",
)
export const IconEdit = I(
  "M11 4H4C3.4 4 3 4.4 3 5V20C3 20.6 3.4 21 4 21H19C19.6 21 20 20.6 20 20V13M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z",
)
export const IconFilter = I("M22 3H2L10 12.46V19L14 21V12.46L22 3Z")
export const IconCopy = I(
  "M8 8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H16C17.1 22 18 21.1 18 20V18M8 4H18C19.1 4 20 4.9 20 6V16C20 17.1 19.1 18 18 18H8C6.9 18 6 17.1 6 16V6C6 4.9 6.9 4 8 4Z",
)
export const IconTrash = I(
  "M3 6H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6L18 20C18 20.6 17.6 21 17 21H7C6.4 21 6 20.6 6 20L5 6",
)
export const IconUpload = I(
  "M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M17 8L12 3L7 8M12 3V15",
)
export const IconMerge = I("M6 4V10L12 16M18 4V10L12 16M12 16V20")
export const IconChevR = I("M9 18L15 12L9 6")
export const IconChevD = I("M6 9L12 15L18 9")
export const IconX = I("M18 6L6 18M6 6L18 18")
export const IconLock = I(
  "M19 11H5C3.9 11 3 11.9 3 13V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V13C21 11.9 20.1 11 19 11ZM12 17C11.4 17 11 16.6 11 16C11 15.4 11.4 15 12 15C12.6 15 13 15.4 13 16C13 16.6 12.6 17 12 17ZM16 11V7C16 4.8 14.2 3 12 3C9.8 3 8 4.8 8 7V11H16Z",
)
export const IconGlobe = I(
  "M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18M12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18",
)
export const IconCrown = I("M3 18H21M5 18L3 6L9 11L12 5L15 11L21 6L19 18H5Z")
export const IconUser = I(
  "M20 21V19C20 17.9 19.6 16.9 18.8 16.1C18.1 15.4 17.1 15 16 15H8C6.9 15 5.9 15.4 5.2 16.1C4.4 16.9 4 17.9 4 19V21M12 11C9.8 11 8 9.2 8 7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7C16 9.2 14.2 11 12 11Z",
)
export const IconAlert = I(
  "M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.65 1.55 19C1.55 19.55 1.77 20.07 2.16 20.46C2.55 20.85 3.07 21.07 3.62 21H20.38C20.93 21.07 21.45 20.85 21.84 20.46C22.23 20.07 22.45 19.55 22.45 19C22.45 18.65 22.36 18.3 22.18 18L13.71 3.86C13.52 3.57 13.27 3.32 12.97 3.16C12.67 2.99 12.34 2.9 12 2.9C11.66 2.9 11.33 2.99 11.03 3.16C10.73 3.32 10.48 3.57 10.29 3.86Z",
)
export const IconInfo = I(
  "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 8V12M12 16H12.01",
)
