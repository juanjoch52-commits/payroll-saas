# MyJova — HANDOFF (continuar el H-sprint en sesión nueva)

Documento para retomar el trabajo sin perder contexto. Rama:
**`feature/myjova-full-rebuild`**. Commit por fase. Termina los mensajes de commit con
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Estado actual (2026-06-07)

Dos sprints construidos sobre la base original:
- **G-sprint (G0–G12)** — COMPLETO: piece-rate, industria, kiosko, paystub PDF, QuickBooks,
  REST móvil, app Expo. Ver `OVERNIGHT_BUILD.md`.
- **H-sprint (gaps competitivos, usuario pidió "todas")** — análisis en `ANALISIS_COMPETITIVO.md`.
  Plan H1–H15. **Hechas: H1–H9, H11, H13.** **H14 parcial.** **Faltan: H14 (terminar), H10, H12, H15.**

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
| **H14 Local taxes** | 🟡 PARCIAL | 4368107 |
| **H10 Tax e-file deepening** | ⬜ TODO | — |
| **H12 SSO + webhooks salientes** | ⬜ TODO | — |
| **H15 Quality (export, tests, a11y)** | ⬜ TODO | — |

Estado de gates al hacer handoff: **typecheck ✅, vitest 26/26 ✅, build ✅, lint ✅.**
Migraciones del H-sprint: `supabase/migrations/20260501000001..011` + (parcial 14 no añadió migración aún).
**Próximo timestamp libre: `20260501000012`.**

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

## TRABAJO RESTANTE

### H14 — terminar local taxes (lo más rápido, empieza por aquí)
Ya está: `src/lib/payroll/us/local.ts` + engine cableado (localityCode → localTaxCents en
PayrollCalculation/net/components/breakdown). **Falta:**
1. **Migración** `20260501000012_local_tax.sql`:
   `alter table public.payroll_items add column local_tax_cents bigint;`
   `alter table public.employees add column locality_code text;`
2. **`src/app/actions/payroll.ts`** `calculateRunItems`:
   - añade `local_tax_cents: number | null` al tipo `itemRows`.
   - en el select de employees añade `locality_code`.
   - en `calcInput` añade `localityCode: (emp as { locality_code?: string }).locality_code`.
   - en `itemRows.push` añade `local_tax_cents: calc.localTaxCents || null` (junto a `state_tax_cents: calc.stateTaxCents`).
3. **Form de empleado** (`src/components/employees/EmployeeForm.tsx` + validator
   `src/lib/validators/employee.ts` + `src/app/actions/employees.ts`): `<select>` opcional de
   `LOCALITY_CODES` (de `local.ts`) → `localityCode` en `employeeSchema` → insert `locality_code`.
4. **Test** (`src/lib/payroll/us/local.test.ts`): `calcLocalTax('NYC', 100000)` ≈ 3078; locality
   desconocida → 0. (Opcional: test del engine con localityCode.)
5. i18n para el label del select (`employees.locality` ×4) si añades el campo.
- Opcional (estaba en H14): export de "new-hire reporting" y modelo ACA 1095-C — bajar de alcance
  o nota como futuro.

### H10 — tax e-file deepening
Los stubs existen en `src/lib/efile/{track1099,irs-fire,cra-xml}.ts`. Profundizar hacia formatos
reales, manteniendo la transmisión gateada/stub:
- Builder **SSA EFW2** (W-2 electrónico, registros de ancho fijo) — puro + test de longitudes.
- **IRS 941** (worksheet trimestral): suma de wages + federal + FICA del trimestre.
- Reusar el patrón NACHA (`src/lib/payroll/nacha.ts`) de "builder puro + test + valida con tu agencia".
- Valor marginal medio (ya está stubbed). Considera hacerlo después de H12/H15.

### H12 — SSO + webhooks salientes
- **SSO**: botones Google/Microsoft en `signup-form`/login con `supabase.auth.signInWithOAuth({provider})`.
  Requiere habilitar los providers en el dashboard de Supabase (paso manual de Juan). Poco código.
- **Webhooks salientes**: tabla `webhook_endpoints` (org, url, secret, events[]) + un dispatcher que
  POSTea payloads firmados con HMAC ante eventos (payroll.approved, time_entry.approved, employee.created).
  UI en Settings → Integrations (CRUD de endpoints). Migración `20260501000013_outbound_webhooks.sql`.

### H15 — quality
- **Export de datos del tenant** (GDPR/CCPA): action que vuelca empleados/nóminas/tiempos a CSV/JSON
  (zip o varios CSV vía la utilidad `toCsv` de `src/lib/reports/csv.ts`). Settings → General o Privacy.
- **Más tests**: cubre tips pool distribution, PTO balance deduction, NACHA edge cases.
- **a11y**: pasada de labels/aria en formularios nuevos; foco en kiosko (pantalla táctil).
- **Lint**: ya verde con `next/core-web-vitals` (no toques `eslint.ignoreDuringBuilds` del build).

---

## Lista para Juan (config nueva del H-sprint — añadir a OVERNIGHT_BUILD.md)
- **12 migraciones nuevas** `20260501000001..011` (+ las de H14 cuando estén) → `npm run db:push`.
- **Square POS** (opcional): `SQUARE_APP_ID` / `SQUARE_APP_SECRET` / `SQUARE_ENVIRONMENT`, redirect
  `<APP_URL>/api/integrations/square/callback`. Sin esto, las propinas funcionan manual.
- **Realtime** (opcional): habilitar en `team_messages` para chat en vivo.
- `ENCRYPTION_KEY` (ya requerido por QBO) ahora también cifra datos bancarios de empleados (NACHA).
- Sigue todo lo de `OVERNIGHT_BUILD.md` y `MANUAL_STEPS.md` (Supabase/Stripe/Mapbox/Resend/Expo).

## Memoria
`/Users/juanjo/.claude/projects/-Users-juanjo-Documents-Payroll-SaaS/memory/myjova-g-sprint.md`
tiene el log G+H. Actualízalo al cerrar cada fase nueva.
