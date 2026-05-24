import { setRequestLocale } from 'next-intl/server'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { Hero } from '@/components/landing/Hero'
import { TrustBar } from '@/components/landing/TrustBar'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { MobilePreview } from '@/components/landing/MobilePreview'
import { PricingTable } from '@/components/landing/PricingTable'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

/**
 * Landing page de MyJova — la página comercial pública.
 *
 * Compone secciones modulares. Cada sección lee sus strings vía
 * next-intl `getTranslations()` para ser bilingüe ES/EN.
 *
 * El LandingHeader es sticky y se queda arriba al hacer scroll.
 * Los anchors (#features, #pricing, #faq) hacen scroll suave gracias al
 * `scroll-behavior: smooth` global de Tailwind base.
 */
export default async function LandingPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader locale={locale} />
      <main>
        <Hero locale={locale} />
        <TrustBar />
        <Features />
        <HowItWorks />
        <MobilePreview />
        <PricingTable locale={locale} />
        <FAQ />
        <FinalCTA locale={locale} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
