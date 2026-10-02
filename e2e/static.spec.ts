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
    '/polashi_bg.webp', '/polashi_bg.jpg', '/polashi_bg_wide.webp', '/polashi_bg_wide.jpg',
    '/Nawab.png', '/EIC.png', '/Observer.png',
    '/green_seal.png', '/red_seal.png', '/green_card.png', '/red_card.png',
  ]
  for (const src of images) {
    const response = await request.get(src)
    expect(response.status(), src).toBe(200)
  }
})

test('security headers from vercel.json are served', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
});

test.describe('the content security policy does not block the app', () => {
  test.beforeEach(async ({ page }) => {
    await stubGameServer(page);
    await page.addInitScript(() => {
      const w = window as typeof window & { __cspViolations?: string[] };
      w.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        w.__cspViolations!.push(`${e.violatedDirective} ${e.blockedURI}`);
      });
    });
  });

  const violations = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as typeof window & { __cspViolations?: string[] }).__cspViolations ?? []);

  test('splash background, fonts, enlistment screen and socket', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'ENTER POLASHI' }).click();
    await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await violations(page)).toEqual([]);
  });

  test('how-to-play page', async ({ page }) => {
    await page.goto('/how-to-play');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Polashi');
    expect(await violations(page)).toEqual([]);
  });
});

test('Google Search Console verification tag is in the served HTML, exactly once', async ({ request }) => {
  for (const path of ['/', '/how-to-play']) {
    const html = await (await request.get(path)).text();
    const tags = html.match(/<meta name="google-site-verification" content="([^"]+)"/g) ?? [];
    expect(tags, path).toEqual([
      '<meta name="google-site-verification" content="N7FTTPpCkAag0cAJWyCs3R5KMLhydi7yOCzpWAMJXS0"',
    ]);
  }
});
