// =============================================================================
// Feed de liquidaciones de un payroll run (server-only, compartido)
// =============================================================================
// Junta items del run + trabajadores de subcontratistas + bill rates (tabla
// PRIVADA employee_billing — el trabajador nunca la ve) + árbol de subs, y
// devuelve las liquidaciones por sub RAÍZ vía buildSettlements (puro).
// Lo usan: página del run (empresa), PDFs de liquidación y el portal del
// contratista.
// =============================================================================

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { buildSettlements, type Settlement, type SubNode } from '@/lib/subcontractors/tree'

type Db = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

export type RunItemRow = {
  employee_id: string
  hours_worked: number | null
  gross_cents: number
}

/**
 * Liquidaciones del run por sub raíz. `items` es opcional (si el caller ya
 * las tiene cargadas evita el doble query).
 */
export async function buildRunSettlements(
  db: Db,
  organizationId: string,
  runId: string,
  preloadedItems?: RunItemRow[],
): Promise<Settlement[]> {
  let items = preloadedItems
  if (!items) {
    const { data } = await db
      .from('payroll_items')
      .select('employee_id, hours_worked, gross_cents')
      .eq('payroll_run_id', runId)
      .eq('organization_id', organizationId)
    items = (data ?? []) as RunItemRow[]
  }
  if (items.length === 0) return []

  const empIds = items.map((i) => i.employee_id)
  const [{ data: subEmps }, { data: allSubs }, { data: billing }] = await Promise.all([
    db
      .from('employees')
      .select('id, first_name, last_name, subcontractor_id')
      .in('id', empIds)
      .not('subcontractor_id', 'is', null),
    db
      .from('subcontractors')
      .select('id, parent_id, name, sales_tax_pct')
      .eq('organization_id', organizationId),
    db.from('employee_billing').select('employee_id, bill_rate_cents').in('employee_id', empIds),
  ])

  const emps = (subEmps ?? []) as {
    id: string
    first_name: string
    last_name: string
    subcontractor_id: string
  }[]
  if (emps.length === 0) return []

  const billByEmp = new Map(
    ((billing ?? []) as { employee_id: string; bill_rate_cents: number | null }[]).map((b) => [
      b.employee_id,
      b.bill_rate_cents,
    ]),
  )
  const itemByEmp = new Map(items.map((i) => [i.employee_id, i]))

  return buildSettlements(
    emps
      .map((e) => {
        const it = itemByEmp.get(e.id)
        if (!it) return null
        const hours = it.hours_worked != null ? Number(it.hours_worked) : null
        const billRate = billByEmp.get(e.id)
        // Facturado a la empresa: horas × bill rate; sin bill rate (o sin
        // horas) se factura igual al pay → margen 0.
        const billCents =
          billRate && hours != null ? Math.round(hours * Number(billRate)) : it.gross_cents
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
    (allSubs ?? []) as SubNode[],
  )
}
