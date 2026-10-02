import { registerSW } from 'virtual:pwa-register'

// registerType "autoUpdate": a new service worker takes over as soon as it is
// installed (skipWaiting + clientsClaim), so a broken one is replaced on the
// next visit without asking the player.
registerSW({
  onNeedRefresh() {
    if (import.meta.env.DEV) console.log('New content available')
  },
  onOfflineReady() {
    if (import.meta.env.DEV) console.log('App ready to work offline')
  },
})
