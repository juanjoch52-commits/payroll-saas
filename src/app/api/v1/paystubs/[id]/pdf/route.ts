import { createElement } from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateUserRequest } from '@/lib/api/user-auth'
import { PaystubPdf, type PaystubData, type PaystubLineItem } from '@/lib/pdf/paystub'

// GET /api/v1/paystubs/[id]/pdf?locale=es → PDF binario del recibo.
type Component = { component_type: string; label: string; amount_cents: number }
type RunRef = { period_start: string; period_end: string; pay_date: string }
type EmpRef = { first_name: string; last_name: string; tax_id_last_four: string | null }

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateUserRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.employeeId) return NextResponse.json({ error: 'No employee profile.' }, { status: 403 })

  const locale = new URL(req.url).searchParams.get('locale') ?? 'en'
  const admin = createAdminClient()

  const { data: item } = await admin
    .from('payroll_items')
    .select(
      'id, gross_cents, net_cents, employees!inner(first_name, last_name, tax_id_last_four), payroll_runs!inner(period_start, period_end, pay_date), payroll_components(component_type, label, amount_cents)',
    )
    .eq('id', params.id)
    .eq('employee_id', auth.employeeId)
    .maybeSingle()

  if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', auth.organizationId)
    .maybeSingle()

  const run = (Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs) as RunRef
  const emp = (Array.isArray(item.employees) ? item.employees[0] : item.employees) as EmpRef
  const comps = (item.payroll_components ?? []) as Component[]
  const toLine = (c: Component): PaystubLineItem => ({ label: c.label, amountCents: c.amount_cents })

  const data: PaystubData = {
    locale,
    employer: { name: (org as { name: string } | null)?.name ?? 'MyJova' },
    employee: { fullName: `${emp.first_name} ${emp.last_name}`, taxIdLastFour: emp.tax_id_last_four },
    period: { start: run.period_start, end: run.period_end, payDate: run.pay_date },
    earnings: comps.filter((c) => c.component_type === 'earning').map(toLine),
    taxes: comps.filter((c) => c.component_type === 'tax').map(toLine),
    deductions: comps.filter((c) => c.component_type === 'deduction').map(toLine),
    grossCents: item.gross_cents,
    netCents: item.net_cents,
  }

  const element = createElement(PaystubPdf, { data }) as unknown as Parameters<
    typeof renderToBuffer
  >[0]
  const buffer = await renderToBuffer(element)
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="paystub-${run.pay_date}.pdf"`,
    },
  })
}
