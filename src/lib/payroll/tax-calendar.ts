/**
 * Tax filing deadlines calendar for US and Canada.
 *
 * Used by /reports/tax-calendar page to show upcoming deadlines.
 * Dates are statutory — if they fall on a weekend, IRS/CRA shift to next business day,
 * but we display the legal date.
 */

export type TaxCalendarEvent = {
  id: string
  date: string // ISO yyyy-mm-dd
  jurisdiction: 'US-FED' | 'US-CA' | 'US-NY' | 'US-TX' | 'US-FL' | 'US-PA' | 'US-IL' | 'CA-FED' | 'CA-ON' | 'CA-QC' | 'CA-BC' | 'CA-AB'
  titleKey: string
  descKey: string
  formCodes: string[] // ej: ['W-2', 'W-3']
  recurrence?: 'monthly' | 'quarterly' | 'annual'
}

const YEAR = 2026

export const TAX_CALENDAR_2026: TaxCalendarEvent[] = [
  // ============= US FEDERAL =============
  {
    id: 'us-fed-941-q1',
    date: `${YEAR}-04-30`,
    jurisdiction: 'US-FED',
    titleKey: 'Form 941 — Q1 deadline',
    descKey: 'Quarterly federal tax return for Jan-Mar payroll taxes.',
    formCodes: ['941'],
    recurrence: 'quarterly',
  },
  {
    id: 'us-fed-941-q2',
    date: `${YEAR}-07-31`,
    jurisdiction: 'US-FED',
    titleKey: 'Form 941 — Q2 deadline',
    descKey: 'Quarterly federal tax return for Apr-Jun payroll taxes.',
    formCodes: ['941'],
  },
  {
    id: 'us-fed-941-q3',
    date: `${YEAR}-10-31`,
    jurisdiction: 'US-FED',
    titleKey: 'Form 941 — Q3 deadline',
    descKey: 'Quarterly federal tax return for Jul-Sep payroll taxes.',
    formCodes: ['941'],
  },
  {
    id: 'us-fed-941-q4',
    date: `${YEAR + 1}-01-31`,
    jurisdiction: 'US-FED',
    titleKey: 'Form 941 — Q4 deadline',
    descKey: 'Quarterly federal tax return for Oct-Dec payroll taxes.',
    formCodes: ['941'],
  },
  {
    id: 'us-fed-940',
    date: `${YEAR + 1}-01-31`,
    jurisdiction: 'US-FED',
    titleKey: 'Form 940 — FUTA annual deadline',
    descKey: 'Annual federal unemployment tax return for prior calendar year.',
    formCodes: ['940'],
    recurrence: 'annual',
  },
  {
    id: 'us-fed-w2',
    date: `${YEAR + 1}-01-31`,
    jurisdiction: 'US-FED',
    titleKey: 'W-2 to employees + W-3 to SSA',
    descKey: 'Furnish W-2 to each employee AND file W-2/W-3 with Social Security Administration.',
    formCodes: ['W-2', 'W-3'],
    recurrence: 'annual',
  },
  {
    id: 'us-fed-1099nec',
    date: `${YEAR + 1}-01-31`,
    jurisdiction: 'US-FED',
    titleKey: '1099-NEC + 1096 deadline',
    descKey: 'Furnish 1099-NEC to nonemployees AND file with IRS.',
    formCodes: ['1099-NEC', '1096'],
    recurrence: 'annual',
  },
  // ============= US STATES (a sampling) =============
  {
    id: 'us-ca-de9',
    date: `${YEAR}-04-30`,
    jurisdiction: 'US-CA',
    titleKey: 'CA DE 9 — Q1',
    descKey: 'California Quarterly Contribution Return and Report of Wages.',
    formCodes: ['DE 9', 'DE 9C'],
    recurrence: 'quarterly',
  },
  {
    id: 'us-ny-nys45-q1',
    date: `${YEAR}-04-30`,
    jurisdiction: 'US-NY',
    titleKey: 'NYS-45 — Q1',
    descKey: 'New York Combined Withholding/Wage Reporting/Unemployment Insurance.',
    formCodes: ['NYS-45'],
    recurrence: 'quarterly',
  },
  // ============= CANADA FEDERAL =============
  {
    id: 'ca-fed-t4-feb',
    date: `${YEAR + 1}-02-28`,
    jurisdiction: 'CA-FED',
    titleKey: 'T4 / T4A deadline',
    descKey: 'File T4/T4A slips and summary with CRA; furnish T4 to each employee.',
    formCodes: ['T4', 'T4A'],
    recurrence: 'annual',
  },
  {
    id: 'ca-fed-roe',
    date: `${YEAR}-01-31`,
    jurisdiction: 'CA-FED',
    titleKey: 'ROE — within 5 days of interruption',
    descKey: 'Service Canada requires ROE within 5 calendar days of employee separation.',
    formCodes: ['ROE'],
  },
  {
    id: 'ca-fed-source-q1',
    date: `${YEAR}-04-15`,
    jurisdiction: 'CA-FED',
    titleKey: 'Source deductions remittance',
    descKey: 'CPP, EI and income tax withholdings due by 15th of following month for accelerated remitters.',
    formCodes: ['PD7A'],
    recurrence: 'monthly',
  },
  {
    id: 'ca-qc-tp1015',
    date: `${YEAR + 1}-02-28`,
    jurisdiction: 'CA-QC',
    titleKey: 'Quebec RL-1 deadline',
    descKey: 'File RL-1 slips with Revenu Québec for Quebec employees.',
    formCodes: ['RL-1'],
    recurrence: 'annual',
  },
]

export function getUpcomingEvents(refDate: Date = new Date()): TaxCalendarEvent[] {
  const refMs = refDate.getTime()
  return TAX_CALENDAR_2026.filter((e) => new Date(e.date).getTime() >= refMs).sort(
    (a, b) => a.date.localeCompare(b.date),
  )
}
