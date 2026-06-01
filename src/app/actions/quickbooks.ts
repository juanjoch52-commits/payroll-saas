'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { checkFeature } from '@/lib/auth/checkFeature'
import { authorizeUrl, signState, isQuickBooksConfigured } from '@/lib/integrations/quickbooks/client'
import { pushPayrollRun, syncEmployees } from '@/lib/integrations/quickbooks/sync'
import { sumTotals, type PayrollItemTotals } from '@/lib/integrations/quickbooks/mapping'
import { buildIif, buildCsv } from '@/lib/integrations/quickbooks/iif'
import type { AccountMapping } from '@/lib/integrations/quickbooks/types'

// =============================================================================
// Server Actions — QuickBooks (owner/admin, gated por quickbooks_integration)
// =============================================================================

async function gate(): Promise<
  | { ok: true; orgId: string }
  | { ok: false; error: string }
> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) return { ok: false, error: 'No autorizado.' }
  const has = await checkFeature(session.organizationId, 'quickbooks_integration')
  if (!has) return { ok: false, error: 'Tu plan no incluye la integración con QuickBooks.' }
  return { ok: true, orgId: session.organizationId }
}

function toMMDDYYYY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export async function connectQuickBooks(
  locale: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  if (!isQuickBooksConfigured()) {
    return {
      success: false,
      error: 'QuickBooks no está configurado en el servidor (faltan llaves de Intuit + ENCRYPTION_KEY).',
    }
  }
  return { success: true, url: authorizeUrl(signState(g.orgId, locale)) }
}

export async function disconnectQuickBooks(): Promise<{ success: boolean; error?: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const admin = createAdminClient()
  await admin
    .from('integrations')
    .update({ status: 'disconnected', credentials_encrypted: null })
    .eq('organization_id', g.orgId)
    .eq('provider', 'quickbooks')
  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true }
}

export async function setAccountMapping(
  mapping: AccountMapping,
): Promise<{ success: boolean; error?: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('integrations')
    .select('config')
    .eq('organization_id', g.orgId)
    .eq('provider', 'quickbooks')
    .maybeSingle()

  if (existing) {
    const prev = (existing as { config: Record<string, unknown> | null }).config ?? {}
    await admin
      .from('integrations')
      .update({ config: { ...prev, accountMapping: mapping } })
      .eq('organization_id', g.orgId)
      .eq('provider', 'quickbooks')
  } else {
    await admin.from('integrations').insert({
      organization_id: g.orgId,
      provider: 'quickbooks',
      status: 'disconnected',
      config: { accountMapping: mapping },
    })
  }
  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true }
}

export async function syncPayrollRunNow(runId: string) {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const res = await pushPayrollRun(g.orgId, runId)
  revalidatePath('/(app)/settings/integrations', 'page')
  return res
}

export async function syncEmployeesNow() {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const res = await syncEmployees(g.orgId)
  revalidatePath('/(app)/settings/integrations', 'page')
  return res
}

async function exportTotals(orgId: string, runId: string) {
  const supabase = createClient()
  const { data: run } = await supabase
    .from('payroll_runs')
    .select('pay_date')
    .eq('id', runId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!run) return null
  const { data: items } = await supabase
    .from('payroll_items')
    .select(
      'gross_cents, net_cents, federal_tax_cents, social_security_cents, medicare_cents, state_tax_cents, other_deductions_cents',
    )
    .eq('payroll_run_id', runId)
    .eq('organization_id', orgId)
  return {
    payDate: (run as { pay_date: string }).pay_date,
    totals: sumTotals((items ?? []) as PayrollItemTotals[]),
  }
}

export async function exportPayrollIif(
  runId: string,
): Promise<{ success: true; content: string; filename: string } | { success: false; error: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const data = await exportTotals(g.orgId, runId)
  if (!data) return { success: false, error: 'Payroll run no encontrado.' }
  return {
    success: true,
    content: buildIif(data.totals, toMMDDYYYY(data.payDate)),
    filename: `payroll-${data.payDate}.iif`,
  }
}

export async function exportPayrollCsv(
  runId: string,
): Promise<{ success: true; content: string; filename: string } | { success: false; error: string }> {
  const g = await gate()
  if (!g.ok) return { success: false, error: g.error }
  const data = await exportTotals(g.orgId, runId)
  if (!data) return { success: false, error: 'Payroll run no encontrado.' }
  return {
    success: true,
    content: buildCsv(data.totals),
    filename: `payroll-${data.payDate}.csv`,
  }
}
