-- =============================================================================
-- MyJova — Migración G5: Kiosko de fichaje en tablet compartida
-- =============================================================================
-- Permite que UNA tablet fija (ej. en un restaurante) deje fichar a varios
-- empleados con PIN + selfie, SIN que cada uno inicie sesión con su cuenta.
--
-- Modelo de seguridad:
--   - La tablet guarda un device_token largo (bcrypt en reposo, lookup por
--     prefijo, igual que api_keys). Sin sesión Supabase.
--   - Todas las escrituras del kiosko van por Server Actions con service role
--     (createAdminClient), que validan el token primero. RLS queda CERRADO.
--   - Los PIN viven en una tabla APARTE (employee_pins) SIN policies de RLS,
--     para que ningún empleado pueda leer los hashes (un PIN de 4 dígitos en
--     bcrypt se crackea offline en milisegundos). Solo el service role accede.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- kiosk_devices — una fila por tablet emparejada
-- -----------------------------------------------------------------------------
create table public.kiosk_devices (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  worksite_id              uuid not null references public.worksites(id) on delete cascade,
  name                     text not null,                 -- "iPad del mostrador"
  device_token_hash        text,                          -- bcrypt(token); null hasta emparejar
  device_token_prefix      text,                          -- primeros 12 chars para lookup rápido
  pairing_code             text,                          -- código corto temporal (8 chars)
  pairing_code_expires_at  timestamptz,
  is_active                boolean not null default false,
  last_seen_at             timestamptz,
  created_by               uuid references auth.users(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_kiosk_devices_org on public.kiosk_devices(organization_id);
create index idx_kiosk_devices_prefix on public.kiosk_devices(device_token_prefix)
  where device_token_prefix is not null;
create index idx_kiosk_devices_pairing on public.kiosk_devices(pairing_code)
  where pairing_code is not null;

create trigger trg_kiosk_devices_updated_at
  before update on public.kiosk_devices
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- employee_pins — PIN de fichaje por empleado (tabla aislada, sin RLS pública)
-- -----------------------------------------------------------------------------
create table public.employee_pins (
  employee_id       uuid primary key references public.employees(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  pin_hash          text not null,                 -- bcrypt('<employee_id>:<pin>')
  pin_set_at        timestamptz not null default now(),
  pin_locked_until  timestamptz,                   -- lockout tras N intentos fallidos
  updated_at        timestamptz not null default now()
);

create index idx_employee_pins_org on public.employee_pins(organization_id);

-- -----------------------------------------------------------------------------
-- kiosk_pin_attempts — ledger anti-fuerza-bruta
-- -----------------------------------------------------------------------------
create table public.kiosk_pin_attempts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  kiosk_device_id   uuid references public.kiosk_devices(id) on delete cascade,
  employee_id       uuid references public.employees(id) on delete cascade,
  succeeded         boolean not null,
  created_at        timestamptz not null default now()
);

create index idx_kiosk_pin_attempts_device on public.kiosk_pin_attempts(kiosk_device_id, created_at desc);
create index idx_kiosk_pin_attempts_emp on public.kiosk_pin_attempts(employee_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Vínculo de las entries originadas en kiosko (auditoría)
-- -----------------------------------------------------------------------------
alter table public.time_entries
  add column kiosk_device_id uuid references public.kiosk_devices(id) on delete set null;
alter table public.production_entries
  add column kiosk_device_id uuid references public.kiosk_devices(id) on delete set null;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- kiosk_devices: owner/admin/manager pueden ver; owner/admin gestionan.
-- El runtime del kiosko NO usa RLS (service role), así que esto es solo para
-- el panel de administración.
alter table public.kiosk_devices enable row level security;

create policy "kiosk_devices_select" on public.kiosk_devices for select
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "kiosk_devices_insert" on public.kiosk_devices for insert
  with check (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

create policy "kiosk_devices_update" on public.kiosk_devices for update
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

create policy "kiosk_devices_delete" on public.kiosk_devices for delete
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- kiosk_pin_attempts: solo lectura (auditoría) para owner/admin. Escritura solo
-- service role (sin policy de insert).
alter table public.kiosk_pin_attempts enable row level security;

create policy "kiosk_pin_attempts_select" on public.kiosk_pin_attempts for select
  using (
    organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin')
  );

-- employee_pins: RLS habilitado SIN políticas → nadie (excepto service role)
-- puede leer ni escribir los hashes. El set/reset y la validación van por
-- Server Actions con createAdminClient.
alter table public.employee_pins enable row level security;
