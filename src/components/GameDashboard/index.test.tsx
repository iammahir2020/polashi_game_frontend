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
import { loadSession, saveSession } from '../../services/sessionStore';

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

    it("acts on the error's code, not its wording", () => {
      // A newer server says WHICH error this is ({ code }), so the dashboard
      // can show it in the player's language. The "Room Not Found" handling
      // must follow the code: here the text has no "not found" in it at all
      // (imagine it reworded), and the dialog still appears, in the dashboard's
      // own words for that code.
      render(<GameDashboard />);
      act(() => {
        latestCallbackGivenTo(socketService.onError)('That room is gone, sorry', { code: 'ROOM_NOT_FOUND' });
      });

      expect(screen.getByRole('dialog', { name: 'Room Not Found' })).toBeInTheDocument();
      // The toast and the dialog both say it, translated from the code.
      expect(screen.getAllByText('Room not found')).toHaveLength(2);
    });

    it("shows an unknown code's English text as the server sent it", () => {
      render(<GameDashboard />);
      act(() => {
        latestCallbackGivenTo(socketService.onError)('A brand new kind of error.', { code: 'NOT_YET_INVENTED' });
      });
      expect(screen.getByText('A brand new kind of error.')).toBeInTheDocument();
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

/**
 * "serverUpdating": what a player sees while a deploy moves their room to a
 * new server.
 *
 * WHY THIS EXISTS
 * With saved rooms turned on (the backend's PERSIST_ROOMS), a deploy no longer
 * ends every game. The old server saves each room and hands it on, and the
 * clients reconnect to the new one. For a few seconds, though, the room can be
 * out of reach: the old server may still hold it, or the database may be slow
 * to answer. Rather than say "Room not found" (which would wipe the player's
 * saved seat, see the `onError` handler in GameDashboard), the server replies
 * `serverUpdating` with a `retryInMs`, and the client must ask again later.
 *
 * WHAT THESE TESTS PIN DOWN
 *  - the seat survives the wait (the session in localStorage is untouched);
 *  - the rejoin is re-sent after exactly the wait the server asked for;
 *  - the existing 5-second "give up reconnecting" timer doesn't hide the wait;
 *  - a real answer (roomJoined, or an error) ends the wait and cancels the
 *    pending retry, so no stray rejoin is sent afterwards;
 *  - nothing is sent while the socket is disconnected (the socket service
 *    rejoins by itself on "connect", so a second copy would be a duplicate);
 *  - after about a minute of this the player is told to refresh, seat kept.
 *
 * All of it runs on fake timers: the retry is a setTimeout, and the test
 * decides exactly when time moves.
 */
describe('a deploy in progress: "serverUpdating"', () => {
  // The mock's `socket.connected` is a plain field (false by default). The real
  // type treats it as socket.io's live flag; this cast is the test reaching in
  // to flip it, as a real connection coming up or dropping would.
  const setConnected = (value: boolean) => {
    (socketService.socket as { connected: boolean }).connected = value;
  };

  // The player had a seat before the deploy: that's what makes the dashboard
  // send a rejoin on mount, and what the server answers "serverUpdating" to.
  const mountWithSavedSeat = () => {
    saveSession('ABC123', 'p1', 'secret-token');
    setConnected(true);
    render(<GameDashboard />);
  };

  const serverSaysUpdating = (retryInMs = 2000) => {
    act(() => {
      latestCallbackGivenTo(socketService.onServerUpdating)({ retryInMs });
    });
  };

  const updatingScreen = () => screen.queryByText('The server is updating. Reconnecting you to your game...');

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    setConnected(false);
  });

  it('keeps the seat, shows the updating screen and asks again after the wait', () => {
    mountWithSavedSeat();
    // The rejoin GameDashboard sends on mount.
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);

    serverSaysUpdating(2000);

    expect(updatingScreen()).toBeInTheDocument();
    // The whole point: the seat (and its secret token) is still saved.
    expect(loadSession()).toMatchObject({ roomCode: 'ABC123', playerId: 'p1', reconnectToken: 'secret-token' });

    // One millisecond early, nothing yet...
    act(() => { vi.advanceTimersByTime(1999); });
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);

    // ...and right on time, the same seat is asked for again.
    act(() => { vi.advanceTimersByTime(1); });
    expect(socketService.reconnect).toHaveBeenCalledTimes(2);
    expect(socketService.reconnect).toHaveBeenLastCalledWith('ABC123', 'p1');
  });

  it('stays on the updating screen past the usual 5-second reconnect timeout', () => {
    // GameDashboard gives up on its plain "Re-establishing Intelligence
    // Links..." screen after 5 s. If the updating wait shared that flag, the
    // player would drop to the join form mid-deploy, seat or not.
    mountWithSavedSeat();
    serverSaysUpdating(2000);

    // Keep the server answering "updating" on every retry for 6 seconds.
    for (let i = 0; i < 3; i++) {
      act(() => { vi.advanceTimersByTime(2000); });
      serverSaysUpdating(2000);
    }

    expect(updatingScreen()).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Alias...')).toBeNull();
  });

  it('a roomJoined ends the wait and cancels the retry that was pending', () => {
    mountWithSavedSeat();
    serverSaysUpdating(2000);

    const me = makePlayer({ id: 'p1', name: 'Alice' });
    act(() => {
      latestCallbackGivenTo(socketService.onRoomJoined)({
        roomCode: 'ABC123',
        playerId: 'p1',
        reconnectToken: 'secret-token',
        room: makeRoom({ roomCode: 'ABC123', players: [me], activePlayerIds: [me.id] }),
      });
    });

    expect(updatingScreen()).toBeNull();
    expect(screen.getByText('ABC123')).toBeInTheDocument();

    // The retry scheduled before the room came back must never fire.
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);
  });

  it('an error from the server also ends the wait', () => {
    // For example "Room no longer exists": the server did answer, just not
    // with a room. Showing the updating screen forever would hide that.
    mountWithSavedSeat();
    serverSaysUpdating(2000);

    act(() => {
      latestCallbackGivenTo(socketService.onError)('Room no longer exists');
    });

    expect(updatingScreen()).toBeNull();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);
  });

  it('sends nothing while disconnected: the socket service rejoins on its own', () => {
    mountWithSavedSeat();
    serverSaysUpdating(2000);
    // The connection drops during the wait (the old server shutting down).
    setConnected(false);

    act(() => { vi.advanceTimersByTime(2000); });

    // No second rejoin from the dashboard. When the connection comes back,
    // socket.ts's own "connect" handler sends it.
    expect(socketService.reconnect).toHaveBeenCalledTimes(1);
    expect(updatingScreen()).toBeInTheDocument();
  });

  it('after about a minute of waiting, tells the player to refresh and still keeps the seat', () => {
    mountWithSavedSeat();

    // 30 "updating" answers are retried (about a minute at 2 s each)...
    for (let i = 0; i < 30; i++) {
      serverSaysUpdating(2000);
      act(() => { vi.advanceTimersByTime(2000); });
    }
    expect(updatingScreen()).toBeInTheDocument();
    expect(socketService.reconnect).toHaveBeenCalledTimes(31); // mount + 30 retries

    // ...and the 31st means something is wrong: stop, and say so.
    serverSaysUpdating(2000);

    expect(updatingScreen()).toBeNull();
    expect(screen.getByText('Server Still Updating')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(socketService.reconnect).toHaveBeenCalledTimes(31);
    // A refresh later rejoins with this, so it must survive giving up.
    expect(loadSession()).toMatchObject({ roomCode: 'ABC123', playerId: 'p1' });
  });
});

