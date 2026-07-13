'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { SectionReveal } from './SectionReveal'

/**
 * Hero de video con placeholder + modal "Coming soon".
 * Cuando haya un video real, sustituir `videoSrc` con la URL final
 * (Mux, Wistia, YouTube embed, etc.) y eliminar el banner placeholder.
 */
export function VideoDemo() {
  const t = useTranslations('landing.video')
  const [open, setOpen] = useState(false)

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <SectionReveal
          index={1}
          className="mx-auto mt-12 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-xl"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative flex h-full w-full items-center justify-center"
            aria-label={t('play')}
          >
            {/* Fake poster gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.18),transparent_60%)]" />

            {/* Play button */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform group-hover:scale-110"
            >
              <Play className="ml-1 h-10 w-10 fill-current" />
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
            </motion.div>

            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              {t('duration')}
            </span>
          </button>
        </SectionReveal>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-background/90 p-2 text-foreground transition-colors hover:bg-background"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-12 text-center">
                <p className="text-xl font-semibold">{t('comingSoonTitle')}</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t('comingSoonBody')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
