import React from 'react';
import CreditFooter from '../../components/CreditFooter';
import Walkthrough from './Walkthrough';
import { MISSION_CONFIGS, TEAM_DISTRIBUTIONS } from '../../constants';

// Static, crawlable explainer. Rendered to HTML at build time by
// scripts/prerender.mjs, so it must not depend on sockets, storage or router
// hooks. The rules text is written from the game code, not the rulebook.

const PLAYER_COUNTS = Object.keys(TEAM_DISTRIBUTIONS).map(Number);

const HowToPlay: React.FC = () => {
  return (
    <main style={pageStyle}>
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <p style={kickerStyle}>The Battle of</p>
        <h1 style={titleStyle}>
          Polashi <span lang="bn" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>(পলাশী)</span>
        </h1>
        <p style={{ margin: '10px 0 0', color: '#bbb' }}>
          About the game and how to play
        </p>
      </header>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>What it is</h2>
        <p>
          The Battle of Polashi is an online multiplayer social deduction game for 5 to 10 players,
          set around the Battle of Plassey (Polashi) in Bengal, 1757. Each player is secretly dealt a
          historical character on one of two sides. The loyal Nawabs try to win the campaign; the
          East India Company (EIC) conspirators hide among them and sabotage it from inside.
        </p>
        <p>
          It runs in the browser: one player opens a room, shares the room code or invite link, and
          everyone joins from their own phone or computer. Nobody needs an account.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Step by step</h2>
        <p>
          A whole game from start to finish, as it looks on screen. The control to press is
          outlined in gold.
        </p>
        <Walkthrough />
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>The two sides</h2>
        <ul>
          <li>
            <strong>Nawabs</strong> — Nawab Siraj-ud-Daulah, Lutfunnisa Begum, Mir Madan, Mohanlal
            and their allies. They are the majority, but they do not know who is on their side.
          </li>
          <li>
            <strong>East India Company</strong> — Mir Jafor, Rai Durlabh, Ghaseti Begum, Umichand.
            Fewer in number, and they win by staying hidden.
          </li>
        </ul>
        <table style={tableStyle}>
          <caption style={captionStyle}>Team sizes by player count</caption>
          <thead>
            <tr>
              <th style={cellStyle}>Players</th>
              {PLAYER_COUNTS.map((count) => (
                <th key={count} style={cellStyle}>{count}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style={cellStyle}>Nawabs</th>
              {PLAYER_COUNTS.map((count) => (
                <td key={count} style={cellStyle}>{TEAM_DISTRIBUTIONS[count].nawabs}</td>
              ))}
            </tr>
            <tr>
              <th style={cellStyle}>EIC</th>
              {PLAYER_COUNTS.map((count) => (
                <td key={count} style={cellStyle}>{TEAM_DISTRIBUTIONS[count].eic}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p>
          Your character card is shown only on your own screen. Depending on the room settings,
          some characters also receive secret intelligence about who else is who.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>How a round works</h2>
        <p>The campaign is played over up to five rounds.</p>
        <ol>
          <li>
            <strong>A General is appointed.</strong> The General picks the battalion for this
            round. The size of the battalion is fixed by the round and the number of players.
          </li>
          <li>
            <strong>The council votes.</strong> Every player votes openly to approve or reject the
            proposed battalion. If half or more reject it, the battalion is not sent and a new
            proposal is needed.
          </li>
          <li>
            <strong>The battalion votes in secret.</strong> Each member chooses success or
            sabotage. Nawabs can only choose success; EIC members may sabotage. Only the count is
            revealed, never who voted what.
          </li>
          <li>
            <strong>The round is scored.</strong> One sabotage is enough to lose the round, except
            in round 4 with 7 or more players, where it takes two.
          </li>
        </ol>
        <table style={tableStyle}>
          <caption style={captionStyle}>Battalion size per round</caption>
          <thead>
            <tr>
              <th style={cellStyle}>Players</th>
              {[1, 2, 3, 4, 5].map((round) => (
                <th key={round} style={cellStyle}>Round {round}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAYER_COUNTS.map((count) => (
              <tr key={count}>
                <th style={cellStyle}>{count}</th>
                {MISSION_CONFIGS[count].map((mission, index) => (
                  <td key={index} style={cellStyle}>
                    {mission.players}
                    {mission.failsRequired > 1 ? '*' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '14px', color: '#999' }}>* two sabotages needed to lose this round</p>
        <p>
          From round 3 onward there is also a <strong>Guptochor</strong> (spy). The General of
          round 2 holds it first and may secretly learn which side one other player is on. The
          player they investigate holds the Guptochor in the following round. Everyone is told that
          an investigation happened, but only the investigator sees the answer.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Winning, and the Mir Jafor endgame</h2>
        <p>
          The East India Company wins as soon as three rounds are lost. If the Nawabs win three
          rounds first, the game is not over yet: Mir Jafor gets one last act of betrayal. He
          names the player he believes is Mir Madan, the Nawab's loyal commander. If he is right,
          the East India Company wins anyway. If he is wrong, the Nawabs win.
        </p>
        <p>
          So the Nawab players who know the most have to steer the votes without making it obvious
          who they are.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Credits</h2>
        <p>
          This is an unofficial, fan-made digital adaptation of <em>Polashi</em>, a social deduction
          board game published by Playground Inc. (Bangladesh). It is not affiliated with or
          endorsed by Playground Inc., and it uses none of their artwork, logos or rulebook text.
          The core mechanics come from <em>The Resistance: Avalon</em> by Don Eskridge.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>Privacy</h2>
        <p>
          There are no accounts and no sign-in, and the game sets no cookies. You play under an
          alias of your choice, so you don't need to use your real name.
        </p>
        <p>
          Your browser keeps the room code, your player id and a rejoin key so a reload puts you
          back in your seat. Leaving the room, being removed or the room closing deletes them.
        </p>
        <p>
          While a game runs, the server holds the room in memory and deletes it once everyone has
          gone. When a game starts it saves a record for statistics: the room code, each
          player&apos;s alias, role and side, each round&apos;s General, team, votes and result,
          and the winner.
        </p>
        <p>
          Page views are counted with Vercel Web Analytics, which is anonymous and uses no
          cookies.
        </p>
      </section>

      <p style={{ textAlign: 'center', margin: '32px 0 0' }}>
        <a href="/" style={ctaStyle}>Play now</a>
      </p>

      <CreditFooter showHowToPlay={false} />
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '32px 16px 24px',
  lineHeight: 1.6,
  fontSize: '17px',
  color: '#e0e0e0',
};

const kickerStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Cinzel', serif",
  fontSize: '16px',
  color: '#c5a059',
  letterSpacing: '4px',
  textTransform: 'uppercase',
  opacity: 0.8,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Cinzel', serif",
  fontSize: '30px',
  color: '#c5a059',
  letterSpacing: '3px',
  textTransform: 'uppercase',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '28px',
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: '20px',
  color: '#e7d6ad',
  borderBottom: '1px solid rgba(197, 160, 89, 0.3)',
  paddingBottom: '6px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '12px 0',
  fontSize: '15px',
  display: 'block',
  overflowX: 'auto',
};

const captionStyle: React.CSSProperties = {
  textAlign: 'left',
  color: '#999',
  fontSize: '14px',
  marginBottom: '6px',
};

const cellStyle: React.CSSProperties = {
  border: '1px solid #333',
  padding: '6px 10px',
  textAlign: 'center',
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 36px',
  border: '1px solid #c5a059',
  color: '#c5a059',
  fontFamily: "'Cinzel', serif",
  letterSpacing: '3px',
  textDecoration: 'none',
};

export default HowToPlay;
