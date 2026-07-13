# MyJova — HANDOFF (reinicio de sesión)

Rama: **`feature/myjova-full-rebuild`**. Commit por fase, gates verdes antes de cada commit.
Termina los mensajes de commit con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## 🔴 REANUDAR AQUÍ (próxima sesión — 2026-07-12 sesión 3, puesta en línea)

**Dónde estamos**: código 100% completo + **Supabase de producción YA en línea y verificado
con un smoke test real** (signup→trigger→login→hook→RLS multi-tenant, todo OK; 3 bugs de
primera ejecución hallados y arreglados). Falta: subir el código a GitHub, Stripe, deploy en
Vercel, dominio. Gates: typecheck/lint/build ✅ · vitest **141/141**.

### Infra Supabase (HECHA)
- **Proyecto**: `MyJova` · ref **`gfexbpsxmhisozzgwcsw`** · región **us-east-1** · plan Micro.
  Org Supabase **MyJova Pro** (id `jwvlfaebpjdpjmwwfvva`, $25/mes). URL
  `https://gfexbpsxmhisozzgwcsw.supabase.co`.
  ⚠️ El **conector MCP de Supabase está scoped SOLO a la org MyJova** (no ve la org vieja).
- **72 migraciones aplicadas** vía MCP `execute_sql` (no hay CLI local ni DB password): en
  lotes ≤20KB con inserts manuales de historial a `supabase_migrations.schema_migrations`
  usando las versiones locales → un `db push` futuro las verá aplicadas. **Próximo ts libre:
  `20260501000038`** (última local: `...037_fix_auth_hook_grants`).
- **Auth Hook** `custom_access_token_hook` HABILITADO por Juan (Dashboard→Auth→Hooks) ✅.
- **`.env.local` LLENO** con lo de Supabase: URL, anon key, **service_role**, y
  **ENCRYPTION_KEY** (generada — Juan debe guardarla en su password manager; sin ella los
  datos cifrados quedan ilegibles). **FALTA en .env.local**: Stripe (6), Resend, Mapbox.
- Smoke test user borrado → **DB de producción limpia (0 users, 0 orgs)**: el 1er signup de
  Juan será el primero real. Tras ese signup: insertarlo en `platform_admins` (SQL) para /admin.

### 3 bugs de primera ejecución arreglados (commits en la rama)
1. `check_plan_feature` renombraba params en `create or replace` (42P13) — `e2d1470`.
2. Tabla `plans` sin RLS desde enero (editable con anon key) — `031a704` (migración ...036).
3. **El Auth Hook rompía TODO el login** ("Error running hook URI"): regresión de mi ...036
   que revocó `EXECUTE` de `user_org_ids` de PUBLIC y `supabase_auth_admin` (que corre el
   hook) lo perdió — `17a839f` (migración ...037). **Lección: NUNCA revocar de PUBLIC los
   helpers SECURITY DEFINER que invocan las RLS policies.** + 2 bugs de landing (`ce6afcd`).

### ⏭️ PRÓXIMOS PASOS (en orden; Juan debe autorizar el push y el deploy)
1. **Push a GitHub** — **88 commits SIN PUSH** en `feature/myjova-full-rebuild`. Repo
   `github.com/juanjoch52-commits/payroll-saas` (remote `origin`, HTTPS). Actualiza el PR #1.
   *No hacer push sin OK explícito de Juan (actualiza repo público).*
2. **Stripe** — crear 3 productos con **2 precios recurrentes mensuales c/u** (base flat +
   seat licensed, NO metered): $29+5 / $59+7 / $99+10 → 6 env `STRIPE_PRICE_<PLAN>_{BASE,SEAT}`
   + `STRIPE_SECRET_KEY` + publishable + webhook secret (endpoint prod
   `<APP_URL>/api/webhooks/stripe`, añadir evento `invoice.payment_failed`). Ver MANUAL_STEPS §3.
