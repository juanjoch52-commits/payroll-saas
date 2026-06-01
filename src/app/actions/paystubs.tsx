'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { PaystubPdf, type PaystubData, type PaystubLineItem } from '@/lib/pdf/paystub'

// =============================================================================
// Server Action — descarga de recibo de pago (PDF)
// =============================================================================
// RLS hace el control de acceso: un empleado solo puede traer su propio item;
// manager+ pueden traer cualquiera de su org. Devolvemos base64 para que el
// cliente lo descargue sin exponer una URL pública.
// =============================================================================

type Component = { component_type: string; code: string; label: string; amount_cents: number }
type RunRef = { period_start: string; period_end: string; pay_date: string }
type EmpRef = { first_name: string; last_name: string; tax_id_last_four: string | null }

export async function downloadPaystubPdf(
  itemId: string,
  locale: string,
): Promise<{ success: true; base64: string; filename: string } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  const supabase = createClient()

  const { data: item, error } = await supabase
    .from('payroll_items')
    .select(
      'id, gross_cents, net_cents, employees!inner(first_name, last_name, tax_id_last_four), payroll_runs!inner(period_start, period_end, pay_date), payroll_components(component_type, code, label, amount_cents)',
    )
    .eq('id', itemId)
    .eq('organization_id', session.organizationId)
    .single()

  if (error || !item) return { success: false, error: 'Recibo no encontrado.' }

  const run = (Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs) as RunRef
  const emp = (Array.isArray(item.employees) ? item.employees[0] : item.employees) as EmpRef
  const comps = (item.payroll_components ?? []) as Component[]

  const toLine = (c: Component): PaystubLineItem => ({ label: c.label, amountCents: c.amount_cents })
  const earnings = comps.filter((c) => c.component_type === 'earning').map(toLine)
  const taxes = comps.filter((c) => c.component_type === 'tax').map(toLine)
  const deductions = comps.filter((c) => c.component_type === 'deduction').map(toLine)

  const data: PaystubData = {
    locale,
    employer: { name: session.organizationName },
    employee: {
      fullName: `${emp.first_name} ${emp.last_name}`,
      taxIdLastFour: emp.tax_id_last_four,
    },
    period: { start: run.period_start, end: run.period_end, payDate: run.pay_date },
    earnings,
    taxes,
    deductions,
    grossCents: item.gross_cents,
    netCents: item.net_cents,
  }

  const buffer = await renderToBuffer(<PaystubPdf data={data} />)
  const filename = `paystub-${run.pay_date}.pdf`
  return { success: true, base64: Buffer.from(buffer).toString('base64'), filename }
}
