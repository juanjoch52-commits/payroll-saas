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
  // Anti open-redirect: `next` debe ser una ruta relativa interna ('/x'), nunca
  // una URL absoluta ni protocol-relative ('//evil.com').
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Welcome email para cuentas recién confirmadas (best-effort). Solo si el
      // usuario se creó hace <10 min (confirmación de signup / primer OAuth) —
      // los callbacks de reset/magic-link de cuentas viejas no disparan nada.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const isNew =
          user?.created_at && Date.now() - new Date(user.created_at).getTime() < 10 * 60_000
        if (user && isNew) {
          const { data: m } = await supabase
            .from('memberships')
            .select('organization_id, organizations:organization_id(name)')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()
          const org = m as { organization_id: string; organizations: { name: string } | { name: string }[] } | null
          const orgName = Array.isArray(org?.organizations)
            ? org?.organizations[0]?.name
            : org?.organizations?.name
          const { dispatch } = await import('@/lib/notifications/dispatch')
          await dispatch({
            userId: user.id,
            organizationId: org?.organization_id,
            type: 'welcome',
            title: 'Welcome to MyJova 👋',
            body: 'Your account is ready. Let’s set up your company.',
            dedupeKey: `welcome:${user.id}`,
            emailTemplateData: {
              firstName: (user.user_metadata?.full_name as string)?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there',
              orgName: orgName ?? 'your company',
            },
          })
        }
      } catch {
        // Nunca bloquear el login por el welcome.
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si falla, manda al landing con un flag de error.
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
