/**
 * Helpers para login en tests E2E. Requieren seed data: ver supabase/seed.sql
 * con usuarios de prueba (owner@test.com / employee@test.com / platform@test.com).
 *
 * En CI lo más limpio es usar Supabase con `supabase db reset` antes de la suite.
 */
import type { Page } from '@playwright/test'

export async function loginAsOwner(page: Page, locale = 'en') {
  await page.goto(`/${locale}/login`)
  await page.fill('input[name=email]', 'owner@test.com')
  await page.fill('input[name=password]', 'test1234')
  await page.click('button[type=submit]')
  await page.waitForURL(`**/${locale}/dashboard`, { timeout: 10_000 })
}

export async function loginAsEmployee(page: Page, locale = 'en') {
  await page.goto(`/${locale}/login`)
  await page.fill('input[name=email]', 'employee@test.com')
  await page.fill('input[name=password]', 'test1234')
  await page.click('button[type=submit]')
  await page.waitForURL(`**/${locale}/clock`, { timeout: 10_000 })
}

export async function loginAsPlatformAdmin(page: Page, locale = 'en') {
  await page.goto(`/${locale}/login`)
  await page.fill('input[name=email]', 'platform@test.com')
  await page.fill('input[name=password]', 'test1234')
  await page.click('button[type=submit]')
  await page.waitForURL(`**/${locale}/dashboard`, { timeout: 10_000 })
}
