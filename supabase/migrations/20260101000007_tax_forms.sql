-- =============================================================================
-- MyJova — Migración 07: Tax Forms + Filings
-- =============================================================================
-- Almacena los formularios fiscales generados (W-2, 1099-NEC, T4, T4A) y los
-- envíos oficiales (filings) a IRS / CRA.
-- =============================================================================

create type public.tax_form_type as enum (
  'W-2',
  '1099-NEC',
  '941',
  'T4',
  'T4A',
  'ROE'
);

-- -----------------------------------------------------------------------------
-- Tabla: tax_forms
-- -----------------------------------------------------------------------------
-- Cada PDF generado se registra aquí. El bucket de Storage tiene la copia
-- inmutable. `data` jsonb guarda los valores calculados para regenerar PDF
-- sin recalcular si es necesario.
create table public.tax_forms (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  employee_id         uuid references public.employees(id),
  form_type           public.tax_form_type not null,
  tax_year            int not null,
  tax_period          text,  -- ej. 'Q1', 'Q2' para 941; null para W-2/1099 (annual)
  data                jsonb not null default '{}'::jsonb,
  pdf_storage_path    text,  -- ej. "tax-forms/<orgId>/2026/W-2-<employeeId>.pdf"
  generated_at        timestamptz not null default now(),
  generated_by        uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

create index idx_tax_forms_org on public.tax_forms(organization_id, tax_year);
create index idx_tax_forms_employee on public.tax_forms(employee_id);

-- NOTA: la tabla `tax_filings` se define en 20260301000006_tax_filings.sql
-- (esquema de tracking de e-filing). Antes se creaba también aquí, lo que
-- duplicaba la tabla y hacía fallar `db:push`. Se dejó una sola definición.
