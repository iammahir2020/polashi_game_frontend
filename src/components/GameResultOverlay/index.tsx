import React from 'react';
import type { Room } from '../../types/game';

interface GameResultOverlayProps {
  room: Room;
  isGameMaster: boolean;
  handleResetGame: () => void;
  primaryBtn: React.CSSProperties;
}

const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  room,
  isGameMaster,
  handleResetGame,
  primaryBtn
}) => {
  // Only render if the game status is explicitly OVER
  if (room.gameStatus !== "OVER") return null;

  const isGreenWin = room.winner?.includes('Green');

  return (
    <div className="victory-overlay" style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.95)', // Slightly darker for more impact
      zIndex: 10000,
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      textAlign: 'center',
      backdropFilter: 'blur(8px)', // Adds a cinematic blur to the game behind
      fontFamily: "'Cinzel', serif"
    }}>
      {/* Visual flair: Victory/Defeat Header */}
      <h1 style={{ 
        color: isGreenWin ? '#4caf50' : '#f44336', 
        fontSize: '5rem',
        margin: '0 0 10px 0',
        textShadow: `0 0 20px ${isGreenWin ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
        letterSpacing: '5px'
      }}>
        {room.winner === "Nawabs (Green)" ? "VICTORY" : "DEFEAT"}
      </h1>

      <h2 style={{ 
        color: '#c5a059', 
        fontSize: '1.5rem',
        marginBottom: '40px',
        letterSpacing: '2px',
        maxWidth: '80%',
        fontFamily: "'EB Garamond', serif"
      }}>
        {room.winner} controls Bengal.
      </h2>
      
      {isGameMaster ? (
        <button 
          onClick={handleResetGame} 
          style={{ 
            ...primaryBtn, 
            backgroundColor: "#c5a059", 
            color: "#000", 
            padding: "12px 40px", 
            width: "300px",
            fontSize: "18px",
            boxShadow: '0 0 20px rgba(197, 160, 89, 0.3)'
          }}
        >
          PREPARE NEW CAMPAIGN
        </button>
      ) : (
        <p style={{ color: '#888', fontStyle: 'italic' }}>
          Waiting for the Master to reset the command center...
        </p>
      )}
    </div>
  );
};

export default GameResultOverlay;