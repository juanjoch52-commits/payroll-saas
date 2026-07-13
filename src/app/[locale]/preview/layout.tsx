import Link from 'next/link'
import { Eye, ArrowLeft } from 'lucide-react'
import { JovaWordmark } from '@/components/branding/JovaWordmark'

export const dynamic = 'force-dynamic'

/**
 * Layout del modo preview.
 *
 * Banner amarillo arriba avisa que NO es producción y los datos son mock.
 * Switcher para alternar entre las 3 perspectivas (business / employee / platform).
 */
export default function PreviewLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Banner top */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Eye className="h-4 w-4" />
          <span className="font-semibold">PREVIEW MODE</span>
          <span className="hidden text-xs text-amber-800 sm:inline dark:text-amber-200">
            Datos mock · sin auth · solo para demo visual
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/${locale}/preview`}
            className="rounded px-2 py-1 font-medium hover:bg-amber-200/60"
          >
            Hub
          </Link>
          <span className="text-amber-700">·</span>
          <Link
            href={`/${locale}/preview/business`}
            className="rounded px-2 py-1 font-medium hover:bg-amber-200/60"
          >
            Business
          </Link>
          <Link
            href={`/${locale}/preview/employee`}
            className="rounded px-2 py-1 font-medium hover:bg-amber-200/60"
          >
            Employee
          </Link>
          <Link
            href={`/${locale}/preview/platform`}
            className="rounded px-2 py-1 font-medium hover:bg-amber-200/60"
          >
            Platform
          </Link>
          <span className="text-amber-700">·</span>
          <Link
            href={`/${locale}`}
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-amber-200/60"
          >
            <ArrowLeft className="h-3 w-3" /> Landing
          </Link>
        </div>
      </div>

      {children}

      {/* Footer fijo discreto */}
      <div className="border-t bg-muted/30 py-4 text-center text-xs text-muted-foreground">
        <JovaWordmark size="sm" className="inline-flex" /> · Preview mode · Mock data — no Supabase connection.
      </div>
    </div>
  )
}