3. **Vercel** — la app está DUPLICADA en 2 proyectos del team **"Juan's projects"**
   (`team_lYNy3fAjAtNaqT98TczsNam1`): **`myjova`** (`prj_28lvNlFUYdCpyEjUHmqiUPNlwgLH`,
   linkeado a `.vercel/project.json`, tiene dominio `myjova.vercel.app`) y **`payroll-saas`**
   (`prj_8eQQrCzuA2dvHBARIEHh7SMQk9PZ`, conectado al repo GitHub). Ambos con deploy de MAYO,
   ninguno con el código actual. **Plan: consolidar en `myjova`, conectarle GitHub, cargar
   env vars, deploy prod, y borrar `payroll-saas`.** Vercel **Pro $20/mes** para uso comercial.
4. **Dominio** — `myjova.com` LIBRE ~$11.25/año en Vercel (aún sin comprar).
5. **Resend** — verificar dominio `myjova.com` tras comprarlo → `RESEND_API_KEY` + `RESEND_FROM_EMAIL`.

### Gotchas de herramientas (para no perder tiempo)
- El **panel de navegador NO logra teclear** en el form de login (inputs controlados de React
  se resetean con las recompilaciones de Next dev). No es bug de la app — un teclado humano
  funciona. Para verificar UI autenticada: pedir a Juan que se loguee, o testear por API/REST
  con el JWT (como se hizo el smoke test: signup admin API + query REST con Bearer = prueba RLS).
- Migraciones nuevas: aplicarlas por MCP `execute_sql` (ALTER TYPE ADD VALUE en statement propio)
  + insert manual a `supabase_migrations.schema_migrations`.

---

## Estado global (2026-07-12, sesión 2) — CÓDIGO COMPLETO, INFRA PENDIENTE

**Todo el trabajo de producto está hecho y commiteado.** Gates: typecheck ✅ · lint ✅ ·
build ✅ · **vitest 141/141 ✅**. Git limpio. **72 migraciones** aplicadas al Supabase real (ref gfexbpsxmhisozzgwcsw, org MyJova Pro).
**Próximo timestamp libre: `20260501000038`.**

