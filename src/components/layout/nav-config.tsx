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
  Coins,
  HardHat,
  Megaphone,
  Wallet,
  Clock,
  MapPin,
} from 'lucide-react'

// =============================================================================
// Configuración de navegación del app de manager — agrupada por secciones.
// Client-safe (sin imports de servidor): la usan SidebarNav y MobileNav.
// =============================================================================

export type Role = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer'

export type NavItem = {
  href: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  minRole: Role
}

export type NavSection = { titleKey: string; items: NavItem[] }

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.sections.overview',
    items: [{ href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, minRole: 'viewer' }],
  },
  {
    titleKey: 'nav.sections.people',
    items: [
      { href: '/employees', labelKey: 'nav.employees', icon: Users, minRole: 'viewer' },
      { href: '/schedule', labelKey: 'nav.schedule', icon: CalendarDays, minRole: 'manager' },
      { href: '/time-off', labelKey: 'nav.timeOff', icon: Plane, minRole: 'manager' },
      { href: '/documents', labelKey: 'nav.documents', icon: FileSignature, minRole: 'manager' },
    ],
  },
  {
    titleKey: 'nav.sections.time',
    items: [
      { href: '/time-tracking', labelKey: 'nav.timeTracking', icon: Clock, minRole: 'manager' },
      { href: '/production', labelKey: 'nav.production', icon: Boxes, minRole: 'manager' },
      { href: '/tips', labelKey: 'nav.tips', icon: Coins, minRole: 'manager' },
    ],
  },
  {
    titleKey: 'nav.sections.payroll',
    items: [
      { href: '/payroll', labelKey: 'nav.payroll', icon: Calculator, minRole: 'viewer' },
      { href: '/deductions', labelKey: 'nav.deductions', icon: Wallet, minRole: 'manager' },
      { href: '/jobs', labelKey: 'nav.jobs', icon: HardHat, minRole: 'manager' },
      { href: '/reports', labelKey: 'nav.reports', icon: FileText, minRole: 'admin' },
    ],
  },
  {
    titleKey: 'nav.sections.communication',
    items: [
      { href: '/announcements', labelKey: 'nav.announcements', icon: Megaphone, minRole: 'manager' },
    ],
  },
  {
    titleKey: 'nav.sections.organization',
    items: [
      { href: '/worksites', labelKey: 'nav.worksites', icon: MapPin, minRole: 'manager' },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings, minRole: 'admin' },
      { href: '/billing', labelKey: 'nav.billing', icon: CreditCard, minRole: 'owner' },
    ],
  },
]

const roleRank: Record<Role, number> = { employee: 0, viewer: 1, manager: 2, admin: 3, owner: 4 }

export function canSee(itemMinRole: Role, userRole: Role): boolean {
  return roleRank[userRole] >= roleRank[itemMinRole]
}
