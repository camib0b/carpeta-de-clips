'use client'

import { Link2 } from 'lucide-react'
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
      toast.success('Enlace copiado al portapapeles')
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
    >
      <Link2 className="h-4 w-4" />
      Compartir filtros
    </Button>
  )
}
