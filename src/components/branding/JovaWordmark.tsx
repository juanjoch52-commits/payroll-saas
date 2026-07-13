import Image from 'next/image'
import { cn } from '@/lib/utils'
import { JovaLogoMark } from './JovaLogoMark'

/**
 * Wordmark de MyJova: lockup completo (isotipo + texto "MyJova").
 *
 * Usa /public/logo-myjova.png para el lockup horizontal completo.
 *
 *   <JovaWordmark />              // lockup completo
 *   <JovaWordmark size="lg" />
 *   <JovaWordmark markOnly />     // solo el isotipo (para favicons / app icons)
 */

const lockupSizes = {
  sm: { height: 24, widthPx: 88 },
  md: { height: 32, widthPx: 118 },
  lg: { height: 44, widthPx: 162 },
  xl: { height: 60, widthPx: 220 },
} as const

const markSizes = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const

export function JovaWordmark({
  size = 'md',
  markOnly = false,
  className,
  priority = false,
}: {
  size?: keyof typeof lockupSizes
  markOnly?: boolean
  className?: string
  priority?: boolean
}) {
  if (markOnly) {
    return <JovaLogoMark size={markSizes[size]} className={className} priority={priority} />
  }

  const { height, widthPx } = lockupSizes[size]

  return (
    <Image
      src="/logo-myjova.png"
      alt="MyJova"
      width={widthPx}
      height={height}
      priority={priority}
      className={cn('object-contain', className)}
      style={{ height, width: 'auto' }}
    />
  )
}
