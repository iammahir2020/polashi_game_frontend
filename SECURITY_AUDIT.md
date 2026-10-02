# Security audit: The Battle of Polashi (frontend)

Audited: `chore/security-hardening` at `19292bf` (main after PR #2), 2026-10-02.
Scope: this frontend repo. The backend (`polashi_game_backend`, `server.js` at `a80cfaa`) was read
to establish what the client actually receives and what the server checks; it was not changed.

Threat model: the attacker has devtools open, reads the built bundle, edits localStorage, and opens
their own Socket.IO connection to send any event with any payload. Nothing the frontend does can
enforce a rule, so every item below is marked as either a real fix (server or hosting) or a client
hardening step that only improves UX and resilience.

## Summary

| # | Finding | Severity | Where | Status |
|---|---|---|---|---|
| C1 | Every player's `id` is broadcast to everyone, and `id` is the only credential: anyone can act as any player, including the host | Critical | backend `server.js:223-233`, `:378-403`, every handler taking `requesterId`/`playerId` | Needs backend |
| C2 | `roomJoined` sends the raw room, with every player's character, on join and on reconnect (any page refresh mid-game) | Critical | backend `server.js:277`, `:298`, `:395-399`; client `GameDashboard/index.tsx:99-110` | Needs backend |
| C3 | `attemptAssassination` has no checks and broadcasts the raw room: anyone can end any game at any time and see all roles | Critical | backend `server.js:704-720` | Needs backend |
| C4 | Malformed events crash the whole server (unguarded destructuring and `room.players` on missing rooms) | Critical | backend `server.js:253`, `:280`, `:704-707` and most handlers | Needs backend |
| C5 | `castVote` accepts any `playerId` string, so one client can stuff votes and decide council and mission results | Critical | backend `server.js:447-457` | Needs backend |
| H1 | Mission (success/sabotage) votes are broadcast per player, during and after the vote | High | backend `server.js:223` (`...room`), client `types/game.ts:18-28` | Needs backend (no contract change) |
| H2 | Privileged actions with no or bypassable checks: `startVote`, `proposeTeam`, `leaveRoom` (removes anyone), `startGame` payload, `investigatePlayer` | High | backend `server.js:427`, `:634`, `:664`, `:542`, `:352` | Needs backend |
| H3 | A crafted player name (object, huge string) white-screens every client in the room; no payload validation, no error boundary | High | client `GameDashboard/index.tsx:99-138`, `PlayerRoster/index.tsx:309`, `main.tsx` | Fix in frontend + backend |
| H4 | No CSP, no clickjacking protection, no `nosniff`/`Referrer-Policy`/`Permissions-Policy` | High | `vercel.json` (live headers checked) | Fix in frontend |
| H5 | Known vulnerabilities in shipped client deps (`socket.io-parser`, `react-router`) | High | `package-lock.json` | Fix in frontend (non-breaking) |
| M1 | No rate limits or memory caps: room creation and every event can be spammed | Medium | backend (all handlers), client `GameDashboard/index.tsx:354-365` | Needs backend; client debounce |
| M2 | Name and room-code inputs: no length limit, whitespace-only names, invisible and bidi characters allow spoofing another player's name | Medium | client `EnlistmentForm/index.tsx:48-58`, `:106-118`; backend `:253`, `:280` | Fix in frontend + backend |
| M3 | Firebase Auth is dead code: not routed, never tied to game identity, token never sent to the server | Medium | `src/lib/firebase.ts`, `src/auth/*`, `src/components/login`, `dashboard`, `GoogleLoginButton.tsx`, `ProtectedRoute.tsx` | Decision needed |
| M4 | Backend CORS falls back to `*` when `CLIENT_URL` is unset | Medium | backend `server.js:14-28` | Needs backend config |
| M5 | Public analytics endpoints expose every player name ever logged and raw DB error messages | Medium | backend `server.js:784-830` | Needs backend |
| M6 | Observers (players left out of the battalion) see every role live | Medium | backend `server.js:225` (`isObserver`) | Accepted risk (design) |
| L1 | Socket ID and PWA logs in the production console | Low | `services/socket.ts:34`, `:44`; `pwa.ts:5`, `:8` | Fix in frontend |
| L2 | Reconnect: backoff exists (socket.io default 1 s to 5 s, 50% jitter) but the cap is low, and every page load sends `reconnectPlayer` twice | Low | `services/socket.ts:17-41`; `GameDashboard/index.tsx:146-150` | Fix in frontend |
| L3 | Service worker serves `index.html` for every navigation, including `/sitemap.xml`, `/robots.txt`, `/how-to-play`; `dev-dist/` (generated) is committed | Low | `vite.config.ts` (VitePWA), `dev-dist/` | Fix in frontend |
| L4 | Votes, team toggles and host actions can be double-fired from the UI | Low | `GameDashboard/index.tsx:406-414`, `VotingSystem/index.tsx` | Fix in frontend (cosmetic) |
| L5 | `?room=` parameter taken uncapped into state | Low | `GameDashboard/index.tsx:59-68` | Fix in frontend |
| L6 | Google Fonts is a third-party request | Low | `index.html:30` | Accepted (allowed in CSP) |
| L7 | Room codes come from `Math.random`, 6 base-36 characters, no join throttling | Low | backend `server.js:254` | Needs backend |
| OK | No XSS sinks; no `javascript:` URLs; no secrets in repo or history; no source maps shipped; Firebase config not in the bundle; `/.env` and `/.git` return 404; socket URL is `https`; `_blank` links have `rel` | n/a | verified | Nothing to do |

## Findings

### C1. Player IDs are bearer tokens, and they are broadcast to everyone

**What an attacker can do.** Every `roomUpdated` carries `players[]`, built as `{ ...other, character }`
(`server.js:223-233`), so each player receives every other player's `id` and `socketId`. The server
identifies the actor by `requesterId`/`playerId` from the payload and never compares it to the
socket that sent it. With one `id` an attacker can:

- take over that player's seat: `reconnectPlayer({ roomCode, playerId: victimId })` rebinds the
  victim's `socketId` to the attacker (`server.js:378-403`). The attacker then receives the
  victim's personalized room (their character and secret intel) and the victim stops getting updates;
- act as the host: `kickPlayer`, `resetGame`, `closeRoom`, `setRoomLock`, `startGame`,
  `assignGeneral`, `clearVote`, `startSecretVote` all check `requesterId === gm.id`, and the
  host's id is in every update;
- vote as anyone (`castVote` uses the payload `playerId`), investigate as the Guptochor
  (`investigatePlayer` checks `requesterId === room.guptochorId`), or remove anyone with
  `leaveRoom({ playerId: victimId })` (`server.js:664-684`), which also hands the host role to
  `players[0]` if the victim was the host.

**Reproduce.** Join a room in two browsers. In browser B's devtools, read `room.players[*].id` from any
`roomUpdated` frame (Network, WS). Then, from B's console with any Socket.IO client:
`socket.emit("kickPlayer", { roomCode, targetPlayerId: <A's id>, requesterId: <host id> })`.

**Fix (backend).** Keep a server-side `socket.id -> { roomCode, playerId }` map, set on
create/join/reconnect, and ignore `requesterId`/`playerId` in payloads. Issue a separate random
reconnect secret (e.g. 32 bytes from `crypto.randomBytes`) that only goes to its owner in `roomJoined`, and require it
in `reconnectPlayer`. Strip `socketId` from everything sent to clients. The public `id` can stay
in `players[]` as a display key once it no longer authenticates anything. The frontend keeps
sending the same events. Once the backend adds the secret, the client needs to store and send it
(a contract addition, listed in the backend follow-ups).

### C2. `roomJoined` leaks every role

**What an attacker can do.** `createRoom`, `joinRoom` and `reconnectPlayer` reply with
`roomJoined { room: rooms[roomCode] }`, which is the raw room (`server.js:277`, `:298`, `:395-399`). Mid-game
that object holds `players[].character` for everyone. The client stores it with `setRoom(data.room)`
(`GameDashboard/index.tsx:100`), so anyone who refreshes the page during a game can see every role in the
Network tab or in React DevTools. This doesn't take any effort to cheat: any player who reloads gets it.

**Reproduce.** Start a 5-player game, refresh one player's page, open DevTools > Network > WS, and
look at the `roomJoined` frame: `room.players[*].character.team`.

**Fix (backend).** Send the same personalized view that `broadcastRoomUpdate` builds (extract a
`personalizeRoom(room, viewerId)` helper and use it everywhere a room leaves the server).

### C3. `attemptAssassination` is unchecked and broadcasts the raw room

**What an attacker can do.** Any socket can call it at any time, with any `targetId`
(`server.js:704-720`). It sets `gameStatus = "OVER"` and a winner, then sends `io.to(roomCode).emit("roomUpdated", room)`,
the raw room with every character and `socketId`, to the whole room. If `roomCode` doesn't
exist, `room.players` throws (see C4).

**Reproduce.** During round 1, from any client: `socket.emit("attemptAssassination", { roomCode, targetId: <any id> })`.

**Fix (backend).** Require `room.gameStatus === "MIR_JAFOR_TURN"`, sender is the Mir Jafor player (by
socket mapping, C1), the target is an active player, and finish with `broadcastRoomUpdate`.

### C4. Server crash from malformed events

**What an attacker can do.** Handlers destructure the payload directly (`({ name }) =>`) and
dereference `rooms[roomCode]` without checks in places (`attemptAssassination`). Socket.IO does not catch
exceptions thrown by event listeners, so a `TypeError` becomes an uncaught exception and stops the Node
process, wiping every in-memory room for every player.

**Reproduce.** `socket.emit("createRoom")` (no payload) or `socket.emit("attemptAssassination", { roomCode: "NOPE" })`.
I did not run this against the live server. Confirm it locally against the backend.

**Fix (backend).** Validate every payload with a schema (zod) at the top of each handler, wrap
handlers in a try/catch helper, and add a `process.on("uncaughtException")` logger as a last
resort (not a substitute).

### C5. Vote stuffing

**What an attacker can do.** `castVote` writes `room.voting.votes[playerId] = choice` for any
`playerId` string and any `choice` (`server.js:447-457`). The vote ends when the number of keys equals
the target count, so one client can submit votes under made-up ids and decide a council vote alone.
For mission votes, the team membership check passes with real ids, which C1 makes available.

**Fix (backend).** The voter is the socket's player (C1). Require them to be in `activePlayerIds`
(council) or `proposedTeam` (mission), `choice` in `["yes", "no"]`, and count only eligible ids.

### H1. Mission votes are visible per player

`broadcastRoomUpdate` spreads `...room` (`server.js:223`), so `voting.votes` (`{ [playerId]: "yes" | "no" }`)
reaches every client during a mission vote. Anyone can see who sabotaged. The UI shows only
counts, but the data is in the Network tab.

**Fix (backend, no contract change).** The client already supports this: `VotingState.votes` accepts `true`
as a "has voted, choice hidden" placeholder (`types/game.ts:20-26`), and `voteSelectors.ts` reads votes only
through helpers. During an active `missionOutcome` vote, send `votes[playerId] = true` for each voter. After it
closes, don't send per-player choices either, because that still reveals who sabotaged: send the choices under
shuffled anonymous keys (`{ v1: "no", v2: "yes", ... }`). `voteTally` only counts values, so the result
screen keeps working. Council (`teamApproval`) votes can stay per player once closed, since they're public in
this game. While open, redact them the same way if you don't want people to see the votes coming in.

### H2. Privileged actions without real checks

| Event | Current server check | Must check |
|---|---|---|
| `startVote` | none (GM check commented out, `:430-431`) | sender is host or current General; game active; no vote open |
| `proposeTeam` | none (`:634-640`) | sender is the current General; game active; no vote open; ids unique, all in `activePlayerIds`; length equals the round's team size |
| `castVote` | see C5 | see C5 |
| `leaveRoom` | none (`:664`) | `playerId` is the sender's own player |
| `startGame` | host by `requesterId` | host (C1); `activeIds` unique members of the room, 5-10; `selectedCharIds` valid, unique, enough per team for the distribution, includes ids 1 and 8; game not started |
| `investigatePlayer` | `requesterId === guptochorId` | sender is the Guptochor (C1); target active and not self; correct phase |
| `attemptAssassination` | none | see C3 |
| `assignGeneral`, `resetGame`, `closeRoom`, `kickPlayer`, `setRoomLock`, `setDisableSecretIntelligence`, `clearVote`, `startSecretVote` | host by `requesterId` | host by socket (C1); phase where relevant (e.g. `startSecretVote` only after an approved team) |
| `reconnectPlayer` | player id exists | reconnect secret (C1) |
| `createRoom`, `joinRoom` | room exists, not locked, not full | name validation (M2), rate limit (M1) |

The client already hides these controls from non-hosts and players in the wrong phase, but that's cosmetic.

### H3. One malicious name crashes everyone's screen

**What an attacker can do.** The server stores `name` as sent (`server.js:253`, `:280`) and
broadcasts it. The client renders `{p.name}` in many places (`PlayerRoster/index.tsx:309`,
`VotingSystem/index.tsx:115`, `ObserverScreen/index.tsx:35`, ...). If `name` is an object, React throws
"Objects are not valid as a React child". With no error boundary, the whole tree unmounts and every
player in the room sees a blank page until the attacker leaves. A 1 MB string doesn't crash anything
but makes the UI unusable. Similar unguarded spots: `data.alliance.includes` (`GameDashboard/index.tsx:254`),
`msg.toLowerCase()` (`:129`), `p.character?.name.toUpperCase()` (`PlayerRoster/index.tsx:338`).

**Reproduce.** `socket.emit("joinRoom", { roomCode, name: { x: 1 } })`.

**Fix.** Backend: validate `name` (C4, M2). Frontend (Phase 3): validate every incoming payload with
zod in `services/socket.ts`. Clip names to the display limit, drop malformed payloads (log in dev),
and show a notice. Add an error boundary around the app with a "reload" fallback.

### H4. Missing security headers

Live check (`curl -I https://the-great-polashi-game.vercel.app`): only `strict-transport-security`
is set (by Vercel). Without `frame-ancestors`, another site can frame the game and trick a host
into clicking "Close HQ" or "Reset". Without a CSP, any future injection bug runs unrestricted.

**Fix (frontend, Phase 3).** Headers in `vercel.json`:
- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  (React inline styles and the components' `<style>` blocks need it); `font-src 'self' https://fonts.gstatic.com`;
  `img-src 'self' data:`; `media-src 'self'`; `connect-src 'self' https://polashi-game-backend.onrender.com wss://polashi-game-backend.onrender.com`;
  `worker-src 'self'`; `manifest-src 'self'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`.
  Firebase and Google auth endpoints are left out because sign-in isn't used (M3). If you wire it up, add
  `https://apis.google.com`, `https://*.googleapis.com`, `https://<project>.firebaseapp.com` (connect and frame).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`,
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` (doesn't break `signInWithPopup` if you add it later),
  `X-Frame-Options: DENY` (for old browsers).
- The JSON-LD `<script type="application/ld+json">` blocks are data, not executed, so `script-src 'self'` doesn't affect them.
- Vercel Analytics loads from `/_vercel/insights/script.js` (same origin).
- Plan: ship it enforcing, after testing with `vite preview`. If anything in production is uncertain, ship
  `Content-Security-Policy-Report-Only` for a few days first.

`/.env`, `/.git/config` and unknown paths return Vercel's 404, because `vercel.json` has no catch-all SPA rewrite.

### H5. Vulnerable dependencies

`npm audit --omit=dev`: 9 (2 critical, 5 high, 2 moderate). Only some of them ship to browsers:
- in the bundle: `socket.io-parser` (high), `react-router`/`react-router-dom` (high), `engine.io-client` (moderate, through `ws`, which
  is Node-only and not bundled). All fixed by `npm audit fix`, no major bumps.
- not in the bundle: `protobufjs` (critical), `@grpc/grpc-js` (high), `websocket-driver` (critical), all through `firebase`,
  which the app never imports at runtime (M3). Fixed by `npm audit fix` too, or gone if `firebase` is removed.

All deps: 32 (2 critical, 20 high, 9 moderate, 1 low). All fixable without a major bump except `vitest` (needs 3 -> 5,
moderate, dev-only), which I'll leave unless you say so. `package-lock.json` is committed. There's no CI in this repo,
so `npm ci` isn't relevant yet. If you add CI, use `npm ci` and `npm audit --omit=dev --audit-level=high`.
The backend runs Socket.IO server-side, where the `socket.io-parser` memory-exhaustion advisory actually bites, so run `npm audit` there too.

### M1. No rate limiting

Nothing limits `createRoom` (each room stays in memory until every player leaves), `joinRoom` (up to
`MAX_PLAYERS = 20`), or any other event. The UI disables create/join for 5 s (`GameDashboard/index.tsx:354-365`), but
a script ignores that. **Backend:** per-socket token bucket (e.g. 20 events/s, 3 room creations/min), per-IP
connection cap, room TTL and a global room cap. **Frontend (cosmetic):** disable buttons while a request is in flight.

### M2. Name and room-code input

`EnlistmentForm/index.tsx:48-58`: no `maxLength`, no trim. The button is enabled for a whitespace-only name. Zero-width
characters (U+200B-U+200D, U+2060, U+FEFF) and bidi overrides (U+202A-U+202E, U+2066-U+2069) let someone register
"Siraj" twice with different bytes, or make text render reversed. Duplicate names are allowed. Room code
(`:106-118`) has no length or character limit. **Frontend (UX):** NFKC-normalize, strip invisible and bidi controls,
collapse whitespace, 1-20 characters, room code `[A-Z0-9]{6}`. **Backend (real):** the same rules, plus reject a name
already used in the room (case-insensitive, after normalization).

### M3. Firebase Auth is not connected to anything

`src/lib/firebase.ts`, `src/auth/*`, `src/components/login`, `dashboard`, `GoogleLoginButton.tsx` and `ProtectedRoute.tsx`
exist, but `App.tsx` routes only `/` and `/how-to-play`, so none of them is reachable and Vite tree-shakes Firebase out of the
bundle (verified: no `firebaseapp`/`AIza` strings in `dist/`). Sign-in is not tied to game identity, and no ID token is sent to the
socket server. Options: remove the dead code and the `firebase` dependency (simplest, removes the vulnerable transitive deps), or
wire it up properly (backend verifies the ID token on connect with `firebase-admin`'s `verifyIdToken` and binds the uid to the player).
I need your call on this one. The Firebase project still exists (the config is in `.env.local` and presumably Vercel env), so the
console checklist below applies either way.

### M4. Backend CORS default

`const allowedOrigin = process.env.CLIENT_URL || "*"` (`server.js:14`) for both Express and Socket.IO. If `CLIENT_URL` isn't set on Render,
any website can open sockets to the game server from a visitor's browser. **Backend:** require `CLIENT_URL` and fail to start without it.
Allow `https://the-great-polashi-game.vercel.app` (plus `http://localhost:5173` in dev).

### M5. Analytics endpoints

`/api/analytics/all-players` (`server.js:802`) returns every player name ever stored. `/api/analytics/test` (`:784`) returns
`err.message` and the latest log id. None of them has auth. **Backend:** remove `test`, put the others behind an admin token or
aggregate-only responses, and never return raw error messages.

### M6. Observers see every role (accepted)

Players left out of the active battalion get `isObserver` and the full role list (`server.js:225`). A sidelined friend can relay roles
to a player by voice. This is a design choice, so I've listed it as accepted. Change it only if you want observers to see roles after the game ends.

### L1. Production console output

`services/socket.ts:34` logs the socket id on every connect, `:44` the disconnect reason, `pwa.ts:5,8` update messages.
Room state, roles and ids aren't logged anywhere. **Fix:** gate them behind `import.meta.env.DEV`.

### L2. Reconnect behaviour

`reconnectionAttempts: Infinity, reconnectionDelay: 1000` (`services/socket.ts:17-23`) already gets socket.io's default exponential backoff
(1 s doubling, `reconnectionDelayMax` 5 s, `randomizationFactor` 0.5), so it isn't a storm. But every client of a downed server retries
every ~5 s forever. **Fix:** `reconnectionDelayMax: 30000`. Separately, every page load sends `reconnectPlayer` twice: once from the
`connect` handler (`socket.ts:36-40`) and once from `GameDashboard/index.tsx:146-150`. Keep only the `connect` handler, which also covers later reconnects.

### L3. Service worker and `dev-dist/`

`dist/sw.js` has `skipWaiting` + `clientsClaim` (`registerType: 'autoUpdate'`) and `cleanupOutdatedCaches`, so a broken worker gets
replaced on the next visit. It precaches only the app shell and icons, with no runtime caching, and WebSocket traffic can't go through a
service worker. Two issues: the `NavigationRoute` answers every navigation with `index.html`, so with the worker installed, `/sitemap.xml`
and `/robots.txt` opened in the address bar show the app, and `/how-to-play` gets the shell instead of the pre-rendered page.
`dev-dist/` is output of `vite dev` and changes on every dev run. **Fix:** `workbox.navigateFallbackDenylist` for those paths, untrack `dev-dist/` and ignore it.

### L4. Double-fired actions (cosmetic)

Vote buttons, team toggles and host actions emit on every click. The server mostly overwrites (votes), but a double "Appoint General"
re-rolls the General. **Fix (UX):** a short in-flight lock per action, released on the next `roomUpdated` or after a timeout.

### L5. `?room=` parameter

`GameDashboard/index.tsx:59-68` copies any length into state. **Fix:** accept only `[A-Z0-9]{6}`.

### L6. Google Fonts (accepted)

`index.html:30` loads Cinzel, EB Garamond and Noto Serif Bengali from Google, and `display=swap` is already set. Self-hosting removes a third-party
request and two CSP origins, but it adds a dependency (e.g. `@fontsource/*`) and some subsetting work. For now I'll allow the two origins in the
CSP. It's easy to switch later.

### L7. Room codes

`Math.random().toString(36).substring(2, 8)` (`server.js:254`) isn't a CSPRNG and can collide with an existing room (no check). With no
join throttling, codes can be enumerated slowly. **Backend:** `crypto.randomInt`, a collision check, and the join rate limit from M1.

### Verified, nothing to do

- XSS: no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` or string
  `setTimeout` in `src/`, `scripts/` or `index.html`. Names, room codes, server errors, intel and notification text are all rendered as React text.
- No `href`/`src` built from user or server data. The only dynamic `src` is `user.photoURL` in the unused `GoogleLoginButton.tsx`.
- `target="_blank"`: one link (`CreditFooter/index.tsx:14`), with `rel="noopener noreferrer"`.
- Secrets: none tracked. `git log --all -S` for `PRIVATE KEY`, `secret`, `token`, `password`, `AIza`, `mongodb+srv` finds only game copy and
  the unused login form. `.env.local` is ignored by `*.local`.
- Source maps: none in `dist/` (`build.sourcemap` unset).
- Socket URL: the fallback and `VITE_SOCKET_URL` (in `.env.local`) are both `https`, so the WebSocket is `wss`.
- Leaving a room, being kicked and room dissolution all clear `roomCode` and `playerId` from localStorage (`GameDashboard/index.tsx:142-143`,
  `:234-235`, `:350-351`, `:421`, `:473-474`). The game has no sign-in, so there's no logout. `sessionStorage.intro_played` is harmless.
- `guptochorResult` goes only to the investigator, and `secretIntel` is personalized per player.

## Frontend fixes planned for Phase 3

1. `vercel.json` security headers (H4), tested with `vite preview`: socket, fonts, images, background video, PWA and `/how-to-play`.
2. `npm audit fix` without majors (H5).
3. zod schemas for every incoming event, with malformed payloads dropped, plus an app-level error boundary (H3).
4. Shared name and room-code normalization and validation, `maxLength`, used by the form and the `?room=` parameter (M2, L5).
5. Console output gated behind `import.meta.env.DEV` (L1).
6. `reconnectionDelayMax: 30000`, explicit jitter, and the duplicate `reconnectPlayer` removed (L2).
7. In-flight locks on votes and host actions (L4, M1 client side).
8. `navigateFallbackDenylist`, `dev-dist/` untracked and ignored (L3).
9. Tests for the validation logic, the payload schemas and the error boundary.
10. M3 (Firebase dead code): only on your decision.

Not changed: game rules, mission tables, socket event names and payload shapes. Anything that needs a contract change is in the backend list below.

## Backend follow-ups

Paste this into a Claude Code session in `polashi_game_backend`:

```
Security fixes for server.js (Socket.IO game server). Keep event names unchanged unless noted.

1. Identity (critical). Stop trusting requesterId/playerId from payloads.
   - Keep a Map socket.id -> { roomCode, playerId }, set on createRoom/joinRoom/reconnectPlayer,
     cleared on leaveRoom/kick/close/disconnect. Every handler gets the actor from this map.
   - Generate a reconnect secret per player with crypto.randomBytes(32).toString("base64url"),
     store it server-side, send it only to its owner in roomJoined as `reconnectToken`.
     reconnectPlayer must require { roomCode, playerId, reconnectToken } and compare with
     crypto.timingSafeEqual. (Frontend will store and send reconnectToken: contract addition.)
   - Never send socketId or reconnect secrets to clients.

2. One personalized view (critical). Extract personalizeRoom(room, viewerId) from
   broadcastRoomUpdate and use it for EVERY room that leaves the server: roomJoined in
   createRoom/joinRoom/reconnectPlayer, and attemptAssassination (which currently emits the raw
   room). Strip players[].socketId. Characters only for self, observers, or gameStatus OVER.

3. Hide mission votes (high, no contract change; the frontend already supports this).
   In the personalized view, for voting.type === "missionOutcome":
   - while active: votes[playerId] = true for each player who has voted (never "yes"/"no").
   - after close: replace keys with shuffled anonymous ones ({ v1: "no", v2: "yes", ... }) so the
     tally works but no choice maps to a player. Also stop logging per-player mission choices
     (GameLogger councilVotes) if those logs are ever exposed.
   For teamApproval, per-player values are fine once the vote closes.

4. Payload validation (critical: crashes). Validate every event payload with zod at the top of each
   handler (strings with max lengths, arrays with max sizes, enums). Wrap handlers so exceptions are
   caught and logged and never reach the event loop. Ensure no handler dereferences a missing room.
   Add process.on("uncaughtException"/"unhandledRejection") logging.

5. Authorization and phase checks:
   - startVote: sender is host or current General; game ACTIVE; no active vote. (GM check is commented out today.)
   - proposeTeam: sender is the current General; game ACTIVE; no active vote; unique ids, all in
     activePlayerIds, length == MISSION_CONFIGS[active][round-1].players.
   - castVote: voter = socket's player; teamApproval -> in activePlayerIds; missionOutcome -> in
     proposedTeam; choice in ["yes","no"]; count only eligible voters (no vote stuffing with fake ids).
   - startSecretVote: host; only after an approved teamApproval for this round.
   - investigatePlayer: sender is guptochorId; target in activePlayerIds and != sender; not used yet.
   - attemptAssassination: gameStatus === "MIR_JAFOR_TURN"; sender's character id === 1; target in
     activePlayerIds; end with broadcastRoomUpdate.
   - leaveRoom: only the sender's own player.
   - startGame: host; not already started; activeIds unique members, 5-10; selectedCharIds valid and
     unique, contain 1 and 8, and have enough per team for teamDistributions[count].
   - kickPlayer/resetGame/closeRoom/setRoomLock/setDisableSecretIntelligence/assignGeneral/clearVote:
     host via socket identity.

6. Names: trim, NFKC normalize, strip U+200B-U+200D, U+2060, U+FEFF, U+202A-U+202E, U+2066-U+2069 and
   other control chars, collapse whitespace, 1-20 chars, reject duplicates in the room
   (case-insensitive). Room codes: crypto.randomInt-based, 6 chars [A-Z0-9], retry on collision.

7. Rate limiting and memory: per-socket token bucket (e.g. 20 events/s burst, 3 createRoom/min),
   per-IP connection cap, MAX_ROOMS cap, delete rooms idle > 2h or with no online players for 30 min,
   Socket.IO maxHttpBufferSize ~ 16 KB.

8. CORS: require CLIENT_URL (fail fast if unset); allow https://the-great-polashi-game.vercel.app and
   http://localhost:5173 in dev only. Same list for Socket.IO cors.

9. Analytics endpoints: delete /api/analytics/test; protect /all-players (admin token) or remove it;
   never send err.message to clients.

10. npm audit fix (socket.io-parser memory exhaustion advisory applies server-side).

11. If Firebase sign-in is kept: verify the ID token on connection (socket.handshake.auth.token) with
    admin.auth().verifyIdToken and bind uid to the player; otherwise remove firebase-admin if unused.
```

## Firebase / Google Cloud console checklist

The web config is public by design. These settings decide whether that's safe:

- [ ] **Authentication > Settings > Authorized domains:** only `the-great-polashi-game.vercel.app` and `localhost`. Remove any `*.vercel.app` preview domains you don't use.
- [ ] **Authentication > Sign-in method:** disable every provider you don't use. If sign-in stays unused (M3), disable Google too, or delete the web app.
- [ ] **Firestore Database > Rules:** no `allow read, write: if true;` and no expired test-mode date. The backend uses the Admin SDK, which bypasses rules, so client rules can be `allow read, write: if false;`.
- [ ] **Storage > Rules:** the same, if Storage is enabled.
- [ ] **App Check:** enable (reCAPTCHA Enterprise for web) and enforce for Firestore and Storage.
- [ ] **Google Cloud console > APIs & Services > Credentials > Browser key:** restrict by HTTP referrer to `https://the-great-polashi-game.vercel.app/*` and `http://localhost:5173/*`, and restrict to the APIs actually used (Identity Toolkit, Token Service, Firestore).
- [ ] **Service accounts:** the backend's `FIREBASE_PRIVATE_KEY` lives only in Render env vars. Rotate it if it ever left your machine. Delete unused keys.
- [ ] **Billing > Budgets & alerts:** set a small monthly budget with email alerts at 50/90/100%.
- [ ] **IAM:** only your account has Owner. Remove stale collaborators.

## What I couldn't verify

- The live server's behaviour (C4 crash, CORS value on Render). I read the backend code but didn't send hostile events to production.
- Firebase console settings: I have no access.
- Whether the deployed site already serves main (PR #2). The header check was against the live URL as it is now.
