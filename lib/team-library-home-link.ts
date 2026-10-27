/**
 * The team-page "Todos los Equipos" control must load `/` as a document
 * navigation. `next/link` skips its own navigation when the click is
 * `preventDefault`ed, and `router.push('/')` is dropped after the clip
 * hook writes history with `pushState(null)` (Next restores that entry and
 * discards an in-flight navigate). Callers that still receive the click on
 * the anchor leave it as a normal link. Callers that only see the dialog
 * overlay use `teamLibraryHomeOverlayAction`.
 */

export const TEAM_LIBRARY_HOME_HREF = '/'

export interface TeamLibraryHomePointer {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  clientX: number
  clientY: number
}

export interface RectangleEdges {
  left: number
  top: number
  right: number
  bottom: number
}

export type TeamLibraryHomeOverlayAction = 'assign' | 'none'

export function pointerHitsRectangle(
  pointer: Pick<TeamLibraryHomePointer, 'clientX' | 'clientY'>,
  rectangle: RectangleEdges,
): boolean {
  return (
    pointer.clientX >= rectangle.left &&
    pointer.clientX <= rectangle.right &&
    pointer.clientY >= rectangle.top &&
    pointer.clientY <= rectangle.bottom
  )
}

export function isPlainPrimaryPointer(
  pointer: Pick<
    TeamLibraryHomePointer,
    'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
  >,
): boolean {
  return (
    pointer.button === 0 &&
    !pointer.metaKey &&
    !pointer.ctrlKey &&
    !pointer.shiftKey &&
    !pointer.altKey
  )
}

/**
 * The dialog overlay is the event target while a clip is open, so the
 * anchor never receives the click. A plain primary press inside the link's
 * box loads `/`. The anchor itself handles its own clicks, including
 * modified ones (new tab). A press that misses the link does nothing here
 * so the dialog can dismiss.
 */
export function teamLibraryHomeOverlayAction(input: {
  pointer: TeamLibraryHomePointer
  linkRectangle: RectangleEdges | null
  targetIsHomeLink: boolean
}): TeamLibraryHomeOverlayAction {
  if (input.targetIsHomeLink || input.linkRectangle == null) return 'none'
  if (!pointerHitsRectangle(input.pointer, input.linkRectangle)) return 'none'
  if (!isPlainPrimaryPointer(input.pointer)) return 'none'
  return 'assign'
}
