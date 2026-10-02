/**
 * A hand-built stand-in for the WHOLE `socketService` singleton, for use with
 * `vi.mock('../../services/socket', ...)`.
 *
 * WHY A WHOLE-MODULE MOCK, NOT A SPY
 * `GameDashboard` imports `socketService` directly from a module — it isn't
 * handed in as a prop, so there's nothing to substitute by rendering with
 * different arguments the way Level 3's component tests did. `vi.mock`
 * replaces the ENTIRE MODULE for any file that imports it in this test run:
 * every `socketService.connect()`, `.onRoomJoined()`, etc. inside
 * `GameDashboard` becomes one of the fake functions below instead of a call
 * into a real socket.io client. No real network connection is ever created.
 *
 * WHY EVERY METHOD IS LISTED, EVEN ONES A GIVEN TEST NEVER TOUCHES
 * `GameDashboard` calls a couple dozen `socketService` methods across its
 * ~10 effects, all of which run on every mount regardless of what one test
 * cares about (the URL-param effect, the character-list request, the
 * general-animation listener, the main room-join wiring...). Leave one
 * method off this object and the FIRST test to mount `GameDashboard` throws
 * "socketService.X is not a function" for a reason that has nothing to do
 * with whatever that test is actually checking. Comprehensive coverage here
 * is what lets each individual test file only worry about the one behavior
 * it's testing.
 */

import { vi } from 'vitest';

export function makeMockSocketService() {
  return {
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      connected: false,
      id: 'mock-socket-id',
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),

    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    closeRoom: vi.fn(),
    kickPlayer: vi.fn(),
    lockRoom: vi.fn(),

    startGame: vi.fn(),
    resetGame: vi.fn(),
    setDisableSecretIntelligence: vi.fn(),
    assignGeneral: vi.fn(),
    proposeTeam: vi.fn(),

    startVote: vi.fn(),
    clearVote: vi.fn(),
    castVote: vi.fn(),
    startSecretVote: vi.fn(),

    investigate: vi.fn(),
    attemptAssassination: vi.fn(),

    requestCharacterList: vi.fn(),

    // These `onX` registrations are how GameDashboard finds out about
    // "server" events — it hands each one a callback, and in the real app
    // socket.io calls that callback later, whenever the actual server emits.
    // `vi.fn()` alone would accept the registration and do nothing further.
    // A TEST that needs to simulate the server "sending" something reaches
    // into `.mock.calls` on the relevant one of these to get the callback
    // GameDashboard registered, then calls it directly — see
    // `GameDashboard/index.test.tsx` for that in action.
    onRoomJoined: vi.fn(),
    onRoomUpdated: vi.fn(),
    onError: vi.fn(),
    onCharacterList: vi.fn(),
    onGeneralAnimation: vi.fn(),
    onGuptochorResult: vi.fn(),
    onNotification: vi.fn(),
    onRoomDissolved: vi.fn(),

    offAll: vi.fn(),
    offCharacterList: vi.fn(),
    offGeneralAnimation: vi.fn(),
    offGuptochorResult: vi.fn(),
    offNotification: vi.fn(),
    offRoomDissolved: vi.fn(),
  };
}

export type MockSocketService = ReturnType<typeof makeMockSocketService>;
