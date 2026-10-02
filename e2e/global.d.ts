export {};

/**
 * Types the dev-only `window.__socketService` escape hatch (see
 * `src/services/socket.ts`) just enough for E2E specs to use it without
 * reaching for `any` — a minimal, LOCAL shape, not an import of the app's
 * real `SocketService` class, since this project (`tsconfig.e2e.json`) is
 * deliberately decoupled from the app's own internal types.
 */
declare global {
  interface Window {
    __socketService?: {
      socket: {
        listeners: (event: string) => unknown[];
      };
    };
  }
}
