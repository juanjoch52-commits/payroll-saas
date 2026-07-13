-- =============================================================================
-- FIX: custom_access_token_hook falla en el login ("Error running hook URI").
-- =============================================================================
-- Bug de primera ejecución detectado con el Supabase real (smoke test 2026-07-12),
-- regresión de la migración ...036_security_hardening:
--
--   El hook corre como `supabase_auth_admin` y lee `public.memberships`. Con RLS
--   activo y sin bypass, se evalúa la policy `memberships_select`, que invoca
--   `public.user_org_ids()`. La ...036 revocó ese EXECUTE de PUBLIC y
--   supabase_auth_admin lo perdió (authenticated lo conserva por grant propio),
--   así que evaluar la policy lanza `permission denied for function user_org_ids`
--   → el hook aborta → el login entero falla.
--
-- Fix (patrón documentado por Supabase para hooks que leen tablas del esquema):
--   1) devolver EXECUTE de los helpers de RLS SOLO a supabase_auth_admin (rol
--      interno, no user-facing — no reabre la superficie que cerró ...036 para
--      anon), para que evaluar las policies de memberships no lance error; y
--   2) darle a supabase_auth_admin una policy de lectura propia sobre memberships
--      (permisiva, using true) para que el hook realmente encuentre la membresía
--      y pueda setear el claim active_org_id en el JWT.
-- =============================================================================

grant execute on function public.user_org_ids() to supabase_auth_admin;
grant execute on function public.user_role_in(uuid) to supabase_auth_admin;

create policy "memberships_auth_admin_read" on public.memberships
  as permissive for select to supabase_auth_admin using (true);
