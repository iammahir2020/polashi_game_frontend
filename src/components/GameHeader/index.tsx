import React from 'react';

interface GameHeaderProps {
  newConnection: "ok" | "error" | string;
  isConnectedToSocket: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({ newConnection, isConnectedToSocket }) => {
  return (
    <header style={{
      textAlign: "center",
      padding: "20px",
      background: "linear-gradient(to bottom, #1a1a1a, transparent)",
      borderRadius: "0 0 20px 20px",
      fontFamily: "'Cinzel', serif"
    }}>
      <h1 style={{ 
        margin: 0, 
        fontSize: "16px", 
        color: "#c5a059", 
        letterSpacing: "4px", 
        textTransform: 'uppercase',
        opacity: 0.8
      }}>
        The Battle of
      </h1>
      
      <h1 style={{ 
        margin: 0, 
        fontSize: "28px", 
        color: "#c5a059", 
        letterSpacing: "3px", 
        textTransform: 'uppercase',
        textShadow: "0 0 15px rgba(197, 160, 89, 0.2)"
      }}>
        Polashi <span style={{ fontFamily: "'Noto Serif Bengali', serif" }}>(পলাশী)</span>
      </h1>

      <div style={{
        display: 'inline-flex',
        gap: '20px',
        fontSize: "10px",
        marginTop: "10px",
        color: "#888",
        padding: "3px 16px",
        backgroundColor: "rgba(34, 34, 34, 0.8)",
        borderRadius: "20px",
        border: "1px solid #333",
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        <StatusItem label="Internet" isOk={newConnection === "ok"} />
        <div style={{ width: '1px', backgroundColor: '#444' }} />
        <StatusItem label="Server" isOk={isConnectedToSocket} />
      </div>
    </header>
  );
};

// Internal helper for status items
const StatusItem = ({ label, isOk }: { label: string; isOk: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <span>{label}:</span>
    <span style={{ 
      fontSize: '16px', 
      animation: isOk ? 'pulseGreen 2s infinite' : 'none',
      color: isOk ? 'green' : 'red'
    }}>
      {isOk ? "●" : "●"}
    </span>
    <style>{`
      @keyframes pulseGreen {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
    `}</style>
  </div>
);

export default GameHeader;