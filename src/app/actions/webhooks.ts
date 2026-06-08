'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { WEBHOOK_EVENTS, generateWebhookSecret } from '@/lib/webhooks/dispatch'

// =============================================================================
// Server Actions — Webhooks salientes (CRUD de endpoints)
// =============================================================================
// Solo managers. El `secret` se genera en el server y se devuelve UNA vez al
// crear (para que el usuario lo copie a su receptor). Después no se vuelve a
// mostrar completo en la UI.
// =============================================================================

function isManager(role: string): boolean {
  return ['owner', 'admin', 'manager'].includes(role)
}

const createSchema = z.object({
  url: z.string().url('URL inválida.').refine((u) => u.startsWith('https://'), 'La URL debe ser https://'),
  description: z.string().max(120).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Selecciona al menos un evento.'),
})

export type CreateWebhookResult =
  | { success: true; secret: string }
  | { success: false; error: string }

export async function createWebhookEndpoint(input: {
  url: string
  description?: string
  events: string[]
}): Promise<CreateWebhookResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const secret = generateWebhookSecret()
  const supabase = createClient()
  const { error } = await supabase.from('webhook_endpoints').insert({
    organization_id: session.organizationId,
    url: parsed.data.url,
    description: parsed.data.description || null,
    events: parsed.data.events,
    secret,
    is_active: true,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true, secret }
}

export async function toggleWebhookEndpoint(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('webhook_endpoints')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true }
}

export async function deleteWebhookEndpoint(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/settings/integrations', 'page')
  return { success: true }
}
