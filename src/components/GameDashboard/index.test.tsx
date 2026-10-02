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
import { makePlayer, makeRoom, makeVotingState } from '../../../tests/factories';
import { installMatchMedia } from '../../../tests/matchMedia';

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
          playerId: me.id,
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
          playerId: me.id,
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

/**
 * The tablet/desktop war room.
 *
 * Every test above runs in plain jsdom, which has no `window.matchMedia`, so
 * `useLayout` reports "compact" and they all exercise the PHONE layout. Here
 * we install a fake 1440px screen (see `tests/matchMedia.ts`) to check that
 * the same dashboard, fed the same server events, switches to the wide
 * arrangement, and that the one place the two layouts deliberately differ
 * (where a vote is shown) follows the rules:
 *   - an ordinary vote plays out inline, in a panel;
 *   - the vote that ends the campaign stays a full-screen overlay, so its
 *     verdict sits on top of Mir Jafor's phase / the result, as on phones.
 */
describe('GameDashboard on a wide screen', () => {
  let fakeScreen: ReturnType<typeof installMatchMedia>;
  beforeEach(() => { fakeScreen = installMatchMedia(1440); });
  afterEach(() => fakeScreen.uninstall());

  // Same trick as the tests above: hand GameDashboard a room as if the server
  // had just sent "roomJoined".
  function joinWith(room: ReturnType<typeof makeRoom>, playerId: string) {
    act(() => {
      latestCallbackGivenTo(socketService.onRoomJoined)({
        roomCode: room.roomCode, room, playerId,
      });
    });
  }

  const me = makePlayer({ name: 'Clive' });
  const players = [makePlayer({ name: 'Siraj', isGameMaster: true }), me, makePlayer(), makePlayer(), makePlayer()];
  const inGame = (overrides: Parameters<typeof makeRoom>[0] = {}) => makeRoom({
    roomCode: 'WAR001', players, activePlayerIds: players.map((p) => p.id), gameStarted: true, ...overrides,
  });

  it('greets a visitor with the hero text beside the enlistment form', () => {
    render(<GameDashboard />);
    expect(screen.getByText(/Trust no one in the Nawab's camp/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Alias...')).toBeInTheDocument();
  });

  it('replaces the phone drawer with an always-visible header and roster panel', () => {
    render(<GameDashboard />);
    joinWith(inGame(), me.id);

    // The phone layout's collapsible drawer is gone...
    expect(screen.queryByRole('button', { name: 'Toggle operative drawer' })).toBeNull();
    // ...its contents are in the header instead, always visible.
    expect(screen.getByText('WAR001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abandon post/i })).toBeInTheDocument();
    // The roster has its own labelled panel (a <section> is a "region").
    expect(screen.getByRole('region', { name: 'Roster' })).toBeInTheDocument();
  });

  it('shows an ordinary vote inline, so the rest of the war room stays usable', () => {
    render(<GameDashboard />);
    joinWith(inGame({ voting: makeVotingState({ active: true, type: 'teamApproval', votes: {} }) }), me.id);

    expect(screen.getByRole('region', { name: 'Voting session' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Voting session' })).toBeNull();
  });

  it("counts the battalion the server dealt in, not this device's draft", () => {
    // Six players joined, but the host stood one down: five play, one
    // observes. Only the host's device knows the draft; everyone else's draft
    // list holds all six, so once the game starts the roster must count from
    // the room the server sent instead (this used to say "6 Active").
    const watcher = makePlayer({ name: 'Olu' });
    render(<GameDashboard />);
    joinWith(inGame({ players: [...players, watcher], activePlayerIds: players.map((p) => p.id) }), watcher.id);

    expect(screen.getByText('5 Active')).toBeInTheDocument();
  });

  it('keeps the deciding verdict full-screen, above the Mir Jafor phase', () => {
    render(<GameDashboard />);
    // The third successful mission just closed: the verdict is still showing,
    // and the game has moved on to Mir Jafor's turn.
    joinWith(inGame({
      gameStatus: 'MIR_JAFOR_TURN',
      voting: makeVotingState({ active: false, type: 'missionOutcome', result: 'Yes', votes: { v1: 'yes' } }),
    }), me.id);

    expect(screen.getByRole('dialog', { name: 'Voting session' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Voting session' })).toBeNull();
  });
});

/**
 * The General picking a battalion: quick clicks over a slow connection.
 *
 * The bug: each click on a name used to build the new team from the last
 * team the SERVER had sent back. On a real network that reply takes a moment,
 * so a General who clicked two names quickly sent [Siraj] and then, building
 * on the still-empty server copy, [Clive]: the second click silently replaced
 * the first. (It showed up in the end-to-end run against the deployed server,
 * where Render's latency is real.)
 *
 * These tests reproduce "slow server" for free: they simply never deliver the
 * server's reply between the two clicks, which is exactly the situation a
 * fast double click creates on a real network.
 */
describe('GameDashboard: the General picking a battalion', () => {
  const general = makePlayer({ name: 'Mir Madan', isGeneral: true });
  const siraj = makePlayer({ name: 'Siraj' });
  const clive = makePlayer({ name: 'Clive' });
  const players = [general, siraj, clive, makePlayer({ name: 'Watts' }), makePlayer({ name: 'Jagat' })];

  // Round 1 of a 5-player game: the battalion is 2 players.
  const room = (proposedTeam: string[] = []) => makeRoom({
    roomCode: 'TEAM01', players, activePlayerIds: players.map((p) => p.id),
    gameStarted: true, currentRound: 1, proposedTeam,
  });

  function joinAsGeneral() {
    render(<GameDashboard />);
    act(() => {
      latestCallbackGivenTo(socketService.onRoomJoined)({
        roomCode: 'TEAM01', room: room(), playerId: general.id,
      });
    });
  }

  // What the server would broadcast once it has applied a proposal.
  function serverConfirms(team: string[]) {
    act(() => latestCallbackGivenTo(socketService.onRoomUpdated)(room(team)));
  }

  // Every team this client sent, in order: the second argument of each
  // `proposeTeam(roomCode, playerIds)` call.
  const sentTeams = () => vi.mocked(socketService.proposeTeam).mock.calls.map((call) => call[1]);

  it('keeps both picks when two names are clicked before the server replies', () => {
    joinAsGeneral();
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clive' }));

    // Before the fix the second entry was [clive.id]: Siraj was lost.
    expect(sentTeams()).toEqual([[siraj.id], [siraj.id, clive.id]]);
  });

  it('can also take a quick pick back before the server replies', () => {
    joinAsGeneral();
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));

    // The second click sees Siraj as already picked (from what was just sent)
    // and removes him. Before the fix it added him a second time.
    expect(sentTeams()).toEqual([[siraj.id], []]);
  });

  it('never sends more players than the mission takes', () => {
    joinAsGeneral();
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Watts' }));

    // Round 1 takes 2. The third click is refused on this device, so the
    // limit holds even though the server hasn't confirmed the first two yet.
    expect(sentTeams()).toEqual([[siraj.id], [siraj.id, clive.id]]);
  });

  it('goes back to the server\'s team once it has caught up', () => {
    joinAsGeneral();
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));
    serverConfirms([siraj.id]);

    fireEvent.click(screen.getByRole('button', { name: 'Clive' }));
    expect(sentTeams().at(-1)).toEqual([siraj.id, clive.id]);
  });

  it('stops trusting a proposal the server never confirmed, after a few seconds', () => {
    // If the server ignored a proposal (say a vote had just begun), the
    // device must not keep building on a team that never existed. Fake timers
    // let the test jump 3 seconds ahead without actually waiting.
    vi.useFakeTimers();
    joinAsGeneral();
    fireEvent.click(screen.getByRole('button', { name: 'Siraj' }));

    act(() => { vi.advanceTimersByTime(3100); });
    fireEvent.click(screen.getByRole('button', { name: 'Clive' }));

    // Built on the server's team (still empty), not on the unconfirmed [Siraj].
    expect(sentTeams().at(-1)).toEqual([clive.id]);
  });
});
