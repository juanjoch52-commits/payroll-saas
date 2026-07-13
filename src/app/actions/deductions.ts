'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}
export type DeductionResult = { success: boolean; error?: string }

const schema = z.object({
  employeeId: z.string().uuid(),
  label: z.string().min(1).max(60),
  code: z.string().min(1).max(40),
  amountCents: z.coerce.number().int().min(0),
  preTax: z.coerce.boolean().default(false),
})

export async function addDeduction(input: z.input<typeof schema>): Promise<DeductionResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('employee_deductions').insert({
    organization_id: session.organizationId,
    employee_id: d.employeeId,
    label: d.label,
    code: d.code,
    amount_cents: d.amountCents,
    pre_tax: d.preTax,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/deductions', 'page')
  return { success: true }
}

export async function removeDeduction(id: string): Promise<DeductionResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('employee_deductions')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/deductions', 'page')
  return { success: true }
}
