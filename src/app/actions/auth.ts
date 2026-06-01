'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { INDUSTRY_TYPES, type IndustryType } from '@/lib/industry/presets'

// =============================================================================
// Server Actions — Auth
// =============================================================================
// Estas funciones se ejecutan en el servidor con la sesión del request actual.
// Validan input con Zod, llaman a Supabase, y devuelven errores serializables
// para mostrar en el formulario del cliente.
// =============================================================================

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  organizationName: z.string().min(2, 'El nombre de la empresa debe tener al menos 2 caracteres.'),
  locale: z.string().default('en'),
  country: z.enum(['US', 'CA']).default('US'),
  industryType: z
    .enum(INDUSTRY_TYPES as unknown as [IndustryType, ...IndustryType[]])
    .default('general'),
})

export type SignUpResult =
  | { success: true; email: string }
  | { success: false; error: string; field?: string }

/**
 * Registra un user nuevo en Supabase Auth.
 *
 * El trigger SQL `on_auth_user_created` (migración 11) se encarga de crear
 * automáticamente la `organization` + `membership` + `subscription` (trial)
 * leyendo `pending_org_name` de `raw_user_meta_data`.
 *
 * El user debe confirmar el email antes de poder iniciar sesión.
 */
export async function signUp(formData: FormData): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    organizationName: formData.get('organizationName'),
    locale: formData.get('locale') ?? 'en',
    country: formData.get('country') ?? 'US',
    industryType: formData.get('industryType') ?? 'general',
  })

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: issue.message, field: issue.path[0]?.toString() }
  }

  const { email, password, organizationName, locale, country, industryType } = parsed.data
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/dashboard`,
      data: {
        pending_org_name: organizationName,
        locale,
        country,
        industry_type: industryType,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, email }
}

// -----------------------------------------------------------------------------

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  locale: z.string().default('en'),
})

export type SignInResult = { success: false; error: string } | undefined

/**
 * Inicia sesión con email + password.
 * Si tiene éxito, redirige al dashboard del locale activo.
 */
export async function signIn(formData: FormData): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale') ?? 'en',
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { email, password, locale } = parsed.data
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/dashboard`)
}

// -----------------------------------------------------------------------------

/**
 * Cierra la sesión actual y redirige al landing.
 */
export async function signOut(locale: string = 'en') {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`/${locale}`)
}

// -----------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  locale: z.string().default('en'),
})

export type ForgotPasswordResult = { success: boolean; error?: string }

/**
 * Manda el email de reset de password.
 */
export async function forgotPassword(formData: FormData): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
    locale: formData.get('locale') ?? 'en',
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { email, locale } = parsed.data
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/reset-password`,
  })

  // Devolvemos success aunque el email no exista, para no filtrar
  // qué emails están registrados (mejor práctica de seguridad).
  return { success: true, error: error?.message }
}
