import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Tarjeta de KPI consistente para dashboards. Tono semántico vía tokens
 * (success/warning/info/destructive) — NUNCA colores crudos tipo text-green-700.
 */
export type StatTone = 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'primary'

const toneIcon: Record<StatTone, string> = {
  default: 'text-muted-foreground bg-muted',
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
  destructive: 'text-destructive bg-destructive/10',
}

// Clases estáticas (Tailwind no genera clases construidas dinámicamente).
const toneBorder: Record<StatTone, string> = {
  default: '',
  primary: 'border-primary/40',
  success: 'border-success/40',
  warning: 'border-warning/40',
  info: 'border-info/40',
  destructive: 'border-destructive/40',
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  href,
  highlight = false,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: StatTone
  hint?: React.ReactNode
  href?: string
  /** Resalta el borde con el tono (p.ej. pendientes > 0). */
  highlight?: boolean
}) {
  const inner = (
    <Card
      className={cn(
        'h-full transition-shadow',
        href && 'hover:shadow-md',
        highlight && toneBorder[tone],
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', toneIcon[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}
