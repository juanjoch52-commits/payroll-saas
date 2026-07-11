import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { getWeek, submitWeek, addManualEntry, type WeekView, type WeekEntryApi } from '../../lib/api'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

// =============================================================================
// Mis horas — vista semanal (lunes-domingo, timezone de la org, desde el API)
// con cierre de semana / solicitud de pago y reporte de horas olvidadas.
// =============================================================================

const STATUS_COLOR: Record<string, string> = {
  approved: colors.success,
  pending: colors.warning,
  edited: colors.warning,
  rejected: colors.danger,
  open: colors.primary,
}

function fmtMin(min: number): string {
  const safe = Math.max(0, Math.round(min))
  return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, '0')}m`
}

function dayLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function shortDate(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export default function MyHours() {
  const [week, setWeek] = useState<string | undefined>(undefined)
  const [data, setData] = useState<WeekView | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  // Form "olvidé fichar"
  const [showManual, setShowManual] = useState(false)
  const [mDate, setMDate] = useState('')
  const [mIn, setMIn] = useState('08:00')
  const [mOut, setMOut] = useState('17:00')
  const [mNoBreak, setMNoBreak] = useState(false)
  const [mReason, setMReason] = useState('')

  const load = useCallback(
    async (w?: string) => {
      setRefreshing(true)
      const view = await getWeek(w ?? week)
      setData(view)
      if (view && !mDate) setMDate(view.today)
      setRefreshing(false)
    },
    [week, mDate],
  )

  useEffect(() => {
    load(week)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week])

  function goTo(w: string | null) {
    if (w) setWeek(w)
  }

  async function handleSubmitWeek() {
    if (!data) return
    Alert.alert(
      t('history.submit'),
      t('history.confirmSubmit', { total: fmtMin(data.totals.total) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            setBusy(true)
            const res = await submitWeek({ weekStart: data.weekStart, note: note || undefined })
            setBusy(false)
            if (res?.error) Alert.alert(res.error)
            else {
              setNote('')
              load(data.weekStart)
            }
          },
        },
      ],
    )
  }

  async function handleManual() {
    if (!DATE_RE.test(mDate) || !TIME_RE.test(mIn) || !TIME_RE.test(mOut)) {
      Alert.alert(t('history.badFormat'))
      return
    }
    setBusy(true)
    const res = await addManualEntry({
      date: mDate,
      timeIn: mIn,
      timeOut: mOut,
      noBreak: mNoBreak,
      reason: mReason,
    })
    setBusy(false)
    if (res?.error) Alert.alert(res.error)
    else {
      Alert.alert(t('history.manualSent'))
      setShowManual(false)
      setMReason('')
      load(week)
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const sub = data.submission
  const breakOn = (data.breakPolicy?.autoDeductMinutes ?? 0) > 0

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(week)} />}
    >
      {/* Navegación de semana */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(data.prevWeek)}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekTitle}>
          {t('history.weekOf', { start: shortDate(data.weekStart), end: shortDate(data.weekEnd) })}
        </Text>
        <TouchableOpacity
          style={[styles.navBtn, !data.nextWeek && { opacity: 0.25 }]}
          onPress={() => goTo(data.nextWeek)}
          disabled={!data.nextWeek}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Totales */}
      <View style={styles.totals}>
        <View style={styles.totalCol}>
          <Text style={styles.totalVal}>{fmtMin(data.totals.total)}</Text>
          <Text style={styles.totalLabel}>{t('history.total')}</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={[styles.totalVal, { color: colors.success }]}>
            {fmtMin(data.totals.approved)}
          </Text>
          <Text style={styles.totalLabel}>{t('history.approved')}</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={[styles.totalVal, { color: colors.warning }]}>
            {fmtMin(data.totals.pending)}
          </Text>
          <Text style={styles.totalLabel}>{t('history.pending')}</Text>
        </View>
      </View>

      {/* Días */}
      {data.days.map((day) => (
        <View
          key={day.day}
          style={[styles.dayCard, day.day === data.today && { borderColor: colors.primary }]}
        >
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{dayLabel(day.day)}</Text>
            <Text style={[styles.dayMin, day.minutes === 0 && { color: colors.border }]}>
              {day.minutes > 0 ? fmtMin(day.minutes) : '—'}
            </Text>
          </View>
          {day.entries.map((e: WeekEntryApi) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={styles.entryTime}>
                {new Date(e.clock_in_at).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: data.timezone,
                })}
                {' → '}
                {e.clock_out_at
                  ? new Date(e.clock_out_at).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: data.timezone,
                    })
                  : t('history.openShift')}
                {e.manual_kind ? `  · ${t('history.manual')}` : ''}
                {(e.break_minutes ?? 0) > 0 ? `  −${e.break_minutes}m` : ''}
              </Text>
              <Text style={[styles.entryStatus, { color: STATUS_COLOR[e.status] ?? colors.muted }]}>
                {e.status === 'open' ? '' : `${fmtMin(e.billable_minutes ?? 0)} `}
                {e.status}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {data.days.every((d) => d.entries.length === 0) && (
        <Text style={styles.empty}>{t('history.empty')}</Text>
      )}

      {/* Estado de la semana / cierre */}
      {sub?.status === 'submitted' && (
        <View style={[styles.banner, { backgroundColor: '#eff6ff', borderColor: colors.primary }]}>
          <Text style={[styles.bannerText, { color: colors.primary }]}>{t('history.submitted')}</Text>
        </View>
      )}
      {sub?.status === 'approved' && (
        <View style={[styles.banner, { backgroundColor: '#f0fdf4', borderColor: colors.success }]}>
          <Text style={[styles.bannerText, { color: colors.success }]}>
            {t('history.approvedBanner')}
          </Text>
        </View>
      )}
      {sub?.status === 'rejected' && (
        <View style={[styles.banner, { backgroundColor: '#fef2f2', borderColor: colors.danger }]}>
          <Text style={[styles.bannerText, { color: colors.danger }]}>
            {t('history.rejectedBanner')}
          </Text>
          {sub.review_note ? <Text style={styles.bannerNote}>{sub.review_note}</Text> : null}
        </View>
      )}

      {data.canSubmit && (
        <View style={styles.submitBox}>
          <TextInput
            style={styles.input}
            placeholder={t('history.note')}
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.submitBtn, busy && { opacity: 0.6 }]}
            onPress={handleSubmitWeek}
            disabled={busy}
          >
            <Text style={styles.submitBtnText}>
              {busy
                ? t('history.submitting')
                : sub?.status === 'rejected'
                  ? t('history.resubmit')
                  : t('history.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {!data.canSubmit && data.blockReason === 'open_entry' && (
        <Text style={styles.blockHint}>{t('history.blockedOpen')}</Text>
      )}
      {!data.canSubmit && data.blockReason === 'no_hours' && (
        <Text style={styles.blockHint}>{t('history.blockedNoHours')}</Text>
      )}

      {/* ¿Olvidaste fichar? */}
      {!showManual ? (
        <TouchableOpacity style={styles.manualToggle} onPress={() => setShowManual(true)}>
          <Text style={styles.manualToggleText}>+ {t('history.manualTitle')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.manualBox}>
          <Text style={styles.manualHeader}>{t('history.manualTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('history.manualDate')}
            placeholderTextColor={colors.muted}
            value={mDate}
            onChangeText={setMDate}
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('history.manualIn')}
              placeholderTextColor={colors.muted}
              value={mIn}
              onChangeText={setMIn}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('history.manualOut')}
              placeholderTextColor={colors.muted}
              value={mOut}
              onChangeText={setMOut}
              autoCapitalize="none"
            />
          </View>
          {breakOn && (
            <View style={styles.switchRow}>
              <Switch value={mNoBreak} onValueChange={setMNoBreak} />
              <Text style={styles.switchLabel}>
                {t('clock.noLunch', { minutes: data.breakPolicy?.autoDeductMinutes ?? 0 })}
              </Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={t('history.manualReason')}
            placeholderTextColor={colors.muted}
            value={mReason}
            onChangeText={setMReason}
            maxLength={500}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowManual(false)}>
              <Text style={{ color: colors.muted }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 1 }, (busy || mReason.trim().length < 3) && { opacity: 0.5 }]}
              onPress={handleManual}
              disabled={busy || mReason.trim().length < 3}
            >
              <Text style={styles.submitBtnText}>{t('history.manualSend')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 22, color: colors.text, marginTop: -2 },
  weekTitle: { fontWeight: '700', color: colors.text },
  totals: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  totalCol: { flex: 1, alignItems: 'center' },
  totalVal: { fontWeight: '800', fontSize: 16, color: colors.text },
  totalLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.card,
    padding: 12,
    marginBottom: 8,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dayName: { fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  dayMin: { fontWeight: '700', color: colors.text },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  entryTime: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  entryStatus: { fontSize: 12, textTransform: 'capitalize', marginLeft: 8 },
  empty: { textAlign: 'center', color: colors.muted, marginVertical: 24 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  bannerText: { fontWeight: '700' },
  bannerNote: { color: colors.muted, marginTop: 4 },
  submitBox: { marginTop: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.bg,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '800' },
  blockHint: { textAlign: 'center', color: colors.muted, marginTop: 12, fontSize: 12 },
  manualToggle: { marginTop: 16, alignItems: 'center', padding: 12 },
  manualToggleText: { color: colors.primary, fontWeight: '600' },
  manualBox: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  manualHeader: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  switchLabel: { color: colors.text, flexShrink: 1, fontSize: 13 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
})
