import Image from 'next/image'
import { landingTeamRowLabel } from '@/lib/landing-team-row-label'
import {
  FEHOCH_ICON_PATH,
  getTeamIconPath,
  type TeamIconSource,
} from '@/lib/team-icons'
import { cn } from '@/lib/utils'

interface TeamIconProps {
  team: TeamIconSource
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

/**
 * The FEHOCH asset is a circular badge. The white plate is the same size as
 * the crest box so a tournament folder lines up with a club row.
 */
const FEHOCH_MARK_SCALE = 'h-[87.5%] w-[87.5%]'

export function TeamIcon({ team, size = 'md', className }: TeamIconProps) {
  const iconPath = getTeamIconPath(team)
  const pixelSize = sizePixels[size]
  const accessibleName = `Icono de ${landingTeamRowLabel(team)}`

  if (iconPath === FEHOCH_ICON_PATH) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-white',
          sizeClasses[size],
          className,
        )}
      >
        <Image
          src={iconPath}
          alt={accessibleName}
          width={pixelSize}
          height={pixelSize}
          className={cn('object-contain', FEHOCH_MARK_SCALE)}
        />
      </span>
    )
  }

  return (
    <Image
      src={iconPath}
      alt={accessibleName}
      width={pixelSize}
      height={pixelSize}
      className={cn('shrink-0 rounded-md object-cover', sizeClasses[size], className)}
    />
  )
}
