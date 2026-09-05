/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'Nawab.png', 'EIC.png'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'The Great Palassy Game',
        short_name: 'Polashi (পলাশী)',
        description: 'This is the great Palassy game!',
        theme_color: '#0a0a0a', 
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: '/polashi_fav_high_res.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/polashi_fav_high_res.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/polashi_fav_high_res.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    // e2e/ belongs to Playwright, which has its own runner and its own
    // `test` global. If Vitest picked those files up they would fail loudly.
    exclude: ['node_modules', 'dist', 'e2e/**'],
    // Runs before every test file — see the file for what it sets up.
    setupFiles: ['./tests/setupTests.ts'],
    // Two projects, one per environment. A plain .ts logic file (Level 0-2)
    // needs no DOM at all, so it runs under 'node' — fast. A .tsx file (Level
    // 3+) renders a component, which needs somewhere to render INTO: 'jsdom'
    // fakes a whole DOM in plain JS, no real browser, at real cost (roughly
    // 10x slower per file). Splitting by project means only the files that
    // actually need jsdom pay for it.
    //
    // `extends: true` means each project inherits everything above (plugins,
    // exclude, setupFiles) rather than repeating it.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx'],
        },
      },
    ],
  },
})

