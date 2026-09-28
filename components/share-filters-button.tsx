'use client'

import { Share } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ShareFiltersButtonProps {
  visible: boolean
}

export function ShareFiltersButton({ visible }: ShareFiltersButtonProps) {
  if (!visible) return null

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado.')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopyLink}
      className="shrink-0"
      aria-label="Copiar enlace con filtros"
      title="Copiar enlace"
    >
      <Share className="h-3.5 w-3.5" />
      Compartir
    </Button>
  )
}
