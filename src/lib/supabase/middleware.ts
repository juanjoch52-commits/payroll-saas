import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca el access token de Supabase en cada request.
 *
 * Sin esto, el token expira en ~1 hora y el usuario se desloguea de forma
 * impredecible. El middleware lo llama en TODAS las rutas (menos los
 * archivos estáticos, ver matcher en `src/middleware.ts`).
 *
 * Importante: NO uses `supabase.auth.getSession()` en server — siempre
 * `supabase.auth.getUser()` que revalida con el server.
 *
 * Tolerancia a env vars vacías: si `.env.local` aún no tiene URL/key reales
 * (caso típico en dev antes de crear el proyecto Supabase), no crasheamos
 * — devolvemos un NextResponse vacío y dejamos que la landing funcione.
 * En producción estas variables SIEMPRE están definidas vía Vercel envs.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // Dev sin Supabase configurado todavía — pasa sin refresh de sesión.
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as never),
        )
      },
    },
  })

  // Refresca el token si está por expirar.
  await supabase.auth.getUser()

  return supabaseResponse
}
