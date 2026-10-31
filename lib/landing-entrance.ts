import type { CSSProperties } from 'react'

/**
 * Landing entrance delay is owned by the motion tokens in app/globals.css
 * (--duration-landing-step and --duration-landing-cap). Callers only pass
 * the step index.
 */
export function landingEntranceStyle(stepIndex: number): CSSProperties {
  return { '--landing-index': String(stepIndex) } as CSSProperties
}
