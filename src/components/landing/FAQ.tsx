'use client'

import { useTranslations } from 'next-intl'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionReveal } from './SectionReveal'

const QUESTIONS = ['card', 'noEmail', 'states', 'filing', 'secure', 'cancel']

export function FAQ() {
  const t = useTranslations('landing.faq')

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
        </SectionReveal>

        <SectionReveal index={1} className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-2">
            {QUESTIONS.map((q) => (
              <AccordionItem
                key={q}
                value={q}
                className="rounded-xl border bg-background px-5 transition-colors hover:border-primary/30"
              >
                <AccordionTrigger className="text-left">
                  {t(`items.${q}.q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`items.${q}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SectionReveal>
      </div>
    </section>
  )
}
