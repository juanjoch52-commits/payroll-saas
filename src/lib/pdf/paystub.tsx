import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { pdfStrings } from './i18n'

// =============================================================================
// Plantilla PDF — Recibo de pago (paystub) descargable por el empleado.
// =============================================================================
// Usa el diccionario pdfStrings(locale).paystub (4 locales) para que el recibo
// salga en el idioma del empleado. Layout legible (no oficial).
// =============================================================================

export type PaystubLineItem = { label: string; amountCents: number }

export type PaystubData = {
  locale: string
  employer: { name: string }
  employee: { fullName: string; taxIdLastFour?: string | null }
  period: { start: string; end: string; payDate: string }
  earnings: PaystubLineItem[]
  taxes: PaystubLineItem[]
  deductions: PaystubLineItem[]
  grossCents: number
  netCents: number
  ytdGrossCents?: number
  ytdNetCents?: number
  /**
   * Nombre del subcontratista vía el cual se paga. Si está presente, el
   * documento es un estado de HORAS/BRUTO (sin retenciones del tenant): el
   * pago real le llega al trabajador a través de su subcontratista.
   */
  paidViaSubcontractor?: string
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  subheader: { fontSize: 9, color: '#666', marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaCol: { flexDirection: 'column' },
  metaLabel: { fontSize: 8, color: '#888' },
  metaValue: { fontSize: 10, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  lineLabel: { color: '#333' },
  lineValue: { fontWeight: 'bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#111',
    borderTopStyle: 'solid',
  },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 12, fontWeight: 'bold' },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    padding: 8,
    backgroundColor: '#f1f5f9',
  },
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

export function PaystubPdf({ data }: { data: PaystubData }) {
  const s = pdfStrings(data.locale).paystub
  const taxesAndDeductions = [...data.taxes, ...data.deductions]

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.header}>{s.title}</Text>
        <Text style={styles.subheader}>{data.employer.name} · MyJova</Text>

        {data.paidViaSubcontractor ? (
          <View
            style={{
              marginBottom: 12,
              padding: 8,
              borderWidth: 1,
              borderColor: '#f0c36d',
              borderStyle: 'solid',
              borderRadius: 4,
              backgroundColor: '#fdf6e3',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
              Paid via subcontractor: {data.paidViaSubcontractor}
            </Text>
            <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
              Gross hours/earnings statement. No taxes are withheld by {data.employer.name};
              payment and payroll taxes are handled by the subcontractor.
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>{s.employee}</Text>
            <Text style={styles.metaValue}>{data.employee.fullName}</Text>
            {data.employee.taxIdLastFour ? (
              <Text style={styles.metaLabel}>SSN •••-••-{data.employee.taxIdLastFour}</Text>
            ) : null}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>{s.payPeriod}</Text>
            <Text style={styles.metaValue}>
              {data.period.start} → {data.period.end}
            </Text>
            <Text style={styles.metaLabel}>
              {s.payDate}: {data.period.payDate}
            </Text>
          </View>
        </View>

        {/* Earnings */}
        <Text style={styles.sectionTitle}>{s.earnings}</Text>
        {data.earnings.map((e, i) => (
          <View style={styles.line} key={`e${i}`}>
            <Text style={styles.lineLabel}>{e.label}</Text>
            <Text style={styles.lineValue}>{fmt(e.amountCents)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{s.grossPay}</Text>
          <Text style={styles.totalValue}>{fmt(data.grossCents)}</Text>
        </View>

        {/* Deductions + taxes */}
        <Text style={styles.sectionTitle}>{s.deductions}</Text>
        {taxesAndDeductions.map((d, i) => (
          <View style={styles.line} key={`d${i}`}>
            <Text style={styles.lineLabel}>{d.label}</Text>
            <Text style={styles.lineValue}>-{fmt(d.amountCents)}</Text>
          </View>
        ))}

        {/* Net */}
        <View style={styles.netRow}>
          <Text style={styles.totalLabel}>{s.netPay}</Text>
          <Text style={styles.totalValue}>{fmt(data.netCents)}</Text>
        </View>

        {(data.ytdGrossCents != null || data.ytdNetCents != null) && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.metaLabel}>{s.ytd}</Text>
            {data.ytdGrossCents != null && (
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{s.grossPay}</Text>
                <Text style={styles.lineValue}>{fmt(data.ytdGrossCents)}</Text>
              </View>
            )}
            {data.ytdNetCents != null && (
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{s.netPay}</Text>
                <Text style={styles.lineValue}>{fmt(data.ytdNetCents)}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          {data.employer.name} · {s.payDate} {data.period.payDate}
        </Text>
      </Page>
    </Document>
  )
}
