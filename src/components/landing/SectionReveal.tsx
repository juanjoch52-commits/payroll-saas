'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
}

/**
 * Wrapper que anima fade + slide-up cuando entra en viewport.
 * Usado por casi todas las secciones nuevas para una sensación consistente.
 *
 *   <SectionReveal><h2>...</h2></SectionReveal>
 *   <SectionReveal index={1}><p>...</p></SectionReveal>
 */
export function SectionReveal({
  children,
  className,
  index = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  /** Delay multiplier — útil para escalar entrada en cascade entre siblings */
  index?: number
  as?: 'div' | 'section' | 'article' | 'header' | 'li'
}) {
  const MotionTag = motion[as] as typeof motion.div
  return (
    <MotionTag
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      custom={index}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}
