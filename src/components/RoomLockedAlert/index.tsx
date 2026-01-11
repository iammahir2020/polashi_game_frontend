import React from 'react';

interface RoomLockedAlertProps {
  error: string | null;
  wasKicked: boolean;
  cardStyle: React.CSSProperties;
}

const RoomLockedAlert: React.FC<RoomLockedAlertProps> = ({ error, wasKicked, cardStyle }) => {
  if (!error || wasKicked || !error.includes("locked")) {
    return null;
  }

  return (
    <div style={{
      ...cardStyle,
      border: "2px solid #ff922b",
      textAlign: "center",
      animation: "shake 0.5s ease-in-out",
      backgroundColor: "rgba(255, 146, 43, 0.05)" // Subtle warning tint
    }}>
      <h3 style={{ 
        color: "#ff922b", 
        fontFamily: "'Cinzel', serif", 
        marginTop: 0 
      }}>
        🏰 Fortress Fortified
      </h3>
      <p style={{ 
        color: "#aaa", 
        fontFamily: "'EB Garamond', serif",
        fontSize: "1.1rem",
        lineHeight: "1.4"
      }}>
        This campaign has already begun or the gates have been barred by the Master.
      </p>

      {/* Adding a global style block for the shake animation if not already present */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default RoomLockedAlert;