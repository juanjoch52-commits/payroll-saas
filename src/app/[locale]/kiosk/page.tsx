import { setRequestLocale } from 'next-intl/server'
import { KioskApp } from '@/components/kiosk/KioskApp'

/**
 * Punto de entrada del kiosko. Es un client component (KioskApp) porque todo
 * el flujo vive en el navegador de la tablet: token en localStorage, cámara,
 * geolocalización, y llamadas a Server Actions autenticadas por device_token.
 */
export default function KioskPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)
  return <KioskApp />
}
