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

// -----------------------------------------------------------------------------
// CSV anual (ingresos/gastos por contratista) — lee de settlement_records
// -----------------------------------------------------------------------------

async function settlementsCsvFor(
  db: Db,
  organizationId: string,
  subcontractorId: string,
  rootName: string,
  year: number,
): Promise<PdfResult> {
  const { data: records } = await db
    .from('settlement_records')
    .select(
      'payroll_run_id, subcontractor_id, period_start, period_end, pay_date, subtotal_cents, tax_pct, tax_cents, total_cents, pay_total_cents, margin_cents',
    )
    .eq('subcontractor_id', subcontractorId)
    .eq('organization_id', organizationId)
  const rows = (records ?? []) as import('@/lib/subcontractors/annual').SettlementRecordRow[]
  if (rows.length === 0) {
    return { success: false, error: 'No hay liquidaciones registradas para exportar.' }
  }
  const { annualCsv } = await import('@/lib/subcontractors/annual')
  const csv = annualCsv(rootName, rows, year)
  const safeName = rootName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
  return {
    success: true,
    base64: Buffer.from(csv, 'utf8').toString('base64'),
    filename: `settlements-${safeName}-${year}.csv`,
  }
}

/** Contratista: CSV anual de SUS ingresos/gastos (para su contador). */
export async function downloadMySettlementsCsv(year: number): Promise<PdfResult> {
  const session = await requireSession('/en/login')
  if (session.role !== 'contractor') return { success: false, error: 'No autorizado.' }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { success: false, error: 'Año inválido.' }
  }

  const admin = createAdminClient()
  const { data: mySub } = await admin
    .from('subcontractors')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('user_id', session.userId)
    .maybeSingle()
  if (!mySub) return { success: false, error: 'Tu cuenta no está vinculada a un contratista.' }
  const sub = mySub as { id: string; name: string }
  return settlementsCsvFor(admin, session.organizationId, sub.id, sub.name, year)
}

/** Empresa (manager+): CSV anual de un contratista raíz. */
export async function downloadContractorSettlementsCsv(
  subcontractorId: string,
  year: number,
): Promise<PdfResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { success: false, error: 'Año inválido.' }
  }
  const supabase = createClient()
  const { data: sub } = await supabase
    .from('subcontractors')
    .select('id, name')
    .eq('id', subcontractorId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!sub) return { success: false, error: 'Contratista no encontrado.' }
  const s = sub as { id: string; name: string }
  return settlementsCsvFor(supabase, session.organizationId, s.id, s.name, year)
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

// -----------------------------------------------------------------------------
// FACTURA formal (sub raíz → empresa) — SOLO desde settlement_records congelados
// -----------------------------------------------------------------------------
// A diferencia del settlement PDF (documento interno con pay/margen), la
// factura muestra SOLO el lado facturado + HST, con la identidad fiscal del
// sub. Existe únicamente después de aprobar la nómina (registro congelado).
// -----------------------------------------------------------------------------

async function renderInvoicePdf(
  db: Db,
  organizationId: string,
  payerName: string,
  runId: string,
  rootSubId: string,
): Promise<PdfResult> {
  const { data: recRow } = await db
    .from('settlement_records')
    .select(
      'id, period_start, period_end, pay_date, subtotal_cents, tax_pct, tax_cents, total_cents, lines, invoice_number, created_at',
    )
    .eq('organization_id', organizationId)
    .eq('payroll_run_id', runId)
    .eq('subcontractor_id', rootSubId)
    .maybeSingle()
  if (!recRow) {
    return {
      success: false,
      error: 'La factura se genera al aprobar la nómina (aún no hay registro congelado).',
    }
  }
  const rec = recRow as {
    id: string
    period_start: string
    period_end: string
    pay_date: string
    subtotal_cents: number
    tax_pct: number
    tax_cents: number
    total_cents: number
    lines: import('@/lib/subcontractors/tree').SettlementLine[]
    invoice_number: string | null
    created_at: string
  }

  // Numeración perezosa: records congelados antes de la migración INV (o si
  // falló la numeración al aprobar) reciben su número en el primer download.
  let invoiceNumber = rec.invoice_number
  if (!invoiceNumber) {
    const admin = createAdminClient()
    const year = Number(rec.pay_date.slice(0, 4))
    const { formatInvoiceNumber } = await import('@/lib/subcontractors/invoice')
    const { data: n } = await admin.rpc('next_invoice_number', {
      p_organization_id: organizationId,
      p_year: year,
    })
    if (typeof n !== 'number') {
      return { success: false, error: 'No se pudo asignar número de factura.' }
    }
    invoiceNumber = formatInvoiceNumber(year, n)
    await admin
      .from('settlement_records')
      .update({ invoice_number: invoiceNumber })
      .eq('id', rec.id)
  }

  const { data: subRow } = await db
    .from('subcontractors')
    .select('name, business_legal_name, tax_number, address')
    .eq('id', rootSubId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!subRow) return { success: false, error: 'Contratista no encontrado.' }
  const sub = subRow as {
    name: string
    business_legal_name: string | null
    tax_number: string | null
    address: string | null
  }

  const { invoiceLines } = await import('@/lib/subcontractors/invoice')
  const { InvoicePdf } = await import('@/lib/pdf/invoice')

  const buffer = await renderToBuffer(
    <InvoicePdf
      data={{
        invoiceNumber,
        issueDate: rec.created_at.slice(0, 10),
        payDate: rec.pay_date,
        periodStart: rec.period_start,
        periodEnd: rec.period_end,
        from: {
          name: sub.name,
          businessLegalName: sub.business_legal_name,
          taxNumber: sub.tax_number,
          address: sub.address,
        },
        billTo: { name: payerName },
        lines: invoiceLines(rec.lines ?? []),
        subtotalCents: rec.subtotal_cents,
        taxPct: Number(rec.tax_pct),
        taxCents: rec.tax_cents,
        totalCents: rec.total_cents,
      }}
    />,
  )
  return {
    success: true,
    base64: Buffer.from(buffer).toString('base64'),
    filename: `${invoiceNumber}.pdf`,
  }
}

/** Empresa (manager+): factura del sub raíz para un run aprobado. */
export async function downloadSettlementInvoicePdf(
  runId: string,
  rootSubId: string,
): Promise<PdfResult> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }
  const supabase = createClient()
  return renderInvoicePdf(
    supabase,
    session.organizationId,
    session.organizationName,
    runId,
    rootSubId,
  )
}

/** Contratista logueado: SU factura del run (scoped a su vínculo). */
export async function downloadMySettlementInvoicePdf(runId: string): Promise<PdfResult> {
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

  return renderInvoicePdf(
    admin,
    session.organizationId,
    session.organizationName,
    runId,
    (mySub as { id: string }).id,
  )
}
