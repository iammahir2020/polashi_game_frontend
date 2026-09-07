import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // React-specific rules ONLY where React actually lives. `e2e/**` is
    // plain Playwright test code — no React import, no hooks — and
    // Playwright's own fixture convention names its second callback
    // parameter `use`, which `react-hooks/rules-of-hooks` otherwise flags as
    // though it were React's `use()` hook, purely by name collision. Config
    // files (`vite.config.ts`, `playwright.config.ts`) and `tests/**` are
    // equally non-React, so they're left out too.
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
])
