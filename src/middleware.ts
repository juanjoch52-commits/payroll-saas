import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, type Locale } from '@/i18n/config'
import { updateSession } from '@/lib/supabase/middleware'

// Configura el middleware de i18n.
const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
})

const LOCALE_REGEX = /^\/(en|es|fr|fr-CA)(\/|$)/i
const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * Geo-detección de locale para visitantes nuevos.
 *
 * Reglas:
 *   - Cookie NEXT_LOCALE existe → respeta (preferencia explícita)
 *   - Path ya tiene segmento de locale → no toca
 *   - Quebec (CA-QC) → fr-CA
 *   - Resto de Canadá → en
 *   - Francia / Bélgica / Suiza / Mónaco / Luxemburgo → fr
 *   - Latam / España → es
 *   - Fallback Accept-Language: fr-ca → fr-CA, fr* → fr, es* → es
 *   - Default → en
 */
function detectLocaleFromRequest(req: NextRequest): Locale {
  const country = (
    req.headers.get('x-myjova-country') ??
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    ''
  ).toUpperCase()
  const region = (
    req.headers.get('x-myjova-region') ??
    req.headers.get('x-vercel-ip-country-region') ??
    ''
  ).toUpperCase()

  if (country === 'CA' && region === 'QC') return 'fr-CA'
  if (country === 'CA') return 'en'
  if (['FR', 'BE', 'CH', 'MC', 'LU'].includes(country)) return 'fr'
  if (
    [
      'ES', 'MX', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'PR', 'DO',
      'UY', 'PY', 'BO', 'GT', 'HN', 'NI', 'CR', 'PA', 'SV', 'CU',
    ].includes(country)
  )
    return 'es'

  const al = (req.headers.get('accept-language') ?? '').toLowerCase()
  if (al.startsWith('fr-ca')) return 'fr-CA'
  if (al.startsWith('fr')) return 'fr'
  if (al.startsWith('es')) return 'es'
  return defaultLocale
}

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
  // Paso 1: refresca la sesión de Supabase.
  const supabaseResponse = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Webhooks externos y API rutas: no llevan locale ni sesión.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return supabaseResponse
  }

  // Paso 2: geo-detección de locale en first visit (sin cookie + sin locale en URL).
  const hasLocaleCookie = request.cookies.has(LOCALE_COOKIE)
  const pathHasLocale = LOCALE_REGEX.test(pathname)

  if (!hasLocaleCookie && !pathHasLocale) {
    const detected = detectLocaleFromRequest(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${detected}${pathname === '/' ? '' : pathname}`
    const redirect = NextResponse.redirect(url)
    redirect.cookies.set(LOCALE_COOKIE, detected, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
    // Forward Supabase cookies
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie.name, cookie.value, cookie)
    }
    return redirect
  }

  // Paso 3: si el path tiene locale, persistir cookie para próximas visitas
  // (cuando el user usa LocaleSwitcher, queremos recordar su elección).
  const localeMatch = pathname.match(LOCALE_REGEX)
  if (localeMatch && !hasLocaleCookie) {
    supabaseResponse.cookies.set(LOCALE_COOKIE, localeMatch[1], {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
  }

  // Paso 4: aplicar next-intl routing.
  const intlResponse = intlMiddleware(request)

  // Combina cookies de Supabase + nuestra cookie de locale en la respuesta de intl.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  }

  return intlResponse
}

export const config = {
  // Match todo excepto archivos estáticos, _next y favicon.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
