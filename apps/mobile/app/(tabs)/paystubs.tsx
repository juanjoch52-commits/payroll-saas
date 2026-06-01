import { useEffect, useState, useCallback } from 'react'
import { Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { getPaystubs } from '../../lib/api'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

type Run = { period_start: string; period_end: string; pay_date: string }
type Item = { id: string; gross_cents: number; net_cents: number; payroll_runs: Run | Run[] }

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
function run(it: Item): Run {
  return Array.isArray(it.payroll_runs) ? it.payroll_runs[0] : it.payroll_runs
}

export default function Paystubs() {
  const [items, setItems] = useState<Item[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setRefreshing(true)
    setItems(await getPaystubs())
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>{t('paystubs.empty')}</Text>}
      renderItem={({ item }) => {
        const r = run(item)
        return (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/paystub/${item.id}`)}>
            <View>
              <Text style={styles.period}>
                {r.period_start} → {r.period_end}
              </Text>
              <Text style={styles.date}>
                {t('paystubs.payDate')}: {r.pay_date}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.net}>{money(item.net_cents)}</Text>
              <Text style={styles.gross}>
                {t('paystubs.gross')} {money(item.gross_cents)}
              </Text>
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  period: { fontWeight: '700', color: colors.text },
  date: { color: colors.muted, marginTop: 2, fontSize: 12 },
  net: { fontWeight: '800', color: colors.text, fontSize: 18 },
  gross: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 48 },
})
