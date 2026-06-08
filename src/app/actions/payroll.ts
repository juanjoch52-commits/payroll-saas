'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { calculatePayroll, type PayrollInput } from '@/lib/payroll/engine'
import { paySchemeSchema } from '@/lib/validators/employee'

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

  // 2) Trae todos los empleados involucrados con su pay scheme activo
  const employeeIds = items.map((i) => i.employeeId)
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, w4_filing_status, w4_dependents, pay_schemes!inner(scheme_type, config)')
    .in('id', employeeIds)
    .eq('organization_id', session.organizationId)
    .is('pay_schemes.effective_to', null)

  if (empErr || !employees) return { success: false, error: empErr?.message ?? 'No se pudieron cargar los empleados.' }

  // 2b) Trae time_entries APROBADAS dentro del período por cada empleado
  //     (solo las que no han sido consumidas por otra run).
  const { data: approvedEntries } = await supabase
    .from('time_entries')
    .select('id, employee_id, billable_minutes')
    .in('employee_id', employeeIds)
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .is('payroll_item_id', null)
    .gte('clock_in_at', `${run.period_start}T00:00:00Z`)
    .lte('clock_in_at', `${run.period_end}T23:59:59Z`)

  const billableByEmployee = new Map<string, { totalMinutes: number; entryIds: string[] }>()
  for (const e of approvedEntries ?? []) {
    const existing = billableByEmployee.get(e.employee_id) ?? { totalMinutes: 0, entryIds: [] }
    existing.totalMinutes += e.billable_minutes ?? 0
    existing.entryIds.push(e.id)
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
    if (scheme.type === 'hourly' && (hoursWorked === undefined || hoursWorked === 0)) {
      const billable = billableByEmployee.get(emp.id)
      if (billable) {
        hoursWorked = billable.totalMinutes / 60
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

    const calcInput: PayrollInput = {
      scheme,
      hoursWorked,
      overtimeHours: input.overtimeHours,
      daysWorked: input.daysWorked,
      salesAmountCents: input.salesAmountCents,
      unitsProduced,
      hoursForFloor,
      tipsCents,
      filingStatus: emp.w4_filing_status,
      w4Dependents: emp.w4_dependents,
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

  // 4b) Marcar las time_entries consumidas en este run.
  const itemIdByEmpForTimeEntries = new Map((insertedItems ?? []).map((i: { id: string; employee_id: string }) => [i.employee_id, i.id]))
  for (const [empId, billable] of billableByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || billable.entryIds.length === 0) continue
    await supabase
      .from('time_entries')
      .update({ payroll_item_id: pItemId })
      .in('id', billable.entryIds)
  }

  // 4c) Marcar las production_entries consumidas en este run.
  for (const [empId, prod] of productionByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || prod.entryIds.length === 0) continue
    await supabase
      .from('production_entries')
      .update({ payroll_item_id: pItemId })
      .in('id', prod.entryIds)
  }

  // 4d) Marcar las tip_entries consumidas en este run.
  for (const [empId, tips] of tipsByEmployee) {
    const pItemId = itemIdByEmpForTimeEntries.get(empId)
    if (!pItemId || tips.entryIds.length === 0) continue
    await supabase.from('tip_entries').update({ payroll_item_id: pItemId }).in('id', tips.entryIds)
  }

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

export async function approvePayrollRun(runId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
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
  revalidatePath('/(app)/payroll', 'layout')
  return { success: true }
}
