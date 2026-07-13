/**
 * Presets por industria / área de trabajo.
 *
 * MyJova cubre construcción, restaurantes, retail, limpieza, jardinería,
 * manufactura, salud y transporte (además de "general"). La industria NO
 * cambia la lógica fiscal — solo conduce DEFAULTS y sugerencias de UX:
 *   - qué esquemas de pago se preseleccionan/ordenan en el form de empleado,
 *   - si conviene activar kiosko, worksites, geofence, propinas o producción,
 *   - el umbral de overtime por defecto.
 *
 * Se lee en: onboarding (signup), form de empleado, y nudges en Settings.
 * Las etiquetas visibles viven en i18n bajo `industry.types.<type>`.
 */

export type IndustryType =
  | 'general'
  | 'construction'
  | 'restaurant'
  | 'retail'
  | 'cleaning'
  | 'landscaping'
  | 'manufacturing'
  | 'healthcare'
  | 'transportation'

export const INDUSTRY_TYPES: readonly IndustryType[] = [
  'general',
  'construction',
  'restaurant',
  'retail',
  'cleaning',
  'landscaping',
  'manufacturing',
  'healthcare',
  'transportation',
] as const

/** Tipos de esquema de pago soportados por el motor (incluye piece-rate desde G1). */
export type PaySchemeType = 'hourly' | 'salary' | 'daily' | 'commission' | 'piecerate'

export interface IndustryPreset {
  /** Esquemas de pago preseleccionados/ordenados en el picker (el primero es el default). */
  defaultPaySchemeTypes: PaySchemeType[]
  /** Sugerir configurar un kiosko/tablet compartida (restaurantes, retail). */
  suggestKiosk: boolean
  /** Sugerir definir worksites (obras, rutas). */
  suggestWorksites: boolean
  /** Sugerir geofence en los worksites (fichaje atado a ubicación). */
  suggestGeofence: boolean
  /** Sugerir capturar propinas (restaurantes). */
  suggestTips: boolean
  /** Sugerir registrar producción por unidad (manufactura, agricultura, construcción a destajo). */
  suggestProduction: boolean
  /** Umbral de horas extra por defecto (US federal = 40/sem). */
  defaultOvertimeThresholdHours: number
  /** Nombre de icono lucide-react para el picker (decorativo). */
  icon: string
}

export const INDUSTRY_PRESETS: Record<IndustryType, IndustryPreset> = {
  general: {
    defaultPaySchemeTypes: ['hourly', 'salary'],
    suggestKiosk: false,
    suggestWorksites: false,
    suggestGeofence: false,
    suggestTips: false,
    suggestProduction: false,
    defaultOvertimeThresholdHours: 40,
    icon: 'Briefcase',
  },
  construction: {
    defaultPaySchemeTypes: ['daily', 'hourly', 'piecerate'],
    suggestKiosk: false,
    suggestWorksites: true,
    suggestGeofence: true,
    suggestTips: false,
    suggestProduction: true,
    defaultOvertimeThresholdHours: 40,
    icon: 'HardHat',
  },
  restaurant: {
    defaultPaySchemeTypes: ['hourly', 'daily'],
    suggestKiosk: true,
    suggestWorksites: true,
    suggestGeofence: true,
    suggestTips: true,
    suggestProduction: false,
    defaultOvertimeThresholdHours: 40,
    icon: 'UtensilsCrossed',
  },
  retail: {
    defaultPaySchemeTypes: ['hourly', 'commission'],
    suggestKiosk: true,
    suggestWorksites: true,
    suggestGeofence: false,
    suggestTips: false,
    suggestProduction: false,
    defaultOvertimeThresholdHours: 40,
    icon: 'Store',
  },
  cleaning: {
    defaultPaySchemeTypes: ['hourly', 'daily', 'piecerate'],
    suggestKiosk: false,
    suggestWorksites: true,
    suggestGeofence: true,
    suggestTips: false,
    suggestProduction: true,
    defaultOvertimeThresholdHours: 40,
    icon: 'Sparkles',
  },
  landscaping: {
    defaultPaySchemeTypes: ['daily', 'hourly'],
    suggestKiosk: false,
    suggestWorksites: true,
    suggestGeofence: true,
    suggestTips: false,
    suggestProduction: false,
    defaultOvertimeThresholdHours: 40,
    icon: 'Trees',
  },
  manufacturing: {
    defaultPaySchemeTypes: ['piecerate', 'hourly'],
    suggestKiosk: true,
    suggestWorksites: false,
    suggestGeofence: false,
    suggestTips: false,
    suggestProduction: true,
    defaultOvertimeThresholdHours: 40,
    icon: 'Factory',
  },
  healthcare: {
    defaultPaySchemeTypes: ['hourly', 'salary'],
    suggestKiosk: true,
    suggestWorksites: true,
    suggestGeofence: false,
    suggestTips: false,
    suggestProduction: false,
    defaultOvertimeThresholdHours: 40,
    icon: 'Stethoscope',
  },
  transportation: {
    defaultPaySchemeTypes: ['daily', 'hourly', 'piecerate'],
    suggestKiosk: false,
    suggestWorksites: false,
    suggestGeofence: false,
    suggestTips: false,
    suggestProduction: true,
    defaultOvertimeThresholdHours: 40,
    icon: 'Truck',
  },
}

/** Devuelve el preset de una industria (cae a `general` si el valor es desconocido). */
export function getIndustryPreset(industry: string | null | undefined): IndustryPreset {
  if (industry && industry in INDUSTRY_PRESETS) {
    return INDUSTRY_PRESETS[industry as IndustryType]
  }
  return INDUSTRY_PRESETS.general
}

/** Type guard. */
export function isIndustryType(value: string): value is IndustryType {
  return (INDUSTRY_TYPES as readonly string[]).includes(value)
}
