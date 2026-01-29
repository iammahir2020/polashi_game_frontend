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

  console.log({room})

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
        fontSize: '2rem',
        margin: '0 0 10px 0',
        textShadow: `0 0 20px ${isGreenWin ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
        letterSpacing: '5px'
      }}>
        {room.winner === "Nawabs (Green)" ? "Green Wins" : "Red Wins"}
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

      <div style={{
  marginTop: '20px',
  marginBottom: '30px',
  width: '100%',
  maxWidth: '450px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #333'
}}>
  <h3 style={{ 
    fontFamily: 'Cinzel', 
    color: '#c5a059', 
    fontSize: '1rem', 
    marginBottom: '15px',
    borderBottom: '1px solid #333',
    paddingBottom: '10px'
  }}>
    Operative Identities Revealed
  </h3>
  
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight:'250px', overflow:"auto" }}>
    {room.players.map((p) => (
      <div key={p.id} style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '6px',
        borderLeft: `4px solid ${p.character?.team === "Nawabs" ? "#4caf50" : "#f44336"}`
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{p.name}</span>
        <span style={{ 
          color: p.character?.team === "Nawabs" ? "#81c784" : "#e57373",
          fontSize: '0.9rem',
          fontStyle: 'italic'
        }}>
          {p.character?.name || "Unknown"}
        </span>
      </div>
    ))}
  </div>
</div>
      
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