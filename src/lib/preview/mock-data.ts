// =============================================================================
// Mock data para el modo preview (/[locale]/preview/*).
// =============================================================================
// Datos realistas que reproducen el aspecto del producto en producción.
// Estos NO tocan Supabase — solo se importan en las páginas /preview.
// =============================================================================

import type { MapPoint, MapGeofence } from '@/components/admin/LiveMap'

export const MOCK_ORG = {
  id: 'org_acme',
  name: 'Acme Construction LLC',
  country: 'US' as const,
  plan: 'advanced' as const,
  subscriptionStatus: 'active' as const,
  trialDaysLeft: null,
}

export const MOCK_EMPLOYEES = [
  {
    id: 'emp_1',
    first_name: 'Maria',
    last_name: 'García',
    email: 'maria@acme.example',
    hire_date: '2025-03-15',
    job_title: 'Drywall installer',
    status: 'active' as const,
    employee_type: 'employee' as const,
    primary_jurisdiction_code: 'US-NY',
    scheme_type: 'hourly' as const,
    rate_cents: 2800,
    has_portal: true,
  },
  {
    id: 'emp_2',
    first_name: 'Carlos',
    last_name: 'Rivera',
    email: 'carlos@acme.example',
    hire_date: '2024-11-01',
    job_title: 'Lead framer',
    status: 'active' as const,
    employee_type: 'employee' as const,
    primary_jurisdiction_code: 'US-NY',
    scheme_type: 'salary' as const,
    annual_cents: 7200000,
    has_portal: true,
  },
  {
    id: 'emp_3',
    first_name: 'James',
    last_name: 'Thompson',
    email: 'james@acme.example',
    hire_date: '2025-01-20',
    job_title: 'Painter',
    status: 'active' as const,
    employee_type: 'contractor' as const,
    primary_jurisdiction_code: 'US-NY',
    scheme_type: 'daily' as const,
    daily_rate_cents: 22000,
    has_portal: false,
  },
  {
    id: 'emp_4',
    first_name: 'Linda',
    last_name: 'Nguyen',
    email: 'linda@acme.example',
    hire_date: '2025-02-08',
    job_title: 'Project coordinator',
    status: 'active' as const,
    employee_type: 'employee' as const,
    primary_jurisdiction_code: 'US-NY',
    scheme_type: 'salary' as const,
    annual_cents: 6500000,
    has_portal: true,
  },
  {
    id: 'emp_5',
    first_name: 'Diego',
    last_name: 'Hernández',
    email: 'diego@acme.example',
    hire_date: '2024-08-12',
    job_title: 'Sales (commission)',
    status: 'active' as const,
    employee_type: 'employee' as const,
    primary_jurisdiction_code: 'US-NY',
    scheme_type: 'commission' as const,
    base_cents: 200000,
    rate_pct: 0.07,
    has_portal: true,
  },
]

export const MOCK_LIVE_POINTS: MapPoint[] = [
  { id: 'p1', lat: 40.6892, lng: -73.9442, label: 'Maria García', subtitle: 'Since 6:47 AM', variant: 'normal' },
  { id: 'p2', lat: 40.6852, lng: -73.9512, label: 'Carlos Rivera', subtitle: 'Since 7:15 AM', variant: 'normal' },
  { id: 'p3', lat: 40.6962, lng: -73.9382, label: 'Diego Hernández', subtitle: 'Since 8:02 AM', variant: 'flagged' },
]

export const MOCK_WORKSITES: MapGeofence[] = [
  { id: 'w1', lat: 40.6892, lng: -73.9442, radius_m: 300, label: 'Brooklyn Job Site #1' },
  { id: 'w2', lat: 40.6962, lng: -73.9382, radius_m: 200, label: 'Bay Ridge Restaurant' },
]

export type MockTimeEntry = {
  id: string
  employee_name: string
  clock_in_at: string
  clock_out_at: string | null
  billable_minutes: number | null
  status: 'open' | 'pending' | 'approved' | 'rejected'
  outside_geofence: boolean
  worksite: string | null
  lat: number
  lng: number
}

