'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { employeeSchema, parsePaySchemeJson } from '@/lib/validators/employee'

// =============================================================================
// Server Actions — Employees
// =============================================================================
// Reglas:
//   - El cliente NO manda organization_id; lo derivamos de la sesión activa.
//   - Antes de insertar, validamos el límite de empleados del tier vigente.
//   - El cálculo de pay scheme se guarda como fila independiente en pay_schemes.
// =============================================================================

export type EmployeeActionResult =
  | { success: true; employeeId: string }
  | { success: false; error: string }

export async function createEmployee(formData: FormData): Promise<EmployeeActionResult> {
  // 1) Validar input
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  // 2) Validar pay scheme JSON
  let paySchemeConfig
  try {
    paySchemeConfig = parsePaySchemeJson(input.paySchemeJson)
  } catch (e) {
    return { success: false, error: 'Pay scheme inválido.' }
  }

  // 3) Sesión activa
  const session = await requireSession('/en/login')
  const supabase = createClient()

  // 4) Enforcement de límite del tier
  const { data: planRow } = await supabase
    .from('subscriptions')
    .select('plans:plan_id (max_employees)')
    .eq('organization_id', session.organizationId)
    .single()

  // El join devuelve `plans` como objeto u array dependiendo de la versión de Supabase.
  const plansData = planRow?.plans as unknown
  const maxEmployees =
    (Array.isArray(plansData)
      ? (plansData[0] as { max_employees: number | null })?.max_employees
      : (plansData as { max_employees: number | null } | null)?.max_employees) ?? null

  if (maxEmployees !== null) {
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', session.organizationId)
      .eq('status', 'active')

    if ((count ?? 0) >= maxEmployees) {
      return {
        success: false,
        error: `Has alcanzado el límite de ${maxEmployees} empleados de tu plan. Actualiza para agregar más.`,
      }
    }
  }

  // 5) Si requiere daily/commission, validar feature del plan
  if (paySchemeConfig.type === 'daily' || paySchemeConfig.type === 'commission') {
    const { data: hasFeature } = await supabase.rpc('check_plan_feature', {
      org_id: session.organizationId,
      feature_key:
        paySchemeConfig.type === 'daily' ? 'payroll_daily' : 'payroll_commission',
    })
    if (!hasFeature) {
      return {
        success: false,
        error: `Tu plan actual no permite el esquema de pago "${paySchemeConfig.type}".`,
      }
    }
  }

  // 6) Insertar employee + pay_scheme en transacción lógica
  // TODO: Encriptar input.taxId antes de guardar. Por ahora se guarda solo el last_four.
  const taxIdDigits = (input.taxId ?? '').replace(/\D/g, '')
  const taxIdLastFour = taxIdDigits.length >= 4 ? taxIdDigits.slice(-4) : null

  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .insert({
      organization_id: session.organizationId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email || null,
      phone: input.phone || null,
      hire_date: input.hireDate,
      status: input.status,
      employee_type: input.employeeType,
      job_title: input.jobTitle || null,
      primary_jurisdiction_code: input.primaryJurisdictionCode,
      tax_id_encrypted: null, // pendiente Fase 5+
      tax_id_last_four: taxIdLastFour,
      w4_filing_status: input.w4FilingStatus,
      w4_dependents: input.w4Dependents,
      address: input.address,
    })
    .select('id')
    .single()

  if (empErr || !employee) {
    return { success: false, error: empErr?.message ?? 'No se pudo crear el empleado.' }
  }

  // 7) Insertar pay scheme
  const { error: psErr } = await supabase.from('pay_schemes').insert({
    employee_id: employee.id,
    organization_id: session.organizationId,
    scheme_type: paySchemeConfig.type,
    config: paySchemeConfig,
    effective_from: input.hireDate,
  })

  if (psErr) {
    // Si falla el pay scheme, borramos el employee para no dejar datos huérfanos.
    await supabase.from('employees').delete().eq('id', employee.id)
    return { success: false, error: psErr.message }
  }

  // Audit
  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'employee.create',
    targetTable: 'employees',
    targetId: employee.id,
    newData: { name: `${input.firstName} ${input.lastName}`, scheme: paySchemeConfig.type },
  })

  revalidatePath(`/(app)/employees`, 'page')
  return { success: true, employeeId: employee.id }
}

// -----------------------------------------------------------------------------

export async function updateEmployeeStatus(
  employeeId: string,
  status: 'active' | 'on_leave' | 'terminated',
): Promise<EmployeeActionResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { error } = await supabase
    .from('employees')
    .update({
      status,
      termination_date: status === 'terminated' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', employeeId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/(app)/employees`, 'page')
  return { success: true, employeeId }
}
