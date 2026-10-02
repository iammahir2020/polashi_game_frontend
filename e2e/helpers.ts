import type { Page } from '@playwright/test'

// Swallows the socket.io connection so tests never reach the real game server.
export async function stubGameServer(page: Page) {
  await page.routeWebSocket(/socket\.io/, () => {})
}

// Marks the intro splash as already played for this browser session.
export async function skipIntro(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('intro_played', 'true'))
}

export async function jsonLdTypes(page: Page): Promise<string[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  return blocks.flatMap((text) => {
    const parsed = JSON.parse(text)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((doc) => doc['@type'])
  })
}
