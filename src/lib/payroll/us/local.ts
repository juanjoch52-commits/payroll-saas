// =============================================================================
// Impuestos LOCALES (municipales) — simplificados. Validar antes de producción.
// =============================================================================
// NYC y Filadelfia son los más comunes. Las tasas reales pueden ser graduadas;
// aquí usamos una tasa plana representativa con disclaimer.

type Locality = { code: string; name: string; rate: number }

const LOCALITIES: Record<string, Locality> = {
  NYC: { code: 'NYC', name: 'New York City', rate: 0.03078 }, // residente (simplificado)
  PHL: { code: 'PHL', name: 'Philadelphia', rate: 0.0375 }, // wage tax residente (~2024)
  YON: { code: 'YON', name: 'Yonkers', rate: 0.01577 },
}

export const LOCALITY_CODES = Object.keys(LOCALITIES)
export function localityName(code?: string): string | undefined {
  return code ? LOCALITIES[code.toUpperCase()]?.name : undefined
}

export function calcLocalTax(
  localityCode: string | undefined,
  taxableGrossCents: number,
): number {
  if (!localityCode) return 0
  const loc = LOCALITIES[localityCode.toUpperCase()]
  if (!loc) return 0
  return Math.round(taxableGrossCents * loc.rate)
}
