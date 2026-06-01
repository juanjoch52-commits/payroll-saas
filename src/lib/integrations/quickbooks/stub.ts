// Resultados deterministas cuando QuickBooks no está configurado/conectado.
// Mismo contrato que el stub de Track1099 (e-filing) en el resto del repo.

export function stubPushResult(runId: string) {
  return { id: `MOCK-JE-${runId.slice(0, 8).toUpperCase()}`, mock: true as const }
}

export function stubEmployeeResult(employeeId: string) {
  return { qboId: `MOCK-EMP-${employeeId.slice(0, 8).toUpperCase()}`, mock: true as const }
}
