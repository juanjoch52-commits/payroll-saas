'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { encryptSecret, decryptSecret, isEncryptionConfigured } from '@/lib/crypto/secretbox'
import { buildNachaFile, type NachaEntry } from '@/lib/payroll/nacha'

export type BankResult = { success: boolean; error?: string }

const bankSchema = z.object({
  routing: z.string().regex(/^\d{9}$/, 'El routing debe ser 9 dígitos.'),
  account: z.string().regex(/^\d{4,17}$/, 'Número de cuenta inválido.'),
  accountType: z.enum(['checking', 'savings']).default('checking'),
})

// ---- Empleado: su cuenta bancaria ------------------------------------------
export async function setEmployeeBankAccount(input: z.input<typeof bankSchema>): Promise<BankResult> {
  const session = await requireSession('/en/login')
  if (!isEncryptionConfigured()) return { success: false, error: 'El servidor no tiene ENCRYPTION_KEY configurada.' }
  const parsed = bankSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No autorizado.' }

  const { error } = await supabase.from('employee_bank_accounts').upsert(
    {
      organization_id: session.organizationId,
      employee_id: (emp as { id: string }).id,
      routing_enc: encryptSecret(d.routing),
      account_enc: encryptSecret(d.account),
      account_type: d.accountType,
      account_last_four: d.account.slice(-4),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)', 'layout')
  return { success: true }
}

// ---- Empresa: cuenta originadora -------------------------------------------
const companySchema = bankSchema.extend({
  companyName: z.string().min(1).max(40),
  companyId: z.string().regex(/^\d{1,10}$/, 'Company ID debe ser hasta 10 dígitos.'),
})

export async function setCompanyBankAccount(input: z.input<typeof companySchema>): Promise<BankResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  if (!isEncryptionConfigured()) return { success: false, error: 'El servidor no tiene ENCRYPTION_KEY configurada.' }
  const parsed = companySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data
  const supabase = createClient()
  const { error } = await supabase.from('company_bank_accounts').upsert({
    organization_id: session.organizationId,
    routing_enc: encryptSecret(d.routing),
    account_enc: encryptSecret(d.account),
    company_name: d.companyName,
    company_id: d.companyId.padStart(10, '0'),
    account_last_four: d.account.slice(-4),
    updated_at: new Date().toISOString(),
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/payments', 'page')
  return { success: true }
}

// ---- Generar archivo NACHA ACH para una payroll run ------------------------
export async function generatePayrollAch(
  runId: string,
): Promise<{ success: true; content: string; filename: string; missing: number } | { success: false; error: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { success: false, error: 'No autorizado.' }
  if (!isEncryptionConfigured()) return { success: false, error: 'El servidor no tiene ENCRYPTION_KEY configurada.' }

  const supabase = createClient()
  const { data: run } = await supabase
    .from('payroll_runs')
    .select('pay_date')
    .eq('id', runId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }

  const { data: items } = await supabase
    .from('payroll_items')
    .select('net_cents, employee_id, employees(first_name, last_name)')
    .eq('payroll_run_id', runId)
    .eq('organization_id', session.organizationId)
  const rows = (items ?? []) as {
    net_cents: number
    employee_id: string
    employees: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  }[]

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('company_bank_accounts')
    .select('routing_enc, account_enc, company_name, company_id')
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  const co = company as
    | { routing_enc: string | null; account_enc: string | null; company_name: string | null; company_id: string | null }
    | null
  if (!co?.routing_enc) return { success: false, error: 'Configura primero la cuenta bancaria de la empresa.' }

  const { data: banks } = await admin
    .from('employee_bank_accounts')
    .select('employee_id, routing_enc, account_enc, account_type')
    .in('employee_id', rows.map((r) => r.employee_id))
    .eq('is_active', true)
  const bankByEmp = new Map(
    ((banks ?? []) as { employee_id: string; routing_enc: string; account_enc: string; account_type: 'checking' | 'savings' }[]).map(
      (b) => [b.employee_id, b],
    ),
  )

  let companyRouting: string
  try {
    companyRouting = decryptSecret(co.routing_enc)
  } catch {
    return { success: false, error: 'No se pudo descifrar la cuenta de la empresa.' }
  }

  const entries: NachaEntry[] = []
  let missing = 0
  for (const it of rows) {
    const b = bankByEmp.get(it.employee_id)
    if (!b) {
      missing++
      continue
    }
    const emp = Array.isArray(it.employees) ? it.employees[0] : it.employees
    try {
      entries.push({
        routingNumber: decryptSecret(b.routing_enc),
        accountNumber: decryptSecret(b.account_enc),
        accountType: b.account_type,
        amountCents: it.net_cents,
        name: emp ? `${emp.first_name} ${emp.last_name}` : 'EMPLOYEE',
      })
    } catch {
      missing++
    }
  }
  if (entries.length === 0) return { success: false, error: 'Ningún empleado tiene cuenta bancaria registrada.' }

  const payDate = (run as { pay_date: string }).pay_date
  const yymmdd = payDate.slice(2).replace(/-/g, '')
  const now = new Date()
  const fileDate = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const fileTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

  const content = buildNachaFile(
    {
      companyName: co.company_name ?? session.organizationName,
      companyId: co.company_id ?? '0000000000',
      originDfi: companyRouting,
      destinationRouting: companyRouting,
      destinationName: 'RECEIVING BANK',
      originName: co.company_name ?? session.organizationName,
      entryDescription: 'PAYROLL',
    },
    entries,
    { effectiveDate: yymmdd, fileDate, fileTime },
  )

  return { success: true, content, filename: `ach-${payDate}.txt`, missing }
}
