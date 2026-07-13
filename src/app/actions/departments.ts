'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/auth/session'

function isManager(role: string) {
  return ['owner', 'admin', 'manager'].includes(role)
}
export type DeptResult = { success: boolean; error?: string }

export async function createDepartment(name: string): Promise<DeptResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  if (!name.trim() || name.length > 60) return { success: false, error: 'Nombre inválido.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('departments')
    .insert({ organization_id: session.organizationId, name: name.trim() })
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/departments', 'page')
  return { success: true }
}

export async function deleteDepartment(id: string): Promise<DeptResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('departments')
    .update({ is_active: false })
    .eq('id', id)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/departments', 'page')
  return { success: true }
}

export async function setEmployeeDepartment(
  employeeId: string,
  departmentId: string,
): Promise<DeptResult> {
  const session = await requireSession('/en/login')
  if (!isManager(session.role)) return { success: false, error: 'No autorizado.' }
  const supabase = createClient()
  const { error } = await supabase
    .from('employees')
    .update({ department_id: departmentId || null })
    .eq('id', employeeId)
    .eq('organization_id', session.organizationId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/(app)/departments', 'page')
  return { success: true }
}
