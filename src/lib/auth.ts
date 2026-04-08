import { supabase, supabaseAdmin } from './supabase';
import { User, Company } from '@/types';

/**
 * Sign up a new user and create a company
 */
export async function signUp(
  email: string,
  password: string,
  companyName: string,
  companyData: Partial<Company>
) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // 2. Create company in database
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      user_id: authData.user.id,
      name: companyName,
      ...companyData,
    })
    .select()
    .single();

  if (companyError) throw companyError;

  return { user: authData.user, company };
}

/**
 * Sign in user
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get user's company
 */
export async function getUserCompany(userId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

/**
 * Get user profile from auth
 */
export async function getProfile() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/**
 * Send magic link for passwordless sign in
 */
export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) throw error;
}
