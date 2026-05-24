# MyJova — Multi-tenant Payroll SaaS

> Nómina e impuestos, simplificados para contratistas y restaurantes pequeños en US y Canadá.

MyJova es una plataforma SaaS multi-tenant que automatiza el cálculo de nómina y la generación de reportes fiscales anuales. Soporta 4 esquemas de pago (por hora, salario, por día y comisión) y se integrará con MyRavex (Field Service Management) en el plan Premium Bundle.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** — Postgres + Auth + Row Level Security + Storage + Realtime
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** + **next-themes** (dark mode)
- **next-intl** — 4 locales (EN, ES, FR, FR-CA)
- **React Hook Form** + **Zod** — formularios validados
- **Zustand** — estado global mínimo
- **Stripe** — suscripciones y pagos
- **@react-pdf/renderer** — W-2, 1099-NEC, T4, T4A, ROE PDFs
- **Mapbox GL JS** — mapas 3D, clustering, heatmap, time-travel
- **framer-motion** + **GSAP** + **lottie-react** — landing animations
- **embla-carousel-react** + **recharts** — UI
- **Resend** (email) + **Twilio** (SMS) + **web-push** (VAPID) — notificaciones multi-canal
- **@playwright/test** — visual QA suite

## Tiers

| Plan | Precio | Empleados | Features clave |
|---|---|---|---|
| **Esencial** | $49/mes | 10 | Pago hourly + salary, cálculo básico de impuestos |
| **Avanzado** | $99/mes | 50 | + daily, commission, W-2/1099 anuales, multi-usuario |
| **Premium Bundle** | $199/mes | Ilimitado | + API REST, MyRavex, soporte prioritario |

## Instalación local

### 1. Prerequisitos

