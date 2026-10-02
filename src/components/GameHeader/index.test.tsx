/**
 * LEVEL 3 — WORKED EXAMPLE: COMPONENT TESTING (React Testing Library)
 *
 * WHY THIS LEVEL IS A DIFFERENT TOOL, NOT JUST A NEW TOPIC
 * Levels 0–2 all had the same shape: call a function, check what came back. A
 * React component isn't a function you call for its return value — it's a
 * function you call to get a *description* of DOM, which then has to actually
 * become DOM before there's anything to look at. React Testing Library (RTL)
 * does that: `render()` mounts the component into a real (fake) DOM — jsdom,
 * a full DOM implementation in plain JS with no actual browser — and hands
 * you `screen`, a set of query functions scoped to `document.body`.
 *
 * THE RULE THAT MATTERS MORE THAN THE SYNTAX
 * Query the DOM the way a user — or a screen reader — finds things: by role
 * ("the button labelled Submit") or by visible text, never by CSS class or
 * internal structure. `getByRole('heading', { name: /polashi/i })` fails the
 * moment that heading becomes unreachable to a screen reader, which is
 * information you want. `container.querySelector('.title')` fails only when
 * someone renames a class, which is noise. This repo has no CSS classes to
 * query anyway (styling is inline objects) — but the reason to prefer
 * role/text queries has nothing to do with that; it's the only style of query
 * that tells you the thing was actually *usable*, not just *present*.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import GameHeader from './index';

describe('GameHeader', () => {
  it('renders both lines of the game title', () => {
    // ARRANGE + ACT are one call here: render mounts the component immediately.
    // There's no "wait for it to appear" — GameHeader has no state, no effect,
    // nothing async. (Level 4 is where ACT stops being this simple.)
    render(<GameHeader newConnection="ok" isConnectedToSocket={true} />);

    // ASSERT — `getByRole` THROWS if it finds zero matches, or more than one.
    // That's a feature, not a rough edge: a test that finds "a heading" when
    // there are two on the page has found an ambiguous result, and getByRole
    // says so loudly instead of silently picking the first one.
    //
    // (The component renders this text across TWO separate <h1> elements —
    // "The Battle of" and "Polashi (পলাশী)". Two <h1>s on one page is
    // debatable semantic HTML, but that's a markup call for whoever owns this
    // component, not something to fix from inside a test file.)
    expect(
      screen.getByRole('heading', { name: /the battle of/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /polashi/i }),
    ).toBeInTheDocument();
  });

  it('shows the Internet and Server status labels', () => {
    render(<GameHeader newConnection="ok" isConnectedToSocket={true} />);

    // `getByText` matches an element by its own visible text. The component
    // renders "Internet" and ":" as two adjacent bits of JSX inside one
    // <span> — in the DOM that's just one element whose text reads
    // "Internet:", so that's what we match against, not "Internet" alone.
    expect(screen.getByText('Internet:')).toBeInTheDocument();
    expect(screen.getByText('Server:')).toBeInTheDocument();
  });

  it('renders without crashing across every prop combination', () => {
    // A table-driven RTL test — the Level 1 tool (`it.each`) applied to the
    // Level 3 problem (rendering). Four combinations, one assertion each: the
    // component survives, and the two labels are still there regardless of
    // connection state.
    //
    // What this test does NOT do, on purpose: it never checks WHICH colour
    // the status dot is. Look at `StatusItem` in GameHeader/index.tsx — the
    // dot's TEXT is the literal string "●" whether `isOk` is true or false;
    // only its inline `color` style differs. There is no `aria-label`,
    // `role="status"`, or even a text difference marking "connected" vs
    // "disconnected" — a screen reader announces the exact same thing either
    // way. That means there is no role/text query that can tell the two
    // states apart, and reaching for `toHaveStyle({ color: 'green' })` would
    // just be testing an exact colour value — precisely what TESTING.md's
    // "What not to test" section warns against, AND it still couldn't prove
    // the status is genuinely *communicated*, only that a style attribute
    // matches. This is a real gap in the component (color-only state has the
    // same problem for a colourblind player as it does for this test) — worth
    // flagging to whoever owns it, not worth faking a test around.
    const combinations: Array<[
      'ok' | 'error',
      boolean,
    ]> = [
      ['ok', true],
      ['ok', false],
      ['error', true],
      ['error', false],
    ];

    for (const [newConnection, isConnectedToSocket] of combinations) {
      const { unmount } = render(
        <GameHeader
          newConnection={newConnection}
          isConnectedToSocket={isConnectedToSocket}
        />,
      );

      expect(screen.getByText('Internet:')).toBeInTheDocument();
      expect(screen.getByText('Server:')).toBeInTheDocument();

      // Manual unmount because this loop renders four times into the same
      // document without an intervening test boundary — `afterEach(cleanup)`
      // in tests/setupTests.ts only fires BETWEEN `it`s, not between loop
      // iterations within one. Without this, iteration 2 finds ITS "Internet:"
      // plus iteration 1's still sitting in the DOM — two matches, and
      // getByText throws "found multiple elements" for a reason that has
      // nothing to do with the component.
      unmount();
    }
  });
});
