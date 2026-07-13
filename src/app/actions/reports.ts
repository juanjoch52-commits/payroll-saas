'use server'

import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { toCsv } from '@/lib/reports/csv'

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}
const money = (c: number) => (c / 100).toFixed(2)
type CsvResult = { success: true; content: string; filename: string } | { success: false; error: string }

function name(x: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null) {
  const n = Array.isArray(x) ? x[0] : x
  return n ? `${n.first_name} ${n.last_name}` : ''
}

/** Registro de nómina (payroll register) de una run. */
export async function payrollRegisterCsv(runId: string): Promise<CsvResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('pay_date')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Run no encontrado.' }

  const { data: items } = await supabase
    .from('payroll_items')
    .select(
      'gross_cents, federal_tax_cents, state_tax_cents, local_tax_cents, social_security_cents, medicare_cents, net_cents, tips_cents, employees(first_name, last_name)',
    )
    .eq('payroll_run_id', runId)
    .eq('organization_id', session.organizationId)

  const headers = ['Employee', 'Gross', 'Federal', 'State', 'Local', 'SocialSecurity', 'Medicare', 'Tips', 'Net']
  const rows = (items ?? []).map((i: {
    gross_cents: number
    federal_tax_cents: number
    state_tax_cents: number
    local_tax_cents: number | null
    social_security_cents: number
    medicare_cents: number
    net_cents: number
    tips_cents: number | null
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  }) => [
    name(i.employees),
    money(i.gross_cents),
    money(i.federal_tax_cents),
    money(i.state_tax_cents),
    money(i.local_tax_cents ?? 0),
    money(i.social_security_cents),
    money(i.medicare_cents),
    money(i.tips_cents ?? 0),
    money(i.net_cents),
  ])

  return { success: true, content: toCsv(headers, rows), filename: `payroll-register-${(run as { pay_date: string }).pay_date}.csv` }
}

/** Horas por empleado en un rango (de time_entries aprobadas). */
export async function hoursReportCsv(startDate: string, endDate: string): Promise<CsvResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: entries } = await supabase
    .from('time_entries')
    .select('employee_id, billable_minutes, status, employees(first_name, last_name), worksites(name)')
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .gte('clock_in_at', `${startDate}T00:00:00Z`)
    .lte('clock_in_at', `${endDate}T23:59:59Z`)

  const byEmp = new Map<string, { name: string; minutes: number }>()
  for (const e of (entries ?? []) as {
    employee_id: string
    billable_minutes: number | null
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  }[]) {
    const cur = byEmp.get(e.employee_id) ?? { name: name(e.employees), minutes: 0 }
    cur.minutes += e.billable_minutes ?? 0
    byEmp.set(e.employee_id, cur)
  }

  const headers = ['Employee', 'Hours']
  const rows = [...byEmp.values()].map((v) => [v.name, (v.minutes / 60).toFixed(2)])
  return { success: true, content: toCsv(headers, rows), filename: `hours-${startDate}_${endDate}.csv` }
}

/** Propinas por empleado en un rango. */
export async function tipsReportCsv(startDate: string, endDate: string): Promise<CsvResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: tips } = await supabase
    .from('tip_entries')
    .select('amount_cents, source, work_date, status, employees(first_name, last_name)')
    .eq('organization_id', session.organizationId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  const headers = ['Employee', 'Date', 'Source', 'Status', 'Amount']
  const rows = (tips ?? []).map((tp: {
    amount_cents: number
    source: string
    work_date: string
    status: string
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  }) => [name(tp.employees), tp.work_date, tp.source, tp.status, money(tp.amount_cents)])

  return { success: true, content: toCsv(headers, rows), filename: `tips-${startDate}_${endDate}.csv` }
}
