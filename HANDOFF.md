# MyJova — HANDOFF (reinicio de sesión)

Rama: **`feature/myjova-full-rebuild`**. Commit por fase, gates verdes antes de cada commit.
Termina los mensajes de commit con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Estado global (2026-07-12) — CÓDIGO COMPLETO, INFRA PENDIENTE

**Todo el trabajo de producto está hecho y commiteado.** Gates: typecheck ✅ · lint ✅ ·
build ✅ · **vitest 131/131 ✅**. Git limpio. **66 migraciones** (`db:push` aplica hasta
`20260501000032`). **Próximo timestamp libre: `20260501000033`.**

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
2. **Supabase**: `npm run db:push` (66 migraciones) · habilitar Custom Access Token Hook ·
   Realtime en `notifications` · `insert into platform_admins (user_id) values ('<tu-uid>')`.
   SSO opcional: habilitar Google/Microsoft en Auth → Providers (redirect `<APP_URL>/auth/callback`).
3. **Stripe**: crear 3 productos/precios, webhook prod → `<APP_URL>/api/webhooks/stripe`.
4. **Smoke test E2E real (siguiente sesión, en cuanto 1-3 estén)**: signup → onboarding →
   empleado → fichar → aprobar → nómina → paystub/settlement contra el Supabase vivo.
   La app NUNCA ha corrido con DB real — espera 3-5 bugs de primera ejecución; arreglarlos.
5. **Antes de cobrar**: revisión de abogado de `/privacy` + `/terms` (son plantillas) y
   validar una nómina real con contador.

### Decisiones de negocio PENDIENTES de Juan (antes de configurar Stripe)
- **Modelo de cobro**: hoy flat con topes ($49/99/199, caps 10/50/∞). Recomendado evaluar
  base + por-trabajador-activo (requiere metered billing en Stripe). La landing ya vende
  los 3 planes con features reales; solo faltan los price IDs.
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
1099-NEC a empresa sub (capturar EIN) · ACH del cheque consolidado (cuenta bancaria del
sub) · HST entrante amigo→Juan (facturas de compra / ITC) · CPP/EI Canadá · UI de
adjustPtoBalance · paginación con controles UI (hoy trunca) · rate limit en DB si
multi-región · edición de pay scheme versionada (effective_from/to) · app móvil:
tiempo/horas AL DÍA (MOB); faltan schedule/PTO/documentos/banco — por demanda.

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
  `settlement_records`** (unique run×sub — el reporte anual lee SOLO de ahí) + email
  `settlement_ready` al contratista vinculado; al marcar pagado: webhook `payroll.paid`
  + email `settlement_paid`. Trial gate en las 4 acciones core de escritura.
Tests: `src/lib/**/*.test.ts` = **131** (engine 15, timesheets 13, tree 11, breaks 10,
nacha 10, local 10, tz 9, efw2 8, form941 8, accrual 7, sign 7, tips 6, annual 6,
qbo 6, overtime 5).

## Memoria
`~/.claude/projects/-Users-juanjo-Documents-Payroll-SaaS/memory/myjova-g-sprint.md` tiene
el log completo por sprint con commits. Actualízala al cerrar cada fase nueva.
