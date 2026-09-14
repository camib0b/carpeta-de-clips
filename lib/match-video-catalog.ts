/**
 * Resolves the full-match video source for a match `storageSlug`.
 *
 * The XML clip timestamps are relative to one continuous full-match recording, so the Work
 * Window needs a browser-seekable source for that recording. This is intentionally
 * source-agnostic:
 *   - `hls`  -> Cloudflare Stream / HLS (`.m3u8`). Recommended for multi-GB footage: adaptive
 *              bitrate and instant range seeking. Played via hls.js (native HLS on Safari).
 *   - `mp4`  -> A plain H.264/AAC MP4 served over HTTP range requests (e.g. an R2 object).
 *              Simpler, but the whole file lives behind one URL.
 *
 * Returns null when no source is configured for a match yet, so the route can render the event
 * log and a "video not available" placeholder without breaking.
 */

export type MatchVideoKind = 'hls' | 'mp4'

export interface MatchVideoSource {
  kind: MatchVideoKind
  url: string
}

/**
 * Explicit per-match video sources. Populate as full-match recordings are uploaded.
 * Mirrors the naming approach of `MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG` in match-xml-catalog.ts.
 *
 * Example:
 *   '2026-05-16--Old_Gabs--Old_Reds--Old_Gabs_vs_Old_Reds--Others': {
 *     kind: 'hls',
 *     url: 'https://customer-XXXX.cloudflarestream.com/<videoUid>/manifest/video.m3u8',
 *   },
 */
export const MATCH_VIDEO_BY_STORAGE_SLUG: Record<string, MatchVideoSource> = {}

function normalizeBaseUrl(base: string): string {
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function resolveMatchVideoSource(
  storageSlug: string,
): MatchVideoSource | null {
  const explicit = MATCH_VIDEO_BY_STORAGE_SLUG[storageSlug]
  if (explicit) {
    return explicit
  }

  // Optional convention-based fallback: `${MATCH_VIDEO_BASE_URL}/${slug}.{m3u8|mp4}`.
  const base = process.env.MATCH_VIDEO_BASE_URL?.trim()
  if (base) {
    const kind: MatchVideoKind =
      process.env.MATCH_VIDEO_BASE_KIND === 'mp4' ? 'mp4' : 'hls'
    const extension = kind === 'mp4' ? 'mp4' : 'm3u8'
    return {
      kind,
      url: `${normalizeBaseUrl(base)}/${storageSlug}.${extension}`,
    }
  }

  return null
}

export function isMatchVideoAvailable(storageSlug: string): boolean {
  return resolveMatchVideoSource(storageSlug) !== null
}
