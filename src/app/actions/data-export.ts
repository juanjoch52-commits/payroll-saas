'use server'

import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Action — Export de datos del tenant (GDPR / CCPA portabilidad)
// =============================================================================
// Vuelca los datos de negocio de la organización a un único JSON descargable.
// Solo owner/admin. Usa el cliente RLS: cada SELECT queda automáticamente
// acotado a la org del usuario por las políticas de seguridad.
//
// EXCLUIDO a propósito (secretos / credenciales / datos globales):
//   employee_bank_accounts, company_bank_accounts, employee_pins, api_keys,
//   integrations (tokens), webhook_endpoints (secrets), push tokens, etc.
// Los archivos binarios (documentos, fotos) viven en Storage y no se incluyen.
// =============================================================================

export type ExportResult =
  | { success: true; filename: string; content: string }
  | { success: false; error: string }

// Allowlist de tablas de negocio. RLS las acota a la org del caller.
const EXPORT_TABLES = [
  'memberships',
  'employees',
  'pay_schemes',
  'departments',
  'worksites',
  'jobs',
  'shifts',
  'shift_swaps',
  'availability',
  'time_entries',
  'production_entries',
  'tip_entries',
  'employee_deductions',
  'payroll_runs',
  'payroll_items',
  'payroll_components',
  'pto_policies',
  'pto_balances',
  'time_off_requests',
  'documents',
  'document_signatures',
  'announcements',
  'team_messages',
  'notifications',
  'tax_forms',
  'tax_filings',
  'support_tickets',
  'invitations',
] as const

export async function exportTenantData(): Promise<ExportResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No autorizado. Solo owner/admin pueden exportar.' }
  }
  const supabase = createClient()

  // Org (por id, no organization_id).
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', session.organizationId)
    .maybeSingle()

  const slug = (organization as { slug?: string } | null)?.slug ?? session.organizationId

  // Cada tabla en paralelo. Errores (p.ej. tabla sin RLS de lectura) → [].
  const entries = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*').limit(50000)
      return [table, error ? [] : data ?? []] as const
    }),
  )

  const dump = {
    _meta: {
      generatedAt: new Date().toISOString(),
      organizationId: session.organizationId,
      format: 'myjova-tenant-export',
      version: 1,
      note: 'Excludes encrypted credentials (bank accounts, PINs, API keys, integration tokens, webhook secrets) and binary files stored in object storage.',
    },
    organization: organization ?? null,
    ...Object.fromEntries(entries),
  }

  const date = new Date().toISOString().slice(0, 10)
  return {
    success: true,
    filename: `myjova-export-${slug}-${date}.json`,
    content: JSON.stringify(dump, null, 2),
  }
}
