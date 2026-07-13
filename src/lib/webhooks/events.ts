// =============================================================================
// Webhooks — catálogo de eventos (client-safe)
// =============================================================================
// Módulo SIN imports de servidor para poder usarlo tanto en el dispatcher
// (server) como en la UI de Settings (client component). No metas node:crypto
// ni el admin client aquí.
// =============================================================================

export const WEBHOOK_EVENTS = [
  'payroll.approved',
  'payroll.paid',
  'time_entry.approved',
  'timesheet.submitted',
  'timesheet.approved',
  'employee.created',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'payroll.approved': 'Payroll approved',
  'payroll.paid': 'Payroll paid',
  'time_entry.approved': 'Time entry approved',
  'timesheet.submitted': 'Timesheet week submitted',
  'timesheet.approved': 'Timesheet week approved',
  'employee.created': 'Employee created',
}
