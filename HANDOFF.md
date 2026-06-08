# MyJova — HANDOFF (continuar el H-sprint en sesión nueva)

Documento para retomar el trabajo sin perder contexto. Rama:
**`feature/myjova-full-rebuild`**. Commit por fase. Termina los mensajes de commit con
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Estado actual (2026-06-07) — H-SPRINT COMPLETO ✅

Dos sprints construidos sobre la base original:
- **G-sprint (G0–G12)** — COMPLETO: piece-rate, industria, kiosko, paystub PDF, QuickBooks,
  REST móvil, app Expo. Ver `OVERNIGHT_BUILD.md`.
- **H-sprint (gaps competitivos, usuario pidió "todas")** — análisis en `ANALISIS_COMPETITIVO.md`.
  Plan H1–H15. **TODAS COMPLETAS (H1–H15).**

| Fase | Estado | Commit |
|---|---|---|
| H1 Scheduling | ✅ | 585574a |
| H2 PTO/time-off | ✅ | 5653fd7 |
| H3 Documentos + e-sign | ✅ | c42e609 |
| H4 Tips + Square POS | ✅ | 37cdfe1 |
| H5 Direct deposit (NACHA) | ✅ | 4a9cd0a |
| H6 WH-347 + jobs | ✅ | 40128ad |
| H7 Overtime/break compliance | ✅ | 95fb7e0 |
| H8 Reportes + CSV | ✅ | 9017423 |
| H9 Team comms | ✅ | a86da0e |
| H11 Departments + self-service | ✅ | cd753b8 |
| H13 Benefits/deducciones | ✅ | 868939d |
| **H14 Local taxes** | ✅ | 9577258 |
| **H15 Quality (export, tests, a11y)** | ✅ | c955242 |
| **H12 SSO + webhooks salientes** | ✅ | 3f06563 |
| **H10 Tax e-file deepening** | ✅ | 0cacbc2 |

Estado de gates al cerrar el sprint: **typecheck ✅, vitest 70/70 ✅, build ✅, lint ✅.**
Migraciones del H-sprint: `supabase/migrations/20260501000001..014`.

## Design sprint (UX + onboarding + admin) — COMPLETO ✅ (2026-06-08)

Sobre la base anterior, 5 fases (commit por fase, gates verdes):
- **UI-1** (2531c10): primitivos de diseño basados en tokens — `PageHeader`,
  `StatCard`, `EmptyState`, `Callout` (`src/components/ui/`). Limpieza de colores
  crudos (green/amber/red → tokens) en dashboard, history, settings, admin.
- **UI-2** (4a77e4b): sidebar agrupado por secciones con estado activo
  (`SidebarNav` client + `nav-config`) + **nav móvil** (`MobileNav` drawer — antes
  no había nav < md) + bottom-nav del empleado con activo. i18n `nav.sections.*`.
- **UI-3** (d06a966): rediseño del dashboard manager (StatCards con tono, quick
  actions por rol, grid mapa/nómina, `data-tour`), headers vía `PageHeader`.
- **OB** (d5c9bbe): **onboarding interactivo**. Migración `...015`
  `organizations.onboarding_state jsonb`. `onboarding.ts` (dismiss/reset).
  Checklist de primeros pasos con progreso REAL (`OnboardingChecklist`) + tour
  guiado spotlight (`tourStore` zustand + `ProductTour` + welcome dialog) en el
  dashboard. i18n `onboarding.*`.
- **ADM** (51898c1): panel admin completo. Tickets de soporte
  (`/admin/support/[id]` hilo + reply + status, `support.ts`), CRUD de feature
  overrides (`feature-overrides.ts` + `FeatureOverridesManager`), entrega real de
  broadcasts (fan-out inapp + `broadcast_deliveries`).

Gates al cerrar: **typecheck ✅, vitest 70/70 ✅, build ✅, lint ✅.**
**Próximo timestamp de migración libre: `20260501000016`.**

## Cómo trabajar (convenciones aprendidas — IMPORTANTE)

- **Gates por fase**: `npm run typecheck` · `npm test` (vitest) · `npm run lint` · `npm run build`.
  zsh: `${PIPESTATUS}` sale vacío — fíate de la AUSENCIA de errores, no del exit code.
