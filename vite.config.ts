/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Google reads the verification tag from the served HTML, not the rendered
// page, so it is injected at build time rather than by SeoHead.
function googleSiteVerification(token: string | undefined): Plugin {
  return {
    name: 'google-site-verification',
    transformIndexHtml() {
      if (!token) return []
      return [
        {
          tag: 'meta',
          attrs: { name: 'google-site-verification', content: token },
          injectTo: 'head',
        },
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      googleSiteVerification(env.VITE_GOOGLE_SITE_VERIFICATION),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'robots.txt', 'Nawab.png', 'EIC.png'],
        devOptions: {
          enabled: true,
        },
        manifest: {
          name: 'The Battle of Polashi (পলাশী)',
          short_name: 'Polashi',
          description:
            'Online multiplayer social deduction game for 5–10 players: Nawab vs East India Company. Unofficial adaptation of the Polashi board game by Playground Inc.',
          lang: 'en',
          categories: ['games'],
          theme_color: '#0f0f0f',
          background_color: '#0f0f0f',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '.',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      exclude: ['node_modules', 'dist', 'e2e/**'],
      setupFiles: ['./tests/setupTests.ts'],
    },
  }
})
