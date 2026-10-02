import { test as setup, expect } from '@playwright/test';

// The dev server compiles modules on first request. Loading the app once here,
// before the specs that run against it, keeps that one-off cost out of their
// assertion timeouts when several of them hit a just-started server at once.
setup('warm up the dev server', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('intro_played', 'true'));
  await page.goto('/');
  await expect(page.getByPlaceholder('Enter Alias...')).toBeVisible({ timeout: 60_000 });
});
