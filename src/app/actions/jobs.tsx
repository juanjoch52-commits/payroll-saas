'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { Wh347Pdf, type Wh347Data, type Wh347Worker } from '@/lib/tax-forms/wh347'

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}

export type JobResult = { success: boolean; error?: string }

const jobSchema = z.object({
  name: z.string().min(1).max(120),
  worksiteId: z.string().uuid().optional().or(z.literal('')),
  contractNumber: z.string().max(60).optional(),
  prevailingWage: z.coerce.boolean().default(false),
})

export async function createJob(input: z.input<typeof jobSchema>): Promise<JobResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = jobSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('jobs').insert({
    organization_id: session.organizationId,
    name: d.name,
    worksite_id: d.worksiteId || null,
    contract_number: d.contractNumber || null,
    prevailing_wage: d.prevailingWage,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/jobs', 'page')
  return { success: true }
}

export async function deleteJob(id: string): Promise<JobResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/jobs', 'page')
  return { success: true }
}

export async function generateWh347(
  jobId: string,
  weekStartISO: string,
): Promise<{ success: true; base64: string; filename: string } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('name, worksite_id, contract_number')
    .eq('id', jobId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!job) return { success: false, error: 'Job no encontrado.' }
  const j = job as { name: string; worksite_id: string | null; contract_number: string | null }

  const start = new Date(weekStartISO + 'T00:00:00')
  const end = new Date(start.getTime() + 7 * 86400000)

  let q = supabase
    .from('time_entries')
    .select('employee_id, clock_in_at, billable_minutes, employees(first_name, last_name, job_title)')
    .eq('organization_id', session.organizationId)
    .eq('status', 'approved')
    .gte('clock_in_at', start.toISOString())
    .lt('clock_in_at', end.toISOString())
  q = j.worksite_id ? q.or(`job_id.eq.${jobId},worksite_id.eq.${j.worksite_id}`) : q.eq('job_id', jobId)
  const { data: entries } = await q

  type EmpRef = { first_name: string; last_name: string; job_title: string | null }
  type Acc = { name: string; classification: string; hoursByDay: number[]; totalMin: number }
  const byEmp = new Map<string, Acc>()
  for (const e of (entries ?? []) as {
    employee_id: string
    clock_in_at: string
    billable_minutes: number | null
    employees: EmpRef | EmpRef[] | null
  }[]) {
    const emp = Array.isArray(e.employees) ? e.employees[0] : e.employees
    const cur =
      byEmp.get(e.employee_id) ??
      {
        name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        classification: emp?.job_title || 'Laborer',
        hoursByDay: [0, 0, 0, 0, 0, 0, 0],
        totalMin: 0,
      }
    const day = Math.min(6, Math.max(0, Math.floor((new Date(e.clock_in_at).getTime() - start.getTime()) / 86400000)))
    const min = e.billable_minutes ?? 0
    cur.hoursByDay[day] += min / 60
    cur.totalMin += min
    byEmp.set(e.employee_id, cur)
  }

  const empIds = [...byEmp.keys()]
  const { data: schemes } = empIds.length
    ? await supabase
        .from('pay_schemes')
        .select('employee_id, config')
        .eq('organization_id', session.organizationId)
        .eq('scheme_type', 'hourly')
        .is('effective_to', null)
        .in('employee_id', empIds)
    : { data: [] }
  const rateByEmp = new Map<string, number>()
  for (const s of (schemes ?? []) as { employee_id: string; config: { rateCents?: number } }[]) {
    if (s.config?.rateCents) rateByEmp.set(s.employee_id, s.config.rateCents)
  }

  const workers: Wh347Worker[] = [...byEmp.entries()].map(([id, w]) => {
    const totalHours = w.totalMin / 60
    const rateCents = rateByEmp.get(id) ?? 0
    return {
      name: w.name,
      classification: w.classification,
      hoursByDay: w.hoursByDay,
      totalHours,
      rateCents,
      grossCents: Math.round(totalHours * rateCents),
    }
  })

  const data: Wh347Data = {
    contractor: session.organizationName,
    projectName: j.name,
    contractNumber: j.contract_number ?? undefined,
    weekStart: weekStartISO,
    weekEnd: new Date(start.getTime() + 6 * 86400000).toISOString().slice(0, 10),
    workers,
  }

  const buffer = await renderToBuffer(<Wh347Pdf data={data} />)
  return {
    success: true,
    base64: Buffer.from(buffer).toString('base64'),
    filename: `wh347-${weekStartISO}.pdf`,
  }
}
