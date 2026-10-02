import { expect, test } from '@playwright/test'
import { jsonLdTypes, stubGameServer } from './helpers'

test.describe('how-to-play without JavaScript (what crawlers get)', () => {
  test.use({ javaScriptEnabled: false })

  test('the pre-rendered page carries the full content', async ({ page }) => {
    await page.goto('/how-to-play')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Polashi')
    await expect(page.locator('body')).toContainText('5 to 10 players')
    await expect(page.locator('body')).toContainText('Mir Jafor')
    await expect(page.locator('body')).toContainText('Not affiliated with or endorsed by Playground Inc.')
    await expect(page).toHaveTitle(/How to Play Polashi/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/how-to-play$/)
    expect(await jsonLdTypes(page)).toContain('VideoGame')
  })

  test('the landing page has a noscript summary', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('noscript')).toHaveCount(1)
    expect(await page.locator('noscript').innerHTML()).toContain('5 to 10 players')
  })
})

test('how-to-play skips the intro splash', async ({ page }) => {
  await stubGameServer(page)
  await page.goto('/how-to-play')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Polashi')
  await expect(page.getByRole('button', { name: 'ENTER POLASHI' })).toHaveCount(0)
})

test('sitemap lists only public routes', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBe(true)
  const xml = await response.text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  expect(locs.sort()).toEqual(['/', '/how-to-play'])
  expect(xml).not.toContain('room=')
  expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/)
})

test('robots.txt points at the sitemap', async ({ request }) => {
  const text = await (await request.get('/robots.txt')).text()
  expect(text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/)
})

test('manifest and every referenced image are served', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.name).toBe('The Battle of Polashi (পলাশী)')
  expect(manifest.short_name).toBe('Polashi')
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true)

  const images = [
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png', '/og-image.jpg',
    '/polashi_bg.webp', '/polashi_bg.jpg', '/polashi_bg.mp4',
    '/Nawab.png', '/EIC.png', '/Observer.png',
    '/green_seal.png', '/red_seal.png', '/green_card.png', '/red_card.png',
  ]
  for (const src of images) {
    const response = await request.get(src)
    expect(response.status(), src).toBe(200)
  }
})
