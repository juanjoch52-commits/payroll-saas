import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { Button } from '@/components/ui/button'

/**
 * Sticky header de la landing. Transparente al top, con blur al scrollear.
 * Implementación: backdrop-blur fijo desde el inicio (más simple, sin JS extra).
 */
export async function LandingHeader({ locale }: { locale: string }) {
  const t = await getTranslations()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}`} aria-label="MyJova home">
          <JovaWordmark size="md" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('landing.nav.features')}
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('landing.nav.pricing')}
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('landing.nav.faq')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher locale={locale} />
          <Link
            href={`/${locale}/login`}
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            {t('landing.nav.signIn')}
          </Link>
          <Button asChild size="sm">
            <Link href={`/${locale}/signup`}>{t('landing.nav.startTrial')}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
