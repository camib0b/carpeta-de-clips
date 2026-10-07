import type { ClipVisibility } from '@/lib/types'

/**
 * Fields `mediaUrl` needs. A full `VideoClip` satisfies this.
 * `visibility` omitted or `public` may be served; anything else returns null
 * until a gated URL exists.
 */
export type MediaUrlClip = {
  r2Key?: string | null
  r2KeyLow?: string | null
  visibility?: ClipVisibility | string | null
}

export type MediaUrlOptions = {
  /** Use `r2KeyLow` when it is set. Otherwise use the 1080p `r2Key`. */
  preferLow?: boolean
}

/**
 * Public origin of the `carpeta-clips` bucket (`https://media.carpeta.cl`).
 * Next inlines `NEXT_PUBLIC_*` when `next build` runs. Production reads
 * `.env.production`; `pnpm dev` reads `.env.development`. wrangler `vars` are
 * not inlined into the client bundle. When this is missing, `mediaUrl` returns
 * null and playback stays on YouTube.
 */
function configuredMediaBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  if (typeof raw !== 'string') {
    return null
  }

  const trimmed = raw.trim().replace(/\/+$/, '')
  if (trimmed.length === 0) {
    return null
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null
    }
  } catch {
    return null
  }

  return trimmed
}

function objectKeyPath(objectKey: string | null | undefined): string | null {
  if (objectKey == null) {
    return null
  }

  const trimmed = objectKey.trim().replace(/^\/+/, '')
  if (trimmed.length === 0) {
    return null
  }

  const segments = trimmed.split('/')
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    return null
  }

  return segments.map((segment) => encodeURIComponent(segment)).join('/')
}

/**
 * The only builder of self-hosted clip video URLs.
 *
 * Returns null (YouTube fallback) when the clip has no 1080p `r2Key`, when
 * `visibility` is not public, or when `NEXT_PUBLIC_MEDIA_BASE_URL` is unset.
 * Restricted clips stay null on purpose: a later gated Worker or signed URL
 * can replace this branch without another call site inventing a public URL.
 */
export function mediaUrl(
  clip: MediaUrlClip,
  options?: MediaUrlOptions,
): string | null {
  if (clip.visibility != null && clip.visibility !== 'public') {
    return null
  }

  const fullKey = objectKeyPath(clip.r2Key)
  if (fullKey == null) {
    return null
  }

  const baseUrl = configuredMediaBaseUrl()
  if (baseUrl == null) {
    return null
  }

  const lowKey = objectKeyPath(clip.r2KeyLow)
  const objectKey = options?.preferLow && lowKey != null ? lowKey : fullKey
  return `${baseUrl}/${objectKey}`
}
