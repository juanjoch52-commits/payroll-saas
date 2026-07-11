# MyJova — HANDOFF (reinicio de sesión)

Rama: **`feature/myjova-full-rebuild`**. Commit por fase, gates verdes antes de cada commit.
Termina los mensajes de commit con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Estado global (2026-07-11) — CÓDIGO COMPLETO, INFRA PENDIENTE

**Todo el trabajo de producto está hecho y commiteado.** Gates: typecheck ✅ · lint ✅ ·
build ✅ · **vitest 98/98 ✅**. Git limpio. **54 migraciones** (`db:push` aplica hasta
`20260501000020`). **Próximo timestamp libre: `20260501000021`.**

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

## Subcontratistas (feature clave — caso real de Juan)

Contratista → sub mayor → subs menores. Todos fichan horas con el tenant; el pago se
consolida en **UN cheque al sub RAÍZ** con desglose. Caso de Juan (Canadá): a él le pagan
$37/h por sus horas y $33/h por las de su amigo; él le paga $30/h al amigo → **$3/h de
margen**, + **HST 13%** sobre lo facturado.
- Tablas: `subcontractors` (parent_id jerárquico, `sales_tax_pct` 0-30) +
  `employees.subcontractor_id` + `employees.bill_rate_cents` (facturado ≠ pagado).
- `src/lib/subcontractors/tree.ts` (puro, testeado con el caso 37/33/30+13%): rootOf
  anti-ciclo; buildSettlements → líneas pay/bill/margen, subtotal+HST=cheque, payTotal, margen.
- Motor: `suppressWithholding` → sub-workers cobran BRUTO (sin retenciones ni FICA/FUTA
  del tenant); excluidos de W-2/1099 (el 1099 iría a la EMPRESA sub — futuro).
- UI: página `/subcontractors` (árbol, HST%, alta con padre), bill rate en forms de
  empleado, **settlement card** en el run + **PDF de liquidación** por sub raíz
  (`downloadSettlementPdf`), paystub del sub-worker marcado "Paid via subcontractor".

## 🚦 LO ÚNICO QUE FALTA PARA LANZAR (no es código)

1. **Infra (Juan, ~1 día)**: env en `.env.local` Y Vercel — Supabase ×3, Stripe ×6
   (`STRIPE_SECRET_KEY`, publishable, webhook secret, 3 price IDs), `ENCRYPTION_KEY`
   (`openssl rand -base64 32`), `RESEND_API_KEY` (+`RESEND_FROM_EMAIL` verificado).
   Opcionales: Mapbox, Twilio, VAPID, QBO, Square, `MYRAVEX_WEBHOOK_SECRET`.
2. **Supabase**: `npm run db:push` (54 migraciones) · habilitar Custom Access Token Hook ·
   Realtime en `notifications` · `insert into platform_admins (user_id) values ('<tu-uid>')`.
   SSO opcional: habilitar Google/Microsoft en Auth → Providers (redirect `<APP_URL>/auth/callback`).
3. **Stripe**: crear 3 productos/precios, webhook prod → `<APP_URL>/api/webhooks/stripe`.
4. **Smoke test E2E real (siguiente sesión, en cuanto 1-3 estén)**: signup → onboarding →
   empleado → fichar → aprobar → nómina → paystub/settlement contra el Supabase vivo.
   La app NUNCA ha corrido con DB real — espera 3-5 bugs de primera ejecución; arreglarlos.
5. **Antes de cobrar**: revisión de abogado de `/privacy` + `/terms` (son plantillas) y
   validar una nómina real con contador.

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
multi-región · edición de pay scheme versionada (effective_from/to) · app móvil
`apps/mobile` está STALE (solo G12, excluida del build) — track aparte.

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
- Al aprobar run: fan-out `payroll_ready` + **PTO accrual** por política + webhook; al
  marcar pagado: webhook `payroll.paid`. Trial gate en las 4 acciones core de escritura.
Tests: `src/lib/**/*.test.ts` = **98** (engine 15, nacha 10, local 10, tz 9, efw2 8,
form941 8, tips 6, tree 7, accrual 7, sign 7, overtime 5, qbo 6).

## Memoria
`~/.claude/projects/-Users-juanjo-Documents-Payroll-SaaS/memory/myjova-g-sprint.md` tiene
el log completo por sprint con commits. Actualízala al cerrar cada fase nueva.
