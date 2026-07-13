'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// Auto-servicio del empleado: actualiza SUS datos de contacto.
const schema = z.object({
  phone: z.string().max(30).optional(),
  addressLine1: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
})

export async function updateMyProfile(input: z.input<typeof schema>): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', session.userId)
    .eq('organization_id', session.organizationId)
    .maybeSingle()
  if (!emp) return { success: false, error: 'No autorizado.' }

  // employees.update está restringido a manager+ por RLS; el auto-servicio
  // del empleado va por service role, validado a SU propia fila.
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { success: false, error: 'Servidor sin configurar.' }
  }
  const { error } = await admin
    .from('employees')
    .update({
      phone: d.phone || null,
      address: {
        line1: d.addressLine1 || null,
        city: d.city || null,
        region: d.region || null,
        postalCode: d.postalCode || null,
      },
    })
    .eq('id', (emp as { id: string }).id)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(employee)/profile', 'page')
  return { success: true }
}
