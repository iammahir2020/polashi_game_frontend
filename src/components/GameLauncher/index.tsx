import React, { useState } from 'react';
import type { Room, CharacterType } from '../../types/game';
import { TEAM_DISTRIBUTIONS } from '../../constants';

interface GameLauncherProps {
  room: Room | null;
  isGameMaster: boolean;
  handleStartGame: (selectedCharIds: number[]) => void;
  handleAssignGeneral: () => void;
  disableSecretIntelligence: boolean;
  onToggleDisableSecretIntelligence: (value: boolean) => void;
  primaryBtn: React.CSSProperties;
  activeCount: number;
  characterList: CharacterType[];
}

const GameLauncher: React.FC<GameLauncherProps> = ({
  room,
  isGameMaster,
  handleStartGame,
  handleAssignGeneral,
  disableSecretIntelligence,
  onToggleDisableSecretIntelligence,
  primaryBtn,
  activeCount,
  characterList
}) => {
  const [isPickingCharacters, setIsPickingCharacters] = useState(false);
  const [selectedCharIds, setSelectedCharIds] = useState<number[]>([1, 8]);

  if (!isGameMaster) return null;

  const isInvalid = activeCount < 5 || activeCount > 10;
  const isPreGame = !!(room && !room.gameStarted);
  const isGameOver = room?.gameStatus === "OVER";
  const config = TEAM_DISTRIBUTIONS[activeCount] || { nawabs: 0, eic: 0 };

  // Helper to filter teams
  const nwbChars = characterList.filter(c => c.team === "Nawabs");
  const eicChars = characterList.filter(c => c.team?.includes("EIC") || c.team?.includes("Company"));

  const currentNawabs = characterList.filter(c => selectedCharIds.includes(c.id) && c.team === "Nawabs").length;
  const currentEIC = characterList.filter(c => selectedCharIds.includes(c.id) && (c.team?.includes("EIC") || c.team?.includes("Company"))).length;
  const isSelectionReady = currentNawabs === config.nawabs && currentEIC === config.eic;
  const showSelectAllForTenPlayers = activeCount === 10;

  const handleSelectAllCharacters = () => {
    const allNawabIds = nwbChars.map(char => char.id).slice(0, config.nawabs);
    const allEicIds = eicChars.map(char => char.id).slice(0, config.eic);
    setSelectedCharIds([...allNawabIds, ...allEicIds]);
  };

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
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2px', backgroundColor: 'rgba(255,255,255,0.05)', flex: 1, overflowY: 'auto'
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
        {isPreGame
          ? (isInvalid ? `Draft 5 to 10 operatives.` : `Battalion ready: ${activeCount}`)
          : isGameOver
            ? "Campaign ended. Reset to begin a new one."
            : "Appoint a General."}
      </p>

      <button
        onClick={() => {
          if (isGameOver) return;
          isPreGame ? setIsPickingCharacters(true) : handleAssignGeneral();
        }}
        disabled={!!(isInvalid && isPreGame) || isGameOver}
        style={{
          ...primaryBtn,
          backgroundColor: ((isInvalid && isPreGame) || isGameOver) ? "#222" : "#c5a059",
          color: ((isInvalid && isPreGame) || isGameOver) ? "#666" : "#000"
        }}
      >
        {isPreGame ? "Begin Campaign" : isGameOver ? "Campaign Ended" : "Appoint General"}
      </button>

      <div
        style={{
          marginTop: "10px",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid rgba(197, 160, 89, 0.25)",
          backgroundColor: "rgba(255,255,255,0.02)",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
          <div style={{ color: "#e7d6ad", fontSize: "14px", fontWeight: 700 }}>
            Disable Secret Intelligence
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "4px 8px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              color: disableSecretIntelligence ? "#ffd2d2" : "#c7ffd6",
              backgroundColor: disableSecretIntelligence ? "rgba(220, 38, 38, 0.25)" : "rgba(22, 163, 74, 0.25)",
              border: disableSecretIntelligence ? "1px solid rgba(220, 38, 38, 0.35)" : "1px solid rgba(22, 163, 74, 0.35)",
            }}
          >
            {disableSecretIntelligence ? "Secret Intel Disabled" : "Secret Intel Enabled"}
          </span>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ddd", fontSize: "13px" }}>
          <input
            type="checkbox"
            checked={disableSecretIntelligence}
            disabled={!!room?.gameStarted}
            onChange={(e) => onToggleDisableSecretIntelligence(e.target.checked)}
          />
          Turn off Secret Intel clues for this match
        </label>

        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#9f9f9f", fontStyle: "italic" }}>
          If enabled, no Secret Intel clues are shown for this match.
        </p>
      </div>

      {isPickingCharacters && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            
            {/* Header / Briefing Area */}
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#161616' }}>
              <h2 style={{ fontSize: '24px', color: '#c5a059', fontFamily: 'serif', margin: 0 }}>সৈন্যদল বিন্যাস</h2>
              <p style={{ fontSize: '10px', color: 'rgba(197, 160, 89, 0.5)', letterSpacing: '3px', margin: '5px 0 15px' }}>BATTALION BALANCE</p>
              {showSelectAllForTenPlayers && (
                <button
                  onClick={handleSelectAllCharacters}
                  style={{
                    marginTop: '4px',
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: '1px solid rgba(197, 160, 89, 0.65)',
                    backgroundColor: 'rgba(197, 160, 89, 0.12)',
                    color: '#e7d6ad',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.8px',
                    cursor: 'pointer'
                  }}
                >
                  SELECT ALL CHARACTERS
                </button>
              )}
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