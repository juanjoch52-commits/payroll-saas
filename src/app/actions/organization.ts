'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'
import { INDUSTRY_TYPES, type IndustryType } from '@/lib/industry/presets'

// =============================================================================
// Server Actions — Organization (ajustes generales)
// =============================================================================

const industryEnum = z.enum(INDUSTRY_TYPES as unknown as [IndustryType, ...IndustryType[]])

export async function setOrganizationIndustry(
  industryType: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin'].includes(session.role)) {
    return { success: false, error: 'No autorizado.' }
  }

  const parsed = industryEnum.safeParse(industryType)
  if (!parsed.success) return { success: false, error: 'Industria inválida.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ industry_type: parsed.data })
    .eq('id', session.organizationId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/(app)/settings/general', 'page')
  return { success: true }
}
