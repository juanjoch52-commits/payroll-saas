/**
 * CRA T4A — Statement of Pension, Retirement, Annuity, and Other Income
 * Used in MyJova for self-employed / contractor payments (similar role to US 1099-NEC).
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { pdfStrings, type PdfLocale } from '@/lib/pdf/i18n'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 12, borderBottom: '2 solid #000', paddingBottom: 6 },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  box: { flex: 1, border: '1 solid #444', padding: 6 },
  boxLabel: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', color: '#444' },
  boxValue: { fontSize: 11, marginTop: 2, fontWeight: 'bold' },
  footer: { marginTop: 16, fontSize: 7, color: '#999', textAlign: 'center' },
})

export type T4AData = {
  taxYear: number
  recipient: { fullName: string; sin?: string; addressLine1?: string; city?: string; province?: string; postalCode?: string }
  payer: { legalName: string; businessNumber?: string; addressLine1?: string; city?: string; province?: string; postalCode?: string }
  box020SelfEmployedCommissionsCents?: number
  box048FeesForServicesCents: number
  box022IncomeTaxDeductedCents?: number
  locale?: PdfLocale
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
}

export function T4ADocument({ data }: { data: T4AData }) {
  const dict = pdfStrings(data.locale ?? 'fr-CA')
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>T4A — Statement of Pension, Retirement, Annuity and Other Income</Text>
        <Text style={styles.subtitle}>État du revenu de pension, de retraite, de rente ou d&apos;autres sources — {data.taxYear}</Text>

        <View style={styles.twoCol}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Payer / Payeur</Text>
            <Text style={styles.boxValue}>{data.payer.legalName}</Text>
            <Text>{data.payer.addressLine1}</Text>
            <Text>{data.payer.city}, {data.payer.province} {data.payer.postalCode}</Text>
            <Text style={{ marginTop: 4 }}>BN: {data.payer.businessNumber ?? '—'}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Recipient / Bénéficiaire</Text>
            <Text style={styles.boxValue}>{data.recipient.fullName}</Text>
            <Text>{data.recipient.addressLine1}</Text>
            <Text>{data.recipient.city}, {data.recipient.province} {data.recipient.postalCode}</Text>
            <Text style={{ marginTop: 4 }}>SIN: {data.recipient.sin ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <Text style={styles.boxLabel}>Box 048 · Fees for services / Honoraires pour services</Text>
          <Text style={styles.boxValue}>{fmt(data.box048FeesForServicesCents)}</Text>
        </View>

        {data.box020SelfEmployedCommissionsCents ? (
          <View style={[styles.box, { marginTop: 6 }]}>
            <Text style={styles.boxLabel}>Box 020 · Self-employed commissions / Commissions travail indépendant</Text>
            <Text style={styles.boxValue}>{fmt(data.box020SelfEmployedCommissionsCents)}</Text>
          </View>
        ) : null}

        {data.box022IncomeTaxDeductedCents ? (
          <View style={[styles.box, { marginTop: 6 }]}>
            <Text style={styles.boxLabel}>Box 022 · Income tax deducted / Impôt sur le revenu retenu</Text>
            <Text style={styles.boxValue}>{fmt(data.box022IncomeTaxDeductedCents)}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {dict.common.confidential} · {dict.common.generated} {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  )
}