export const MOCK_TIME_ENTRIES: MockTimeEntry[] = [
  {
    id: 'te_1',
    employee_name: 'Maria García',
    clock_in_at: '2026-05-23T11:47:00Z',
    clock_out_at: null,
    billable_minutes: null,
    status: 'open',
    outside_geofence: false,
    worksite: 'Brooklyn Job Site #1',
    lat: 40.6892,
    lng: -73.9442,
  },
  {
    id: 'te_2',
    employee_name: 'Diego Hernández',
    clock_in_at: '2026-05-23T13:02:00Z',
    clock_out_at: null,
    billable_minutes: null,
    status: 'open',
    outside_geofence: true,
    worksite: null,
    lat: 40.6962,
    lng: -73.9382,
  },
  {
    id: 'te_3',
    employee_name: 'Carlos Rivera',
    clock_in_at: '2026-05-22T12:15:00Z',
    clock_out_at: '2026-05-22T22:30:00Z',
    billable_minutes: 615,
    status: 'pending',
    outside_geofence: false,
    worksite: 'Brooklyn Job Site #1',
    lat: 40.6892,
    lng: -73.9442,
  },
  {
    id: 'te_4',
    employee_name: 'Linda Nguyen',
    clock_in_at: '2026-05-22T13:00:00Z',
    clock_out_at: '2026-05-22T21:15:00Z',
    billable_minutes: 495,
    status: 'pending',
    outside_geofence: false,
    worksite: 'Brooklyn Job Site #1',
    lat: 40.6892,
    lng: -73.9442,
  },
  {
    id: 'te_5',
    employee_name: 'Maria García',
    clock_in_at: '2026-05-21T11:35:00Z',
    clock_out_at: '2026-05-21T20:10:00Z',
    billable_minutes: 515,
    status: 'approved',
    outside_geofence: false,
    worksite: 'Brooklyn Job Site #1',
    lat: 40.6892,
    lng: -73.9442,
  },
  {
    id: 'te_6',
    employee_name: 'Carlos Rivera',
    clock_in_at: '2026-05-21T12:18:00Z',
    clock_out_at: '2026-05-21T21:45:00Z',
    billable_minutes: 567,
    status: 'approved',
    outside_geofence: false,
    worksite: 'Brooklyn Job Site #1',
    lat: 40.6892,
    lng: -73.9442,
  },
]

export const MOCK_PAYROLL_RUNS = [
  {
    id: 'run_1',
    name: 'Week 21 — May 18-24',
    period_start: '2026-05-18',
    period_end: '2026-05-24',
    pay_date: '2026-05-29',
    status: 'draft' as const,
    total_gross_cents: 1842600,
    total_net_cents: 1378950,
    employees: 5,
  },
  {
    id: 'run_2',
    name: 'Week 20 — May 11-17',
    period_start: '2026-05-11',
    period_end: '2026-05-17',
    pay_date: '2026-05-22',
    status: 'paid' as const,
    total_gross_cents: 1798450,
    total_net_cents: 1346800,
    employees: 5,
  },
  {
    id: 'run_3',
    name: 'Week 19 — May 4-10',
    period_start: '2026-05-04',
    period_end: '2026-05-10',
    pay_date: '2026-05-15',
    status: 'paid' as const,
    total_gross_cents: 1812300,
    total_net_cents: 1357250,
    employees: 5,
  },
]

