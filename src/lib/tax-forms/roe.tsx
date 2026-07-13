/**
 * Record of Employment (ROE) — Service Canada
 *
 * Issued when an employee separates from work (any interruption of earnings).
 * Critical for EI claims. Boxes A–S as per Service Canada specification.
 *
 * NOTE: For production, ROE Web upload requires CRA Web Forms or ROE Web XML.
 * This PDF is a printed copy for employee record-keeping. See lib/efile/cra-xml.ts.
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { pdfStrings, type PdfLocale } from '@/lib/pdf/i18n'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 12, borderBottom: '2 solid #000', paddingBottom: 6 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  field: { flexDirection: 'row', borderBottom: '1 solid #ddd', paddingVertical: 3 },
  fieldLabel: { width: '40%', fontSize: 9, color: '#555' },
  fieldValue: { width: '60%', fontSize: 9, fontWeight: 'bold' },
  footer: { marginTop: 16, fontSize: 7, color: '#999', textAlign: 'center' },
})

export type ROEData = {
  taxYear: number
  employee: { fullName: string; sin?: string; addressLine1?: string; city?: string; province?: string; postalCode?: string }
  employer: { legalName: string; payrollNumber?: string }
  /** Box 9 — First day worked */
  firstDayWorked: string // ISO date
  /** Box 10 — Last day for which paid */
  lastDayPaid: string // ISO date
  /** Box 11 — Final pay period ending */
  finalPayPeriodEnding: string // ISO date
  /** Box 12 — Final pay period ending date when no longer paid */
  reasonForIssuingCode: string // A=Shortage of work, B=Strike/Lockout, D=Illness, E=Quit, F=Maternity, K=Other, etc.
  /** Box 15A — Total insurable hours */
  insurableHours: number
  /** Box 15B — Total insurable earnings (52 weeks) */
  insurableEarningsCents: number
  /** Box 16 — Reason notes */
  notes?: string
  locale?: PdfLocale
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

const REASON_CODES: Record<string, string> = {
  A: 'Shortage of work / Manque de travail',
  B: 'Strike or lockout / Grève ou lock-out',
  D: 'Illness or injury / Maladie ou blessure',
  E: 'Quit / Démission',
  F: 'Maternity / Maternité',
  G: 'Mandatory retirement / Retraite obligatoire',
  H: 'Work-sharing / Partage du travail',
  K: 'Other / Autre',
  M: 'Dismissal / Congédiement',
  N: 'Leave of absence / Congé',
  P: 'Parental / Parental',
}

export function ROEDocument({ data }: { data: ROEData }) {
  const dict = pdfStrings(data.locale ?? 'fr-CA')
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>
          Record of Employment / Relevé d&apos;emploi
        </Text>
        <Text style={styles.subtitle}>
          Service Canada · {data.taxYear} · Issued: {new Date().toLocaleDateString('en-CA')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employer / Employeur</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 4 · Legal name</Text>
            <Text style={styles.fieldValue}>{data.employer.legalName}</Text>
          </View>
          {data.employer.payrollNumber ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Box 5 · Payroll reference number</Text>
              <Text style={styles.fieldValue}>{data.employer.payrollNumber}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee / Employé(e)</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 7 · Name</Text>
            <Text style={styles.fieldValue}>{data.employee.fullName}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 7 · SIN</Text>
            <Text style={styles.fieldValue}>{data.employee.sin ?? '—'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 7 · Address</Text>
            <Text style={styles.fieldValue}>
              {data.employee.addressLine1}, {data.employee.city} {data.employee.province} {data.employee.postalCode}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment / Emploi</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 9 · First day worked</Text>
            <Text style={styles.fieldValue}>{fmtDate(data.firstDayWorked)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 10 · Last day for which paid</Text>
            <Text style={styles.fieldValue}>{fmtDate(data.lastDayPaid)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 11 · Final pay period ending</Text>
            <Text style={styles.fieldValue}>{fmtDate(data.finalPayPeriodEnding)}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 16 · Reason for issuing ROE</Text>
            <Text style={styles.fieldValue}>
              {data.reasonForIssuingCode} — {REASON_CODES[data.reasonForIssuingCode] ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurable / Assurables</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 15A · Total insurable hours</Text>
            <Text style={styles.fieldValue}>{data.insurableHours.toLocaleString('en-CA')}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Box 15B · Total insurable earnings (52 wks)</Text>
            <Text style={styles.fieldValue}>{fmt(data.insurableEarningsCents)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Box 18 · Comments / Commentaires</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {dict.common.confidential} · This printed copy is for record-keeping. File the official ROE via Service Canada ROE Web.
        </Text>
      </Page>
    </Document>
  )
}
