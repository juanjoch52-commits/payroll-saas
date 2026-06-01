import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { getEntries, clockIn, clockOut, type ClockBody } from '../../lib/api'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

type Entry = { id: string; clock_in_at: string; clock_out_at: string | null }

export default function ClockScreen() {
  const [open, setOpen] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [camVisible, setCamVisible] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const camRef = useRef<CameraView>(null)

  async function load() {
    setLoading(true)
    const entries: Entry[] = await getEntries()
    setOpen(entries.find((e) => !e.clock_out_at) ?? null)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

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
    }
    load()
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>
          {open ? t('clock.onShift') : t('clock.offShift')}
        </Text>
        {open && (
          <Text style={styles.statusTime}>
            {new Date(open.clock_in_at).toLocaleTimeString()}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.bigBtn, { backgroundColor: open ? colors.danger : colors.primary }]}
        onPress={startCapture}
        disabled={busy}
      >
        <Text style={styles.bigBtnText}>
          {busy ? '…' : open ? t('clock.clockOut') : t('clock.clockIn')}
        </Text>
      </TouchableOpacity>

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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  statusLabel: { fontSize: 16, color: colors.muted },
  statusTime: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 6 },
  bigBtn: { borderRadius: 100, paddingVertical: 28, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 22, fontWeight: '800' },
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
