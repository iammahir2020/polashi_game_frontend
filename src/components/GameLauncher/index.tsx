import React from 'react';
import type { Room } from '../../types/game';

interface GameLauncherProps {
  room: Room | null;
  isGameMaster: boolean;
  handleStartGame: () => void;
  handleAssignGeneral: () => void;
  primaryBtn: React.CSSProperties;
}

const GameLauncher: React.FC<GameLauncherProps> = ({
  room,
  isGameMaster,
  handleStartGame,
  handleAssignGeneral,
  primaryBtn
}) => {
  // Guard: Only show these major actions to the Game Master
  if (!isGameMaster) return null;

  // Configuration based on game state
  const config = room && !room.gameStarted 
    ? {
        title: "Ready to assign secret roles?",
        buttonText: room.players.length < 2 ? "Waiting for Recruits..." : "Begin Campaign",
        action: handleStartGame,
        disabled: room.players.length < 2
      }
    : {
        title: "Ready to assign General?",
        buttonText: "Appoint General",
        action: handleAssignGeneral,
        disabled: false
      };

  return (
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <p style={{ 
        color: "white", 
        fontSize: "20px", 
        fontFamily: "'EB Garamond', serif",
        fontStyle: "italic" 
      }}>
        {config.title}
      </p>

      <button
        onClick={config.action}
        disabled={config.disabled}
        style={{
          ...primaryBtn,
          backgroundColor: config.disabled ? "#333" : "#c5a059",
          color: config.disabled ? "#666" : "#000",
          height: "60px",
          fontSize: "18px",
          boxShadow: config.disabled ? "none" : "0 0 20px rgba(197, 160, 89, 0.3)",
          textTransform: 'uppercase',
          letterSpacing: '2px',
          cursor: config.disabled ? "not-allowed" : "pointer",
          transition: "all 0.3s ease"
        }}
      >
        {config.buttonText}
      </button>
    </div>
  );
};

export default GameLauncher;