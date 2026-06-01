import { I18n } from 'i18n-js'
import { getLocales } from 'expo-localization'

// Traducciones de la app móvil (subset: login, clock, history, paystubs, profile).
const translations = {
  en: {
    appName: 'MyJova',
    common: { loading: 'Loading…', retry: 'Retry', cancel: 'Cancel', close: 'Close' },
    login: {
      title: 'Sign in',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      error: 'Wrong email or password.',
    },
    tabs: { clock: 'Clock', history: 'History', paystubs: 'Pay', profile: 'Profile' },
    clock: {
      title: 'Time clock',
      clockIn: 'Clock in',
      clockOut: 'Clock out',
      onShift: 'On shift since',
      offShift: 'Not clocked in',
      take: 'Take selfie & continue',
      clockedIn: 'Clocked in',
      clockedOut: 'Clocked out',
      outside: 'You are outside the worksite area.',
      needCamera: 'Camera permission is required.',
    },
    history: { title: 'Recent shifts', empty: 'No shifts yet.', open: 'Open', hours: 'h' },
    paystubs: {
      title: 'Pay stubs',
      empty: 'No pay stubs yet.',
      gross: 'Gross',
      net: 'Net',
      earnings: 'Earnings',
      deductions: 'Taxes & deductions',
      download: 'Download PDF',
      payDate: 'Pay date',
    },
    profile: { title: 'Profile', signOut: 'Sign out', notifications: 'Notifications on' },
  },
  es: {
    appName: 'MyJova',
    common: { loading: 'Cargando…', retry: 'Reintentar', cancel: 'Cancelar', close: 'Cerrar' },
    login: {
      title: 'Iniciar sesión',
      email: 'Correo',
      password: 'Contraseña',
      signIn: 'Entrar',
      error: 'Correo o contraseña incorrectos.',
    },
    tabs: { clock: 'Fichar', history: 'Historial', paystubs: 'Pago', profile: 'Perfil' },
    clock: {
      title: 'Reloj checador',
      clockIn: 'Fichar entrada',
      clockOut: 'Fichar salida',
      onShift: 'En turno desde',
      offShift: 'Sin fichar',
      take: 'Tomar selfie y continuar',
      clockedIn: 'Entrada registrada',
      clockedOut: 'Salida registrada',
      outside: 'Estás fuera del área del sitio.',
      needCamera: 'Se requiere permiso de cámara.',
    },
    history: { title: 'Turnos recientes', empty: 'Aún no hay turnos.', open: 'Abierto', hours: 'h' },
    paystubs: {
      title: 'Recibos de pago',
      empty: 'Aún no hay recibos.',
      gross: 'Bruto',
      net: 'Neto',
      earnings: 'Ingresos',
      deductions: 'Impuestos y deducciones',
      download: 'Descargar PDF',
      payDate: 'Fecha de pago',
    },
    profile: { title: 'Perfil', signOut: 'Cerrar sesión', notifications: 'Notificaciones activas' },
  },
  fr: {
    appName: 'MyJova',
    common: { loading: 'Chargement…', retry: 'Réessayer', cancel: 'Annuler', close: 'Fermer' },
    login: {
      title: 'Connexion',
      email: 'Courriel',
      password: 'Mot de passe',
      signIn: 'Se connecter',
      error: 'Courriel ou mot de passe incorrect.',
    },
    tabs: { clock: 'Pointer', history: 'Historique', paystubs: 'Paie', profile: 'Profil' },
    clock: {
      title: 'Pointeuse',
      clockIn: "Pointer l'entrée",
      clockOut: 'Pointer la sortie',
      onShift: 'En service depuis',
      offShift: 'Non pointé',
      take: 'Prendre un selfie et continuer',
      clockedIn: 'Entrée enregistrée',
      clockedOut: 'Sortie enregistrée',
      outside: 'Vous êtes hors de la zone du site.',
      needCamera: "L'autorisation de la caméra est requise.",
    },
    history: { title: 'Quarts récents', empty: 'Aucun quart.', open: 'Ouvert', hours: 'h' },
    paystubs: {
      title: 'Bulletins de paie',
      empty: 'Aucun bulletin.',
      gross: 'Brut',
      net: 'Net',
      earnings: 'Revenus',
      deductions: 'Impôts et retenues',
      download: 'Télécharger le PDF',
      payDate: 'Date de paie',
    },
    profile: { title: 'Profil', signOut: 'Se déconnecter', notifications: 'Notifications activées' },
  },
}

const i18n = new I18n(translations)
i18n.locale = getLocales()[0]?.languageCode ?? 'en'
i18n.enableFallback = true
i18n.defaultLocale = 'en'

export const locale = i18n.locale
export function t(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(key, opts)
}
export default i18n
