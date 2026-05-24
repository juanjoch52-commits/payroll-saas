'use server'

import { revalidatePath } from 'next/cache'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import { W2Pdf, type W2Data } from '@/lib/tax-forms/w2'
import { Form1099NECPdf, type Form1099NECData } from '@/lib/tax-forms/form1099nec'

// =============================================================================
// Server Actions — Tax Forms
// =============================================================================

export type GenerateResult =
  | { success: true; generated: { w2: number; form1099: number } }
  | { success: false; error: string }

/**
 * Genera formularios anuales (W-2 + 1099-NEC) para todos los empleados/contractors
 * de la org en el año dado.
 *
 * Requiere feature `tax_forms` (plan Avanzado o Premium).
 */
export async function generateYearEndForms(taxYear: number): Promise<GenerateResult> {
  const session = await requireSession('/en/login')
  const supabase = createClient()
  const admin = createAdminClient() // para subir PDFs a storage saltándose RLS de path checks

  // 1) Gating de feature
  const enabled = await checkFeature(session.organizationId, 'tax_forms')
  if (!enabled) {
    return { success: false, error: 'Tu plan no incluye generación de reportes fiscales.' }
  }

  // 2) Trae la organization (para datos del employer en los formularios)
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', session.organizationId)
    .single()
  if (!org) return { success: false, error: 'Organization no encontrada.' }

  // 3) Trae todos los empleados con sus payroll_items del año
  const yearStart = `${taxYear}-01-01`
  const yearEnd = `${taxYear}-12-31`

  const { data: items } = await supabase
    .from('payroll_items')
    .select(
      'id, employee_id, gross_cents, federal_tax_cents, social_security_cents, medicare_cents, state_tax_cents, payroll_runs!inner(period_start, organization_id)',
    )
    .eq('organization_id', session.organizationId)
    .gte('payroll_runs.period_start', yearStart)
    .lte('payroll_runs.period_start', yearEnd)

  if (!items || items.length === 0) {
    return { success: false, error: 'No hay payroll items para ese año.' }
  }

  // 4) Trae info de los empleados
  const employeeIds = Array.from(new Set(items.map((i) => i.employee_id)))
  const { data: employees } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_type, tax_id_last_four, address, primary_jurisdiction_code')
    .in('id', employeeIds)

  if (!employees) return { success: false, error: 'No se pudieron cargar los empleados.' }

  // 5) Agrega los totales por empleado
  type Totals = {
    grossCents: number
    federalTaxCents: number
    socialSecurityCents: number
    medicareCents: number
    stateTaxCents: number
  }
  const totalsByEmployee = new Map<string, Totals>()
  for (const it of items) {
    const prev = totalsByEmployee.get(it.employee_id) ?? {
      grossCents: 0,
      federalTaxCents: 0,
      socialSecurityCents: 0,
      medicareCents: 0,
      stateTaxCents: 0,
    }
    totalsByEmployee.set(it.employee_id, {
      grossCents: prev.grossCents + it.gross_cents,
      federalTaxCents: prev.federalTaxCents + it.federal_tax_cents,
      socialSecurityCents: prev.socialSecurityCents + it.social_security_cents,
      medicareCents: prev.medicareCents + it.medicare_cents,
      stateTaxCents: prev.stateTaxCents + it.state_tax_cents,
    })
  }

  // 6) Para cada empleado, genera W-2 o 1099-NEC según employee_type
  let w2Count = 0
  let form1099Count = 0

  for (const emp of employees) {
    const totals = totalsByEmployee.get(emp.id)
    if (!totals) continue

    if (emp.employee_type === 'employee') {
      // W-2: siempre, sin umbral mínimo
      const data: W2Data = {
        taxYear,
        employee: {
          fullName: `${emp.first_name} ${emp.last_name}`,
          taxIdLastFour: emp.tax_id_last_four,
          addressLine1: (emp.address as { line1?: string })?.line1,
          city: (emp.address as { city?: string })?.city,
          region: (emp.address as { region?: string })?.region,
          postalCode: (emp.address as { postalCode?: string })?.postalCode,
        },
        employer: { name: org.name },
        box1WagesCents: totals.grossCents,
        box2FederalTaxCents: totals.federalTaxCents,
        box3SocialSecurityWagesCents: totals.grossCents,
        box4SocialSecurityTaxCents: totals.socialSecurityCents,
        box5MedicareWagesCents: totals.grossCents,
        box6MedicareTaxCents: totals.medicareCents,
        box16StateWagesCents: totals.grossCents,
        box17StateTaxCents: totals.stateTaxCents,
        box15StateCode: emp.primary_jurisdiction_code,
      }
      const pdfBuffer = await renderToBuffer(<W2Pdf data={data} />)
      const path = `${session.organizationId}/${taxYear}/W-2-${emp.id}.pdf`

      const { error: upErr } = await admin.storage
        .from('tax-forms')
        .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
      if (upErr) continue

      await supabase.from('tax_forms').insert({
        organization_id: session.organizationId,
        employee_id: emp.id,
        form_type: 'W-2',
        tax_year: taxYear,
        data: data as unknown as Record<string, unknown>,
        pdf_storage_path: path,
        generated_by: session.userId,
      })
      w2Count++
    } else if (emp.employee_type === 'contractor') {
      // 1099-NEC solo si >= $600 en el año
      if (totals.grossCents < 60000) continue

      const data: Form1099NECData = {
        taxYear,
        payer: { name: org.name },
        recipient: {
          fullName: `${emp.first_name} ${emp.last_name}`,
          tinLastFour: emp.tax_id_last_four,
        },
        box1NonemployeeCompensationCents: totals.grossCents,
        box4FederalTaxWithheldCents: totals.federalTaxCents,
      }
      const pdfBuffer = await renderToBuffer(<Form1099NECPdf data={data} />)
      const path = `${session.organizationId}/${taxYear}/1099-NEC-${emp.id}.pdf`

      const { error: upErr } = await admin.storage
        .from('tax-forms')
        .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
      if (upErr) continue

      await supabase.from('tax_forms').insert({
        organization_id: session.organizationId,
        employee_id: emp.id,
        form_type: '1099-NEC',
        tax_year: taxYear,
        data: data as unknown as Record<string, unknown>,
        pdf_storage_path: path,
        generated_by: session.userId,
      })
      form1099Count++
    }
  }

  revalidatePath('/(app)/reports', 'page')
  return { success: true, generated: { w2: w2Count, form1099: form1099Count } }
}
