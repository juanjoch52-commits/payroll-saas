import { Building2, CreditCard, Clock, Users, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function AnalyticsKPIs({
  totalOrgs,
  activeSubs,
  trialing,
  totalEmployees,
  mrr,
}: {
  totalOrgs: number
  activeSubs: number
  trialing: number
  totalEmployees: number
  mrr: number
}) {
  const items = [
    { label: 'Tenants', value: totalOrgs.toLocaleString(), icon: Building2 },
    {
      label: 'MRR',
      value: `$${mrr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      highlight: true,
    },
    { label: 'Active subs', value: activeSubs.toLocaleString(), icon: CreditCard },
    { label: 'Trialing', value: trialing.toLocaleString(), icon: Clock },
    { label: 'Employees', value: totalEmployees.toLocaleString(), icon: Users },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <Card
            key={it.label}
            className={
              it.highlight
                ? 'border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent'
                : ''
            }
          >
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {it.label}
                </p>
                <p className="text-2xl font-bold tabular-nums">{it.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
