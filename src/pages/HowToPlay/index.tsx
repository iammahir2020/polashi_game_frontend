import React from 'react';
import CreditFooter from '../../components/CreditFooter';
import Walkthrough from './Walkthrough';
import { CONTACT_EMAIL } from '../../components/CreditFooter/links';
import { MISSION_CONFIGS, TEAM_DISTRIBUTIONS } from '../../constants';
import { useI18n } from '../../i18n/useI18n';
import LanguageToggle from '../../i18n/LanguageToggle';

// Static, crawlable explainer. Rendered to HTML at build time by
// scripts/prerender.mjs (in English: there is no language provider there), so
// it must not depend on sockets, storage or router hooks. The rules text is
// written from the game code, not the rulebook; it lives in src/i18n/en.ts and
// bn.ts under "howto.*".

const PLAYER_COUNTS = Object.keys(TEAM_DISTRIBUTIONS).map(Number);

// Company first, then the Nawabs, then the characters with no power.
const CHARACTER_KEYS = [
  'howto.char.mirJafor',
  'howto.char.raiDurlabh',
  'howto.char.ghaseti',
  'howto.char.omichand',
  'howto.char.mirMadan',
  'howto.char.mohanlal',
  'howto.char.others',
] as const;

const HowToPlay: React.FC = () => {
  const { t, rich, num, lang } = useI18n();

  return (
    <main style={pageStyle}>
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <p style={kickerStyle}>{t('title.kicker')}</p>
        <h1 style={titleStyle}>
          {t('title.name')}
          {lang === 'en' && <> <span lang="bn" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>(পলাশী)</span></>}
        </h1>
        <p style={{ margin: '10px 0 0', color: '#bbb' }}>
          {t('howto.subtitle')}
        </p>
        <div style={{ marginTop: '14px' }}>
          <LanguageToggle />
        </div>
      </header>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.whatTitle')}</h2>
        <p>{t('howto.what1')}</p>
        <p>{t('howto.what2')}</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.stepsTitle')}</h2>
        <p>{t('howto.stepsIntro')}</p>
        <Walkthrough />
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.sidesTitle')}</h2>
        <ul>
          <li>{rich('howto.sideNawabs')}</li>
          <li>{rich('howto.sideEic')}</li>
        </ul>
        <table style={tableStyle}>
          <caption style={captionStyle}>{t('howto.teamCaption')}</caption>
          <thead>
            <tr>
              <th style={cellStyle}>{t('howto.players')}</th>
              {PLAYER_COUNTS.map((count) => (
                <th key={count} style={cellStyle}>{num(count)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style={cellStyle}>{t('howto.nawabsRow')}</th>
              {PLAYER_COUNTS.map((count) => (
                <td key={count} style={cellStyle}>{num(TEAM_DISTRIBUTIONS[count].nawabs)}</td>
              ))}
            </tr>
            <tr>
              <th style={cellStyle}>{t('howto.eicRow')}</th>
              {PLAYER_COUNTS.map((count) => (
                <td key={count} style={cellStyle}>{num(TEAM_DISTRIBUTIONS[count].eic)}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p>{t('howto.cardNote')}</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.charactersTitle')}</h2>
        <p>{t('howto.charactersIntro')}</p>
        <ul>
          {CHARACTER_KEYS.map((key) => (
            <li key={key} style={{ marginBottom: '8px' }}>{rich(key)}</li>
          ))}
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.roundTitle')}</h2>
        <p>{t('howto.roundIntro')}</p>
        <ol>
          <li>{rich('howto.round1')}</li>
          <li>{rich('howto.round2')}</li>
          <li>{rich('howto.round3')}</li>
          <li>{rich('howto.round4')}</li>
        </ol>
        <table style={tableStyle}>
          <caption style={captionStyle}>{t('howto.sizeCaption')}</caption>
          <thead>
            <tr>
              <th style={cellStyle}>{t('howto.players')}</th>
              {[1, 2, 3, 4, 5].map((round) => (
                <th key={round} style={cellStyle}>{t('howto.roundColumn', { round })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAYER_COUNTS.map((count) => (
              <tr key={count}>
                <th style={cellStyle}>{num(count)}</th>
                {MISSION_CONFIGS[count].map((mission, index) => (
                  <td key={index} style={cellStyle}>
                    {num(mission.players)}
                    {mission.failsRequired > 1 ? '*' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '14px', color: '#999' }}>{t('howto.twoSabotages')}</p>
        <p>{rich('howto.guptochor')}</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.winTitle')}</h2>
        <p>{t('howto.win1')}</p>
        <p>{t('howto.win2')}</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.creditsTitle')}</h2>
        <p>{rich('howto.credits')}</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>{t('howto.privacyTitle')}</h2>
        <p>{t('howto.privacy1')}</p>
        <p>{t('howto.privacy2')}</p>
        <p>{t('howto.privacy3')}</p>
        <p>{t('howto.privacy4')}</p>
        <p>
          {t('howto.contact')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#c5a059' }}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <p style={{ textAlign: 'center', margin: '32px 0 0' }}>
        <a href="/" style={ctaStyle}>{t('howto.playNow')}</a>
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
