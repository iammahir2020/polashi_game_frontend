/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Google reads the verification tag from the served HTML, not the rendered
// page, so it is injected at build time rather than by SeoHead. The live
// site's tag is already in index.html; this only adds one (e.g. for another
// domain) when index.html has none, so the page never carries two.
function googleSiteVerification(token: string | undefined): Plugin {
  return {
    name: 'google-site-verification',
    transformIndexHtml(html) {
      if (!token || html.includes('name="google-site-verification"')) return []
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

// Mirrors the vercel.json rewrite so `vite preview` serves the pre-rendered
// /how-to-play page instead of falling back to the SPA shell.
function servePrerenderedPages(paths: string[]): Plugin {
  return {
    name: 'serve-prerendered-pages',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [pathname, query] = (req.url ?? '').split('?')
        if (paths.includes(pathname)) {
          req.url = `${pathname}/index.html${query ? `?${query}` : ''}`
        }
        next()
      })
    },
  }
}

// Applies the production response headers from vercel.json (CSP and friends)
// to `vite preview`, so local previews and the e2e tests run under the same
// policy as the live site. Not applied to `vite dev`, whose HMR client needs
// inline scripts.
type VercelHeaderRule = { source: string; headers: { key: string; value: string }[] }
function vercelHeadersInPreview(): Plugin {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8')) as {
    headers?: VercelHeaderRule[]
  }
  const rules = (config.headers ?? []).map((rule) => ({
    pattern: new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '.*')}$`),
    headers: rule.headers,
  }))
  return {
    name: 'vercel-headers-in-preview',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0]
        for (const rule of rules) {
          if (rule.pattern.test(pathname)) {
            for (const { key, value } of rule.headers) res.setHeader(key, value)
          }
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      googleSiteVerification(env.VITE_GOOGLE_SITE_VERIFICATION),
      vercelHeadersInPreview(),
      servePrerenderedPages(['/how-to-play']),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'robots.txt', 'Nawab.png', 'EIC.png'],
        devOptions: {
          enabled: true,
        },
        workbox: {
          // Pages and files that must come from the network, not the cached
          // app shell: the pre-rendered how-to-play page, crawler files, and
          // Vercel's analytics endpoints.
          navigateFallbackDenylist: [
            /^\/how-to-play/,
            /^\/sitemap\.xml$/,
            /^\/robots\.txt$/,
            /^\/_vercel\//,
          ],
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
  }
})
