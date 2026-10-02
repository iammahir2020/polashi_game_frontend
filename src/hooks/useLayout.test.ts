/**
 * useLayout — which screen arrangement fits the window.
 *
 * The hook is the single switch between the phone layout and the tablet /
 * desktop war room, so these tests pin down its three promises:
 *   1. the breakpoints: below 768px compact, 768-1199px medium, 1200px+ wide;
 *   2. it follows the window when it's resized past a breakpoint;
 *   3. without `matchMedia` (jsdom, old browsers) it falls back to compact.
 *
 * `renderHook` (from React Testing Library) mounts a throwaway component that
 * just calls the hook, so a hook can be tested without inventing UI for it.
 * `result.current` is always the hook's LATEST return value.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useLayout } from './useLayout';
import { installMatchMedia } from '../../tests/matchMedia';

let fakeScreen: ReturnType<typeof installMatchMedia> | null = null;

afterEach(() => {
  // Each test installs its own fake; restore jsdom's (missing) matchMedia so
  // no other test file inherits a pretend screen size.
  fakeScreen?.uninstall();
  fakeScreen = null;
});

describe('useLayout', () => {
  // `it.each` runs the same test body once per row. Each row is a window
  // width and the layout it must produce. The rows sit right on either side of
  // each breakpoint, because off-by-one mistakes (`>` vs `>=`) live exactly there.
  it.each([
    [375, 'compact'], // a phone
    [767, 'compact'], // one pixel short of the tablet breakpoint
    [768, 'medium'], // exactly the tablet breakpoint: min-width is inclusive
    [1024, 'medium'], // a landscape tablet / small laptop
    [1199, 'medium'], // one pixel short of the desktop breakpoint
    [1200, 'wide'], // exactly the desktop breakpoint
    [1920, 'wide'], // a desktop monitor
  ])('a %ipx window gets the %s layout', (width, expected) => {
    fakeScreen = installMatchMedia(width);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe(expected);
  });

  it('follows the window across breakpoints when it is resized', () => {
    fakeScreen = installMatchMedia(1440);
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe('wide');

    // `setWidth` fires `change` events like a real resize. It's wrapped in
    // `act()` because it makes React re-render outside a React event
    // handler, and act() tells React to finish that update before we assert.
    act(() => fakeScreen!.setWidth(900));
    expect(result.current).toBe('medium');

    act(() => fakeScreen!.setWidth(400));
    expect(result.current).toBe('compact');

    act(() => fakeScreen!.setWidth(1300));
    expect(result.current).toBe('wide');
  });

  it('stops listening for resizes once the component unmounts', () => {
    fakeScreen = installMatchMedia(1440);
    const { unmount } = renderHook(() => useLayout());
    // While mounted it listens to both queries (tablet and desktop).
    expect(fakeScreen.listenerCount()).toBeGreaterThan(0);

    unmount();
    // A listener left behind would keep the unmounted component alive and
    // run its update on every resize: a slow memory leak.
    expect(fakeScreen.listenerCount()).toBe(0);
  });

  it('falls back to the phone layout when matchMedia does not exist', () => {
    // No fake installed: this is plain jsdom, where `window.matchMedia` is
    // undefined. Every other component test in the suite runs like this,
    // which is why they all keep seeing (and testing) the phone layout.
    expect(window.matchMedia).toBeUndefined();
    const { result } = renderHook(() => useLayout());
    expect(result.current).toBe('compact');
  });
});
