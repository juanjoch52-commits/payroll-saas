import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const TIERS = [
  {
    code: 'essential',
    name: 'Esencial',
    price: 49,
    tagline: 'Para equipos pequeños',
    features: ['Hasta 10 empleados', 'Pago por hora y salario', 'Cálculo básico de impuestos', '1 usuario admin'],
    popular: false,
    isCurrent: false,
  },
  {
    code: 'advanced',
    name: 'Avanzado',
    price: 99,
    tagline: 'Para equipos en crecimiento',
    features: ['Hasta 50 empleados', 'Daily + commission', 'W-2 y 1099 anuales', 'Multi-usuario con roles'],
    popular: true,
    isCurrent: true,
  },
  {
    code: 'premium',
    name: 'Premium Bundle',
    price: 199,
    tagline: 'Para integración total',
    features: ['Empleados ilimitados', 'API REST access', '1099-NEC + T4A', 'Integración MyRavex', 'Soporte prioritario'],
    popular: false,
    isCurrent: false,
  },
]

export default async function PreviewBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans &amp; billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your current plan is Avanzado · Next renewal Jun 12, 2026</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <Card key={tier.code} className={cn(tier.isCurrent && 'border-primary ring-2 ring-primary/30')}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.tagline}</CardDescription>
                </div>
                {tier.isCurrent && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Current</span>
                )}
                {tier.popular && !tier.isCurrent && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Most popular</span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold">${tier.price}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.isCurrent ? 'outline' : 'default'}
                disabled={tier.isCurrent}
              >
                {tier.isCurrent ? 'Current' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
