import { expect, test } from '@playwright/test'
import { jsonLdTypes, skipIntro, stubGameServer } from './helpers'

const PHYSICAL_GAME_URL =
  'https://www.rokomari.com/product/293046/polashi-a-social-deduction-board-game-5-to-10-players-age-12plus'

test.beforeEach(async ({ page }) => {
  await stubGameServer(page)
})

test('intro splash plays once, then opens the enlistment screen', async ({ page }) => {
  await page.goto('/')

  // A still background, no video: the wide scene on landscape screens at least
  // 500px tall, the vertical one on portrait screens and sideways phones.
  await expect(page.locator('video')).toHaveCount(0)
  const background = page.locator('picture img')
  await expect.poll(() => background.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  const { width, height } = page.viewportSize()!
  const expected = width >= height && height >= 500 ? /\/polashi_bg_wide\.(webp|jpg)$/ : /\/polashi_bg\.(webp|jpg)$/
  expect(await background.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(expected)

  await page.getByRole('button', { name: 'ENTER POLASHI' }).click()
  await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible()

  // Same session: no splash on reload.
  await page.reload()
  await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENTER POLASHI' })).toHaveCount(0)
})

test('landing screen shows the credit footer with the physical game link', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')

  const footer = page.locator('footer')
  await expect(footer).toContainText('Unofficial fan-made digital adaptation of Polashi by Playground Inc.')
  await expect(footer).toContainText('Not affiliated with or endorsed by Playground Inc.')

  const shopLink = footer.getByRole('link', { name: /Get the physical game/ })
  await expect(shopLink).toHaveAttribute('href', PHYSICAL_GAME_URL)
  await expect(shopLink).toHaveAttribute('target', '_blank')
  await expect(shopLink).toHaveAttribute('rel', 'noopener noreferrer')

  await footer.getByRole('link', { name: /how to play/i }).click()
  await expect(page).toHaveURL(/\/how-to-play$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Polashi')
})

test('create and join enable only when the form allows it', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')

  const create = page.getByRole('button', { name: 'Establish New HQ' })
  const join = page.getByRole('button', { name: 'Infiltrate Existing HQ' })
  await expect(create).toBeDisabled()
  await expect(join).toBeDisabled()

  await page.getByPlaceholder('Enter Alias...').fill('Siraj')
  await expect(create).toBeEnabled()
  await expect(join).toBeDisabled()

  // A room code means joining, so creating is switched off. Codes are upper-cased.
  await page.getByPlaceholder('Enter HQ Code').fill('abcd')
  await expect(page.getByPlaceholder('Enter HQ Code')).toHaveValue('ABCD')
  await expect(join).toBeEnabled()
  await expect(create).toBeDisabled()
})

test('landing page head tags and structured data', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/')

  await expect(page).toHaveTitle('The Battle of Polashi (পলাশী) – Online Social Deduction Game')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://the-great-polashi-game.vercel.app/')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-image\.jpg$/)
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
  await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveAttribute('content', 'bn_BD')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')

  const types = await jsonLdTypes(page)
  expect(types).toContain('WebSite')
  expect(types).toContain('VideoGame')
})

test('room invite links are not indexable', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/?room=ABCD')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})

test('unknown paths are not indexable', async ({ page }) => {
  await skipIntro(page)
  await page.goto('/lobby/ABCD')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
})
