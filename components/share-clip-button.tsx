'use client'

import { Share2 } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { buildClipShareHref } from '@/lib/library-filters/clip-params'

interface ShareClipButtonProps {
  clipId: string
  jugadaOrd?: number
  title: string
}

export function ShareClipButton({ clipId, jugadaOrd, title }: ShareClipButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  async function handleShare() {
    const href = buildClipShareHref({
      pathname,
      currentSearch: searchParams,
      clipId,
      jugadaOrd,
    })
    const url = new URL(href, window.location.origin).toString()

    if (isMobile && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleShare}
      className="shrink-0"
      aria-label="Compartir clip"
      title="Compartir clip"
    >
      <Share2 className="h-3.5 w-3.5" />
    </Button>
  )
}
