-- =============================================================================
-- MyJova — Migración 16: Platform admins (super-admin MyJova)
-- =============================================================================
-- Rol GLOBAL separado del modelo per-tenant (memberships). Un platform_admin
-- ve TODOS los tenants. Solo se asignan vía SQL directo (sin UI) por seguridad.
-- =============================================================================

create table public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  notes       text
);

-- Helper RLS: ¿el caller actual es platform_admin?
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

-- RLS: solo platform_admins se ven entre sí
alter table public.platform_admins enable row level security;

create policy "platform_admins_select_self_or_admin" on public.platform_admins for select
  using (user_id = auth.uid() or public.is_platform_admin());

-- Inserts y deletes solo via service role (sin policy permisiva)
