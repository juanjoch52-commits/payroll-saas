import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Webhook,
  FileSearch,
  LifeBuoy,
  Megaphone,
  TrendingUp,
} from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth/platform'
import { LocaleSwitcher } from '@/components/layout/LocaleSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

/**
 * Panel super-admin de MyJova. Vive fuera del grupo (app) porque no es
 * tenant-scoped — opera cross-tenant.
 */
export default async function PlatformAdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const session = await requirePlatformAdmin(locale)

  const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
    { href: '/admin/audit', label: 'Audit logs', icon: FileSearch },
    { href: '/admin/support', label: 'Support', icon: LifeBuoy },
    { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
    { href: '/admin/webhooks', label: 'Webhook events', icon: Webhook },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href={`/${locale}/admin`} className="flex items-center gap-2 text-xl font-bold tracking-tight">
            MyJova
            <Badge variant="warning" className="text-[10px] uppercase">
              Platform
            </Badge>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={`/${locale}${href}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p>{session.email}</p>
          <p>Platform admin</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 border-b bg-card px-6">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle />
          <Link href={`/${locale}/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Tenant view
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
