import type { SettlementLine } from './tree'

/**
 * Facturas de liquidación — helpers puros.
 *
 * La factura es el documento sub raíz → empresa: SOLO el lado facturado
 * (billCents). El pay/margen del árbol es información interna del sub y
 * NUNCA aparece en la factura.
 */

/** INV-2026-0001 — secuencial por org × año (ver next_invoice_number en DB). */
export function formatInvoiceNumber(year: number, n: number): string {
  return `INV-${year}-${String(n).padStart(4, '0')}`
}

export type InvoiceLine = {
  description: string
  hours: number | null
  /** Tarifa horaria implícita en centavos (bill/horas), null si no hay horas. */
  rateCents: number | null
  amountCents: number
}

/**
 * Convierte las líneas congeladas del settlement en líneas de factura
 * (solo lado facturado). La tarifa se deriva bill/horas para mostrar; el
 * monto SIEMPRE es el billCents congelado (la tarifa es informativa).
 */
export function invoiceLines(lines: SettlementLine[]): InvoiceLine[] {
  return lines.map((l) => ({
    description: l.subName && l.subName !== l.workerName ? `${l.workerName} — ${l.subName}` : l.workerName,
    hours: l.hours,
    rateCents:
      l.hours != null && l.hours > 0 ? Math.round(l.billCents / l.hours) : null,
    amountCents: l.billCents,
  }))
}
