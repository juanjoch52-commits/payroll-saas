# MyJova — Multi-tenant Payroll SaaS

> Nómina e impuestos, simplificados para contratistas y restaurantes pequeños en US y Canadá.

MyJova es una plataforma SaaS multi-tenant que automatiza el cálculo de nómina y la generación de reportes fiscales anuales. Soporta 4 esquemas de pago (por hora, salario, por día y comisión) y se integrará con MyRavex (Field Service Management) en el plan Premium Bundle.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** — Postgres + Auth + Row Level Security + Storage
- **Tailwind CSS** + **shadcn/ui** + **Radix UI**
- **next-intl** — i18n bilingüe ES/EN desde día 1
- **React Hook Form** + **Zod** — formularios validados
- **Zustand** — estado global mínimo
- **Stripe** — suscripciones y pagos
- **@react-pdf/renderer** — generación de PDFs (W-2, 1099-NEC)

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

## Roadmap

- **MVP (Fase 1-6)**: Auth, empleados CRUD, motor de nómina, W-2/1099 US, billing Stripe.
- **Fase 7**: Subscripciones Stripe y enforcement de tiers.
- **Fase 8**: API pública REST + webhook stub MyRavex.
- **Fase 9**: Deploy a producción en Vercel.
- **Phase 2 (post-MVP)**: Canadá (T4, T4A, ROE, CPP/EI), portal de empleado, integración bancaria ACH.

## Licencia

Privado — © MyJova. Todos los derechos reservados.
