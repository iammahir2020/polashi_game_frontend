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
    // Two projects, one per environment. `jsdom` fakes a whole DOM in plain
    // JS (no real browser) at real cost — roughly 10x slower per file — so
    // 'node' is worth keeping for the handful of files that are pure logic
    // with zero DOM/browser API surface.
    //
    // This is an EXPLICIT OPT-IN allowlist for 'node', not a split by file
    // extension. The first version of this config split by `.test.ts` vs
    // `.test.tsx`, on the assumption that "no JSX in the file" meant "no DOM
    // needed" — wrong: a hook test using `renderHook` has no JSX (so it's a
    // plain `.test.ts` file) but still needs `window`/`document`/`navigator`
    // to exist, which only `jsdom` provides. Defaulting to `jsdom` and
    // opting OUT is the safer direction to be wrong in: a file that doesn't
    // need a DOM but gets one anyway just runs a bit slower; a file that DOES
    // need one and doesn't get it fails outright with "window is not
    // defined" — which is exactly what happened here before this list
    // existed.
    //
    // `extends: true` means each project inherits everything above (plugins,
    // exclude, setupFiles) rather than repeating it.
    projects: (() => {
      const NODE_ONLY_TESTS = [
        'src/constants.test.ts',
        'src/seo/seoConfig.test.ts',
        'src/seo/routeSeo.test.ts',
        'src/components/VotingSystem/voteSelectors.test.ts',
      ];

      return [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: NODE_ONLY_TESTS,
          },
        },
        {
          extends: true,
          test: {
            name: 'jsdom',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
            // Excluded here so the same file isn't collected by both
            // projects and run twice — kept as ONE array above, referenced
            // in both places, so the two lists can't drift apart.
            exclude: NODE_ONLY_TESTS,
          },
        },
      ];
    })(),
  },
})

