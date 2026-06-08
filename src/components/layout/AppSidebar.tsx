import Link from 'next/link'
import { JovaWordmark } from '@/components/branding/JovaWordmark'
import { SidebarNav } from './SidebarNav'
import type { Role } from './nav-config'

/**
 * Sidebar de navegación principal (escritorio). El contenido y el gating por
 * rol viven en SidebarNav (client, con estado activo) + nav-config. En móvil
 * el sidebar se oculta y la navegación llega vía MobileNav (en el header).
 */
export function AppSidebar({ locale, role }: { locale: string; role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href={`/${locale}/dashboard`}>
          <JovaWordmark size="md" />
        </Link>
      </div>
      <SidebarNav locale={locale} role={role} />
    </aside>
  )
}
