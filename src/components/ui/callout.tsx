import { cn } from '@/lib/utils'

/**
 * Aviso/nota con tono semántico (info/warning/success/destructive). Reemplaza
 * las cajas ad-hoc tipo `border-amber-500/30 bg-amber-500/5` repetidas en
 * varias tarjetas de Settings — todo vía tokens del tema.
 */
type CalloutVariant = 'info' | 'warning' | 'success' | 'destructive'

const variants: Record<CalloutVariant, string> = {
  info: 'border-info/30 bg-info/5 text-info-foreground',
  warning: 'border-warning/30 bg-warning/5 text-warning-foreground',
  success: 'border-success/30 bg-success/5 text-success-foreground',
  destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
}

export function Callout({
  variant = 'info',
  icon: Icon,
  title,
  children,
  className,
}: {
  variant?: CalloutVariant
  icon?: React.ComponentType<{ className?: string }>
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-md border p-3 text-sm', variants[variant], className)}>
      <div className="flex gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
        <div className="space-y-1">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className="text-muted-foreground">{children}</div>}
        </div>
      </div>
    </div>
  )
}
