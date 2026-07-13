'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Clock, Camera, Receipt, MapPin } from 'lucide-react'

import { SectionReveal } from './SectionReveal'

/**
 * Showcase de la app móvil empleado con device frame iPhone
 * y carousel automático de "screens" simulados (no necesita screenshots reales).
 *
 * Cuando F8 capture screenshots reales del portal employee, sustituir
 * los <ScreenMock> por <Image src="/screenshots/mobile-clock.png" />
 */
export function MobileShowcase() {
  const t = useTranslations('landing.mobileShowcase')
  const [active, setActive] = useState(0)

  const screens = [
    { id: 'clock', icon: Camera, color: 'bg-primary', label: t('screens.clock.label') },
    { id: 'history', icon: Clock, color: 'bg-emerald-500', label: t('screens.history.label') },
    { id: 'paystubs', icon: Receipt, color: 'bg-purple-500', label: t('screens.paystubs.label') },
    { id: 'profile', icon: MapPin, color: 'bg-orange-500', label: t('screens.profile.label') },
  ]

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % screens.length), 3500)
    return () => clearInterval(id)
  }, [screens.length])

  return (
    <section className="overflow-hidden py-16 md:py-24">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Text */}
          <SectionReveal className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t('title')}
              </h2>
              <p className="mt-3 text-balance text-lg text-muted-foreground">
                {t('sub')}
              </p>
            </div>

            <ul className="space-y-4">
              {screens.map((s, i) => {
                const Icon = s.icon
                return (
                  <li
                    key={s.id}
                    onClick={() => setActive(i)}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                      active === i
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${s.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {t(`screens.${s.id}.title`)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`screens.${s.id}.desc`)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </SectionReveal>

          {/* Device frame */}
          <SectionReveal index={1} className="flex justify-center">
            <DeviceFrame>
              <AnimatePresence mode="wait">
                <motion.div
                  key={screens[active].id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-full w-full flex-col"
                >
                  <ScreenMock
                    index={active}
                    label={screens[active].label}
                    icon={screens[active].icon}
                    color={screens[active].color}
                    t={t}
                  />
                </motion.div>
              </AnimatePresence>
            </DeviceFrame>
          </SectionReveal>
        </div>
      </div>
    </section>
  )
}

function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[600px] w-[300px] rounded-[40px] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl dark:border-zinc-800">
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-10 h-6 w-32 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-800" />
      {/* Screen */}
      <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-background">
        {children}
      </div>
    </div>
  )
}

function ScreenMock({
  index,
  label,
  icon: Icon,
  color,
  t,
}: {
  index: number
  label: string
  icon: React.ElementType
  color: string
  // eslint-disable-next-line
  t: any
}) {
  // Render distinto por pantalla
  if (index === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 pb-3 pt-10 text-xs">
          <span className="font-semibold">9:41</span>
          <span className="text-muted-foreground">MyJova</span>
          <span>●●●</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${color}`}>
            <Icon className="h-10 w-10 text-white" />
          </div>
          <p className="text-center text-lg font-semibold">{label}</p>
          <button className={`w-full rounded-xl ${color} px-6 py-3 text-sm font-semibold text-white shadow-lg`}>
            {t('mockCta')}
          </button>
          <div className="mt-2 flex items-center gap-1 text-xs text-success">
            <MapPin className="h-3 w-3" />
            <span>{t('mockLocationOk')}</span>
          </div>
        </div>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 pb-3 pt-10 text-xs">
          <span className="font-semibold">9:41</span>
          <span className="text-muted-foreground">{label}</span>
          <span>●●●</span>
        </div>
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">May {20 - i}, 2026</p>
                <p className="text-xs text-muted-foreground">7:42 AM - 4:15 PM</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">8h 14m</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (index === 2) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 pb-3 pt-10 text-xs">
          <span className="font-semibold">9:41</span>
          <span className="text-muted-foreground">{label}</span>
          <span>●●●</span>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{t('mockLastPaystub')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">$1,247.50</p>
            <p className="mt-1 text-xs text-muted-foreground">May 1 – May 15</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{t('mockYtd')}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">$24,955.00</p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 pb-3 pt-10 text-xs">
        <span className="font-semibold">9:41</span>
        <span className="text-muted-foreground">{label}</span>
        <span>●●●</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${color} text-white font-bold`}>
            MG
          </div>
          <div>
            <p className="font-semibold">María García</p>
            <p className="text-xs text-muted-foreground">{t('mockHourlyRole')}</p>
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {[t('mockProfilePay'), t('mockProfileTaxes'), t('mockProfileLang')].map((lbl) => (
            <div key={lbl} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm">
              <span>{lbl}</span>
              <span className="text-muted-foreground">›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
