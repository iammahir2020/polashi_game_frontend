/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_SITE_SAME_AS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'virtual:pwa-register' {
    export function registerSW(options?: {
      immediate?: boolean
      onNeedRefresh?: () => void
      onOfflineReady?: () => void
    }): void
  }
  