export const MOCK_EMPLOYEE_SESSION = {
  employee: {
    id: 'emp_1',
    full_name: 'Maria García',
    job_title: 'Drywall installer',
    email: 'maria@acme.example',
    hire_date: '2025-03-15',
    tax_id_last_four: '4729',
    org_name: 'Acme Construction LLC',
  },
  open_entry: {
    id: 'te_1',
    clock_in_at: '2026-05-23T11:47:00Z',
    outside_geofence: false,
  },
  history: [
    { id: 'h1', date: '2026-05-22', clock_in: '7:42 AM', clock_out: '4:30 PM', hours: 8.5, status: 'approved' as const },
    { id: 'h2', date: '2026-05-21', clock_in: '7:35 AM', clock_out: '4:10 PM', hours: 8.5, status: 'approved' as const },
    { id: 'h3', date: '2026-05-20', clock_in: '7:50 AM', clock_out: '4:00 PM', hours: 8.0, status: 'approved' as const },
    { id: 'h4', date: '2026-05-19', clock_in: '8:00 AM', clock_out: '4:15 PM', hours: 8.0, status: 'approved' as const },
    { id: 'h5', date: '2026-05-18', clock_in: '7:45 AM', clock_out: '3:55 PM', hours: 8.0, status: 'approved' as const },
  ],
  paystubs: [
    { id: 'ps1', period: 'May 11-17', pay_date: '2026-05-22', gross: 95200, net: 71250, taxes: 23950 },
    { id: 'ps2', period: 'May 4-10', pay_date: '2026-05-15', gross: 89600, net: 67100, taxes: 22500 },
    { id: 'ps3', period: 'Apr 27 - May 3', pay_date: '2026-05-08', gross: 92400, net: 69180, taxes: 23220 },
  ],
}

export const MOCK_TENANTS = [
  {
    id: 'org_acme',
    name: 'Acme Construction LLC',
    slug: 'acme-construction',
    country: 'US',
    plan: 'advanced',
    status: 'active',
    employees: 5,
    created_at: '2025-08-12',
    mrr: 99,
  },
  {
    id: 'org_taco',
    name: 'Taco Brooklyn Inc.',
    slug: 'taco-brooklyn',
    country: 'US',
    plan: 'essential',
    status: 'active',
    employees: 8,
    created_at: '2026-01-04',
    mrr: 49,
  },
  {
    id: 'org_dryw',
    name: 'Drywall Heroes',
    slug: 'drywall-heroes',
    country: 'US',
    plan: 'premium',
    status: 'active',
    employees: 23,
    created_at: '2025-11-20',
    mrr: 199,
  },
  {
    id: 'org_paint',
    name: 'Paint Co. Manhattan',
    slug: 'paint-co',
    country: 'US',
    plan: 'advanced',
    status: 'trialing',
    employees: 4,
    created_at: '2026-05-15',
    mrr: 0,
  },
  {
    id: 'org_grill',
    name: 'Brooklyn Grill',
    slug: 'brooklyn-grill',
    country: 'US',
    plan: 'essential',
    status: 'past_due',
    employees: 6,
    created_at: '2025-09-30',
    mrr: 0,
  },
]

export const MOCK_PLATFORM_METRICS = {
  total_tenants: 47,
  active_subscriptions: 38,
  trialing: 6,
  past_due: 3,
  mrr: 6_137,
  total_employees: 312,
  workers_clocked_in_now: 84,
  new_tenants_per_month: [
    { label: 'Dec 2025', value: 4 },
    { label: 'Jan 2026', value: 7 },
    { label: 'Feb 2026', value: 9 },
    { label: 'Mar 2026', value: 11 },
    { label: 'Apr 2026', value: 8 },
    { label: 'May 2026', value: 8 },
  ],
  churn_per_month: [
    { label: 'Dec 2025', value: 0 },
    { label: 'Jan 2026', value: 1 },
    { label: 'Feb 2026', value: 2 },
    { label: 'Mar 2026', value: 1 },
    { label: 'Apr 2026', value: 3 },
    { label: 'May 2026', value: 2 },
  ],
}

export const MOCK_WEBHOOK_EVENTS = [
  { id: 'we_1', provider: 'stripe', external_id: 'evt_1a2b', event_type: 'invoice.paid', processed_at: '2026-05-23T10:14:00Z', error: null },
  { id: 'we_2', provider: 'stripe', external_id: 'evt_2c3d', event_type: 'customer.subscription.updated', processed_at: '2026-05-23T09:42:00Z', error: null },
  { id: 'we_3', provider: 'myravex', external_id: null, event_type: 'time.entry.created', processed_at: null, error: null },
  { id: 'we_4', provider: 'stripe', external_id: 'evt_3e4f', event_type: 'checkout.session.completed', processed_at: '2026-05-22T18:30:00Z', error: null },
  { id: 'we_5', provider: 'stripe', external_id: 'evt_4g5h', event_type: 'invoice.payment_failed', processed_at: null, error: 'Webhook signature mismatch' },
]
