import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para Client Components (browser).
 *
 * Usa la `anon key` — todas las queries pasan por RLS.
 * NUNCA importar service role aquí (rompe la seguridad multi-tenant).
 *
 * NOTA: Una vez que ejecutes `npm run db:types`, descomenta el import de
 * `Database` y añade `<Database>` al `createBrowserClient` para type-safety.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
