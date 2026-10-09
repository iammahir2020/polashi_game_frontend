import React from 'react';
import type { Room } from '../../types/game';
import { useI18n } from '../../i18n/useI18n';

interface CommandConsoleProps {
  room: Room;
  isGameMaster: boolean;
  playerId: string | null;
  toggleLock: () => void;
  handleStartVote: () => void;
  handleResetGame: () => void;
  handleDissolve: () => void;
  // Inside a war-room column: no outer margin.
  embedded?: boolean;
}

const CommandConsole: React.FC<CommandConsoleProps> = ({
  room,
  isGameMaster,
  playerId,
  toggleLock,
  handleStartVote,
  handleResetGame,
  handleDissolve,
  embedded
}) => {
  const { t } = useI18n();
  // Guard clause: Only the Game Master should ever see this
  if (!isGameMaster) return null;

  const statusColor = room.locked ? "#ff922b" : "#40c057";

  return (
    <div style={{
      marginTop: embedded ? 0 : 40,
      padding: "24px",
      backgroundColor: room.locked ? "#1a1610" : "#111814",
      borderRadius: "16px",
      border: `1px solid ${room.locked ? "#5f411e" : "#2d4a34"}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Cinzel', serif"
    }}>
      {/* Visual Status Bar */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, width: "100px", height: "4px",
        backgroundColor: statusColor,
        boxShadow: `0 0 15px ${statusColor}`
      }} />

      <h4 style={{
        margin: "0 0 20px 0",
        color: "#c5a059",
        fontSize: "0.9rem",
        textTransform: "uppercase",
        letterSpacing: "2px",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        <span style={{ fontSize: "18px" }}>🛡️</span> {t('console.title')}
      </h4>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {/* LOCK ENTRY BUTTON */}
        <button
          onClick={toggleLock}
          style={{
            ...consoleBtnBase,
            backgroundColor: room.locked ? "rgba(255, 146, 43, 0.1)" : "rgba(64, 192, 87, 0.1)",
            color: statusColor,
            border: `1px solid ${statusColor}`,
          }}
        >
          {room.locked ? t('console.unlock') : t('console.lock')}
        </button>

        {/* VOTE BUTTON */}
        {room.gameStarted && playerId && (
          <button
            onClick={handleStartVote}
            style={{
              ...consoleBtnBase,
              backgroundColor: "rgba(197, 160, 89, 0.1)",
              color: "#c5a059",
              border: "1px solid #c5a059",
            }}
          >
            {room.voting ? t('console.newVote') : t('console.takeVote')}
          </button>
        )}

        {/* RESET CAMPAIGN BUTTON */}
        {room.gameStarted && (
          <button
            onClick={handleResetGame}
            style={{
              ...consoleBtnBase,
              backgroundColor: "transparent", 
              color: "#888", 
              border: "1px solid #444",
            }}
          >
            {t('console.reset')}
          </button>
        )}

        {/* DISSOLVE HQ BUTTON */}
        <button
          onClick={handleDissolve}
          style={{
            ...consoleBtnBase,
            backgroundColor: "rgba(255, 71, 71, 0.1)",
            color: "#ff4747",
            border: "1px solid #ff4747",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#ff4747";
            e.currentTarget.style.color = "#000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 71, 71, 0.1)";
            e.currentTarget.style.color = "#ff4747";
          }}
        >
          {t('console.close')}
        </button>
      </div>
    </div>
  );
};

// Internal styling object to keep the TSX clean
const consoleBtnBase: React.CSSProperties = {
  flex: 1, 
  minWidth: "140px", 
  padding: "14px",
  borderRadius: "8px", 
  fontWeight: "bold", 
  fontSize: "13px", 
  cursor: "pointer", 
  textTransform: "uppercase"
};

export default CommandConsole;