- Node.js 18.17+
- npm (incluido con Node)
- Cuenta en [Supabase](https://supabase.com/)
- Supabase CLI: `brew install supabase/tap/supabase`

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear proyecto Supabase

1. Ve a https://supabase.com/dashboard → **New project**.
2. Guarda la **Database password**.
3. Espera ~2 min mientras se aprovisiona.
4. En **Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Configurar variables de entorno

```bash
cp .env.example .env.local
# Edita .env.local y pega los valores reales
```

### 5. Linkear Supabase CLI

```bash
supabase link --project-ref <tu-ref>     # ej. abcd1234efgh5678
```

### 6. Aplicar migraciones (Fase 1)

```bash
npm run db:push       # aplica supabase/migrations/*
npm run db:types      # regenera src/types/database.ts
```

### 7. Levantar el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Debería redirigir a `/en` y mostrar la landing de MyJova.

## Estructura del repo

```
.
├── src/
│   ├── app/
│   │   ├── [locale]/         # Rutas internacionalizadas (en, es)
│   │   │   ├── (auth)/       # login, signup, forgot-password
│   │   │   └── (app)/        # dashboard, employees, payroll, reports
│   │   └── api/              # API routes (webhooks, v1 pública)
│   ├── components/
│   │   ├── layout/           # sidebar, header, switchers
│   │   └── ui/               # shadcn primitives
│   ├── lib/
│   │   ├── supabase/         # client.ts, server.ts, middleware.ts
│   │   ├── payroll/          # engine.ts (cálculo)
│   │   ├── tax-forms/        # W-2, 1099-NEC PDF templates
│   │   ├── stripe/           # checkout, webhook handler
│   │   └── utils.ts
│   ├── i18n/                 # config, messages/{en,es}.json
│   ├── styles/globals.css
│   ├── types/database.ts     # generado por `npm run db:types`
│   └── middleware.ts
├── supabase/
│   ├── migrations/           # SQL versionado
│   └── config.toml
├── _legacy_backup/           # código viejo, ignorado por git
└── package.json
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en :3000 |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de TypeScript sin emitir |
| `npm run db:push` | Aplica migraciones SQL a Supabase |
| `npm run db:pull` | Trae el schema remoto a `supabase/migrations` |
| `npm run db:reset` | **Destructivo**: borra y reaplica todo el schema |
| `npm run db:types` | Regenera `src/types/database.ts` |
| `npm run format` | Prettier sobre `src/**/*` |

## Multi-tenancy

Cada cliente de MyJova es una **organization**. Los usuarios pertenecen a una (o más) organizations mediante la tabla `memberships` con un rol (`owner`, `admin`, `manager`, `viewer`).

**Toda** tabla con datos de tenant lleva una columna `organization_id uuid not null` y una política RLS:

```sql
create policy "tenant_isolation" on <table> for all
  using (organization_id in (
    select organization_id from memberships where user_id = auth.uid()
  ));
```

NUNCA uses el **service role key** desde el browser. Solo en:
- Server Components / Server Actions (`createClient()` en `lib/supabase/server.ts`)
- Webhooks externos sin sesión (`createAdminClient()`)

## Features (state as of overnight sprint)

### Landing (15 sections)
Hero with Mapbox 3D + animated counters, Features grid, Industry use-cases (6 industries), HowItWorks with GSAP scroll-trigger, Mobile Showcase (device frame), ROI Calculator (interactive sliders), Comparison vs Gusto/Square/Homebase, Testimonials carousel (Embla), Integrations marquee, Pricing toggle (monthly/annual), Video demo placeholder, FAQ accordion, FinalCTA mesh gradient, Footer with newsletter.

### Tenant dashboards
- KPIs, live map with Mapbox (3D, satellite, heatmap, time-travel slider)
- Employees CRUD, payroll runs, time-tracking approvals
- 4 pay schemes (hourly OT, salary, daily, commission tiers)
- Worksites with drag-drop geofence editor
- Notification bell with Supabase Realtime
- Notification preferences (type × channel matrix)
- Settings: API keys, integrations

### Worker portal (mobile-first PWA)
Clock in/out with photo + GPS, history, pay stubs, profile, push notifications.

### Platform super-admin (`/admin`)
Tenant detail tabs (Overview / Users / Subscription / Audit / Flags / Support), audit logs with filters, support tickets, broadcasts composer (target by all/plan/tenant/role, channels in-app/email/sms/push), analytics (DAU/MAU areas via recharts), feature overrides per tenant, **secure impersonation** (audit-logged, sticky red banner).

### Notifications (4 channels with graceful fallback)
- In-app (Supabase Realtime) — bell with unread count
- Email via Resend, templates EN/ES/FR/FR-CA
- SMS via Twilio
- Web Push via VAPID (sw.js + register helper)
- `dispatch()` router consults preferences + dedupe_key

### Tax reports (US + Canada)
- US Federal: W-2, W-3, 1099-NEC, 1096, 941, 940 with `@react-pdf/renderer`
- US States: California (Method B), New York (IT-2104), Texas/Florida (no income tax), Pennsylvania (flat 3.07%), Illinois (4.95% with allowances)
- Canada Federal: T4127 brackets + CPP/QPP + EI/QPIP
- Provinces: Ontario, Quebec, BC, Alberta
- Forms: T4, T4A, ROE (bilingual EN/FR)
- E-filing stubs: Track1099 API, IRS FIRE Pub 1220 builder, CRA T4 XML
- Tax calendar 2026 (12+ deadlines US + Canada)

### Internationalization
4 locales — `en`, `es`, `fr`, `fr-CA` — with dropdown switcher (flags). All UI, emails and PDFs translated.

### Theme
Dark mode toggle in app/admin/employee/preview (next-themes, system default). Landing renders in user's theme via tokens. Semantic Badge variants — no hardcoded colors.

### Visual QA
Playwright suite generates per-locale × per-theme screenshots to `tests/screenshots/`. Subagent-friendly: a reviewer can diff visual regressions per route.

## Roadmap

- Mapbox token + Mapbox 3D maps in Hero
- Real client testimonials (replacing representative placeholders)
- E-filing automation (currently we build the files; the user uploads to IRS FIRE / CRA MyBusiness)
- Per-municipality local taxes (Pennsylvania EIT, NYC, etc.)
- Bank ACH direct deposit integration (Phase 2)

## Licencia

Privado — © MyJova. Todos los derechos reservados.
