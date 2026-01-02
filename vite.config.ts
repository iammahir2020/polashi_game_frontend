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
            src: '/EIC.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/EIC.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/EIC.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})

