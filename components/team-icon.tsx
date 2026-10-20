import Image from 'next/image'
import { getTeamIconPath } from '@/lib/team-icons'
import { cn } from '@/lib/utils'

interface TeamIconProps {
  slug: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 56,
} as const

export function TeamIcon({ slug, name, size = 'md', className }: TeamIconProps) {
  const iconPath = getTeamIconPath(slug)
  const pixelSize = sizePixels[size]

  return (
    <Image
      src={iconPath}
      alt={`Icono de ${name}`}
      width={pixelSize}
      height={pixelSize}
      className={cn('shrink-0 rounded-md object-cover', sizeClasses[size], className)}
    />
  )
}
