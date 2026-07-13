'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/platform'

// =============================================================================
// Server Actions — Feature overrides por tenant (panel de plataforma)
// =============================================================================
// Solo platform_admins. Permiten activar/desactivar features para un tenant por
// encima de lo que define su plan (beta, cortesía, deshabilitar algo, etc.).
// =============================================================================

export async function setFeatureOverride(input: {
  orgId: string
  flagKey: string
  enabled: boolean
  reason?: string
  expiresAt?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const session = await requirePlatformAdmin('en')
  const flagKey = input.flagKey.trim()
  if (!flagKey) return { success: false, error: 'Flag key is required.' }

  const admin = createAdminClient()
  const { error } = await admin.from('feature_overrides').upsert(
    {
      organization_id: input.orgId,
      flag_key: flagKey,
      enabled: input.enabled,
      reason: input.reason?.trim() || null,
      expires_at: input.expiresAt || null,
      created_by: session.userId,
    },
    { onConflict: 'organization_id,flag_key' },
  )
  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/tenants/${input.orgId}`, 'page')
  return { success: true }
}

export async function removeFeatureOverride(
  orgId: string,
  flagKey: string,
): Promise<{ success: boolean; error?: string }> {
  await requirePlatformAdmin('en')
  const admin = createAdminClient()
  const { error } = await admin
    .from('feature_overrides')
    .delete()
    .eq('organization_id', orgId)
    .eq('flag_key', flagKey)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/tenants/${orgId}`, 'page')
  return { success: true }
}
