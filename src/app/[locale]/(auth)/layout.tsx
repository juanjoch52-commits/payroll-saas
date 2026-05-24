import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { JovaWordmark } from '@/components/branding/JovaWordmark'

// Auth pages dependen del request (cookies para verificar sesión existente).
export const dynamic = 'force-dynamic'

/**
 * Layout para las pantallas de autenticación (login, signup, forgot-password).
 *
 * Centra el contenido en pantalla con un branding mínimo de MyJova arriba.
 */
export default async function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const t = await getTranslations()

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="container flex items-center justify-between py-6">
        <Link href={`/${locale}`} className="text-foreground">
          <JovaWordmark size="lg" />
        </Link>
      </header>
      <main className="container flex items-center justify-center pb-24 pt-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
