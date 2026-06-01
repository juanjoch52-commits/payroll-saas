import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { getEntries } from '../../lib/api'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

type Entry = {
  id: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  status: string
}

function fmtHours(min: number | null): string {
  if (!min) return '—'
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

const STATUS_COLOR: Record<string, string> = {
  approved: colors.success,
  pending: colors.warning,
  rejected: colors.danger,
}

export default function History() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    setEntries(await getEntries())
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={entries}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={styles.empty}>{t('history.empty')}</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text style={styles.date}>{new Date(item.clock_in_at).toLocaleDateString()}</Text>
            <Text style={styles.time}>
              {new Date(item.clock_in_at).toLocaleTimeString()} —{' '}
              {item.clock_out_at
                ? new Date(item.clock_out_at).toLocaleTimeString()
                : t('history.open')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.hours}>{fmtHours(item.billable_minutes)}</Text>
            <Text style={[styles.status, { color: STATUS_COLOR[item.status] ?? colors.muted }]}>
              {item.status}
            </Text>
          </View>
        </View>
      )}
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
  date: { fontWeight: '700', color: colors.text },
  time: { color: colors.muted, marginTop: 2 },
  hours: { fontWeight: '800', color: colors.text },
  status: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 48 },
})
