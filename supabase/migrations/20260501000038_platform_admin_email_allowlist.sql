-- =============================================================================
-- MyJova — Platform admin por allowlist de email (bootstrap del fundador)
-- =============================================================================
-- Permite marcar cuentas como platform_admin ANTES de que existan (DB limpia):
-- is_platform_admin() ahora también devuelve true si el email del JWT del caller
-- está en public.platform_admin_emails. Así /admin/* y las RLS que dependen de
-- is_platform_admin() se desbloquean en el PRIMER login del fundador, sin insertar
-- manualmente en platform_admins ni tocar el trigger de auth.users (el que rompió
-- el login en ...037 — lección: no tocar la superficie de signup si se puede evitar).
--
-- NO revoca ningún grant: `create or replace function` conserva los permisos
-- existentes (PUBLIC/authenticated pueden seguir ejecutándola, como necesitan las
-- RLS policies). La tabla no lleva policy permisiva: solo la leen service_role y
-- las funciones SECURITY DEFINER (is_platform_admin bypassa RLS por ser definer).
-- =============================================================================

create table if not exists public.platform_admin_emails (
  email      text primary key,
  added_at   timestamptz not null default now(),
  notes      text
);

alter table public.platform_admin_emails enable row level security;
-- (sin policies a propósito: acceso solo vía service_role / SECURITY DEFINER)

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  ) or lower(coalesce(auth.jwt() ->> 'email', '')) in (
    select lower(email) from public.platform_admin_emails
  );
$$;

-- Fundador: platform_admin desde el primer login (email verificado en el JWT).
insert into public.platform_admin_emails (email, notes)
values ('juanjoch52@gmail.com', 'Founder — auto-admin por email')
on conflict (email) do nothing;
