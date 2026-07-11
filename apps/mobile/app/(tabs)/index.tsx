import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  ScrollView,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import {
  getEntries,
  clockIn,
  clockOut,
  getWeek,
  fixClockOut,
  type ClockBody,
  type WeekView,
} from '../../lib/api'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

type Entry = { id: string; clock_in_at: string; clock_out_at: string | null }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/
const STALE_MS = 10 * 3_600_000 // turno abierto >10h → probablemente olvidó salir

function fmtMin(min: number): string {
  const safe = Math.max(0, Math.round(min))
  return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, '0')}m`
}

export default function ClockScreen() {
  const [open, setOpen] = useState<Entry | null>(null)
  const [week, setWeek] = useState<WeekView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [camVisible, setCamVisible] = useState(false)
  const [noBreak, setNoBreak] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())
  const [permission, requestPermission] = useCameraPermissions()
  const camRef = useRef<CameraView>(null)

  // Tick por minuto mientras hay turno abierto (contador de jornada).
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [open])

  // Form de "olvidé la salida"
  const [fixDate, setFixDate] = useState('')
  const [fixTime, setFixTime] = useState('17:00')
  const [fixReason, setFixReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [entries, view] = await Promise.all([getEntries() as Promise<Entry[]>, getWeek()])
    const openEntry = entries.find((e) => !e.clock_out_at) ?? null
    setOpen(openEntry)
    setWeek(view)
    if (openEntry && view) {
      // Default razonable para la corrección: el día local del clock-in.
      setFixDate(
        new Date(openEntry.clock_in_at).toLocaleDateString('en-CA', { timeZone: view.timezone }),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function startCapture() {
    if (!permission?.granted) {
      const r = await requestPermission()
      if (!r.granted) {
        Alert.alert(t('clock.needCamera'))
        return
      }
    }
    setCamVisible(true)
  }

  async function captureAndSubmit() {
    if (!camRef.current || busy) return
    setBusy(true)
    let photoBase64: string | undefined
    try {
      const photo = await camRef.current.takePictureAsync({ base64: true, quality: 0.5 })
      photoBase64 = photo?.base64 ?? undefined
    } catch {
      // sin foto: continúa igual
    }
    setCamVisible(false)

    const body: ClockBody = { photoBase64 }
    if (open && noBreak) body.skipBreak = true
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        body.lat = loc.coords.latitude
        body.lng = loc.coords.longitude
        body.accuracy = loc.coords.accuracy ?? undefined
      }
    } catch {
      // sin ubicación: continúa
    }

    const res = open ? await clockOut(body) : await clockIn(body)
    setBusy(false)
    if (res?.error) {
      Alert.alert(res.error)
    } else {
      Alert.alert(open ? t('clock.clockedOut') : t('clock.clockedIn'))
      if (res?.data?.outsideGeofence) Alert.alert(t('clock.outside'))
      setNoBreak(false)
    }
    load()
  }

  async function handleFix() {
    if (!open) return
    if (!DATE_RE.test(fixDate) || !TIME_RE.test(fixTime)) {
      Alert.alert(t('history.badFormat'))
      return
    }
    setBusy(true)
    const res = await fixClockOut({
      entryId: open.id,
      date: fixDate,
      time: fixTime,
      noBreak,
      reason: fixReason,
    })
    setBusy(false)
    if (res?.error) Alert.alert(res.error)
    else {
      Alert.alert(t('clock.fixSent'))
      setFixReason('')
      setNoBreak(false)
      load()
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  const breakMinutes = week?.breakPolicy?.autoDeductMinutes ?? 0
  const breakOn = breakMinutes > 0
  const stale = open ? Date.now() - Date.parse(open.clock_in_at) > STALE_MS : false
  const todayMinutes = week?.days.find((d) => d.day === week.today)?.minutes ?? 0

  // Contador de jornada: meta EN SITIO = jornada pagada + almuerzo no pagado.
  const standardShift = week?.standardShiftMinutes ?? 0
  const shiftTarget =
    standardShift > 0
      ? standardShift +
        (breakOn && standardShift >= (week?.breakPolicy?.thresholdMinutes ?? 0) ? breakMinutes : 0)
      : 0
  const elapsedMin = open ? Math.max(0, Math.floor((nowTick - Date.parse(open.clock_in_at)) / 60_000)) : 0
  const remainingMin = shiftTarget - elapsedMin
  const shiftPct = shiftTarget > 0 ? Math.min(100, Math.round((elapsedMin / shiftTarget) * 100)) : 0
  const estOut = open && shiftTarget > 0 ? new Date(Date.parse(open.clock_in_at) + shiftTarget * 60_000) : null

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      {/* Turno abierto "olvidado" → corregir la salida */}
      {open && stale && (
        <View style={styles.fixCard}>
          <Text style={styles.fixTitle}>{t('clock.forgotTitle')}</Text>
          <Text style={styles.fixHint}>{t('clock.forgotHint')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('clock.outDate')}
              placeholderTextColor={colors.muted}
              value={fixDate}
              onChangeText={setFixDate}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('clock.outTime')}
              placeholderTextColor={colors.muted}
              value={fixTime}
              onChangeText={setFixTime}
              autoCapitalize="none"
            />
          </View>
          {breakOn && (
            <View style={styles.switchRow}>
              <Switch value={noBreak} onValueChange={setNoBreak} />
              <Text style={styles.switchLabel}>{t('clock.noLunch', { minutes: breakMinutes })}</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={t('clock.reason')}
            placeholderTextColor={colors.muted}
            value={fixReason}
            onChangeText={setFixReason}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.fixBtn, (busy || fixReason.trim().length < 3) && { opacity: 0.5 }]}
            onPress={handleFix}
            disabled={busy || fixReason.trim().length < 3}
          >
            <Text style={styles.fixBtnText}>{t('clock.sendFix')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{open ? t('clock.onShift') : t('clock.offShift')}</Text>
        {open && <Text style={styles.statusTime}>{new Date(open.clock_in_at).toLocaleTimeString()}</Text>}
        {open && <Text style={styles.elapsed}>{fmtMin(elapsedMin)}</Text>}

        {/* Contador contra la jornada estándar (informativo) */}
        {open && shiftTarget > 0 && (
          <View style={styles.shiftBox}>
            <View style={styles.shiftBarBg}>
              <View
                style={[
                  styles.shiftBarFill,
                  { width: `${shiftPct}%` as `${number}%` },
                  remainingMin <= 0 && { backgroundColor: colors.success },
                ]}
              />
            </View>
            {remainingMin > 0 ? (
              <Text style={styles.shiftText}>
                {t('clock.shiftRemaining', { time: fmtMin(remainingMin) })}
                {estOut
                  ? ` · ${t('clock.estOut', {
                      time: estOut.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
                    })}`
                  : ''}
              </Text>
            ) : (
              <Text style={[styles.shiftText, { color: colors.success, fontWeight: '700' }]}>
                {t('clock.shiftDone')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Al salir: no tomé almuerzo (si la org descuenta automático) */}
      {open && !stale && breakOn && (
        <View style={[styles.switchRow, styles.lunchRow]}>
          <Switch value={noBreak} onValueChange={setNoBreak} />
          <Text style={styles.switchLabel}>{t('clock.noLunch', { minutes: breakMinutes })}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.bigBtn, { backgroundColor: open ? colors.danger : colors.primary }]}
        onPress={startCapture}
        disabled={busy}
      >
        <Text style={styles.bigBtnText}>
          {busy ? '…' : open ? t('clock.clockOut') : t('clock.clockIn')}
        </Text>
      </TouchableOpacity>

      {/* Resumen hoy / semana */}
      {week && (
        <View style={styles.summary}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>{fmtMin(todayMinutes)}</Text>
            <Text style={styles.summaryLabel}>{t('clock.today')}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryVal}>{fmtMin(week.totals.total)}</Text>
            <Text style={styles.summaryLabel}>{t('clock.thisWeek')}</Text>
          </View>
        </View>
      )}

      <Modal visible={camVisible} animationType="slide">
        <View style={styles.camWrap}>
          <CameraView ref={camRef} style={{ flex: 1 }} facing="front" />
          <View style={styles.camControls}>
            <TouchableOpacity onPress={() => setCamVisible(false)}>
              <Text style={styles.camCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutter} onPress={captureAndSubmit} disabled={busy} />
            <View style={{ width: 70 }} />
          </View>
          <Text style={styles.camHint}>{t('clock.take')}</Text>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: { fontSize: 16, color: colors.muted },
  statusTime: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 6 },
  elapsed: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 2 },
  shiftBox: { alignSelf: 'stretch', marginTop: 12, gap: 6 },
  shiftBarBg: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  shiftBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  shiftText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  bigBtn: { borderRadius: 100, paddingVertical: 28, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 20,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryVal: { fontWeight: '800', fontSize: 16, color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lunchRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  switchLabel: { color: colors.text, flexShrink: 1, fontSize: 13 },
  fixCard: {
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  fixTitle: { fontWeight: '800', color: colors.text },
  fixHint: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 10 },
  fixBtn: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fixBtnText: { color: '#fff', fontWeight: '800' },
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
  camWrap: { flex: 1, backgroundColor: '#000' },
  camControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  camCancel: { color: '#fff', fontSize: 16, width: 70 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', borderWidth: 4, borderColor: '#94a3b8' },
  camHint: { position: 'absolute', top: 60, alignSelf: 'center', color: '#fff', fontSize: 16 },
})
