-- =============================================================================
-- MyJova — H1: Programación de turnos (scheduling)
-- =============================================================================
-- Núcleo competitivo vs Homebase/7shifts/When I Work/Deputy. Un turno es un
-- bloque planeado (empleado + horario + sitio). Los empleados ven los turnos
-- PUBLICADOS; los borradores solo el manager. Soporta turnos abiertos (sin
-- empleado) que cualquiera puede reclamar, e intercambios entre empleados.
-- =============================================================================

create type public.shift_status as enum ('draft', 'published', 'open', 'cancelled');
create type public.swap_kind as enum ('giveaway', 'claim');
create type public.swap_status as enum ('requested', 'accepted', 'approved', 'rejected', 'cancelled');

-- -----------------------------------------------------------------------------
-- shifts
-- -----------------------------------------------------------------------------
create table public.shifts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- employee_id null = turno ABIERTO (cualquiera puede reclamarlo)
  employee_id     uuid references public.employees(id) on delete set null,
  worksite_id     uuid references public.worksites(id) on delete set null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  role_label      text,                 -- "Cocina", "Mesero", "Caja"
  break_minutes   int not null default 0 check (break_minutes >= 0),
  notes           text,
  status          public.shift_status not null default 'draft',
  published_at    timestamptz,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index idx_shifts_org_start on public.shifts(organization_id, starts_at);
create index idx_shifts_emp_start on public.shifts(employee_id, starts_at);
create index idx_shifts_open on public.shifts(organization_id, starts_at)
  where status = 'open';

create trigger trg_shifts_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- shift_swaps — intercambios / reclamos de turnos
-- -----------------------------------------------------------------------------
create table public.shift_swaps (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  shift_id           uuid not null references public.shifts(id) on delete cascade,
  requested_by       uuid not null references public.employees(id) on delete cascade,
  target_employee_id uuid references public.employees(id) on delete set null,
  kind               public.swap_kind not null,
  status             public.swap_status not null default 'requested',
  decided_by         uuid references auth.users(id),
  decided_at         timestamptz,
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_shift_swaps_org on public.shift_swaps(organization_id, status);
create index idx_shift_swaps_shift on public.shift_swaps(shift_id);

create trigger trg_shift_swaps_updated_at
  before update on public.shift_swaps
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- availability — disponibilidad semanal del empleado
-- -----------------------------------------------------------------------------
create table public.availability (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  weekday         int not null check (weekday between 0 and 6),  -- 0 = domingo
  start_minute    int check (start_minute between 0 and 1440),
  end_minute      int check (end_minute between 0 and 1440),
  is_available    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_availability_emp on public.availability(employee_id, weekday);

create trigger trg_availability_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.shifts enable row level security;

-- SELECT: manager+ ve todo; empleado ve sus turnos PUBLICADOS + los abiertos.
create policy "shifts_select" on public.shifts for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or status = 'open'
      or (
        status = 'published'
        and employee_id in (select id from public.employees where user_id = auth.uid())
      )
    )
  );

create policy "shifts_insert" on public.shifts for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "shifts_update" on public.shifts for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "shifts_delete" on public.shifts for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

-- shift_swaps: empleado ve/crea los suyos; manager+ ve/gestiona todos.
alter table public.shift_swaps enable row level security;

create policy "shift_swaps_select" on public.shift_swaps for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or requested_by in (select id from public.employees where user_id = auth.uid())
      or target_employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "shift_swaps_insert" on public.shift_swaps for insert
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or requested_by in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "shift_swaps_update" on public.shift_swaps for update
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or requested_by in (select id from public.employees where user_id = auth.uid())
    )
  );

-- availability: el empleado gestiona la suya; manager+ la lee.
alter table public.availability enable row level security;

create policy "availability_select" on public.availability for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "availability_write" on public.availability for all
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  )
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
