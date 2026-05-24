import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind, resolviendo conflictos.
 * Uso: `cn('px-4', isActive && 'bg-primary')`
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número entero de centavos como dinero en USD por defecto.
 * Todo en MyJova se almacena en centavos para evitar floats.
 *
 *   formatMoney(12345)          → "$123.45"
 *   formatMoney(12345, 'es-MX') → "$123.45" (locale-aware)
 */
export function formatMoney(
  cents: number,
  locale: string = 'en-US',
  currency: string = 'USD',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/**
 * Formatea una fecha ISO (yyyy-mm-dd) según el locale.
 */
export function formatDate(date: string | Date, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}
