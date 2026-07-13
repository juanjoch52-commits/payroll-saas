import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Lee/escribe las cookies de auth en el ciclo de vida del request.
 * Las queries pasan por RLS — el usuario solo ve datos de sus organizations.
 *
 * NOTA: Una vez que ejecutes `npm run db:types`, importa `Database` y
 * añade `<Database>` a los `createServerClient` para type-safety.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never),
            )
          } catch {
            // `setAll` falla dentro de Server Components puros (read-only).
            // Server Actions y middleware sí pueden escribir; ahí no hay error.
          }
        },
      },
    },
  )
}

/**
 * Cliente Supabase con `service role key` — BYPASA RLS.
 *
 * SOLO usar para operaciones administrativas que necesitan saltar RLS:
 *   - Webhooks (Stripe, MyRavex) que no tienen sesión de usuario.
 *   - Tareas internas como agregaciones cross-tenant (métricas globales).
 *   - Migración inicial de datos.
 *
 * NUNCA exponer al cliente. Si necesitas que el usuario lea/escriba,
 * usa `createClient()` que respeta RLS.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.')
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          /* no-op: el admin client no usa cookies */
        },
      },
    },
  )
}
