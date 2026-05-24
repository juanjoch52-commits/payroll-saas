import { setRequestLocale } from 'next-intl/server'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { Hero } from '@/components/landing/Hero'
import { TrustBar } from '@/components/landing/TrustBar'
import { Features } from '@/components/landing/Features'
import { UseCases } from '@/components/landing/UseCases'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { MobileShowcase } from '@/components/landing/MobileShowcase'
import { ROICalculator } from '@/components/landing/ROICalculator'
import { Comparison } from '@/components/landing/Comparison'
import { Testimonials } from '@/components/landing/Testimonials'
import { IntegrationsLogos } from '@/components/landing/IntegrationsLogos'
import { PricingTable } from '@/components/landing/PricingTable'
import { VideoDemo } from '@/components/landing/VideoDemo'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { LandingFooter } from '@/components/landing/LandingFooter'

/**
 * Landing page de MyJova.
 *
 * 15 secciones, todas con animaciones premium (framer-motion + GSAP),
 * 4 locales (EN/ES/FR/FR-CA), competitiva con Gusto/Square/Homebase.
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
        <UseCases />
        <HowItWorks />
        <MobileShowcase />
        <ROICalculator />
        <Comparison />
        <Testimonials />
        <IntegrationsLogos />
        <PricingTable locale={locale} />
        <VideoDemo />
        <FAQ />
        <FinalCTA locale={locale} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
