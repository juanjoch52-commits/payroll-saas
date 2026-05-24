'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ANCHORS = ['features', 'how-it-works', 'industries', 'pricing', 'faq']

export function LandingHeader({ locale }: { locale: string }) {
  const t = useTranslations()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-all duration-200',
        scrolled
          ? 'border-border/60 bg-background/85 backdrop-blur-xl shadow-sm'
          : 'border-transparent bg-background/0',
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}`} aria-label="MyJova home" className="shrink-0">
          <JovaWordmark size="md" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {ANCHORS.map((a) => (
            <a
              key={a}
              href={`#${a}`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(
                `landing.nav.${a === 'how-it-works' ? 'howItWorks' : a === 'industries' ? 'industries' : a}` as 'landing.nav.features',
              )}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} />
          <Link
            href={`/${locale}/login`}
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block"
          >
            {t('landing.nav.signIn')}
          </Link>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`/${locale}/signup`}>{t('landing.nav.startTrial')}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t bg-background md:hidden">
          <nav className="container flex flex-col gap-2 py-4">
            {ANCHORS.map((a) => (
              <a
                key={a}
                href={`#${a}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {t(
                  `landing.nav.${a === 'how-it-works' ? 'howItWorks' : a === 'industries' ? 'industries' : a}` as 'landing.nav.features',
                )}
              </a>
            ))}
            <Link
              href={`/${locale}/login`}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              {t('landing.nav.signIn')}
            </Link>
            <Button asChild className="mt-2">
              <Link href={`/${locale}/signup`}>{t('landing.nav.startTrial')}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
