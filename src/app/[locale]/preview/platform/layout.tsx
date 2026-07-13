import Link from 'next/link'
import { LayoutDashboard, Building2, CreditCard, BarChart3, Webhook } from 'lucide-react'
import { JovaWordmark } from '@/components/branding/JovaWordmark'

export default function PlatformPreviewLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const navItems = [
    { href: '', label: 'Overview', icon: LayoutDashboard },
    { href: '/tenants', label: 'Tenants', icon: Building2 },
    { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/metrics', label: 'Metrics', icon: BarChart3 },
    { href: '/webhooks', label: 'Webhook events', icon: Webhook },
  ]

  return (
    <div className="flex min-h-[calc(100vh-40px)] bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <span className="inline-flex items-center gap-2">
            <JovaWordmark size="md" />
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              Platform
            </span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href || 'overview'}
              href={`/${locale}/preview/platform${href}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p>juan@myjova.com</p>
          <p>Platform admin</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b bg-card px-6">
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            Service-role context · cross-tenant access
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
