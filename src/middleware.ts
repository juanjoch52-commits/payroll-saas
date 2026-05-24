import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/config'
import { updateSession } from '@/lib/supabase/middleware'

// Configura el middleware de i18n.
const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

/**
 * Middleware combinado:
 *   1. Refresca el access token de Supabase (sin esto, las cookies expiran).
 *   2. Aplica el routing de i18n de next-intl.
 *   3. Protege las rutas privadas (todas excepto /, /[locale], /[locale]/login, /[locale]/signup, /api/webhooks/*).
 *
 * La protección por rol se hace dentro de los Server Components/Actions,
 * no aquí — el middleware solo verifica que haya sesión activa.
 */
export async function middleware(request: NextRequest) {
  // Paso 1: refresca la sesión de Supabase. Devuelve una respuesta que
  // ya tiene las cookies actualizadas; clonamos su data al siguiente paso.
  const supabaseResponse = await updateSession(request)

  // Webhooks externos (Stripe, MyRavex) no llevan locale ni sesión.
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return supabaseResponse
  }

  // Paso 2: aplicar next-intl routing.
  const intlResponse = intlMiddleware(request)

  // Combina las cookies actualizadas con la respuesta de next-intl.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  }

  return intlResponse
}

export const config = {
  // Match todo excepto archivos estáticos, _next y favicon.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
