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
    // Files Vitest will treat as test files.
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    // e2e/ belongs to Playwright, which has its own runner and its own
    // `test` global. If Vitest picked those files up they would fail loudly.
    exclude: ['node_modules', 'dist', 'e2e/**'],
    // No DOM yet — Level 0 and 1 test pure functions, which need only Node.
    // Level 3 splits this into per-file environments for component tests.
    environment: 'node',
  },
})

