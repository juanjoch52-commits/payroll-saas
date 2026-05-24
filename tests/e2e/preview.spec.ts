import { test, expect } from '@playwright/test'

const LOCALES = ['en', 'es', 'fr', 'fr-CA'] as const
const PREVIEW_ROUTES = [
  '/preview',
  '/preview/business',
  '/preview/business/employees',
  '/preview/business/payroll',
  '/preview/business/time-tracking',
  '/preview/business/worksites',
  '/preview/business/reports',
  '/preview/business/billing',
  '/preview/employee',
  '/preview/platform',
]

for (const locale of LOCALES) {
  for (const route of PREVIEW_ROUTES) {
    test(`${locale}${route} renders`, async ({ page }, testInfo) => {
      await page.goto(`/${locale}${route}`)
      // Should not 404 or error
      const body = await page.content()
      expect(body).not.toContain('500')
      expect(body).not.toContain('Application error')

      const slug = route.replace(/\//g, '_') || 'root'
      await page.screenshot({
        path: `tests/screenshots/${locale}/preview${slug}-${testInfo.project.name}.png`,
        fullPage: true,
      })
    })
  }
}
