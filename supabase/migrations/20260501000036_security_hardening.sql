-- =============================================================================
-- Hardening post-advisors (hallazgos del linter de Supabase al aplicar las 69
-- migraciones contra el proyecto real, 2026-07-12).
-- =============================================================================

-- ERROR real: `plans` quedó SIN RLS desde ...004 — con la anon key se podía
-- hasta escribir el catálogo. Es un catálogo público de solo lectura (como
-- jurisdictions): RLS on + select para todos, escrituras solo service role.
alter table public.plans enable row level security;

create policy "plans_select_all" on public.plans
  for select using (true);

-- Funciones de TRIGGER: jamás deben ser ejecutables vía /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_impersonation_to_audit() from public, anon, authenticated;

-- Helpers SECURITY DEFINER: los usa RLS/la app con sesión — anon no pinta nada.
revoke execute on function public.user_org_ids() from public, anon;
revoke execute on function public.user_role_in(uuid) from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.check_plan_feature(uuid, text) from public, anon;
revoke execute on function public.notifications_unread_count(uuid) from public, anon;

-- search_path fijo (lint 0011) — evita hijacking por search_path del rol.
alter function public.set_updated_at() set search_path = public;
alter function public.custom_access_token_hook(jsonb) set search_path = public;

-- Nota: employee_pins e invoice_counters aparecen como "RLS sin policies" —
-- es INTENCIONAL (tablas solo-service-role: PINs bcrypt y contador de facturas).
