-- =============================================================================
-- MyJova — Migración: Impersonation sessions
-- =============================================================================
-- Cuando un platform admin "se mete" como un tenant para investigar un bug
-- o ayudar al usuario, registramos la sesión completa para auditoría legal.
--
-- La impersonation NUNCA modifica auth.users.email — se basa en una cookie
-- efímera firmada que el middleware verifica antes de cargar la sesión real.
-- =============================================================================

create table public.impersonation_sessions (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid not null references auth.users(id),
  target_user_id  uuid not null references auth.users(id),
  target_org_id   uuid not null references public.organizations(id),
  reason          text not null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  ip_address      inet,
  user_agent      text,
  constraint chk_no_self_impersonation check (admin_user_id <> target_user_id)
);

create index idx_impersonation_admin on public.impersonation_sessions(admin_user_id, started_at desc);
create index idx_impersonation_active on public.impersonation_sessions(admin_user_id, ended_at) where ended_at is null;

alter table public.impersonation_sessions enable row level security;

create policy "impersonation_admin_all" on public.impersonation_sessions
  for all using (public.is_platform_admin());

-- Trigger que también escribe en audit_logs
create or replace function public.log_impersonation_to_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_user_id, action, target_table, target_id, new_data)
    values (
      new.target_org_id,
      new.admin_user_id,
      'impersonation.start',
      'impersonation_sessions',
      new.id,
      jsonb_build_object(
        'target_user_id', new.target_user_id,
        'reason', new.reason
      )
    );
  elsif tg_op = 'UPDATE' and new.ended_at is not null and old.ended_at is null then
    insert into public.audit_logs (organization_id, actor_user_id, action, target_table, target_id, new_data)
    values (
      new.target_org_id,
      new.admin_user_id,
      'impersonation.end',
      'impersonation_sessions',
      new.id,
      jsonb_build_object(
        'duration_seconds', extract(epoch from new.ended_at - new.started_at)
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_impersonation_audit
  after insert or update on public.impersonation_sessions
  for each row execute function public.log_impersonation_to_audit();
