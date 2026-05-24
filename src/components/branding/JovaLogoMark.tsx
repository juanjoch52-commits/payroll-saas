import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * MyJova logo mark (isotipo) — versión final con la imagen real.
 *
 * Render con next/image para optimización automática (lazy, WebP/AVIF).
 * La imagen original vive en /public/isotipo.png (840 KB, color).
 *
 * Para usar en contextos monocromáticos (icono pequeño que debe heredar color):
 *   <JovaLogoMark mono />   // usa SVG fallback que respeta currentColor
 */

const sizePx = {
  sm: 20,
  md: 28,
  lg: 40,
  xl: 56,
} as const

export function JovaLogoMark({
  className,
  size = 'md',
  mono = false,
  priority = false,
}: {
  className?: string
  size?: keyof typeof sizePx
  /** Si true, renderiza un SVG simplificado que respeta currentColor (útil en favicons). */
  mono?: boolean
  /** Si la imagen está en above-the-fold, set priority para LCP. */
  priority?: boolean
}) {
  const px = sizePx[size]

  if (mono) {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={px}
        height={px}
        className={cn('shrink-0', className)}
        aria-label="MyJova"
        role="img"
      >
        <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M19 8 L19 18 C19 21 17 23 14 23 C12 23 10 21.5 9.5 19.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="19" cy="8" r="1.6" fill="currentColor" />
      </svg>
    )
  }

  return (
    <Image
      src="/isotipo.png"
      alt="MyJova"
      width={px}
      height={px}
      priority={priority}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: px, height: px }}
    />
  )
}
