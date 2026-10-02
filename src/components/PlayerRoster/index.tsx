import React, { useState } from 'react';
import type { Player } from '../../types/game';

interface PlayerRosterProps {
  players: Player[];
  playerId: string | null;
  isGameMaster: boolean;
  gameStarted?: boolean;
  kickPlayer: (id: string) => void;
  guptochorId?: string | null;
  guptochorUsed?: boolean;
  onInvestigate?: (targetId: string) => void;
  // Selection Props
  selectedActiveIds: string[];
  onToggleActive: (id: string) => void;
  // Tablet/desktop sidebar: the list is always shown, no dropdown.
  alwaysOpen?: boolean;
}

const PlayerRoster: React.FC<PlayerRosterProps> = ({
  players,
  playerId,
  isGameMaster,
  gameStarted,
  kickPlayer,
  guptochorId,
  guptochorUsed,
  onInvestigate,
  selectedActiveIds,
  onToggleActive,
  alwaysOpen = false
}) => {
  const [isOpenState, setIsOpen] = useState(false);
  const isOpen = alwaysOpen || isOpenState;

  if (players.length === 0) return null;

  // Determine if the person viewing this component is an observer
  const amIObserver = gameStarted && !selectedActiveIds.includes(playerId || "");

  const summary = (
    <div style={{
      fontSize: "13px",
      color: isOpen ? "#c5a059" : "#aaa",
      textTransform: "uppercase",
      letterSpacing: "2px",
      fontFamily: "'Cinzel', serif",
      margin: 0
    }}>
      {amIObserver ? "Spymaster View: " : "Marshalled: "}
      <span style={{ color: "white", fontWeight: "bold" }}>{selectedActiveIds.length} Active</span>
    </div>
  );

  return (
    <div style={{ marginTop: alwaysOpen ? 0 : '20px' }}>
      {alwaysOpen ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 0 4px" }}>{summary}</div>
      ) : (
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "12px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          transition: "all 0.3s ease",
          outline: "none"
        }}
      >
        {summary}
        <span style={{ color: "#c5a059", fontSize: "12px", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>▼</span>
      </button>
      )}

      <div style={{
        maxHeight: alwaysOpen ? "none" : isOpen ? "1000px" : "0px",
        overflow: alwaysOpen ? "visible" : "hidden",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isOpen ? 1 : 0,
        marginTop: isOpen ? "12px" : "0px"
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: "2px" }}>
          {players.map((p) => {
            const isMe = p.id === playerId;
            const isActive = selectedActiveIds.includes(p.id);
            const showGuptochorAction = guptochorId === playerId && !guptochorUsed && !isMe && gameStarted;
            
            // Intelligence Logic: Reveal info to observers
            const showCharacterInfo = amIObserver && p.character;
            const isNawab = p.character?.team.includes("Nawabs");

            return (
              <div 
                key={p.id} 
                onClick={() => !gameStarted && isGameMaster && onToggleActive(p.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  backgroundColor: isActive ? "rgba(197, 160, 89, 0.05)" : "#1a1a1a",
                  borderRadius: "10px",
                  border: isActive ? "1px solid #c5a059" : "1px solid #333",
                  opacity: p.online ? 1 : 0.4,
                  cursor: (!gameStarted && isGameMaster) ? "pointer" : "default",
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? "inset 0 0 10px rgba(197, 160, 89, 0.1)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: 'wrap' }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    backgroundColor: p.online ? "#00b894" : "#ff7675",
                  }} />
                  
                  <span style={{ 
                    color: isMe ? "#fff" : (isActive ? "#e0e0e0" : "#777"), 
                    fontWeight: isMe ? "bold" : "normal", 
                    fontSize: "15px", 
                    fontFamily: "'EB Garamond', serif" 
                  }}>
                    {p.name} {p.isGameMaster && <span title="Game Master">👑</span>}
                  </span>

                  {p.isGeneral && (
                    <span style={{
                      fontSize: '11px',
                      color: '#c5a059',
                      border: '1px solid #c5a059',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      letterSpacing: '0.5px'
                    }}>
                      GENERAL
                    </span>
                  )}

                  {/* REVEALED INFO FOR OBSERVERS */}
                  {showCharacterInfo && (
                    <span style={{
                      fontSize: '11px',
                      color: isNawab ? "#00b894" : "#ff7675",
                      border: `1px solid ${isNawab ? "#00b894" : "#ff7675"}`,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      letterSpacing: '0.5px'
                    }}>
                      {p.character?.name?.toUpperCase()}
                    </span>
                  )}

                  {/* Status Badges */}
                  {isActive && !gameStarted && (
                    <span style={{ fontSize: '11px', color: '#c5a059', border: '1px solid #c5a059', padding: '2px 7px', borderRadius: '4px' }}>
                      BATTALION
                    </span>
                  )}
                  {!isActive && gameStarted && (
                    <span style={{ fontSize: '11px', color: '#777', border: '1px solid #333', padding: '2px 7px', borderRadius: '4px' }}>
                      OBSERVER
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {showGuptochorAction && (
                    <button onClick={(e) => { e.stopPropagation(); onInvestigate?.(p.id); }} className="spy-btn" style={{ border: "1px solid #c5a059", background: "rgba(197, 160, 89, 0.1)", color: "#c5a059", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
                      🕵️‍♂️ <span style={{fontSize: '11px'}}>SPY</span>
                    </button>
                  )}

                  {isGameMaster && !gameStarted && !isMe && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); kickPlayer(p.id); }} 
                      style={{ border: "none", background: "none", color: "#ff7675", cursor: "pointer", fontSize: "12px", fontWeight: 'bold', padding: "6px 4px" }}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerRoster;