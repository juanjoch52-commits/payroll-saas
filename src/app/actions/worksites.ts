'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

const worksiteSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().int().min(10).max(100000).default(100),
})

export type WorksiteResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createWorksite(formData: FormData): Promise<WorksiteResult> {
  const parsed = worksiteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso.' }
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('worksites')
    .insert({
      organization_id: session.organizationId,
      name: parsed.data.name,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radius_m: parsed.data.radius_m,
      created_by: session.userId,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Error creando worksite.' }
  revalidatePath('/(app)/worksites', 'page')
  return { success: true, id: data.id }
}

export async function toggleWorksite(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return { success: false, error: 'No tienes permiso.' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('worksites')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/worksites', 'page')
  return { success: true }
}
