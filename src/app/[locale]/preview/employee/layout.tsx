import Link from 'next/link'
import { Clock, History, Receipt, User } from 'lucide-react'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { MOCK_EMPLOYEE_SESSION } from '@/lib/preview/mock-data'

export default function EmployeePreviewLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const navItems = [
    { href: '', label: 'Clock', icon: Clock },
    { href: '/history', label: 'History', icon: History },
    { href: '/paystubs', label: 'Pay stubs', icon: Receipt },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <div className="flex min-h-[calc(100vh-40px)] flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex flex-col">
          <JovaWordmark size="sm" />
          <p className="text-xs text-muted-foreground">{MOCK_EMPLOYEE_SESSION.employee.org_name}</p>
        </div>
        <span className="text-xs text-muted-foreground">{MOCK_EMPLOYEE_SESSION.employee.full_name}</span>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-4 border-t bg-card">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href || 'clock'}
            href={`/${locale}/preview/employee${href}`}
            className="flex flex-col items-center gap-1 px-2 py-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
