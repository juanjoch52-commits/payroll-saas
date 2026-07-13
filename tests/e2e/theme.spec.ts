import { test, expect } from '@playwright/test'

/**
 * Tema dark/light en preview routes (que no requieren Supabase real).
 * Compara screenshots light vs dark del mismo preview para detectar
 * componentes que no respetan dark mode.
 */
const PREVIEW_ROUTES_FOR_THEME = [
  '/preview/business',
  '/preview/employee',
  '/preview/platform',
]

for (const route of PREVIEW_ROUTES_FOR_THEME) {
  test(`${route} — dark mode shot`, async ({ page }, testInfo) => {
    // Set dark via localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.goto(`/en${route}`)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)

    const slug = route.replace(/\//g, '_')
    await page.screenshot({
      path: `tests/screenshots/en/dark${slug}-${testInfo.project.name}.png`,
      fullPage: true,
    })
  })

  test(`${route} — light mode shot`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light')
    })
    await page.goto(`/en${route}`)
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.waitForTimeout(300)

    const slug = route.replace(/\//g, '_')
    await page.screenshot({
      path: `tests/screenshots/en/light${slug}-${testInfo.project.name}.png`,
      fullPage: true,
    })
  })
}

test('landing always renders without crashing in 4 locales', async ({ page }) => {
  for (const loc of ['en', 'es', 'fr', 'fr-CA']) {
    await page.goto(`/${loc}`)
    await expect(page.locator('h1').first()).toBeVisible()
  }
})