- **Rutas**: una feature con página de manager Y de empleado necesita PATHS DISTINTOS porque los
  route groups `(app)` y `(employee)` colapsan a la misma URL. Convención: manager `/feature`,
  empleado `/my-feature`. Si el build dice "two parallel pages", borra `.next` y verifica que no
  quede el dir viejo.
- **i18n**: parchea los **4** archivos `src/i18n/messages/{en,es,fr,fr-CA}.json` JUNTOS con un
  script `node -e` (fs). fr-CA cae a fr. NO edites a mano (rompe parity). Patrón usado en cada fase.
- **Migraciones**: timestamped. `ALTER TYPE ... ADD VALUE` va en su PROPIO archivo (no usar en la
  misma migración). `database.ts` es `Record<string,any>` permisivo → tablas/columnas nuevas NO
  rompen TS (no hace falta regenerar tipos para compilar).
- **z.coerce.number()**: su `z.input` se tipa como `number` → desde el cliente pasa `Number(x)`,
  no el string del estado (si no, error TS2322).
- **Storage**: buckets privados (`documents`, `time-photos`) se tocan SOLO vía Server Actions con
  `createAdminClient()` (service role). Lecturas vía signed URL.
- **Crypto**: `src/lib/crypto/secretbox.ts` (AES-256-GCM, `ENCRYPTION_KEY`) cifra tokens QBO/Square
  y datos bancarios. Sin la key, esas features se deshabilitan con mensaje (degradación elegante).
- **Sidebar** (`src/components/layout/AppSidebar.tsx`) ya está LARGO. H11 puso "departments" en el
  índice de Settings, no en el nav. Considera agrupar el nav si sigues añadiendo.
- **App móvil** (`apps/mobile/`, Expo) está EXCLUIDA del tsconfig raíz (`exclude: ["apps"]`). NO se
  actualizó con features del H-sprint (solo clock/history/paystubs/profile).

## El motor de nómina (clave)

`src/lib/payroll/engine.ts` es puro. `calculatePayroll(input)`:
- gross = scheme (hora/salario/día/comisión/piecerate) + tips + extraEarnings.
- OT avanzada: si `hoursSplit` + `overtimeRules` (precomputados en calculateRunItems vía
  `src/lib/payroll/overtime.ts` `splitByWeeks`), usa regular/OT/DT; si no, OT semanal simple.
- deducciones: preTax baja el gravable (federal/estatal, NO FICA); postTax solo neto.
- local tax: `localityCode` → `src/lib/payroll/us/local.ts` `calcLocalTax` (NYC/PHL/YON).
- **OJO**: `stateCode` NO se pasa hoy en `calculateRunItems` (gap latente → state tax = 0). Si lo
  cableas, cuidado: 'CA' es ambiguo (California vs Canadá).

`src/app/actions/payroll.ts` `calculateRunItems` agrega en paralelo: time_entries (con dayMinutes
por OT + mealMissed), production_entries, tip_entries, employee_deductions. Marca consumidas con
`payroll_item_id` y libera al recalcular. Tests del motor en `src/lib/payroll/*.test.ts`
(engine, overtime, nacha) + `src/lib/integrations/quickbooks/quickbooks.test.ts` = 26 tests.

---

## LO ENTREGADO EN ESTA SESIÓN (H14, H15, H12, H10)

### H14 — local taxes (commit 9577258)
- Migración `20260501000012_local_tax.sql` (`payroll_items.local_tax_cents` + `employees.locality_code`).
- `calculateRunItems` carga `locality_code`, pasa `localityCode` al engine y persiste `local_tax_cents`.
- `EmployeeForm` con `<select>` de localidad (NYC/PHL/YON) + validator + insert en `createEmployee`.
- Columna **Local** en el CSV de payroll register; **W-2 boxes 18/19/20** (local wages/tax/locality).
- `src/lib/payroll/us/local.test.ts` (10 tests). i18n `employees.locality` + `localityNone` ×4.

### H15 — quality (commit c955242)
- **Export de datos del tenant** (GDPR/CCPA): `src/app/actions/data-export.ts` (`exportTenantData`,
  JSON, RLS-scoped, allowlist de tablas, excluye credenciales cifradas) + `DataExportCard` en
  Settings → General. Solo owner/admin.
