/**
 * LEVEL 4 — MOCKS, TIMERS, HOOKS
 *
 * WHY THIS LEVEL IS THE HARDEST
 * Every level before this tested something that sits still: a function
 * (L0-1), extracted logic (L2), or a component that renders once and stays
 * put (L3). This level is about code that reacts to the WORLD changing out
 * from under it — a browser event firing, a clock ticking, a network
 * response arriving. You can't "just call it and check the result" anymore;
 * you have to control the world around the code, trigger the change
 * yourself, and check that the code reacted correctly.
 *
 * `useNetworkStatus` is the simplest case of that: it reads `navigator.onLine`
 * once, then subscribes to the browser's `online`/`offline` events to stay
 * current. Testing it means: render the hook, fire a FAKE version of those
 * events, and check the returned value changed.
 *
 * `renderHook` (from React Testing Library) is `render`'s counterpart for
 * hooks that don't belong to any particular component: it mounts a tiny
 * internal test component whose only job is to call your hook, and hands
 * back `.result.current` (the hook's current return value) plus helpers like
 * `.rerender()` and `.unmount()`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  // `navigator.onLine` is a real jsdom property, and it defaults to `true`.
  // Some tests below need it `false` at mount time, so it has to be
  // overridden — and since it's read-only in the type system (no setter),
  // that means redefining the whole property descriptor. Doing this in
  // `afterEach` rather than trusting the next test to reset it is the safer
  // habit: a global you mutate and don't clean up leaks into every test file
  // that runs after this one in the same process.
  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    vi.restoreAllMocks();
  });

  it('returns the current navigator.onLine value on mount', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { result } = renderHook(() => useNetworkStatus());

    // `.result.current` is the hook's return value AT THIS INSTANT — re-read
    // it after anything that might change it; it is not a live binding.
    expect(result.current).toBe(false);
  });

  it('flips to true when the browser fires an "online" event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);

    // There's no real network to disconnect, so the only way to exercise
    // this hook's event handler is to dispatch the same kind of event a
    // browser would — `window.dispatchEvent` with the right event name. This
    // is the general technique for any "listens to a global event" hook:
    // fire the event yourself, don't try to fake the underlying condition.
    //
    // `act(...)` around the dispatch matters and isn't optional here — found
    // out by writing this without it first and watching `result.current`
    // stay `false`. React only guarantees a state update has been applied and
    // the hook's return value is current once the update happened INSIDE an
    // `act()` call. `render`/`fireEvent`/`user-event` all wrap themselves in
    // `act()` automatically; a raw `window.dispatchEvent` you fire yourself
    // does not, so without this wrapper the assertion below can run before
    // React has actually re-rendered with the new value.
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('flips to false when the browser fires an "offline" event', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true); // default navigator.onLine

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('subscribes to both events on mount and unsubscribes both on unmount', () => {
    // A SPY here, not a fake event — this test isn't about the hook's
    // returned VALUE, it's about the hook's DISCIPLINE: does it clean up
    // after itself? `vi.spyOn` wraps a REAL method (so it still behaves
    // normally) while recording every call, which is different from `vi.fn()`
    // (a fake that replaces something entirely, used in Level 4's `vi.mock`
    // work below).
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    // Two subscriptions on mount — one per event name. `expect.any(Function)`
    // matches "some function", since the actual handler is an internal
    // closure we have no name for and shouldn't need one to test this.
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    // The real point of this test: an unmounted hook must not go on
    // listening. Without this cleanup, ten mount/unmount cycles (a player
    // navigating in and out of a screen, say) would leave ten live listeners
    // all fighting to update state on an unmounted component.
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('removes the SAME handler function it added, not merely one with the same name', () => {
    // A subtler version of the test above. It's possible to write a buggy
    // cleanup that calls `removeEventListener('online', someOtherFunction)`
    // — same event name, wrong reference — and `removeEventListener` fails
    // SILENTLY when the reference doesn't match; nothing throws, the listener
    // just never actually goes away. Capturing the handler each spy call was
    // given, and diffing the add/remove pairs by IDENTITY, catches that in a
    // way "was removeEventListener called with 'online'" cannot.
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    const addedOnline = addSpy.mock.calls.find(([event]) => event === 'online')?.[1];
    const removedOnline = removeSpy.mock.calls.find(([event]) => event === 'online')?.[1];

    expect(removedOnline).toBe(addedOnline);
  });
});
