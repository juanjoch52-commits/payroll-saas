'use client'

import { useEffect, useState, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'

type Testimonial = {
  id: string
  name: string
  role: string
  company: string
  industry: 'construction' | 'restaurants' | 'trades' | 'painting' | 'cleaning' | 'landscaping'
  initialsBg: string
}

const STATIC_TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Carlos Méndez',
    role: 'Owner',
    company: 'Méndez Drywall LLC',
    industry: 'construction',
    initialsBg: 'bg-blue-500',
  },
  {
    id: 't2',
    name: 'Sarah Kim',
    role: 'General Manager',
    company: 'Kim & Sons Restaurant',
    industry: 'restaurants',
    initialsBg: 'bg-emerald-500',
  },
  {
    id: 't3',
    name: 'James Thompson',
    role: 'Foreman',
    company: 'Thompson Painting Co.',
    industry: 'painting',
    initialsBg: 'bg-orange-500',
  },
  {
    id: 't4',
    name: 'María García',
    role: 'HR Lead',
    company: 'García Cleaning Services',
    industry: 'cleaning',
    initialsBg: 'bg-purple-500',
  },
  {
    id: 't5',
    name: 'David Patel',
    role: 'Co-founder',
    company: 'Patel Plumbing Pro',
    industry: 'trades',
    initialsBg: 'bg-rose-500',
  },
  {
    id: 't6',
    name: 'Emma Rodríguez',
    role: 'Operations',
    company: 'Green Acres Landscaping',
    industry: 'landscaping',
    initialsBg: 'bg-teal-500',
  },
]

export function Testimonials() {
  const t = useTranslations('landing.testimonials')
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [, setSelected] = useState(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  return (
    <section className="border-y bg-muted/30 py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <SectionReveal index={1} className="relative mt-12">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="-ml-6 flex">
              {STATIC_TESTIMONIALS.map((tst, i) => (
                <div
                  key={tst.id}
                  className="min-w-0 flex-[0_0_100%] pl-6 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full transition-all hover:shadow-lg">
                      <CardContent className="space-y-4 p-6">
                        <Quote className="h-7 w-7 text-primary/30" />
                        <p className="text-sm leading-relaxed text-foreground">
                          {t(`quotes.${tst.industry}`)}
                        </p>
                        <div className="flex gap-0.5 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star key={idx} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                        <div className="flex items-center gap-3 border-t pt-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${tst.initialsBg}`}
                          >
                            {tst.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{tst.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tst.role} · {tst.company}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              aria-label={t('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              aria-label={t('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </SectionReveal>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          {t('disclaimer')}
        </p>
      </div>
    </section>
  )
}
