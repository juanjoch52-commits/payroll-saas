'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { buildSettlements } from '@/lib/subcontractors/tree'
import { SettlementPdf, type SettlementPdfData } from '@/lib/pdf/settlement'

// =============================================================================
// Server Action — PDF de liquidación de subcontratista (por run + sub raíz)
// =============================================================================

export async function downloadSettlementPdf(
  runId: string,
  rootSubId: string,
): Promise<{ success: true; base64: string; filename: string } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }

  const { data: items } = await supabase
    .from('payroll_items')
    .select('employee_id, hours_worked, gross_cents')
    .eq('payroll_run_id', runId)
  if (!items || items.length === 0) return { success: false, error: 'El run no tiene items.' }

  const [{ data: subEmps }, { data: allSubs }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name, last_name, subcontractor_id, bill_rate_cents')
      .in('id', items.map((i: { employee_id: string }) => i.employee_id))
      .not('subcontractor_id', 'is', null),
    supabase
      .from('subcontractors')
      .select('id, parent_id, name, sales_tax_pct')
      .eq('organization_id', session.organizationId),
  ])

  const itemByEmp = new Map(
    items.map((i: { employee_id: string; hours_worked: number | null; gross_cents: number }) => [
      i.employee_id,
      i,
    ]),
  )
  const settlements = buildSettlements(
    ((subEmps ?? []) as {
      id: string
      first_name: string
      last_name: string
      subcontractor_id: string
      bill_rate_cents: number | null
    }[])
      .map((e) => {
        const it = itemByEmp.get(e.id)
        if (!it) return null
        const hours = it.hours_worked != null ? Number(it.hours_worked) : null
        const billCents =
          e.bill_rate_cents && hours != null
            ? Math.round(hours * Number(e.bill_rate_cents))
            : it.gross_cents
        return {
          employeeId: e.id,
          workerName: `${e.first_name} ${e.last_name}`,
          subcontractorId: e.subcontractor_id,
          hours,
          payCents: it.gross_cents,
          billCents,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    (allSubs ?? []) as import('@/lib/subcontractors/tree').SubNode[],
  )

  const target = settlements.find((s) => s.rootId === rootSubId)
  if (!target) return { success: false, error: 'Ese subcontratista no tiene items en este run.' }

  const data: SettlementPdfData = {
    payerName: session.organizationName,
    rootSubName: target.rootName,
    period: {
      start: (run as { period_start: string }).period_start,
      end: (run as { period_end: string }).period_end,
      payDate: (run as { pay_date: string }).pay_date,
    },
    lines: target.lines.map((l) => ({
      workerName: l.workerName,
      subName: l.subName,
      hours: l.hours,
      payCents: l.payCents,
      billCents: l.billCents,
      marginCents: l.marginCents,
    })),
    subtotalCents: target.subtotalCents,
    taxPct: target.taxPct,
    taxCents: target.taxCents,
    totalCents: target.totalCents,
    payTotalCents: target.payTotalCents,
    marginCents: target.marginCents,
  }

  const buffer = await renderToBuffer(<SettlementPdf data={data} />)
  const safeName = target.rootName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  return {
    success: true,
    base64: Buffer.from(buffer).toString('base64'),
    filename: `settlement-${safeName}-${(run as { pay_date: string }).pay_date}.pdf`,
  }
}
