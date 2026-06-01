import { createAdminClient } from '@/lib/supabase/server'
import { encryptJson, decryptJson } from '@/lib/crypto/secretbox'
import { isQuickBooksConfigured, qboApiFetch } from './client'
import { sumTotals, buildJournalEntry, isMappingComplete, type PayrollItemTotals } from './mapping'
import { stubPushResult, stubEmployeeResult } from './stub'
import type { QboTokens, QboConfig } from './types'

// =============================================================================
// Orquestación de QuickBooks: cargar/guardar tokens cifrados, postear nómina
// como JournalEntry, sincronizar empleados. Degrada a stub si no hay conexión.
// =============================================================================

type IntegrationRow = {
  id: string
  status: string
  credentials_encrypted: string | null
  config: QboConfig | null
}

export type SyncResult =
  | { success: true; mock: boolean; message: string }
  | { success: false; error: string }

export async function getQboIntegration(orgId: string): Promise<IntegrationRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('integrations')
    .select('id, status, credentials_encrypted, config')
    .eq('organization_id', orgId)
    .eq('provider', 'quickbooks')
    .maybeSingle()
  return (data as IntegrationRow | null) ?? null
}

async function saveTokens(orgId: string, tokens: QboTokens) {
  const admin = createAdminClient()
  await admin
    .from('integrations')
    .update({ credentials_encrypted: encryptJson(tokens), updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('provider', 'quickbooks')
}

async function markSynced(orgId: string) {
  const admin = createAdminClient()
  await admin
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString(), last_error: null })
    .eq('organization_id', orgId)
    .eq('provider', 'quickbooks')
}

async function markError(orgId: string, error: string) {
  const admin = createAdminClient()
  await admin
    .from('integrations')
    .update({ last_error: error.slice(0, 500) })
    .eq('organization_id', orgId)
    .eq('provider', 'quickbooks')
}

function isConnected(integration: IntegrationRow | null): boolean {
  return Boolean(
    isQuickBooksConfigured() &&
      integration &&
      integration.status === 'active' &&
      integration.credentials_encrypted,
  )
}

/** Postea una payroll run como JournalEntry en QBO (o stub). */
export async function pushPayrollRun(orgId: string, runId: string): Promise<SyncResult> {
  const admin = createAdminClient()

  const { data: run } = await admin
    .from('payroll_runs')
    .select('pay_date')
    .eq('id', runId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }

  const { data: items } = await admin
    .from('payroll_items')
    .select(
      'gross_cents, net_cents, federal_tax_cents, social_security_cents, medicare_cents, state_tax_cents, other_deductions_cents',
    )
    .eq('payroll_run_id', runId)
    .eq('organization_id', orgId)

  const totals = sumTotals((items ?? []) as PayrollItemTotals[])
  const integration = await getQboIntegration(orgId)

  if (!isConnected(integration)) {
    const stub = stubPushResult(runId)
    await markSynced(orgId)
    return {
      success: true,
      mock: true,
      message: `Asiento simulado ${stub.id} (QuickBooks no conectado).`,
    }
  }

  const tokens = decryptJson<QboTokens>(integration!.credentials_encrypted)
  if (!tokens) return { success: false, error: 'No se pudieron leer las credenciales de QuickBooks.' }

  const mapping = integration!.config?.accountMapping ?? {}
  if (!isMappingComplete(mapping)) {
    return { success: false, error: 'Faltan cuentas de QuickBooks por mapear en Ajustes.' }
  }

  const je = buildJournalEntry(totals, mapping, (run as { pay_date: string }).pay_date)
  try {
    const { json, tokens: newTokens } = await qboApiFetch(tokens, '/journalentry', {
      method: 'POST',
      body: JSON.stringify(je),
    })
    await saveTokens(orgId, newTokens)
    await markSynced(orgId)
    const id = (json as { JournalEntry?: { Id?: string } })?.JournalEntry?.Id ?? 'created'
    return { success: true, mock: false, message: `QuickBooks journal entry ${id} creado.` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de QuickBooks.'
    await markError(orgId, msg)
    return { success: false, error: msg }
  }
}

/** Sincroniza empleados a QBO (crea Employee, guarda external_employee_id). */
export async function syncEmployees(orgId: string): Promise<SyncResult> {
  const admin = createAdminClient()
  const { data: employees } = await admin
    .from('employees')
    .select('id, first_name, last_name, external_employee_id')
    .eq('organization_id', orgId)
    .eq('status', 'active')

  type EmpRow = {
    id: string
    first_name: string
    last_name: string
    external_employee_id: string | null
  }
  const emps = (employees ?? []) as EmpRow[]
  const integration = await getQboIntegration(orgId)

  if (!isConnected(integration)) {
    for (const e of emps) {
      if (!e.external_employee_id) {
        await admin
          .from('employees')
          .update({ external_employee_id: stubEmployeeResult(e.id).qboId })
          .eq('id', e.id)
      }
    }
    await markSynced(orgId)
    return { success: true, mock: true, message: `${emps.length} empleados (simulado).` }
  }

  let tokens = decryptJson<QboTokens>(integration!.credentials_encrypted)
  if (!tokens) return { success: false, error: 'Credenciales ilegibles.' }

  let count = 0
  try {
    for (const e of emps) {
      if (e.external_employee_id) continue
      const { json, tokens: nt } = await qboApiFetch(tokens, '/employee', {
        method: 'POST',
        body: JSON.stringify({ GivenName: e.first_name, FamilyName: e.last_name }),
      })
      tokens = nt
      const qboId = (json as { Employee?: { Id?: string } })?.Employee?.Id
      if (qboId) {
        await admin.from('employees').update({ external_employee_id: qboId }).eq('id', e.id)
        count++
      }
    }
    await saveTokens(orgId, tokens)
    await markSynced(orgId)
    return { success: true, mock: false, message: `${count} empleados sincronizados.` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de QuickBooks.'
    await markError(orgId, msg)
    return { success: false, error: msg }
  }
}
