'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { calculatePayroll, type PayrollInput } from '@/lib/payroll/engine'
import { paySchemeSchema } from '@/lib/validators/employee'
import { splitByWeeks, type HoursSplit, type OvertimeRules } from '@/lib/payroll/overtime'
import { getOvertimeRules, hasMealBreakPremium } from '@/lib/payroll/overtime-presets'

// =============================================================================
// Server Actions — Payroll Runs
// =============================================================================

const createRunSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jurisdictionCode: z.string().min(2),
  name: z.string().optional(),
})

export type CreateRunResult =
  | { success: true; runId: string }
  | { success: false; error: string }

/**
 * Crea un payroll run en estado `draft`. NO calcula aún — el cálculo se
 * dispara con `calculateRunItems()` cuando el usuario carga horas, días o ventas.
 */
export async function createPayrollRun(formData: FormData): Promise<CreateRunResult> {
  const parsed = createRunSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const session = await requireSession('/en/login')
  const { requireActiveSubscription } = await import('@/lib/auth/subscription')
  const gateErr = await requireActiveSubscription(session.organizationId)
  if (gateErr) return gateErr
  const supabase = createClient()

  const { data, error } = await supabase
    .from('payroll_runs')
    .insert({
      organization_id: session.organizationId,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      pay_date: parsed.data.payDate,
      jurisdiction_code: parsed.data.jurisdictionCode,
      name: parsed.data.name || null,
      status: 'draft',
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'No se pudo crear la nómina.' }

  revalidatePath('/(app)/payroll', 'page')
  return { success: true, runId: data.id }
}

// -----------------------------------------------------------------------------

const itemInputSchema = z.object({
  employeeId: z.string().uuid(),
  hoursWorked: z.coerce.number().optional(),
  overtimeHours: z.coerce.number().optional(),
  daysWorked: z.coerce.number().optional(),
  salesAmountCents: z.coerce.number().optional(),
  unitsProduced: z.coerce.number().optional(),
})

const calculateRunSchema = z.object({
  runId: z.string().uuid(),
  items: z.array(itemInputSchema),
})

/**
 * Para cada empleado del input, calcula su gross/taxes/net y lo guarda en
 * `payroll_items` + `payroll_components`. Idempotente: si ya existe el item,
 * se actualiza.
 */
export async function calculateRunItems(
  runId: string,
  items: z.infer<typeof itemInputSchema>[],
): Promise<{ success: boolean; error?: string }> {
  const parsed = calculateRunSchema.safeParse({ runId, items })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const session = await requireSession('/en/login')
  const { requireActiveSubscription } = await import('@/lib/auth/subscription')
  const gateErr = await requireActiveSubscription(session.organizationId)
  if (gateErr) return gateErr
  const supabase = createClient()

  // 1) Trae el run para validar org + status
  const { data: run, error: runErr } = await supabase
    .from('payroll_runs')
    .select('id, status, organization_id, period_start, period_end')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .single()

  if (runErr || !run) return { success: false, error: 'Payroll run no encontrado.' }
  if (run.status !== 'draft') return { success: false, error: 'Solo runs en draft pueden recalcularse.' }

  // Timezone de la org: las fronteras del período y los cortes de día (OT
  // diario, meal premium) se evalúan en hora LOCAL, no UTC.
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('timezone')
    .eq('id', session.organizationId)
    .maybeSingle()
  const orgTz = (orgRow as { timezone?: string } | null)?.timezone ?? 'America/New_York'
  const { dayStartUtc, dayEndUtc, dayKeyInTz } = await import('@/lib/time/tz')

  // 2) Trae todos los empleados involucrados con su pay scheme activo
  const employeeIds = items.map((i) => i.employeeId)
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, w4_filing_status, w4_dependents, primary_jurisdiction_code, locality_code, subcontractor_id, pay_schemes!inner(scheme_type, config)')
    .in('id', employeeIds)
    .eq('organization_id', session.organizationId)
    .is('pay_schemes.effective_to', null)

  if (empErr || !employees) return { success: false, error: empErr?.message ?? 'No se pudieron cargar los empleados.' }

  // 2b) Trae time_entries APROBADAS dentro del período por cada empleado
  //     (solo las que no han sido consumidas por otra run).
  const { data: approvedEntries } = await supabase
    .from('time_entries')
    .select('id, employee_id, billable_minutes, clock_in_at, break_minutes, duration_minutes')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .is('payroll_item_id', null)
    .gte('clock_in_at', dayStartUtc(run.period_start, orgTz))
    .lt('clock_in_at', dayEndUtc(run.period_end, orgTz))

  type BillableAcc = {
    totalMinutes: number
    entryIds: string[]
    dayMinutes: Map<string, number>
    mealMissed: number
  }
  const billableByEmployee = new Map<string, BillableAcc>()
  for (const e of (approvedEntries ?? []) as {
    id: string
    employee_id: string
    billable_minutes: number | null
    clock_in_at: string
    break_minutes: number | null
    duration_minutes: number | null
  }[]) {
    const existing =
      billableByEmployee.get(e.employee_id) ??
      { totalMinutes: 0, entryIds: [], dayMinutes: new Map<string, number>(), mealMissed: 0 }
    const min = e.billable_minutes ?? 0
    existing.totalMinutes += min
    existing.entryIds.push(e.id)
    const day = dayKeyInTz(e.clock_in_at, orgTz)
    existing.dayMinutes.set(day, (existing.dayMinutes.get(day) ?? 0) + min)
    // Prima por descanso/comida perdido: turno > 5h (300 min) con descanso < 30 min.
    if ((e.duration_minutes ?? 0) > 300 && (e.break_minutes ?? 0) < 30) existing.mealMissed += 1
    billableByEmployee.set(e.employee_id, existing)
  }

  // 2b2) Trae production_entries APROBADAS dentro del período por empleado
  //      (piece-rate). Igual que billableByEmployee pero sumando cantidades.
  const { data: approvedProduction } = await supabase
    .from('production_entries')
    .select('id, employee_id, quantity')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .is('payroll_item_id', null)
    .gte('work_date', run.period_start)
    .lte('work_date', run.period_end)

  const productionByEmployee = new Map<string, { totalUnits: number; entryIds: string[] }>()
  for (const p of (approvedProduction ?? []) as { id: string; employee_id: string; quantity: number | string }[]) {
    const existing = productionByEmployee.get(p.employee_id) ?? { totalUnits: 0, entryIds: [] }
    existing.totalUnits += Number(p.quantity) || 0
    existing.entryIds.push(p.id)
    productionByEmployee.set(p.employee_id, existing)
  }

  // 2b3) Propinas APROBADAS sin consumir, por empleado.
  const { data: approvedTips } = await supabase
    .from('tip_entries')
    .select('id, employee_id, amount_cents')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .is('payroll_item_id', null)
    .gte('work_date', run.period_start)
    .lte('work_date', run.period_end)

  const tipsByEmployee = new Map<string, { totalCents: number; entryIds: string[] }>()
  for (const tp of (approvedTips ?? []) as { id: string; employee_id: string; amount_cents: number }[]) {
    const existing = tipsByEmployee.get(tp.employee_id) ?? { totalCents: 0, entryIds: [] }
    existing.totalCents += Number(tp.amount_cents) || 0
    existing.entryIds.push(tp.id)
    tipsByEmployee.set(tp.employee_id, existing)
  }

  // 2b4) Deducciones recurrentes activas por empleado (beneficios).
  const { data: deductionRows } = await supabase
    .from('employee_deductions')
    .select('employee_id, label, code, amount_cents, pre_tax')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .eq('is_active', true)
  const deductionsByEmployee = new Map<
    string,
    { code: string; label: string; amountCents: number; preTax: boolean }[]
  >()
  for (const d of (deductionRows ?? []) as {
    employee_id: string
    label: string
    code: string
    amount_cents: number
    pre_tax: boolean
  }[]) {
    const arr = deductionsByEmployee.get(d.employee_id) ?? []
    arr.push({ code: d.code, label: d.label, amountCents: d.amount_cents, preTax: d.pre_tax })
    deductionsByEmployee.set(d.employee_id, arr)
  }

  // 2c) Calcular YTD gross por empleado (suma de payroll_items del año en curso
  //     antes del period_start). Necesario para Social Security cap y Medicare additional.
  const yearStart = `${run.period_start.slice(0, 4)}-01-01`
  const { data: ytdItems } = await supabase
    .from('payroll_items')
    .select('employee_id, gross_cents, payroll_runs!inner(period_start)')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .gte('payroll_runs.period_start', yearStart)
    .lt('payroll_runs.period_start', run.period_start)

  const ytdByEmployee = new Map<string, number>()
  for (const it of ytdItems ?? []) {
    ytdByEmployee.set(it.employee_id, (ytdByEmployee.get(it.employee_id) ?? 0) + it.gross_cents)
  }

  // 3) Calcula cada item
  const itemRows: Array<{
    payroll_run_id: string
    employee_id: string
    organization_id: string
    hours_worked: number | null
    overtime_hours: number | null
    days_worked: number | null
    sales_amount_cents: number | null
    units_produced: number | null
    production_amount_cents: number | null
    tips_cents: number | null
    gross_cents: number
    federal_tax_cents: number
    state_tax_cents: number
    local_tax_cents: number | null
    social_security_cents: number
    medicare_cents: number
    other_deductions_cents: number
    net_cents: number
    employer_social_security_cents: number
    employer_medicare_cents: number
    employer_futa_cents: number
    scheme_snapshot: unknown
    breakdown: unknown
  }> = []

  const componentRows: Array<{
    payroll_item_id_placeholder: string  // se reemplaza por el id real después del insert
    organization_id: string
    component_type: 'earning' | 'deduction' | 'tax' | 'employer_tax'
    code: string
    label: string
    amount_cents: number
  }> = []

  for (const input of items) {
    const emp = employees.find((e) => e.id === input.employeeId)
    if (!emp) continue

    const rawScheme = Array.isArray(emp.pay_schemes) ? emp.pay_schemes[0] : emp.pay_schemes
    if (!rawScheme) continue

    let scheme
    try {
      scheme = paySchemeSchema.parse(rawScheme.config)
    } catch {
      continue
    }

    const periodsPerYear =
      scheme.type === 'salary' ? scheme.periodsPerYear : 26 // default bi-weekly

    // Para hourly: si el manager no especificó hoursWorked, derivar de
    // time_entries aprobadas en el período.
    let hoursWorked = input.hoursWorked
    let hoursSplit: HoursSplit | undefined
    let overtimeRules: OvertimeRules | undefined
    let extraEarnings: { code: string; label: string; amountCents: number }[] | undefined
    if (scheme.type === 'hourly') {
      const billable = billableByEmployee.get(emp.id)
      if ((hoursWorked === undefined || hoursWorked === 0) && billable) {
        hoursWorked = billable.totalMinutes / 60
      }
      const jur = (emp as { primary_jurisdiction_code?: string }).primary_jurisdiction_code
      overtimeRules = getOvertimeRules(jur)
      if (billable && billable.dayMinutes.size > 0) {
        const dayEntries = [...billable.dayMinutes.entries()].map(([date, m]) => ({ date, hours: m / 60 }))
        hoursSplit = splitByWeeks(dayEntries, overtimeRules)
      }
      if (billable && billable.mealMissed > 0 && hasMealBreakPremium(jur)) {
        extraEarnings = [
          {
            code: 'meal_premium',
            label: `Meal break premium (${billable.mealMissed})`,
            amountCents: Math.round(billable.mealMissed * scheme.rateCents),
          },
        ]
      }
    }

    // Para piecerate: si el manager no especificó unidades, derivar de
    // production_entries aprobadas. Las horas para el suelo FLSA salen de
    // time_entries (si el trabajador a destajo también fichó tiempo).
    let unitsProduced = input.unitsProduced
    let hoursForFloor: number | undefined
    if (scheme.type === 'piecerate') {
      if (unitsProduced === undefined || unitsProduced === 0) {
        const prod = productionByEmployee.get(emp.id)
        if (prod) unitsProduced = prod.totalUnits
      }
      const billable = billableByEmployee.get(emp.id)
      if (billable) hoursForFloor = billable.totalMinutes / 60
    }

    const tipsCents = tipsByEmployee.get(emp.id)?.totalCents ?? 0
    const empJur = (emp as { primary_jurisdiction_code?: string }).primary_jurisdiction_code

    const calcInput: PayrollInput = {
      scheme,
      hoursWorked,
      overtimeHours: input.overtimeHours,
      daysWorked: input.daysWorked,
      salesAmountCents: input.salesAmountCents,
      unitsProduced,
      hoursForFloor,
      tipsCents,
      hoursSplit,
      overtimeRules,
      extraEarnings,
      deductions: deductionsByEmployee.get(emp.id),
      filingStatus: emp.w4_filing_status,
      w4Dependents: emp.w4_dependents,
      // State withholding: solo jurisdicciones US ('US-CA' → California). Canadá
      // ('CA', 'CA-ON') NO usa retención estatal US — se excluye para evitar la
      // ambigüedad 'CA' (California vs Canada Federal) en el normalizador del engine.
      stateCode:
        empJur && empJur.toUpperCase().startsWith('US') ? empJur : undefined,
      localityCode: (emp as { locality_code?: string | null }).locality_code ?? undefined,
      // Trabajador de un subcontratista → pago BRUTO (el cheque consolidado va
      // al sub raíz; el tenant no le retiene impuestos).
      suppressWithholding: !!(emp as { subcontractor_id?: string | null }).subcontractor_id,
      ytdGrossCents: ytdByEmployee.get(emp.id) ?? 0,
      periodsPerYear,
    }

    const calc = calculatePayroll(calcInput)

    // Para piece-rate, guarda unidades y monto bruto del destajo (antes del make-up).
    const pieceComp = calc.components.find((c) => c.code === 'piecerate')

    itemRows.push({
      payroll_run_id: runId,
      employee_id: emp.id,
      organization_id: session.organizationId,
      hours_worked: hoursWorked ?? null,
      overtime_hours: input.overtimeHours ?? null,
      days_worked: input.daysWorked ?? null,
      sales_amount_cents: input.salesAmountCents ?? null,
      units_produced: scheme.type === 'piecerate' ? unitsProduced ?? 0 : null,
      production_amount_cents: pieceComp ? pieceComp.amountCents : null,
      tips_cents: tipsCents || null,
      gross_cents: calc.grossCents,
      federal_tax_cents: calc.federalTaxCents,
      state_tax_cents: calc.stateTaxCents,
      local_tax_cents: calc.localTaxCents || null,
      social_security_cents: calc.socialSecurityCents,
      medicare_cents: calc.medicareCents,
      other_deductions_cents: calc.otherDeductionsCents,
      net_cents: calc.netCents,
      employer_social_security_cents: calc.employerSocialSecurityCents,
      employer_medicare_cents: calc.employerMedicareCents,
      employer_futa_cents: calc.employerFUTACents,
      scheme_snapshot: scheme,
      breakdown: calc.breakdown,
    })

    for (const comp of calc.components) {
      componentRows.push({
        payroll_item_id_placeholder: emp.id, // mapearemos después
        organization_id: session.organizationId,
        component_type: comp.type,
        code: comp.code,
        label: comp.label,
        amount_cents: comp.amountCents,
      })
    }
  }

  // 4) Borra items previos del run y reinserta (idempotencia).
  //    Antes de borrar, liberar las time_entries que estaban vinculadas a los items
  //    viejos (poner payroll_item_id de vuelta a null para que puedan ser usadas
  //    nuevamente por el recálculo).
  const { data: oldItems } = await supabase
    .from('payroll_items')
    .select('id')
    .eq('payroll_run_id', runId)

  if (oldItems && oldItems.length > 0) {
    const oldIds = oldItems.map((i: { id: string }) => i.id)
    await supabase.from('time_entries').update({ payroll_item_id: null }).in('payroll_item_id', oldIds)
    await supabase.from('production_entries').update({ payroll_item_id: null }).in('payroll_item_id', oldIds)
    await supabase.from('tip_entries').update({ payroll_item_id: null }).in('payroll_item_id', oldIds)
  }

  await supabase.from('payroll_items').delete().eq('payroll_run_id', runId)

  const { data: insertedItems, error: insErr } = await supabase
    .from('payroll_items')
    .insert(itemRows)
    .select('id, employee_id')

  if (insErr) return { success: false, error: insErr.message }

  // 4b-4d) Marcar entries consumidas (time/production/tips) en PARALELO.
  // Antes eran 3 loops secuenciales con un await por empleado (3N round-trips);
  // con 100 empleados eso serializaba ~300 updates.
  const itemIdByEmpForTimeEntries = new Map((insertedItems ?? []).map((i: { id: string; employee_id: string }) => [i.employee_id, i.id]))
  const markUpdates: PromiseLike<unknown>[] = []
  for (const [empId, billable] of billableByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || billable.entryIds.length === 0) continue
    markUpdates.push(
      supabase.from('time_entries').update({ payroll_item_id: pItemId }).in('id', billable.entryIds),
    )
  }
  for (const [empId, prod] of productionByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || prod.entryIds.length === 0) continue
    markUpdates.push(
      supabase.from('production_entries').update({ payroll_item_id: pItemId }).in('id', prod.entryIds),
    )
  }
  for (const [empId, tips] of tipsByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || tips.entryIds.length === 0) continue
    markUpdates.push(
      supabase.from('tip_entries').update({ payroll_item_id: pItemId }).in('id', tips.entryIds),
    )
  }
  await Promise.all(markUpdates)

  // 5) Inserta los components con los IDs reales
  const itemIdByEmp = new Map((insertedItems ?? []).map((i) => [i.employee_id, i.id]))
  const componentsToInsert = componentRows
    .map((c) => ({
      payroll_item_id: itemIdByEmp.get(c.payroll_item_id_placeholder),
      organization_id: c.organization_id,
      component_type: c.component_type,
      code: c.code,
      label: c.label,
      amount_cents: c.amount_cents,
    }))
    .filter((c) => c.payroll_item_id)

  if (componentsToInsert.length > 0) {
    await supabase.from('payroll_components').insert(componentsToInsert as never)
  }

  revalidatePath(`/(app)/payroll/${runId}`, 'page')
  return { success: true }
}

