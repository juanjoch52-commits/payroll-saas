'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Github, Twitter, Linkedin } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LandingFooter({ locale }: { locale: string }) {
  const t = useTranslations('landing.footer')
  const tNav = useTranslations('landing.nav')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Placeholder — wire to a real newsletter endpoint when available
    setSubmitted(true)
    setEmail('')
    setTimeout(() => setSubmitted(false), 4000)
  }

  const cols = {
    product: ['features', 'pricing', 'faq'] as const,
    company: ['about', 'contact', 'legal'] as const,
    resources: ['docs', 'status', 'changelog'] as const,
  }

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand col */}
          <div className="lg:col-span-2">
            <JovaWordmark size="md" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{t('tagline')}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm gap-2">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletterPlaceholder')}
                className="flex-1"
              />
              <Button type="submit">{submitted ? '✓' : t('newsletterCta')}</Button>
            </form>
            {submitted && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-success"
              >
                {t('newsletterSuccess')}
              </motion.p>
            )}

            <div className="mt-6 flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="mailto:hello@myjova.com"
                  aria-label="Email"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://twitter.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Product col */}
          <div>
            <p className="mb-3 text-sm font-semibold">{t('product')}</p>
            <ul className="space-y-2 text-sm">
              {cols.product.map((k) => (
                <li key={k}>
                  <a href={`#${k}`} className="text-muted-foreground hover:text-foreground">
                    {tNav(k)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-3 text-sm font-semibold">{t('company')}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {cols.company.map((k) => (
                <li key={k}>
                  {k === 'contact' ? (
                    <a href="mailto:hello@myjova.com" className="hover:text-foreground">
                      {t(k)}
                    </a>
                  ) : k === 'legal' ? (
                    <span className="flex gap-3">
                      <a href={`/${locale}/privacy`} className="hover:text-foreground">
                        Privacy
                      </a>
                      <a href={`/${locale}/terms`} className="hover:text-foreground">
                        Terms
                      </a>
                    </span>
                  ) : (
                    <span className="cursor-not-allowed opacity-50">{t(k)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-3 text-sm font-semibold">{t('resources')}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {cols.resources.map((k) => (
                <li key={k}>
                  <span className="cursor-not-allowed opacity-50">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t('copyright')}</p>
          <LocaleSwitcher locale={locale} />
        </div>
      </div>
    </footer>
  )
}
