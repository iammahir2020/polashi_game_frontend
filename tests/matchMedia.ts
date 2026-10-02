/// <reference lib="dom" />
/**
 * A fake `window.matchMedia` for tests that need a screen size.
 *
 * jsdom (the browser stand-in Vitest runs components in) has no layout engine,
 * so it doesn't implement `matchMedia` at all: `window.matchMedia` is simply
 * undefined. That's why every existing component test sees the phone layout,
 * because `useLayout` falls back to "compact" when it can't ask.
 *
 * This fake understands only the `(min-width: Npx)` queries the app uses. It
 * answers them against a pretend window width you control, and fires `change`
 * events when you move that width, the same way a real browser does when the
 * window is resized past a breakpoint.
 *
 * Usage:
 *   const screen = installMatchMedia(1440);  // pretend a 1440px-wide window
 *   ...render, assert...
 *   act(() => screen.setWidth(800));         // "resize" to a tablet
 *   screen.uninstall();                       // put jsdom back as it was
 */

type Listener = (event: MediaQueryListEvent) => void;

export function installMatchMedia(initialWidth: number) {
  let width = initialWidth;
  const original = window.matchMedia;
  // Every MediaQueryList handed out, so a width change can notify each one.
  const lists: { query: string; listeners: Set<Listener> }[] = [];

  const matches = (query: string) => {
    const min = /\(min-width:\s*(\d+)px\)/.exec(query);
    return min ? width >= Number(min[1]) : false;
  };

  window.matchMedia = ((query: string) => {
    const entry = { query, listeners: new Set<Listener>() };
    lists.push(entry);
    return {
      // A getter, not a snapshot: real MediaQueryLists report the CURRENT
      // answer every time `.matches` is read, and `useLayout` relies on that.
      get matches() { return matches(query); },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => entry.listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => entry.listeners.delete(listener),
      // The pre-2020 API; unused by the app, present so the shape is complete.
      addListener: (listener: Listener) => entry.listeners.add(listener),
      removeListener: (listener: Listener) => entry.listeners.delete(listener),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;

  return {
    setWidth(next: number) {
      width = next;
      // Like a browser, notify every list (the hook re-reads all of them).
      for (const { query, listeners } of lists) {
        listeners.forEach((l) => l({ matches: matches(query), media: query } as MediaQueryListEvent));
      }
    },
    // How many change listeners are still attached: lets a test prove the
    // hook unsubscribes when its component unmounts (no leaks).
    listenerCount() {
      return lists.reduce((n, l) => n + l.listeners.size, 0);
    },
    uninstall() {
      window.matchMedia = original;
    },
  };
}
