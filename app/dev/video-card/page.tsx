import { notFound } from 'next/navigation'

import { VideoCardBreakUiClient } from './video-card-break-ui-client'

/**
 * Dev-only break-ui surface for `VideoCard` thumbnails (not available in production).
 */
export default function VideoCardBreakUiPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <VideoCardBreakUiClient />
}
