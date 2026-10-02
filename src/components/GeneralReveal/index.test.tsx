/**
 * GeneralReveal — exposes Steps.md #5.
 *
 * Read the top of the source file: `if (!generalReveal?.active) return null;`
 * comes BEFORE `useRef` and `useOverlayA11y` are called. That means across
 * two renders where `active` flips from false to true, this component goes
 * from calling ZERO hooks to calling TWO — and back to zero when it flips
 * again. Steps.md's own investigation (verified against React 19's source,
 * see its "Note on two earlier misdiagnoses") found this doesn't crash — React
 * silently drops the fiber's effect list on this transition instead, which
 * means `useOverlayA11y`'s cleanup function never runs. One leaked `document`
 * keydown listener, per open-then-close cycle, forever.
 *
 * `useOverlayA11y.test.ts` already proved the HOOK's own cleanup is correct
 * when called normally. This file proves the opposite: called through THIS
 * component's actual conditional pattern, the same hook leaks anyway — the
 * bug is in the call site, not the hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import GeneralReveal from './index';

function closedProps() {
  return { generalReveal: { active: false, flipping: false }, onClose: vi.fn() };
}

function openProps() {
  // `flipping: false` — the component has two phases while active:
  // `flipping: true` shows a "Consulting the Commanders..." spinner (phase
  // 1), `flipping: false` shows the actual name reveal (phase 2). This is
  // the phase where the name is visible, and the one used below for both the
  // name-rendering test and the leak tests — the leak tests only care about
  // `active`, not which phase, so any valid "active" shape works for those.
  return {
    generalReveal: { active: true, flipping: false, name: 'The General' },
    onClose: vi.fn(),
  };
}

describe('GeneralReveal', () => {
  it('renders nothing while inactive', () => {
    const { container } = render(<GeneralReveal {...closedProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the general's name once active", () => {
    const { getByText } = render(<GeneralReveal {...openProps()} />);
    expect(getByText('The General')).toBeInTheDocument();
  });

  describe('the keydown listener leak — FAILS: Steps.md #5', () => {
    it('removes exactly as many keydown listeners as it added across one open-then-close cycle', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      // Mount CLOSED first — this is the realistic starting shape: the
      // component is always present in the tree (GameDashboard renders it
      // unconditionally, passing `generalReveal` as a prop that starts
      // null-ish), it just returns null until a general gets assigned.
      const { rerender } = render(<GeneralReveal {...closedProps()} />);
      // OPEN: active flips true. Zero hooks -> two hooks.
      rerender(<GeneralReveal {...openProps()} />);
      // CLOSE again: active flips false. Two hooks -> zero hooks — the
      // transition Steps.md's analysis says drops the effect cleanup.
      rerender(<GeneralReveal {...closedProps()} />);

      const keydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
      const keydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown').length;

      // Asserting the DESIRED invariant — adds and removes balance — not the
      // current buggy count. Same reasoning as every other Steps.md-exposing
      // test in this course: this should fail today, for a reason that
      // matches the bug exactly, and flip green once the fix (Steps.md Step
      // 6: split into a zero-hook guard wrapper + an inner component holding
      // the hooks) actually lands.
      expect(keydownRemoves).toBe(keydownAdds);
    });

    it('leaks a little more with every additional open-close cycle', () => {
      // The test above proves ONE cycle leaks by one listener. This one
      // proves it's not a one-time off-by-one — it compounds, which is the
      // actual production risk: a game with many general-reassignment events
      // over a long session accumulates one dead listener per cycle,
      // forever, until the page is refreshed.
      const addSpy = vi.spyOn(document, 'addEventListener');

      const { rerender } = render(<GeneralReveal {...closedProps()} />);
      const countAfter = (cycles: number) => {
        for (let i = 0; i < cycles; i++) {
          rerender(<GeneralReveal {...openProps()} />);
          rerender(<GeneralReveal {...closedProps()} />);
        }
        return addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
      };

      const after3 = countAfter(3);
      const after6 = countAfter(3); // 3 more cycles, 6 total

      // Each additional 3 cycles adds 3 more `addEventListener('keydown', …)`
      // calls — proportional to cycles run, not a fixed one-time cost. If
      // the leak were somehow capped or self-correcting, this gap would
      // shrink or plateau instead of staying constant.
      expect(after6 - after3).toBe(after3);
    });
  });
});
