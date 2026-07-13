import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { t } from '../../lib/i18n'
import { colors } from '../../lib/theme'

export default function Profile() {
  const { session } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color="#fff" />
      </View>
      <Text style={styles.email}>{session?.user.email}</Text>

      <View style={styles.row}>
        <Ionicons name="notifications-outline" size={20} color={colors.muted} />
        <Text style={styles.rowText}>{t('profile.notifications')}</Text>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: colors.bg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  email: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rowText: { color: colors.text, fontSize: 16 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
})
