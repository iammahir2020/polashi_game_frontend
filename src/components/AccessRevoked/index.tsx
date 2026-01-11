import React from 'react';
import type { Room } from '../../types/game';

interface AccessRevokedProps {
  wasKicked: boolean;
  room: Room | null;
  error: string | null;
  cardStyle: React.CSSProperties;
  primaryBtn: React.CSSProperties;
  onClose: () => void;
}

const AccessRevoked: React.FC<AccessRevokedProps> = ({ 
  wasKicked, 
  room, 
  error, 
  cardStyle, 
  primaryBtn, 
  onClose 
}) => {
  // Logic check moved inside the component
  if (!wasKicked || room) return null;

  return (
    <div style={{
      ...cardStyle,
      border: "2px solid #ff7675",
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a1a 100%)",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "50px", marginBottom: "10px" }}>⚠️</div>
      <h2 style={{ 
        color: "#ff7675", 
        textTransform: 'uppercase', 
        letterSpacing: '2px',
        fontFamily: "'Cinzel', serif" 
      }}>
        Access Revoked
      </h2>
      <p style={{ 
        color: "#ccc", 
        fontStyle: 'italic', 
        marginBottom: '25px',
        fontFamily: "'EB Garamond', serif" 
      }}>
        "{error || "You have been disconnected from the command center."}"
      </p>
      <button
        style={{ 
          ...primaryBtn, 
          backgroundColor: "#ff7675", 
          color: "#000",
          cursor: "pointer" 
        }}
        onClick={onClose}
      >
        Return to Shadows
      </button>
    </div>
  );
};

export default AccessRevoked;