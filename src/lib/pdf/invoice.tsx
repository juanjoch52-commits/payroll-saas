import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { InvoiceLine } from '@/lib/subcontractors/invoice'

// =============================================================================
// PDF — Factura de liquidación (sub raíz → empresa)
// =============================================================================
// Documento FORMAL: solo el lado facturado (horas × tarifa facturada) +
// HST/GST. El pay/margen interno del sub NO aparece aquí (eso vive en el
// settlement PDF). La genera MyJova en nombre del sub raíz con los datos
// congelados en settlement_records — imposible que difiera de la contabilidad.
// =============================================================================

export type InvoicePdfData = {
  invoiceNumber: string
  /** Fecha de emisión (freeze del settlement al aprobar la nómina). */
  issueDate: string
  payDate: string
  periodStart: string
  periodEnd: string
  from: {
    name: string
    businessLegalName: string | null
    taxNumber: string | null
    address: string | null
  }
  billTo: { name: string }
  lines: InvoiceLine[]
  subtotalCents: number
  taxPct: number
  taxCents: number
  totalCents: number
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  invoiceNo: { fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  headerMeta: { fontSize: 9, color: '#555', textAlign: 'right' },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  partyBlock: { width: '46%' },
  partyLabel: { fontSize: 8, color: '#888', textTransform: 'uppercase', marginBottom: 3 },
  partyName: { fontSize: 11, fontWeight: 'bold' },
  partyDetail: { fontSize: 9, color: '#444', marginTop: 1 },
  th: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 2,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
  },
  cDesc: { width: '46%' },
  cHours: { width: '16%', textAlign: 'right' },
  cRate: { width: '18%', textAlign: 'right' },
  cAmount: { width: '20%', textAlign: 'right' },
  thText: { fontSize: 8, color: '#666', textTransform: 'uppercase' },
  totalsBlock: { marginTop: 12, alignItems: 'flex-end' },
  totalsLine: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  totalsLabel: { fontSize: 10, color: '#444', width: 140 },
  totalsValue: { fontSize: 10, width: 90, textAlign: 'right' },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
  },
  dueLabel: { fontSize: 12, fontWeight: 'bold', width: 140 },
  dueValue: { fontSize: 14, fontWeight: 'bold', width: 90, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
})

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const totalHours = data.lines.reduce((s, l) => s + (l.hours ?? 0), 0)
  const fromName = data.from.businessLegalName ?? data.from.name

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNo}>{data.invoiceNumber}</Text>
          </View>
          <View>
            <Text style={styles.headerMeta}>Invoice date: {data.issueDate}</Text>
            <Text style={styles.headerMeta}>
              Service period: {data.periodStart} → {data.periodEnd}
            </Text>
            <Text style={styles.headerMeta}>Pay date: {data.payDate}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{fromName}</Text>
            {data.from.businessLegalName && data.from.businessLegalName !== data.from.name && (
              <Text style={styles.partyDetail}>Operating as: {data.from.name}</Text>
            )}
            {data.from.address && <Text style={styles.partyDetail}>{data.from.address}</Text>}
            {data.from.taxNumber && (
              <Text style={styles.partyDetail}>GST/HST No.: {data.from.taxNumber}</Text>
            )}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Bill to</Text>
            <Text style={styles.partyName}>{data.billTo.name}</Text>
          </View>
        </View>

        <View style={styles.th}>
          <Text style={[styles.cDesc, styles.thText]}>Description</Text>
          <Text style={[styles.cHours, styles.thText]}>Hours</Text>
          <Text style={[styles.cRate, styles.thText]}>Rate</Text>
          <Text style={[styles.cAmount, styles.thText]}>Amount</Text>
        </View>

        {data.lines.map((l, i) => (
          <View style={styles.tr} key={i}>
            <Text style={styles.cDesc}>{l.description}</Text>
            <Text style={styles.cHours}>{l.hours != null ? l.hours.toFixed(2) : '—'}</Text>
            <Text style={styles.cRate}>{l.rateCents != null ? `${fmt(l.rateCents)}/h` : '—'}</Text>
            <Text style={styles.cAmount}>{fmt(l.amountCents)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsLine}>
            <Text style={styles.totalsLabel}>
              Subtotal ({data.lines.length} workers · {totalHours.toFixed(2)} h)
            </Text>
            <Text style={styles.totalsValue}>{fmt(data.subtotalCents)}</Text>
          </View>
          {data.taxPct > 0 && (
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>HST/GST ({Number(data.taxPct)}%)</Text>
              <Text style={styles.totalsValue}>{fmt(data.taxCents)}</Text>
            </View>
          )}
          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>Total due</Text>
            <Text style={styles.dueValue}>{fmt(data.totalCents)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Invoice generated by MyJova on behalf of {fromName} from frozen settlement records ·{' '}
          {data.invoiceNumber}
        </Text>
      </Page>
    </Document>
  )
}
