import React, { useState } from 'react';
import type { Player } from '../../types/game';

interface PlayerRosterProps {
  players: Player[];
  playerId: string | null;
  isGameMaster: boolean;
  gameStarted?: boolean;
  kickPlayer: (id: string) => void;
}

const PlayerRoster: React.FC<PlayerRosterProps> = ({
  players,
  playerId,
  isGameMaster,
  gameStarted,
  kickPlayer
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (players.length === 0) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      {/* TOGGLE HEADER (Dropdown Trigger) */}
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
        <div style={{
          fontSize: "13px",
          color: isOpen ? "#c5a059" : "#aaa",
          textTransform: "uppercase",
          letterSpacing: "2px",
          fontFamily: "'Cinzel', serif",
          margin: 0
        }}>
          Recruits Marshalled: <span style={{ color: "white", fontWeight: "bold" }}>{players.length}/10</span>
        </div>
        
        {/* Chevron Icon */}
        <span style={{
          color: "#c5a059",
          fontSize: "12px",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s ease"
        }}>
          ▼
        </span>
      </button>

      {/* COLLAPSIBLE PLAYER LIST */}
      <div style={{
        maxHeight: isOpen ? "1000px" : "0px",
        overflow: "hidden",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isOpen ? 1 : 0,
        marginTop: isOpen ? "12px" : "0px"
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: "2px" }}>
          {players.map((p) => {
            const isMe = p.id === playerId;
            
            return (
              <div key={p.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: isMe ? "rgba(108, 92, 231, 0.1)" : "#1a1a1a",
                borderRadius: "10px",
                border: isMe ? "1px solid #6c5ce7" : "1px solid #333",
                opacity: p.online ? 1 : 0.4,
                transition: "all 0.3s ease"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    backgroundColor: p.online ? "#00b894" : "#ff7675",
                    boxShadow: p.online ? "0 0 10px #00b894" : "none"
                  }} />
                  
                  <span style={{
                    color: isMe ? "#fff" : "#ccc",
                    fontWeight: isMe ? "bold" : "normal",
                    fontSize: "15px",
                    fontFamily: "'EB Garamond', serif"
                  }}>
                    {p.name} {p.isGameMaster && <span title="Game Master">👑</span>}
                  </span>

                  {p.isGeneral && (
                    <span style={{
                      marginLeft: "8px",
                      fontSize: "10px",
                      color: "#c5a059",
                      border: "1px solid #c5a059",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase"
                    }}>
                      General
                    </span>
                  )}
                </div>

                {isGameMaster && !gameStarted && !isMe && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent dropdown from closing when kicking
                      kickPlayer(p.id);
                    }} 
                    className="kick-btn"
                    style={{ 
                      border: "none", background: "none", color: "#ff7675", 
                      cursor: "pointer", fontSize: "11px", fontWeight: 'bold'
                    }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .kick-btn:hover {
          text-decoration: underline;
          text-shadow: 0 0 8px rgba(255, 118, 117, 0.4);
        }
      `}`</style>
    </div>
  );
};

export default PlayerRoster;