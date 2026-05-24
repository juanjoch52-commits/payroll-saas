'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

/**
 * Counter que anima de 0 al target cuando entra en viewport.
 * Soporta prefijo/sufijo (ej: "$", "%") y formato locale-aware.
 *
 *   <AnimatedCounter value={1247} prefix="$" decimals={2} />
 *   <AnimatedCounter value={97} suffix="%" />
 */
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  locale = 'en-US',
  duration = 1.6,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  locale?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplay(
        latest.toLocaleString(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      )
    })
  }, [spring, locale, decimals])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
