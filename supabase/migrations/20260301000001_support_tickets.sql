-- =============================================================================
-- MyJova — Migración: Support tickets
-- =============================================================================
-- Sistema de soporte para tenants: los owners/admins abren tickets, los
-- platform admins responden. Estado de ticket: open → in_progress → resolved.
-- =============================================================================

create type public.ticket_status as enum ('open', 'in_progress', 'waiting_user', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  opened_by         uuid not null references auth.users(id) on delete set null,
  subject           text not null,
  body              text not null,
  status            public.ticket_status not null default 'open',
  priority          public.ticket_priority not null default 'normal',
  assignee_user_id  uuid references auth.users(id),
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  closed_at         timestamptz
);

create index idx_support_tickets_org on public.support_tickets(organization_id, created_at desc);
create index idx_support_tickets_status on public.support_tickets(status, priority desc);
create index idx_support_tickets_assignee on public.support_tickets(assignee_user_id);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- Mensajes del ticket (hilo)
create table public.support_ticket_messages (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.support_tickets(id) on delete cascade,
  author_id     uuid not null references auth.users(id) on delete set null,
  author_role   text not null check (author_role in ('tenant', 'platform_admin')),
  body          text not null,
  attachments   jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

create index idx_support_messages_ticket on public.support_ticket_messages(ticket_id, created_at);

-- RLS
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Tenants ven sus tickets (org members), platform admins ven todos
create policy "support_tickets_org_read" on public.support_tickets
  for select using (
    organization_id in (select public.user_org_ids())
    or public.is_platform_admin()
  );

create policy "support_tickets_org_insert" on public.support_tickets
  for insert with check (
    organization_id in (select public.user_org_ids())
    and opened_by = auth.uid()
  );

create policy "support_tickets_admin_update" on public.support_tickets
  for update using (public.is_platform_admin());

create policy "support_messages_read" on public.support_ticket_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
      and (t.organization_id in (select public.user_org_ids()) or public.is_platform_admin())
    )
  );

create policy "support_messages_insert" on public.support_ticket_messages
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
      and (t.organization_id in (select public.user_org_ids()) or public.is_platform_admin())
    )
  );
