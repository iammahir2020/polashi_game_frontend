import { expect, test } from '@playwright/test'
import { skipIntro, stubGameServer } from './helpers'

// The English/Bangla toggle in a real browser: what unit tests can't see is
// the CSS (letter spacing switched off for Bangla), the self-hosted Bengali
// font actually loading under the site's Content-Security-Policy, and the
// choice surviving a reload.

test.beforeEach(async ({ page }) => {
  await stubGameServer(page)
  await skipIntro(page)
})

test('the start screen switches to Bangla, with the Bengali font, and stays that way', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible()

  // One toggle in the header on every layout; `.first()` keeps the locator
  // strict even if another is ever added further down the page.
  await page.getByRole('button', { name: /switch to bangla/i }).first().click()

  await expect(page.getByPlaceholder('ছদ্মনাম লিখুন...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'নতুন ঘাঁটি স্থাপন করুন' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')

  // Inline letter spacing is overridden while in Bangla (index.css).
  const spacing = await page.getByText('নাম লেখান').evaluate((el) => getComputedStyle(el).letterSpacing)
  expect(spacing).toBe('normal')

  // The Bengali face of Cinzel/EB Garamond is our own subset of Noto Serif
  // Bengali, served from /fonts. It must load (CSP allows font-src 'self').
  await expect
    .poll(() =>
      page.evaluate(async () => {
        await document.fonts.ready
        let loaded = false
        document.fonts.forEach((f) => {
          if (f.unicodeRange.toUpperCase().includes('U+980') && f.status === 'loaded') loaded = true
        })
        return loaded
      }),
    )
    .toBe(true)

  await page.reload()
  await expect(page.getByPlaceholder('ছদ্মনাম লিখুন...')).toBeVisible()

  await page.getByRole('button', { name: /switch to english/i }).first().click()
  await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('the how-to-play page and its walkthrough switch to Bangla', async ({ page }) => {
  await page.goto('/how-to-play')
  await page.getByRole('button', { name: /switch to bangla/i }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'চরিত্র ও তাঁদের বিশেষ ক্ষমতা' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3 })).toContainText('ধাপ ১।')
  // The Bangla screenshots show the game in Bangla.
  await expect(page.locator('img[src^="/walkthrough/"]').first()).toHaveAttribute('src', /^\/walkthrough\/bn\//)
})
