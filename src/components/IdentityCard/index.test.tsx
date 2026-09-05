/**
 * IdentityCard — full test coverage.
 *
 * This component is a controlled, clickable/keyboard-operable card: the
 * PARENT owns `isRevealed` state and passes it down along with a setter, so
 * every test here follows the same shape — render with a given `isRevealed`
 * and a spy for `setIsRevealed`, interact, then assert what the spy was
 * called with (not what the DOM now shows, since we never re-render with an
 * updated prop the way the real parent would).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import IdentityCard from './index';
import { makeCharacter } from '../../../tests/factories';
import type { CharacterType } from '../../types/game';

// Shared baseline props. Every test overrides only what it cares about —
// same reasoning as the `tests/factories.ts` builders, just local to this
// file since these props are specific to one component.
function baseProps() {
  return {
    isRevealed: false,
    setIsRevealed: vi.fn(),
    character: makeCharacter(),
    secretIntel: ['Reinforcements arrive at dawn.', 'The General is compromised.'],
    disableSecretIntelligence: false,
    gameStarted: true,
    isFinal: false,
  };
}

describe('IdentityCard', () => {
  it('renders nothing before the game has started', () => {
    // `if (!gameStarted) return null` — same absence-query pattern as
    // RoundTracker's guard-clause test: queryBy returns null instead of
    // throwing, which is what you want when you expect NOTHING to be there.
    const { container } = render(
      <IdentityCard {...baseProps()} gameStarted={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe('clicking and keyboard use', () => {
    it('calls setIsRevealed with the flipped value on click', async () => {
      const user = userEvent.setup();
      const setIsRevealed = vi.fn();
      render(<IdentityCard {...baseProps()} isRevealed={false} setIsRevealed={setIsRevealed} />);

      // `getByRole('button', ...)` — the card has `role="button"` even though
      // it's a `<div>`, specifically so it's reachable this way. Its
      // accessible name comes from `aria-label`, not visible text.
      await user.click(screen.getByRole('button', { name: 'Toggle identity card' }));

      // The component doesn't track its own state — it reports the flip
      // upward and trusts the parent to re-render with the new value. So the
      // only thing we can prove from here is "it asked to flip", not "it is
      // now flipped".
      expect(setIsRevealed).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('calls setIsRevealed with the flipped value on Enter', async () => {
      const user = userEvent.setup();
      const setIsRevealed = vi.fn();
      render(<IdentityCard {...baseProps()} isRevealed={false} setIsRevealed={setIsRevealed} />);

      const card = screen.getByRole('button', { name: 'Toggle identity card' });
      // A real user tabbing to this element and pressing Enter — `.focus()`
      // then `{Enter}` is how user-event models that, rather than firing a
      // keydown at an unfocused element (which no real interaction can do).
      card.focus();
      await user.keyboard('{Enter}');

      expect(setIsRevealed).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('calls setIsRevealed with the flipped value on Space', async () => {
      const user = userEvent.setup();
      const setIsRevealed = vi.fn();
      render(<IdentityCard {...baseProps()} isRevealed={true} setIsRevealed={setIsRevealed} />);

      const card = screen.getByRole('button', { name: 'Toggle identity card' });
      card.focus();
      await user.keyboard(' ');

      // Started revealed this time — proves the toggle goes both directions,
      // not just false->true.
      expect(setIsRevealed).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('ignores keys other than Enter and Space', async () => {
      const user = userEvent.setup();
      const setIsRevealed = vi.fn();
      render(<IdentityCard {...baseProps()} setIsRevealed={setIsRevealed} />);

      const card = screen.getByRole('button', { name: 'Toggle identity card' });
      card.focus();
      await user.keyboard('a');

      // A negative assertion — proving the handler is actually conditional
      // on key, not just "any key toggles it". Without this test, someone
      // could delete the `if (e.key === 'Enter' || e.key === ' ')` guard and
      // every OTHER test above would still pass, since they only ever press
      // the keys that should work.
      expect(setIsRevealed).not.toHaveBeenCalled();
    });
  });

  describe('aria-pressed reflects isRevealed directly', () => {
    // `aria-pressed` is how a screen reader knows this is a TOGGLE button and
    // what state it's in — this is the accessible signal the click/keyboard
    // tests above can't check on their own, since they only prove the intent
    // to flip, not the resulting rendered state.
    it.each([
      [false, 'false'],
      [true, 'true'],
    ])('is aria-pressed="%s" when isRevealed is %s', (isRevealed, expectedAttr) => {
      render(<IdentityCard {...baseProps()} isRevealed={isRevealed} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', expectedAttr);
    });
  });

  describe('observer mode (no character assigned)', () => {
    it('shows observer copy instead of a character identity', () => {
      render(<IdentityCard {...baseProps()} character={null} />);

      // `character` is falsy -> `isObserver` is true -> a whole different
      // set of copy renders. Check the front face:
      expect(screen.getByText('Observer')).toBeInTheDocument();
      expect(screen.getByText('Witness the conspiracy unfold')).toBeInTheDocument();
      // ...and the back face, which is always in the DOM (the "flip" is a
      // CSS 3D transform, not conditional rendering — both faces exist at
      // once, which is exactly why the malformed-character test below can
      // reach the back face's code regardless of `isRevealed`):
      expect(screen.getByText('Shadow Witness')).toBeInTheDocument();
      expect(screen.getByText('SPECTATOR')).toBeInTheDocument();
      // The aria-label changes too, in a way a screen reader actually hears:
      expect(screen.getByRole('button')).toHaveAccessibleName('Toggle observer card');
    });

    it('shows a fixed field-report line instead of secretIntel entries', () => {
      render(
        <IdentityCard
          {...baseProps()}
          character={null}
          secretIntel={['this should never appear for an observer']}
        />,
      );

      expect(
        screen.getByText(/You can see all identities/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('this should never appear for an observer'),
      ).toBeNull();
    });
  });

  describe('assigned-player mode', () => {
    it("shows the character's name, team, and description", () => {
      const character = makeCharacter({
        name: 'Mir Jafor',
        team: 'Nawabs',
        description: 'A general whose loyalty runs shallower than the river.',
      });
      render(<IdentityCard {...baseProps()} character={character} />);

      expect(screen.getByText('Mir Jafor')).toBeInTheDocument();
      // `character.team.toUpperCase()` — the rendered badge is the upper-cased
      // team, not the raw stored value; asserting the upper-cased FORM checks
      // that transformation actually happened, not just that "Nawabs" exists
      // somewhere on the page (the source string never appears verbatim).
      expect(screen.getByText('NAWABS')).toBeInTheDocument();
      expect(
        screen.getByText('"A general whose loyalty runs shallower than the river."'),
      ).toBeInTheDocument();
    });

    it('lists each secretIntel entry when intel is not disabled', () => {
      render(
        <IdentityCard
          {...baseProps()}
          secretIntel={['Reinforcements arrive at dawn.', 'The General is compromised.']}
          disableSecretIntelligence={false}
        />,
      );

      expect(screen.getByText('Reinforcements arrive at dawn.')).toBeInTheDocument();
      expect(screen.getByText('The General is compromised.')).toBeInTheDocument();
    });

    it('shows a single disabled-intel notice instead of the list when disabled', () => {
      render(
        <IdentityCard
          {...baseProps()}
          secretIntel={['this should be hidden']}
          disableSecretIntelligence={true}
        />,
      );

      expect(
        screen.getByText('Secret Intel is disabled for this match.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('this should be hidden')).toBeNull();
    });
  });

  describe('malformed character data — exposes Steps.md #4', () => {
    // Steps.md #4: "`character?.team.toUpperCase()` guards `character`, not
    // `team`." `CharacterType.team` is TYPED as always present, so
    // `makeCharacter()` can't honestly build one without it — same situation
    // as `RoundTracker`'s missing `roundHistory`: the type promises something
    // an unvalidated network payload doesn't guarantee.
    //
    // Reading the source closely, the actual crash happens ONE LINE EARLIER
    // than Steps.md's line number: `isNawab` is computed as
    // `character.team === "Nawabs" || character.team.includes("Nawabs")`.
    // The `===` comparison is safe against `undefined` (just evaluates
    // false), but `.includes(...)` is called directly on `character.team`
    // with no guard, and THAT throws first, before render ever reaches the
    // `.toUpperCase()` call Steps.md points at. Same root cause either way:
    // both lines assume `character` truthy implies `character.team` defined,
    // and neither actually checks the second half of that assumption.
    it('does not crash when character exists but its team is missing — FAILS: Steps.md #4', () => {
      const malformedCharacter = {
        ...makeCharacter(),
        team: undefined,
      } as unknown as CharacterType;

      // Asserting the DESIRED behavior (renders fine), not the current buggy
      // one — same reasoning as RoundTracker's Steps.md #3 test: a test that
      // instead asserted `.toThrow()` would pass today and silently flip to
      // failing the day someone fixes this, which is backwards. This one
      // fails now, for the right reason, and goes green once a `?.` (or an
      // upstream `normalizeRoom`-style default) actually guards `team`.
      expect(() =>
        render(<IdentityCard {...baseProps()} character={malformedCharacter} />),
      ).not.toThrow();
    });
  });
});
