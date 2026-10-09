import React from 'react';
import type { Room } from '../../types/game';
import RoundTracker from '../RoundTracker';
import { useI18n } from '../../i18n/useI18n';

// `embedded`: inside the war room, where the page already supplies width and padding.
const ObserverScreen: React.FC<{ room: Room; embedded?: boolean }> = ({ room, embedded }) => {
  const { t, characterName } = useI18n();
  // Separate players into teams for easier observer reading
  const activePlayers = room.players.filter(p => (room.activePlayerIds ?? []).includes(p.id));
  const nawabs = activePlayers.filter(p => p.character?.team.includes("Nawabs"));
  const eic = activePlayers.filter(p => !p.character?.team.includes("Nawabs"));

  return (
    <div style={{ padding: embedded ? 0 : '20px', maxWidth: embedded ? 'none' : '800px', margin: '0 auto', color: '#fff' }}>
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", color: '#c5a059', letterSpacing: '4px' }}>
          {t('observer.title')}
        </h1>
        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {t('observer.subtitle')}
        </div>
      </div>

      {/* ROUND TRACKER REUSE */}
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid #333' }}>
        <RoundTracker room={room} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '30px' }}>
        
        {/* NAWAB LOYALISTS COLUMN */}
        <div style={teamColumnStyle("#1b4332")}>
          <h3 style={teamHeaderStyle("#00b894")}>{t('observer.nawabs')}</h3>
          {nawabs.map(p => (
            <div key={p.id} style={playerRowStyle}>
              <span style={{fontWeight: 'bold'}}>{p.name}</span>
              <span style={roleBadgeStyle}>{characterName(p.character)}</span>
            </div>
          ))}
        </div>

        {/* EIC TRAITORS COLUMN */}
        <div style={teamColumnStyle("#4d0d0d")}>
          <h3 style={teamHeaderStyle("#ff7675")}>{t('observer.eic')}</h3>
          {eic.map(p => (
            <div key={p.id} style={playerRowStyle}>
              <span style={{fontWeight: 'bold'}}>{p.name}</span>
              <span style={roleBadgeStyle}>{characterName(p.character)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LIVE GAME FEED */}
      <div style={{ marginTop: '30px', padding: '20px', borderTop: '1px solid #333' }}>
        <h4 style={{ fontFamily: 'Cinzel', color: '#aaa' }}>{t('observer.intel')}</h4>
        <div style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
          {room.voting?.active 
            ? t('observer.voting', { name: room.players.find(p => p.isGeneral)?.name ?? '' })
            : t('observer.waiting')}
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const teamColumnStyle = (color: string): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${color}22 0%, #1a1a1a 100%)`,
  border: `1px solid ${color}44`,
  borderRadius: '12px',
  padding: '15px'
});

const teamHeaderStyle = (color: string): React.CSSProperties => ({
  color: color,
  fontFamily: "'Cinzel', serif",
  fontSize: '14px',
  textAlign: 'center',
  borderBottom: `1px solid ${color}44`,
  paddingBottom: '10px',
  marginBottom: '15px'
});

const playerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #222',
  fontSize: '14px'
};

const roleBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  background: 'rgba(197, 160, 89, 0.1)',
  color: '#c5a059',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid rgba(197, 160, 89, 0.3)'
};

export default ObserverScreen;