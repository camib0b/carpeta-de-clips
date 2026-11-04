/**
 * Stand-in for the FEHOCH mark. The repo has no official logo file.
 * `currentColor` follows the row's foreground token on every background.
 */
export function FehochPlaceholderMark() {
  return (
    <svg
      viewBox="0 0 64 32"
      aria-hidden="true"
      className="h-8 w-16 shrink-0 text-foreground"
    >
      <rect
        x="1"
        y="1"
        width="62"
        height="30"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="32"
        y="20"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        FEHOCH
      </text>
    </svg>
  )
}
