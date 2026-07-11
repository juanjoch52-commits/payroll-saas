'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { buildRunSettlements } from '@/lib/subcontractors/settlement-data'
import { SettlementPdf, type SettlementPdfData } from '@/lib/pdf/settlement'

// =============================================================================
// Server Actions — PDF de liquidación de subcontratista (por run + sub raíz)
// =============================================================================
// downloadSettlementPdf: la EMPRESA (manager+) baja la liquidación de
// cualquier sub raíz. downloadMySettlementPdf: el CONTRATISTA logueado baja la
// SUYA (verificado por subcontractors.user_id; lee vía service role scoped).
// =============================================================================

type PdfResult =
  | { success: true; base64: string; filename: string }
  | { success: false; error: string }

type Db = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

async function renderSettlementPdf(
  db: Db,
  organizationId: string,
  payerName: string,
  runId: string,
  rootSubId: string,
): Promise<PdfResult> {
  const { data: run } = await db
    .from('payroll_runs')
    .select('id, period_start, period_end, pay_date')
    .eq('id', runId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!run) return { success: false, error: 'Payroll run no encontrado.' }

  const settlements = await buildRunSettlements(db, organizationId, runId)
  const target = settlements.find((s) => s.rootId === rootSubId)
  if (!target) return { success: false, error: 'Ese subcontratista no tiene items en este run.' }

  const data: SettlementPdfData = {
    payerName,
    rootSubName: target.rootName,
    period: {
      start: (run as { period_start: string }).period_start,
      end: (run as { period_end: string }).period_end,
      payDate: (run as { pay_date: string }).pay_date,
    },
    lines: target.lines.map((l) => ({
      workerName: l.workerName,
      subName: l.subName,
      hours: l.hours,
      payCents: l.payCents,
      billCents: l.billCents,
      marginCents: l.marginCents,
    })),
    subtotalCents: target.subtotalCents,
    taxPct: target.taxPct,
    taxCents: target.taxCents,
    totalCents: target.totalCents,
    payTotalCents: target.payTotalCents,
    marginCents: target.marginCents,
  }

  const buffer = await renderToBuffer(<SettlementPdf data={data} />)
  const safeName = target.rootName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  return {
    success: true,
    base64: Buffer.from(buffer).toString('base64'),
    filename: `settlement-${safeName}-${(run as { pay_date: string }).pay_date}.pdf`,
  }
}

/** Empresa (manager+): liquidación de cualquier sub raíz del run. */
export async function downloadSettlementPdf(runId: string, rootSubId: string): Promise<PdfResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()
  return renderSettlementPdf(supabase, session.organizationId, session.organizationName, runId, rootSubId)
}

/** Contratista logueado: SU liquidación del run (scoped a su vínculo). */
export async function downloadMySettlementPdf(runId: string): Promise<PdfResult> {
  const session = await requireSession('/en/login')
  if (session.role !== 'contractor') {
    return { success: false, error: 'No autorizado.' }
  }

  const admin = createAdminClient()
  const { data: mySub } = await admin
    .from('subcontractors')
    .select('id')
    .eq('organization_id', session.organizationId)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (!mySub) return { success: false, error: 'Tu cuenta no está vinculada a un contratista.' }

  return renderSettlementPdf(
    admin,
    session.organizationId,
    session.organizationName,
    runId,
    (mySub as { id: string }).id,
  )
}
