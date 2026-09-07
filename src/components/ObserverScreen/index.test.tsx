/**
 * ObserverScreen — full test coverage.
 *
 * A read-only view: it takes a `room`, splits the active players into two
 * columns by team, and embeds `RoundTracker` (already fully tested on its
 * own) for the mission overview. Nothing here is interactive — this file is
 * mostly about correct DATA DERIVATION from a `Room`, plus one real bug.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import ObserverScreen from './index';
import { makeCharacter, makePlayer, makeRoom } from '../../../tests/factories';
import type { Room } from '../../types/game';

describe('ObserverScreen', () => {
  describe('splitting players into team columns', () => {
    it('lists an active Nawab player under "Nawab Loyalists"', () => {
      const nawab = makePlayer({
        name: 'Siraj',
        character: makeCharacter({ team: 'Nawabs', name: 'The Nawab' }),
      });
      const room = makeRoom({ players: [nawab], activePlayerIds: [nawab.id] });

      render(<ObserverScreen room={room} />);

      expect(screen.getByText('Siraj')).toBeInTheDocument();
      expect(screen.getByText('The Nawab')).toBeInTheDocument();
    });

    it('lists an active EIC player under "British EIC"', () => {
      const eicPlayer = makePlayer({
        name: 'Clive',
        character: makeCharacter({
          team: 'East India Company (EIC)',
          name: 'The Company Man',
        }),
      });
      const room = makeRoom({ players: [eicPlayer], activePlayerIds: [eicPlayer.id] });

      render(<ObserverScreen room={room} />);

      // Both column headers exist regardless of who's in them, so proving
      // WHICH column a player landed in means checking they appear at all
      // (done above/here) plus that the split logic actually reads
      // `character.team` correctly, which the next test targets directly.
      expect(screen.getByText('Clive')).toBeInTheDocument();
      expect(screen.getByText('The Company Man')).toBeInTheDocument();
    });

    it('splits a mixed roster into the correct columns, not just "does everyone appear"', () => {
      // The previous two tests each prove one team renders — neither proves
      // the split is actually team-based rather than, say, alphabetical or
      // "first half here, second half there". A mixed roster is the real
      // test of the split logic: both teams present at once, each landing in
      // ITS OWN column and not the other one — you can't fake that with a
      // roster that only ever has one team in it.
      const nawab = makePlayer({ name: 'Siraj', character: makeCharacter({ team: 'Nawabs' }) });
      const eicPlayer = makePlayer({
        name: 'Clive',
        character: makeCharacter({ team: 'East India Company (EIC)' }),
      });
      const room = makeRoom({
        players: [nawab, eicPlayer],
        activePlayerIds: [nawab.id, eicPlayer.id],
      });

      render(<ObserverScreen room={room} />);

      // `getByRole('heading', ...)` finds each column's header, and
      // `.closest(...)`-free approach: query WITHIN each column by scoping to
      // the column's container, found via its heading's parent. This is the
      // one place a structural query is justified — the two columns have no
      // distinguishing accessible name of their own beyond the shared
      // heading text, and "is this player physically inside the Nawab
      // column vs. the EIC column" is a layout fact the accessibility tree
      // doesn't separately expose.
      const nawabColumn = screen.getByRole('heading', { name: 'Nawab Loyalists' }).parentElement!;
      const eicColumn = screen.getByRole('heading', { name: 'British EIC' }).parentElement!;

      expect(nawabColumn).toHaveTextContent('Siraj');
      expect(nawabColumn).not.toHaveTextContent('Clive');
      expect(eicColumn).toHaveTextContent('Clive');
      expect(eicColumn).not.toHaveTextContent('Siraj');
    });

    it('excludes a player who is not in activePlayerIds, even if they exist in players', () => {
      // `room.players` and `room.activePlayerIds` are two separate lists —
      // an eliminated or disconnected player can still be IN `players` while
      // no longer being "active". This proves the filter is doing real work,
      // not just rendering everyone in `players` regardless of the id list.
      const active = makePlayer({ name: 'Siraj', character: makeCharacter({ team: 'Nawabs' }) });
      const inactive = makePlayer({ name: 'Ghosted', character: makeCharacter({ team: 'Nawabs' }) });
      const room = makeRoom({
        players: [active, inactive],
        activePlayerIds: [active.id], // "Ghosted" deliberately left out
      });

      render(<ObserverScreen room={room} />);

      expect(screen.getByText('Siraj')).toBeInTheDocument();
      expect(screen.queryByText('Ghosted')).toBeNull();
    });
  });

  describe('the live intelligence line', () => {
    it("names the General when a team-approval vote is active", () => {
      const general = makePlayer({ name: 'The General', isGeneral: true });
      const room = makeRoom({
        players: [general],
        activePlayerIds: [general.id],
        voting: { active: true, votes: {}, result: null, type: 'teamApproval' },
      });

      render(<ObserverScreen room={room} />);

      expect(
        screen.getByText(/The Council is currently voting on a team led by The General/),
      ).toBeInTheDocument();
    });

    it('shows the waiting message when no vote is active', () => {
      const room = makeRoom({ voting: null });

      render(<ObserverScreen room={room} />);

      expect(
        screen.getByText('Waiting for the General to propose a battalion...'),
      ).toBeInTheDocument();
    });
  });

  describe('the embedded RoundTracker', () => {
    // ObserverScreen doesn't duplicate RoundTracker's own logic (already
    // fully tested in RoundTracker/index.test.tsx) — it just mounts it. One
    // integration check is enough here: prove the two are actually WIRED
    // TOGETHER, not that RoundTracker itself is correct.
    it("shows the game's round tracker once the game has started", () => {
      const player = makePlayer();
      const room = makeRoom({
        players: [player],
        activePlayerIds: [player.id],
        gameStarted: true,
        currentRound: 1,
        roundHistory: [],
      });

      render(<ObserverScreen room={room} />);

      // "1" is RoundTracker's own round-number label — its presence here
      // proves ObserverScreen is really passing `room` through, not e.g.
      // forgetting the prop or passing an empty stand-in room.
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('malformed activePlayerIds — exposes Steps.md #2', () => {
    // Steps.md #2: "Unguarded `room.activePlayerIds.includes(p.id)` — no
    // `?.`." `Room.activePlayerIds` is TYPED as a required `string[]`, same
    // situation as RoundTracker's `roundHistory` and IdentityCard's
    // `character.team` — the type promises it, an unvalidated network
    // payload doesn't guarantee it.
    //
    // Steps.md's own notes call this one out as the most dangerous version of
    // this pattern in the app: if a started game's payload is ever missing
    // `activePlayerIds`, EVERY player's `.filter()` call throws on the very
    // first player checked, which means the WHOLE component fails to render
    // for EVERY viewer at once — not a per-player glitch, a blank screen for
    // the whole room.
    it('does not crash when activePlayerIds is missing at runtime — FAILS: Steps.md #2', () => {
      const player = makePlayer({ character: makeCharacter() });
      const malformedRoom = {
        ...makeRoom({ players: [player] }),
        activePlayerIds: undefined,
      } as unknown as Room;

      // Asserting the desired behavior, not the current crash — same
      // reasoning as every other Steps.md-exposing test in this course: this
      // should fail today, and flip green the day the guard (or an upstream
      // `normalizeRoom` default) actually lands.
      expect(() => render(<ObserverScreen room={malformedRoom} />)).not.toThrow();
    });
  });
});
