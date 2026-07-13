import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('landing loads', async ({ page }) => {
    await page.goto('/en')
    await expect(page).toHaveTitle(/MyJova/i)
  })
})
