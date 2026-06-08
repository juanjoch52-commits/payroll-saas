'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

// =============================================================================
// Server Actions — Onboarding (tutorial interactivo)
// =============================================================================
// Persisten los flags de "descartado" del tour y del checklist en
// organizations.onboarding_state (jsonb). El progreso real se computa aparte.
// =============================================================================

type OnboardingKind = 'tour' | 'checklist'

export async function dismissOnboarding(
  kind: OnboardingKind,
): Promise<{ success: boolean }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) return { success: false }

  const supabase = createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('onboarding_state')
    .eq('id', session.organizationId)
    .maybeSingle()

  const state = ((org as { onboarding_state?: Record<string, unknown> } | null)?.onboarding_state ?? {}) as Record<string, unknown>
  state[kind === 'tour' ? 'tourDismissed' : 'checklistDismissed'] = true

  const { error } = await supabase
    .from('organizations')
    .update({ onboarding_state: state })
    .eq('id', session.organizationId)

  if (error) return { success: false }
  revalidatePath('/(app)/dashboard', 'page')
  return { success: true }
}

/** Re-activa el onboarding (p.ej. desde un botón "ver tutorial de nuevo"). */
export async function resetOnboarding(): Promise<{ success: boolean }> {
  const session = await requireSession('/en/login')
  if (!['owner', 'admin', 'manager'].includes(session.role)) return { success: false }

  const supabase = createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ onboarding_state: {} })
    .eq('id', session.organizationId)

  if (error) return { success: false }
  revalidatePath('/(app)/dashboard', 'page')
  return { success: true }
}
