# The Battle of Polashi (পলাশী)

A real-time multiplayer web adaptation of *Polashi*, a social deduction board game published by
Playground Inc. (Bangladesh). This is an unofficial, fan-made project: I did not design the game,
I built the online version of it.

Live: https://the-great-polashi-game.vercel.app

![The Battle of Polashi](public/og-image.jpg)

## Features

- **Rooms and lobby.** One player opens a room and becomes its game master. Others join with the
  room code or an invite link (`/?room=CODE`). The game master can lock the room, remove players,
  choose which characters are in play and toggle secret intelligence. Supports 5 to 10 players.
- **Hidden roles.** Each player is dealt a character on the Nawab or East India Company side. The
  server sends every client its own view of the room, so a player's browser only receives their own
  character and the intel that character is allowed to see.
- **Server-authoritative game state.** Clients send intents (propose a team, cast a vote, investigate)
  and render whatever room state the server broadcasts. The server checks who is allowed to act,
  counts votes and decides round results.
- **Round flow.** A General proposes a battalion, the council approves or rejects it in an open vote,
  then the battalion votes success or sabotage in secret. Team sizes and sabotage thresholds per
  round are in [src/constants.ts](src/constants.ts).
- **Guptochor.** From round 3, one player may secretly check another player's side. That player holds
  the Guptochor next.
- **Mir Jafor endgame.** If the Nawabs win three rounds, Mir Jafor gets one guess at who Mir Madan is.
  A correct guess hands the win to the East India Company.
- **Reconnects.** Room code and player id are kept in `localStorage`, so a refreshed or dropped client
  rejoins its seat.
- **PWA.** Installable, with a service worker (vite-plugin-pwa) that caches the app shell. Playing still
  needs a connection to the game server.
- **SEO.** Per-route title, description, Open Graph tags and JSON-LD; a pre-rendered `/how-to-play`
  page; sitemap generated at build time.

## Tech stack

- React 19, TypeScript, Vite 7, React Router
- socket.io-client for real-time sync
- vite-plugin-pwa
- Vitest and React Testing Library
- sharp for the image pipeline
- Vercel hosting and Vercel Analytics

## Architecture

```
browser (this repo)  <-- socket.io -->  game server (polashi_game_backend)
  React UI renders the room                Express + socket.io
  state it receives                        rooms held in memory
                                           game logs written to Firestore
```

The backend lives in a separate repository:
https://github.com/iammahir2020/polashi_game_backend

- [src/services/socket.ts](src/services/socket.ts) wraps every socket event the client sends or
  listens for. The server URL is set at the top of that file.
- [src/components/GameDashboard/index.tsx](src/components/GameDashboard/index.tsx) holds the client
  state and switches between the lobby, the board and the overlays.
- [src/seo/](src/seo/) holds the metadata for each public route.

The `src/auth/`, `src/lib/firebase.ts` and login components are an earlier Firebase sign-in flow that
is no longer used; the game has no accounts.

## Local setup

Requires Node 20.19 or newer (Vite 7).

```sh
npm install
npm run dev
```

Optional environment variables (put them in `.env.local`):

| Name | Purpose |
|---|---|
| `VITE_SITE_URL` | Canonical site URL used in meta tags, JSON-LD and the sitemap |
| `VITE_SITE_SAME_AS` | Comma-separated profile URLs for JSON-LD `sameAs` |
| `VITE_GOOGLE_SITE_VERIFICATION` | Google Search Console token; adds the verification meta tag to the build |

To play against a local backend, run polashi_game_backend and point `SOCKET_URL` in
`src/services/socket.ts` at it.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Generates sitemap and robots.txt, type-checks, builds, then pre-renders `/how-to-play` |
| `npm run preview` | Serves the production build |
| `npm test` | Runs the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run assets` | Rebuilds the images in `public/` from `art-src/` (see [art-src/README.md](art-src/README.md)) |

## Testing

Unit and component tests sit next to their source as `*.test.ts(x)` and run in jsdom. They cover the
credit footer, the how-to-play page, the SEO metadata and JSON-LD, and a check that the static tags
in `index.html` match `src/seo/seoConfig.ts`.

```sh
npm test
```

## Credits & disclaimer

Unofficial fan-made digital adaptation of *Polashi* by Playground Inc. Not affiliated with or
endorsed by Playground Inc. No Playground Inc. artwork, logos or rulebook text are used.
[Get the physical game](https://www.rokomari.com/product/293046/polashi-a-social-deduction-board-game-5-to-10-players-age-12plus).

The game mechanics derive from *The Resistance: Avalon* by Don Eskridge.

Fonts in `scripts/fonts/` (Cinzel, EB Garamond, Noto Serif Bengali) are used under the SIL Open
Font License; the license files are alongside them.
