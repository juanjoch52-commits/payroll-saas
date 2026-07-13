-- =============================================================================
-- MyJova — Migración 09: Audit Logs
-- =============================================================================
-- Registro append-only de cambios sensibles. Solo se INSERT — nunca UPDATE
-- ni DELETE. Se llena desde Server Actions, no automáticamente con triggers,
-- para evitar overhead en tablas de alto volumen.
-- =============================================================================

create table public.audit_logs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  actor_user_id       uuid references auth.users(id),
  action              text not null,  -- ej. 'employee.create', 'payroll_run.approve'
  target_table        text not null,
  target_id           uuid,
  old_data            jsonb,
  new_data            jsonb,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz not null default now()
);

create index idx_audit_logs_org on public.audit_logs(organization_id, created_at desc);
create index idx_audit_logs_target on public.audit_logs(target_table, target_id);
create index idx_audit_logs_actor on public.audit_logs(actor_user_id);