/**
 * "roomDissolved": the room is gone, and the player is told so before being
 * sent home.
 *
 * WHY THIS EXISTS
 * When the Game Master closed the room, everyone else's screen used to jump
 * back to the home page 1.5 s later with no explanation, which looked like the
 * page had glitched. Now the server says WHY (`{ reason: "closed_by_host" }`),
 * and the dashboard shows a "Room Closed" modal, then goes home after 5 s, or
 * at once when the player taps OK.
 *
 * TWO NEW TOOLS HERE
 *  - `vi.stubGlobal('location', ...)` swaps `window.location` for a plain
 *    object. jsdom can't really navigate (it would log "Not implemented:
 *    navigation"), and with a plain object the test can simply read back the
 *    `href` the code set. `vi.unstubAllGlobals()` puts the real one back.
 *  - Fake timers again, to check the redirect happens at 5 s and not before.
 */
describe('the room is closed: "roomDissolved"', () => {
  let fakeLocation: { href: string };

  beforeEach(() => {
    vi.useFakeTimers();
    fakeLocation = { href: 'http://localhost/' };
    vi.stubGlobal('location', fakeLocation);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // A member sitting in a lobby, with their seat saved, as before the close.
  const sitInRoom = () => {
    saveSession('ABC123', 'p2', 'secret-token');
    render(<GameDashboard />);
    const host = makePlayer({ id: 'p1', name: 'Siraj', isGameMaster: true });
    const me = makePlayer({ id: 'p2', name: 'Mohanlal' });
    act(() => {
      latestCallbackGivenTo(socketService.onRoomJoined)({
        roomCode: 'ABC123',
        playerId: 'p2',
        reconnectToken: 'secret-token',
        room: makeRoom({ roomCode: 'ABC123', players: [host, me], activePlayerIds: [host.id, me.id] }),
      });
    });
  };

  const roomDissolved = (reason: 'closed_by_host' | 'room_gone') => {
    act(() => {
      latestCallbackGivenTo(socketService.onRoomDissolved)({ reason });
    });
  };

  it('tells the other players the Game Master closed the room, and forgets the seat', () => {
    sitInRoom();
    roomDissolved('closed_by_host');

    // The modal is a real dialog (role="dialog", labelled by its title), so it
    // can be found the way a screen reader would find it.
    const dialog = screen.getByRole('dialog', { name: 'Room Closed' });
    expect(dialog).toHaveTextContent('The Game Master has closed this room. Returning you to the home screen...');

    // The room is gone for good, so rejoining it later would only fail.
    expect(loadSession().roomCode).toBeFalsy();
  });

  it('goes home by itself after 5 seconds', () => {
    sitInRoom();
    roomDissolved('closed_by_host');

    act(() => { vi.advanceTimersByTime(4999); });
    expect(fakeLocation.href).toBe('http://localhost/'); // still here: time to read the modal

    act(() => { vi.advanceTimersByTime(1); });
    expect(fakeLocation.href).toBe('/');
  });

  it('goes home at once when the player taps OK', () => {
    sitInRoom();
    roomDissolved('closed_by_host');

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(fakeLocation.href).toBe('/');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says so plainly when a rejoin finds the room already gone', () => {
    // E.g. coming back to a tab after the room was closed or expired. Nobody
    // just "closed it on you", so the wording doesn't claim that.
    saveSession('ABC123', 'p2', 'secret-token');
    render(<GameDashboard />);
    roomDissolved('room_gone');

    expect(screen.getByRole('dialog', { name: 'Room Closed' })).toHaveTextContent(
      'This room is no longer available. Returning you to the home screen...',
    );
  });
});
