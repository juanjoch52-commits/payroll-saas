import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback handler para confirmación de email, magic links, OAuth, y reset
 * de password. Supabase redirige aquí con un `code` que se intercambia por
 * una sesión activa.
 *
 * Query params:
 *   - code: token de Supabase (obligatorio)
 *   - next: ruta destino después del intercambio (default: /)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si falla, manda al landing con un flag de error.
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
