'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Calculator, TrendingUp, Clock, DollarSign } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { SectionReveal } from './SectionReveal'
import { AnimatedCounter } from './AnimatedCounter'
import { monthlyTotalUsd, typicalPlanForTeamSize } from '@/lib/pricing/plans'
import {
  convertFromUSD,
  formatPrice,
  type Currency,
} from '@/lib/pricing/currency'

/**
 * Calculadora de ROI interactiva.
 * 3 sliders: # employees, hours/week per employee, hourly rate.
 * Calcula ahorro mensual basado en:
 *   - 12 min/empleado/día perdidos en tracking manual (estudio APA 2024)
 *   - Errores de timesheet ~2% del payroll total
 *   - Multas IRS típicas ~$845 promedio por error de payroll
 */
export function ROICalculator({
  currency = 'USD',
  bcp47 = 'en-US',
}: {
  currency?: Currency
  /** BCP 47 locale for Intl.NumberFormat (e.g. 'fr-CA' for Quebec). */
  bcp47?: string
} = {}) {
  const t = useTranslations('landing.roi')
  const [employees, setEmployees] = useState(15)
  const [hoursPerWeek, setHoursPerWeek] = useState(40)
  // Default hourly rate adjusted to local currency (28 USD ≈ 38 CAD ≈ 26 EUR)
  const defaultHourly = currency === 'CAD' ? 38 : currency === 'EUR' ? 26 : 28
  const [hourlyRate, setHourlyRate] = useState(defaultHourly)

  const savings = useMemo(() => {
    // Tiempo manual de tracking: 12 min/empleado/día × 20 días = 4h/mes/empleado
    const manualTimeHoursPerMonth = employees * 4
    const timeCost = manualTimeHoursPerMonth * hourlyRate

    // Errores de timesheet: 2% del payroll mensual
    const monthlyPayroll = employees * hoursPerWeek * 4.33 * hourlyRate
    const errorCost = monthlyPayroll * 0.02

    // Costo MyJova: base del plan típico + por-trabajador-activo (USD → local)
    const myjovaCostUsd = monthlyTotalUsd(typicalPlanForTeamSize(employees), employees)
    const myjovaCost = convertFromUSD(myjovaCostUsd, currency)

    const monthly = Math.max(0, Math.round(timeCost + errorCost - myjovaCost))
    const yearly = monthly * 12
    const hoursReclaimed = manualTimeHoursPerMonth

    return { monthly, yearly, hoursReclaimed, myjovaCost }
  }, [employees, hoursPerWeek, hourlyRate, currency])

  // Currency symbol for the hourly slider prefix
  const currencySymbol = currency === 'CAD' ? 'CA$' : currency === 'EUR' ? '€' : '$'

  return (
    <section id="roi" className="py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Calculator className="h-3 w-3" />
            {t('badge')}
          </div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <SectionReveal index={1} className="mx-auto mt-12 max-w-5xl">
          <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-5">
              {/* Sliders */}
              <div className="space-y-8 p-8 lg:col-span-3">
                <SliderField
                  label={t('inputs.employees')}
                  value={employees}
                  min={1}
                  max={200}
                  step={1}
                  onChange={setEmployees}
                  suffix=""
                />
                <SliderField
                  label={t('inputs.hoursPerWeek')}
                  value={hoursPerWeek}
                  min={10}
                  max={60}
                  step={1}
                  onChange={setHoursPerWeek}
                  suffix=" h"
                />
                <SliderField
                  label={t('inputs.hourlyRate')}
                  value={hourlyRate}
                  min={10}
                  max={150}
                  step={1}
                  onChange={setHourlyRate}
                  prefix={currencySymbol}
                />
                <p className="text-xs text-muted-foreground">{t('disclaimer')}</p>
              </div>

              {/* Results */}
              <div className="flex flex-col justify-between gap-6 bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground lg:col-span-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    {t('results.monthly')}
                  </p>
                  <motion.div
                    key={savings.monthly}
                    initial={{ opacity: 0.6, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-bold tabular-nums md:text-5xl"
                  >
                    <AnimatedCounter value={savings.monthly} prefix={currencySymbol} duration={0.8} locale={bcp47} />
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    {t('results.yearly')}
                  </p>
                  <motion.div
                    key={savings.yearly}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl font-bold tabular-nums md:text-3xl"
                  >
                    <AnimatedCounter value={savings.yearly} prefix={currencySymbol} duration={0.8} locale={bcp47} />
                  </motion.div>
                </div>

                <div className="space-y-3 border-t border-primary-foreground/20 pt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 opacity-80" />
                    <span>
                      {t('results.hoursReclaimed', { hours: savings.hoursReclaimed })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 opacity-80" />
                    <span>{t('results.planCost', { cost: formatPrice(savings.myjovaCost, currency, bcp47) })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {t('results.roi', {
                        roi: Math.round(
                          (savings.monthly / Math.max(savings.myjovaCost, 1)) * 100,
                        ),
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </SectionReveal>
      </div>
    </section>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix = '',
  suffix = '',
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
          {prefix}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
