-- =============================================================================
-- INV — Facturas formales de liquidación (sub raíz → empresa, con HST)
-- =============================================================================
-- La liquidación congelada (settlement_records) gana un NÚMERO DE FACTURA
-- inmutable asignado al aprobar la nómina, y el subcontratista gana identidad
-- fiscal (razón social, número GST/HST, dirección) para que el PDF sea una
-- factura real que el contador acepte.
--
-- Numeración: secuencial por organización y año (INV-2026-0001). El contador
-- vive en invoice_counters y se reserva vía next_invoice_number() con
-- advisory lock transaccional (mismo patrón que kiosk_reserve_pin_attempt).
-- =============================================================================

-- Identidad fiscal del subcontratista (solo la usan los subs RAÍZ en facturas).
alter table public.subcontractors
  add column if not exists business_legal_name text,
  add column if not exists tax_number text,
  add column if not exists address text;

comment on column public.subcontractors.tax_number is
  'Número fiscal del sub: GST/HST registration (Canadá) o EIN (US). Se imprime en la factura.';

-- Número de factura congelado en el settlement record.
alter table public.settlement_records
  add column if not exists invoice_number text;

create unique index if not exists uq_settlement_invoice_number
  on public.settlement_records (organization_id, invoice_number)
  where invoice_number is not null;

-- Contadores por org × año.
create table if not exists public.invoice_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year            int not null,
  next_number     int not null default 1,
  primary key (organization_id, year)
);

alter table public.invoice_counters enable row level security;
-- Sin políticas: SOLO service role (la numeración pasa por la función de abajo).

create or replace function public.next_invoice_number(
  p_organization_id uuid,
  p_year            int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  -- Serializa la numeración de ESTA org+año (dos aprobaciones simultáneas
  -- no pueden repetir número).
  perform pg_advisory_xact_lock(hashtext(p_organization_id::text || ':inv:' || p_year::text));

  insert into public.invoice_counters (organization_id, year, next_number)
  values (p_organization_id, p_year, 1)
  on conflict (organization_id, year) do nothing;

  update public.invoice_counters
  set next_number = next_number + 1
  where organization_id = p_organization_id and year = p_year
  returning next_number - 1 into v_n;

  return v_n;
end;
$$;

-- Solo el server (service role) numera facturas.
revoke execute on function public.next_invoice_number(uuid, int) from public, anon, authenticated;
grant execute on function public.next_invoice_number(uuid, int) to service_role;
