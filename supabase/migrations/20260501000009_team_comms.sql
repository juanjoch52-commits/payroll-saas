-- =============================================================================
-- MyJova — H9: Comunicación de equipo (anuncios + tablón de mensajes)
-- =============================================================================
-- Anuncios (manager → equipo, con acuse de lectura) + un tablón de mensajes
-- compartido del org. Realtime puede activarse en team_messages en el dashboard.
-- =============================================================================

create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  title            text not null,
  body             text not null,
  posted_by        uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_announcements_org on public.announcements(organization_id, created_at desc);

create table public.announcement_reads (
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table public.team_messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid references auth.users(id),
  author_name      text,
  body             text not null,
  created_at       timestamptz not null default now()
);
create index idx_team_messages_org on public.team_messages(organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.announcements enable row level security;
create policy "announcements_select" on public.announcements for select
  using (organization_id in (select public.user_org_ids()));
create policy "announcements_write" on public.announcements for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));

alter table public.announcement_reads enable row level security;
create policy "announcement_reads_own" on public.announcement_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.team_messages enable row level security;
create policy "team_messages_select" on public.team_messages for select
  using (organization_id in (select public.user_org_ids()));
create policy "team_messages_insert" on public.team_messages for insert
  with check (
    organization_id in (select public.user_org_ids())
    and user_id = auth.uid()
  );
create policy "team_messages_delete" on public.team_messages for delete
  using (
    organization_id in (select public.user_org_ids())
    and (user_id = auth.uid() or public.user_role_in(organization_id) in ('owner', 'admin'))
  );
