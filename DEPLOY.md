# MyJova — Deploy Guide

Esta guía cubre el deploy a producción de MyJova en Vercel + Supabase + Stripe.

## 1. Crear proyecto Supabase de producción

1. https://supabase.com/dashboard → **New project** (separado del de dev).
2. Región: `us-east-1` (alineada con Vercel `iad1`).
3. Guarda la **Database password**.
4. Espera ~2 minutos.

## 2. Linkear CLI y aplicar migraciones

```bash
cd "/Users/juanjo/Documents/Payroll SaaS"
supabase link --project-ref <prod-ref>
supabase db push
```

Esto aplica las 12 migraciones que están en `supabase/migrations/`.

Verifica en Supabase Studio (Table Editor) que aparezcan:
- `organizations`, `memberships`, `invitations`
- `jurisdictions` (con seed de US + CA), `tax_brackets` (con seed federal 2026)
- `plans` (3 filas), `subscriptions`
- `employees`, `pay_schemes`
- `payroll_runs`, `payroll_items`, `payroll_components`
- `tax_forms`, `tax_filings`
- `integrations`, `api_keys`, `webhook_events`
- `audit_logs`

## 3. Configurar Auth Hook

Dashboard → Authentication → Hooks → **Custom Access Token**:
- Function: `public.custom_access_token_hook`
- Habilitar.

## 4. Configurar Auth → URL Configuration

- Site URL: `https://myjova.com` (o el dominio que uses)
- Redirect URLs:
  - `https://myjova.com/auth/callback`
  - `https://myjova.com/en/dashboard`
  - `https://myjova.com/es/dashboard`

## 5. Generar tipos TypeScript

```bash
npm run db:types
```

Reemplaza el placeholder en `src/types/database.ts` con los tipos reales del schema.

## 6. Stripe — modo Live

1. Crea 3 productos en Stripe Dashboard (modo Live):
   - **Esencial**: $49/month
   - **Avanzado**: $99/month
   - **Premium Bundle**: $199/month
2. Copia los **Price IDs** (empiezan con `price_`).
3. Configura el endpoint webhook:
   - URL: `https://myjova.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copia el **webhook signing secret** (`whsec_…`).

## 7. Vercel

```bash
npm install -g vercel
vercel link
```

Luego añade las variables de entorno (mismas claves que `.env.local`):

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production            # https://myjova.com
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production              # sk_live_...
vercel env add STRIPE_WEBHOOK_SECRET production          # whsec_...
vercel env add STRIPE_PRICE_ESSENTIAL production
vercel env add STRIPE_PRICE_ADVANCED production
vercel env add STRIPE_PRICE_PREMIUM production
```

Luego deploya:

```bash
vercel --prod
```

## 8. Dominio custom

En Vercel Dashboard → Project Settings → Domains → añadir `myjova.com`. Actualiza los DNS según las instrucciones que Vercel te dé.

## 9. Smoke test en producción

Sigue el checklist de `e2e-checklist.md` (cuando lo crees) o como mínimo:

1. Signup en `https://myjova.com/en/signup`.
2. Confirma email.
3. Login → dashboard carga sin errores.
4. Crea un empleado.
5. Crea un payroll run con período corto, calcula y aprueba.
6. (Plan Avanzado o mayor): Genera W-2.
7. (Plan Premium): Crea API key, prueba `curl -H "Authorization: Bearer <key>" https://myjova.com/api/v1/employees`.

## 10. Monitoreo

- **Vercel**: Function Logs → vigila errores en runtime de las Server Actions.
- **Supabase**: Logs → Postgres Logs y Auth Logs.
- **Stripe**: Webhook Attempts → asegúrate que todos los eventos llegan con 2xx.
