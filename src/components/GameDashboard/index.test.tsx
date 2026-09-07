/**
 * GameDashboard — Level 4 worked example: `vi.mock` on a whole module, and
 * fake timers for two real race conditions.
 *
 * `GameDashboard` doesn't take `socketService` as a prop — it imports the
 * singleton directly. `vi.mock('../../services/socket', factory)` replaces
 * THE WHOLE MODULE for this test file: every `socketService.connect()`,
 * `.onRoomJoined()`, etc. inside `GameDashboard` becomes one of the fake
 * functions `makeMockSocketService()` builds, and no real socket.io
 * connection is ever opened. See `tests/mockSocketService.ts` for why every
 * method is listed there even though one test only ever touches a couple.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

import { makeMockSocketService } from '../../../tests/mockSocketService';

// This has to run before `GameDashboard` (and therefore the real
// `services/socket`) is ever imported. Vitest hoists `vi.mock` calls above
// every import in the file automatically, but the ORDER OF IMPORTS relative
// to each other is still ordinary JS: `makeMockSocketService` is imported
// above, so it's already available by the time this factory actually runs
// (lazily, the moment something first imports `../../services/socket`).
vi.mock('../../services/socket', () => ({
  socketService: makeMockSocketService(),
}));

import GameDashboard from './index';
import { socketService } from '../../services/socket'; // resolves to the mock above
import { makePlayer, makeRoom } from '../../../tests/factories';

/**
 * `GameDashboard` doesn't call `socketService.getRoom()` and use a result —
 * it REGISTERS a callback: `socketService.onRoomJoined((data) => setRoom(...))`.
 * To simulate "the server sent a roomJoined event", grab whatever function
 * GameDashboard handed to the mocked `onRoomJoined` and call it ourselves —
 * that's the callback GameDashboard is waiting to be invoked with real data.
 *
 * `vi.mocked(...)` is a TYPE-ONLY cast, not a runtime operation: TypeScript
 * resolves `socketService`'s type from the REAL `services/socket.ts` (it has
 * no idea `vi.mock` swapped it at runtime), so `.mock.calls` doesn't exist on
 * that type as far as the compiler's concerned. `vi.mocked()` tells
 * TypeScript "trust me, this one really is a mock", without changing
 * anything about how it behaves.
 */
function latestCallbackGivenTo<Callback extends (...args: never[]) => void>(
  mockMethod: (cb: Callback) => void,
): Callback {
  const lastCall = vi.mocked(mockMethod).mock.calls.at(-1);
  if (!lastCall) {
    throw new Error(
      'GameDashboard never registered a callback with this socketService method — check it actually mounted.',
    );
  }
  return lastCall[0];
}

beforeEach(() => {
  localStorage.clear();
  // Reset call history (so "was onRoomJoined called" checks in one test don't
  // see calls from a previous test) without replacing the functions
  // themselves — `vi.clearAllMocks()` keeps every `vi.fn()` a `vi.fn()`, just
  // empties its `.mock.calls`.
  vi.clearAllMocks();
});

afterEach(() => {
  // Guards against a test that enabled fake timers and threw before its own
  // cleanup ran — leaves every OTHER test file back on real timers.
  vi.useRealTimers();
});