Sprints completados (todos en esta rama, ver git log):
| Sprint | Qué | Commits clave |
|---|---|---|
| G0–G12 | Base + kiosko, piece-rate, QuickBooks, paystub PDF, Expo | ver `OVERNIGHT_BUILD.md` |
| H1–H15 | Scheduling, PTO, docs/e-sign, tips+Square, NACHA, WH-347, OT/breaks, reportes, comms, departments, benefits, local tax, SSO+webhooks salientes, e-file (EFW2/941), export GDPR | `585574a..0cacbc2` |
| Diseño | PageHeader/StatCard/EmptyState/Callout, sidebar agrupado+activo, **nav móvil**, dashboard rediseñado, **onboarding interactivo** (checklist real + tour spotlight), **admin panel completo** (tickets con hilo, feature flags CRUD, broadcasts con entrega) | `2531c10..51898c1` |
| AUD 1–5 | Auditoría de lanzamiento: tax_filings duplicado (db:push), **state tax cableado**, **SSN cifrado**, locale fr, webhooks fail-closed + bucket RLS | `2886ebf..8127ceb` |
| FIN 1–4 | **Trial enforcement** (gate suave + banner), páginas legales, kiosk PIN atómico + open-redirect fix, payroll_ready/paid notifs, N+1 batch, **edición de empleado** | `0a79539..ee4f0d9` |
| BL A–E | deletePayrollRun/excluir empleado, offboarding, welcome email, **Team members** (roles/quitar/reenviar-revocar invites), **PTO accrual engine**, revokeTimeOff, **timezone por org** (DST-safe), paginación, rate limit kiosko | `41bd90b`, `dc31089` |
| SUB/PS/BR | **Subcontratistas jerárquicos** (abajo, sección clave) | `bee555f`, `854b8f7`, `5c4c0d3` |
| TS | **Timesheets semanales del empleado**: /history → vista semanal (tz org, lunes-domingo), **cerrar semana y pedir pago** (timesheet_submissions, re-envío si devuelta), bandeja del manager en /time-tracking (aprobar semana = aprueba entries en bloque → payroll), resumen hoy/semana en /clock, notifs+webhooks nuevos | `e6f6849` |
| BRK | **Almuerzo no pagado automático** (política org: N min al alcanzar umbral; medio día no descuenta; "no tomé almuerzo" waiver flageado) en los 3 clock-outs (web/kiosko/API) + **fichadas olvidadas**: addManualEntry (turno a mano, 30d, sin solapes, no en semana cerrada) y fixForgottenClockOut (turno abierto >10h), pending con manual_kind+motivo + badges al manager. **FIX RLS** time_entries_update (empleado no podía cerrar turno) + tor_update PTO (sesión paralela) | `c355fcd`, `41ed218` |
| CTR | **3 perfiles**: empresa / contratista / trabajador. Rol `contractor` + portal /(contractor) (/my-crew tarifas+horas+margen de SU subtree, /my-settlements con PDF), invitación desde el manager de subs, vinculación por trigger+action. **PRIVACIDAD: bill rate movido a `employee_billing`** (RLS manager+; el trabajador ya no puede leer lo facturado). Multitenant: `organizations.uses_subcontractors` esconde el módulo (auto-on, toggle en Settings) | `7a31056` |
| GLP | Landing (9 features: +cierre de semana, +contratistas, +almuerzo; hero nuevo) · Signup con "¿pagas a subcontratistas?" → org nace con el flag (...028) · Dashboard: banner de semanas cerradas por aprobar + quick action guía · **Guía de inducción**: /guide (3 perfiles con anclas), /help (trabajador), /my-guide (contratista — OJO: /help colisionaba entre route groups) | `da3d88f` |
| SFT | **Contador de jornada** (standard_shift_minutes, Settings→General): progreso + "te faltan X" + hora estimada de salida (jornada+almuerzo) + "completa ✓" en web y app Expo (via /time/week). **Geo de salidas**: mapa del manager pinta INs (azul/ámbar) y OUTs (gris) + pin→Google Maps por cada fichada | `0e6536c` |
| REC | **Auditoría de liquidaciones** (4 tests: no-dup anidados, aislamiento raíces, sumas cuadradas, HST 1 redondeo) + **FIX drift**: `settlement_records` CONGELADOS al aprobar (unique run×sub) — reportes leen de ahí, cambios de asignación/tarifa ya no reescriben historia. **Reporte anual** (base caja por pay date, lib annual.ts+6 tests): año+CSV en portal contratista y /reports/settlements empresa (misma fuente). **Emails al contratista**: settlement_ready (aprobada, con totales) y settlement_paid (pagada) | `8f7d623` |
| PRC/TRL | Pricing de landing vende el producto real (Premium — Contratistas con el módulo completo; $49/99/199 sin cambios) · **Trial de 30 días** (...032 handle_new_user + landing/signup/welcome/terms ×4 locales) | `c4bad2f`, `2b9675e` |
| LOC | **fr genérico OCULTO** (mercado US+CA): switcher muestra en/es/fr-CA; /fr/* → 308 /fr-CA/*; geo Europa y Accept-Language fr* caen en fr-CA. fr.json se conserva interno (fuente de fr-CA — el script de 4 archivos NO cambia) | `8de17fe` |
| BILL2 | **Modelo de cobro base + por-trabajador-activo** (decisión de Juan 2026-07-12): plans.base/per_worker (placeholders 29+5/59+7/99+10), SIN caps, seats licensed sincronizados a Stripe (alta/baja + reconcilio en /billing), checkout 2 items, **cambio de plan in-place** (antes duplicaba suscripción), guard owner/admin, notifs plan_changed/payment_failed, landing/ROI/billing/admin-MRR con la fórmula real, 6 price IDs `_BASE/_SEAT` | `01dc61c` |
| INV | **Facturas formales de liquidación** (sub raíz → empresa): invoice_number secuencial org×año (advisory lock, congelado en settlement_records, lazy para records viejos), identidad fiscal del sub (razón social/GST-HST nº/dirección en el form), PDF INVOICE solo lado facturado+HST (nunca pay/margen), botones en run aprobado y /my-settlements | `6064537` |
| MAIL/NTF | 5 plantillas email nuevas ×4 locales (semana cerrada→manager, decisión de semana, PTO pedido/decidido, trial por terminar) + fallback genérico brandeado; eventos nuevos: time_entry_approved/rejected al empleado, clock_anomaly (geofence) a managers, trial_ending sin cron (dashboard, dedupe pre-dispatch ≤7d/≤2d); deep links (cta) en campana para paystubs/liquidaciones/semanas/PTO | `f16fdc2` |
| MOB | **App móvil al día** (ya NO está stale): core único `lib/timesheets/core.ts` (web actions + API v1 comparten lógica), endpoints `GET /api/v1/time/week` + `submit-week` + `manual-entry` + `fix-clock-out` + skipBreak en clock-out; Expo: tab Hours semanal con cierre de semana, form olvidé-fichar, switch no-tomé-almuerzo, fix de salida >10h, resumen hoy/semana. `apps/mobile` con `npm run typecheck` limpio (deps instaladas, lockfile commiteado) | `7e15d91` |

## Subcontratistas (feature clave — caso real de Juan)

Contratista → sub mayor → subs menores. Todos fichan horas con el tenant; el pago se
consolida en **UN cheque al sub RAÍZ** con desglose. Caso de Juan (Canadá): a él le pagan
$37/h por sus horas y $33/h por las de su amigo; él le paga $30/h al amigo → **$3/h de
margen**, + **HST 13%** sobre lo facturado.
- Tablas: `subcontractors` (parent_id jerárquico, `sales_tax_pct` 0-30, `user_id` = login
  del portal) + `employees.subcontractor_id` + **`employee_billing.bill_rate_cents`**
  (facturado ≠ pagado; tabla PRIVADA manager+ desde CTR — el trabajador no puede leerla).
- `src/lib/subcontractors/tree.ts` (puro, testeado con el caso 37/33/30+13%): rootOf
  anti-ciclo; buildSettlements → líneas pay/bill/margen, subtotal+HST=cheque, payTotal, margen.
- Motor: `suppressWithholding` → sub-workers cobran BRUTO (sin retenciones ni FICA/FUTA
  del tenant); excluidos de W-2/1099 (el 1099 iría a la EMPRESA sub — futuro).
- UI: página `/subcontractors` (árbol, HST%, alta con padre, invitar portal), bill rate
  en forms de empleado, **settlement card** en el run + **PDF de liquidación** por sub
  raíz, paystub del sub-worker marcado "Paid via subcontractor".
- **Contabilidad**: `settlement_records` congelados al aprobar (REC) → reporte ANUAL
  (base caja por pay_date) en /my-settlements (contratista: año+CSV) y
  /reports/settlements (empresa) — misma fuente, imposible que difieran. Emails
  settlement_ready/paid al contratista vinculado.

## 🚦 LO ÚNICO QUE FALTA PARA LANZAR (no es código)

1. **Infra (Juan, ~1 día)**: env en `.env.local` Y Vercel — Supabase ×3, Stripe ×6
   (`STRIPE_SECRET_KEY`, publishable, webhook secret, 3 price IDs), `ENCRYPTION_KEY`
   (`openssl rand -base64 32`), `RESEND_API_KEY` (+`RESEND_FROM_EMAIL` verificado).
   Opcionales: Mapbox, Twilio, VAPID, QBO, Square, `MYRAVEX_WEBHOOK_SECRET`.
2. **Supabase**: migraciones YA aplicables vía MCP/db:push (69 — Realtime en
   `notifications` ahora es la migración ...035, ya no es paso manual) · habilitar
   Custom Access Token Hook · `insert into platform_admins (user_id) values ('<tu-uid>')`.
   SSO opcional: habilitar Google/Microsoft en Auth → Providers (redirect `<APP_URL>/auth/callback`).
3. **Stripe**: crear 3 productos con **DOS precios mensuales cada uno** (flat base +
   per-unit seat licensed, NO metered) → 6 env vars `STRIPE_PRICE_<PLAN>_{BASE,SEAT}`;
   webhook prod → `<APP_URL>/api/webhooks/stripe` (añadir evento `invoice.payment_failed`).
   Montos CONFIRMADOS: $29+5 / $59+7 / $99+10. Si algún día cambian, sincronizar
   los 3 sitios: Stripe + tabla `plans` (UPDATE) + `src/lib/pricing/plans.ts`.
4. ~~Smoke test E2E~~ **HECHO (2026-07-12, sesión 3)** contra el Supabase real
   (ref gfexbpsxmhisozzgwcsw). Verificado por API/DB con auth real: signup→trigger
   (org+owner+trial 30d+flags), login, hook active_org_id, RLS multi-tenant aislada,
   precios correctos. **3 bugs de primera ejecución hallados y arreglados** (migración
   check_plan_feature rename, plans sin RLS, hook grants — commits e2d1470/031a704/17a839f)
   + 2 de contenido en landing (ce6afcd). La UI no se clickeó (el panel de navegador no
   teclea en el form controlado — limitación de herramienta, no bug); Juan puede loguearse
   a mano. Test user borrado, DB de producción limpia.
5. **Antes de cobrar**: revisión de abogado de `/privacy` + `/terms` (son plantillas) y
   validar una nómina real con contador.

### Decisiones de negocio PENDIENTES de Juan
- ~~Modelo de cobro~~ **RESUELTO (2026-07-12)**: base + por-trabajador-activo,
  implementado en BILL2. **Montos CONFIRMADOS por Juan** ("ok dejalo asi"):
  Esencial $29+$5 · Avanzado $59+$7 · Premium $99+$10 — crear los precios en
  Stripe con estos valores exactos.
- ~~Plan del trial~~ **RESUELTO (2026-07-12)**: el trial de 30 días se queda en
  **Esencial** (handle_new_user sin cambios). Nota consciente: en trial no se
  pueden probar features de Avanzado (daily/commission/piecerate, tax forms) pero
  el módulo de contratistas SÍ está disponible porque no tiene candado (ver
  decisión pendiente de abajo).
- **Candado por plan del módulo contratistas**: la landing lo vende como Premium, pero
  `uses_subcontractors` es activable en CUALQUIER plan (sin enforcement). Si Premium es
  exclusivo → plan feature flag + checkFeature en página/actions/toggle.
- **EUR en pricing**: la landing aún convierte a EUR y muestra "detected: France/España"
  a visitantes europeos — engañoso si no se atiende Europa (fr ya está oculto). Quitar
  EUR = cambio corto pendiente de OK.

### Límites de compliance conocidos (decisiones, no bugs)
- **Canadá**: el flujo de SUBS (bruto+HST) funciona 100%. Pero empleados regulares
  canadienses recibirían retenciones estilo US — **no hay CPP/EI/impuesto CA**. Lanzar
  US-first + Canadá solo subs, o construir retención canadiense.
- Estado US: solo CA/NY/PA/IL (TX/FL $0 correcto); locales NYC/PHL/YON.
- E-file: archivos correctos (EFW2/941/Pub1220/CRA), transmisión manual (stub gateado).

## Backlog menor (post-lanzamiento, priorizar por demanda real)
1099-NEC a empresa sub (el nº fiscal YA se captura en `subcontractors.tax_number` — INV;
falta el flujo 1099) · ACH del cheque consolidado (cuenta bancaria del sub) · HST
entrante amigo→Juan (facturas de compra / ITC — la factura SALIENTE ya existe, INV) ·
CPP/EI Canadá · UI de adjustPtoBalance · paginación con controles UI (hoy trunca) ·
rate limit en DB si multi-región · edición de pay scheme versionada (effective_from/to) ·
app móvil: tiempo/horas AL DÍA (MOB); faltan schedule/PTO/documentos/banco — por demanda.

## Cómo trabajar (convenciones — IMPORTANTE)
- **Gates por fase**: `npm run typecheck` · `npm test` · `npm run lint` · `npm run build`.
  zsh: `${PIPESTATUS}` sale vacío — fíate de la AUSENCIA de errores.
- **i18n**: parchea los **4** archivos `src/i18n/messages/{en,es,fr,fr-CA}.json` JUNTOS con
  script `node -e` (fs) y verifica parity (script de keys). fr-CA = fr. NUNCA a mano.
- **Migraciones**: timestamped; `ALTER TYPE ... ADD VALUE` en archivo propio. `database.ts`
  es Record<string,any> permisivo → columnas nuevas no rompen TS.
- **Rutas**: manager `/feature`, empleado `/my-feature` (los route groups colapsan URL).
- **z.coerce.number()** opcional-vacío: usar `z.preprocess(v => v===''?undefined:v, ...)`.
- **Storage**: buckets privados solo vía Server Actions con `createAdminClient` + signed URLs.
- **Crypto**: `src/lib/crypto/secretbox.ts` (AES-256-GCM, `ENCRYPTION_KEY`) — SSN, banco,
  tokens. Sin key → degradación elegante.
- **PDFs**: patrón `renderToBuffer` + action devuelve `{base64, filename}` + botón cliente
  (paystub/W2/settlement).
- **Admin/Members/Subs managers**: strings EN inline (consistente con área admin);
  páginas de tenant usan t().

## Motor de nómina (estado actual — clave)
`src/lib/payroll/engine.ts` puro. `calculatePayroll(input)`:
- gross = scheme (hourly/salary/daily/commission/piecerate + suelo FLSA) + tips + extras.
- OT: `hoursSplit`+`overtimeRules` precomputados en `calculateRunItems` (splitByWeeks);
  **day keys y límites de período en el TIMEZONE de la org** (`lib/time/tz.ts`, DST-safe).
- Impuestos: federal 2026 + FICA con YTD caps + **stateCode** (cableado, solo `US-*`;
  'CA' Canadá excluido a propósito) + local (`localityCode`) . preTax baja gravable.
- **`suppressWithholding: true`** (trabajador con `subcontractor_id`) → TODO en 0, neto=bruto.
- Al aprobar run: fan-out `payroll_ready` + **PTO accrual** + webhook + **CONGELA
  `settlement_records`** (unique run×sub — el reporte anual lee SOLO de ahí) +
  **numera la FACTURA** (invoice_number org×año vía `next_invoice_number`, lazy en el
  primer download para records viejos) + email `settlement_ready` al contratista
  vinculado; al marcar pagado: webhook `payroll.paid` + email `settlement_paid`.
  Trial gate en las 4 acciones core de escritura.
Tests: `src/lib/**/*.test.ts` = **141** (engine 15, timesheets 13, tree 11, breaks 10,
nacha 10, local 10, tz 9, efw2 8, form941 8, accrual 7, sign 7, tips 6, annual 6,
qbo 6, overtime 5, **pricing 5, invoice 5**).

## Memoria
`~/.claude/projects/-Users-juanjo-Documents-Payroll-SaaS/memory/myjova-g-sprint.md` tiene
el log completo por sprint con commits. Actualízala al cerrar cada fase nueva.
