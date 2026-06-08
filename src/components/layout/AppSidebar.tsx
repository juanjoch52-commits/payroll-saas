import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  LayoutDashboard,
  Users,
  Calculator,
  FileText,
  CreditCard,
  Settings,
  Boxes,
  CalendarDays,
  Plane,
  FileSignature,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { JovaWordmark } from '@/components/branding/JovaWordmark'

/**
 * Sidebar de navegación principal.
 *
 * El rol del user filtra qué entradas aparecen:
 *   - viewer: solo dashboard, employees (read), payroll (read)
 *   - manager: + crear/editar empleados y nóminas
 *   - admin:   + reports, settings
 *   - owner:   + billing
 */
type Role = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer'

const navItems: {
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  minRole: Role
}[] = [
  { href: '/dashboard',     labelKey: 'nav.dashboard',     icon: LayoutDashboard, minRole: 'viewer' },
  { href: '/employees',     labelKey: 'nav.employees',     icon: Users,           minRole: 'viewer' },
  { href: '/payroll',       labelKey: 'nav.payroll',       icon: Calculator,      minRole: 'viewer' },
  { href: '/time-tracking', labelKey: 'nav.timeTracking',  icon: Calculator,      minRole: 'manager' },
  { href: '/schedule',      labelKey: 'nav.schedule',      icon: CalendarDays,    minRole: 'manager' },
  { href: '/time-off',      labelKey: 'nav.timeOff',       icon: Plane,           minRole: 'manager' },
  { href: '/documents',     labelKey: 'nav.documents',     icon: FileSignature,   minRole: 'manager' },
  { href: '/production',    labelKey: 'nav.production',     icon: Boxes,           minRole: 'manager' },
  { href: '/worksites',     labelKey: 'nav.worksites',     icon: Settings,        minRole: 'manager' },
  { href: '/reports',       labelKey: 'nav.reports',       icon: FileText,        minRole: 'admin' },
  { href: '/billing',       labelKey: 'nav.billing',       icon: CreditCard,      minRole: 'owner' },
  { href: '/settings',      labelKey: 'nav.settings',      icon: Settings,        minRole: 'admin' },
]

// Los employees usan el portal aparte (/(employee)/*). Si llegan a (app), redirige.
const roleRank: Record<Role, number> = { employee: 0, viewer: 1, manager: 2, admin: 3, owner: 4 }

function canSee(itemMinRole: Role, userRole: Role): boolean {
  return roleRank[userRole] >= roleRank[itemMinRole]
}

export async function AppSidebar({ locale, role }: { locale: string; role: Role }) {
  const t = await getTranslations()

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href={`/${locale}/dashboard`}>
          <JovaWordmark size="md" />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems
          .filter((item) => canSee(item.minRole, role))
          .map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={`/${locale}${href}`}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey as 'nav.dashboard')}
            </Link>
          ))}
      </nav>
    </aside>
  )
}
