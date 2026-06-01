import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { registerPushToken } from './api'

/**
 * Pide permiso de notificaciones, obtiene el Expo push token y lo registra
 * en el backend (POST /api/v1/push/register). Llamar tras el login.
 */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return

  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    status = req.status
  }
  if (status !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await registerPushToken(tokenData.data, Platform.OS)
  } catch {
    // sin projectId / sin red: ignorar silenciosamente
  }
}