describe('GameDashboard', () => {
  describe('driven by simulated server events', () => {
    it('replaces the enlistment form with the room once "roomJoined" arrives', () => {
      render(<GameDashboard />);

      // Before any server event, there's no room yet — the join/create form
      // is what a fresh visitor actually sees.
      expect(screen.getByPlaceholderText('Enter Alias...')).toBeInTheDocument();

      const me = makePlayer({ name: 'Alice', isGameMaster: true });
      const room = makeRoom({
        roomCode: 'ABCD',
        players: [me],
        activePlayerIds: [me.id],
        gameStarted: false,
      });

      // Simulate the server: call the exact callback GameDashboard passed to
      // `onRoomJoined`, with the shape a real `roomJoined` payload has.
      // Wrapped in `act()` because this state update happens OUTSIDE any
      // React-recognized event (a socket callback, not a click) — same
      // reasoning as `useNetworkStatus.test.ts`'s manual `dispatchEvent`.
      act(() => {
        latestCallbackGivenTo(socketService.onRoomJoined)({
          roomCode: 'ABCD',
          room,
          role: 'player',
          playerId: me.id,
          isGameMaster: true,
        });
      });

      expect(screen.queryByPlaceholderText('Enter Alias...')).toBeNull();
      // The room code is shown to the player once inside (OperativeDrawer's
      // "SESSION CIPHER" display) — its presence proves `room` really did get
      // set from the simulated event, not just that the form disappeared.
      expect(screen.getByText('ABCD')).toBeInTheDocument();
    });

    it('shows the server\'s message once an "error" event arrives', () => {
      render(<GameDashboard />);

      // Deliberately NOT a message containing "not found" — GameDashboard's
      // own `onError` handler special-cases that phrase to ALSO pop up a
      // "Room Not Found" dialog with the same text, which would then match
      // `getByText` twice and throw "found multiple elements" for a reason
      // that has nothing to do with what this test is checking. A message
      // outside that special case isolates just the ordinary error-toast
      // wiring this test is actually about.
      act(() => {
        latestCallbackGivenTo(socketService.onError)('The server is temporarily unavailable.');
      });

      expect(screen.getByText('The server is temporarily unavailable.')).toBeInTheDocument();
    });
  });

  describe('the loadingAction race — exposes Steps.md #7', () => {
    it('a stale timer from a finished action must not clear a newer one still in flight — FAILS: Steps.md #7', () => {
      // THE BUG, in plain terms: `createRoom` and `joinRoom` each schedule
      // their OWN "give up after 5s" timer with no memory of any earlier
      // one. Sequence that breaks:
      //   t=0    click Create    -> loadingAction='create', timer A due @ t=5000
      //   t=4000 Create fails    -> onError correctly clears loadingAction to null
      //   t=4000 click Join      -> loadingAction='join',   timer B due @ t=9000
      //   t=5000 timer A fires   -> WRONGLY clears loadingAction to null again,
      //                              even though the join at t=4000 is still
      //                              legitimately in flight for another 4s
      vi.useFakeTimers();

      render(<GameDashboard />);

      const nameInput = screen.getByPlaceholderText('Enter Alias...');
      // `fireEvent.change`, not `user-event`, on purpose: user-event's
      // realistic key-by-key typing schedules its own small internal delays
      // via REAL timers, which never resolve once `vi.useFakeTimers()` is
      // active — they'd just hang. `fireEvent` fires one raw event
      // synchronously, which is all a single controlled-input update needs
      // here; we don't care about testing keystroke-by-keystroke behavior in
      // this file (EnlistmentForm's own tests already do).
      fireEvent.change(nameInput, { target: { value: 'Alice' } });

      // t=0: create.
      fireEvent.click(screen.getByRole('button', { name: /Establish New HQ/ }));
      expect(socketService.createRoom).toHaveBeenCalledExactlyOnceWith('Alice');

      // t=4000: the create attempt fails.
      act(() => {
        vi.advanceTimersByTime(4000);
        latestCallbackGivenTo(socketService.onError)('That name is taken.');
      });

      // t=4000: same player switches to Join instead.
      const roomCodeInput = screen.getByPlaceholderText('Enter HQ Code');
      fireEvent.change(roomCodeInput, { target: { value: 'WXYZ' } });
      fireEvent.click(screen.getByRole('button', { name: /Infiltrate Existing HQ/ }));
      expect(socketService.joinRoom).toHaveBeenCalledExactlyOnceWith('WXYZ', 'Alice');

      // t=5000: timer A (from the ORIGINAL create, scheduled at t=0 for 5s
      // later) fires now. The join click above is only 1000ms old — nowhere
      // near ITS OWN 5-second timeout (due at t=9000) — and nothing has
      // resolved it yet.
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // DESIRED behavior: a join that's only 1 second old, with no response
      // yet, is still "in flight" — the button should still read as
      // disabled. Asserting this (not asserting the bug directly) is what
      // makes this test flip green automatically the day someone fixes the
      // timer lifecycle (Steps.md Step 4) rather than needing to be rewritten.
      expect(screen.getByRole('button', { name: /Infiltrate Existing HQ/ })).toBeDisabled();
    });
  });

  describe('the copiedStatus race — exposes Steps.md #8', () => {
    // Same bug shape as the loadingAction race, one component over:
    // `handleCopy` schedules its own "revert to null after 2s" timer with no
    // memory of any earlier one, so copying two things in quick succession
    // lets the FIRST copy's timer wrongly clear the status the SECOND copy
    // just set.
    //
    // Reaching `copiedStatus` at all means `room` has to be truthy —
    // `OperativeDrawer` (where the copy buttons live) only renders inside
    // `{room && (...)}`. jsdom doesn't implement the Clipboard API, so
    // `navigator.clipboard.writeText` needs a stand-in before `handleCopy`
    // (which awaits it) can resolve at all.
    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
      // `handleCopy` only takes the modern clipboard path when
      // `window.isSecureContext` is true — jsdom's default test URL
      // (http://localhost) does not count as one, so without this the
      // component would silently fall through to its `execCommand` fallback
      // path instead, which is a different bug-reproduction path than the
      // one this test is aimed at.
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: true,
      });
    });

    it('a stale timer from an earlier copy must not clear a newer copy still within its own display window — FAILS: Steps.md #8', async () => {
      vi.useFakeTimers();

      render(<GameDashboard />);

      const me = makePlayer({ isGameMaster: true });
      const room = makeRoom({
        roomCode: 'ABCD',
        players: [me],
        activePlayerIds: [me.id],
        gameStarted: false,
      });

      act(() => {
        latestCallbackGivenTo(socketService.onRoomJoined)({
          roomCode: 'ABCD',
          room,
          role: 'player',
          playerId: me.id,
          isGameMaster: true,
        });
      });

      // t=0: copy the room code. `handleCopy` is async (it awaits
      // `navigator.clipboard.writeText`), so the click needs to be inside an
      // ASYNC `act()` that's actually awaited — a sync `act()` would return
      // before that promise settles, and `copiedStatus` wouldn't have
      // updated yet by the time the next line runs.
      await act(async () => {
        fireEvent.click(screen.getByTitle('Copy Cipher'));
      });
      // Timer A now pending, due at t=2000.

      // t=500: copy the invite link too — a realistic sequence (a GM copies
      // the code, then immediately also grabs the link to send both at
      // once).
      act(() => {
        vi.advanceTimersByTime(500);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /INVITE ALLIES/ }));
      });
      // Timer B now pending, due at t=500+2000=2500. copiedStatus is "link".
      expect(screen.getByRole('button', { name: 'LINK COPIED' })).toBeInTheDocument();

      // t=2000: Timer A (from the code copy at t=0) fires now. The link
      // copy is only 1500ms into ITS OWN 2-second window (due at t=2500) —
      // nothing about it has actually expired yet.
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // DESIRED: the link copy's confirmation should still be showing,
      // since only 1500 of its own 2000ms have elapsed. Asserting that
      // (rather than asserting the bug directly) is what makes this test
      // flip green automatically once someone fixes the timer lifecycle
      // (Steps.md Step 4), instead of needing to be rewritten afterward.
      expect(screen.getByRole('button', { name: 'LINK COPIED' })).toBeInTheDocument();
    });
  });
});
