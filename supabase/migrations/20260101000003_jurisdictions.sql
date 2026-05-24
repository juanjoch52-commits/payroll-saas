-- =============================================================================
-- MyJova — Migración 03: Jurisdictions + Tax Brackets
-- =============================================================================
-- Modelo extensible para impuestos por jurisdicción. El MVP solo usa
-- las tablas para US Federal. Canadá y los estados/provincias se
-- llenan en fases posteriores sin cambios de schema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: jurisdictions
-- -----------------------------------------------------------------------------
-- Códigos jerárquicos: 'US' (federal), 'US-CA' (California), 'CA' (Canadá
-- federal), 'CA-ON' (Ontario), etc. Datos compartidos entre todas las orgs,
-- por eso NO tiene organization_id ni RLS restrictivo (es read-only para usuarios).
create table public.jurisdictions (
  code            text primary key,
  name            text not null,
  country         text not null check (country in ('US', 'CA')),
  parent_code     text references public.jurisdictions(code),
  is_federal      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabla: tax_brackets
-- -----------------------------------------------------------------------------
-- Brackets para cálculo de income tax. La estructura es:
--   - Para cada combinación (jurisdiction, tax_year, filing_status),
--     hay N filas que representan los tramos.
--   - El motor de nómina busca el tramo correcto según el income anualizado.
--
-- En MyJova guardamos rates como numeric(7,5) (ej. 0.22000 = 22%).
create table public.tax_brackets (
  id                  uuid primary key default gen_random_uuid(),
  jurisdiction_code   text not null references public.jurisdictions(code) on delete cascade,
  tax_year            int not null,
  filing_status       text not null check (filing_status in ('single', 'married_jointly', 'married_separately', 'head_of_household')),
  threshold_low_cents bigint not null,
  threshold_high_cents bigint,  -- null = sin tope (último bracket)
  rate                numeric(7,5) not null check (rate >= 0 and rate <= 1),
  base_tax_cents      bigint not null default 0,
  created_at          timestamptz not null default now()
);

create index idx_tax_brackets_lookup
  on public.tax_brackets (jurisdiction_code, tax_year, filing_status, threshold_low_cents);

-- -----------------------------------------------------------------------------
-- Seed inicial: jurisdicciones US + Canadá
-- -----------------------------------------------------------------------------
insert into public.jurisdictions (code, name, country, parent_code, is_federal) values
  ('US',    'United States Federal', 'US', null, true),
  ('CA',    'Canada Federal',        'CA', null, true);

-- Estados US (stubs — los brackets reales se siembran en otra migración cuando se implemente state withholding).
insert into public.jurisdictions (code, name, country, parent_code, is_federal) values
  ('US-AL', 'Alabama',      'US', 'US', false),
  ('US-AK', 'Alaska',       'US', 'US', false),
  ('US-AZ', 'Arizona',      'US', 'US', false),
  ('US-AR', 'Arkansas',     'US', 'US', false),
  ('US-CA', 'California',   'US', 'US', false),
  ('US-CO', 'Colorado',     'US', 'US', false),
  ('US-CT', 'Connecticut',  'US', 'US', false),
  ('US-DE', 'Delaware',     'US', 'US', false),
  ('US-FL', 'Florida',      'US', 'US', false),
  ('US-GA', 'Georgia',      'US', 'US', false),
  ('US-HI', 'Hawaii',       'US', 'US', false),
  ('US-ID', 'Idaho',        'US', 'US', false),
  ('US-IL', 'Illinois',     'US', 'US', false),
  ('US-IN', 'Indiana',      'US', 'US', false),
  ('US-IA', 'Iowa',         'US', 'US', false),
  ('US-KS', 'Kansas',       'US', 'US', false),
  ('US-KY', 'Kentucky',     'US', 'US', false),
  ('US-LA', 'Louisiana',    'US', 'US', false),
  ('US-ME', 'Maine',        'US', 'US', false),
  ('US-MD', 'Maryland',     'US', 'US', false),
  ('US-MA', 'Massachusetts','US', 'US', false),
  ('US-MI', 'Michigan',     'US', 'US', false),
  ('US-MN', 'Minnesota',    'US', 'US', false),
  ('US-MS', 'Mississippi',  'US', 'US', false),
  ('US-MO', 'Missouri',     'US', 'US', false),
  ('US-MT', 'Montana',      'US', 'US', false),
  ('US-NE', 'Nebraska',     'US', 'US', false),
  ('US-NV', 'Nevada',       'US', 'US', false),
  ('US-NH', 'New Hampshire','US', 'US', false),
  ('US-NJ', 'New Jersey',   'US', 'US', false),
  ('US-NM', 'New Mexico',   'US', 'US', false),
  ('US-NY', 'New York',     'US', 'US', false),
  ('US-NC', 'North Carolina','US','US', false),
  ('US-ND', 'North Dakota', 'US', 'US', false),
  ('US-OH', 'Ohio',         'US', 'US', false),
  ('US-OK', 'Oklahoma',     'US', 'US', false),
  ('US-OR', 'Oregon',       'US', 'US', false),
  ('US-PA', 'Pennsylvania', 'US', 'US', false),
  ('US-RI', 'Rhode Island', 'US', 'US', false),
  ('US-SC', 'South Carolina','US','US', false),
  ('US-SD', 'South Dakota', 'US', 'US', false),
  ('US-TN', 'Tennessee',    'US', 'US', false),
  ('US-TX', 'Texas',        'US', 'US', false),
  ('US-UT', 'Utah',         'US', 'US', false),
  ('US-VT', 'Vermont',      'US', 'US', false),
  ('US-VA', 'Virginia',     'US', 'US', false),
  ('US-WA', 'Washington',   'US', 'US', false),
  ('US-WV', 'West Virginia','US', 'US', false),
  ('US-WI', 'Wisconsin',    'US', 'US', false),
  ('US-WY', 'Wyoming',      'US', 'US', false),
  ('US-DC', 'District of Columbia', 'US', 'US', false);

-- Provincias / territorios de Canadá (stubs para Phase 2).
insert into public.jurisdictions (code, name, country, parent_code, is_federal) values
  ('CA-AB', 'Alberta',                   'CA', 'CA', false),
  ('CA-BC', 'British Columbia',          'CA', 'CA', false),
  ('CA-MB', 'Manitoba',                  'CA', 'CA', false),
  ('CA-NB', 'New Brunswick',             'CA', 'CA', false),
  ('CA-NL', 'Newfoundland and Labrador', 'CA', 'CA', false),
  ('CA-NS', 'Nova Scotia',               'CA', 'CA', false),
  ('CA-NT', 'Northwest Territories',     'CA', 'CA', false),
  ('CA-NU', 'Nunavut',                   'CA', 'CA', false),
  ('CA-ON', 'Ontario',                   'CA', 'CA', false),
  ('CA-PE', 'Prince Edward Island',      'CA', 'CA', false),
  ('CA-QC', 'Quebec',                    'CA', 'CA', false),
  ('CA-SK', 'Saskatchewan',              'CA', 'CA', false),
  ('CA-YT', 'Yukon',                     'CA', 'CA', false);

-- -----------------------------------------------------------------------------
-- Seed: US Federal income tax brackets 2026 (PLACEHOLDER — IRS Pub 15-T)
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Estos brackets son APROXIMADOS basados en proyecciones 2026.
-- Al inicio de Phase 5 (motor de nómina) debes actualizar contra la
-- publicación oficial de IRS Pub 15-T para 2026 (sale en Dec 2025).
-- Las cifras están en cents (multiplica los dólares por 100).
--
-- Solo se siembra 'single' y 'married_jointly' como ejemplo.
-- Los demás filing statuses se añaden cuando se necesiten.
insert into public.tax_brackets
  (jurisdiction_code, tax_year, filing_status, threshold_low_cents, threshold_high_cents, rate, base_tax_cents)
values
  -- Single 2026 (proyección — REEMPLAZAR con IRS oficial)
  ('US', 2026, 'single',  0,         1170000,   0.10000, 0),
  ('US', 2026, 'single',  1170000,   4750000,   0.12000, 117000),
  ('US', 2026, 'single',  4750000,   10325000,  0.22000, 546600),
  ('US', 2026, 'single',  10325000,  19712500,  0.24000, 1773100),
  ('US', 2026, 'single',  19712500,  25062500,  0.32000, 4026100),
  ('US', 2026, 'single',  25062500,  62650000,  0.35000, 5738100),
  ('US', 2026, 'single',  62650000,  null,      0.37000, 18893700),
  -- Married Jointly 2026 (proyección)
  ('US', 2026, 'married_jointly', 0,          2340000,   0.10000, 0),
  ('US', 2026, 'married_jointly', 2340000,    9500000,   0.12000, 234000),
  ('US', 2026, 'married_jointly', 9500000,    20650000,  0.22000, 1093200),
  ('US', 2026, 'married_jointly', 20650000,   39425000,  0.24000, 3546200),
  ('US', 2026, 'married_jointly', 39425000,   50125000,  0.32000, 8052200),
  ('US', 2026, 'married_jointly', 50125000,   75200000,  0.35000, 11476200),
  ('US', 2026, 'married_jointly', 75200000,   null,      0.37000, 20252450);

-- -----------------------------------------------------------------------------
-- RLS: jurisdictions y tax_brackets son catálogos públicos
-- -----------------------------------------------------------------------------
alter table public.jurisdictions enable row level security;
alter table public.tax_brackets enable row level security;

create policy "jurisdictions_select_all" on public.jurisdictions
  for select using (true);

create policy "tax_brackets_select_all" on public.tax_brackets
  for select using (true);
-- NO se crean policies de insert/update/delete: solo el service role puede modificar.