// -----------------------------------------------------------------------------

/** Libera las entries (time/production/tips) vinculadas a estos payroll_items. */
async function releaseEntriesForItems(
  supabase: ReturnType<typeof createClient>,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return
  await Promise.all([
    supabase.from('time_entries').update({ payroll_item_id: null }).in('payroll_item_id', itemIds),
    supabase.from('production_entries').update({ payroll_item_id: null }).in('payroll_item_id', itemIds),
    supabase.from('tip_entries').update({ payroll_item_id: null }).in('payroll_item_id', itemIds),
  ])
}

/**
 * Borra un payroll run en DRAFT: libera las entries consumidas y elimina
 * items (cascade → components) + el run. Los runs aprobados/pagados NO se
 * borran (integridad contable).
 */
export async function deletePayrollRun(runId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, status')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }
  if ((run as { status: string }).status !== 'draft') {
    return { success: false, error: 'Solo los runs en draft pueden borrarse.' }
  }

  const { data: items } = await supabase
    .from('payroll_items')
    .select('id')
    .eq('payroll_run_id', runId)
  await releaseEntriesForItems(supabase, (items ?? []).map((i: { id: string }) => i.id))

  await supabase.from('payroll_items').delete().eq('payroll_run_id', runId)
  const { error } = await supabase
    .from('payroll_runs')
    .delete()
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .eq('status', 'draft')
  if (error) return { success: false, error: error.message }

  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'payroll_run.delete',
    targetTable: 'payroll_runs',
    targetId: runId,
  })

  revalidatePath('/(app)/payroll', 'layout')
  return { success: true }
}

