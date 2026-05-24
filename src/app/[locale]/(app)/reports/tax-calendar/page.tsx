import { CalendarDays, MapPin } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TAX_CALENDAR_2026 } from '@/lib/payroll/tax-calendar'

export const dynamic = 'force-static'

export default function TaxCalendarPage() {
  const grouped = TAX_CALENDAR_2026.reduce<
    Record<string, typeof TAX_CALENDAR_2026>
  >((acc, e) => {
    const month = e.date.slice(0, 7) // yyyy-mm
    acc[month] = acc[month] ?? []
    acc[month].push(e)
    return acc
  }, {})

  const sortedMonths = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tax calendar 2026</h1>
        <p className="text-sm text-muted-foreground">
          Statutory deadlines for US federal, US states (CA, NY, TX, FL, PA, IL) and Canada
          (federal + Ontario + Quebec + BC + Alberta).
        </p>
      </header>

      <div className="space-y-4">
        {sortedMonths.map((month) => {
          const events = grouped[month]
          const display = new Date(`${month}-01`).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })
          return (
            <Card key={month}>
              <CardContent className="p-0">
                <h2 className="border-b bg-muted/30 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {display}
                </h2>
                <ul className="divide-y">
                  {events.map((e) => (
                    <li key={e.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3 sm:min-w-[140px]">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {e.date}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{e.titleKey}</p>
                        <p className="text-sm text-muted-foreground">{e.descKey}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {e.formCodes.map((c) => (
                            <Badge key={c} variant="info" className="text-[10px]">
                              {c}
                            </Badge>
                          ))}
                          {e.recurrence && (
                            <Badge variant="muted" className="text-[10px]">
                              {e.recurrence}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground sm:min-w-[100px]">
                        <MapPin className="h-3 w-3" />
                        {e.jurisdiction}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
