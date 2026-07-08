import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// =============================================================================
// PDF — Liquidación de subcontratista (settlement statement)
// =============================================================================
// El "paystub" de la EMPRESA subcontratista raíz: un cheque por el total de su
// árbol (sus trabajadores + los de sus subs menores) con el desglose de horas
// por trabajador. Se entrega junto con el cheque para que el sub sepa repartir.
// =============================================================================

export type SettlementPdfData = {
  payerName: string // el contratista (tenant)
  rootSubName: string // quien recibe el cheque
  period: { start: string; end: string; payDate: string }
  lines: {
    workerName: string
    subName: string
    hours: number | null
    payCents: number // a pagar al trabajador
    billCents: number // facturado al contratista
    marginCents: number
  }[]
  subtotalCents: number
  taxPct: number
  taxCents: number
  totalCents: number // cheque = subtotal + HST
  payTotalCents: number
  marginCents: number
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  subheader: { fontSize: 9, color: '#666', marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaLabel: { fontSize: 8, color: '#888' },
  metaValue: { fontSize: 10, fontWeight: 'bold' },
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
  cWorker: { width: '24%' },
  cSub: { width: '20%' },
  cHours: { width: '12%', textAlign: 'right' },
  cPay: { width: '15%', textAlign: 'right' },
  cAmount: { width: '15%', textAlign: 'right' },
  cMargin: { width: '14%', textAlign: 'right' },
  thText: { fontSize: 8, color: '#666', textTransform: 'uppercase' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
  },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 14, fontWeight: 'bold' },
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

export function SettlementPdf({ data }: { data: SettlementPdfData }) {
  const totalHours = data.lines.reduce((s, l) => s + (l.hours ?? 0), 0)
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.header}>Subcontractor settlement</Text>
        <Text style={styles.subheader}>
          {data.payerName} → {data.rootSubName} · MyJova
        </Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Pay to</Text>
            <Text style={styles.metaValue}>{data.rootSubName}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Period</Text>
            <Text style={styles.metaValue}>
              {data.period.start} → {data.period.end}
            </Text>
            <Text style={styles.metaLabel}>Pay date: {data.period.payDate}</Text>
          </View>
        </View>

        <View style={styles.th}>
          <Text style={[styles.cWorker, styles.thText]}>Worker</Text>
          <Text style={[styles.cSub, styles.thText]}>Subcontractor</Text>
          <Text style={[styles.cHours, styles.thText]}>Hours</Text>
          <Text style={[styles.cPay, styles.thText]}>Pay worker</Text>
          <Text style={[styles.cAmount, styles.thText]}>Billed</Text>
          <Text style={[styles.cMargin, styles.thText]}>Margin</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={styles.tr} key={i}>
            <Text style={styles.cWorker}>{l.workerName}</Text>
            <Text style={styles.cSub}>{l.subName}</Text>
            <Text style={styles.cHours}>{l.hours != null ? l.hours.toFixed(2) : '—'}</Text>
            <Text style={styles.cPay}>{fmt(l.payCents)}</Text>
            <Text style={styles.cAmount}>{fmt(l.billCents)}</Text>
            <Text style={styles.cMargin}>{l.marginCents !== 0 ? fmt(l.marginCents) : '—'}</Text>
          </View>
        ))}

        {/* Totales: subtotal facturado + HST = cheque; y el reparto interno */}
        <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#444' }}>
            Subtotal (billed): {fmt(data.subtotalCents)}
          </Text>
          {data.taxPct > 0 ? (
            <Text style={{ fontSize: 9, color: '#444', marginTop: 2 }}>
              HST/GST ({data.taxPct}%): {fmt(data.taxCents)}
            </Text>
          ) : null}
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Check total ({data.lines.length} workers · {totalHours.toFixed(2)} h)
          </Text>
          <Text style={styles.totalValue}>{fmt(data.totalCents)}</Text>
        </View>
        <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#444' }}>
            To distribute to workers: {fmt(data.payTotalCents)}
          </Text>
          {data.marginCents !== 0 ? (
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 2 }}>
              Subcontractor margin (before tax): {fmt(data.marginCents)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.footer}>
          Gross amounts — no taxes withheld by {data.payerName}. The subcontractor is responsible
          for paying and reporting its own workers and for remitting collected HST/GST. Generated
          by MyJova.
        </Text>
      </Page>
    </Document>
  )
}
