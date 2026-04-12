import React, { useRef } from 'react';
import type { Room } from '../../types/game';
import { useOverlayA11y } from '../../hooks/useOverlayA11y';

interface MirJaforPhaseProps {
  room: Room;
  playerId: string;
  onAttemptAssassination: (targetId: string) => void;
}

const MirJaforPhase: React.FC<MirJaforPhaseProps> = ({ room, playerId, onAttemptAssassination }) => {
  
  if(room.gameStatus !== "MIR_JAFOR_TURN") return null;

  const overlayRef = useRef<HTMLDivElement>(null);
  useOverlayA11y({ isActive: true, containerRef: overlayRef });
  
  const me = room.players.find(p => p.id === playerId);
  const isMirJafor = me?.character?.name === "মীর জাফর";

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Final betrayal phase" tabIndex={-1} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(20, 0, 0, 0.95)', zIndex: 15000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px', textAlign: 'center'
    }}>
      <h1 style={{ color: '#ff7675', fontFamily: 'Cinzel', fontSize: '2rem' }}>Final Betrayal</h1>
      
      {isMirJafor ? (
        <>
          <p style={{ color: '#ccc', maxWidth: '400px', marginBottom: '30px' }}>
            The Nawabs are celebrating, but you can still hand Bengal to the Company. 
            Identify **Mir Madan** to succeed.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {room.players.filter(p => p.id !== playerId).map(player => (
              <button
                key={player.id}
                onClick={() => onAttemptAssassination(player.id)}
                style={{
                  padding: '10px 20px', backgroundColor: '#1a1a1a', border: '1px solid #ff7675',
                  color: 'white', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cinzel'
                }}
              >
                {player.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ animation: 'pulse 2s infinite' }}>
          <p style={{ color: '#c5a059', fontSize: '1.5rem' }}>Mir Jafor is searching for Mir Madan...</p>
          <p style={{ color: '#666' }}>The fate of Bengal hangs in the balance.</p>
        </div>
      )}
    </div>
  );
};

export default MirJaforPhase;