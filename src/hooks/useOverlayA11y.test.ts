/**
 * useOverlayA11y — full test coverage of the HOOK'S OWN contract.
 *
 * This hook does three jobs for an open overlay: focus it, close it on
 * Escape, and trap Tab inside it so keyboard focus can't silently escape to
 * whatever's behind the modal. All three depend on `document`-level listeners
 * that must come and go correctly as `isActive` flips and as the component
 * mounts/unmounts.
 *
 * IMPORTANT SCOPE NOTE, read before assuming this file alone "fixes" the bug
 * everyone keeps talking about: Steps.md #5 ("leaked keydown listener per
 * overlay cycle") is NOT a bug in this hook. Steps.md's own investigation
 * (quoted in its "Note on two earlier misdiagnoses" section) traces it to
 * FOUR CONSUMING COMPONENTS — VotingSystem, GeneralReveal, MirJaforPhase,
 * GameResultOverlay — that call `useOverlayA11y` AFTER an early return,
 * meaning the hook is sometimes not called at all depending on props. That
 * conditional-calling pattern is what confuses React's fiber reconciliation
 * into dropping the effect's cleanup. `renderHook` here always calls the hook
 * the same way, every time — there is no way to reproduce "sometimes 0 hooks,
 * sometimes N hooks" through this file, because that shape of bug can only
 * exist at the CALL SITE, not inside the hook being called.
 *
 * What this file proves instead: called normally (which is most of the time,
 * for most components, most renders), the hook's own add/remove/focus logic
 * is correct. `GeneralReveal/index.test.tsx` is the file that actually pins
 * Steps.md #5, by rendering one of the real affected components.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RefObject } from 'react';

import { useOverlayA11y } from './useOverlayA11y';

// A `RefObject` normally comes from `useRef()`, whose whole point is a
// STABLE identity across renders — the same object, `.current` mutated in
// place. A fresh `{ current: el }` literal on every call would break that,
// since the hook's effect depends on `containerRef` itself (see the
// dependency array in useOverlayA11y.ts) — a new object every render would
// make the effect think its dependencies changed every time, even when
// nothing really did. Building it once per test and reusing it mirrors what
// `useRef` actually guarantees.
function makeContainerRef(): RefObject<HTMLElement | null> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return { current: el };
}

describe('useOverlayA11y', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('mounting and unmounting while active', () => {
    it('focuses the container when it becomes active', () => {
      const containerRef = makeContainerRef();
      const focusSpy = vi.spyOn(containerRef.current!, 'focus');

      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      expect(focusSpy).toHaveBeenCalledOnce();
    });

    it('adds a document keydown listener when active', () => {
      const containerRef = makeContainerRef();
      const addSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('does NOT focus the container or add a listener when inactive', () => {
      // `isActive: false` hits the effect's early `if (!isActive) return;`
      // before either side effect happens — this is the "0 hooks path" from
      // the hook's OWN perspective (nothing subscribed), as opposed to the
      // consuming-component bug (subscribed, then the whole hook call
      // skipped on a later render).
      const containerRef = makeContainerRef();
      const focusSpy = vi.spyOn(containerRef.current!, 'focus');
      const addSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useOverlayA11y({ isActive: false, containerRef }));

      expect(focusSpy).not.toHaveBeenCalled();
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('removes its listener on unmount', () => {
      const containerRef = makeContainerRef();
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useOverlayA11y({ isActive: true, containerRef }));
      unmount();

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('removes exactly the listener it added — same function identity', () => {
      // Same reasoning as the equivalent useNetworkStatus test: matching by
      // event NAME alone can't catch a cleanup that calls
      // `removeEventListener('keydown', someOtherFunction)`, which fails
      // silently rather than throwing.
      const containerRef = makeContainerRef();
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useOverlayA11y({ isActive: true, containerRef }));
      unmount();

      const added = addSpy.mock.calls.find(([type]) => type === 'keydown')?.[1];
      const removed = removeSpy.mock.calls.find(([type]) => type === 'keydown')?.[1];
      expect(removed).toBe(added);
    });
  });

  describe('toggling isActive across re-renders', () => {
    it('cleans up the old listener before re-subscribing when isActive flips false then true again', () => {
      // This is the hook's own version of the mount/unmount cycle a real
      // overlay goes through repeatedly (open, close, open again) — proving
      // the count of adds and removes stays BALANCED across several cycles,
      // called the NORMAL way, is what "does this hook leak on its own"
      // actually means.
      const containerRef = makeContainerRef();
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = renderHook(
        ({ isActive }) => useOverlayA11y({ isActive, containerRef }),
        { initialProps: { isActive: true } },
      );
      rerender({ isActive: false });
      rerender({ isActive: true });
      rerender({ isActive: false });

      const keydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
      const keydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown').length;

      // Ended inactive, so the last add should have a matching remove —
      // adds and removes should be equal, not "adds ahead by one" (which
      // would mean a listener from some earlier cycle never got cleaned up).
      expect(keydownRemoves).toBe(keydownAdds);
    });
  });

  describe('closing on Escape', () => {
    it('calls onClose when Escape is pressed while active', () => {
      const containerRef = makeContainerRef();
      const onClose = vi.fn();
      renderHook(() => useOverlayA11y({ isActive: true, onClose, containerRef }));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not call onClose for any other key', () => {
      const containerRef = makeContainerRef();
      const onClose = vi.fn();
      renderHook(() => useOverlayA11y({ isActive: true, onClose, containerRef }));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not throw when Escape is pressed and no onClose was provided', () => {
      // `onClose` is optional (`onClose?: () => void`) — `onClose?.()` guards
      // the call, but it's worth proving that guard actually works rather
      // than assuming an optional-chained call can never throw.
      const containerRef = makeContainerRef();
      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      expect(() => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
      }).not.toThrow();
    });
  });

  describe('trapping Tab focus inside the container', () => {
    // These tests build real focusable elements inside the container, since
    // the hook queries the live DOM for them
    // (`querySelectorAll('a[href], button:not([disabled]), ...')`) rather
    // than tracking focusability itself.
    function addButtons(container: HTMLElement, count: number): HTMLButtonElement[] {
      const buttons: HTMLButtonElement[] = [];
      for (let i = 0; i < count; i++) {
        const button = document.createElement('button');
        button.textContent = `Button ${i}`;
        container.appendChild(button);
        buttons.push(button);
      }
      return buttons;
    }

    it('wraps Tab from the last focusable element back to the first', () => {
      const containerRef = makeContainerRef();
      const [first, , last] = addButtons(containerRef.current!, 3);
      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      last.focus();
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
        );
      });

      expect(document.activeElement).toBe(first);
    });

    it('wraps Shift+Tab from the first focusable element back to the last', () => {
      const containerRef = makeContainerRef();
      const [first, , last] = addButtons(containerRef.current!, 3);
      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      first.focus();
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      expect(document.activeElement).toBe(last);
    });

    it('does not interfere with Tab in the middle of the focusable list', () => {
      // The wrap-around logic only fires at the FIRST/LAST element boundary
      // — this proves it isn't over-eager and hijacking every Tab press,
      // which would trap a user on a single element instead of letting them
      // move through the overlay normally.
      const containerRef = makeContainerRef();
      const [, middle] = addButtons(containerRef.current!, 3);
      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));

      middle.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('refocuses the container itself when there is nothing focusable inside it', () => {
      const containerRef = makeContainerRef(); // no buttons added
      const focusSpy = vi.spyOn(containerRef.current!, 'focus');
      renderHook(() => useOverlayA11y({ isActive: true, containerRef }));
      focusSpy.mockClear(); // clear the mount-time focus call; only care about the Tab-triggered one now

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
        );
      });

      expect(focusSpy).toHaveBeenCalledOnce();
    });
  });
});