- Extraído `distributeTipPool` puro (`src/lib/payroll/tips.ts`) del action de tips + 6 tests.
- Casos límite NACHA (archivo vacío, blocking/padding, truncado, tx code) + tests.
- a11y: aria-labels en kiosko (input pairing, tecla borrar PIN, atrás) y botón copiar de WebhooksCard.

### H12 — SSO + webhooks salientes (commit 3f06563)
- **SSO**: `SsoButtons` (`signInWithOAuth` google/azure) en login + signup. Migración
  `20260501000013_oauth_default_org.sql`: `handle_new_user` crea org por defecto para altas OAuth
  (provider != 'email') para que no queden sin tenant. i18n auth ×4.
- **Webhooks salientes**: migración `20260501000014_outbound_webhooks.sql` (`webhook_endpoints` +
  `webhook_deliveries` + RLS). `src/lib/webhooks/`: `dispatch.ts` (POST firmado HMAC-SHA256, paralelo
  con timeout 8s, log de entregas, NUNCA lanza), `events.ts` (client-safe), `sign.ts` (puro, 7 tests).
  CRUD en `src/app/actions/webhooks.ts` + `WebhooksCard` en Settings → Integrations (secret se muestra
  1 vez). Disparado en `payroll.approved`, `time_entry.approved`, `employee.created`.

### H10 — tax e-file deepening (commit 0cacbc2)
- `src/lib/efile/efw2.ts`: builder SSA EFW2 puro (registros 512 bytes RA/RE/RW/RT/RF) + 8 tests.
- `src/lib/efile/form941.ts`: worksheet 941 trimestral puro (12.4% SS / 2.9% Medicare, líneas
  2/3/5/6/12) + `quarterDateRange` + 8 tests.
- Transmisión sigue stub (validar con SSA AccuWage antes de producción). Patrón = `nacha.ts`.

### Notas / futuro (fuera de alcance)
- Gap latente conocido: `stateCode` NO se pasa en `calculateRunItems` (state tax = 0). Ojo con la
  ambigüedad 'CA' (California vs Canadá) si lo cableas.
- H14 opcional no hecho: new-hire reporting export + ACA 1095-C.
- H10: wiring de UI/acciones para EFW2/941 (los builders son foundations, como los otros stubs efile).
- SSO: enlazar identidades por email (Supabase no lo hace por defecto → un login Google de un usuario
  que se registró por password crea un usuario+org nuevos). Habilitar en el dashboard si se desea.

---

## Lista para Juan (config nueva del H-sprint — añadir a OVERNIGHT_BUILD.md)
- **14 migraciones nuevas** `20260501000001..014` → `npm run db:push`.
- **SSO** (H12, opcional): habilitar los providers **Google** y **Microsoft (azure)** en Supabase
  dashboard → Authentication → Providers. Redirect URL: `<APP_URL>/auth/callback`. Sin habilitarlos,
  los botones SSO devuelven error inline (degradación elegante).
- **Webhooks salientes** (H12): no requiere env. El owner/admin crea endpoints en Settings →
  Integrations; el secret de firma se muestra una sola vez. Firma en header `X-MyJova-Signature`.
- **Square POS** (opcional): `SQUARE_APP_ID` / `SQUARE_APP_SECRET` / `SQUARE_ENVIRONMENT`, redirect
  `<APP_URL>/api/integrations/square/callback`. Sin esto, las propinas funcionan manual.
- **Realtime** (opcional): habilitar en `team_messages` para chat en vivo.
- `ENCRYPTION_KEY` (ya requerido por QBO) ahora también cifra datos bancarios de empleados (NACHA).
- **E-file** (H10, opcional, para producción): `TRACK1099_API_KEY` / `IRS_FIRE_TCC` para transmisión
  real; EFW2 (SSA) valida con AccuWage. Sin esto, los builders generan archivos para subida manual.
- Sigue todo lo de `OVERNIGHT_BUILD.md` y `MANUAL_STEPS.md` (Supabase/Stripe/Mapbox/Resend/Expo).

## Memoria
`/Users/juanjo/.claude/projects/-Users-juanjo-Documents-Payroll-SaaS/memory/myjova-g-sprint.md`
tiene el log G+H. Actualízalo al cerrar cada fase nueva.
