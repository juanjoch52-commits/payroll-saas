import { Check, X, Minus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { SectionReveal } from './SectionReveal'

type Cell = boolean | 'partial' | string

type Row = {
  feature: string
  myjova: Cell
  gusto: Cell
  square: Cell
  homebase: Cell
}

/**
 * Tabla comparativa MyJova vs Gusto vs Square Payroll vs Homebase.
 * Las marcas referenciadas son propiedad de sus respectivas empresas.
 * Estos comparativos representan oferta pública a fecha de 2026-05.
 */
export async function Comparison() {
  const t = await getTranslations('landing.comparison')

  const rows: Row[] = [
    {
      feature: t('rows.clockInPhoto'),
      myjova: true,
      gusto: false,
      square: false,
      homebase: true,
    },
    {
      feature: t('rows.geofence'),
      myjova: true,
      gusto: false,
      square: 'partial',
      homebase: true,
    },
    {
      feature: t('rows.payrollUS'),
      myjova: true,
      gusto: true,
      square: true,
      homebase: false,
    },
    {
      feature: t('rows.payrollCA'),
      myjova: true,
      gusto: false,
      square: false,
      homebase: false,
    },
    {
      feature: t('rows.w2_1099'),
      myjova: true,
      gusto: true,
      square: true,
      homebase: false,
    },
    {
      feature: t('rows.spanish'),
      myjova: true,
      gusto: 'partial',
      square: 'partial',
      homebase: 'partial',
    },
    {
      feature: t('rows.french'),
      myjova: true,
      gusto: false,
      square: false,
      homebase: false,
    },
    {
      feature: t('rows.smallBizPricing'),
      myjova: '$49',
      gusto: '$40+',
      square: '$35+',
      homebase: '$24.95+',
    },
    {
      feature: t('rows.mobileApp'),
      myjova: true,
      gusto: 'partial',
      square: true,
      homebase: true,
    },
    {
      feature: t('rows.apiAccess'),
      myjova: true,
      gusto: 'partial',
      square: false,
      homebase: false,
    },
  ]

  return (
    <section id="comparison" className="border-y bg-muted/30 py-16 md:py-24">
      <div className="container">
        <SectionReveal className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="text-balance text-lg text-muted-foreground">{t('sub')}</p>
        </SectionReveal>

        <SectionReveal index={1} className="mt-12 overflow-x-auto">
          <table className="mx-auto w-full max-w-5xl border-separate border-spacing-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b bg-background px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('th.feature')}
                </th>
                <th className="border-b bg-primary/5 px-4 py-4 text-sm font-bold text-primary">
                  MyJova
                </th>
                <th className="border-b px-4 py-4 text-sm font-medium text-muted-foreground">
                  Gusto
                </th>
                <th className="border-b px-4 py-4 text-sm font-medium text-muted-foreground">
                  Square Payroll
                </th>
                <th className="border-b px-4 py-4 text-sm font-medium text-muted-foreground">
                  Homebase
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                  <td className="sticky left-0 z-10 border-b bg-inherit px-4 py-3 text-sm font-medium text-foreground">
                    {r.feature}
                  </td>
                  <td className="border-b bg-primary/5 px-4 py-3 text-center">
                    <CellRender value={r.myjova} highlight />
                  </td>
                  <td className="border-b px-4 py-3 text-center">
                    <CellRender value={r.gusto} />
                  </td>
                  <td className="border-b px-4 py-3 text-center">
                    <CellRender value={r.square} />
                  </td>
                  <td className="border-b px-4 py-3 text-center">
                    <CellRender value={r.homebase} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
            {t('disclaimer')}
          </p>
        </SectionReveal>
      </div>
    </section>
  )
}

function CellRender({ value, highlight = false }: { value: Cell; highlight?: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`mx-auto h-5 w-5 ${highlight ? 'text-primary' : 'text-success'}`}
        aria-hidden
      />
    )
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-muted-foreground/40" aria-hidden />
  }
  if (value === 'partial') {
    return <Minus className="mx-auto h-5 w-5 text-warning" aria-hidden />
  }
  return (
    <span
      className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}
    >
      {value}
    </span>
  )
}
