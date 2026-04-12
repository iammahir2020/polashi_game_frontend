import React, { useRef } from 'react';
import type { Room } from '../../types/game';
import IdentityCard from '../IdentityCard';
import { useOverlayA11y } from '../../hooks/useOverlayA11y';
import { uiButtonGold } from '../../style/ui';

interface GameResultOverlayProps {
  room: Room;
  isGameMaster: boolean;
  handleResetGame: () => void;
  primaryBtn: React.CSSProperties;
  playerId: string | null;
  isDismissed: boolean;
  onClose: () => void;
}

const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  room,
  isGameMaster,
  handleResetGame,
  primaryBtn,
  playerId,
  isDismissed,
  onClose
}) => {
  // Only render if the game status is explicitly OVER
  if (room.gameStatus !== "OVER" || isDismissed) return null;

  const overlayRef = useRef<HTMLDivElement>(null);
  useOverlayA11y({ isActive: true, onClose, containerRef: overlayRef });

  const isGreenWin = room.winner?.includes('Green');

  return (
    <div ref={overlayRef} className="victory-overlay" role="dialog" aria-modal="true" aria-label="Game result" tabIndex={-1} style={{
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
      <button
        onClick={onClose}
        aria-label="Close result"
        style={{
          ...uiButtonGold,
          position: 'absolute',
          top: '18px',
          right: '18px',
          backgroundColor: 'rgba(0,0,0,0.35)',
          color: '#fff',
          fontSize: '12px',
          letterSpacing: '0.6px'
        }}
      >
        CLOSE
      </button>

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
  width: '100%',
  maxWidth: '400px',
  padding: '10px',
  border: '1px solid rgba(197, 160, 89, 0.2)',
  borderRadius: '16px',
  backgroundColor: 'rgba(0,0,0,0.4)'
}}>
  <p style={{ 
    color: '#c5a059', 
    fontSize: '12px', 
    fontFamily: 'Cinzel', 
    letterSpacing: '2px',
    marginBottom: '15px' 
  }}>
    YOUR FINAL IDENTITY
  </p>

  {/* Reusing IdentityCard for the final reveal */}
  <IdentityCard
    isRevealed={true} // Force it to stay open
    setIsRevealed={() => {}} // Disable the ability to close it
    gameStarted={true}
    character={room.players.find(p => p.id === playerId)?.character}
    secretIntel={[]} // Intel is usually irrelevant at the very end
    isFinal={true}
  />
</div>
      
      {isGameMaster ? (
        <button 
          onClick={handleResetGame} 
          style={{ 
            ...primaryBtn, 
            backgroundColor: "#c5a059", 
            color: "#000", 
            padding: "12px 20px", 
            width: "min(300px, 90vw)",
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