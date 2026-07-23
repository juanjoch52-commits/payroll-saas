import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateApiRequest, hasScope } from '@/lib/api/auth'

// =============================================================================
// GET /api/v1/hours?from=YYYY-MM-DD&to=YYYY-MM-DD
// =============================================================================
// Feeds the MyRavex "Bill by hours" bridge (Phase 2). Returns APPROVED time
// entries for the API key's organization in the date window, shaped for
// invoicing: worker name, day, hours, and where the work was done.
//
//   - Bearer API key required (api_keys.key_hash); org derived from the key.
//   - Requires scope `hours:read` (or `*`).
//   - Only status = 'approved' entries — anything pending/rejected is excluded,
//     so MyRavex only ever bills reviewed hours.
//   - Admin client (bypasses RLS) but filtered by organizationId from the key;
//     query params are never trusted for the org.
// =============================================================================

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasScope(auth.scopes, 'hours:read')) {
    return NextResponse.json({ error: 'Insufficient scope.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const to = (searchParams.get('to') || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const from = (searchParams.get('from') || to).slice(0, 10)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('time_entries')
    .select(
      'clock_in_at, billable_minutes, duration_minutes, break_minutes, ' +
        'employees(first_name, last_name), worksites(name, address)',
    )
    .eq('organization_id', auth.organizationId)
    .eq('status', 'approved')
    .not('clock_out_at', 'is', null)
    .gte('clock_in_at', `${from}T00:00:00.000Z`)
    .lte('clock_in_at', `${to}T23:59:59.999Z`)
    .order('clock_in_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hours = (data || [])
    .map((e: Record<string, unknown>) => {
      const emp = (e.employees ?? {}) as { first_name?: string; last_name?: string }
      const ws = (e.worksites ?? {}) as { name?: string; address?: string }
      const minutes =
        typeof e.billable_minutes === 'number'
          ? e.billable_minutes
          : (Number(e.duration_minutes) || 0) - (Number(e.break_minutes) || 0)
      return {
        worker: `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim(),
        date: String(e.clock_in_at ?? '').slice(0, 10),
        hours: Math.round((Math.max(0, minutes) / 60) * 100) / 100,
        location: ws.name || ws.address || '',
      }
    })
    .filter((r) => r.worker && r.hours > 0)

  return NextResponse.json({ hours })
}
