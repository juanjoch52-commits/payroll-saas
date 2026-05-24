/**
 * Configuración central de internacionalización (i18n) de MyJova.
 *
 * Locales soportados:
 *   - `en`   — Inglés (US), MVP US-first.
 *   - `es`   — Español, contratistas y restaurantes de habla hispana en US.
 *   - `fr`   — Francés (genérico, Europa).
 *   - `fr-CA` — Francés canadiense (Quebec, terminología payroll CRA).
 *
 * Para añadir un nuevo locale:
 *   1. Agrégalo a `locales` aquí.
 *   2. Crea `src/i18n/messages/<locale>.json` con todas las claves.
 *   3. Asegúrate de que LocaleSwitcher lo muestre.
 */

export const locales = ['en', 'es', 'fr', 'fr-CA'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

/** Etiquetas mostradas en el switcher de idioma. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  'fr-CA': 'Français (Canada)',
}

/** Banderas emoji por locale — usadas en el dropdown del switcher. */
export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  'fr-CA': '🇨🇦',
}

/** Códigos compactos mostrados en el botón. */
export const localeShort: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  'fr-CA': 'FR-CA',
}
