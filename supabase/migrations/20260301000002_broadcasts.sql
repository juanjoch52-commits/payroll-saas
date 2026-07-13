-- =============================================================================
-- MyJova — Migración: Broadcasts
-- =============================================================================
-- Mensajes globales que el platform admin envía a tenants (por plan,
-- por tenant específico, o a todos). El dispatch a canales (in-app, email)
-- lo hace el sistema de notificaciones en F6.
-- =============================================================================

create type public.broadcast_target_type as enum ('all', 'plan', 'tenant', 'role');

create table public.broadcasts (
  id              uuid primary key default gen_random_uuid(),
  sent_by         uuid references auth.users(id),
  target_type     public.broadcast_target_type not null,
  target_value    text,  -- plan code, organization_id, or role enum cast as text
  title           text not null,
  body            text not null,
  channels        jsonb not null default '["inapp"]'::jsonb,  -- array of: inapp, email, sms, push
  cta_label       text,
  cta_url         text,
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_broadcasts_sent_at on public.broadcasts(sent_at desc nulls first);

-- Tracking de delivery por user (opcional, sin RLS estricto — solo platform admin lee)
create table public.broadcast_deliveries (
  id              uuid primary key default gen_random_uuid(),
  broadcast_id    uuid not null references public.broadcasts(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  channel         text not null check (channel in ('inapp', 'email', 'sms', 'push')),
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'opened', 'clicked')),
  delivered_at    timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  error           text,
  created_at      timestamptz not null default now()
);

create index idx_broadcast_deliveries_broadcast on public.broadcast_deliveries(broadcast_id);
create index idx_broadcast_deliveries_user on public.broadcast_deliveries(user_id, created_at desc);

alter table public.broadcasts enable row level security;
alter table public.broadcast_deliveries enable row level security;

create policy "broadcasts_admin_all" on public.broadcasts
  for all using (public.is_platform_admin());

create policy "broadcast_deliveries_admin_all" on public.broadcast_deliveries
  for all using (public.is_platform_admin());
