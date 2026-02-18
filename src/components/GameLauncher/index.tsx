import React, { useState } from 'react';
import type { Room, CharacterType } from '../../types/game';
import { TEAM_DISTRIBUTIONS } from '../../constants';

interface GameLauncherProps {
  room: Room | null;
  isGameMaster: boolean;
  handleStartGame: (selectedCharIds: number[]) => void;
  handleAssignGeneral: () => void;
  primaryBtn: React.CSSProperties;
  activeCount: number;
  characterList: CharacterType[];
}

const GameLauncher: React.FC<GameLauncherProps> = ({
  room,
  isGameMaster,
  handleStartGame,
  handleAssignGeneral,
  primaryBtn,
  activeCount,
  characterList
}) => {
  const [isPickingCharacters, setIsPickingCharacters] = useState(false);
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([1, 8]);

  if (!isGameMaster) return null;

  const isInvalid = activeCount < 5 || activeCount > 10;
  const isPreGame = !!(room && !room.gameStarted);
  const config = TEAM_DISTRIBUTIONS[activeCount] || { nawabs: 0, eic: 0 };

  // Helper to filter teams
  const nwbChars = characterList.filter(c => c.team === "Nawabs");
  const eicChars = characterList.filter(c => c.team?.includes("EIC") || c.team?.includes("Company"));

  const currentNawabs = characterList.filter(c => selectedCharIds.includes(c.id) && c.team === "Nawabs").length;
  const currentEIC = characterList.filter(c => selectedCharIds.includes(c.id) && (c.team?.includes("EIC") || c.team?.includes("Company"))).length;
  const isSelectionReady = currentNawabs === config.nawabs && currentEIC === config.eic;

  const toggleChar = (id: number) => {
    if (id === 1 || id === 8) return; 
    if (selectedCharIds.includes(id)) {
      setSelectedCharIds(prev => prev.filter(i => i !== id));
    } else {
      const char = characterList.find(c => c.id === id);
      if (!char) return;
      if (char.team === "Nawabs" && currentNawabs >= config.nawabs) return;
      if (!char.team?.includes("Nawabs") && currentEIC >= config.eic) return;
      setSelectedCharIds(prev => [...prev, id]);
    }
  };

  // --- Inline Styles ---
  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.96)', backdropFilter: 'blur(10px)', padding: '12px'
  };

  const modalContent: React.CSSProperties = {
    width: '100%', maxWidth: '800px', backgroundColor: '#111', borderRadius: '24px',
    border: '1px solid rgba(197, 160, 89, 0.3)', display: 'flex', flexDirection: 'column',
    maxHeight: '95vh', overflow: 'hidden', boxShadow: '0 0 100px rgba(0,0,0,0.8)'
  };

  const splitGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', backgroundColor: 'rgba(255,255,255,0.05)', flex: 1, overflowY: 'auto'
  };

  const teamColumn: React.CSSProperties = {
    padding: '20px', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: '10px'
  };

  const charCard = (selected: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px',
    border: `1px solid ${selected ? '#c5a059' : 'rgba(255,255,255,0.05)'}`,
    backgroundColor: selected ? 'rgba(197, 160, 89, 0.08)' : 'rgba(255,255,255,0.02)',
    opacity: disabled ? 0.3 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%', transition: 'all 0.2s', textAlign: 'left'
  });

  const teamHeader = (color: string): React.CSSProperties => ({
    fontSize: '11px', fontWeight: '900', color: color, letterSpacing: '2px',
    marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase',
    padding: '8px', borderBottom: `1px solid ${color}33`
  });

  return (
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <p style={{ color: isInvalid && isPreGame ? "#ff7675" : "#aaa", fontSize: "18px", fontFamily: "'EB Garamond', serif", fontStyle: "italic", marginBottom: "15px" }}>
        {isPreGame ? (isInvalid ? `Draft 5 to 10 operatives.` : `Battalion ready: ${activeCount}`) : "Appoint a General."}
      </p>

      <button
        onClick={() => isPreGame ? setIsPickingCharacters(true) : handleAssignGeneral()}
        disabled={!!(isInvalid && isPreGame)}
        style={{ ...primaryBtn, backgroundColor: (isInvalid && isPreGame) ? "#222" : "#c5a059", color: (isInvalid && isPreGame) ? "#444" : "#000" }}
      >
        {isPreGame ? "Begin Campaign" : "Appoint General"}
      </button>

      {isPickingCharacters && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            
            {/* Header / Briefing Area */}
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#161616' }}>
              <h2 style={{ fontSize: '24px', color: '#c5a059', fontFamily: 'serif', margin: 0 }}>সৈন্যদল বিন্যাস</h2>
              <p style={{ fontSize: '10px', color: 'rgba(197, 160, 89, 0.5)', letterSpacing: '3px', margin: '5px 0 15px' }}>BATTALION BALANCE</p>
            </div>

            {/* Split View: Left (EIC) vs Right (Nawab) */}
            <div style={splitGrid}>
              
              {/* Left Column: East India Company */}
              <div style={teamColumn}>
                <div style={teamHeader('#ef4444')}>Company (Red) {currentEIC}/{config.eic}</div>
                {eicChars.map(char => {
                  const isSelected = selectedCharIds.includes(char.id);
                  const isMandatory = char.id === 8;
                  const isDisabled = !isSelected && (currentEIC >= config.eic);
                  return (
                    <button key={char.id} onClick={() => toggleChar(char.id)} disabled={isDisabled} style={charCard(isSelected, isDisabled)}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #ef4444', backgroundColor: isSelected ? '#ef4444' : 'transparent' }} />
                      <span style={{ fontSize: '14px', color: isSelected ? '#fff' : '#888' }}>{char.name} {isMandatory && '⭐'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Nawabs */}
              <div style={{ ...teamColumn, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={teamHeader('#22c55e')}>Nawabs (Green) {currentNawabs}/{config.nawabs}</div>
                {nwbChars.map(char => {
                  const isSelected = selectedCharIds.includes(char.id);
                  const isMandatory = char.id === 1;
                  const isDisabled = !isSelected && (currentNawabs >= config.nawabs);
                  return (
                    <button key={char.id} onClick={() => toggleChar(char.id)} disabled={isDisabled} style={charCard(isSelected, isDisabled)}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #22c55e', backgroundColor: isSelected ? '#22c55e' : 'transparent' }} />
                      <span style={{ fontSize: '14px', color: isSelected ? '#fff' : '#888' }}>{char.name} {isMandatory && '⭐'}</span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Actions */}
            <div style={{ padding: '20px', backgroundColor: '#161616', display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsPickingCharacters(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #333', backgroundColor: 'transparent', color: '#666', fontWeight: 'bold' }}>CANCEL</button>
              <button 
                disabled={!isSelectionReady}
                onClick={() => { setIsPickingCharacters(false); handleStartGame(selectedCharIds); }}
                style={{ 
                  flex: 2, padding: '14px', borderRadius: '12px', border: 'none',
                  backgroundColor: isSelectionReady ? '#c5a059' : '#222', 
                  color: isSelectionReady ? '#000' : '#444', fontWeight: 'bold'
                }}
              >
                START GAME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLauncher;