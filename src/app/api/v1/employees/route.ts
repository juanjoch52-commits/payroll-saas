import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateApiRequest, hasScope } from '@/lib/api/auth'

// =============================================================================
// GET /api/v1/employees → lista empleados de la org del bearer token
// POST /api/v1/employees → crea un empleado nuevo
// =============================================================================
// Reglas:
//   - Bearer token obligatorio (api_keys.key_hash).
//   - GET requiere scope `employees:read` (o `*`).
//   - POST requiere scope `employees:write` (o `*`).
//   - Las queries usan el admin client (bypass RLS) pero filtran por
//     organization_id derivado de la key — no se confía en query params.
// =============================================================================

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasScope(auth.scopes, 'employees:read')) {
    return NextResponse.json({ error: 'Insufficient scope.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('employees')
    .select(
      'id, first_name, last_name, email, status, employee_type, hire_date, primary_jurisdiction_code, external_employee_id',
    )
    .eq('organization_id', auth.organizationId)
    .order('last_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

const createSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_type: z.enum(['employee', 'contractor']).default('employee'),
  primary_jurisdiction_code: z.string().default('US'),
  external_employee_id: z.string().optional(),
})

export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasScope(auth.scopes, 'employees:write')) {
    return NextResponse.json({ error: 'Insufficient scope.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('employees')
    .insert({
      ...parsed.data,
      organization_id: auth.organizationId,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
