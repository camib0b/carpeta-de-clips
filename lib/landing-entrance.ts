/**
 * Landing-page entrance delays. The 250ms fade itself lives on `.landing-enter`
 * in `app/globals.css`. Delays stay inline so each row can stagger without
 * a stylesheet rule per index.
 */
export const LANDING_ENTRANCE_DELAY_CAP_MS = 300
export const LANDING_ENTRANCE_STEP_MS = 50

export function landingEntranceDelay(
  stepIndex: number,
  stepMilliseconds: number,
): string {
  const delayMilliseconds = Math.min(
    stepIndex * stepMilliseconds,
    LANDING_ENTRANCE_DELAY_CAP_MS,
  )
  return `${delayMilliseconds}ms`
}
