import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { getPaystub, paystubPdfRequest } from '../../lib/api'
import { t, locale } from '../../lib/i18n'
import { colors } from '../../lib/theme'

type Component = { component_type: string; label: string; amount_cents: number }
type Run = { period_start: string; period_end: string; pay_date: string }
type Item = {
  id: string
  gross_cents: number
  net_cents: number
  payroll_runs: Run | Run[]
  payroll_components: Component[]
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`

export default function PaystubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (id) getPaystub(id).then((d) => { setItem(d); setLoading(false) })
  }, [id])

  async function download() {
    if (!id) return
    setDownloading(true)
    try {
      const { url, token } = await paystubPdfRequest(id, locale)
      const fileUri = `${FileSystem.cacheDirectory}paystub-${id}.pdf`
      const res = await FileSystem.downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
      }
    } catch {
      Alert.alert('Error')
    }
    setDownloading(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }
  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>—</Text>
      </View>
    )
  }

  const run = Array.isArray(item.payroll_runs) ? item.payroll_runs[0] : item.payroll_runs
  const comps = item.payroll_components ?? []
  const earnings = comps.filter((c) => c.component_type === 'earning')
  const deductions = comps.filter((c) => c.component_type === 'tax' || c.component_type === 'deduction')

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('paystubs.title')}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('paystubs.net')}</Text>
          <Text style={styles.heroNet}>{money(item.net_cents)}</Text>
          <Text style={styles.heroPeriod}>
            {run.period_start} → {run.period_end}
          </Text>
        </View>

        <Section title={t('paystubs.earnings')} items={earnings} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('paystubs.gross')}</Text>
          <Text style={styles.totalLabel}>{money(item.gross_cents)}</Text>
        </View>

        <Section title={t('paystubs.deductions')} items={deductions} negative />

        <TouchableOpacity style={styles.dlBtn} onPress={download} disabled={downloading}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.dlText}>
            {downloading ? t('common.loading') : t('paystubs.download')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function Section({ title, items, negative }: { title: string; items: Component[]; negative?: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((c, i) => (
        <View key={i} style={styles.line}>
          <Text style={styles.lineLabel}>{c.label}</Text>
          <Text style={styles.lineVal}>
            {negative ? '-' : ''}
            {money(c.amount_cents)}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hero: { backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  heroLabel: { color: colors.muted },
  heroNet: { fontSize: 34, fontWeight: '800', color: colors.text, marginVertical: 4 },
  heroPeriod: { color: colors.muted },
  section: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', color: colors.muted, marginBottom: 8, textTransform: 'uppercase', fontSize: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineLabel: { color: colors.text, flex: 1 },
  lineVal: { fontWeight: '600', color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  totalLabel: { fontWeight: '800', color: colors.text, fontSize: 16 },
  dlBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dlText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
