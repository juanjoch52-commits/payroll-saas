-- =============================================================================
-- MyJova — Bill rate por trabajador + impuesto de venta (HST/GST) por sub
-- =============================================================================
-- Caso real: el contratista paga $33/h por un trabajador del sub, pero el sub
-- le paga $30/h al trabajador → $3/h de margen para el sub. Y sobre lo
-- facturado se agrega HST (p.ej. 13% Ontario).
--   - employees.bill_rate_cents: lo que se FACTURA al contratista por hora de
--     este trabajador (nullable → se factura igual que su pay rate, margen 0).
--   - subcontractors.sales_tax_pct: % de HST/GST del sub raíz que se suma al
--     subtotal del cheque en la liquidación.
-- =============================================================================

alter table public.employees
  add column if not exists bill_rate_cents bigint;

alter table public.subcontractors
  add column if not exists sales_tax_pct numeric(5,2) not null default 0
  check (sales_tax_pct >= 0 and sales_tax_pct <= 30);
