import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Calculator,
  Clock,
  MapPin,
  FileText,
  CreditCard,
} from 'lucide-react'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { MOCK_ORG } from '@/lib/preview/mock-data'

export default function BusinessPreviewLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const navItems = [
    { href: '', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/payroll', label: 'Payroll', icon: Calculator },
    { href: '/time-tracking', label: 'Time tracking', icon: Clock },
    { href: '/worksites', label: 'Worksites', icon: MapPin },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="flex min-h-[calc(100vh-40px)] bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <JovaWordmark size="md" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href || 'dashboard'}
              href={`/${locale}/preview/business${href}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p className="font-medium">{MOCK_ORG.name}</p>
          <p className="capitalize">Plan: {MOCK_ORG.plan}</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">MyJova</p>
            <p className="text-sm font-medium">{MOCK_ORG.name}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium">juan@acme.example</p>
            <p className="text-muted-foreground">owner</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
