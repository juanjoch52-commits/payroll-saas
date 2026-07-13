-- =============================================================================
-- MyJova — H5: Cuentas bancarias (depósito directo / ACH)
-- =============================================================================
-- Datos bancarios del empleado (cifrados con secretbox) + datos del originador
-- (empresa) para generar el archivo NACHA ACH. El descifrado SOLO ocurre
-- server-side al generar el archivo. NO movemos dinero: el archivo NACHA se
-- sube al banco (o se conecta un proveedor regulado más adelante).
-- =============================================================================

create type public.bank_account_type as enum ('checking', 'savings');

create table public.employee_bank_accounts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  employee_id       uuid not null references public.employees(id) on delete cascade,
  routing_enc       text not null,   -- cifrado (AES-256-GCM)
  account_enc       text not null,   -- cifrado
  account_type      public.bank_account_type not null default 'checking',
  account_last_four text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (employee_id)
);
create index idx_emp_bank_org on public.employee_bank_accounts(organization_id);
create trigger trg_emp_bank_updated_at before update on public.employee_bank_accounts
  for each row execute function public.set_updated_at();

create table public.company_bank_accounts (
  organization_id   uuid primary key references public.organizations(id) on delete cascade,
  routing_enc       text,
  account_enc       text,
  company_name      text,
  company_id        text,   -- 10 chars (NACHA Company Identification)
  account_last_four text,
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- employee_bank_accounts: el empleado gestiona la SUYA; manager+ la lee (para
-- ver cobertura). Los blobs están cifrados; el descifrado es server-side.
alter table public.employee_bank_accounts enable row level security;
create policy "emp_bank_select" on public.employee_bank_accounts for select
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin', 'manager')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );
create policy "emp_bank_write" on public.employee_bank_accounts for all
  using (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  )
  with check (
    organization_id in (select public.user_org_ids())
    and (
      public.user_role_in(organization_id) in ('owner', 'admin')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

-- company_bank_accounts: solo owner/admin.
alter table public.company_bank_accounts enable row level security;
create policy "company_bank_all" on public.company_bank_accounts for all
  using (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin'))
  with check (organization_id in (select public.user_org_ids())
    and public.user_role_in(organization_id) in ('owner', 'admin'));