/**
 * Excluye a UN empleado de un run en draft: libera sus entries y borra su
 * payroll_item (cascade → components). El resto del run queda intacto.
 */
export async function removePayrollItem(
  runId: string,
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, status')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }
  if ((run as { status: string }).status !== 'draft') {
    return { success: false, error: 'Solo en runs en draft.' }
  }

  await releaseEntriesForItems(supabase, [itemId])
  const { error } = await supabase
    .from('payroll_items')
    .delete()
    .eq('id', itemId)
    .eq('payroll_run_id', runId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/(app)/payroll/${runId}`, 'page')
  return { success: true }
}

// -----------------------------------------------------------------------------

export async function approvePayrollRun(runId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  const { requireActiveSubscription } = await import('@/lib/auth/subscription')
  const gateErr = await requireActiveSubscription(session.organizationId)
  if (gateErr) return gateErr
  const supabase = createClient()

  const { error } = await supabase
    .from('payroll_runs')
    .update({
      status: 'approved',
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .eq('status', 'draft')

  if (error) return { success: false, error: error.message }

  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'payroll_run.approve',
    targetTable: 'payroll_runs',
    targetId: runId,
  })

  const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
  await dispatchWebhook(session.organizationId, 'payroll.approved', { runId })

  // Liquidaciones de contratistas: CONGELAR el registro contable de cada sub
  // raíz (settlement_records — el reporte anual lee de aquí, inmune a cambios
  // posteriores de asignación/tarifa) y avisar por email al contratista
  // vinculado que su cheque quedó autorizado. Best-effort: si falla, el portal
  // cae al cálculo en vivo.
  try {
    const { data: runRow } = await supabase
      .from('payroll_runs')
      .select('period_start, period_end, pay_date')
      .eq('id', runId)
      .maybeSingle()
    const run = runRow as { period_start: string; period_end: string; pay_date: string } | null

    const { buildRunSettlements } = await import('@/lib/subcontractors/settlement-data')
    const settlements = await buildRunSettlements(supabase, session.organizationId, runId)

    if (run && settlements.length > 0) {
      await supabase.from('settlement_records').upsert(
        settlements.map((s) => ({
          organization_id: session.organizationId,
          payroll_run_id: runId,
          subcontractor_id: s.rootId,
          period_start: run.period_start,
          period_end: run.period_end,
          pay_date: run.pay_date,
          subtotal_cents: s.subtotalCents,
          tax_pct: s.taxPct,
          tax_cents: s.taxCents,
          total_cents: s.totalCents,
          pay_total_cents: s.payTotalCents,
          margin_cents: s.marginCents,
          lines: s.lines,
        })),
        { onConflict: 'payroll_run_id,subcontractor_id' },
      )

      // INV: numerar la factura de cada settlement recién congelado (secuencial
      // por org × año vía next_invoice_number; el upsert de arriba NO toca
      // invoice_number, así que las re-aprobaciones conservan su número).
      const { createAdminClient } = await import('@/lib/supabase/server')
      const admin = createAdminClient()
      try {
        const { formatInvoiceNumber } = await import('@/lib/subcontractors/invoice')
        const { data: unnumbered } = await admin
          .from('settlement_records')
          .select('id, pay_date')
          .eq('organization_id', session.organizationId)
          .eq('payroll_run_id', runId)
          .is('invoice_number', null)
        for (const rec of (unnumbered ?? []) as { id: string; pay_date: string }[]) {
          const year = Number(rec.pay_date.slice(0, 4))
          const { data: n } = await admin.rpc('next_invoice_number', {
            p_organization_id: session.organizationId,
            p_year: year,
          })
          if (typeof n === 'number') {
            await admin
              .from('settlement_records')
              .update({ invoice_number: formatInvoiceNumber(year, n) })
              .eq('id', rec.id)
          }
        }
      } catch {
        /* la numeración perezosa del primer download cubre este fallo */
      }

      // Email al contratista raíz vinculado (settlement_ready).
      const { data: linkedSubs } = await admin
        .from('subcontractors')
        .select('id, user_id')
        .eq('organization_id', session.organizationId)
        .in('id', settlements.map((s) => s.rootId))
        .not('user_id', 'is', null)
      const userBySub = new Map(
        ((linkedSubs ?? []) as { id: string; user_id: string }[]).map((s) => [s.id, s.user_id]),
      )

      const { formatMoney } = await import('@/lib/utils')
      const { dispatch } = await import('@/lib/notifications/dispatch')
      for (const s of settlements) {
        const userId = userBySub.get(s.rootId)
        if (!userId) continue
        await dispatch({
          userId,
          organizationId: session.organizationId,
          type: 'settlement_ready',
          title: 'Liquidación aprobada',
          body: `${session.organizationName}: cheque de ${formatMoney(s.totalCents)} autorizado (${run.period_start} → ${run.period_end}).`,
          dedupeKey: `settle-ready-${runId}-${s.rootId}`,
          emailTemplateData: {
            orgName: session.organizationName,
            periodStart: run.period_start,
            periodEnd: run.period_end,
            payDate: run.pay_date,
            checkTotal: formatMoney(s.totalCents),
            marginTotal: formatMoney(s.marginCents),
          },
        }).catch(() => {})
      }
    }
  } catch {
    /* no crítico */
  }

  // Notificar a los empleados del run que su pago está en camino (payroll_ready:
  // inapp + email + push según sus preferencias). Best-effort con dedupe por run.
  try {
    const { data: runItems } = await supabase
      .from('payroll_items')
      .select('employee_id, net_cents, scheme_snapshot, employees!inner(user_id, first_name)')
      .eq('payroll_run_id', runId)

    // Acumulación de PTO: cada run aprobado acumula un período para los
    // empleados incluidos, según las políticas con accrual configurado.
    try {
      const { accrualForPeriod, applyAccrual } = await import('@/lib/pto/accrual')
      const { data: policies } = await supabase
        .from('pto_policies')
        .select('id, accrual_method, accrual_rate, max_balance_hours')
        .eq('organization_id', session.organizationId)
        .neq('accrual_method', 'none')
      if (policies && policies.length > 0 && runItems && runItems.length > 0) {
        const empIds = runItems.map((it) => it.employee_id)
        const { data: balances } = await supabase
          .from('pto_balances')
          .select('employee_id, policy_id, balance_hours')
          .in('employee_id', empIds)
        const balMap = new Map(
          (balances ?? []).map((b: { employee_id: string; policy_id: string; balance_hours: number }) => [
            `${b.employee_id}:${b.policy_id}`,
            Number(b.balance_hours) || 0,
          ]),
        )
        const upserts: Record<string, unknown>[] = []
        for (const it of runItems) {
          const snap = it.scheme_snapshot as { type?: string; periodsPerYear?: number } | null
          const periodsPerYear = snap?.type === 'salary' ? snap.periodsPerYear ?? 26 : 26
          for (const pol of policies as {
            id: string
            accrual_method: 'hours_per_period' | 'days_per_year'
            accrual_rate: number
            max_balance_hours: number | null
          }[]) {
            const accrued = accrualForPeriod(pol.accrual_method, Number(pol.accrual_rate), periodsPerYear)
            if (accrued <= 0) continue
            const current = balMap.get(`${it.employee_id}:${pol.id}`) ?? 0
            upserts.push({
              organization_id: session.organizationId,
              employee_id: it.employee_id,
              policy_id: pol.id,
              balance_hours: applyAccrual(current, accrued, pol.max_balance_hours),
              updated_at: new Date().toISOString(),
            })
          }
        }
        if (upserts.length > 0) {
          await supabase.from('pto_balances').upsert(upserts, { onConflict: 'employee_id,policy_id' })
        }
      }
    } catch {
      // El accrual nunca bloquea la aprobación.
    }
    const { dispatch } = await import('@/lib/notifications/dispatch')
    await Promise.allSettled(
      (runItems ?? [])
        .map((it) => {
          const emp = Array.isArray(it.employees) ? it.employees[0] : it.employees
          return { userId: (emp as { user_id: string | null } | null)?.user_id, net: it.net_cents }
        })
        .filter((x): x is { userId: string; net: number } => !!x.userId)
        .map(({ userId }) =>
          dispatch({
            userId,
            organizationId: session.organizationId,
            type: 'payroll_ready',
            title: 'Your pay is on the way',
            body: 'A new payroll run that includes you was approved. Your paystub is available.',
            dedupeKey: `payroll_ready:${runId}`,
            data: { runId },
          }),
        ),
    )
  } catch {
    // Las notificaciones nunca bloquean la aprobación.
  }

  revalidatePath('/(app)/payroll', 'layout')
  return { success: true }
}

export async function markPayrollRunPaid(runId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { error } = await supabase
    .from('payroll_runs')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')

  if (error) return { success: false, error: error.message }

  const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
  await dispatchWebhook(session.organizationId, 'payroll.paid', { runId })

  // Email al contratista vinculado: su cheque fue marcado como PAGADO.
  // Lee de los registros congelados (misma fuente que el reporte anual).
  try {
    const { data: records } = await supabase
      .from('settlement_records')
      .select('subcontractor_id, total_cents, period_start, period_end, subcontractors!inner(user_id)')
      .eq('payroll_run_id', runId)
      .eq('organization_id', session.organizationId)

    const { formatMoney } = await import('@/lib/utils')
    const { dispatch } = await import('@/lib/notifications/dispatch')
    for (const r of (records ?? []) as unknown as {
      subcontractor_id: string
      total_cents: number
      period_start: string
      period_end: string
      subcontractors: { user_id: string | null }
    }[]) {
      const userId = r.subcontractors?.user_id
      if (!userId) continue
      await dispatch({
        userId,
        organizationId: session.organizationId,
        type: 'settlement_paid',
        title: 'Cheque pagado',
        body: `${session.organizationName}: tu cheque de ${formatMoney(r.total_cents)} fue marcado como pagado.`,
        dedupeKey: `settle-paid-${runId}-${r.subcontractor_id}`,
        emailTemplateData: {
          orgName: session.organizationName,
          periodStart: r.period_start,
          periodEnd: r.period_end,
          checkTotal: formatMoney(r.total_cents),
        },
      }).catch(() => {})
    }
  } catch {
    /* no crítico */
  }

  revalidatePath('/(app)/payroll', 'layout')
  return { success: true }
}
