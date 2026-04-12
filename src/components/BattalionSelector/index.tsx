import React from 'react';
import type { Room } from '../../types/game';
import { MISSION_CONFIGS } from '../../constants';

interface BattalionSelectorProps {
  room: Room;
  me: any;
  handleTogglePlayer: (id: string) => void;
  handleStartVote: () => void;
  isTurnComplete: boolean;
}

const BattalionSelector: React.FC<BattalionSelectorProps> = ({
  room,
  me,
  handleTogglePlayer,
  handleStartVote,
  isTurnComplete
}) => {
  // Guard Clauses
  const isGeneral = me?.isGeneral;
  const showSelector = isGeneral && room.gameStarted && !room.voting?.active && !isTurnComplete;
  
  if (!showSelector) return null;

  // NEW: Get dynamic requirements based on the number of active players
  const activeCount = room.activePlayerIds?.length || 5;
  const currentRoundIndex = (room.currentRound || 1) - 1;
  
  // Safely fetch config: MISSION_CONFIGS[5..10][0..4]
  const currentReq = MISSION_CONFIGS[activeCount]?.[currentRoundIndex] || { players: 0, failsRequired: 1 };
  
  const selectedCount = room.proposedTeam?.length || 0;
  const isSelectionComplete = selectedCount === currentReq.players;

  return (
    <div style={{
      margin: "20px 0",
      padding: "20px",
      background: "rgba(197, 160, 89, 0.05)",
      border: `1px solid ${isSelectionComplete ? "#c5a059" : "rgba(197, 160, 89, 0.3)"}`,
      borderRadius: "12px",
      fontFamily: "'Cinzel', serif",
      boxShadow: isSelectionComplete ? "0 0 15px rgba(197, 160, 89, 0.1)" : "none",
      transition: "all 0.3s ease"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ color: "#c5a059", marginTop: 0, marginBottom: "5px" }}>Assemble Your Battalion</h3>
          <p style={{ color: "#aaa", fontSize: "13px", fontFamily: "'EB Garamond', serif", margin: 0 }}>
            Mission Round {room.currentRound}: Select <strong>{currentReq.players}</strong> operatives.
          </p>
        </div>

        {/* Dynamic Badge for Rounds requiring 2 Fails (Scales automatically) */}
        {currentReq.failsRequired > 1 && (
          <div style={{
            fontSize: '10px',
            background: '#c62828',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            animation: 'pulse 2s infinite',
            textAlign: 'center'
          }}>
            HEAVY RESISTANCE<br/>
            <span style={{ fontSize: '8px' }}>({currentReq.failsRequired} FAILS REQ)</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "20px" }}>
        {/* NEW: Filter players to only show those who are ACTIVE in the game */}
        {room.players
          .filter(p => room.activePlayerIds?.includes(p.id))
          .map(p => {
            const isSelected = (room.proposedTeam || []).includes(p.id);

            return (
              <button
                key={p.id}
                onClick={() => handleTogglePlayer(p.id)}
                style={{
                  padding: "10px 14px",
                  backgroundColor: isSelected ? "#c5a059" : "rgba(255,255,255,0.02)",
                  color: isSelected ? "#000" : "#c5a059",
                  border: `1px solid ${isSelected ? "#c5a059" : "rgba(197, 160, 89, 0.4)"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: isSelected ? "bold" : "normal",
                  transition: "all 0.1s ease-out",
                  flex: "1 1 calc(33% - 10px)",
                  minWidth: "90px",
                  opacity: !isSelected && isSelectionComplete ? 0.5 : 1
                }}
              >
                {p.name}
              </button>
            );
        })}
      </div>

      <div style={{
        marginTop: "15px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ 
            fontSize: "11px", 
            color: isSelectionComplete ? "#c5a059" : "#666",
            letterSpacing: '1px'
        }}>
          {selectedCount} / {currentReq.players} Operatives Selected
        </div>
      </div>

      {isSelectionComplete && (
        <button
          onClick={handleStartVote}
          style={{
            minWidth: "140px", 
            padding: "14px", 
            width: "100%",
            marginTop: "10px",
            backgroundColor: "rgba(197, 160, 89, 0.1)",
            color: "#c5a059",
            border: "1px solid #c5a059",
            borderRadius: "8px", 
            fontWeight: "bold", 
            fontSize: "13px", 
            cursor: "pointer", 
            textTransform: "uppercase",
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          📜 Initiate Council Vote
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BattalionSelector;