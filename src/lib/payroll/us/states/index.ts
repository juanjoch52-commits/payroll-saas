// =============================================================================
// US State withholding — placeholder stubs
// =============================================================================
// Cada función devuelve 0 por defecto. Para implementar un estado:
//   1) Crear un archivo state-XX.ts con la lógica real de ese estado.
//   2) Importar y enrutar abajo.
//
// Estados con income tax que requieren implementación real (en orden de prioridad
// por mercado de MyJova — contratistas y restaurantes):
//   - CA, NY, NJ, IL, PA, MA, MD, GA, NC, VA  (top 10 por payroll volume)
// Estados sin income tax (devuelven 0 siempre):
//   - AK, FL, NV, NH, SD, TN, TX, WA, WY
// =============================================================================

import type { FilingStatus } from '../federal-2026'

export type StateWithholdingInput = {
  grossCents: number
  periodsPerYear: number
  filingStatus: FilingStatus
  dependents: number
  stateCode: string  // ej. 'US-CA', 'US-NY'
}

export function calcStateWithholding(input: StateWithholdingInput): number {
  // TODO: ramificar por stateCode cuando se implementen estados.
  // Por ahora, todos los estados devuelven 0 — el motor sigue funcionando
  // y el W-2 muestra $0 en Box 17 (state tax).
  void input
  return 0
}
