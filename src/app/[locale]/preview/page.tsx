import Link from 'next/link'
import { Building2, Smartphone, Shield, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const perspectives = [
  {
    href: 'business',
    icon: Building2,
    title: 'Business owner',
    audience: 'El contratista / restaurantero que paga MyJova ($49-$199/mo)',
    sees: [
      'Dashboard con KPIs + LiveMap de empleados clocked-in',
      'Lista de empleados (5 mock)',
      'Time-tracking con aprobación pending/approved',
      'Payroll runs y reportes anuales',
      'Worksites con geofence',
      'Billing y planes',
    ],
  },
  {
    href: 'employee',
    icon: Smartphone,
    title: 'Employee (mobile)',
    audience: 'El trabajador que hace clock in/out desde el sitio',
    sees: [
      'Clock in/out screen con cámara + GPS',
      'Historial de turnos',
      'Recibos de pago (paystubs)',
      'Perfil',
    ],
  },
  {
    href: 'platform',
    icon: Shield,
    title: 'Platform admin',
    audience: 'Tú (Juan) — owner de MyJova, ves todos los tenants',
    sees: [
      'Overview global con MRR, churn, employees totales',
      'Lista de los 47 tenants',
      'Subscriptions de todos los planes',
      'Gráficos mensuales de crecimiento',
      'Webhook events log',
    ],
  },
]

export default async function PreviewHubPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  return (
    <main className="container max-w-5xl py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">MyJova — Preview Hub</h1>
        <p className="mt-3 text-muted-foreground">
          Elige la perspectiva que quieres ver. Cada una usa los mismos componentes del producto real
          pero con datos mock realistas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {perspectives.map(({ href, icon: Icon, title, audience, sees }) => (
          <Link key={href} href={`/${locale}/preview/${href}`} className="group">
            <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </CardTitle>
                <CardDescription>{audience}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lo que verás
                </p>
                <ul className="space-y-1 text-sm">
                  {sees.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-primary">·</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
