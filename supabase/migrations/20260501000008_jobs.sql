-- =============================================================================
-- MyJova — H6: Jobs / proyectos (job costing + nómina certificada WH-347)
-- =============================================================================
-- Un "job" es un proyecto/obra. Puede ligarse a un worksite: las horas fichadas
-- en ese worksite se atribuyen al job. También puede atribuirse explícitamente
-- vía time_entries.job_id. Sirve para WH-347 (Davis-Bacon) y costo por obra.
-- =============================================================================

create table public.jobs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  worksite_id      uuid references public.worksites(id) on delete set null,
  contract_number  text,
  prevailing_wage  boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_jobs_org on public.jobs(organization_id) where is_active;
create trigger trg_jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.time_entries
  add column job_id uuid references public.jobs(id) on delete set null;
create index idx_time_entries_job on public.time_entries(job_id) where job_id is not null;

alter table public.jobs enable row level security;
create policy "jobs_select" on public.jobs for select
  using (organization_id in (select public.user_org_ids()));
create policy "jobs_write" on public.jobs for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager'));
