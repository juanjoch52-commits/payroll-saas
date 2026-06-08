-- =============================================================================
-- MyJova — H14: Impuestos locales (municipales)
-- =============================================================================
-- El motor calcula la retención municipal (NYC / Philadelphia / Yonkers) a
-- partir de `employees.locality_code`. El resultado se persiste por item en
-- `payroll_items.local_tax_cents`. Ver src/lib/payroll/us/local.ts.
-- =============================================================================

alter table public.payroll_items add column if not exists local_tax_cents bigint;
alter table public.employees add column if not exists locality_code text;
