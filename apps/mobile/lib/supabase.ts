import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * Cliente Supabase de la app móvil. Comparte el MISMO proyecto que la web,
 * así que la RLS por empleado (ver migración 20260401000006) aplica igual.
 * La sesión se persiste en AsyncStorage.
 */
export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
