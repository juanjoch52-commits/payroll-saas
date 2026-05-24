/**
 * Configuración central de internacionalización (i18n) de MyJova.
 *
 * Los locales soportados son inglés y español. El locale por defecto
 * es inglés porque el mercado MVP de MyJova es US-first.
 *
 * Si añades un nuevo locale:
 *   1. Agrégalo a `locales` aquí.
 *   2. Crea `src/i18n/messages/<locale>.json` con todas las claves.
 *   3. Actualiza el switcher de idioma en `components/layout/LocaleSwitcher.tsx`.
 */

export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

/** Etiquetas mostradas en el switcher de idioma. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
}
