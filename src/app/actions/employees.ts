'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { employeeSchema, parsePaySchemeJson } from '@/lib/validators/employee'
import { encryptSecret, isEncryptionConfigured } from '@/lib/crypto/secretbox'

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

  // 3) Sesión activa + suscripción vigente (trial enforcement)
  const session = await requireSession('/en/login')
  const { requireActiveSubscription } = await import('@/lib/auth/subscription')
  const gateErr = await requireActiveSubscription(session.organizationId)
  if (gateErr) return gateErr
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

  // 5) Esquemas que requieren feature del plan (daily/commission/piecerate).
  const gatedFeatureByScheme: Record<string, string> = {
    daily: 'payroll_daily',
    commission: 'payroll_commission',
    piecerate: 'payroll_piecerate',
  }
  const requiredFeature = gatedFeatureByScheme[paySchemeConfig.type]
  if (requiredFeature) {
    const { data: hasFeature } = await supabase.rpc('check_plan_feature', {
      org_id: session.organizationId,
      feature_key: requiredFeature,
    })
    if (!hasFeature) {
      return {
        success: false,
        error: `Tu plan actual no permite el esquema de pago "${paySchemeConfig.type}".`,
      }
    }
  }

  // 6) Insertar employee + pay_scheme en transacción lógica.
  // El SSN/Tax ID completo se cifra con AES-256-GCM (ENCRYPTION_KEY) y se guarda
  // en tax_id_encrypted; en plano solo se conservan los últimos 4. Si no hay
  // ENCRYPTION_KEY configurada, degradamos a solo-last4 (no se guarda el SSN).
  const taxIdDigits = (input.taxId ?? '').replace(/\D/g, '')
  const taxIdLastFour = taxIdDigits.length >= 4 ? taxIdDigits.slice(-4) : null
  const taxIdEncrypted =
    taxIdDigits.length >= 9 && isEncryptionConfigured() ? encryptSecret(taxIdDigits) : null

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
      locality_code: input.localityCode || null,
      subcontractor_id: input.subcontractorId || null,
      bill_rate_cents: input.billRateHourly != null ? Math.round(input.billRateHourly * 100) : null,
      tax_id_encrypted: taxIdEncrypted,
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

  const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
  await dispatchWebhook(session.organizationId, 'employee.created', {
    employeeId: employee.id,
    name: `${input.firstName} ${input.lastName}`,
    employeeType: input.employeeType,
  })

  revalidatePath(`/(app)/employees`, 'page')
  return { success: true, employeeId: employee.id }
}

// -----------------------------------------------------------------------------

const editSchema = employeeSchema.omit({ paySchemeJson: true })

/**
 * Edita los datos de un empleado existente (personales, fiscales, W-4,
 * jurisdicción, localidad). El pay scheme NO se edita aquí — cambiarlo requiere
 * versionado en pay_schemes (effective_from/to) y se hará como flujo aparte.
 * Si llega un taxId nuevo se re-cifra; vacío = no tocar el almacenado.
 */
export async function updateEmployee(
  employeeId: string,
  formData: FormData,
): Promise<EmployeeActionResult> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()

  const patch: Record<string, unknown> = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    hire_date: input.hireDate,
    employee_type: input.employeeType,
    job_title: input.jobTitle || null,
    primary_jurisdiction_code: input.primaryJurisdictionCode,
    locality_code: input.localityCode || null,
    subcontractor_id: input.subcontractorId || null,
    bill_rate_cents: input.billRateHourly != null ? Math.round(input.billRateHourly * 100) : null,
    w4_filing_status: input.w4FilingStatus,
    w4_dependents: input.w4Dependents,
    address: input.address,
  }

  // SSN nuevo (opcional): re-cifrar + actualizar last4. Vacío → conservar.
  const taxIdDigits = (input.taxId ?? '').replace(/\D/g, '')
  if (taxIdDigits.length >= 9) {
    patch.tax_id_last_four = taxIdDigits.slice(-4)
    patch.tax_id_encrypted = isEncryptionConfigured() ? encryptSecret(taxIdDigits) : null
  }

  const { error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', employeeId)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }

  const { audit } = await import('@/lib/audit')
  await audit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: 'employee.update',
    targetTable: 'employees',
    targetId: employeeId,
    newData: { name: `${input.firstName} ${input.lastName}` },
  })

  revalidatePath(`/(app)/employees`, 'page')
  return { success: true, employeeId }
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

  // Offboarding: al terminar, revocar acceso al portal y al kiosko.
  // Solo se elimina la membership con rol 'employee' (no toca a un owner/admin
  // que además figure como empleado). Best-effort — no bloquea la terminación.
  if (status === 'terminated') {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .eq('organization_id', session.organizationId)
        .maybeSingle()
      const userId = (emp as { user_id: string | null } | null)?.user_id
      const { createAdminClient } = await import('@/lib/supabase/server')
      const admin = createAdminClient()
      if (userId) {
        await admin
          .from('memberships')
          .delete()
          .eq('organization_id', session.organizationId)
          .eq('user_id', userId)
          .eq('role', 'employee')
      }
      await admin.from('employee_pins').delete().eq('employee_id', employeeId)

      const { audit } = await import('@/lib/audit')
      await audit({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: 'employee.offboard',
        targetTable: 'employees',
        targetId: employeeId,
      })
    } catch {
      // La revocación es best-effort; el estado ya quedó como terminated.
    }
  }

  revalidatePath(`/(app)/employees`, 'page')
  return { success: true, employeeId }
}
