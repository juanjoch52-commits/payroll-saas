import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'

export async function LandingFooter({ locale }: { locale: string }) {
  const t = await getTranslations()

  return (
    <footer className="border-t bg-background">
      <div className="container py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand + tagline */}
          <div className="space-y-3">
            <JovaWordmark size="md" />
            <p className="max-w-xs text-sm text-muted-foreground">
              {t('landing.footer.tagline')}
            </p>
            <div className="pt-2">
              <LocaleSwitcher locale={locale} />
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold">{t('landing.footer.product')}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground">
                  {t('landing.nav.features')}
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground">
                  {t('landing.nav.pricing')}
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-foreground">
                  {t('landing.nav.faq')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/login`} className="hover:text-foreground">
                  {t('landing.nav.signIn')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold">{t('landing.footer.company')}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="cursor-not-allowed opacity-50">{t('landing.footer.about')}</span>
              </li>
              <li>
                <a href="mailto:hello@myjova.com" className="hover:text-foreground">
                  {t('landing.footer.contact')}
                </a>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-50">{t('landing.footer.legal')}</span>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold">{t('landing.footer.resources')}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="cursor-not-allowed opacity-50">{t('landing.footer.docs')}</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-50">{t('landing.footer.status')}</span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-50">
                  {t('landing.footer.changelog')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          {t('landing.footer.copyright')}
        </div>
      </div>
    </footer>
  )
}
