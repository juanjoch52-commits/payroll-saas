/**
 * CRA T4 — Statement of Remuneration Paid (bilingual EN/FR)
 *
 * Legally required for every employee who received remuneration in Canada.
 * Boxes 14 (employment income), 16 (CPP), 18 (EI), 22 (income tax), 24/26 (insurable/pensionable).
 *
 * Layout NOT pixel-perfect to CRA template — for production e-filing use a
 * service like Avantix or Greenshades to render the official scannable PDF.
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

import { pdfStrings, type PdfLocale } from '@/lib/pdf/i18n'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  header: { borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#555' },
  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  box: { flex: 1, border: '1 solid #444', padding: 6, borderRadius: 2 },
  boxLabel: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', color: '#444' },
  boxValue: { fontSize: 11, marginTop: 2, fontWeight: 'bold' },
  smallBox: { width: '23%', border: '1 solid #444', padding: 4, marginRight: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  footer: { marginTop: 16, fontSize: 7, color: '#999', textAlign: 'center' },
})

export type T4Data = {
  taxYear: number
  employee: {
    fullName: string
    sin?: string
    addressLine1?: string
    city?: string
    province?: string
    postalCode?: string
  }
  employer: {
    legalName: string
    businessNumber?: string
    addressLine1?: string
    city?: string
    province?: string
    postalCode?: string
  }
  box14EmploymentIncomeCents: number
  box16CppContribsCents: number
  box18EiPremiumsCents: number
  box22IncomeTaxDeductedCents: number
  box24EiInsurableEarningsCents: number
  box26CppPensionableEarningsCents: number
  box44UnionDuesCents?: number
  box52PensionAdjustmentCents?: number
  /** Locale for labels — defaults to fr-CA (bilingual rendering already includes EN) */
  locale?: PdfLocale
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Bilingual({ en, fr }: { en: string; fr: string }) {
  return (
    <Text style={styles.boxLabel}>
      {en} / {fr}
    </Text>
  )
}

export function T4Document({ data }: { data: T4Data }) {
  const dict = pdfStrings(data.locale ?? 'fr-CA')
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            T4 — Statement of Remuneration Paid / État de la rémunération payée
          </Text>
          <Text style={styles.subtitle}>
            {dict.t4.year} {data.taxYear} · MyJova
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.box}>
            <Bilingual en="Employer's name" fr="Nom de l'employeur" />
            <Text style={styles.boxValue}>{data.employer.legalName}</Text>
            <Text>{data.employer.addressLine1}</Text>
            <Text>
              {data.employer.city}, {data.employer.province} {data.employer.postalCode}
            </Text>
          </View>
          <View style={styles.box}>
            <Bilingual en="Employee's name" fr="Nom de l'employé(e)" />
            <Text style={styles.boxValue}>{data.employee.fullName}</Text>
            <Text>{data.employee.addressLine1}</Text>
            <Text>
              {data.employee.city}, {data.employee.province} {data.employee.postalCode}
            </Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.box}>
            <Bilingual en="Business number" fr="Numéro d'entreprise" />
            <Text style={styles.boxValue}>{data.employer.businessNumber ?? '—'}</Text>
          </View>
          <View style={styles.box}>
            <Bilingual en="Social insurance number" fr="Numéro d'assurance sociale" />
            <Text style={styles.boxValue}>{data.employee.sin ?? '—'}</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              marginBottom: 6,
              borderBottom: '1 solid #000',
              paddingBottom: 3,
            }}
          >
            Boxes / Cases
          </Text>

          <View style={styles.row}>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>14 · Employment income / Revenus d&apos;emploi</Text>
              <Text style={styles.boxValue}>{fmt(data.box14EmploymentIncomeCents)}</Text>
            </View>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>16 · CPP / RPC</Text>
              <Text style={styles.boxValue}>{fmt(data.box16CppContribsCents)}</Text>
            </View>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>18 · EI / AE</Text>
              <Text style={styles.boxValue}>{fmt(data.box18EiPremiumsCents)}</Text>
            </View>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>22 · Income tax / Impôt</Text>
              <Text style={styles.boxValue}>{fmt(data.box22IncomeTaxDeductedCents)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>24 · EI insurable / AE assurables</Text>
              <Text style={styles.boxValue}>{fmt(data.box24EiInsurableEarningsCents)}</Text>
            </View>
            <View style={styles.smallBox}>
              <Text style={styles.boxLabel}>26 · CPP pensionable / RPC ouvr. droit</Text>
              <Text style={styles.boxValue}>{fmt(data.box26CppPensionableEarningsCents)}</Text>
            </View>
            {data.box44UnionDuesCents ? (
              <View style={styles.smallBox}>
                <Text style={styles.boxLabel}>44 · Union dues / Cotisations syndicales</Text>
                <Text style={styles.boxValue}>{fmt(data.box44UnionDuesCents)}</Text>
              </View>
            ) : null}
            {data.box52PensionAdjustmentCents ? (
              <View style={styles.smallBox}>
                <Text style={styles.boxLabel}>52 · Pension adj. / Facteur d&apos;équiv.</Text>
                <Text style={styles.boxValue}>{fmt(data.box52PensionAdjustmentCents)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.footer}>
          {dict.common.confidential} · {dict.common.generated} {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  )
}
