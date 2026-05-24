import { createAdminClient } from '@/lib/supabase/server'

// =============================================================================
// Audit log helper
// =============================================================================
// Inserta una fila en `audit_logs` con el cambio que acaba de ocurrir.
// Se llama desde Server Actions críticas (createEmployee, approvePayrollRun,
// generateYearEndForms, revokeApiKey, etc.). Usa admin client para que el
// insert no falle por RLS (audit_logs solo permite SELECT a admin/owner).
// =============================================================================

export type AuditEntry = {
  organizationId: string
  actorUserId?: string
  action: string                    // ej. 'employee.create', 'payroll_run.approve'
  targetTable: string
  targetId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      organization_id: entry.organizationId,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId ?? null,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
    })
  } catch (err) {
    // Audit no debe romper la operación. Solo log.
    console.error('[audit] failed:', err)
  }
}
