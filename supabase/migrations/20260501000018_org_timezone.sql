-- =============================================================================
-- MyJova — Timezone por organización
-- =============================================================================
-- Las fronteras de día se calculaban en UTC (T00:00:00Z), desalineando "hoy",
-- las fechas de propinas y los splits de overtime para orgs de EE. UU./Canadá.
-- El timezone IANA de la org gobierna esos cortes (helpers en src/lib/time/tz.ts).
-- =============================================================================

alter table public.organizations
  add column if not exists timezone text not null default 'America/New_York';
